// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/forge/git.ts — git operations on the LightningFS workspace.
//
// isomorphic-git runs in the browser over the same VFS the editor uses, so the
// working tree the agent edits is the tree git sees. Clone/push reach the forge
// through the resolved proxy (see ./proxy) — Forgejo sends no CORS headers on
// git routes, so a direct cross-origin call cannot work in the browser.

import git from "isomorphic-git";
import httpWeb from "isomorphic-git/http/web";
import type { GitHttpRequest } from "isomorphic-git/http/web";
import * as vfs from "./fs";
import * as workspace from "./workspace";
import { forgeAuth, gitAuth, gitHeaders } from "./auth";
import type { ForgeAuth } from "./auth";
import { gitCorsProxy } from "./proxy";
import { record } from "../agent/trace";

const DIR = vfs.WORKSPACE_ROOT;
const AUTHOR = { name: "Studio Agent", email: "bot@bimr.net" };
const NET_TIMEOUT_MS = 60_000;

// isomorphic-git's web client passes fetchOptions straight to fetch(). Setting
// credentials:"omit" stops the browser from handling a 401 challenge, so
// Firefox never opens its HTTP-auth / save-password modal.
const http = {
  request: (req: GitHttpRequest) =>
    httpWeb.request({ ...req, fetchOptions: { ...req.fetchOptions, credentials: "omit" } }),
};

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

function requireAuth(): ForgeAuth {
  const auth = forgeAuth();
  if (!auth) {
    throw new Error(
      "Forge not configured. Open Settings and add the forge URL and access token.",
    );
  }
  return auth;
}

export interface GitFileStatus {
  path: string;
  status: string;
}

function statusLetter(head: number, workdir: number, stage: number): string {
  if (head === 1 && workdir === 1 && stage === 1) return "";
  if (head === 0 && workdir === 2 && stage === 0) return "??";
  if (head === 0 && stage === 2) return "A";
  if (head === 0 && stage === 3) return "AM";
  if (head === 1 && workdir === 2 && stage === 1) return "M";
  if (head === 1 && workdir === 2 && stage === 2) return "M ";
  if (head === 1 && workdir === 2 && stage === 3) return "MM";
  if (head === 1 && workdir === 0 && stage === 1) return "D";
  if (head === 1 && workdir === 0 && stage === 0) return "D ";
  return "?";
}

export async function isRepo(): Promise<boolean> {
  return vfs.exists(".git");
}

export async function init(defaultBranch = "main"): Promise<void> {
  await git.init({ fs: vfs.fs, dir: DIR, defaultBranch });
}

export async function status(): Promise<GitFileStatus[]> {
  const rows = await git.statusMatrix({ fs: vfs.fs, dir: DIR });
  const out: GitFileStatus[] = [];
  for (const [path, head, workdir, stage] of rows) {
    const s = statusLetter(head, workdir, stage);
    if (s) out.push({ path: String(path), status: s });
  }
  return out;
}

export async function currentBranch(): Promise<string | undefined> {
  const branch = await git.currentBranch({ fs: vfs.fs, dir: DIR, fullname: false });
  return branch ?? undefined;
}

export async function listBranches(): Promise<string[]> {
  return git.listBranches({ fs: vfs.fs, dir: DIR });
}

/** Stage every change (adds, edits and deletions). */
async function stageAll(): Promise<void> {
  const rows = await git.statusMatrix({ fs: vfs.fs, dir: DIR });
  for (const [path, head, workdir] of rows) {
    const p = String(path);
    if (head === 1 && workdir === 0) {
      await git.remove({ fs: vfs.fs, dir: DIR, filepath: p });
    } else if (workdir !== 0) {
      await git.add({ fs: vfs.fs, dir: DIR, filepath: p });
    }
  }
}

export async function commit(message: string): Promise<string> {
  await stageAll();
  return git.commit({ fs: vfs.fs, dir: DIR, message, author: AUTHOR });
}

/** Stage only the given workspace-relative paths (adds, edits, deletions). */
async function stagePaths(paths: string[]): Promise<void> {
  const wanted = new Set(paths);
  const rows = await git.statusMatrix({ fs: vfs.fs, dir: DIR });
  for (const [path, head, workdir] of rows) {
    const p = String(path);
    if (!wanted.has(p)) continue;
    if (head === 1 && workdir === 0) {
      await git.remove({ fs: vfs.fs, dir: DIR, filepath: p });
    } else if (workdir !== 0) {
      await git.add({ fs: vfs.fs, dir: DIR, filepath: p });
    }
  }
}

/** Commit only the given paths with a message. Returns the commit oid. */
export async function commitPaths(paths: string[], message: string): Promise<string> {
  await stagePaths(paths);
  return git.commit({ fs: vfs.fs, dir: DIR, message, author: AUTHOR });
}

/** Whether the workspace has uncommitted changes (optionally for one path). */
export async function isDirty(path?: string): Promise<boolean> {
  if (!(await isRepo())) return false;
  const rows = await status();
  return path ? rows.some((r) => r.path === path) : rows.length > 0;
}

/** Content of a path at HEAD, or null when it is new / not committed. */
export async function readHead(path: string): Promise<string | null> {
  try {
    const { blob } = await git.readBlob({
      fs: vfs.fs,
      dir: DIR,
      oid: "HEAD",
      filepath: path,
    });
    return new TextDecoder().decode(blob);
  } catch {
    return null;
  }
}

export async function createBranch(name: string, checkout = true): Promise<void> {
  await git.branch({ fs: vfs.fs, dir: DIR, ref: name, checkout });
  if (checkout) await workspace.reload();
}

export async function checkout(ref: string): Promise<void> {
  await git.checkout({ fs: vfs.fs, dir: DIR, ref });
  await workspace.reload();
}

export interface CommitInfo {
  oid: string;
  message: string;
  author: string;
  date: string;
}

export async function log(limit = 10): Promise<CommitInfo[]> {
  const commits = await git.log({ fs: vfs.fs, dir: DIR, depth: limit });
  return commits.map((c) => ({
    oid: c.oid,
    message: c.commit.message.trim(),
    author: c.commit.author.name,
    date: new Date(c.commit.author.timestamp * 1000).toISOString(),
  }));
}

export async function listRemotes(): Promise<{ remote: string; url: string }[]> {
  return git.listRemotes({ fs: vfs.fs, dir: DIR });
}

export interface RepoInfo {
  base: string;
  owner: string;
  repo: string;
  remoteUrl: string;
}

/** Parse the origin remote into forge web URLs (null if no remote). */
export async function repoInfo(): Promise<RepoInfo | null> {
  const remotes = await git.listRemotes({ fs: vfs.fs, dir: DIR });
  const origin = remotes.find((r) => r.remote === "origin") ?? remotes[0];
  if (!origin) return null;
  const m = /^(https?:\/\/[^/]+)\/([^/]+)\/(.+?)(?:\.git)?\/?$/.exec(origin.url);
  if (!m) return null;
  return { base: m[1], owner: m[2], repo: m[3], remoteUrl: origin.url };
}

export function repoUrl(info: RepoInfo): string {
  return `${info.base}/${info.owner}/${info.repo}`;
}

export function commitUrl(info: RepoInfo, oid: string): string {
  return `${info.base}/${info.owner}/${info.repo}/commit/${oid}`;
}

export function branchUrl(info: RepoInfo, ref: string): string {
  return `${info.base}/${info.owner}/${info.repo}/src/branch/${ref}`;
}

export function fileUrl(info: RepoInfo, ref: string, path: string): string {
  return `${info.base}/${info.owner}/${info.repo}/src/branch/${ref}/${path}`;
}

export async function setRemote(url: string, name = "origin"): Promise<void> {
  const remotes = await git.listRemotes({ fs: vfs.fs, dir: DIR });
  if (remotes.some((r) => r.remote === name)) {
    await git.deleteRemote({ fs: vfs.fs, dir: DIR, remote: name });
  }
  await git.addRemote({ fs: vfs.fs, dir: DIR, remote: name, url });
}

export async function clone(url: string, ref?: string): Promise<void> {
  const auth = requireAuth();
  record("git clone", "start");
  await workspace.clear();
  record("git clone", "workspace cleared");
  await withTimeout(
    git.clone({
      fs: vfs.fs,
      http,
      dir: DIR,
      url,
      corsProxy: gitCorsProxy(),
      headers: gitHeaders(auth),
      onAuth: (u) => {
        record("git clone", `auth ${u}`);
        return gitAuth(auth)();
      },
      onMessage: (m) => record("git clone msg", m.trim()),
      onProgress: (p) => record("git clone progress", `${p.phase} ${p.loaded}/${p.total}`),
      singleBranch: true,
      depth: 1,
      ...(ref ? { ref } : {}),
    }),
    NET_TIMEOUT_MS,
    "git clone",
  );
  record("git clone", "fetched");
  await workspace.reload();
  record("git clone", "done");
}

export async function push(remote = "origin", ref?: string): Promise<void> {
  const auth = requireAuth();
  const branch = ref ?? (await currentBranch());
  record("git push", `start ${branch}`);
  await withTimeout(
    git.push({
      fs: vfs.fs,
      http,
      dir: DIR,
      remote,
      ...(branch ? { ref: branch } : {}),
      corsProxy: gitCorsProxy(),
      headers: gitHeaders(auth),
      onAuth: gitAuth(auth),
    }),
    NET_TIMEOUT_MS,
    "git push",
  );
  record("git push", "done");
}

export async function tag(name: string): Promise<void> {
  await git.annotatedTag({
    fs: vfs.fs,
    dir: DIR,
    ref: name,
    message: name,
    tagger: AUTHOR,
  });
}
