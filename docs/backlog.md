# Status and handoff

## Working foundation

- Imported the full Tablette source into `apps/tablette`, retaining its MIT notices.
- Root npm workspaces, reproducible install, module generator and CI checks.
- Eindhoven feature extracted into `packages/module-eindhoven`; its Surface is
  under Explore → Modules and its map is also available through Samples.
- Current map: official district/neighbourhood boundaries, OSM raster basemap,
  live permits with date/category/status filtering and a visible 5,000-row cap.

## Fellenoord Samen integration

- Independent `module-fellenoord-samen` workspace, public SDK descriptor,
  Dutch React Surface, shared project/idea map, local discussions/support and
  namespaced discovery/detail tools. Module scope/provenance is in its README.
- Remaining product work before real participation: approve an authoritative
  digital Fellenoord perimeter and licensed official project media/data; decide
  authentication, shared storage, moderation and municipal handoff requirements.
- This is a local demonstration with fictional scenarios and a labelled
  approximate boundary; it is not an official consultation or shared platform.
- Other agents migrate only completed module-specific work through reviewed PRs
  following `docs/MODULE_MIGRATION.md`.

## Paused: OSM buildings and green spaces

Tracked in [GitHub issue #1](https://github.com/jgreeve/module-HackEindhoven/issues/1).

Goal: combine real selectable OSM features with the official Eindhoven boundaries.
No OSM building/green-space assets have been downloaded successfully or integrated.

The unvalidated downloader experiment is preserved at
`packages/module-eindhoven/scripts/fetch-osm.wip.mjs`. It is not called by any
npm lifecycle, build or test. Its output paths and polygon conversion need review
before use. It is an experiment, not a supported data-refresh command.

Findings from the paused attempt:
- City-wide OSM query reported about 153,694 building objects: avoid loading that
  entire footprint set into the viewer by default.
- A proposed centre-only bbox is south/west/north/east
  `51.435, 5.468, 51.447, 5.490`, with about 3,113 building objects and 487 green
  objects at query time. This is not full-city coverage and requires agreement
  and clear labelling before shipping.
- Overpass returned capacity/time-out errors. Do not issue bulk requests on
  app startup or repeatedly retry while doing unrelated repository setup.

Acceptance criteria for resuming:
1. Agree coverage and size limits; retain OSM source ids, data timestamp and ODbL attribution.
2. Produce validated, compact GeoJSON with correct multipolygon holes; verify
   processing through a vetted converter or geometry fixtures.
3. Add separate buildings/green layer toggles, scoped popups and clear coverage.
4. Coordinate permit behavior as a separate task below.

## Separate task: on-demand permit requests

Tracked in [GitHub issue #2](https://github.com/jgreeve/module-HackEindhoven/issues/2).

The user requested permits be a separate request from the OSM building/green
layers. The existing map already uses separate HTTP calls, but currently loads
permits automatically when opened. Next task: make permit loading explicitly
user-triggered, independently refreshable/cancellable, and preserve filters.
Verify no permit request occurs before the user asks; test empty/error states.

## Shared maintenance

- Existing install audit reports dependency vulnerabilities; investigate through
  a dedicated compatibility-tested dependency update, not `npm audit fix --force`.
- The imported app has large-bundle/mixed-import build warnings.
- Module ownership is recorded per issue/package README. Add team-specific
  CODEOWNERS and enforce required reviews once maintainers are agreed.
