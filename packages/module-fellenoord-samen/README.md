# Fellenoord Samen

**Denk mee over jouw buurt.** Owner: Fellenoord Samen module task / HackEindhoven
maintainers. Package: `@tablette/module-fellenoord-samen`, id `fellenoord-samen`.

Open **Explore → Modules → Fellenoord Samen → Open** in Tablette. No API key is
needed for the module. The existing chat remains visible and uses the host's
configured model when available.

## Working participation demo

- One Leaflet map for projects and ideas; square/round markers, selected state,
  boundary overlay, reset extent, zoom and keyboard navigation.
- Three predefined demo projects, Dutch category/search filters, details,
  questions, source links, original schematic scenes and site-plan illustrations.
- Place a map pin or use an accessible landmark selector; confirm the location,
  write the idea, review, go back/cancel and publish locally. Pins outside the
  demo polygon cannot be published.
- Project/idea discussions with one level of replies; reversible support per
  active demo identity. Three generic resident identities, no registration.
- Persistent versioned local storage, same-tab reactivity, storage-event refresh
  between tabs, stale-read detection, quota errors, export, and confirmed reset
  of **only** this module. Unknown/corrupt data is preserved, never auto-replaced.
- Responsive module-owned layout, labelled forms, keyboard tabs, visible focus,
  live status/error messages and a keyboard alternative to geographic clicking.
- Tiles are the only module runtime network requests. If they fail, the map
  overlay, markers, local list and landmark flow still work.

## Public SDK and chat/Surface contract

The descriptor implements the installed public `StudioModule`; no private host
or other module source is imported. Registered through the host dependency and
generated registry. The SDK is an external peer, not forked. Module JavaScript
uses the repository's Vite library build plus TypeScript declarations; inline,
scoped CSS avoids host-global or Vite-only CSS imports. Leaflet is installed and
locked, then bundled locally (a code-split chunk, not a CDN plugin).

Tools are read-only with respect to participation data:

| Tool | Behaviour |
|---|---|
| `fellenoord-samen_search` | Bounded search of the seeded projects and this browser's ideas; up to 8 records. Use short Dutch keywords. |
| `fellenoord-samen_detail` | Details plus up to 30 local comments. `select: true` updates module-owned selection in the mounted Surface. |

For example: ask the host chat *“Welke plekken in Fellenoord gaan over groen?”*.
The module prompt instructs the model to search, inspect returned ids and explain
the demo scope. A model key is required only for real conversational inference;
tests exercise tool execution directly with the injected SDK context.

There is **no SDK navigation-to-Surface capability**. A tool never promises that
it opened Explore or changed host mode. Selection is retained in memory for the
Surface to consume when opened; mounted Surfaces update immediately. A chat
selection does not discard an in-progress idea draft. `onUse` is intentionally
not used to replace this UI with a Sketch application.

Feedback is stored on this browser origin, not synchronised to other devices or
sent to the municipality. If the user invokes discovery in the host chat, tool
results (including requested comments) enter the configured model conversation.
The UI discloses this. There is no authentication, official consultation,
moderation service, server database or multi-user publication system.

## Geography and provenance

Reviewed 2026-11-13:

- [Open Eindhoven — Fellenoord](https://www.openeindhoven.nl/projecten/centrum/stationsgebied-knoop-xl/fellenoord)
  describes approximately 55 hectares north of Eindhoven Centraal, from the
  Elisabethtunnel to the entrance to TU/e.
- [Fellenoord 2040](https://www.fellenoord2040.nl/nl) describes the future district,
  underground bus station, mixed housing/amenities and Dommel landscape.
- [Open Eindhoven — Knoop XL](https://www.openeindhoven.nl/projecten/centrum/stationsgebied-knoop-xl)
  also covers southern station projects. Knoop XL and Fellenoord are not identical.

`src/geo.ts` holds a small, manually approximated **demo polygon**, using WGS84
`[longitude, latitude]` coordinates; Leaflet receives `[latitude, longitude]`.
It follows the source-described northern station corridor. It is not an official
GIS export, legal boundary, exact digitisation or claim to match the stated
55-hectare area. The boundary and indicative pins are labelled in the UI.
Obtaining/approving an authoritative digital project perimeter remains future
work before any real participation rollout. No municipality-wide layers or bulk
OSM requests are added.

The three projects are **fictional participation scenarios** inspired by source
themes, not current official project records or claims about planning status.
Questions, illustrations, seed ideas and comments are fictional. Source text is
summarised in original prose; renders without verified reuse rights are linked
through source pages rather than copied. Original scene/site-plan SVGs carry
the explicit “geen architectonisch ontwerp” caption. See [third-party
notices](THIRD_PARTY.md) for Leaflet and OSM attribution.

## Storage and limits

Key: `fellenoord-samen.data.v1`; schema version 1. Up to 500 ideas, 2,000 comments,
3 supported identities and a 1,000,000-character serialized-data limit. Input is
size-bounded before parsing; geometry, dates, ownership values, target references,
duplicate supporters and reply depth are validated. Durable write succeeds
before the in-memory state or UI claims success. User strings render as React
text; Leaflet tooltips use text nodes, not resident-supplied HTML.

Drafts are component-local until publication. Export downloads the current/raw
JSON for preservation; no import UI is provided. Stale-tab comparison protects
sequential edits and storage events refresh other tabs. This is not a
transactional cross-tab/cross-device database; simultaneous multi-tab writes
are not a supported collaboration protocol. Clearing browser data removes the
demo. Use one tab during a demonstration, export when needed.

## Develop and verify

From the root (Node 22 LTS / npm):

```sh
npm ci
npm run dev
# In another terminal for module edits:
npm run watch --workspace=@tablette/module-fellenoord-samen
# Before integration:
npm run check
npm run test:smoke
```

`test/module.test.ts` covers the built SDK descriptor/tools, geographic scope,
search, persistence, identities/support, thread validation, stale tabs and
damaged/failed storage. `tests/browser/fellenoord.spec.ts` exercises the actual
host workflow, mouse pin placement and marker selection, comments/replies,
back/review/cancel, reload persistence, safe text, reset/export, responsive layout,
tile failure, quota failure and live SDK-tool → Surface updates. Tests mock tiles
and forge requests, use no model key and retain the existing Eindhoven tests.
