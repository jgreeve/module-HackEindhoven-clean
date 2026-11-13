// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/forge/workspace.ts — the Studio file workspace.
//
// A file tree persisted in the LightningFS VFS. The editor is bound to the
// *active file*; the agent reads and writes files by path (any depth). The
// active file's content is cached so the editor stays synchronous; all other
// file access goes through the VFS.

import starterHtml from "../map/starter.html?raw";
import * as vfs from "./fs";

// A fresh GIS Studio workspace starts from a minimal HTML page. The active
// file is the editable artifact the agent and the editor share.
export const DEFAULT_FILE = "maps/sketch.html";
export const DEFAULT_CONTENT = starterHtml;

// Older releases seeded `maps/sketch.html` with a bundled starter that has
// since changed. Replace a copy of any previous starter with the current page
// on load, so upgrades do not keep showing stale sample content.
const LEGACY_STARTER_MARKERS: string[][] = [
  ["<title>Rennes parks</title>", "/* --- block: base-map@0.1.0 --- */"],
  ["<title>New app</title>", "Ask the assistant for a map"],
  ["<h1>Studio</h1>", "<p>A generative app editor.</p>"],
  ["<h1>Studio</h1>", "<p>A generative app for OpenStreetMap maps.</p>"],
  ["<h1>Studio</h1>", "<p>A generative app.</p>"],
  ["<h1>Tablette</h1>", "https://git.bimr.net/rvba/tablette"],
  ["<h1>Tablette</h1>", '<a href="https://docs.tablette.bimr.net/">docs.tablette.bimr.net</a>'],
];

function isLegacyStarter(content: string): boolean {
  return LEGACY_STARTER_MARKERS.some((markers) =>
    markers.every((marker) => content.includes(marker)),
  );
}

export type FileListener = (path: string, content: string) => void;
export type FilesListener = (files: string[]) => void;

const fileListeners = new Set<FileListener>();
const filesListeners = new Set<FilesListener>();
const cache = new Map<string, string>();
let activePath = DEFAULT_FILE;
let initPromise: Promise<void> | null = null;

/** Load the persisted workspace (idempotent; concurrent callers share one run). */
export function init(): Promise<void> {
  if (!initPromise) initPromise = loadWorkspace();
  return initPromise;
}

async function loadWorkspace(): Promise<void> {
  await vfs.ensureRoot();
  if (!(await vfs.exists(DEFAULT_FILE))) {
    await vfs.writeFile(DEFAULT_FILE, DEFAULT_CONTENT);
  } else if (isLegacyStarter(await vfs.readFile(DEFAULT_FILE))) {
    await vfs.writeFile(DEFAULT_FILE, DEFAULT_CONTENT);
  }
  const files = await vfs.listFilesRecursive();

  const active = files.includes(activePath) ? activePath : DEFAULT_FILE;
  await loadActive(active);
  emitFile(activePath, getActiveContent());
  emitFiles();
}

async function loadActive(path: string): Promise<void> {
  activePath = path;
  cache.set(path, await vfs.readFile(path));
}

export function getActivePath(): string {
  return activePath;
}

export function getActiveContent(): string {
  return cache.get(activePath) ?? "";
}

export function getFile(path: string): string | undefined {
  return cache.get(path);
}

export async function listFiles(): Promise<string[]> {
  await init();
  return vfs.listFilesRecursive();
}

/** Whether a workspace-relative path exists. */
export async function exists(path: string): Promise<boolean> {
  await init();
  return vfs.exists(path);
}

/** Create the default sketch if it is missing (e.g. after a clone). */
export async function ensureDefaultFile(): Promise<void> {
  if (await vfs.exists(DEFAULT_FILE)) return;
  await vfs.writeFile(DEFAULT_FILE, DEFAULT_CONTENT);
  cache.set(DEFAULT_FILE, DEFAULT_CONTENT);
  emitFiles();
}

export async function readFile(path: string): Promise<string> {
  const cached = cache.get(path);
  if (cached !== undefined) return cached;
  const content = await vfs.readFile(path);
  cache.set(path, content);
  return content;
}

/** Update the active file (editor edits) — synchronous + persisted. */
export function setActiveContent(content: string): void {
  cache.set(activePath, content);
  emitFile(activePath, content);
  persist(activePath, content);
}

/** Write (create or overwrite) a file. A `.py` or `.html` file becomes active. */
export async function writeFile(path: string, content: string): Promise<void> {
  await vfs.writeFile(path, content);
  cache.set(path, content);
  emitFiles();
  if (path.endsWith(".py") || path.endsWith(".html")) {
    activePath = path;
    emitFile(path, content);
  }
}

/** Switch the active file; notifies the editor. */
export async function openFile(path: string): Promise<void> {
  await loadActive(path);
  emitFile(path, getActiveContent());
}

export async function createFile(path: string, content = ""): Promise<void> {
  if (await vfs.exists(path)) throw new Error(`file already exists: ${path}`);
  await writeFile(path, content);
}

export async function deleteFile(path: string): Promise<void> {
  await vfs.deleteFile(path);
  cache.delete(path);
  if (path === activePath) {
    const files = await listFiles();
    await loadActive(files[0] ?? DEFAULT_FILE);
    if (!(await vfs.exists(activePath))) {
      await vfs.writeFile(DEFAULT_FILE, DEFAULT_CONTENT);
      await loadActive(DEFAULT_FILE);
    }
    emitFile(activePath, getActiveContent());
  }
  emitFiles();
}

/** Reload the active file from disk after git changes the working tree. */
export async function reload(): Promise<void> {
  cache.clear();
  const files = await vfs.listFilesRecursive();
  const active = files.includes(activePath) ? activePath : files[0] ?? DEFAULT_FILE;
  if (!(await vfs.exists(active))) await vfs.writeFile(DEFAULT_FILE, DEFAULT_CONTENT);
  await loadActive(active);
  emitFile(activePath, getActiveContent());
  emitFiles();
}

/** Clear the whole workspace (before a clone). */
export async function clear(): Promise<void> {
  cache.clear();
  await vfs.wipe();
  emitFiles();
}

/** Reset to a single default python file. */
export function reset(): void {
  cache.clear();
  cache.set(DEFAULT_FILE, DEFAULT_CONTENT);
  activePath = DEFAULT_FILE;
  emitFile(DEFAULT_FILE, DEFAULT_CONTENT);
  emitFiles();
  vfs
    .wipe()
    .then(() => vfs.writeFile(DEFAULT_FILE, DEFAULT_CONTENT))
    .then(() => emitFiles())
    .catch((e) => console.error("[studio] reset workspace", e));
}

export function subscribeFile(fn: FileListener): () => void {
  fileListeners.add(fn);
  return () => void fileListeners.delete(fn);
}

export function subscribeFiles(fn: FilesListener): () => void {
  filesListeners.add(fn);
  return () => void filesListeners.delete(fn);
}

function persist(path: string, content: string): void {
  vfs
    .writeFile(path, content)
    .catch((e) => console.error("[studio] persist", path, e));
}

function emitFile(path: string, content: string): void {
  for (const fn of fileListeners) fn(path, content);
}

function emitFiles(): void {
  void vfs
    .listFilesRecursive()
    .then((files) => {
      for (const fn of filesListeners) fn(files);
    })
    .catch((e) => console.error("[studio] list files", e));
}
