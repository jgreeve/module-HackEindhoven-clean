# Reports

Generate a **self-contained, printable HTML research report** from data the
agent has already fetched and verified.

| | |
|:--|:--|
| **Module** | `@tablette/module-report` |
| **Tool** | `report_build` |
| **Mode** | Sketch |
| **Output** | `reports/<slug>.html` |
| **Surface** | Explore > Modules > Reports |
| **Role** | Render only |

## What it does

The report module is deliberately small:

- it **does not fetch** data;
- it **does not know** Canutes, Wikidata or Wikipedia;
- it **does not run** at runtime inside the report;
- it takes a validated spec with inline data and produces one HTML file.

The agent orchestrates the sources. This keeps the module independent,
testable and safe, and it makes the report reproducible: every figure is
already in the document.

```text
agent ──► canutes_* / wikidata_* / wikimedia_*      data
      ──► report_build(spec with inline data)       render + write
      ──► reports/<slug>.html                       artifact
      ──► Viewer (auto-preview)                     read / print
```

## The report spec

```ts
interface ReportSpec {
  title: string;                 // max 160 chars
  subtitle?: string;             // max 240 chars
  lang?: string;                 // "fr" by default
  author?: string;               // default "Studio"
  abstract?: string;             // markdown-lite, max 1,200 chars
  sections: ReportSection[];     // max 12
  sources: ReportSource[];       // max 20
  outputPath?: string;           // default reports/<slug>.html
  theme?: "default" | "brief";
  preview?: boolean;             // default true
}
```

Sections can be:

| Kind | Content |
|------|---------|
| `prose` | Paragraphs of text |
| `findings` | A list of key findings |
| `metrics` | Label/value pairs with optional notes |
| `table` | Columns and rows |
| `chart` | `bar`, `line` or `pie`, with inline data |
| `quote` | Text and attribution |
| `timeline` | Dated events |
| `gallery` | Images with alt, credit, license and source URL |
| `methodology` | How the data was obtained and processed |

Every section can cite a `sourceId` from `sources`.

## Tool contract

`report_build` takes the spec, renders one HTML file and writes it to
`reports/<slug>.html`. It previews the report in the Viewer by default.

The tool is a renderer, not a researcher. If the spec has no source for a
figure, the report should not contain the figure.

## Example prompts

### Scrutin report

```text
Fais un rapport sur le scrutin VTANR5L17V9651 : objet, date, résultat,
répartition par groupe et par département, avec une méthodologie et les sources.
```

Expected path: `canutes_get` → `canutes_vote_by_department` → `report_build`.

The report should contain:

- title, abstract and key findings;
- metrics (pour, contre, abstentions, non-votants);
- a bar chart and a department table;
- a methodology section;
- a Canutes source with license and access date.

### Housing brief

```text
Prépare une note de synthèse sur le logement social en France. Utilise les
textes parlementaires et les données publiques disponibles, avec les sources.
```

Expected path: `canutes_search` → `opendata_search` → `wikimedia_summary` (if
useful) → `report_build`.

### Illustrated report

```text
Ajoute une photo sous licence libre de l'Assemblée nationale au rapport.
```

Expected path: `wikimedia_commons_search` → `report_build` with a `gallery`
section carrying the file page, artist, credit and license. An image with an
unknown license is rejected.

## Design and print

The default theme is an editorial page: title block, abstract, findings,
metrics, tables, charts, quotes, timeline, gallery, methodology and sources.
The `brief` theme is denser, for a two-page note.

Reports are print-ready: A4 page size, sensible page breaks and readable
tables. Browser print is the export path; there is no PDF service.

## Safety

- No raw HTML in the spec.
- No external script or runtime API.
- No `javascript:` links.
- No path outside `reports/`.
- Images must use HTTPS and carry a known license.
- The spec is embedded in the HTML, so the report is reproducible.

## Reports library

Reports with a surface appear in **Explore > Modules > Reports**. The library
lists generated reports from the workspace and opens them in the Viewer.

## Limits

| Field | Limit |
|-------|------:|
| Sections | 12 |
| Sources | 20 |
| Title | 160 chars |
| Subtitle | 240 chars |
| Abstract | 1,200 chars |
| Findings | 20 items |
| Metrics | 12 items |
| Chart data points | 12 |
| Table columns / rows | 8 / 40 |
| Timeline events | 30 |
| Gallery images | 8 |

## Attribution

The report footer carries the sources' attribution lines, for example:

- `Données : Canutes — Tricoteuses / Code4code, Licence Ouverte 2.0`
- `Données : Wikidata (CC0)`
- `Texte : Wikipédia (CC BY-SA 4.0)`
- Commons images: credit and license per file.

## Next steps

- [Canutes](/modules/canutes) — the data behind a vote report.
- [Wikimedia](/modules/wikimedia) — prose and licensed images.
- [Open Data](/modules/opendata) — find additional sources.
