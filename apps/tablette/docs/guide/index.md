# What is Tablette?

Tablette is a **Studio for generative apps**. It puts three things on one page:

1. a **chat assistant** that can read and write files;
2. a **file workspace** that persists in the browser;
3. a **live surface** that renders whatever the workspace holds.

The assistant and the person share the same files, so generating and editing
are the same loop. You describe an app, the assistant writes it, you run it, and
you can edit the source directly at any time.

```text
┌──────────────────────────┬─────────────────────────┐
│ Chat                     │ Sketch surface          │
│                          │  Editor | Viewer        │
│  useChat ──► streamText  │   CodeMirror  iframe    │
│       │          │       │        │         ▲      │
│       │          └───────┼──► workspace ────┘      │
│       └──────────────────┼──► tools / run_app       │
└──────────────────────────┴─────────────────────────┘
```

## What makes it different

### The app is source code

The assistant does not compile an opaque project. It writes HTML, CSS,
JavaScript, Markdown and Python files with the ordinary workspace tools. A
`.html` file becomes the active app in the Editor; Run publishes it to the
Viewer. You can take the file out and host it anywhere.

### There is no application backend

The agent runs in the browser with the Vercel AI SDK. `streamText` calls the
model provider directly, and tool execution happens locally. The browser
stores the workspace in IndexedDB through LightningFS.

The only outside services are:

- the model provider you configure (OpenRouter, DeepSeek, or another
  OpenAI-compatible endpoint);
- the forges you connect to;
- the public data sources used by the modules you enable.

An optional stateless **forge proxy** may sit at the edge when a forge does not
send CORS headers. It holds no secrets and no state. See
[Forge proxy](/operations/proxy).

### The default surface is a map

Sketch mode builds **OpenStreetMap + Leaflet** apps. The map contract is
deliberately narrow: one self-contained HTML file, Leaflet 1.9.4 from a pinned
CDN, inline GeoJSON, visible OSM attribution, and no runtime calls to Nominatim
or Overpass.

Modules can enrich that base with public data — parliamentary votes, Wikidata
facts, Wikipedia summaries, open-data catalogue entries — but the data is
fetched by the agent while composing the app and inlined into the document.

## Modes

A **mode** selects the agent contract (prompt and tools) and the right-hand
surface.

| Mode | Right pane | What it is for |
|------|------------|----------------|
| **Sketch** | App pane, `Editor` / `Viewer` | Build and run map apps and reports |
| **Explore** | Forge browser and module catalogue | Discover repositories, READMEs and module surfaces |
| **Learn** | Lesson player | Follow BIMR/Python lessons |
| **Build** | Artefact preview | Preview a generated app full-pane |

The mode is stored in the browser and restored on reload. The agent can switch
modes when you ask clearly; otherwise it proposes the switch first.

## Modules

Modules add tools, data sources, prompt sections and attribution to one or more
modes. They are separate npm packages (`@tablette/module-*`) installed by the
core. Enable or disable one in **Settings > Modules** or **Explore > Modules**;
the agent uses the new set on its next turn.

The catalogue includes Canutes, Open Data, Reports, Wikidata, Wikimedia and the
legacy BIMR engine. See [Modules](/modules/).

## What it is not

- **Not a hosted no-code product.** The source is the artifact.
- **Not a general-purpose backend.** There is no server-side database or
  execution service.
- **Not a map tile server.** Maps use public OSM raster tiles.
- **Not a secret store.** Keys live in the browser's `localStorage`; anyone with
  access to the origin can read them. See [Security](/reference/security).

## Next steps

- [Get started](/guide/getting-started) with a local checkout.
- Read [Chat and workspace](/guide/chat-and-workspace) to understand the loop.
- Browse the [module catalogue](/modules/).
