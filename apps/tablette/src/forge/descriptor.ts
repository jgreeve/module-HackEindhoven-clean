// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/forge/descriptor.ts — read the forge UX descriptors.
//
// `.studio/studio.yaml` declares how Studio presents a repo (widgets, nav,
// actions); `bimr.yaml` is the library catalogue. Both are data-only and are
// validated loosely here (schema version + shape), never executed.

import { parse } from "yaml";
import * as forge from "./forgejo";

export interface StudioWidget {
  type: string;
  title?: string;
  source?: string;
  root?: string;
  paths?: string[];
  workflow?: string;
  page?: string;
  url?: string;
  items?: { label: string; href: string }[];
}

export interface StudioHandoff {
  kind: string;
  path?: string;
  run?: boolean;
  repo?: string;
  ref?: string;
  name?: string;
  source?: string;
  track?: string;
  lesson?: string;
  url?: string;
}

export interface StudioAction {
  id: string;
  label: string;
  handoff?: StudioHandoff;
}

export interface StudioDescriptor {
  studio: number;
  title?: string;
  description?: string;
  icon?: string;
  theme?: string;
  entry?: string;
  components?: StudioWidget[];
  actions?: StudioAction[];
}

export interface BimrItem {
  id: string;
  kind: string;
  title: string;
  description?: string;
  repo?: string;
  path?: string;
  preview?: string;
  ref?: string;
  version?: string;
  tags?: string[];
}

export interface BimrCatalogue {
  bimr: number;
  name?: string;
  description?: string;
  items: BimrItem[];
}

async function readYaml<T>(owner: string, repo: string, path: string): Promise<T | null> {
  try {
    const file = await forge.readFile(owner, repo, path);
    const data = parse(file.content) as unknown;
    return data && typeof data === "object" ? (data as T) : null;
  } catch {
    return null;
  }
}

/** Load a repo's `.studio/studio.yaml`, or null when absent/invalid. */
export async function loadStudioDescriptor(
  owner: string,
  repo: string,
): Promise<StudioDescriptor | null> {
  const d = await readYaml<StudioDescriptor>(owner, repo, ".studio/studio.yaml");
  if (!d || typeof d.studio !== "number") return null;
  return d;
}

/** Load a `bimr.yaml` catalogue (repo root by default). */
export async function loadBimrCatalogue(
  owner: string,
  repo: string,
  path = "bimr.yaml",
): Promise<BimrCatalogue | null> {
  const c = await readYaml<BimrCatalogue>(owner, repo, path);
  if (!c || !Array.isArray(c.items)) return null;
  return c;
}
