// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/forge/forgejo.ts — a small Forgejo REST client.
//
// Covers discovery (repos, orgs, trees, files, wiki) and the write calls the
// editor needs (create repo, publish a file). All calls go through `api()` so
// auth and the CORS proxy are handled in one place.

import { apiHeaders, forgeAuth, forgeUrl, requireForgeAuth } from "./auth";
import { apiBase, describeAccessError } from "./proxy";

export interface ForgeRepo {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
  description: string;
  html_url: string;
  default_branch: string;
  private: boolean;
  updated_at: string;
  topics?: string[];
}

export interface ForgeEntry {
  name: string;
  path: string;
  type: "file" | "dir" | "symlink" | "submodule";
  size: number;
}

export interface ForgeFile {
  path: string;
  content: string;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  // Anonymous reads are allowed: the Authorization header is only added when a
  // token is configured. Public repos/content work without it.
  const auth = forgeAuth();
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(auth ? apiHeaders(auth) : {}),
    ...((init?.headers as Record<string, string> | undefined) ?? {}),
  };
  // The forge is reached through the resolved proxy (see ./proxy), which is the
  // only route that works for a cross-origin forge in the browser.
  let res: Response;
  try {
    res = await fetch(`${apiBase()}${path}`, { ...init, headers });
  } catch (err) {
    throw describeAccessError(err);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const detail = body ? `: ${body.slice(0, 200)}` : "";
    throw new Error(`forge ${res.status} ${res.statusText}${detail}`);
  }
  return (await res.json()) as T;
}

function encodePath(path: string): string {
  return path
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
}

/** Split "owner/name" (or a repo URL) into owner and name. */
export function splitRepo(repo: string): [string, string] {
  const clean = repo
    .replace(/^https?:\/\/[^/]+\//, "")
    .replace(/\.git$/, "")
    .replace(/^\/+|\/+$/g, "");
  const parts = clean.split("/");
  if (parts.length < 2) throw new Error(`expected owner/name, got "${repo}"`);
  return [parts[parts.length - 2], parts[parts.length - 1]];
}

export async function searchRepos(query: string, limit = 10): Promise<ForgeRepo[]> {
  const q = encodeURIComponent(query);
  const data = await api<{ data: ForgeRepo[] }>(`/repos/search?q=${q}&limit=${limit}`);
  return data.data ?? [];
}

/** Repositories owned by (or visible to) the authenticated bot user. */
export async function listUserRepos(limit = 30): Promise<ForgeRepo[]> {
  return api<ForgeRepo[]>(`/user/repos?limit=${limit}`);
}

/** Repositories owned by a user or organization (org tried first). */
export async function listOwnerRepos(owner: string, limit = 30): Promise<ForgeRepo[]> {
  try {
    return await api<ForgeRepo[]>(`/orgs/${owner}/repos?limit=${limit}`);
  } catch (orgErr) {
    try {
      return await api<ForgeRepo[]>(`/users/${owner}/repos?limit=${limit}`);
    } catch {
      throw orgErr;
    }
  }
}

/** Every repository the bot can see (empty query = list all), newest first. */
export async function exploreRepos(limit = 50): Promise<ForgeRepo[]> {
  const data = await api<{ data: ForgeRepo[] }>(
    `/repos/search?q=&limit=${limit}&sort=updated`,
  );
  return data.data ?? [];
}

export interface ForgeOrg {
  id: number;
  username: string;
  full_name: string;
  description: string;
  visibility?: string;
}

/** Organizations on the forge. */
export async function listOrgs(limit = 50): Promise<ForgeOrg[]> {
  return api<ForgeOrg[]>(`/orgs?limit=${limit}`);
}

export async function getRepo(owner: string, repo: string): Promise<ForgeRepo> {
  return api<ForgeRepo>(`/repos/${owner}/${repo}`);
}

export async function listContents(
  owner: string,
  repo: string,
  path = "",
  ref?: string,
): Promise<ForgeEntry[]> {
  const q = ref ? `?ref=${encodeURIComponent(ref)}` : "";
  const data = await api<ForgeEntry[] | ForgeEntry>(
    `/repos/${owner}/${repo}/contents/${encodePath(path)}${q}`,
  );
  return Array.isArray(data) ? data : [data];
}

function decodeBase64Utf8(b64: string): string {
  const bin = atob(b64.replace(/\s/g, ""));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/**
 * Create or update a file in a repo via the contents API (no git). Creates the
 * directories in the path as needed. Used to publish when a git push cannot.
 */
export async function putFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch = "main",
): Promise<void> {
  let sha: string | undefined;
  try {
    const existing = await api<{ sha?: string }>(
      `/repos/${owner}/${repo}/contents/${encodePath(path)}?ref=${encodeURIComponent(branch)}`,
    );
    sha = existing.sha;
  } catch {
    // new file
  }
  const body: Record<string, unknown> = {
    content: encodeBase64Utf8(content),
    message,
    branch,
  };
  if (sha) body.sha = sha;
  await api(`/repos/${owner}/${repo}/contents/${encodePath(path)}`, {
    method: sha ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function readFile(
  owner: string,
  repo: string,
  path: string,
  ref?: string,
): Promise<ForgeFile> {
  const q = ref ? `?ref=${encodeURIComponent(ref)}` : "";
  const data = await api<{ path: string; content?: string }>(
    `/repos/${owner}/${repo}/contents/${encodePath(path)}${q}`,
  );
  if (!data.content) throw new Error(`${path} is a directory, not a file`);
  return { path: data.path, content: decodeBase64Utf8(data.content) };
}

/** Wiki page names for a repo (empty when the repo has no wiki). */
export async function listWikiPages(owner: string, repo: string): Promise<string[]> {
  try {
    const data = await api<{ data?: string[] } | string[]>(
      `/repos/${owner}/${repo}/wiki/pages`,
    );
    return Array.isArray(data) ? data : (data.data ?? []);
  } catch {
    return [];
  }
}

/** Read a wiki page's markdown content. */
export async function readWikiPage(
  owner: string,
  repo: string,
  page: string,
): Promise<string> {
  const data = await api<{ content_base64?: string; content?: string }>(
    `/repos/${owner}/${repo}/wiki/page/${encodeURIComponent(page)}`,
  );
  if (data.content_base64) return decodeBase64Utf8(data.content_base64);
  return data.content ?? "";
}

export interface CreateRepoOptions {
  name: string;
  description?: string;
  private?: boolean;
  autoInit?: boolean;
}

/** Create a repository owned by the authenticated bot user. */
export async function createRepo(opts: CreateRepoOptions): Promise<ForgeRepo> {
  return api<ForgeRepo>(`/user/repos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: opts.name,
      description: opts.description ?? "",
      private: opts.private ?? false,
      auto_init: opts.autoInit ?? false,
    }),
  });
}

/** HTTPS clone URL for a repo on the configured forge. */
export function cloneUrl(owner: string, repo: string): string {
  const auth = requireForgeAuth();
  return `${auth.url}/${owner}/${repo}.git`;
}

/** Web URL of a repository. */
export function repoWebUrl(r: ForgeRepo): string {
  return r.html_url;
}

/** Web URL of a branch (branch slashes are kept literal, as Forgejo expects). */
export function branchWebUrl(r: ForgeRepo, ref?: string): string {
  return `${r.html_url}/src/branch/${ref ?? r.default_branch}`;
}

/** Web URL of a file on a branch. */
export function fileWebUrl(r: ForgeRepo, path: string, ref?: string): string {
  const clean = path
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  return `${r.html_url}/src/branch/${ref ?? r.default_branch}/${clean}`;
}

/** Raw content URL for a path in a repo (owner/name form). */
export function repoRawUrl(
  owner: string,
  repo: string,
  path: string,
  ref = "main",
): string {
  const clean = path
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  return `${forgeUrl()}/${owner}/${repo}/raw/branch/${ref}/${clean}`;
}
