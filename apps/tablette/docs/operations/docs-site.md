# Docs site

This documentation is built from `docs/` with [VitePress](https://vitepress.dev/)
and published at **`https://docs.tablette.bimr.net`**. The app itself is served
from **`https://tablette.bimr.net`**; `studio.bimr.net` keeps the previous
Tablette version.

## Structure

```text
docs/
  .vitepress/
    config.mts          site title, nav, sidebar, clean URLs
    theme/
      index.ts          default theme + custom CSS
      custom.css        brand colours and layout tweaks
  index.md              home page
  guide/                user guide
  modules/              public module pages
  reference/            architecture, SDK, config, commands, security
  operations/           docs build, proxy, forge administration
  public/               static assets served at /
```

Module pages use clean URLs (`/modules/canutes`) because the app's
`docsUrl()` builds links from `VITE_DOCS_BASE` plus the descriptor path.

## Sites

| Host | Content |
|------|---------|
| `docs.tablette.bimr.net` | this site, published from `docs/.vitepress/dist/` |
| `tablette.bimr.net` | the Tablette v4 app (`dist/`) and `/releases/` |
| `studio.bimr.net` | the previous Tablette version, unchanged |

The docs host needs no proxy and no application server. The app host runs the
same-origin forge proxy; see [Forge proxy](/operations/proxy). Links into the
app are absolute (`https://tablette.bimr.net`).

## Develop

```bash
npm run docs:dev
```

VitePress serves `docs/` with HMR. The dev server is independent of the Studio
Vite server; run them in separate terminals if needed.

## Build

```bash
npm run docs:build
```

The output is `docs/.vitepress/dist/`. The build:

- resolves every internal Markdown link (a dead link fails the build);
- generates a sitemap for `https://docs.tablette.bimr.net`;
- copies `docs/public/` to the site root.

Preview the production build locally:

```bash
npm run docs:preview
```

## Publish

The site is static. Publish the contents of `docs/.vitepress/dist/` to the web
root for `docs.tablette.bimr.net`.

VitePress writes `modules/canutes.html` but links to `/modules/canutes`
(`cleanUrls: true`). The static server must resolve the extension-less path:

```nginx
error_page 404 /404.html;
location / {
    try_files $uri $uri/ $uri.html =404;
}
```

`=404` keeps the 404 status while `error_page` serves the VitePress 404 page.
Falling back to `/404.html` directly would return HTTP 200 for unknown paths.

Release artifacts are served by the app host under
`https://tablette.bimr.net/releases/`, not from this web root. Keep the docs
output and the release directory in separate roots so publishing one never
touches the other.

A cache header of a few minutes on HTML and a long cache on hashed assets is
enough. The site needs no proxy and no application server.

## Links

- Internal links use relative Markdown paths (`./getting-started.md`) or clean
  absolute paths (`/modules/canutes`).
- Module descriptors in the app point at `/modules/<id>`.
- `VITE_DOCS_BASE` must match this site's origin
  (`https://docs.tablette.bimr.net`) when the app is built.

The legacy descriptor form `tasks/feature/<id>.md` is mapped to
`/modules/<id>` by `docsUrl()`, so older published modules keep working.

## Content rules

- **Public, not internal.** `tasks/` stays maintainer planning and is stripped
  from releases. This site describes how to use and operate the published
  product.
- **Verify API details.** A module page records what was checked and when; do
  not present a guess as a contract.
- **Licenses and attribution.** Every data source page names its license and
  credit line.
- **No secrets or private URLs.**
- **English.** The app and the code comments are English; the site follows.

## Adding a page

1. Create the Markdown file under the right section.
2. Add it to the sidebar in `docs/.vitepress/config.mts`.
3. Link it from at least one existing page.
4. Run `npm run docs:build` and fix any dead-link error.

## Search

VitePress local search indexes the built pages. No external service is needed.

## Next steps

- [Forge proxy](/operations/proxy) — the only server-side component.
- [Commands](/reference/commands) — the full command list.
- [Architecture](/reference/architecture) — how the app is built.
