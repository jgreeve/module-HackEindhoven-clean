# Canutes

**French parliamentary open data** for Tablette: scrutins, votes, deputies,
dossiers and laws from the Assemblée nationale, the Sénat and Légifrance.

| | |
|:--|:--|
| **Service** | `https://db.code4code.eu/canutes` |
| **Operator** | [Tricoteuses](https://www.tricoteuses.fr/) / [Code4code](https://code4code.eu/) |
| **API** | PostgREST 14 |
| **Auth** | none |
| **CORS** | `*` |
| **Writes** | unavailable |
| **License** | Licence Ouverte 2.0 |
| **Mode** | Sketch |
| **Surface** | Explore > Modules > Canutes |

The service unifies Assemblée nationale, Sénat, Légifrance and derived
full-text indexes (`tisseuse`). It exposes five schemas through the
`Accept-Profile` header:

| Schema | Content |
|--------|---------|
| `assemblee` | Scrutins, acteurs, dossiers, documents, amendements, organes |
| `senat` | Sénat legacy tables |
| `legifrance` | Articles, text versions, jurisprudence, legislative dossiers |
| `tisseuse` | Full-text search projections over the three corpora |
| `annuaire` | Service directory and communes |

Only `annuaire` is exposed by default. The client selects a schema per
request.

## Why it fits Tablette

The browser can call the API directly, the agent fetches a small result while
composing an app, and the generated map inlines the selected rows. Nothing
calls Canutes at runtime.

```text
question ──► canutes_* tool ──► PostgREST (CORS, read-only)
                   │                    │
                   │              compact rows
                   ▼                    ▼
             map app / report with inline data
```

## Tools

| Tool | Purpose |
|------|---------|
| `canutes_query` | Query an allowlisted table with a narrow select and PostgREST filters |
| `canutes_search` | French full-text search over Assemblée, Sénat or Légifrance |
| `canutes_get` | Fetch one full record by id |
| `canutes_vote_by_department` | Aggregate a scrutin's nominative vote into map-ready buckets |

### `canutes_query`

Returns `{ count, rows }`. Filters use PostgREST syntax, for example:

```json
{
  "schema": "assemblee",
  "table": "scrutins",
  "select": "uid,legislature,data->>dateScrutin,data->>titre,data->>sort",
  "filter": { "data->>legislature": "eq.17" },
  "order": "data->>dateScrutin.desc",
  "limit": 8
}
```

The agent must pass a narrow `select`; selecting `*` or the whole `data` blob
for a list is a guardrail violation.

### `canutes_search`

French stemming requires the `french` text-search configuration. Multi-word
queries use `plfts(french)`, not `fts(french)`. Results carry document
metadata and a source URL.

### `canutes_get`

Fetches one full record, including the `data` blob. It is for a single scrutin,
deputy, dossier or article — not for lists.

### `canutes_vote_by_department`

Returns `pour`, `contre`, `abstentions` and `nonVotants` buckets keyed by
department, ready for a choropleth. The deputy-to-department join is cached for
the session. The first call may be slow.

## Example prompts

### Latest votes

```text
Liste les 8 derniers scrutins de la 17e législature, avec leur date, leur
titre, leur résultat et le nombre de votants.
```

Expected: `canutes_query` on `assemblee.scrutins`, filtered by legislature 17,
recent first, narrow projection.

### Search a law

```text
Cherche dans les textes de l'Assemblée les passages sur le logement social.
Donne-moi les 5 plus récents avec le titre du document, sa date et un lien
vers la source.
```

Expected: `canutes_search` with `corpus: "assemblee"`, then `canutes_get` only
if the full document is needed.

### Map a vote

```text
Map the vote on scrutin VTANR5L17V9651 by department. Colour the departments
by the share of "pour" votes and add a legend.
```

Expected: `canutes_get` then `canutes_vote_by_department`, with the buckets
inlined as GeoJSON properties.

### Group breakdown

```text
Rapport sur le vote VTANR5L17V9651 : quel groupe a voté quoi ? Ajoute un
graphique et la liste des non-votants.
```

Expected: `canutes_get`, `canutes_query` on `organes` / `acteurs`, then
`report_build`.

## Guardrails

The prompt and tools enforce:

- read-only access — no writes;
- bounded limits and narrow projections;
- French full-text search via `plfts(french)`;
- no invented ids, deputies, departments or figures;
- visible attribution;
- no runtime call to `db.code4code.eu` in a generated app or report.

A good Canutes app contains inline data and a source credit. `grep -i
code4code` in the generated HTML should return nothing.

## The geography gap

`annuaire.communes` is a directory of local public services keyed by INSEE
code, **not** a geometry table. It has no coordinates.

A department-level choropleth therefore needs geometry from another source
(an inline GeoJSON file, OSM boundaries, or a data module). The vote helper
provides the counts, not the shapes.

## Attribution

> Données : Canutes — Tricoteuses / Code4code, Licence Ouverte 2.0

Licence Ouverte 2.0 permits reuse, including commercial reuse, with
attribution. Check the source record for the original producer (Assemblée
nationale, Sénat, Légifrance).

## Verification

The service and query shapes were verified on 2026-11-07 and the module tools
were shipped on 2026-11-08. Data moves; use the examples above to discover
fresh ids when a canonical id has aged out.

## Next steps

- [Reports](/modules/report) — turn a vote into a document.
- [Wikidata](/modules/wikidata) — enrich departments with facts.
- [Open Data](/modules/opendata) — find geometry and context sources.
