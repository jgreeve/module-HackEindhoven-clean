// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

import { useEffect, useState } from "react";
import * as forge from "../forge/forgejo";
import { ForgeMarkdown } from "./ForgeMarkdown";

/** The repo's integrated wiki: page list + rendered page. */
export function WikiBrowser({ owner, repo }: { owner: string; repo: string }) {
  const [pages, setPages] = useState<string[] | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    setPages(null);
    setCurrent(null);
    forge.listWikiPages(owner, repo).then((p) => {
      setPages(p);
      setCurrent(p[0] ?? null);
    });
  }, [owner, repo]);

  useEffect(() => {
    if (!current) return;
    setText(null);
    forge
      .readWikiPage(owner, repo, current)
      .then(setText)
      .catch(() => setText(null));
  }, [owner, repo, current]);

  return (
    <div className="docs">
      <aside className="docs-side">
        {pages ? (
          pages.map((p) => (
            <button
              key={p}
              type="button"
              className={`docs-item ${p === current ? "active" : ""}`}
              onClick={() => setCurrent(p)}
            >
              {p}
            </button>
          ))
        ) : (
          <div className="explore-dim">Loading...</div>
        )}
        {pages && pages.length === 0 && (
          <div className="explore-dim">No wiki pages.</div>
        )}
      </aside>
      <div className="docs-main">
        {text ? <ForgeMarkdown text={text} /> : <div className="explore-dim">Select a page.</div>}
      </div>
    </div>
  );
}
