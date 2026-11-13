// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/map/preview.ts — the live GIS app preview.
//
// The agent composes an app in memory; the build pane renders it in a
// sandboxed srcdoc iframe. This store is intentionally tiny: one preview
// document at a time, no persistence, no network access of its own.

import { record } from "../agent/trace";

export interface MapPreview {
  html: string;
  title: string;
  updated: number;
}

let current: MapPreview | null = null;
const listeners = new Set<(preview: MapPreview | null) => void>();

/** Publish a new preview document (replaces the previous one). */
export function setPreview(html: string, title: string): MapPreview {
  current = { html, title, updated: Date.now() };
  record("gis preview", `${title} · ${html.length} chars`);
  for (const fn of listeners) fn(current);
  return current;
}

/** Remove the preview (e.g. a new session). */
export function clearPreview(): void {
  current = null;
  for (const fn of listeners) fn(null);
}

export function getPreview(): MapPreview | null {
  return current;
}

export function subscribePreview(fn: (preview: MapPreview | null) => void): () => void {
  listeners.add(fn);
  fn(current);
  return () => void listeners.delete(fn);
}
