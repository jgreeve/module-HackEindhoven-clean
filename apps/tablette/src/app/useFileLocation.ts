// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/app/useFileLocation.ts — where the active file lives, for the breadcrumb.
//
// Reads the git remote (owner/repo/branch) and turns the active workspace path
// into a Forgejo-style chain of segments with **links to the forge web UI**.
// When the workspace is not a repo (or has no remote) the root is a local
// "sandbox" that links to the forge home.
//
// The remote can appear after boot (or after a commit links the sandbox), so
// this re-reads git on a short interval and only updates on change.

import { useEffect, useRef, useState } from "react";
import * as git from "../forge/git";
import { forgeUrl } from "../forge/auth";

export interface LocationSegment {
  label: string;
  /** Forge web URL, or null for local segments (sandbox dirs/files). */
  href: string | null;
  kind: "forge" | "owner" | "repo" | "dir" | "file" | "sandbox";
}

export interface FileLocation {
  segments: LocationSegment[];
  branch: string | null;
  /** owner/repo when the workspace has a remote, else null. */
  repo: string | null;
}

interface GitState {
  info: git.RepoInfo | null;
  branch: string | null;
}

export function useFileLocation(activePath: string): FileLocation {
  const [state, setState] = useState<GitState>({ info: null, branch: null });
  const [tick, setTick] = useState(0);
  const keyRef = useRef("");

  // Re-check git state periodically (a remote may be linked after boot/commit).
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let info: git.RepoInfo | null = null;
      let branch: string | null = null;
      try {
        if (await git.isRepo()) {
          const [ri, br] = await Promise.all([git.repoInfo(), git.currentBranch()]);
          info = ri;
          branch = br ?? null;
        }
      } catch {
        // not a repo / no remote -> local sandbox
      }
      if (cancelled) return;
      const key = `${info?.owner ?? ""}/${info?.repo ?? ""}#${branch ?? ""}`;
      if (key !== keyRef.current) {
        keyRef.current = key;
        setState({ info, branch });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activePath, tick]);

  const { info, branch } = state;
  const parts = activePath.split("/").filter(Boolean);
  const file = parts.pop() ?? activePath;
  const dirs = parts;

  const segments: LocationSegment[] = [];

  if (info) {
    const base = forgeUrl() || info.base;
    const ref = branch ?? "main";
    const repoRoot = `${base}/${info.owner}/${info.repo}`;
    segments.push({ label: "forge", href: base, kind: "forge" });
    segments.push({ label: info.owner, href: `${base}/${info.owner}`, kind: "owner" });
    segments.push({ label: info.repo, href: repoRoot, kind: "repo" });
    let acc = "";
    for (const d of dirs) {
      acc = acc ? `${acc}/${d}` : d;
      segments.push({
        label: d,
        href: `${repoRoot}/src/branch/${ref}/${acc}`,
        kind: "dir",
      });
    }
    segments.push({
      label: file,
      href: `${repoRoot}/src/branch/${ref}/${activePath}`,
      kind: "file",
    });
  } else {
    segments.push({ label: "sandbox", href: forgeUrl() || null, kind: "sandbox" });
    for (const d of dirs) segments.push({ label: d, href: null, kind: "dir" });
    segments.push({ label: file, href: null, kind: "file" });
  }

  return {
    segments,
    branch,
    repo: info ? `${info.owner}/${info.repo}` : null,
  };
}
