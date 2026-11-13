// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/app/handoff.ts — the cross-cutting mode hand-off primitive.
//
// A hand-off is a small, serializable intent that switches mode and gives the
// target pane one thing to do (open a file, insert a component, load a lesson,
// build a repo, preview an artefact). One pending hand-off at a time; the
// target pane consumes it with takeHandoff().

import { setMode } from "./mode";
import type { Mode } from "./mode";

export type HandoffIntent =
  | { kind: "open-file"; path: string; run?: boolean }
  | { kind: "insert-component"; repo: string; name: string; source: string }
  | { kind: "load-lesson"; track: string; lesson: string }
  | { kind: "build"; repo: string; ref?: string }
  | { kind: "preview-artefact"; repo: string; url: string }
  | { kind: "ask"; text: string };

export interface Handoff {
  id: string;
  from: Mode;
  to: Mode;
  intent: HandoffIntent;
  createdAt: number;
}

let pending: Handoff | null = null;
const listeners = new Set<(handoff: Handoff | null) => void>();

function newId(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    // fall through
  }
  return `h-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Queue a hand-off and switch to the target mode. */
export function handoff(input: Omit<Handoff, "id" | "createdAt">): void {
  pending = { ...input, id: newId(), createdAt: Date.now() };
  setMode(input.to, "handoff");
  for (const fn of listeners) fn(pending);
}

/** Consume the pending hand-off (one-shot). */
export function takeHandoff(): Handoff | null {
  const current = pending;
  pending = null;
  return current;
}

export function subscribeHandoff(fn: (handoff: Handoff | null) => void): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}
