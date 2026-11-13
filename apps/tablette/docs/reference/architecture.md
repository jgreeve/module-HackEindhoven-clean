# Architecture

Tablette is a **browser-only application**. The chat, the agent, the file
workspace and the live surface all run in one page. The only outside services
are the model provider, the forges you connect to and the public data sources
used by modules.

```text
Browser (single page, no application server)
┌──────────────────────────────────────────────────────────┐
│  Chat (left)              │  Surface (right)             │
│  useChat(custom fetch)    │  Editor | Viewer             │
│     │                     │   CodeMirror   sandboxed     │
│     ▼                     │      │          iframe       │
│  streamText + tools       │      ▼             ▲         │
│     │                     │  workspace ────────┘         │
│     └─────────────────────┼──► map/session.ts            │
│                           │        │ setPreview()         │
│                           │        ▼                      │
│                           │   preview store               │
└──────────────────────────────────────────────────────────┘
        │                │                 │
        ▼                ▼                 ▼
  model provider    forge (optional)   public data APIs
                    via CORS/proxy     (enabled modules)
```

## The page

`src/components/StudioApp.tsx` owns the shell:

- a top bar with New session, Settings, Session dump, the file menu, the mode
  menu, the active path and the usage counter;
- a left **chat** pane;
- a right **surface** chosen by the mode.

The surface is one of:

| Component | Mode | What it renders |
|-----------|------|-----------------|
| `MapPane` | Sketch | Toolbar, `Editor` / `Viewer`, status footer |
| `ExplorePane` | Explore | Forge browser and module catalogue |
| `LearnPane` | Learn | Lesson player |
| `BuildPane` | Build | Full-pane artefact preview |

## The agent

The agent runs in the browser with the Vercel AI SDK:

- `src/agent/chat.ts` calls `streamText` and returns the data stream as a
  synthetic `Response`;
- `useChat({ fetch })` in the chat UI consumes that response, so the usual
  message bubbles, tool chips and stop button work without an HTTP server;
- tool execution is local: each tool's `execute` calls the workspace, forge,
  git or map layer and returns text to the model.

The model endpoint, key and model id are configuration, not code. The default
is an OpenRouter endpoint; DeepSeek and any OpenAI-compatible endpoint work.

### Prompt composition

`src/agent/prompts.ts` owns the core prompts:

- `MAP_HEAD` / `MAP_TAIL` — the Sketch (GIS) contract;
- `CORE_PROMPT` — workspace, forge, git, proposals and links for the other
  modes;
- mode intros that scope the assistant to Explore, Learn or Build.

The enabled modules' prompt sections are inserted between the mode head and
tail. `src/modules/registry.ts` composes them in registry order.

### Tools

`src/agent/tools.ts` binds the core tools:

- **workspace** — `list_files`, `read_file`, `write_file`, `edit_file`,
  `open_file`;
- **map** — `run_app`, `gis_list_blocks`, `gis_read_block`, `gis_list_apps`,
  `gis_read_app`, `gis_preview_app`, `gis_save_app`;
- **forge** — `forge_overview`, `forge_list_repos`, `forge_search_repos`,
  `forge_repo_info`, `forge_list_files`, `forge_read_file`,
  `forge_create_repo`;
- **git** — `git_status`, `git_log`, `git_init`, `git_clone`, `git_commit`,
  `git_remote`, `git_push`, `git_tag`;
- **client-side** — `propose_actions`, `switch_mode`.

Module tools are added by the registry. A module's tool names must start with
its id (`canutes_*`, `wikidata_*`, …).

## The workspace

`src/forge/fs.ts` wraps LightningFS, which stores files in **IndexedDB**
(`studio-fs`). The workspace root is `/workspace`.

`src/forge/workspace.ts` adds the active-file concept:

- the default file is `maps/sketch.html`;
- writing a `.html` file makes it active;
- the Editor is bound to the active file;
- the agent reads and writes by workspace-relative path.

The workspace is also a git working tree. `src/forge/git.ts` uses
isomorphic-git with the same LightningFS, so clone, commit and push operate on
the files the Editor shows.

## The surface

`src/map/session.ts` is the shared source of truth for the Sketch surface:

- `boot()` initialises the workspace and renders the starter page;
- `runApp()` reads the active HTML and publishes it to the preview store;
- `openSavedApp()` loads an app from the forge;
- state changes notify the toolbar, editor and viewer.

`src/map/preview.ts` is a tiny store. `MapViewer` subscribes and renders the
document in a sandboxed `srcdoc` iframe:

```html
<iframe sandbox="allow-scripts allow-popups" srcdoc="..."></iframe>
```

The iframe has no same-origin access to the Studio page. It can run scripts and
open popups but cannot read Studio state. Leaflet and tiles load from their
pinned public URLs.

## Modules

Modules are installed npm packages implementing `@tablette/module-sdk`, plus
core-owned BIMR:

```text
package.json
  @tablette/module-* ──► scripts/gen-registry.mjs
                             │
                             ▼
                 src/modules/registry.generated.ts
                             │
                             ▼
                    src/modules/registry.ts
                       │            │
                       ▼            ▼
                  prompts        tools/surfaces
```

The registry is **static**: every package is installed, locked and built before
it ships. There is no runtime `import()`.

`ModuleContext` injects the host capabilities a module may use: mode, settings,
enabled ids, credits, trace, clock, fetch, workspace, `runApp` and `setMode`.
A module must not import `src/agent/*`, `src/forge/*`, `src/app/*` or
`src/map/*`.

An optional `Surface` is a React component hosted by `ModuleSurfaceHost` in
Explore. Canutes, Open Data and Reports provide one.

See [Module SDK](/reference/module-sdk).

## The forge

`src/forge/forgejo.ts` wraps the Forgejo REST API:
repositories, contents, README, wiki pages, file writes and repo creation.

`src/forge/git.ts` wraps isomorphic-git for clone, status, commit, tag and push.

`src/forge/proxy.ts` resolves the CORS proxy route:

1. the configured `proxyUrl`;
2. the dev server proxy (`/forge-proxy/`) in development;
3. the build-time `VITE_FORGE_PROXY`;
4. direct access.

`proxy/proxy.mjs` is a dependency-free, host-allowlisted forwarder. It serves
the REST API and git smart HTTP, strips browser credentials and holds no state.
See [Forge proxy](/operations/proxy).

## Modes

`src/app/mode.ts` owns the mode state, persistence (`studio.mode`) and
listeners. The mode selects the prompt, the tool set and the surface. The agent
can switch on a clear order or propose a switch.

## Build and deploy

`npm run build` produces a static `dist/`:

- Vite bundles the React app;
- `prebuild` syncs the BIMR runtime assets and regenerates the module registry;
- `vite.config.ts` bakes `VITE_APP_VERSION`, `VITE_GIT_HASH`,
  `VITE_DOCS_BASE` and `VITE_FORGE_PROXY`.

There is no server-side rendering and no application backend. A static host
plus the optional proxy is enough. See [Self-hosting](/guide/self-hosting).

## Documentation

This site is built from `docs/` with VitePress:

```bash
npm run docs:dev
npm run docs:build
npm run docs:preview
```

It is published to `https://docs.tablette.bimr.net`. Module descriptors link to
clean paths such as `/modules/canutes`. The app itself is served from
`https://tablette.bimr.net`; see [Docs site](/operations/docs-site).
