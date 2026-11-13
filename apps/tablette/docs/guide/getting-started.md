# Getting started

Tablette is a Vite + React single-page app. You can run it locally, or open a
deployment that someone else hosts.

## Requirements

- **Node.js 20.19+ or 22.12+** (Vite 7 requires it; Node 22 LTS is the safe
  choice).
- **npm** (the repository ships a lockfile; `npm ci` is the reproducible
  install).
- A modern browser with IndexedDB and ES modules.
- A model provider API key. OpenRouter and DeepSeek presets are built in; any
  OpenAI-compatible endpoint works.

The `@tablette` module packages and `@bimr/web` resolve from the rvba Forgejo
npm registries. Anonymous reads are supported; the repository `.npmrc` pins the
scopes.

## Run locally

```bash
git clone https://git.bimr.net/rvba/tablette.git
cd tablette
npm install
npm run dev
```

`npm run dev` first syncs the BIMR runtime assets (`npm run sync:bimr`) and
regenerates the module registry (`npm run gen:modules`), then starts Vite. Open
the printed URL — usually `http://localhost:5173/`.

For a production build:

```bash
npm run build
npm run preview
```

The build output is plain static files in `dist/`.

::: tip No backend
Tablette has no application server. `npm run dev` mounts the optional forge
proxy at `/forge-proxy/` so development and production share one
implementation. A static host without the proxy still works when the forge
allows CORS for its API.
:::

## Configure a model provider

1. Open **Settings** (the gear icon in the top bar).
2. In the **Model** tab, choose a preset:
   - **OpenRouter** — `https://openrouter.ai/api/v1`, keys start with
     `sk-or-v1-`.
   - **DeepSeek** — `https://api.deepseek.com/v1`, keys start with `sk-`.
3. Paste the API key. You can keep the preset model or type another model id.
4. Press **Save**.

The key is stored in the browser's `localStorage` under `studio.agentConfig`
and is sent only to the provider base URL you configure. Do not use a
production deployment with a key you are not willing to expose to that origin.

::: warning Keys are client-side
There is no server to hold a secret. A demo deployment that ships a shared key
is a public credential. See [Security](/reference/security) before deploying
one.
:::

## Build a first map

1. Stay in **Sketch** mode (the default).
2. In the chat, ask for something concrete:

   ```text
   Build a map of the parks in Rennes with a popup for each park.
   ```

3. The assistant calls the workspace tools and `run_app`. The Viewer renders
   the app in a sandboxed iframe.
4. Open the **Editor** tab to read or change the HTML. Press **Run** to render
   the edited file again.
5. Use **Samples** to load the starter page or an app saved in
   `bimr/gis-apps`.

The active file is normally `maps/sketch.html`. A `.html` file written by the
assistant becomes the active app automatically.

## Configure the forge (optional)

The forge is not required to build an app. Configure it when you want to browse
repositories, read Markdown, clone, commit or push:

1. Open **Settings > Forge**.
2. Enter the forge URL (for example `https://artefacts.bimr.net`), the bot user
   and a Forgejo access token.
3. Save.

If the browser cannot reach the forge directly, supply a **Proxy URL** in the
same dialog. See [Forge access](/guide/forge) and
[Forge proxy](/operations/proxy).

## Useful commands

| Command | What it does |
|---------|--------------|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run gen:modules` | Regenerate `src/modules/registry.generated.ts` |
| `npm run sync:bimr` | Refresh the BIMR runtime assets |
| `npm run proxy` | Run the forge proxy standalone |
| `npm run test:proxy` | Unit-test the forge proxy |
| `npm run test:modules` | Module contract and prompt tests |
| `npm run test:e2e` | Playwright smoke and report tests |
| `make serve` | Build and serve the Studio shell on port 8090 |

The full list is in [Commands](/reference/commands).

## Next steps

- [Chat and workspace](/guide/chat-and-workspace) — the generation loop.
- [Map apps](/guide/map-apps) — the static OSM + Leaflet contract.
- [Settings](/guide/settings) — every option and where it is stored.
