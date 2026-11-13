# Map apps

The default Sketch artifact is a **static OpenStreetMap + Leaflet app**: one
self-contained HTML document that renders a map from public raster tiles and
inline data.

The contract is deliberately narrow. It keeps the app reproducible, portable
and safe to run in a sandboxed iframe.

## The contract

A generated app:

- is **one HTML file** with inline CSS and JavaScript;
- loads **Leaflet 1.9.4** from a pinned CDN (`unpkg`);
- shows the **OpenStreetMap attribution** visibly;
- keeps small GeoJSON **inline** in the document;
- has **no build step**, no npm and no server;
- does **not** call Nominatim or Overpass at runtime;
- does **not** reference `file:///` or local paths.

Data is fetched by the agent **while composing** the app — from the forge, a
module source or a public API — then inlined. The rendered page does not need a
backend.

::: tip Live-data samples
Built-in samples may query a CORS-enabled public API at runtime when a static
snapshot would be impractical. Generated apps still default to inline data, and
live samples must show the source, license and fetch time. The Eindhoven sample
below is the current example.
:::

## The starter page

The workspace starts with `maps/sketch.html`, a minimal page with:

- Leaflet CSS and JS from the pinned CDN;
- a full-height `#map` element;
- an OSM tile layer with `crossOrigin: true` and a visible attribution;
- a small marker to prove the map is alive.

**Samples > Starter page** reloads it. **New app** resets the active file to the
starter.

## Blocks

Reusable GIS blocks live in the `bimr/gis-src` forge repository. A block is a
self-contained piece of a map:

| Kind | Examples |
|------|----------|
| `layer` | tile layer, GeoJSON layer, marker cluster |
| `control` | legend, layer switcher, scale, search |
| `data` | inline GeoJSON or a data adapter |
| `style` | shared CSS or icon styles |
| `utility` | popup helpers, formatting, geometry helpers |

The catalogue is `gis-src/gis.yaml`. Each block has a `block.yaml` with its id,
version, kind, entry file, parameters, example and attribution.

The assistant discovers blocks with `gis_list_blocks`, reads every block it
intends to use with `gis_read_block`, then composes one HTML document with
`gis_preview_app`:

- the block ids;
- one `config` object (tile URL, attribution, centre, zoom);
- small inline GeoJSON in `data`;
- a `script` bootstrap that calls the block functions.

The composer inlines the block functions with provenance comments, so the
generated file still names the block version it came from.

::: warning Do not edit blocks from the app
Pass options at the call site. Editing a block changes every app that uses it.
Saved apps record the block versions in `app.yaml`.
:::

## Saving an app

Generated apps live in the `bimr/gis-apps` forge repository. Saving is a
confirmed mutation:

1. The assistant composes or updates the app.
2. It calls `propose_actions` with the slug, the blocks and a cancel option.
3. After you accept, `gis_save_app` writes `apps/<slug>/` and updates
   `gis-apps.yaml` in one commit.

When you have edited the app in the Editor, the assistant omits the `html`
argument so the current source is saved.

A saved app directory contains:

```text
apps/<slug>/
  index.html       the app
  app.yaml         title, slug, prompt, source block ids and versions
  README.md        optional notes
```

## Samples

**Samples** lists built-in samples first, then `bimr/gis-apps`. Loading a
sample opens it in the Editor and Viewer.

### Built-in sample: Eindhoven open data

`packages/module-eindhoven/src/map.html` is bundled by the Eindhoven module. It combines three
official datasets from [data.eindhoven.nl](https://data.eindhoven.nl/):

| Dataset | Use |
|---------|-----|
| Wijkgrens | 20 district polygons |
| Buurtgrens | 116 neighbourhood polygons |
| Aangevraagde vergunningen | Permit applications with coordinates, category, status and dates |

The boundaries are loaded once from the GeoJSON export. Permit applications are
fetched live from the API for the selected date range, defaulting to the last 90
days and capped at the latest 5,000 rows. The API allows browser access, so the
sample works inside the sandboxed Viewer.

The sample is declared in the Eindhoven module's `samples` descriptor. The host's
`src/map/samples.ts` adapter discovers samples from enabled modules; `listApps()`
and `readApp()` in `src/map/repo.ts` consult them before the forge catalogue. All three
datasets are public domain; the app keeps the Gemeente Eindhoven and OSM
attribution visible.

## Attribution

The OSM credit is mandatory:

```html
© OpenStreetMap contributors (ODbL)
```

Modules add their own credit lines, for example:

- `Données : Wikidata (CC0)`
- `Texte : Wikipédia (CC BY-SA 4.0)`
- Wikimedia Commons images keep their per-file credit and license.

The helper `creditLines()` in `src/modules/credits.ts` returns the core OSM line
followed by every enabled module's attribution.

## What to avoid

| Avoid | Why |
|-------|-----|
| Live Nominatim or Overpass calls | They are rate-limited and make the app non-reproducible |
| Huge inline datasets | The file becomes unreadable and slow |
| Remote tile providers without terms | Check the tile usage policy |
| `file:///` URLs | Browsers block them from an HTTP page |
| npm/CDN-bundled libraries beyond Leaflet | The contract is static and pinned |
| Editing `bimr/gis-apps` by hand | The provenance in `app.yaml` drifts |

## Next steps

- [Modules](/guide/modules) — enrich a map with public data.
- [Canutes](/modules/canutes) — votes by department.
- [Wikidata](/modules/wikidata) — facts and coordinates.
- [Architecture](/reference/architecture) — how the Viewer is sandboxed.
