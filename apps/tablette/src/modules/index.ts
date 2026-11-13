// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/modules/index.ts — public module API.

export * from "./types.ts";
export {
  MODULES,
  attributionsForModules,
  modulesForMode,
  promptsForModules,
  toolNamesForModule,
  toolNamesForModules,
  toolsForModules,
  validateModules,
} from "./registry.ts";
export { OSM_CREDIT, creditLines } from "./credits.ts";
export { TABLETTE_REPO_URL, docsUrl } from "./links.ts";
