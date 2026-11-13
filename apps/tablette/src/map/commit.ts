// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/map/commit.ts — atomic commit of generated app files.
//
// The forge exposes the contents API one file at a time, which can leave an app
// half-written if the catalogue update fails. Clone the small gis-apps repo
// into a scratch directory, write all files, commit once and push. The scratch
// directory is separate from the Studio workspace: saving an app never replaces
// the sketch the user is editing.

import git from "isomorphic-git";
import httpWeb from "isomorphic-git/http/web";
import type { GitHttpRequest } from "isomorphic-git/http/web";
import * as vfs from "../forge/fs";
import { forgeAuth, forgeUrl, gitAuth, gitHeaders } from "../forge/auth";
import { gitCorsProxy } from "../forge/proxy";
import { record } from "../agent/trace";

const DIR = "/gis-commit";
const AUTHOR = { name: "Studio Agent", email: "bot@bimr.net" };
const NET_TIMEOUT_MS = 60_000;

export interface AppFile {
  path: string;
  content: string;
}

export interface AppCommit {
  sha: string;
  url: string;
}

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

async function mkdirp(absDir: string): Promise<void> {
  const parts = absDir.split("/").filter(Boolean);
  let cur = "";
  for (const part of parts) {
    cur += `/${part}`;
    try {
      await vfs.fs.promises.mkdir(cur);
    } catch {
      // already exists
    }
  }
}

async function rmrf(dir: string): Promise<void> {
  let names: string[];
  try {
    names = await vfs.fs.promises.readdir(dir);
  } catch {
    return;
  }
  for (const name of names) {
    const entry = `${dir}/${name}`;
    let st;
    try {
      st = await vfs.fs.promises.stat(entry);
    } catch {
      continue;
    }
    if (st.isDirectory()) await rmrf(entry);
    try {
      if (st.isDirectory()) await vfs.fs.promises.rmdir(entry);
      else await vfs.fs.promises.unlink(entry);
    } catch {
      // entry vanished under us
    }
  }
}

async function write(path: string, content: string): Promise<void> {
  const abs = `${DIR}/${path}`;
  const parent = abs.slice(0, abs.lastIndexOf("/"));
  if (parent && parent !== DIR) await mkdirp(parent);
  await vfs.fs.promises.writeFile(abs, content, "utf8");
}

/**
 * Clone `owner/repo` into a scratch directory, write `files`, commit once and
 * push to the same branch. Returns the commit sha and its web URL.
 */
export async function commitRepoFiles(
  owner: string,
  repo: string,
  files: AppFile[],
  message: string,
): Promise<AppCommit> {
  if (!files.length) throw new Error("commitRepoFiles: no files");
  const auth = forgeAuth();
  if (!auth) {
    throw new Error(
      "Forge not configured. Open Settings and add the forge URL and access token.",
    );
  }
  const url = `${forgeUrl()}/${owner}/${repo}.git`;
  record("gis commit", `start ${owner}/${repo}`);

  try {
    await rmrf(DIR);
    await mkdirp(DIR);
    await withTimeout(
      git.clone({
        fs: vfs.fs,
        http,
        dir: DIR,
        url,
        corsProxy: gitCorsProxy(),
        headers: gitHeaders(auth),
        onAuth: () => gitAuth(auth)(),
        singleBranch: true,
        depth: 1,
      }),
      NET_TIMEOUT_MS,
      "git clone",
    );

    for (const file of files) {
      await write(file.path, file.content);
      await git.add({ fs: vfs.fs, dir: DIR, filepath: file.path });
    }

    const rows = await git.statusMatrix({ fs: vfs.fs, dir: DIR });
    const dirty = rows.some(([, head, workdir, stage]) => head !== workdir || head !== stage);
    if (!dirty) {
      const head = await git.resolveRef({ fs: vfs.fs, dir: DIR, ref: "HEAD" });
      record("gis commit", "no changes");
      return { sha: head, url: `${forgeUrl()}/${owner}/${repo}/commit/${head}` };
    }

    const sha = await git.commit({ fs: vfs.fs, dir: DIR, message, author: AUTHOR });
    const branch = (await git.currentBranch({ fs: vfs.fs, dir: DIR, fullname: false })) ?? "main";
    await withTimeout(
      git.push({
        fs: vfs.fs,
        http,
        dir: DIR,
        remote: "origin",
        ref: branch,
        corsProxy: gitCorsProxy(),
        headers: gitHeaders(auth),
        onAuth: gitAuth(auth),
      }),
      NET_TIMEOUT_MS,
      "git push",
    );
    record("gis commit", `done ${sha.slice(0, 7)}`);
    return { sha, url: `${forgeUrl()}/${owner}/${repo}/commit/${sha}` };
  } finally {
    await rmrf(DIR);
  }
}
