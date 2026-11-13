// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

import { useEffect, useState } from "react";
import * as forge from "../forge/forgejo";
import { ForgeMarkdown } from "./ForgeMarkdown";

interface Props {
  owner: string;
  repo: string;
  root?: string;
  ref?: string;
}

async function listMarkdown(
  owner: string,
  repo: string,
  dir: string,
  depth = 3,
): Promise<string[]> {
  if (depth < 0) return [];
  let entries: forge.ForgeEntry[] = [];
  try {
    entries = await forge.listContents(owner, repo, dir);
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const e of entries) {
    if (e.type === "dir") out.push(...(await listMarkdown(owner, repo, e.path, depth - 1)));
    else if (e.name.endsWith(".md")) out.push(e.path);
  }
  return out.sort();
}

/** Resolve a relative href against the current document path. */
function resolveHref(current: string, href: string): string {
  const stack = current.split("/").slice(0, -1);
  for (const part of href.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  return stack.join("/");
}

/** A docs tree browser: markdown files under `root`, rendered in place. */
export function DocsBrowser({ owner, repo, root = "docs", ref }: Props) {
  const [files, setFiles] = useState<string[] | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    setFiles(null);
    setCurrent(null);
    listMarkdown(owner, repo, root).then((f) => {
      setFiles(f);
      setCurrent(f[0] ?? null);
    });
  }, [owner, repo, root]);

  useEffect(() => {
    if (!current) return;
    setText(null);
    forge
      .readFile(owner, repo, current, ref)
      .then((f) => setText(f.content))
      .catch(() => setText(null));
  }, [owner, repo, current, ref]);

  const onNavigate = (href: string): boolean => {
    if (!href.endsWith(".md")) return false;
    const path = resolveHref(current ?? "", href.split("#")[0]);
    if (files?.includes(path)) {
      setCurrent(path);
      return true;
    }
    return false;
  };

  const dir = current ? current.split("/").slice(0, -1).join("/") : "";
  const imageBase = forge.repoRawUrl(owner, repo, dir, ref ?? "main");
  const label = (f: string) => f.replace(new RegExp(`^${root.replace(/\/$/, "")}/?`), "");

  return (
    <div className="docs">
      <aside className="docs-side">
        {files ? (
          files.map((f) => (
            <button
              key={f}
              type="button"
              className={`docs-item ${f === current ? "active" : ""}`}
              onClick={() => setCurrent(f)}
              title={f}
            >
              {label(f)}
            </button>
          ))
        ) : (
          <div className="explore-dim">Loading...</div>
        )}
        {files && files.length === 0 && (
          <div className="explore-dim">No markdown under {root}.</div>
        )}
      </aside>
      <div className="docs-main">
        {text ? (
          <ForgeMarkdown text={text} onNavigate={onNavigate} imageBase={imageBase} />
        ) : (
          <div className="explore-dim">Select a page.</div>
        )}
      </div>
    </div>
  );
}
