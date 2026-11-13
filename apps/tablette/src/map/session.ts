// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/map/session.ts — the live GIS app session.
//
// Like the old BIMR session, this is the single source of truth shared by the
// editor, the viewer and the agent tools. The editable artifact is the active
// HTML file of the workspace (`maps/<slug>.html`); running it publishes the
// document to the preview store, which the viewer renders in an iframe.

import starterHtml from "./starter.html?raw";
import * as workspace from "../forge/workspace";
import { record } from "../agent/trace";
import { clearPreview, setPreview } from "./preview";
import { readApp } from "./repo";
import { slugify } from "./catalogue";
import type { GisAppBundle } from "./types";

export type MapStatusKind = "idle" | "ok" | "error";

export type MapDocumentKind = "map" | "report" | "other";

/** Classify a workspace file for the right-hand pane. */
export function documentKind(path: string): MapDocumentKind {
  if (!path.endsWith(".html")) return "other";
  return path.startsWith("reports/") ? "report" : "map";
}

export interface MapStatus {
  kind: MapStatusKind;
  text: string;
}

export interface MapState {
  /** Active workspace file; the app source is only valid for `.html`. */
  path: string;
  /** Whether the active file is a map app, a report or another file. */
  documentKind: MapDocumentKind;
  title: string;
  source: string;
  blockIds: string[];
  status: MapStatus;
}

const DEFAULT_STATUS: MapStatus = {
  kind: "idle",
  text: "Run the app to refresh the map.",
};

let status: MapStatus = DEFAULT_STATUS;
let bootPromise: Promise<void> | null = null;
const blockIdsByPath = new Map<string, string[]>();
const listeners = new Set<(state: MapState) => void>();

function appTitle(html: string, fallback: string): string {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const title = m?.[1]?.trim();
  return title || fallback;
}

function appPath(): string {
  return workspace.getActivePath();
}

function stemOf(path: string): string {
  return path.replace(/^(maps|reports)\//, "").replace(/\.html$/, "") || "Map app";
}

function sourceOf(path: string): string {
  return path === workspace.getActivePath() ? workspace.getActiveContent() : "";
}

function blockIdsOf(path: string): string[] {
  return blockIdsByPath.get(path) ?? [];
}

export function getState(): MapState {
  const path = appPath();
  const source = sourceOf(path);
  return {
    path,
    documentKind: documentKind(path),
    title: appTitle(source, stemOf(path)),
    source,
    blockIds: blockIdsOf(path),
    status,
  };
}

/** The current app source and provenance (used by gis_save_app). */
export function getCurrentApp(): { path: string; html: string; title: string; blockIds: string[] } {
  const state = getState();
  return { path: state.path, html: state.source, title: state.title, blockIds: state.blockIds };
}

function emit(): void {
  const state = getState();
  for (const fn of listeners) fn(state);
}

function setStatus(next: MapStatus): void {
  status = next;
  emit();
}

export function subscribeState(fn: (state: MapState) => void): () => void {
  listeners.add(fn);
  fn(getState());
  return () => void listeners.delete(fn);
}

// Any active-file change (agent write, file menu, editor sync) refreshes the
// editor/viewer state.
workspace.subscribeFile(() => emit());

/** Create the default starter app if the workspace has none (idempotent). */
export async function ensureDefaultApp(): Promise<void> {
  await workspace.init();
  if (!(await workspace.exists(workspace.DEFAULT_FILE))) {
    await workspace.writeFile(workspace.DEFAULT_FILE, starterHtml);
  }
}

/**
 * Warm the workspace and render the starter app. Safe to call more than once;
 * the first call is shared by every caller.
 */
export function boot(): Promise<void> {
  if (!bootPromise) {
    bootPromise = (async () => {
      record("gis boot", "workspace + starter app");
      await ensureDefaultApp();
      if (!workspace.getActivePath().endsWith(".html")) {
        await workspace.openFile(workspace.DEFAULT_FILE);
      }
      runApp();
    })().catch((e) => {
      const message = e instanceof Error ? e.message : String(e);
      record("gis boot failed", message);
      console.error("[studio] gis boot:", e);
      setStatus({ kind: "error", text: `Could not start the GIS workspace: ${message}` });
    });
  }
  return bootPromise;
}

/** Update the active app source (editor typing or agent write). */
export function setSource(source: string): void {
  if (workspace.getActiveContent() === source) return;
  workspace.setActiveContent(source);
  setStatus({ kind: "idle", text: "Edited — run to update the map." });
}

/**
 * Run the active HTML app: publish it to the preview store so the viewer
 * re-renders it. Returns whether a map was produced.
 */
export function runApp(): boolean {
  const path = appPath();
  const source = sourceOf(path);
  if (!path.endsWith(".html")) {
    setStatus({
      kind: "error",
      text: `The active file is not an HTML app (${path}). Open a .html app from the Files menu.`,
    });
    return false;
  }
  if (!source.trim()) {
    setStatus({ kind: "error", text: "The app is empty — write some HTML first." });
    return false;
  }
  // Firefox (and other browsers) refuse file:// subresources from an http
  // page. Catch this early with an actionable message instead of a silent
  // blank map.
  const local = /file:\/\/[^\s"'<>)]*/i.exec(source);
  if (local) {
    setStatus({
      kind: "error",
      text: `The app references a local file URL (${local[0]}). Browsers block file:// from an http page: inline the data or use an https URL.`,
    });
    return false;
  }
  const title = appTitle(source, "Map app");
  setPreview(source, title);
  const label = documentKind(path) === "report" ? "Report" : "Map app";
  setStatus({ kind: "ok", text: `${label} · ${title} · ${source.length.toLocaleString()} chars` });
  record("gis run", `${path} · ${source.length} chars`);
  return true;
}

/** Load the bundled starter app into the default workspace file. */
export async function loadStarter(): Promise<boolean> {
  await ensureDefaultApp();
  await workspace.writeFile(workspace.DEFAULT_FILE, starterHtml);
  blockIdsByPath.set(workspace.DEFAULT_FILE, []);
  status = DEFAULT_STATUS;
  return runApp();
}

/** Load a generated app from bimr/gis-apps into a workspace file and run it. */
export async function openSavedApp(id: string): Promise<GisAppBundle> {
  await ensureDefaultApp();
  const app = await readApp(id);
  const path = `maps/${slugify(app.manifest.id) || "app"}.html`;
  await workspace.writeFile(path, app.entry);
  blockIdsByPath.set(
    path,
    app.manifest.source_blocks.map((block) => block.id),
  );
  status = DEFAULT_STATUS;
  if (!runApp()) throw new Error(status.text);
  return app;
}

/**
 * Adopt an app composed by the agent (`gis_preview_app`): write it to the
 * workspace as the active file and render it.
 */
export async function setComposedApp(
  html: string,
  title: string,
  blockIds: string[] = [],
): Promise<string> {
  await ensureDefaultApp();
  const slug = slugify(title) || "app";
  const path = `maps/${slug}.html`;
  await workspace.writeFile(path, html);
  blockIdsByPath.set(path, [...new Set(blockIds)].filter(Boolean));
  status = DEFAULT_STATUS;
  if (!runApp()) throw new Error(status.text);
  return path;
}

/** Clear the session and start again from the starter app. */
export async function reset(): Promise<void> {
  bootPromise = null;
  blockIdsByPath.clear();
  clearPreview();
  status = DEFAULT_STATUS;
  await workspace.clear();
  await loadStarter();
}
