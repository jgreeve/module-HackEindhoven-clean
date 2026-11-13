// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/map/repo.ts — the GIS library and app catalogue over the forge API.
//
// `bimr/gis-src` is read-only for the Studio agent; `bimr/gis-apps` is written
// through a single atomic multi-file commit. Discovery reads the catalogue and
// selected block files on demand through the API; saving clones the small app
// repo into a scratch directory (see ./commit) and never touches the workspace.

import { stringify } from "yaml";
import { forgeUrl } from "../forge/auth";
import * as forge from "../forge/forgejo";
import { commitRepoFiles } from "./commit";
import {
  parseAppManifest,
  parseAppsIndex,
  parseBlockManifest,
  parseCatalogue,
  selectBlocks,
  slugify,
} from "./catalogue";
import { localAppEntries, findLocalApp } from "./samples";
import type {
  GisAppBundle,
  GisAppIndexEntry,
  GisAppManifest,
  GisAppsIndex,
  GisBlockBundle,
  GisBlockFilter,
  GisCatalogue,
  GisCatalogueBlock,
  GisSaveAppInput,
  GisSaveAppResult,
} from "./types";

export const GIS_SRC_REPO = "bimr/gis-src";
export const GIS_APPS_REPO = "bimr/gis-apps";
export const GIS_APPS_INDEX = "gis-apps.yaml";
const CATALOGUE_TTL_MS = 60_000;

let catalogueCache: { at: number; value: GisCatalogue } | null = null;

function split(repo: string): [string, string] {
  return forge.splitRepo(repo);
}

/** Read the block catalogue, with a short cache so a turn reads it once. */
export async function readCatalogue(force = false): Promise<GisCatalogue> {
  const now = Date.now();
  if (!force && catalogueCache && now - catalogueCache.at < CATALOGUE_TTL_MS) {
    return catalogueCache.value;
  }
  const [owner, repo] = split(GIS_SRC_REPO);
  const file = await forge.readFile(owner, repo, "gis.yaml");
  const value = parseCatalogue(file.content);
  catalogueCache = { at: now, value };
  return value;
}

/** Invalidate the cached catalogue (after a library update). */
export function clearCatalogueCache(): void {
  catalogueCache = null;
}

/** List catalogue entries matching a filter. */
export async function listBlocks(filter: GisBlockFilter = {}): Promise<GisCatalogueBlock[]> {
  return selectBlocks(await readCatalogue(), filter);
}

function findBlock(catalogue: GisCatalogue, idOrPath: string): GisCatalogueBlock | null {
  const needle = idOrPath.replace(/\/+$/, "");
  return (
    catalogue.blocks.find((block) => block.id === needle) ??
    catalogue.blocks.find((block) => block.path === needle) ??
    null
  );
}

/**
 * Read a block's contract and the files needed to inline it.
 * `idOrPath` is a catalogue id or a path such as `blocks/base-map`.
 */
export async function readBlock(idOrPath: string): Promise<GisBlockBundle> {
  const catalogue = await readCatalogue();
  const entry = findBlock(catalogue, idOrPath);
  const path = entry?.path ?? (idOrPath.startsWith("blocks/") ? idOrPath : `blocks/${idOrPath}`);
  const [owner, repo] = split(GIS_SRC_REPO);

  const manifestFile = await forge.readFile(owner, repo, `${path}/block.yaml`);
  const manifest = parseBlockManifest(manifestFile.content);
  const resolvedEntry = entry?.entry ?? manifest.entry;
  const entryFile = await forge.readFile(owner, repo, `${path}/${resolvedEntry}`);

  const cssPath = (manifest.files ?? []).find((file) => file.endsWith(".css"));
  const css = cssPath
    ? await forge
        .readFile(owner, repo, `${path}/${cssPath}`)
        .then((file) => file.content)
        .catch(() => undefined)
    : undefined;

  const example = manifest.example
    ? await forge
        .readFile(owner, repo, `${path}/${manifest.example}`)
        .then((file) => file.content)
        .catch(() => undefined)
    : undefined;

  return {
    manifest,
    manifestText: manifestFile.content,
    entry: entryFile.content,
    css,
    example,
  };
}

async function readIndex(): Promise<GisAppsIndex> {
  const [owner, repo] = split(GIS_APPS_REPO);
  try {
    const file = await forge.readFile(owner, repo, GIS_APPS_INDEX);
    return parseAppsIndex(file.content);
  } catch {
    return { gis_apps: 1, apps: [] };
  }
}

/** The generated-app catalogue, with built-in samples first. */
export async function listApps(): Promise<GisAppIndexEntry[]> {
  const remote = await readIndex();
  const local = localAppEntries();
  const ids = new Set(local.map((entry) => entry.id));
  return [...local, ...remote.apps.filter((entry) => !ids.has(entry.id))];
}

/** Read one app's manifest, entry document and README. */
export async function readApp(idOrPath: string): Promise<GisAppBundle> {
  const local = findLocalApp(idOrPath);
  if (local) return local;

  const index = await readIndex();
  const clean = idOrPath.replace(/\/+$/, "");
  const entry = index.apps.find((app) => app.id === clean) ?? null;
  const path = entry?.path ?? (clean.startsWith("apps/") ? clean : `apps/${clean}`);
  const [owner, repo] = split(GIS_APPS_REPO);

  const manifestFile = await forge.readFile(owner, repo, `${path}/app.yaml`);
  const manifest = parseAppManifest(manifestFile.content);
  const [entryFile, readme, contents] = await Promise.all([
    forge.readFile(owner, repo, `${path}/${manifest.entry}`),
    forge
      .readFile(owner, repo, `${path}/README.md`)
      .then((file) => file.content)
      .catch(() => undefined),
    forge.listContents(owner, repo, path),
  ]);

  return {
    manifest,
    manifestText: manifestFile.content,
    entry: entryFile.content,
    readme,
    files: contents.map((item) => item.path),
  };
}

function defaultReadme(manifest: GisAppManifest, slug: string): string {
  const blocks = manifest.source_blocks
    .map((block) => `\`${block.id}@${block.version}\``)
    .join(", ");
  return `# ${manifest.title}

${manifest.description ?? "A static OpenStreetMap + Leaflet map app."}

Open [\`${manifest.entry}\`](${manifest.entry}) directly in a browser. The app is
one self-contained document: inline CSS, JavaScript and small GeoJSON; Leaflet
is loaded from a pinned CDN. There is no build step and no server runtime.

## Provenance

Built from the \`gis-src\` blocks ${blocks || "(none)"}. See
[\`app.yaml\`](app.yaml).

## Reproduce

\`\`\`bash
git clone ${forgeUrl()}/${GIS_APPS_REPO}.git
cd ${GIS_APPS_REPO}/apps/${slug}
xdg-open ${manifest.entry}
\`\`\`

## Data and attribution

${(manifest.attribution ?? ["© OpenStreetMap contributors"]).join("\n\n")}
`;
}

function indexEntry(manifest: GisAppManifest, path: string, slug: string): GisAppIndexEntry {
  return {
    id: slug,
    path,
    title: manifest.title,
    description: manifest.description,
    tags: manifest.tags,
    preview: manifest.preview,
  };
}

/**
 * Save an app and update `gis-apps.yaml` in one commit.
 *
 * The HTML is supplied by the caller (composed with `renderAppHtml`), so this
 * function owns provenance, slug safety, conflict detection and the atomic
 * write — not the map content.
 */
export async function saveApp(input: GisSaveAppInput): Promise<GisSaveAppResult> {
  const slug = slugify(input.slug || input.title);
  if (!slug) throw new Error("invalid app slug");
  if (!input.html.trim()) throw new Error("cannot save an empty app");

  const index = await readIndex();
  const existing = index.apps.find((app) => app.id === slug);
  if (existing && !input.overwrite) {
    throw new Error(`app "${slug}" already exists; choose another slug or set overwrite`);
  }

  const blockIds = [...new Set(input.blockIds)].filter(Boolean);
  const blocks = await Promise.all(blockIds.map((id) => readBlock(id)));
  const sourceBlocks = blocks.map((block) => ({
    id: block.manifest.id,
    version: block.manifest.version,
  }));
  const path = `apps/${slug}`;
  const [owner, repo] = split(GIS_APPS_REPO);

  // On update, keep the provenance that the app already carried: creation
  // date, preview, prompt and attribution must not be reset by a re-save.
  let previous: GisAppManifest | null = null;
  if (existing) {
    try {
      previous = parseAppManifest(
        (await forge.readFile(owner, repo, `${path}/app.yaml`)).content,
      );
    } catch {
      previous = null;
    }
  }

  const manifest: GisAppManifest = {
    gis_app: 1,
    id: slug,
    title: input.title.trim() || slug,
    description: input.description?.trim() ?? previous?.description,
    entry: "index.html",
    created: previous?.created ?? new Date().toISOString().slice(0, 10),
    prompt: input.prompt?.trim() ?? previous?.prompt,
    source_blocks: sourceBlocks.length ? sourceBlocks : (previous?.source_blocks ?? []),
    tags: input.tags?.map((tag) => tag.trim()).filter(Boolean) ?? previous?.tags,
    preview: previous?.preview,
    license: previous?.license ?? "MIT",
    attribution: previous?.attribution ?? ["© OpenStreetMap contributors"],
  };

  const entry = indexEntry(manifest, path, slug);
  const nextIndex: GisAppsIndex = {
    gis_apps: 1,
    apps: existing
      ? index.apps.map((app) => (app.id === slug ? entry : app))
      : [...index.apps, entry],
  };

  const files = [
    { path: `${path}/app.yaml`, content: stringify(manifest, { lineWidth: 0 }) },
    { path: `${path}/index.html`, content: input.html },
    {
      path: `${path}/README.md`,
      content: (input.readme?.trim() || defaultReadme(manifest, slug)) + "\n",
    },
    { path: GIS_APPS_INDEX, content: stringify(nextIndex, { lineWidth: 0 }) },
  ];

  const commit = await commitRepoFiles(
    owner,
    repo,
    files,
    `${existing ? "feat(apps): update" : "feat(apps): add"} ${slug}`,
  );

  return {
    slug,
    created: !existing,
    commit: commit.sha,
    url: commit.url,
    blocks: sourceBlocks,
  };
}
