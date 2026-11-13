// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/map/types.ts — the GIS block and app contracts.
//
// A block is a self-contained piece of a static Leaflet map (a layer, a
// control or a utility). An app is a single self-contained HTML document built
// from a starter plus selected blocks. Both manifests are data-only YAML; see
// tasks/projects/studio_map_static.md for the authoritative shapes.

export type GisBlockKind = "layer" | "control" | "data" | "style" | "utility";

export const GIS_BLOCK_KINDS: readonly GisBlockKind[] = [
  "layer",
  "control",
  "data",
  "style",
  "utility",
];

export interface GisVendor {
  id: string;
  version: string;
  path: string;
  license?: string;
}

export interface GisCatalogueBlock {
  id: string;
  title: string;
  description?: string;
  version: string;
  kind: GisBlockKind;
  tags?: string[];
  path: string;
  entry: string;
  exports?: string[];
  dependencies?: string[];
  preview?: string;
}

export interface GisCatalogue {
  gis: number;
  name?: string;
  description?: string;
  blocks: GisCatalogueBlock[];
  vendor?: GisVendor[];
}

export interface GisBlockParam {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  default?: unknown;
}

/** `block.yaml` — the authoritative block contract. */
export interface GisBlockManifest {
  gis_block: number;
  id: string;
  title: string;
  description?: string;
  version: string;
  kind: GisBlockKind;
  tags?: string[];
  entry: string;
  exports?: string[];
  dependencies?: string[];
  params?: GisBlockParam[];
  files?: string[];
  example?: string;
  preview?: string;
  license?: string;
  attribution?: string;
}

/** The files of a block needed to compose an app. */
export interface GisBlockBundle {
  manifest: GisBlockManifest;
  manifestText: string;
  entry: string;
  css?: string;
  example?: string;
}

export interface GisAppBlockRef {
  id: string;
  version: string;
}

/** `app.yaml` — provenance for one generated app. */
export interface GisAppManifest {
  gis_app: number;
  id: string;
  title: string;
  description?: string;
  entry: string;
  created: string;
  prompt?: string;
  source_blocks: GisAppBlockRef[];
  tags?: string[];
  preview?: string;
  license?: string;
  attribution?: string[];
}

export interface GisAppIndexEntry {
  id: string;
  path: string;
  title: string;
  description?: string;
  tags?: string[];
  preview?: string;
}

/** `gis-apps.yaml` — the app catalogue. */
export interface GisAppsIndex {
  gis_apps: number;
  apps: GisAppIndexEntry[];
}

export interface GisBlockFilter {
  /** Free text matched against id, title, description and tags. */
  query?: string;
  kind?: GisBlockKind;
  /** Every tag must be present. */
  tags?: string[];
  /** Restrict to these block ids. */
  ids?: string[];
}

export interface GisAppBundle {
  manifest: GisAppManifest;
  manifestText: string;
  entry: string;
  readme?: string;
  /** Every file path in the app directory, relative to it. */
  files: string[];
}

/** Plain options passed to the starter renderer. */
export interface GisComposeInput {
  title: string;
  description?: string;
  blocks: GisBlockBundle[];
  /** Tile URL, attribution, initial centre/zoom, etc. */
  config: Record<string, unknown>;
  /** Small GeoJSON or other app data, inlined as `DATA`. */
  data?: unknown;
  /** The app-specific bootstrap, after the block functions. */
  script: string;
  /** Extra app CSS appended after the block CSS. */
  css?: string;
}

export interface GisSaveAppInput {
  slug: string;
  title: string;
  description?: string;
  prompt?: string;
  html: string;
  blockIds: string[];
  tags?: string[];
  readme?: string;
  overwrite?: boolean;
}

export interface GisSaveAppResult {
  slug: string;
  created: boolean;
  commit: string;
  url: string;
  blocks: GisAppBlockRef[];
}
