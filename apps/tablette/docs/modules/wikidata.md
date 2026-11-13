# Wikidata

**Structured facts for map apps.** Wikidata supplies what OpenStreetMap rarely
does: item types, population, heritage status, official websites, inception
dates, stable QIDs and multilingual labels.

| | |
|:--|:--|
| **Module** | `@tablette/module-wikidata` |
| **Tools** | `wikidata_search`, `wikidata_entity`, `wikidata_nearby`, `wikidata_query` |
| **Mode** | Sketch |
| **Services** | `https://www.wikidata.org/w/api.php`, `https://query.wikidata.org/sparql` |
| **Auth** | none |
| **CORS** | yes |
| **Writes** | none |
| **License** | CC0 1.0 |

## Why Wikidata

OpenStreetMap gives geometry and tags. Wikidata gives the facts attached to an
entity and a QID that is stable across languages:

| Property | Meaning |
|----------|---------|
| `P31` | instance of (type) |
| `P625` | coordinates |
| `P1082` | population |
| `P1435` | heritage designation |
| `P856` | official website |
| `P18` | image (Commons file name) |
| `P373` | Commons category |
| `P279*` | subclass of (used by type filters) |

The intended loop:

```text
OSM feature (park, museum, city, monument, ...)
        │
        ▼
agent ──► wikidata_* tool ──► Wikidata API / WDQS (read-only)
        │                       compact entities or SPARQL rows
        ▼
agent merges the facts into the feature properties
        ▼
static OSM + Leaflet app: popup with type, population, heritage, link
```

Two hard rules:

1. **Fetch at generation time, not at runtime.** The generated app must not
   call Wikidata or WDQS.
2. **Credit the source.** Wikidata is CC0 (no legal attribution required), but
   show `Données : Wikidata (CC0)` as a courtesy. A `P18` image is a Commons
   file and keeps its own credit and license.

## Tools

| Tool | Purpose |
|------|---------|
| `wikidata_search` | Find candidate QIDs by label, with descriptions and aliases |
| `wikidata_entity` | Fetch compact entities by QID: labels, descriptions, selected claims and sitelinks |
| `wikidata_nearby` | Find items around a coordinate, optionally filtered by `P31` / `P279*` |
| `wikidata_query` | Read-only SPARQL; `SELECT` only, `LIMIT` required (max 500), no external `SERVICE` |

### Entity shape

`wikidata_entity` returns a compact shape rather than the full claims blob:

```json
{
  "id": "Q647",
  "label": "Rennes",
  "description": "commune in Ille-et-Vilaine, France",
  "claims": {
    "P625": { "latitude": 48.11417, "longitude": -1.68083 },
    "P1082": 209860,
    "P856": "https://metropole.rennes.fr/"
  },
  "sitelinks": { "frwiki": "Rennes" }
}
```

`P18` is **not** requested by default because the file is Commons-licensed.
Ask for it explicitly when an image is wanted.

## Joining Wikidata to OSM

### Explicit OSM tag

The best path: an OSM feature carries a `wikidata` tag.

```text
OSM node/way with wikidata=Q942434
        │
        └──► wikidata_entity({ ids: ["Q942434"] })
```

### Coordinate query

When there is no tag, query around the feature's coordinates:

```text
wikidata_nearby({ latitude: 48.114, longitude: -1.67, radius: 800, type: "Q33506" })
```

Verify the match with coordinates before using a QID.

### Name search fallback

`wikidata_search` is the last resort. A label match can be ambiguous; confirm
with the description or coordinates.

### Enriched properties

The agent merges facts into GeoJSON properties rather than replacing the OSM
attributes:

```json
{
  "name": "Parc du Thabor",
  "wikidata": "Q942434",
  "wikidata_facts": {
    "type": "Q22746",
    "heritage": "Q16739336",
    "website": "...",
    "label": "Parc du Thabor"
  }
}
```

## Example prompts

### Enrich a parks map

```text
Add Wikidata facts to the Rennes parks map: the item type and the official
website when available. Use the OSM wikidata tags and show the Wikidata credit.
```

Expected: `wikidata_entity` on the park QIDs, P31 and P856 merged into
properties, inline data and a visible CC0 credit.

### Nearby museums

```text
Find museums within 1 km of the Rennes city centre and add them to the map
with their names and coordinates.
```

Expected: `wikidata_nearby` with `Q33506` as the type filter, deduplicated rows,
coordinates inlined.

### Custom SPARQL

```text
List the communes of Ille-et-Vilaine with more than 10,000 inhabitants and
their coordinates.
```

Expected: `wikidata_query` with a bounded `SELECT`, a `LIMIT`, no external
`SERVICE`.

### Guardrail: bulk download

```text
Download every item in Wikidata that is a museum.
```

Expected: the agent refuses or narrows the request; `wikidata_query` caps the
result at 500 rows.

## Guardrails

- `wikidata_query` allows `SELECT` only.
- A query without `LIMIT` is rejected.
- The limit is capped at 500.
- External `SERVICE` endpoints are rejected.
- `P18` is opt-in.
- No runtime call in the generated app.
- Credit `Données : Wikidata (CC0)`; credit Commons per file when using an
  image.

## Licensing

Wikidata is **CC0 1.0**. No legal attribution is required, but the courtesy
credit is part of the module's prompt.

Wikimedia Commons files are **not** CC0. When an app or report uses a `P18`
image:

- keep the file page URL;
- keep the artist or uploader credit;
- keep the license and license URL;
- link to the file page, not only to the thumbnail.

## Next steps

- [Wikimedia](/modules/wikimedia) — Wikipedia prose and Commons media.
- [Map apps](/guide/map-apps) — inline the facts correctly.
- [Reports](/modules/report) — cite Wikidata in a report.
