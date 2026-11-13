// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/agent/turn.ts — per-turn run state shared by the core app tools and the
// BIMR module. The chat layer resets it at the start of a turn and reads it
// after the stream to decide whether to auto-open the Viewer tab.

let turnRunOk = false;

export function resetTurnRunOk(): void {
  turnRunOk = false;
}

/** Record whether the last render/run in this turn succeeded. */
export function markTurnRun(ok: boolean): void {
  turnRunOk = ok;
}

export function getTurnRunOk(): boolean {
  return turnRunOk;
}
