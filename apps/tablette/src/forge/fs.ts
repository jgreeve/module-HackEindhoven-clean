// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/forge/fs.ts — the Studio virtual filesystem.
//
// Studio has no server and no native filesystem, so the workspace lives in the
// browser's IndexedDB through LightningFS. Every forge/workspace module goes
// through here, which keeps the storage engine swappable.

import FS from "@isomorphic-git/lightning-fs";

export const FS_NAME = "studio-fs";
export const WORKSPACE_ROOT = "/workspace";

export const fs = new FS(FS_NAME);

/** Absolute path for a workspace-relative path. */
export function abs(relPath: string): string {
  const clean = relPath.replace(/^\/+/, "").replace(/\/+$/, "");
  return clean ? `${WORKSPACE_ROOT}/${clean}` : WORKSPACE_ROOT;
}

async function mkdirp(absDir: string): Promise<void> {
  const parts = absDir.split("/").filter(Boolean);
  let cur = "";
  for (const part of parts) {
    cur += `/${part}`;
    try {
      await fs.promises.mkdir(cur);
    } catch {
      // already exists
    }
  }
}

export async function ensureRoot(): Promise<void> {
  await mkdirp(WORKSPACE_ROOT);
}

export async function exists(relPath: string): Promise<boolean> {
  try {
    await fs.promises.stat(abs(relPath));
    return true;
  } catch {
    return false;
  }
}

export async function readFile(relPath: string): Promise<string> {
  return fs.promises.readFile(abs(relPath), { encoding: "utf8" });
}

export async function writeFile(relPath: string, content: string): Promise<void> {
  const path = abs(relPath);
  const dir = path.slice(0, path.lastIndexOf("/"));
  if (dir && dir !== WORKSPACE_ROOT) await mkdirp(dir);
  await fs.promises.writeFile(path, content, "utf8");
}

export async function deleteFile(relPath: string): Promise<void> {
  await fs.promises.unlink(abs(relPath));
}

/** Entries in a directory (default: workspace root), `.git` filtered out. */
export async function readdir(relPath = ""): Promise<string[]> {
  const entries = await fs.promises.readdir(abs(relPath));
  return entries.filter((e) => e !== ".git").sort();
}

/** All files under a directory, recursively, as workspace-relative paths. */
export async function listFilesRecursive(relPath = ""): Promise<string[]> {
  const out: string[] = [];
  for (const name of await readdir(relPath)) {
    const rel = relPath ? `${relPath}/${name}` : name;
    const st = await fs.promises.stat(abs(rel));
    if (st.isDirectory()) out.push(...(await listFilesRecursive(rel)));
    else out.push(rel);
  }
  return out.sort();
}

/** Recursively remove a directory and its contents (includes `.git`). */
async function rmrf(dir: string): Promise<void> {
  let names: string[];
  try {
    names = await fs.promises.readdir(dir);
  } catch {
    // nothing there
    return;
  }
  for (const name of names) {
    const entry = `${dir}/${name}`;
    let st;
    try {
      st = await fs.promises.stat(entry);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      await rmrf(entry);
    }
    try {
      if (st.isDirectory()) await fs.promises.rmdir(entry);
      else await fs.promises.unlink(entry);
    } catch {
      // entry vanished under us
    }
  }
}

/** Wipe the whole filesystem (tests / explicit reset). */
export async function wipe(): Promise<void> {
  // Delete through the same VFS instead of re-running fs.init(wipe). Re-init
  // replaces LightningFS's internal `_initPromise` and then waits
  // (_gracefulShutdown) for in-flight operations to drain — but those
  // operations are themselves waiting on that new `_initPromise`: a permanent
  // deadlock whenever any op is pending (e.g. a reset racing listFiles/writes).
  await rmrf(WORKSPACE_ROOT);
  await ensureRoot();
}
