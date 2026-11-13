// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/modules/bimr/tools.ts — the BIMR module agent tools.
//
// bimr_help and bimr_samples are read-only and available wherever the module
// is scoped. bimr_run is Learn-only; the module context carries the requesting
// mode so the tool set can be narrowed without a central MODE_TOOLS edit.
//
// The session is imported lazily inside bimr_run: the module descriptor and
// its tools are loaded by the registry (and its Node contract tests), while
// @bimr/web expects a browser DOM.

import { tool } from "ai";
import type { Tool } from "ai";
import { z } from "zod";
import type { ModuleContext } from "../types.ts";

// The forge repo holding the BIMR sample corpus the agent learns from.
const BIMR_SAMPLES_REPO = "bimr/samples";

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export function createBimrTools(ctx: ModuleContext): Record<string, Tool> {
  const help = tool({
    description:
      "Read the official BIMR help page on bimr.net: entity and operator semantics plus editor commands. Use it to ground your BIMR knowledge before using or inventing API. The runtime vocabulary in the system prompt is authoritative; the help page is supplementary.",
    inputSchema: z.object({}),
    execute: async () => {
      const t0 = ctx.now();
      try {
        const { fetchBimrHelp } = await import("./help.ts");
        const text = await fetchBimrHelp();
        ctx.trace("tool bimr_help", t0, `${text.length} chars`);
        return text;
      } catch (e) {
        ctx.trace("tool bimr_help", t0, "error");
        return `error: ${errMsg(e)}`;
      }
    },
  });

  const samples = tool({
    description:
      "Read the BIMR sample corpus in the bimr/samples forge repo: proven Python models to learn from. Omit path to list the repo; pass a path to read that file. Reuse these established patterns instead of inventing them.",
    inputSchema: z.object({
      path: z
        .string()
        .optional()
        .describe("File or directory path in bimr/samples (omit to list the root)"),
    }),
    execute: async ({ path }) => {
      const t0 = ctx.now();
      try {
        const forge = await import("../../forge/forgejo.ts");
        const [owner, name] = forge.splitRepo(BIMR_SAMPLES_REPO);
        if (path) {
          try {
            const file = await forge.readFile(owner, name, path);
            ctx.trace("tool bimr_samples", t0, `${path} · ${file.content.length} chars`);
            return file.content;
          } catch {
            // Not a file (likely a directory) — fall through to the listing.
          }
        }
        const [info, entries] = await Promise.all([
          forge.getRepo(owner, name),
          forge.listContents(owner, name, path ?? ""),
        ]);
        ctx.trace("tool bimr_samples", t0, `${path ?? ""} · ${entries.length}`);
        if (!entries.length) return "(empty directory)";
        return entries
          .map(
            (e) =>
              `${e.type === "dir" ? "dir " : "file"} [${e.path}](${forge.fileWebUrl(info, e.path)})`,
          )
          .join("\n");
      } catch (e) {
        ctx.trace("tool bimr_samples", t0, "error");
        return `error: ${errMsg(e)}`;
      }
    },
  });

  const run = tool({
    description:
      "Execute the active python file through the BIMR runtime (MicroPython → IFCX) and render the model in the viewer. Returns the compile error if any, or a success notice with the captured stdout.",
    inputSchema: z.object({}),
    execute: async () => {
      const t0 = ctx.now();
      const session = await import("./session.ts");
      const snap = await session.runModel();
      const ok = !snap.error && !!snap.ifcx;
      ctx.markRun?.(ok);
      ctx.trace(
        "tool bimr_run",
        t0,
        ok ? `ok · ${session.countEntities(snap.ifcx)} entities` : "compile error",
      );
      if (ok) {
        return `model ran and rendered OK\nstdout: ${snap.output || "(none)"}`;
      }
      return `compile error:\n${snap.error}`;
    },
  });

  const tools: Record<string, Tool> = { bimr_help: help, bimr_samples: samples };
  // The run tool only belongs to Learn. With no mode (registry validation and
  // tool inspection), list every tool the module can expose.
  if (!ctx.mode || ctx.mode === "learn") tools.bimr_run = run;
  return tools;
}
