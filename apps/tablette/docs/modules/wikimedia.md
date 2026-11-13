# Wikimedia

**Wikipedia summaries and Wikimedia Commons media** for reports and
illustrated pages.

| | |
|:--|:--|
| **Module** | `@tablette/module-wikimedia` |
| **Tools** | `wikimedia_search`, `wikimedia_summary`, `wikimedia_commons_search` |
| **Mode** | Sketch |
| **Services** | Wikipedia Action API, Wikipedia REST summary API, Commons Action API |
| **Auth** | none |
| **CORS** | yes for GET with `origin=*` |
| **Writes** | none |

Wikimedia is separate from [Wikidata](/modules/wikidata) so the licenses stay
separate:

| Source | Content | License | Module |
|--------|---------|---------|--------|
| Wikidata | labels, claims, coordinates, sitelinks | CC0 | `wikidata` |
| Wikipedia | article text and summaries | CC BY-SA 4.0 | `wikimedia` |
| Commons | images, diagrams, photographs | per file | `wikimedia` |

## Why a separate module

A research report needs context, not just facts: what does "logement social"
mean, what does a constituency look like, is there a photograph? Wikidata
supplies facts; Wikipedia supplies prose; Commons supplies media.

Keeping them separate means a report can use CC0 facts without implying that
CC BY-SA text is CC0, and every Commons image can carry its own credit.

## Tools

| Tool | Purpose |
|------|---------|
| `wikimedia_search` | Search Wikipedia articles; return titles, URLs and snippets |
| `wikimedia_summary` | Fetch a bounded intro (2–8 sentences) with canonical URL and license |
| `wikimedia_commons_search` | Search Commons; return thumbnail, file page, artist, credit, license and license URL |

`wikimedia_commons_search` only returns files with a **known license**. An
unknown license is skipped.

### Endpoints

```text
https://<lang>.wikipedia.org/w/api.php
https://<lang>.wikipedia.org/api/rest_v1/page/summary/<title>
https://commons.wikimedia.org/w/api.php
```

Language is part of the host: `fr.wikipedia.org`, `en.wikipedia.org`, and so
on. Commons is multilingual; its metadata is mostly English.

### User agent

The module identifies Tablette with:

```text
tablette/4.0.0 (https://tablette.bimr.net)
```

The `Api-User-Agent` header is accepted by the API. Wikimedia asks clients to
be identifiable and polite: one request per tool call, bounded payloads and no
bulk crawling.

## Example prompts

### Add context

```text
Ajoute un paragraphe de contexte sur le logement social au rapport, avec la
source Wikipédia et sa licence.
```

Expected: `wikimedia_search` → `wikimedia_summary`; the report cites the
canonical URL and CC BY-SA 4.0.

### Licensed image

```text
Ajoute une photo sous licence libre de l'Assemblée nationale au rapport.
```

Expected: `wikimedia_commons_search` → `report_build` with a `gallery` section
carrying the file page, artist, credit, license and license URL.

### Deputy profile

```text
Fais une fiche sur la députée Cyrielle Chatelain : biographie courte, groupe,
circonscription et une photo sous licence libre.
```

Expected: Canutes for the parliamentary facts, Wikimedia for the summary and a
licensed image. The photo credit is per file.

## Licensing

### Wikipedia

Wikipedia text is **CC BY-SA 4.0**.

- cite the article and link to the canonical URL;
- name the license;
- if you reuse a long passage, keep the share-alike terms in mind.

### Wikimedia Commons

Commons files have **per-file licenses**. The module returns:

- the file page URL;
- the artist or uploader;
- the credit line;
- the license name and URL;
- a thumbnail URL.

Never use an image whose license is unknown. Never strip the credit.

### Wikidata

Wikidata is **CC0 1.0**. The courtesy credit is `Données : Wikidata (CC0)`.

## Integration with reports

The report module renders a `gallery` section:

```ts
{
  kind: "gallery",
  title: "Illustrations",
  images: [
    {
      url: "https://upload.wikimedia.org/...",
      alt: "Assemblée nationale",
      credit: "Photo: …",
      license: "CC BY-SA 4.0",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:..."
    }
  ]
}
```

All five fields are required. The report footer repeats the source credits.

## Guardrails

- Do not fetch full articles.
- Do not call Wikipedia or Commons at report runtime.
- Do not use an image with an unknown license.
- Do not omit the credit or the license.
- Keep requests bounded and identify the client.

## Next steps

- [Reports](/modules/report) — render the summary and gallery.
- [Wikidata](/modules/wikidata) — facts and coordinates.
- [Canutes](/modules/canutes) — the French parliamentary data.
