# Modes

A **mode** selects two things at once:

- the agent contract — which system prompt and which tools are active;
- the right-hand surface — what the page shows beside the chat.

The top-bar mode menu switches between them. The current mode is stored under
`studio.mode` in `localStorage` and restored on reload. The default is
**Sketch**.

| Mode | Surface | Agent scope |
|------|---------|-------------|
| **Sketch** | Editor / Viewer app pane | Build and edit static OSM + Leaflet apps; run reports |
| **Explore** | Forge browser and module catalogue | Discover repositories, READMEs, files and module surfaces |
| **Learn** | Lesson player | Tutor Python/BIMR lessons and check code |
| **Build** | Artefact preview | Preview a generated app full-pane and work with the workspace |

## Sketch

The default mode. The artifact is one self-contained HTML document, normally
`maps/sketch.html`.

The agent can:

- read and write workspace files;
- list and read GIS blocks from `bimr/gis-src`;
- compose an app with `gis_preview_app` and render it with `run_app`;
- save an app to `bimr/gis-apps` with `gis_save_app` after a proposal;
- use the forge and git tools.

The toolbar has **Samples** (starter page and saved apps), **New app** and
**Run**. The editor is CodeMirror 6; the viewer is a sandboxed iframe.

Map rules are part of the prompt: pinned Leaflet 1.9.4, visible
`© OpenStreetMap contributors`, inline data, no Nominatim or Overpass at
runtime, no npm or build step. See [Map apps](/guide/map-apps).

## Explore

Explore is the forge browser. It has two tabs:

- **Forge** — repositories grouped by topic (`Sketches`, `Components`,
  `Tutorials`, `Web artefacts`, `Docs`, `Other`). Search by name or
  description, open a repository to read its README and files. A repository can
  publish a `studio.yaml` descriptor that adds a custom landing page.
- **Modules** — the full module catalogue with data sources, licenses,
  attribution and tools. Modules that declare a **surface** have an **Open**
  button: Canutes, Open Data and Reports.

The Explore agent can still use the read-only forge discovery tools while the
UI is being built. It should not modify the workspace unless asked.

## Learn

Learn is a lesson player built on the BIMR MicroPython runtime. It ships two
tracks:

- **Tetris** — unit cell, tetromino shapes and a board.
- **SimpleHouse** — footprint, floor, walls, roof and functions.

Each lesson has Markdown notes, starter Python code and optional hints. The
**Run lesson** button executes the code through the BIMR session. The agent
acts as a tutor: it explains, hints and checks code, and exposes `bimr_run`
only in Learn.

Progress is stored per lesson in `localStorage`.

## Build

Build is the artefact preview surface. When an app is composed with
`gis_preview_app`, the document is published to the preview store and rendered
full-pane in a sandboxed iframe.

The Build agent focuses on composing and saving apps with the
`gis_list_blocks`, `gis_read_block`, `gis_list_apps`, `gis_preview_app` and
`gis_save_app` tools. Saving is a mutation: the assistant proposes it first.

## Switching modes

The mode menu switches immediately. The agent can also switch:

- on a **clear, direct order** ("switch to Explore"), it calls `switch_mode`;
- when the request is hedged or ambiguous, it calls `propose_actions` with
  `kind: "switch-mode"` and lets you choose;
- it never switches modes just to avoid a task it can do in the current mode.

A switch changes the prompt and the tool set for the rest of the turn. The
workspace and the open files stay the same.

::: tip Handoff from a surface
A module surface can hand a question back to Sketch. The command is an ordinary
prompt, so the result is a normal generation turn rather than a hidden mode
change.
:::

## Where the mode lives

`src/app/mode.ts` owns the state, persistence and listeners. The prompt and
tool composition read it together with the enabled module set. The UI reads it
through `useMode()`.

## Next steps

- [Map apps](/guide/map-apps) — the Sketch contract.
- [Modules](/guide/modules) — enablement and per-mode scope.
- [Architecture](/reference/architecture) — how the surface is mounted.
