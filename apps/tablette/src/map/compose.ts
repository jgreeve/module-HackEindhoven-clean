// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/map/compose.ts — render a single-file static Leaflet app.
//
// The output is deliberately boring: one HTML document, pinned Leaflet, block
// functions inlined with provenance comments, one config object, optional
// inline GeoJSON, and an app script. No build step and no server.

import type { GisBlockBundle, GisComposeInput } from "./types";

export const LEAFLET_VERSION = "1.9.4";
export const LEAFLET_CDN = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * JSON safe to inline in a <script> element. Escapes the closing tag and the
 * line separators that break older parsers.
 */
function jsonForScript(value: unknown): string {
  return JSON.stringify(value, null, 2)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function blockHeader(block: GisBlockBundle): string {
  return `/* --- block: ${block.manifest.id}@${block.manifest.version} --- */`;
}

function blockCss(blocks: GisBlockBundle[]): string {
  return blocks
    .filter((block) => block.css?.trim())
    .map((block) => `${blockHeader(block)}\n${block.css!.trim()}`)
    .join("\n\n");
}

function blockScript(blocks: GisBlockBundle[]): string {
  return blocks
    .map((block) => `${blockHeader(block)}\n${block.entry.trim()}`)
    .join("\n\n");
}

const BASE_CSS = `:root {
  color-scheme: light;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
}
html,
body,
#map {
  height: 100%;
  margin: 0;
}
body {
  background: #dfe9df;
  color: #1f2933;
}
.app-title {
  position: absolute;
  z-index: 500;
  top: 1rem;
  left: 3.75rem;
  max-width: min(22rem, calc(100% - 4.75rem));
  background: rgba(255, 255, 255, 0.94);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.3);
}
.app-title h1 {
  margin: 0;
  font-size: 1.1rem;
}
.app-title p {
  margin: 0.25rem 0 0;
  font-size: 0.8rem;
  color: #52606d;
}`;

/**
 * Render the static POC app. `script` is the app bootstrap and must call the
 * selected block functions; `config` and `data` become `MAP` and `DATA`.
 */
export function renderAppHtml(input: GisComposeInput): string {
  const title = input.title.trim() || "Map app";
  const description = input.description?.trim();
  const css = [BASE_CSS, blockCss(input.blocks), input.css?.trim()]
    .filter((part) => part && part.length)
    .join("\n\n");
  const data =
    input.data === undefined
      ? ""
      : `\n\n      /* --- app data --- */\n      var DATA = ${jsonForScript(input.data)};`;
  const header = description
    ? `\n      <p>${escapeHtml(description)}</p>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <link rel="stylesheet" href="${LEAFLET_CDN}/leaflet.css" />
    <style>
${css
  .split("\n")
  .map((line) => (line ? `      ${line}` : ""))
  .join("\n")}
    </style>
  </head>
  <body>
    <div id="map" role="application" aria-label="${escapeHtml(title)}"></div>
    <header class="app-title">
      <h1>${escapeHtml(title)}</h1>${header}
    </header>

    <script src="${LEAFLET_CDN}/leaflet.js"></script>
    <script>
      /* --- app config: tile URL, attribution and initial view --- */
      var MAP = ${jsonForScript(input.config)};

${blockScript(input.blocks)}${data}

      /* --- app bootstrap --- */
${input.script.trim()}
    </script>
  </body>
</html>
`;
}
