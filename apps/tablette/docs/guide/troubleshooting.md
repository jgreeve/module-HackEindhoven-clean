# Troubleshooting

## The chat says the model is not configured

Open **Settings > Model** and save a provider and key. The gear icon in the top
bar shows a warning while the configuration is empty.

If a request returns `401`:

- an OpenRouter key starts with `sk-or-v1-` and uses
  `https://openrouter.ai/api/v1`;
- a DeepSeek key starts with `sk-` and uses `https://api.deepseek.com/v1`.

A key and base URL from different providers do not work together.

## The model returns an error or a stream stalls

- Check the provider status and your spending limit.
- Try a smaller model or a shorter prompt.
- Open the **Session dump** to inspect the composed prompt and the trace.
- Long tool results or a huge file can exceed the context window. Ask the
  assistant to use `edit_file` for a targeted change instead of rewriting the
  file.

## The map is blank

The Viewer is a sandboxed iframe that loads Leaflet and OSM tiles from public
URLs. Check:

1. **The Run tab.** Press **Run** after editing; switching to Viewer also runs
   the active file.
2. **The browser console.** A blocked tile request or a syntax error appears
   there.
3. **The HTML is self-contained.** A `file:///` asset or a local path does not
   load from an HTTP page. Inline the data or use an `https://` URL.
4. **The active file is HTML.** Run is disabled for non-HTML files.
5. **Network access.** A machine without internet access still renders the
   page but cannot load tiles or Leaflet.

## `npm install` fails on `@bimr` or `@tablette`

Those packages come from rvba Forgejo npm registries. The repository `.npmrc`
pins the scopes; keep it in place.

```bash
npm config get @tablette:registry
npm config get @bimr:registry
```

If a local or user `.npmrc` overrides the scopes, the repository pin loses.
Remove the override or use the registry URL the project expects.

## `npm run build` fails on the BIMR runtime

`prebuild` runs `sync:bimr` and `gen:modules`. Check that
`node_modules/@bimr/web` and the `@tablette/module-*` packages are installed
and that `scripts/sync-bimr.mjs` can find the assets.

In a clean checkout:

```bash
npm ci
npm run sync:bimr
npm run typecheck
npm run build
```

## A module disappears after an upgrade

The core reads the installed `@tablette/module-*` packages at build time.
`npm run gen:modules` regenerates `src/modules/registry.generated.ts`. After
changing `package.json`, run:

```bash
npm install
npm run gen:modules
npm run typecheck
```

The registry is static: a module must be installed and locked before it ships.

## The forge is unreachable

- Check **Settings > Forge**: URL, token and proxy URL.
- Try the API directly in a browser tab:
  `https://<forge>/api/v1/version`. If it fails, the problem is the forge, not
  Studio.
- If the browser reports a CORS error, configure the proxy. Forgejo does not
  send CORS headers on git routes.
- A `403` from the proxy means the target host is not in
  `FORGE_ALLOWED_HOSTS`.
- A `401` from the forge means the token is missing, expired or issued by a
  different instance.

See [Forge access](/guide/forge).

## Clone or push fails

- Use a clone URL from `forge_repo_info` or `forge_create_repo`.
- The proxy URL must end in `/` and be reachable from the page origin.
- Forgejo over HTTPS may require a token for write operations.
- A self-signed certificate or an HTTP forge is rejected outside localhost.

## The app build is stale

The Settings footer shows the version and commit hash. A stale deployment
usually means the static host is serving an old `dist/`. Rebuild and republish;
check the cache headers on `index.html`.

## TypeScript errors after a module update

```bash
npm run gen:modules
npm run typecheck
```

If the error is in an installed module, check that its version matches the SDK
range the core expects. The core pins ranges, not exact versions; the lockfile
pins the tarball.

## Reset the workspace

To start from a clean slate:

1. Open the file menu or the browser's site-data settings.
2. Clear the site data for the origin (localStorage and IndexedDB
   `studio-fs`).
3. Reload.

There is no server-side copy to clean up.

## Still stuck?

Open an issue on the forge with:

- the browser and version;
- the app version and commit hash from Settings;
- the failing prompt or action;
- the console error and, when relevant, the Session dump.

Public source snapshot and releases: <https://git.bimr.net/rvba/tablette>.
