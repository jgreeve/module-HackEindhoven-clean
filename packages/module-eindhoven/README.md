# Eindhoven module

Owner: HackEindhoven maintainers; claim a task issue before changing this package.

## Working features

Open **Explore → Modules → Eindhoven → Open** for the module page, then
**Open in Sketch** to edit/run its HTML. The same document is available through
Samples. The module exposes `eindhoven_open_map` to the agent through the SDK.

- Official Wijkgrens (20 districts) and Buurtgrens (116 neighbourhoods).
- Live Aangevraagde vergunningen, default last 90 days, with date/category/status
  filters. Latest 5,000 rows are shown, with an explicit count/cap message.
- OSM raster basemap. Actual OSM building/green features remain paused WIP.

## Data

Municipal source: https://data.eindhoven.nl/ — datasets `wijken`, `buurten`,
`aangevraagde-vergunningen`. The catalogue lists these as public domain; they
support anonymous CORS access. Permit requests are separate from boundary calls
but still automatic on map startup; making them explicitly on-demand is a
separate backlog task. The map preserves original statuses, application/decision
dates and source attribution rather than inferring that a case was approved.

Basemap: © OpenStreetMap contributors (ODbL). OSM tiles and municipal data retain
their own licenses; the package's source code uses the repository MIT license.

## Develop

From the repository root: `npm run dev`. In a second terminal,
`npm run watch --workspace=@tablette/module-eindhoven`, then refresh after a rebuild.
Run `npm run check`; browser integration tests use fixtures and no API keys.

`src/map.html` preserves the existing working map. `src/sample.ts` declares it
through the project sample contract. UI, SDK tools and tests are in this package;
the app has no Eindhoven-specific import. See [the backlog](../../docs/backlog.md)
before resuming the archived downloader experiment.
