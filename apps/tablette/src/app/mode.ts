// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/app/mode.ts — the top-level Studio mode.
//
// A mode selects the agent contract (prompt, tools) and the right-hand surface.
// This module owns the state and persistence; UI reads it via useMode(), and
// mode switches are recorded in the trace.

import { record } from "../agent/trace";
import { MODES as SDK_MODES } from "@tablette/module-sdk";
import type { Mode } from "@tablette/module-sdk";

export type { Mode } from "@tablette/module-sdk";

export type ModeSource =
  | "user"
  | "agent-auto"
  | "agent-confirmed"
  | "handoff"
  | "restore";

export const MODES: Mode[] = [...SDK_MODES];

export const MODE_LABELS: Record<Mode, string> = {
  sketch: "Sketch",
  explore: "Explore",
  learn: "Learn",
  build: "Build",
};

export const MODE_DESCRIPTIONS: Record<Mode, string> = {
  sketch: "Build OSM map apps",
  explore: "Discover the forge",
  learn: "Tutorials",
  build: "Build web artefacts",
};

const KEY = "studio.mode";
const DEFAULT_MODE: Mode = "sketch";

function isMode(value: unknown): value is Mode {
  return typeof value === "string" && (MODES as string[]).includes(value);
}

function load(): Mode {
  try {
    const raw = localStorage.getItem(KEY);
    if (isMode(raw)) return raw;
  } catch {
    // ignore corrupted storage
  }
  return DEFAULT_MODE;
}

let mode: Mode = load();
const listeners = new Set<(mode: Mode) => void>();

export function getMode(): Mode {
  return mode;
}

/** Switch mode. No-op when the target equals the current mode. */
export function setMode(next: Mode, source: ModeSource = "user"): void {
  if (next === mode) return;
  const from = mode;
  mode = next;
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    // ignore quota errors
  }
  record("mode switch", `${from} -> ${mode} (${source})`);
  for (const fn of listeners) fn(mode);
}

export function subscribeMode(fn: (mode: Mode) => void): () => void {
  listeners.add(fn);
  fn(mode);
  return () => void listeners.delete(fn);
}
