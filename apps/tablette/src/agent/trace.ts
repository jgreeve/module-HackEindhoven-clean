// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/agent/trace.ts — a lightweight timeline of the agent process.
//
// Records timestamped events (engine boot, chat request, model steps, tool
// executions, compile, turn end) so the Session dump dialog can show a
// line-by-line timeline with elapsed times and durations — useful to spot
// where the time goes (model latency vs. tool/compile time).

export interface TraceEvent {
  /** Milliseconds since the first recorded event. */
  offsetMs: number;
  label: string;
  detail?: string;
  /** Set for completed spans (duration in ms). */
  durationMs?: number;
}

interface RawEvent {
  at: number;
  label: string;
  detail?: string;
  durationMs?: number;
}

const MAX_EVENTS = 1000;
let events: RawEvent[] = [];
let turn = 0;

function now(): number {
  return performance.now();
}

function push(e: RawEvent): void {
  events.push(e);
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
}

/** Record an instant event. */
export function record(label: string, detail?: string): void {
  push({ at: now(), label, detail });
}

/** Record a completed span that started at `start`. */
export function span(label: string, start: number, detail?: string): void {
  push({ at: start, label, detail, durationMs: now() - start });
}

export function nowMs(): number {
  return now();
}

/** Mark the start of a new agent turn; returns the turn number. */
export function beginTurn(): number {
  turn += 1;
  record(`turn ${turn}`, "user message");
  return turn;
}

/** Snapshot the trace as offsets from the first event, in time order. */
export function getTrace(): TraceEvent[] {
  if (events.length === 0) return [];
  const origin = Math.min(...events.map((e) => e.at));
  return events
    .slice()
    .sort((a, b) => a.at - b.at)
    .map((e) => ({
      offsetMs: Math.round(e.at - origin),
      label: e.label,
      ...(e.detail !== undefined ? { detail: e.detail } : {}),
      ...(e.durationMs !== undefined ? { durationMs: Math.round(e.durationMs) } : {}),
    }));
}

export function resetTrace(): void {
  events = [];
  turn = 0;
}
