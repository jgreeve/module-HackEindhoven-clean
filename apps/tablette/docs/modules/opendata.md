# Open Data

A catalogue of **public data sources by topic and country**. The module returns
metadata — endpoint, docs, auth, CORS, formats, license, attribution, coverage,
update frequency and verification date — and never fetches, proxies or scrapes
a source.

| | |
|:--|:--|
| **Module** | `@tablette/module-opendata` |
| **Tools** | `opendata_topics`, `opendata_search`, `opendata_source` |
| **Mode** | Sketch |
| **Surface** | Explore > Modules > Open Data |
| **Scope** | Metadata only |
| **Catalogue** | 23 sources: France, European Union, global |

## Why it exists

When a question falls outside Canutes, Wikidata or Wikimedia — housing
statistics, population, transport, environment — the agent needs to know
**which public source exists, in which country, under which license, and
whether Tablette has a client for it**.

Without the catalogue the model tends to invent an endpoint, scrape a page
silently, download a huge file into the context, or ignore the license. Open
Data fixes the discovery half:

```text
"Quelles données pour le logement en France ?"
        │
        ▼
opendata_search({ topic: "housing", country: "FR" })
        │
        ▼
[data.gouv.fr, INSEE, BAN, Eurostat ...]     metadata only
        │
        ▼
agent ──► canutes_* if a module exists
       └─► otherwise explain the source, license and missing client
```

## Tools

| Tool | Purpose |
|------|---------|
| `opendata_topics` | List available topics and countries, with source counts |
| `opendata_search` | Filter by topic, country, format, CORS or module |
| `opendata_source` | Fetch one source by id, with usage guidance and matching module tools |

### Topics

`parliament`, `legislation`, `housing`, `population`, `economy`, `environment`,
`geography`, `transport`, `health`, `education`, `culture`, `elections`.

### Countries

`FR`, `EU`, `GLOBAL`, plus partner country codes.

### Formats

`json`, `csv`, `geojson`, `xml`, `sparql`, `html`.

## Example prompts

### Find a source

```text
Quelles données publiques existent sur le logement en France ? Donne-moi les
sources, leurs licences et dis-moi lesquelles sont utilisables directement
depuis un navigateur.
```

Expected: `opendata_search` with `topic: "housing"`, `country: "FR"`, then a
short comparison of license and CORS.

### Pick the right module

```text
Je veux la population des communes autour de Rennes. Quelle source utiliser
et avec quel outil Tablette ?
```

Expected: `opendata_search` then `opendata_source`; the answer points at
Wikidata (P1082) or INSEE and explains the missing client.

### Discover a gap

```text
Y a-t-il une source open data pour les transports en commun à Rennes ?
```

Expected: a catalogue result if one exists, otherwise a clear statement that
the catalogue has no source, with the closest option and its license.

## Guardrails

- The module has **no network access**. It cannot fetch a dataset.
- It never proxies, scrapes or bypasses rate limits.
- It does not store data or API keys.
- It does not guarantee that a source is complete, current or authoritative.
- It does not detect licenses automatically; the catalogue records what was
  verified.

The agent uses the matching data module when one exists, and otherwise tells
the user what is available and what is missing.

## The catalogue

The seed catalogue is grouped by geography:

| Group | Examples |
|-------|----------|
| France | data.gouv.fr, INSEE, BAN, Canutes, Légifrance, data.education.gouv.fr |
| European Union | Eurostat, data.europa.eu, EEA, Copernicus |
| Global | World Bank, UN, OECD, WHO, Wikidata, Wikipedia, OpenStreetMap |

Each record carries the module mapping (`canutes`, `wikidata`, `wikimedia` or
`none`), so the agent knows whether a client exists.

## Licensing

The catalogue records the license and attribution for every source. It does
**not** relicense anything. A source with `cors: false` or `unknown` needs a
server-side or offline path; a source with `auth` other than `none` needs a
credential the browser should not hold.

When a source is used in a generated app or report, carry its attribution line.

## Validation

A unit test keeps the catalogue honest:

- ids are unique and URL-safe;
- every source has a name, description, topic, country, format, license and
  attribution;
- URLs are HTTPS;
- a claimed CORS support has a verification date;
- every topic is covered by at least one source.

## Next steps

- [Canutes](/modules/canutes) — the French parliamentary client.
- [Wikidata](/modules/wikidata) — structured facts and coordinates.
- [Reports](/modules/report) — cite the sources you found.
