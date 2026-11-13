// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/modules/bimr/session.ts — the live BIMR session.
//
// Owns the @bimr/web engine singletons (headless runtime + project) and a
// tiny pub/sub so React components and the agent tools share one source of
// truth: the python buffer (the editable artifact) and the latest run
// snapshot. The viewer is not wired through the project sink — ViewerPane
// subscribes to snapshots instead (avoids mount/timing coupling).

import { createBimrRuntime, BimrProject } from "@bimr/web";
import type { ProjectSnapshot } from "@bimr/web";
import * as workspace from "../../forge/workspace";
import { ensureSandbox } from "../../forge/sandbox";

export const runtime = createBimrRuntime();
export const project = new BimrProject(runtime);

export const DEFAULT_PYTHON = workspace.DEFAULT_CONTENT;

// A fresh project starts from the default python file.
project.setPython(DEFAULT_PYTHON);

// Keep the BIMR project in sync with the active python file, whether the
// change comes from the editor or from an agent file tool.
workspace.subscribeFile((path, content) => {
  if (path === workspace.getActivePath() && path.endsWith(".py")) {
    project.setPython(content);
  }
});

export type PythonListener = (src: string) => void;
export type SnapshotListener = (snap: ProjectSnapshot | null) => void;
export type InputListener = () => void;

const snapListeners = new Set<SnapshotListener>();
const inputListeners = new Set<InputListener>();

let lastSnap: ProjectSnapshot | null = null;

/** Warm the wasm compile() + MicroPython runtime and the workspace (idempotent). */
export function boot(): Promise<void> {
  return Promise.all([
    runtime.wasmReady,
    runtime.mpReady,
    workspace.init(),
  ])
    .then(() => ensureSandbox())
    .catch((e) => {
      console.error("[studio] sandbox init:", e);
    });
}

export function subscribePython(fn: PythonListener): () => void {
  return workspace.subscribeFile((_path, content) => fn(content));
}

export function subscribeSnapshot(fn: SnapshotListener): () => void {
  snapListeners.add(fn);
  if (lastSnap) fn(lastSnap);
  return () => void snapListeners.delete(fn);
}

/** Subscribe to genuine user edits of the python editor (realtime runs). */
export function subscribeInput(fn: InputListener): () => void {
  inputListeners.add(fn);
  return () => void inputListeners.delete(fn);
}

/** Fire the user-input listeners after the editor applied a user keystroke. */
export function markUserInput(): void {
  for (const fn of inputListeners) fn();
}

export function getPython(): string {
  return workspace.getActiveContent();
}

/** Set the active file's content and notify subscribers (editor sync). */
export function setPython(src: string): void {
  if (workspace.getActiveContent() === src) return;
  workspace.setActiveContent(src);
}

export function getSnapshot(): ProjectSnapshot | null {
  return lastSnap;
}

function emitSnapshot(snap: ProjectSnapshot | null): void {
  lastSnap = snap;
  for (const fn of snapListeners) fn(snap);
}

/** Run the current python buffer through MicroPython → compile → IFCX. */
export async function runModel(): Promise<ProjectSnapshot> {
  const snap = await project.run();
  emitSnapshot(snap);
  return snap;
}

/** Set python then run it (used by samples and manual edits). */
export async function runSource(src: string): Promise<ProjectSnapshot> {
  setPython(src);
  return runModel();
}

/** Clear the session: fresh python file, drop the rendered model. */
export function reset(): void {
  workspace.reset();
  project.setPython(DEFAULT_PYTHON);
  emitSnapshot(null);
}

export interface SampleMeta {
  id: string;
  name: string;
  description?: string;
}

/** Load the samples index (served from /samples/index.json). */
export async function fetchSamples(): Promise<SampleMeta[]> {
  const res = await fetch("/samples/index.json");
  return (await res.json()) as SampleMeta[];
}

/** Fetch a sample's python source. */
export async function fetchSample(id: string): Promise<string> {
  const res = await fetch(`/samples/${id}.py`);
  return res.text();
}

/** Number of entities in a compiled IFCX document (for the status line). */
export function countEntities(ifcx: string | null): number {
  if (!ifcx) return 0;
  try {
    const data = JSON.parse(ifcx).data;
    return Array.isArray(data) ? data.length : 0;
  } catch {
    return 0;
  }
}
