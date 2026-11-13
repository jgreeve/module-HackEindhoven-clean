// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/modules/links.ts — links from module UI to the published documentation.

export const TABLETTE_REPO_URL = "https://git.bimr.net/rvba/tablette";

/** Public documentation site, overridable with VITE_DOCS_BASE at build time. */
export const DOCS_BASE =
  import.meta.env.VITE_DOCS_BASE?.trim() || "https://docs.tablette.bimr.net";

/**
 * Public URL for a module's `docs` field.
 *
 * Descriptors point at site paths (`/modules/canutes`); the older repo-relative
 * form (`tasks/feature/canutes.md`) is still accepted so a module published
 * before the docs site moved keeps a working link.
 */
export function docsUrl(path: string): string {
  const sitePath = path
    .replace(/^\/?tasks\/feature\//, "/modules/")
    .replace(/\.md(#.*)?$/, "$1");
  return new URL(sitePath.replace(/^\/+/, ""), `${DOCS_BASE.replace(/\/+$/, "")}/`).toString();
}
