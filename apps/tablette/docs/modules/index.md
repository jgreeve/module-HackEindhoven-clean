# Modules

Modules add tools, prompt instructions and public data sources to Tablette.
They are installed npm packages (`@tablette/module-*`), except the core-owned
BIMR engine.

All six modules are enabled by default. The five data modules are scoped to
**Sketch** mode; the core-owned BIMR engine is scoped to Explore, Learn and
Build. Toggle them in **Settings > Modules** or **Explore > Modules**; the agent
uses the new set on its next turn.

## Catalogue

| Module | Package | What it adds | Tools | Surface |
|--------|---------|--------------|------:|---------|
| [Canutes](/modules/canutes) | `@tablette/module-canutes` | French parliamentary open data | 4 | Canutes browser |
| [Open Data](/modules/opendata) | `@tablette/module-opendata` | Catalogue of public sources by topic and country | 3 | Open Data browser |
| [Reports](/modules/report) | `@tablette/module-report` | Self-contained, printable HTML research reports | 1 | Reports library |
| [Wikidata](/modules/wikidata) | `@tablette/module-wikidata` | CC0 facts, coordinates, types and identifiers | 4 | — |
| [Wikimedia](/modules/wikimedia) | `@tablette/module-wikimedia` | Wikipedia summaries and Commons media | 3 | — |
| [BIMR](/modules/bimr) | core (`src/modules/bimr/`) | Legacy BIMR Python/IFCX runtime | 3 | — |

## Sources at a glance

| Source | Endpoint | License | Module |
|--------|----------|---------|--------|
| Canutes (Tricoteuses / Code4code) | `https://db.code4code.eu/canutes` | Licence Ouverte 2.0 | Canutes |
| Wikidata API | `https://www.wikidata.org/w/api.php` | CC0 1.0 | Wikidata |
| Wikidata Query Service | `https://query.wikidata.org/sparql` | CC0 1.0 | Wikidata |
| Wikipédia | `https://<lang>.wikipedia.org/w/api.php` | CC BY-SA 4.0 | Wikimedia |
| Wikimedia Commons | `https://commons.wikimedia.org/w/api.php` | per file | Wikimedia |

Open Data is metadata only: it returns catalogue records, never datasets.

## How the modules compose

When you ask for an app, the assistant can combine modules in one turn. For
example:

```text
Map the vote on scrutin VTANR5L17V9651 by department, add a Wikidata
description for each department, and write a one-page report with the result.
```

A plausible tool path is:

```text
canutes_get ──► canutes_vote_by_department ──► wikidata_entity
      │                                              │
      └──────────────► report_build ◄────────────────┘
                           │
                           └──► reports/<slug>.html
```

Data is fetched while composing and inlined. The generated app or report does
not call the source at runtime.

## Module rules

- **Read-only.** No module writes to a public source.
- **Bounded.** Tools cap limits and projections; no whole-table downloads.
- **Attributed.** Every source declares its license and credit line.
- **Static output.** Generated apps and reports are self-contained.
- **Scoped.** A module only appears in the modes it declares.

## Adding a module

See [Module SDK](/reference/module-sdk) for the package layout and contract.
The short version:

1. Create `@tablette/module-<id>` implementing the SDK.
2. Export a descriptor with `id`, `label`, `modes`, `createTools` and optional
   `Surface`, `dataSources`, `attribution` and settings.
3. Add the package to the core's `package.json`.
4. Run `npm install && npm run gen:modules && npm run typecheck`.
5. Point `docs` at a page on this site (`/modules/<id>`).

## Next steps

- [Canutes](/modules/canutes) — votes, deputies, dossiers and laws.
- [Reports](/modules/report) — turn fetched data into a document.
- [Modules guide](/guide/modules) — enablement and per-mode scope.
