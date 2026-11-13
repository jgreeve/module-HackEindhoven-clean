// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

import { useCallback, useEffect, useState } from "react";
import * as forge from "../forge/forgejo";
import type { ForgeEntry, ForgeRepo } from "../forge/forgejo";
import { loadStudioDescriptor } from "../forge/descriptor";
import type { StudioDescriptor } from "../forge/descriptor";
import * as workspace from "../forge/workspace";
import { getMode } from "../app/mode";
import { handoff } from "../app/handoff";
import { Markdown } from "./Markdown";
import { ForgeSurface } from "./ForgeSurface";
import { ModulesPanel } from "./ModulesPanel";
import { ModuleSurfaceHost } from "./ModuleSurfaceHost";
import type { StudioModule } from "../modules/types";

interface Theme {
  id: string;
  topic: string;
  label: string;
}

const THEMES: Theme[] = [
  { id: "sketches", topic: "studio-sketch", label: "Sketches" },
  { id: "components", topic: "studio-component", label: "Components" },
  { id: "tutorials", topic: "studio-tutorial", label: "Tutorials" },
  { id: "web-artefacts", topic: "studio-web-artefact", label: "Web artefacts" },
  { id: "docs", topic: "studio-docs", label: "Docs" },
];

const OTHER: Theme = { id: "other", topic: "", label: "Other" };

function themeOf(repo: ForgeRepo): Theme {
  const topics = repo.topics ?? [];
  return THEMES.find((t) => topics.includes(t.topic)) ?? OTHER;
}

/** Explore mode: browse the forge by theme, then a repo's README and files. */
export function ExplorePane() {
  const [repos, setRepos] = useState<ForgeRepo[] | null>(null);
  const [gateway, setGateway] = useState<StudioDescriptor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ForgeRepo | null>(null);
  const [tab, setTab] = useState<"forge" | "modules">("forge");
  const [openModule, setOpenModule] = useState<StudioModule | null>(null);

  const load = useCallback(() => {
    setError(null);
    setRepos(null);
    forge
      .exploreRepos(100)
      .then(setRepos)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
    loadStudioDescriptor("bimr", "studio-gateway")
      .then(setGateway)
      .catch(() => setGateway(null));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (selected) {
    return <RepoView repo={selected} onBack={() => setSelected(null)} />;
  }

  const q = query.trim().toLowerCase();
  const filtered = (repos ?? []).filter(
    (r) =>
      !q ||
      r.full_name.toLowerCase().includes(q) ||
      (r.description ?? "").toLowerCase().includes(q),
  );
  const groups = [...THEMES, OTHER]
    .map((theme) => ({
      theme,
      items: filtered.filter((r) => themeOf(r).id === theme.id),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="explore">
      <div className="explore-tabs" role="tablist" aria-label="Explore sections">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "forge"}
          className={`explore-tab ${tab === "forge" ? "active" : ""}`}
          onClick={() => {
            setTab("forge");
            setOpenModule(null);
          }}
        >
          Forge
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "modules"}
          className={`explore-tab ${tab === "modules" ? "active" : ""}`}
          onClick={() => setTab("modules")}
        >
          Modules
        </button>
      </div>

      {tab === "modules" ? (
        <div className="explore-body">
          {openModule ? (
            <ModuleSurfaceHost
              module={openModule}
              onBack={() => setOpenModule(null)}
              onUse={(text) =>
                handoff({
                  from: getMode(),
                  to: "sketch",
                  intent: { kind: "ask", text },
                })
              }
            />
          ) : (
            <>
              <p className="explore-dim modules-intro">
                Data modules add tools, prompt instructions and public data
                sources to Sketch mode. Expand a source, enable or disable a
                module, and open its feature page. Modules with a surface have an
                Open button.
              </p>
              <ModulesPanel onOpenSurface={setOpenModule} />
            </>
          )}
        </div>
      ) : (
        <>
          <div className="explore-head">
            <input
              className="explore-search"
              placeholder="Search repositories..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="button" className="btn small" onClick={load} title="Refresh">
              Refresh
            </button>
          </div>

          {error && <div className="explore-error">{error}</div>}

          <div className="explore-body">
            {gateway && (
              <div className="gateway-home">
                <ForgeSurface owner="bimr" repo="studio-gateway" descriptor={gateway} />
              </div>
            )}
            {!repos && !error && <div className="explore-dim">Loading the forge...</div>}
            {repos && groups.length === 0 && !error && (
              <div className="explore-dim">
                {q ? "No matching repositories." : "No repositories found."}
              </div>
            )}
            {groups.map(({ theme, items }) => (
              <section className="explore-theme" key={theme.id}>
                <h3 className="explore-theme-title">
                  {theme.label} <span className="explore-count">{items.length}</span>
                </h3>
                <ul className="explore-repos">
                  {items.map((r) => (
                    <li key={r.full_name}>
                      <button
                        type="button"
                        className="explore-repo"
                        onClick={() => setSelected(r)}
                      >
                        <span className="explore-repo-name">{r.full_name}</span>
                        <span className="explore-repo-desc">
                          {r.description || "(no description)"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function RepoView({ repo, onBack }: { repo: ForgeRepo; onBack: () => void }) {
  const [owner, name] = forge.splitRepo(repo.full_name);
  const [path, setPath] = useState("");
  const [descriptor, setDescriptor] = useState<StudioDescriptor | null | undefined>(
    undefined,
  );

  useEffect(() => {
    setDescriptor(undefined);
    loadStudioDescriptor(owner, name)
      .then(setDescriptor)
      .catch(() => setDescriptor(null));
  }, [owner, name]);
  const [entries, setEntries] = useState<ForgeEntry[] | null>(null);
  const [readme, setReadme] = useState<string | null>(null);
  const [file, setFile] = useState<{ path: string; content: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    forge
      .readFile(owner, name, "README.md")
      .then((f) => setReadme(f.content))
      .catch(() => setReadme(null));
  }, [owner, name]);

  useEffect(() => {
    setEntries(null);
    forge
      .listContents(owner, name, path)
      .then(setEntries)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [owner, name, path]);

  const openEntry = async (entry: ForgeEntry) => {
    if (entry.type === "dir") {
      setPath(entry.path);
      setFile(null);
      return;
    }
    try {
      const f = await forge.readFile(owner, name, entry.path);
      setFile({ path: f.path, content: f.content });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  /** Copy the forge file into the workspace and switch to the sketch editor. */
  const openInSketch = async () => {
    if (!file) return;
    await workspace.writeFile(file.path, file.content);
    handoff({
      from: getMode(),
      to: "sketch",
      intent: { kind: "open-file", path: file.path },
    });
  };

  const parts = path ? path.split("/") : [];

  return (
    <div className="explore repo-view">
      <div className="explore-head">
        <button type="button" className="btn small" onClick={onBack}>
          Back
        </button>
        <a
          className="explore-repo-link"
          href={forge.repoWebUrl(repo)}
          target="_blank"
          rel="noreferrer"
        >
          {repo.full_name}
        </a>
        {repo.description && <span className="explore-dim">{repo.description}</span>}
      </div>

      {error && <div className="explore-error">{error}</div>}

      <div className="explore-body">
        {descriptor === undefined ? (
          <div className="explore-dim">Loading...</div>
        ) : descriptor ? (
          <ForgeSurface
            owner={owner}
            repo={name}
            descriptor={descriptor}
            defaultBranch={repo.default_branch}
          />
        ) : file ? (
          <div className="repo-file">
            <div className="repo-file-head">
              <code>{file.path}</code>
              <div className="repo-file-actions">
                {file.path.endsWith(".py") && (
                  <button
                    type="button"
                    className="btn small"
                    onClick={() => void openInSketch()}
                  >
                    Open in sketch
                  </button>
                )}
                <button type="button" className="btn small" onClick={() => setFile(null)}>
                  Close
                </button>
              </div>
            </div>
            <pre>{file.content}</pre>
          </div>
        ) : (
          <>
            {readme && (
              <div className="repo-readme">
                <Markdown text={readme} />
              </div>
            )}
            <div className="repo-path">
              <button type="button" className="repo-crumb" onClick={() => setPath("")}>
                {repo.name}
              </button>
              {parts.map((p, i) => (
                <span key={i}>
                  <span className="bc-sep">/</span>
                  <button
                    type="button"
                    className="repo-crumb"
                    onClick={() => setPath(parts.slice(0, i + 1).join("/"))}
                  >
                    {p}
                  </button>
                </span>
              ))}
            </div>
            {entries ? (
              <ul className="repo-entries">
                {entries.map((e) => (
                  <li key={e.path}>
                    <button
                      type="button"
                      className="repo-entry"
                      onClick={() => void openEntry(e)}
                    >
                      <span className={`repo-entry-icon ${e.type}`}>
                        {e.type === "dir" ? "\u{1F4C1}" : "\u{1F4C4}"}
                      </span>
                      <span>{e.name}</span>
                    </button>
                  </li>
                ))}
                {entries.length === 0 && <li className="explore-dim">(empty)</li>}
              </ul>
            ) : (
              <div className="explore-dim">Loading...</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
