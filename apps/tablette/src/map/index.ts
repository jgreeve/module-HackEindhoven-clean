// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/map/index.ts — the GIS block library and app services.

export * from "./types";
export {
  parseAppManifest,
  parseAppsIndex,
  parseBlockManifest,
  parseCatalogue,
  selectBlocks,
  slugify,
} from "./catalogue";
export { LEAFLET_CDN, LEAFLET_VERSION, renderAppHtml } from "./compose";
export { commitRepoFiles } from "./commit";
export {
  clearPreview,
  getPreview,
  setPreview,
  subscribePreview,
} from "./preview";
export type { MapPreview } from "./preview";
export {
  boot as bootMap,
  ensureDefaultApp,
  getCurrentApp,
  getState as getMapState,
  loadStarter,
  openSavedApp,
  reset as resetMap,
  runApp,
  setComposedApp,
  setSource as setMapSource,
  subscribeState as subscribeMapState,
} from "./session";
export type { MapState, MapStatus, MapDocumentKind } from "./session";
export {
  clearCatalogueCache,
  GIS_APPS_INDEX,
  GIS_APPS_REPO,
  GIS_SRC_REPO,
  listApps,
  listBlocks,
  readApp,
  readBlock,
  readCatalogue,
  saveApp,
} from "./repo";
