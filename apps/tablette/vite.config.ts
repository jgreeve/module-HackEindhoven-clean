// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { handleNode } from "./proxy/node.mjs";

// Build identity, shown at the bottom of Settings. The hash is the current
// commit; the version comes from package.json.
const pkg = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as { version: string };

// Same-origin forge proxy route. Vite mounts proxy/proxy.mjs at /forge-proxy in
// both dev and preview, so bake it into the build by default: `npm run build`
// then `npm run preview` works without extra environment. Set
// VITE_FORGE_PROXY="" to build for a direct (CORS-enabled) forge, or to a URL.
const forgeProxyBase =
  process.env.VITE_FORGE_PROXY !== undefined
    ? process.env.VITE_FORGE_PROXY
    : "/forge-proxy/";
const gitHash = (() => {
  try {
    return execSync("git rev-parse --short HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return "dev";
  }
})();

// Documentation site linked from the module catalogue. The module docs moved
// out of the source repository, so links point at the published site instead
// of a branch on the forge.
const docsBase = process.env.VITE_DOCS_BASE?.trim() || "https://docs.tablette.bimr.net";

// Studio — Vite + React SPA.
// The BIMR MicroPython runtime (public/mp) and samples (public/samples) are
// synced from the @bimr/web package (scripts/sync-bimr.mjs). The IFCX viewer
// bundle (src/modules/bimr/viewer.mjs) is bundled here, resolving `three` from
// node_modules.
//
// Dev/preview: mount the portable forge proxy (proxy/proxy.mjs) at
// /forge-proxy so development and production share one implementation. In
// dev any host is allowed unless FORGE_ALLOWED_HOSTS is set.
function allowForgeProxy(): void {
  if (!process.env.FORGE_ALLOWED_HOSTS && !process.env.FORGE_ALLOW_ANY) {
    process.env.FORGE_ALLOW_ANY = "1";
  }
}

function forgeProxy(): Plugin {
  return {
    name: "studio-forge-proxy",
    configureServer(server) {
      allowForgeProxy();
      server.middlewares.use((req, res, next) => {
        if (!req.url || !req.url.startsWith("/forge-proxy/")) return next();
        void handleNode(req, res);
      });
    },
    // `make serve` previews the production build; keep the forge API and git
    // routes working there too.
    configurePreviewServer(server) {
      allowForgeProxy();
      server.middlewares.use((req, res, next) => {
        if (!req.url || !req.url.startsWith("/forge-proxy/")) return next();
        void handleNode(req, res);
      });
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), forgeProxy()],
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(pkg.version),
    "import.meta.env.VITE_GIT_HASH": JSON.stringify(gitHash),
    "import.meta.env.VITE_DOCS_BASE": JSON.stringify(docsBase),
    "import.meta.env.VITE_FORGE_PROXY": JSON.stringify(forgeProxyBase),
  },
  build: {
    target: "esnext",
  },
});
