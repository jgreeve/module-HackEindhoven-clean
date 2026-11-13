// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/agent/tools.ts — the tools the Studio agent can call.
//
// In the map mode they bind to the live GIS app session (src/map/session.ts):
// the agent writes the workspace HTML app, composes from gis-src blocks, and
// `run_app` / `gis_preview_app` publish it to the Viewer. BIMR owns its own
// tools and prompt in src/modules/bimr/. Because streamText runs in the
// browser, tool execution is local: the returned text is the agent's feedback
// loop.

import { tool } from "ai";
import type { ToolSet } from "ai";
import { z } from "zod";
import * as forge from "../forge/forgejo";
import * as git from "../forge/git";
import * as workspace from "../forge/workspace";
import * as gis from "../map";
import * as map from "../map/session";
import { getEnabledModuleIds, getModuleSettings } from "../app/modules";
import { toolsForModules } from "../modules/registry";
import type { ModuleRuntime } from "../modules/types";
import { nowMs, span } from "./trace";
import { markTurnRun } from "./turn";
import { setMode } from "../app/mode";
import type { Mode } from "../app/mode";

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function repoLine(r: forge.ForgeRepo): string {
  const desc = r.description || "(no description)";
  return `- [${r.full_name}](${forge.repoWebUrl(r)}) — ${desc} · ${r.private ? "private" : "public"} · default branch [${r.default_branch}](${forge.branchWebUrl(r)})`;
}

/** Web URL for a workspace file if the workspace is a repo with a remote. */
async function fileUrlFor(path: string): Promise<string | null> {
  try {
    if (!(await git.isRepo())) return null;
    const info = await git.repoInfo();
    if (!info) return null;
    const branch = (await git.currentBranch()) ?? "main";
    return git.fileUrl(info, branch, path);
  } catch {
    return null;
  }
}

const proposalOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  variant: z.enum(["primary", "danger", "default"]).optional(),
  action: z.object({ tool: z.string(), args: z.record(z.unknown()) }).optional(),
});

const proposalSchema = z.object({
  id: z.string(),
  kind: z.enum([
    "plan",
    "choose-repo",
    "create-repo",
    "clone",
    "commit",
    "push",
    "open-pr",
    "switch-mode",
    "generic",
  ]),
  title: z.string(),
  summary: z.string().optional(),
  options: z.array(proposalOptionSchema).min(1),
  preview: z
    .union([
      z.object({ type: z.literal("diff"), content: z.string() }),
      z.object({ type: z.literal("files"), content: z.array(z.string()) }),
      z.object({ type: z.literal("markdown"), content: z.string() }),
    ])
    .optional(),
  steps: z.array(z.string()).optional(),
});

export const agentTools = {
  propose_actions: tool({
    description:
      "Present decisions to the user as clickable options and wait for their choice. Use BEFORE any mutating or irreversible action (create repo, clone, commit, tag, push, open PR) and whenever you need a choice (e.g. which repo). Always include a cancel option. Returns the chosen option id.",
    inputSchema: z.object({ proposals: z.array(proposalSchema).min(1) }),
    // No execute: this is a client-side tool. The UI resolves it with the
    // user's choice via addToolOutput, and the turn resumes automatically.
  }),

  switch_mode: tool({
    description:
      "Switch Studio to another mode (sketch (the map mode), explore, learn, build) when the user gives a CLEAR, direct order to do so. The UI applies the switch and the turn resumes with the new mode's prompt and tools. If the intent is unclear, hedged, or a question about a mode, do NOT call this — call propose_actions with kind 'switch-mode' instead.",
    inputSchema: z.object({
      mode: z.enum(["sketch", "explore", "learn", "build"]),
      reason: z.string().optional(),
    }),
    // No execute: client-side. ChatPanel applies setMode and resolves the call
    // so the next request runs with the new mode's prompt + tools.
  }),

  list_files: tool({
    description: "List the files in the Studio workspace (one path per line).",
    inputSchema: z.object({}),
    execute: async () => {
      const t0 = nowMs();
      const files = await workspace.listFiles();
      span("tool list_files", t0, `${files.length} files`);
      return files.length ? files.join("\n") : "(empty workspace)";
    },
  }),

  read_file: tool({
    description:
      "Read a file from the workspace. Returns the file source as-is.",
    inputSchema: z.object({
      path: z.string().describe("Workspace-relative path, e.g. sketches/sketch.py"),
    }),
    execute: async ({ path }) => {
      const t0 = nowMs();
      try {
        const src = await workspace.readFile(path);
        span("tool read_file", t0, `${path} · ${src.length} chars`);
        return src;
      } catch (e) {
        span("tool read_file", t0, `${path} · not found`);
        return `error: ${e instanceof Error ? e.message : String(e)}`;
      }
    },
  }),

  write_file: tool({
    description:
      "Write (create or overwrite) a file in the workspace. A `.html` file becomes the active app shown in the editor; run it with run_app. For a small change to an existing file, use edit_file instead of rewriting the whole content.",
    inputSchema: z.object({
      path: z.string().describe("Workspace-relative path, e.g. maps/sketch.html"),
      content: z.string().describe("The full file content (not a diff)."),
    }),
    execute: async ({ path, content }) => {
      const t0 = nowMs();
      await workspace.writeFile(path, content);
      const url = await fileUrlFor(path);
      span("tool write_file", t0, `${path} · ${content.length} chars`);
      return [`wrote ${path} (${content.length} chars)`, url ? `url: ${url}` : null]
        .filter(Boolean)
        .join("\n");
    },
  }),

  edit_file: tool({
    description:
      "Edit an existing file by replacing an exact passage. Prefer this over write_file for targeted changes: it keeps the tool call small, so large reports and apps can be edited without rewriting the whole file. Read the file first and copy the exact text to replace.",
    inputSchema: z.object({
      path: z.string().describe("Workspace-relative path to edit"),
      old: z
        .string()
        .describe("Exact text to find. Include enough surrounding context to be unique."),
      new: z.string().describe("Replacement text. Use an empty string to delete the passage."),
      replaceAll: z
        .boolean()
        .optional()
        .describe("Replace every occurrence instead of requiring a unique match."),
    }),
    execute: async ({ path, old, new: replacement, replaceAll }) => {
      const t0 = nowMs();
      try {
        if (!old) return "error: old must not be empty";
        const src = await workspace.readFile(path);
        const count = src.split(old).length - 1;
        if (count === 0) {
          span("tool edit_file", t0, `${path} · no match`);
          return `error: text not found in ${path}. Read the file again and copy an exact passage.`;
        }
        if (count > 1 && !replaceAll) {
          span("tool edit_file", t0, `${path} · ${count} matches`);
          return `error: text matches ${count} times in ${path}; include more context or set replaceAll: true.`;
        }
        const next = replaceAll ? src.split(old).join(replacement) : src.replace(old, replacement);
        await workspace.writeFile(path, next);
        const url = await fileUrlFor(path);
        span("tool edit_file", t0, `${path} · ${count} replacement${count === 1 ? "" : "s"}`);
        return [
          `edited ${path} (${count} replacement${count === 1 ? "" : "s"})`,
          url ? `url: ${url}` : null,
        ]
          .filter(Boolean)
          .join("\n");
      } catch (e) {
        span("tool edit_file", t0, `${path} · error`);
        return `error: ${e instanceof Error ? e.message : String(e)}`;
      }
    },
  }),

  open_file: tool({
    description:
      "Make an existing workspace file the active file in the editor.",
    inputSchema: z.object({
      path: z.string().describe("Workspace-relative path to open"),
    }),
    execute: async ({ path }) => {
      const t0 = nowMs();
      try {
        await workspace.openFile(path);
        const url = await fileUrlFor(path);
        span("tool open_file", t0, path);
        return [`opened ${path}`, url ? `url: ${url}` : null].filter(Boolean).join("\n");
      } catch (e) {
        span("tool open_file", t0, `${path} · not found`);
        return `error: ${e instanceof Error ? e.message : String(e)}`;
      }
    },
  }),

  forge_search_repos: tool({
    description:
      "Search the forge for repositories by name or description. Use this first to find similar projects and their documentation.",
    inputSchema: z.object({
      query: z.string().describe("Search query, e.g. 'bimr' or 'column'"),
      limit: z.number().int().min(1).max(20).optional(),
    }),
    execute: async ({ query, limit }) => {
      const t0 = nowMs();
      try {
        const repos = await forge.searchRepos(query, limit ?? 10);
        span("tool forge_search_repos", t0, `${query} · ${repos.length}`);
        if (!repos.length) return `no repositories found for "${query}"`;
        return repos
          .map(
            (r) =>
              `${r.full_name} — ${r.description || "(no description)"} [default branch: ${r.default_branch}]`,
          )
          .join("\n");
      } catch (e) {
        span("tool forge_search_repos", t0, "error");
        return `error: ${errMsg(e)}`;
      }
    },
  }),

  forge_overview: tool({
    description:
      "List what exists on the forge: organizations and repositories. Call this FIRST during discovery — do not guess keywords.",
    inputSchema: z.object({ limit: z.number().int().min(1).max(100).optional() }),
    execute: async ({ limit }) => {
      const t0 = nowMs();
      try {
        const n = limit ?? 50;
        const [orgs, repos] = await Promise.all([forge.listOrgs(n), forge.exploreRepos(n)]);
        span("tool forge_overview", t0, `${orgs.length} orgs · ${repos.length} repos`);
        const orgLines = orgs.length
          ? orgs.map((o) => `- ${o.username} — ${o.description || "(no description)"}`).join("\n")
          : "- (none)";
        const repoLines = repos.length
          ? repos.map((r) => `- ${repoLine(r)}`).join("\n")
          : "- (none)";
        return `organizations (${orgs.length}):\n${orgLines}\nrepositories (${repos.length}):\n${repoLines}`;
      } catch (e) {
        span("tool forge_overview", t0, "error");
        return `error: ${errMsg(e)}`;
      }
    },
  }),

  forge_list_repos: tool({
    description:
      "List repositories for a user or organization, or the bot's own repos if no owner is given.",
    inputSchema: z.object({
      owner: z.string().optional().describe("User or org login (default: the bot)"),
      limit: z.number().int().min(1).max(50).optional(),
    }),
    execute: async ({ owner, limit }) => {
      const t0 = nowMs();
      try {
        const repos = owner
          ? await forge.listOwnerRepos(owner, limit ?? 30)
          : await forge.listUserRepos(limit ?? 30);
        span("tool forge_list_repos", t0, `${owner ?? "bot"} · ${repos.length}`);
        if (!repos.length) {
          return owner ? `${owner} has no repositories` : "the bot has no repositories";
        }
        return repos.map(repoLine).join("\n");
      } catch (e) {
        span("tool forge_list_repos", t0, "error");
        return `error: ${errMsg(e)}`;
      }
    },
  }),

  forge_repo_info: tool({
    description: "Get a forge repository's details (description, default branch, URL).",
    inputSchema: z.object({
      repo: z.string().describe("Repository as owner/name"),
    }),
    execute: async ({ repo }) => {
      const t0 = nowMs();
      try {
        const [owner, name] = forge.splitRepo(repo);
        const r = await forge.getRepo(owner, name);
        span("tool forge_repo_info", t0, r.full_name);
        return [
          `[${r.full_name}](${forge.repoWebUrl(r)})`,
          `description: ${r.description || "(none)"}`,
          `default branch: [${r.default_branch}](${forge.branchWebUrl(r)})`,
          `url: ${r.html_url}`,
        ].join("\n");
      } catch (e) {
        span("tool forge_repo_info", t0, "error");
        return `error: ${errMsg(e)}`;
      }
    },
  }),

  forge_list_files: tool({
    description:
      "List files and directories in a forge repository, optionally under a path.",
    inputSchema: z.object({
      repo: z.string().describe("Repository as owner/name"),
      path: z.string().optional().describe("Directory path (default: repo root)"),
      ref: z.string().optional().describe("Branch, tag or commit (default: default branch)"),
    }),
    execute: async ({ repo, path, ref }) => {
      const t0 = nowMs();
      try {
        const [owner, name] = forge.splitRepo(repo);
        const [info, entries] = await Promise.all([
          forge.getRepo(owner, name),
          forge.listContents(owner, name, path ?? "", ref),
        ]);
        span("tool forge_list_files", t0, `${repo}/${path ?? ""} · ${entries.length}`);
        if (!entries.length) return "(empty directory)";
        return entries
          .map(
            (e) =>
              `${e.type === "dir" ? "dir " : "file"} [${e.path}](${forge.fileWebUrl(info, e.path, ref)})`,
          )
          .join("\n");
      } catch (e) {
        span("tool forge_list_files", t0, "error");
        return `error: ${errMsg(e)}`;
      }
    },
  }),

  forge_read_file: tool({
    description:
      "Read a file from a forge repository (markdown documentation or python). Returns the text content.",
    inputSchema: z.object({
      repo: z.string().describe("Repository as owner/name"),
      path: z.string().describe("File path in the repository"),
      ref: z.string().optional().describe("Branch, tag or commit (default: default branch)"),
    }),
    execute: async ({ repo, path, ref }) => {
      const t0 = nowMs();
      try {
        const [owner, name] = forge.splitRepo(repo);
        const file = await forge.readFile(owner, name, path, ref);
        span("tool forge_read_file", t0, `${repo}/${path} · ${file.content.length} chars`);
        return file.content;
      } catch (e) {
        span("tool forge_read_file", t0, "error");
        return `error: ${errMsg(e)}`;
      }
    },
  }),

  gis_list_blocks: tool({
    description:
      "List reusable GIS blocks from bimr/gis-src. Call this FIRST when building a map app: filter by free text, kind or tags, then read the selected blocks.",
    inputSchema: z.object({
      query: z.string().optional().describe("Free text, e.g. 'popup' or 'choropleth'"),
      kind: z.enum(["layer", "control", "data", "style", "utility"]).optional(),
      tags: z.array(z.string()).optional().describe("Every tag must match"),
    }),
    execute: async ({ query, kind, tags }) => {
      const t0 = nowMs();
      try {
        const blocks = await gis.listBlocks({ query, kind, tags });
        span("tool gis_list_blocks", t0, `${blocks.length} blocks`);
        if (!blocks.length) return "no GIS blocks match this filter";
        return blocks
          .map(
            (b) =>
              `${b.id}@${b.version} — ${b.title} [${b.kind}]${b.description ? ` — ${b.description}` : ""}\ntags: ${(b.tags ?? []).join(", ") || "(none)"} · path: ${b.path} · entry: ${b.entry}`,
          )
          .join("\n\n");
      } catch (e) {
        span("tool gis_list_blocks", t0, "error");
        return `error: ${errMsg(e)}`;
      }
    },
  }),

  gis_read_block: tool({
    description:
      "Read a GIS block from bimr/gis-src: its block.yaml contract, entry code, CSS and minimal example. Read every block you intend to inline.",
    inputSchema: z.object({
      id: z.string().describe("Block id from gis_list_blocks, e.g. marker-popup"),
    }),
    execute: async ({ id }) => {
      const t0 = nowMs();
      try {
        const block = await gis.readBlock(id);
        const m = block.manifest;
        span("tool gis_read_block", t0, `${m.id}@${m.version}`);
        return [
          `# ${m.id}@${m.version} — ${m.title}`,
          `kind: ${m.kind}`,
          `exports: ${(m.exports ?? []).join(", ") || "(none)"}`,
          `dependencies: ${(m.dependencies ?? []).join(", ") || "(none)"}`,
          `attribution: ${m.attribution ?? "(none)"}`,
          "",
          "## block.yaml",
          block.manifestText.trim(),
          "",
          "## entry",
          "```js",
          block.entry.trim(),
          "```",
          block.css ? `\n## css\n\`\`\`css\n${block.css.trim()}\n\`\`\`` : "",
          block.example ? `\n## example\n\`\`\`html\n${block.example.trim()}\n\`\`\`` : "",
        ]
          .filter(Boolean)
          .join("\n");
      } catch (e) {
        span("tool gis_read_block", t0, "error");
        return `error: ${errMsg(e)}`;
      }
    },
  }),

  gis_list_apps: tool({
    description:
      "List generated GIS apps from bimr/gis-apps (the gis-apps.yaml catalogue). Use it to avoid overwriting an existing slug.",
    inputSchema: z.object({}),
    execute: async () => {
      const t0 = nowMs();
      try {
        const apps = await gis.listApps();
        span("tool gis_list_apps", t0, `${apps.length} apps`);
        if (!apps.length) return "(no GIS apps yet)";
        return apps
          .map(
            (a) =>
              `${a.id} — ${a.title}${a.description ? ` — ${a.description}` : ""}\npath: ${a.path} · tags: ${(a.tags ?? []).join(", ") || "(none)"} · preview: ${a.preview ?? "(none)"}`,
          )
          .join("\n\n");
      } catch (e) {
        span("tool gis_list_apps", t0, "error");
        return `error: ${errMsg(e)}`;
      }
    },
  }),

  gis_read_app: tool({
    description:
      "Read a generated GIS app from bimr/gis-apps: app.yaml provenance, its HTML entry and README.",
    inputSchema: z.object({
      id: z.string().describe("App id from gis_list_apps, e.g. rennes-parks"),
    }),
    execute: async ({ id }) => {
      const t0 = nowMs();
      try {
        const app = await gis.readApp(id);
        span("tool gis_read_app", t0, `${app.manifest.id} · ${app.entry.length} chars`);
        return [
          `# ${app.manifest.id} — ${app.manifest.title}`,
          `files: ${app.files.join(", ")}`,
          "",
          "## app.yaml",
          app.manifestText.trim(),
          "",
          "## entry",
          "```html",
          app.entry.trim(),
          "```",
          app.readme ? `\n## README.md\n${app.readme.trim()}` : "",
        ]
          .filter(Boolean)
          .join("\n");
      } catch (e) {
        span("tool gis_read_app", t0, "error");
        return `error: ${errMsg(e)}`;
      }
    },
  }),

  gis_preview_app: tool({
    description:
      "Compose a static GIS app and show it in the Studio build pane without saving. Use it to check the map before proposing gis_save_app.",
    inputSchema: z.object({
      title: z.string(),
      description: z.string().optional(),
      block_ids: z.array(z.string()).describe("Selected gis-src block ids"),
      config: z
        .record(z.unknown())
        .describe("The MAP config object: tileUrl, attribution, center, zoom, ..."),
      data: z.unknown().optional().describe("Small GeoJSON or other app data, inlined as DATA"),
      script: z.string().describe("The app bootstrap that calls the block functions"),
      html: z
        .string()
        .optional()
        .describe("Full HTML override; when omitted the app is rendered from the blocks"),
      css: z.string().optional().describe("Extra app CSS"),
    }),
    execute: async (input) => {
      const t0 = nowMs();
      try {
        const blocks = await Promise.all(input.block_ids.map((id) => gis.readBlock(id)));
        const html =
          input.html?.trim() ||
          gis.renderAppHtml({
            title: input.title,
            description: input.description,
            blocks,
            config: input.config,
            data: input.data,
            script: input.script,
            css: input.css,
          });
        const path = await map.setComposedApp(html, input.title, input.block_ids);
        markTurnRun(true);
        span("tool gis_preview_app", t0, `${input.title} · ${html.length} chars`);
        return [
          `preview updated and rendered: ${input.title}`,
          `workspace app: ${path}`,
          `size: ${html.length} chars`,
          "The Viewer tab shows the map. Call gis_save_app only after the user accepts a proposal.",
        ].join("\n");
      } catch (e) {
        span("tool gis_preview_app", t0, "error");
        return `error: ${errMsg(e)}`;
      }
    },
  }),

  run_app: tool({
    description:
      "Render the active HTML map app from the workspace in the Studio Viewer. Use it after editing an app with write_file, or to re-run the current app.",
    inputSchema: z.object({}),
    execute: async () => {
      const t0 = nowMs();
      const ok = map.runApp();
      markTurnRun(ok);
      const state = map.getState();
      span("tool run_app", t0, ok ? `ok · ${state.path}` : "not an app");
      if (!ok) return `error: ${state.status.text}`;
      return [
        `map app rendered OK`,
        `workspace app: ${state.path}`,
        `title: ${state.title}`,
      ].join("\n");
    },
  }),

  gis_save_app: tool({
    description:
      "Save a static GIS app to bimr/gis-apps/apps/<slug> and update gis-apps.yaml in ONE commit. MUTATION: call propose_actions first and only save after the user accepts. Saves the active workspace app when no html/script is given; records block versions in app.yaml.",
    inputSchema: z.object({
      slug: z.string().optional().describe("Lowercase hyphenated slug; defaults to the title"),
      title: z.string(),
      description: z.string().optional(),
      prompt: z.string().optional().describe("The user prompt that produced the app"),
      block_ids: z
        .array(z.string())
        .optional()
        .describe("Selected gis-src block ids, for provenance (defaults to the active app)"),
      config: z
        .record(z.unknown())
        .optional()
        .describe("The MAP config object: tileUrl, attribution, center, zoom, ..."),
      data: z.unknown().optional().describe("Small GeoJSON or other app data, inlined as DATA"),
      script: z
        .string()
        .optional()
        .describe("The app bootstrap that calls the block functions"),
      html: z
        .string()
        .optional()
        .describe("Full HTML override; when omitted the active workspace app is saved"),
      css: z.string().optional().describe("Extra app CSS"),
      tags: z.array(z.string()).optional(),
      readme: z.string().optional(),
      overwrite: z.boolean().optional(),
    }),
    execute: async (input) => {
      const t0 = nowMs();
      try {
        const current = map.getCurrentApp();
        const blockIds = input.block_ids ?? current.blockIds;
        const blocks = input.script
          ? await Promise.all(blockIds.map((id) => gis.readBlock(id)))
          : [];
        const html =
          input.html?.trim() ||
          (input.script
            ? gis.renderAppHtml({
                title: input.title,
                description: input.description,
                blocks,
                config: input.config ?? {},
                data: input.data,
                script: input.script,
                css: input.css,
              })
            : current.html);
        if (!html.trim()) {
          return "error: no app to save — compose one with gis_preview_app or write a .html file first";
        }
        const result = await gis.saveApp({
          slug: input.slug ?? gis.slugify(input.title),
          title: input.title,
          description: input.description,
          prompt: input.prompt,
          html,
          blockIds,
          tags: input.tags,
          readme: input.readme,
          overwrite: input.overwrite,
        });
        span(
          "tool gis_save_app",
          t0,
          `${result.slug} · ${result.created ? "created" : "updated"} · ${result.commit.slice(0, 7)}`,
        );
        return [
          `${result.created ? "created" : "updated"} ${result.slug}`,
          `url: ${result.url}`,
          `blocks: ${result.blocks.map((b) => `${b.id}@${b.version}`).join(", ") || "(none)"}`,
          `path: ${gis.GIS_APPS_REPO}/apps/${result.slug}`,
        ].join("\n");
      } catch (e) {
        span("tool gis_save_app", t0, "error");
        return `error: ${errMsg(e)}`;
      }
    },
  }),

  forge_create_repo: tool({
    description:
      "Create a new repository owned by the bot on the forge. Returns the clone URL. Use git_remote + git_push to publish to it.",
    inputSchema: z.object({
      name: z.string().describe("Repository name, e.g. my-model"),
      description: z.string().optional(),
      private: z.boolean().optional(),
    }),
    execute: async ({ name, description, private: isPrivate }) => {
      const t0 = nowMs();
      try {
        const repo = await forge.createRepo({ name, description, private: isPrivate });
        span("tool forge_create_repo", t0, repo.full_name);
        return [
          `created ${repo.full_name}`,
          `url: ${repo.html_url}`,
          `clone: ${forge.cloneUrl(repo.owner.login, repo.name)}`,
          `default branch: ${repo.default_branch}`,
        ].join("\n");
      } catch (e) {
        span("tool forge_create_repo", t0, "error");
        return `error: ${errMsg(e)}`;
      }
    },
  }),

  git_status: tool({
    description:
      "Show the workspace repository status (current branch and changed/untracked files).",
    inputSchema: z.object({}),
    execute: async () => {
      const t0 = nowMs();
      try {
        if (!(await git.isRepo())) {
          return "not a git repository (use git_init or git_clone first)";
        }
        const branch = (await git.currentBranch()) ?? "(detached)";
        const files = await git.status();
        const info = await git.repoInfo();
        span("tool git_status", t0, `${branch} · ${files.length}`);
        const head = [`on branch ${branch}`, info ? `repo: ${git.repoUrl(info)}` : null]
          .filter(Boolean)
          .join("\n");
        if (!files.length) return `${head}\nclean`;
        return `${head}\n${files.map((f) => `${f.status} ${f.path}`).join("\n")}`;
      } catch (e) {
        span("tool git_status", t0, "error");
        return `error: ${errMsg(e)}`;
      }
    },
  }),

  git_init: tool({
    description: "Initialise a git repository in the workspace (default branch main).",
    inputSchema: z.object({}),
    execute: async () => {
      const t0 = nowMs();
      try {
        await git.init();
        span("tool git_init", t0, "main");
        return "initialised git repository (main)";
      } catch (e) {
        span("tool git_init", t0, "error");
        return `error: ${errMsg(e)}`;
      }
    },
  }),

  git_clone: tool({
    description:
      "Clone a forge repository into the workspace, replacing its contents. Pass the clone URL (from forge_create_repo or forge_repo_info).",
    inputSchema: z.object({
      url: z.string().describe("HTTPS clone URL, e.g. https://artefacts.bimr.net/bot/repo.git"),
      ref: z.string().optional().describe("Branch/tag to check out"),
    }),
    execute: async ({ url, ref }) => {
      const t0 = nowMs();
      try {
        await git.clone(url, ref);
        const files = await workspace.listFiles();
        const info = await git.repoInfo();
        const branch = (await git.currentBranch()) ?? "?";
        span("tool git_clone", t0, `${url} · ${files.length} files`);
        return [
          `cloned ${url}`,
          info ? `repo: ${git.repoUrl(info)}` : null,
          `branch: ${branch}`,
          ...files,
        ]
          .filter(Boolean)
          .join("\n");
      } catch (e) {
        span("tool git_clone", t0, "error");
        return `error: ${errMsg(e)}`;
      }
    },
  }),

  git_log: tool({
    description: "Show recent commits in the workspace repository.",
    inputSchema: z.object({ limit: z.number().int().min(1).max(50).optional() }),
    execute: async ({ limit }) => {
      const t0 = nowMs();
      try {
        const commits = await git.log(limit ?? 10);
        span("tool git_log", t0, `${commits.length} commits`);
        if (!commits.length) return "(no commits)";
        return commits
          .map((c) => `${c.oid.slice(0, 7)} ${c.date.slice(0, 10)} ${c.message}`)
          .join("\n");
      } catch (e) {
        span("tool git_log", t0, "error");
        return `error: ${errMsg(e)}`;
      }
    },
  }),

  git_commit: tool({
    description: "Stage all workspace changes and commit them with a message.",
    inputSchema: z.object({ message: z.string() }),
    execute: async ({ message }) => {
      const t0 = nowMs();
      try {
        const oid = await git.commit(message);
        const info = await git.repoInfo();
        const branch = (await git.currentBranch()) ?? "?";
        span("tool git_commit", t0, oid.slice(0, 7));
        return [
          `committed ${oid.slice(0, 7)} on ${branch}: ${message}`,
          info ? `url: ${git.commitUrl(info, oid)}` : null,
        ]
          .filter(Boolean)
          .join("\n");
      } catch (e) {
        span("tool git_commit", t0, "error");
        return `error: ${errMsg(e)}`;
      }
    },
  }),

  git_remote: tool({
    description: "Set the origin remote URL used for pushing (a repo clone URL).",
    inputSchema: z.object({
      url: z.string(),
      name: z.string().optional(),
    }),
    execute: async ({ url, name }) => {
      const t0 = nowMs();
      try {
        const remote = name ?? "origin";
        await git.setRemote(url, remote);
        span("tool git_remote", t0, `${remote} -> ${url}`);
        return `remote ${remote} -> ${url}`;
      } catch (e) {
        span("tool git_remote", t0, "error");
        return `error: ${errMsg(e)}`;
      }
    },
  }),

  git_push: tool({
    description: "Push the current branch to origin.",
    inputSchema: z.object({
      remote: z.string().optional(),
      ref: z.string().optional(),
    }),
    execute: async ({ remote, ref }) => {
      const t0 = nowMs();
      try {
        const branch = ref ?? (await git.currentBranch()) ?? "?";
        await git.push(remote ?? "origin", ref);
        const info = await git.repoInfo();
        span("tool git_push", t0, branch);
        return [
          `pushed ${branch} to ${remote ?? "origin"}`,
          info ? `url: ${git.branchUrl(info, branch)}` : null,
        ]
          .filter(Boolean)
          .join("\n");
      } catch (e) {
        span("tool git_push", t0, "error");
        return `error: ${errMsg(e)}`;
      }
    },
  }),

  git_tag: tool({
    description: "Create an annotated tag on the current commit (e.g. v0.1.0).",
    inputSchema: z.object({ name: z.string() }),
    execute: async ({ name }) => {
      const t0 = nowMs();
      try {
        await git.tag(name);
        span("tool git_tag", t0, name);
        return `tagged ${name}`;
      } catch (e) {
        span("tool git_tag", t0, "error");
        return `error: ${errMsg(e)}`;
      }
    },
  }),
};
// Per-mode tool scoping. Discovery is always available; writes are
// mode-specific so the agent cannot, say, overwrite the model from explore.
// BIMR tools and prompts are contributed by src/modules/bimr/.
const READ_TOOLS = [
  "list_files",
  "read_file",
  "forge_overview",
  "forge_list_repos",
  "forge_search_repos",
  "forge_repo_info",
  "forge_list_files",
  "forge_read_file",
  "gis_list_blocks",
  "gis_read_block",
  "gis_list_apps",
  "gis_read_app",
  "git_status",
  "git_log",
  "propose_actions",
  "switch_mode",
];

const WRITE_TOOLS = [
  "write_file",
  "edit_file",
  "open_file",
  "git_init",
  "git_clone",
  "git_commit",
  "git_remote",
  "git_push",
  "git_tag",
  "forge_create_repo",
];

/** GIS app tools: compose, render and save static map apps. */
const MAP_TOOLS = ["gis_preview_app", "gis_save_app", "run_app"];

/**
 * Core tool exposure by mode. Module tools are composed separately by the
 * registry (src/modules/registry.ts); a module declares its own modes.
 */
const CORE_MODE_TOOLS: Record<Mode, string[]> = {
  sketch: [...READ_TOOLS, ...WRITE_TOOLS, ...MAP_TOOLS],
  explore: [...READ_TOOLS],
  learn: [...READ_TOOLS, "write_file", "edit_file", "open_file"],
  build: [...READ_TOOLS, ...WRITE_TOOLS, ...MAP_TOOLS],
};

/** Runtime shared by module tool factories. */
function moduleRuntime(enabled: Set<string> = getEnabledModuleIds()): ModuleRuntime {
  return {
    enabled,
    settingsFor: getModuleSettings,
    trace: span,
    now: nowMs,
    markRun: markTurnRun,
    fetch: ((...args: Parameters<typeof fetch>) => globalThis.fetch(...args)) as typeof fetch,
    workspace: {
      listFiles: workspace.listFiles,
      readFile: workspace.readFile,
      writeFile: workspace.writeFile,
      exists: workspace.exists,
      openFile: workspace.openFile,
      subscribeFiles: workspace.subscribeFiles,
    },
    runApp: () => map.runApp(),
    setMode: (mode, reason) => setMode(mode, (reason as Parameters<typeof setMode>[1]) ?? "handoff"),
  };
}

/** All core + enabled module tools, regardless of mode (chat history parsing). */
export function allAgentTools(enabled: Set<string> = getEnabledModuleIds()): ToolSet {
  return {
    ...agentTools,
    ...toolsForModules(moduleRuntime(enabled)),
  } as ToolSet;
}

/** The subset of tools available in a mode: core + enabled module tools. */
export function toolsForMode(mode: Mode, enabled: Set<string> = getEnabledModuleIds()): ToolSet {
  const names = new Set(CORE_MODE_TOOLS[mode]);
  const core: Record<string, unknown> = {};
  for (const key of Object.keys(agentTools) as (keyof typeof agentTools)[]) {
    if (names.has(key)) core[key] = agentTools[key];
  }
  return {
    ...core,
    ...toolsForModules(moduleRuntime(enabled), mode),
  } as ToolSet;
}
