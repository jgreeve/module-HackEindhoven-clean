// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/map/catalogue.ts — parse and query the GIS YAML contracts.
//
// The parsers are deliberately loose about extra keys but strict about the
// fields the composer depends on. A malformed catalogue throws a readable
// error instead of producing a half-valid app.

import { parse } from "yaml";
import { GIS_BLOCK_KINDS } from "./types";
import type {
  GisAppIndexEntry,
  GisAppManifest,
  GisAppsIndex,
  GisBlockFilter,
  GisBlockKind,
  GisBlockManifest,
  GisBlockParam,
  GisCatalogue,
  GisCatalogueBlock,
  GisVendor,
} from "./types";

function obj(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function bool(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function stringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
  return items.length ? items : undefined;
}

function blockKind(value: unknown): GisBlockKind | undefined {
  return typeof value === "string" && (GIS_BLOCK_KINDS as readonly string[]).includes(value)
    ? (value as GisBlockKind)
    : undefined;
}

function required(value: string | undefined, what: string): string {
  if (!value) throw new Error(`invalid GIS manifest: missing ${what}`);
  return value;
}

function parseCatalogueBlock(value: unknown, index: number): GisCatalogueBlock {
  const data = obj(value);
  if (!data) throw new Error(`invalid gis.yaml: blocks[${index}] is not an object`);
  const id = required(str(data.id), `blocks[${index}].id`);
  return {
    id,
    title: required(str(data.title), `blocks[${index}].title`),
    description: str(data.description),
    version: required(str(data.version), `blocks[${index}].version`),
    kind: blockKind(data.kind) ?? "utility",
    tags: stringList(data.tags),
    path: required(str(data.path), `blocks[${index}].path`).replace(/\/+$/, ""),
    entry: required(str(data.entry), `blocks[${index}].entry`),
    exports: stringList(data.exports),
    dependencies: stringList(data.dependencies),
    preview: str(data.preview),
  };
}

function parseVendor(value: unknown, index: number): GisVendor {
  const data = obj(value);
  if (!data) throw new Error(`invalid gis.yaml: vendor[${index}] is not an object`);
  return {
    id: required(str(data.id), `vendor[${index}].id`),
    version: required(str(data.version), `vendor[${index}].version`),
    path: required(str(data.path), `vendor[${index}].path`),
    license: str(data.license),
  };
}

/** Parse `gis-src/gis.yaml`. */
export function parseCatalogue(text: string): GisCatalogue {
  const data = obj(parse(text) as unknown);
  if (!data) throw new Error("invalid gis.yaml: document is not an object");
  if (num(data.gis) !== 1) throw new Error("invalid gis.yaml: expected gis: 1");
  if (!Array.isArray(data.blocks)) throw new Error("invalid gis.yaml: blocks must be an array");
  return {
    gis: 1,
    name: str(data.name),
    description: str(data.description),
    blocks: data.blocks.map(parseCatalogueBlock),
    vendor: Array.isArray(data.vendor) ? data.vendor.map(parseVendor) : undefined,
  };
}

function parseBlockParam(value: unknown, index: number): GisBlockParam {
  const data = obj(value);
  if (!data) throw new Error(`invalid block.yaml: params[${index}] is not an object`);
  return {
    name: required(str(data.name), `params[${index}].name`),
    type: str(data.type) ?? "any",
    required: bool(data.required),
    description: str(data.description),
    default: data.default,
  };
}

/** Parse a `block.yaml`. */
export function parseBlockManifest(text: string): GisBlockManifest {
  const data = obj(parse(text) as unknown);
  if (!data) throw new Error("invalid block.yaml: document is not an object");
  if (num(data.gis_block) !== 1) throw new Error("invalid block.yaml: expected gis_block: 1");
  const kind = blockKind(data.kind);
  if (!kind) throw new Error(`invalid block.yaml: unknown kind "${String(data.kind)}"`);
  return {
    gis_block: 1,
    id: required(str(data.id), "id"),
    title: required(str(data.title), "title"),
    description: str(data.description),
    version: required(str(data.version), "version"),
    kind,
    tags: stringList(data.tags),
    entry: required(str(data.entry), "entry"),
    exports: stringList(data.exports),
    dependencies: stringList(data.dependencies),
    params: Array.isArray(data.params) ? data.params.map(parseBlockParam) : undefined,
    files: stringList(data.files),
    example: str(data.example),
    preview: str(data.preview),
    license: str(data.license),
    attribution: str(data.attribution),
  };
}

function parseAppIndexEntry(value: unknown, index: number): GisAppIndexEntry {
  const data = obj(value);
  if (!data) throw new Error(`invalid gis-apps.yaml: apps[${index}] is not an object`);
  return {
    id: required(str(data.id), `apps[${index}].id`),
    path: required(str(data.path), `apps[${index}].path`).replace(/\/+$/, ""),
    title: required(str(data.title), `apps[${index}].title`),
    description: str(data.description),
    tags: stringList(data.tags),
    preview: str(data.preview),
  };
}

/** Parse `gis-apps/gis-apps.yaml`. */
export function parseAppsIndex(text: string): GisAppsIndex {
  const data = obj(parse(text) as unknown);
  if (!data) throw new Error("invalid gis-apps.yaml: document is not an object");
  if (num(data.gis_apps) !== 1) throw new Error("invalid gis-apps.yaml: expected gis_apps: 1");
  if (!Array.isArray(data.apps)) throw new Error("invalid gis-apps.yaml: apps must be an array");
  return { gis_apps: 1, apps: data.apps.map(parseAppIndexEntry) };
}

function parseBlockRef(value: unknown, index: number): { id: string; version: string } {
  const data = obj(value);
  if (!data) throw new Error(`invalid app.yaml: source_blocks[${index}] is not an object`);
  return {
    id: required(str(data.id), `source_blocks[${index}].id`),
    version: required(str(data.version), `source_blocks[${index}].version`),
  };
}

/** Parse an `app.yaml`. */
export function parseAppManifest(text: string): GisAppManifest {
  const data = obj(parse(text) as unknown);
  if (!data) throw new Error("invalid app.yaml: document is not an object");
  if (num(data.gis_app) !== 1) throw new Error("invalid app.yaml: expected gis_app: 1");
  if (!Array.isArray(data.source_blocks)) {
    throw new Error("invalid app.yaml: source_blocks must be an array");
  }
  return {
    gis_app: 1,
    id: required(str(data.id), "id"),
    title: required(str(data.title), "title"),
    description: str(data.description),
    entry: required(str(data.entry), "entry"),
    created: required(str(data.created), "created"),
    prompt: str(data.prompt),
    source_blocks: data.source_blocks.map(parseBlockRef),
    tags: stringList(data.tags),
    preview: str(data.preview),
    license: str(data.license),
    attribution: stringList(data.attribution),
  };
}

/** Filter the catalogue by free text, kind, tags and ids. */
export function selectBlocks(
  catalogue: GisCatalogue,
  filter: GisBlockFilter = {},
): GisCatalogueBlock[] {
  const ids = filter.ids ? new Set(filter.ids) : null;
  const tags = filter.tags?.map((tag) => tag.toLowerCase()).filter(Boolean);
  const query = filter.query?.trim().toLowerCase();
  return catalogue.blocks.filter((block) => {
    if (ids && !ids.has(block.id)) return false;
    if (filter.kind && block.kind !== filter.kind) return false;
    const blockTags = (block.tags ?? []).map((tag) => tag.toLowerCase());
    if (tags?.length && !tags.every((tag) => blockTags.includes(tag))) return false;
    if (query) {
      const haystack = [block.id, block.title, block.description ?? "", ...blockTags]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

/** A safe, lowercase, hyphenated app slug. */
export function slugify(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
  return slug || "map-app";
}
