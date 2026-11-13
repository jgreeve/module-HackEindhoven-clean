// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

import { useEffect, useState } from "react";
import * as forge from "../forge/forgejo";
import { forgeUrl } from "../forge/auth";
import { loadBimrCatalogue } from "../forge/descriptor";
import type { BimrItem, StudioDescriptor, StudioWidget } from "../forge/descriptor";
import { Markdown } from "./Markdown";
import { DocsBrowser } from "./DocsBrowser";
import { WikiBrowser } from "./WikiBrowser";
import * as workspace from "../forge/workspace";
import { getMode } from "../app/mode";
import { handoff } from "../app/handoff";

interface Ctx {
  owner: string;
  repo: string;
  ref: string;
}

/** Render a repo's declared `.studio/studio.yaml` surface (widget registry). */
export function ForgeSurface({
  owner,
  repo,
  descriptor,
  defaultBranch = "main",
}: {
  owner: string;
  repo: string;
  descriptor: StudioDescriptor;
  defaultBranch?: string;
}) {
  const ctx: Ctx = { owner, repo, ref: defaultBranch };
  const widgets = descriptor.components ?? [];
  return (
    <div className="surface">
      {descriptor.title && <h2 className="surface-title">{descriptor.title}</h2>}
      {descriptor.description && <p className="surface-desc">{descriptor.description}</p>}
      {widgets.map((w, i) => (
        <Widget key={i} widget={w} ctx={ctx} />
      ))}
    </div>
  );
}

function Widget({ widget, ctx }: { widget: StudioWidget; ctx: Ctx }) {
  switch (widget.type) {
    case "readme":
      return <FileMarkdown ctx={ctx} path="README.md" title={widget.title ?? "README"} />;
    case "markdown":
      return widget.page ? (
        <FileMarkdown ctx={ctx} path={widget.page} title={widget.title ?? widget.page} />
      ) : null;
    case "links":
      return <LinksWidget widget={widget} />;
    case "wiki":
      return (
        <section className="surface-widget">
          <h3 className="surface-widget-title">{widget.title ?? "Wiki"}</h3>
          <WikiBrowser owner={ctx.owner} repo={ctx.repo} />
        </section>
      );
    case "docs":
      return (
        <section className="surface-widget">
          <h3 className="surface-widget-title">{widget.title ?? "Docs"}</h3>
          <DocsBrowser
            owner={ctx.owner}
            repo={ctx.repo}
            root={widget.root ?? "docs"}
            ref={ctx.ref}
          />
        </section>
      );
    case "gallery":
      return <GalleryWidget ctx={ctx} widget={widget} />;
    case "models":
      return <ModelsWidget ctx={ctx} widget={widget} />;
    default:
      return (
        <LinkCard
          title={widget.title ?? widget.type}
          href={`${forgeUrl()}/${ctx.owner}/${ctx.repo}`}
        />
      );
  }
}

function FileMarkdown({ ctx, path, title }: { ctx: Ctx; path: string; title: string }) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText(null);
    setError(null);
    forge
      .readFile(ctx.owner, ctx.repo, path)
      .then((f) => setText(f.content))
      .catch(() => setError(`${path} not found`));
  }, [ctx.owner, ctx.repo, path]);

  return (
    <section className="surface-widget">
      <h3 className="surface-widget-title">{title}</h3>
      {error && <div className="explore-dim">{error}</div>}
      {text && <Markdown text={text} />}
    </section>
  );
}

function LinksWidget({ widget }: { widget: StudioWidget }) {
  return (
    <section className="surface-widget">
      {widget.title && <h3 className="surface-widget-title">{widget.title}</h3>}
      <ul className="surface-links">
        {(widget.items ?? []).map((l, i) => (
          <li key={i}>
            <a href={l.href} target="_blank" rel="noreferrer">
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function GalleryWidget({ ctx, widget }: { ctx: Ctx; widget: StudioWidget }) {
  const [items, setItems] = useState<BimrItem[] | null>(null);

  useEffect(() => {
    setItems(null);
    loadBimrCatalogue(ctx.owner, ctx.repo, widget.source ?? "bimr.yaml")
      .then((c) => setItems(c?.items ?? []))
      .catch(() => setItems([]));
  }, [ctx.owner, ctx.repo, widget.source]);

  return (
    <section className="surface-widget">
      <h3 className="surface-widget-title">{widget.title ?? "Catalogue"}</h3>
      {items && items.length === 0 && <div className="explore-dim">No catalogue items.</div>}
      <ul className="surface-gallery">
        {(items ?? []).map((item) => (
          <li key={item.id} className="gallery-card">
            {item.preview && (
              <img
                className="gallery-thumb"
                src={forge.repoRawUrl(
                  item.repo ? item.repo.split("/")[0] : ctx.owner,
                  item.repo ? item.repo.split("/")[1] : ctx.repo,
                  item.preview,
                  item.ref ?? ctx.ref,
                )}
                alt={item.title}
                loading="lazy"
              />
            )}
            <div className="gallery-body">
              <span className="gallery-title">{item.title}</span>
              <span className="gallery-kind">{item.kind}</span>
              {item.description && <span className="gallery-desc">{item.description}</span>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ModelsWidget({ ctx, widget }: { ctx: Ctx; widget: StudioWidget }) {
  const [files, setFiles] = useState<string[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const out: string[] = [];
      for (const p of widget.paths ?? []) {
        if (p.endsWith(".py")) {
          out.push(p);
          continue;
        }
        const dir = p.replace(/\/\*.*$/, "").replace(/\/$/, "");
        try {
          const entries = await forge.listContents(ctx.owner, ctx.repo, dir);
          for (const e of entries) {
            if (e.type === "file" && e.name.endsWith(".py")) out.push(e.path);
          }
        } catch {
          // ignore missing dirs
        }
      }
      if (!cancelled) setFiles(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [ctx.owner, ctx.repo, widget.paths]);

  const openInSketch = async (path: string) => {
    setBusy(path);
    try {
      const f = await forge.readFile(ctx.owner, ctx.repo, path);
      await workspace.writeFile(path, f.content);
      handoff({ from: getMode(), to: "sketch", intent: { kind: "open-file", path } });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="surface-widget">
      <h3 className="surface-widget-title">{widget.title ?? "Models"}</h3>
      {files && files.length === 0 && <div className="explore-dim">No models.</div>}
      <ul className="surface-models">
        {(files ?? []).map((p) => (
          <li key={p} className="surface-model">
            <code>{p}</code>
            <button
              type="button"
              className="btn small"
              disabled={busy === p}
              onClick={() => void openInSketch(p)}
            >
              {busy === p ? "Opening..." : "Open in sketch"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function LinkCard({ title, href }: { title: string; href: string }) {
  return (
    <section className="surface-widget">
      <a className="surface-link-card" href={href} target="_blank" rel="noreferrer">
        {title} — open on the forge
      </a>
    </section>
  );
}
