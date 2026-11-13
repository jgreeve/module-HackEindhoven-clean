// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// scripts/sync-bimr.mjs — refresh the synced BIMR assets.
//
// Copies the MicroPython runtime and sample corpus out of the installed
// @bimr/web package (public/mp, public/samples) and the generated IfcxViewer
// class bundle from the bimr-web checkout (src/modules/bimr/viewer.mjs). None
// of the synced files should ever be hand-edited in Studio — re-run this
// script to update them.

import {
  copyFileSync,
  mkdirSync,
  existsSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { installedManifestPath } from "./resolve-package.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Where @bimr/web keeps its runtime assets inside node_modules.
const pkgJson = installedManifestPath("@bimr/web");
const webPkg = dirname(pkgJson);
const src = existsSync(pkgJson) ? JSON.parse(readFileSync(pkgJson, "utf8")) : null;
const pkgName = src?.name ?? "@bimr/web";

const assetRoot = join(webPkg, "dist", "lib", "assets");

// The bimr-web checkout that produces the IfcxViewer class bundle.
const viewerSource =
  process.env.BIMR_WEB_DIR ?? join(process.env.HOME ?? "~", "SOURCES", "BIMR", "bimr-web");
const viewerFile = join(viewerSource, "src", "lib", "viewer", "viewer.mjs");

function copyTree(from, to) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    const source = join(from, entry.name);
    const target = join(to, entry.name);
    if (entry.isDirectory()) copyTree(source, target);
    else copyFileSync(source, target);
  }
}

function copyDir(from, to, required) {
  if (!existsSync(from)) {
    const msg = `  ! missing ${from} (is ${pkgName} installed? run npm install)`;
    if (required) throw new Error(msg.slice(3));
    console.warn(msg);
    return false;
  }
  copyTree(from, to);
  return true;
}

console.log(`Syncing BIMR assets from ${pkgName} + bimr-web …`);

// The runtime + samples are provisioning prerequisites of dev/build (predev,
// prebuild) — the app cannot boot without them, so a missing source is an
// error, not a warning.
copyDir(join(assetRoot, "mp"), join(root, "public", "mp"), true);
copyDir(join(assetRoot, "samples"), join(root, "public", "samples"), true);

// The IfcxViewer class bundle is tracked in git (src/modules/bimr/viewer.mjs),
// so a fresh clone already has a committed copy. Refresh it only when the
// bimr-web checkout is available; its absence never blocks dev or build.
mkdirSync(join(root, "src", "modules", "bimr"), { recursive: true });
if (existsSync(viewerFile)) {
  copyFileSync(viewerFile, join(root, "src", "modules", "bimr", "viewer.mjs"));
  console.log(`  ok viewer.mjs <- ${viewerFile}`);
} else {
  console.warn(`  ! missing viewer bundle ${viewerFile}`);
  console.warn(`    (keeping the committed copy; build it in bimr-web with make sync-viewer to refresh)`);
}

console.log("sync:bimr complete.");
