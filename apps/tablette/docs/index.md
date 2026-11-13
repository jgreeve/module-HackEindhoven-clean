---
layout: home

hero:
  text: Generative App Studio
  tagline: A natural language generative meta-application platform
  image:
    src: /tablette.svg
    alt: Tablette
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: What is Tablette?
      link: /guide/

features:
  - title: Chat, Build, Run, Continue
    details: The assistant writes files with the same file tools you use. Nothing is hidden in a binary format — open the Editor and keep going by hand.
  - title: Everything runs in the browser
    details: No application backend. The workspace persists in IndexedDB; only the model provider and the forges you connect to are external.
  - title: A live surface
    details: Run renders the active document in a sandboxed iframe. The default Sketch surface is an OpenStreetMap + Leaflet app.
  - title: Modes for different work
    details: Sketch builds map apps, Explore browses the forge, Learn runs lessons, Build previews artefacts. Switch without leaving the page.
  - title: Modules, not a monolith
    details: Canutes, Open Data, Reports, Wikidata, Wikimedia and the legacy BIMR engine add tools, prompts and data sources without touching the core.
  - title: Forge-ready
    details: Browse repositories, read Markdown, clone, commit and push through the isomorphic-git workspace, with a stateless CORS proxy when needed.
---

## Start here

- **[Getting started](/guide/getting-started)** — install, configure a model
  provider and build a first map in a few minutes.
- **[Map apps](/guide/map-apps)** — the static OSM + Leaflet contract, blocks
  and samples.
- **[Modules](/modules/)** — what each module adds, which tools it exposes and
  which public source it reads.
- **[Architecture](/reference/architecture)** — how the chat, the workspace and
  the live surface fit together.
