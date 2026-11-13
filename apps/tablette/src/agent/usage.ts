// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/agent/usage.ts — cumulative token usage and estimated cost.
//
// The top-bar counter reads this. Totals persist in localStorage and reset on
// "New". Cost uses the approximate price table in pricing.ts.

import { costUsd } from "./pricing";

export interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  turns: number;
}

const KEY = "studio.usage";
const EMPTY: UsageTotals = {
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  costUsd: 0,
  turns: 0,
};

const listeners = new Set<(totals: UsageTotals) => void>();

function load(): UsageTotals {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...EMPTY, ...(JSON.parse(raw) as Partial<UsageTotals>) };
  } catch {
    // ignore corrupted storage
  }
  return { ...EMPTY };
}

let totals: UsageTotals = load();

export function getUsage(): UsageTotals {
  return totals;
}

export function subscribeUsage(fn: (totals: UsageTotals) => void): () => void {
  listeners.add(fn);
  fn(totals);
  return () => void listeners.delete(fn);
}

/** Add one model response's usage (across all its steps). */
export function addUsage(
  model: string,
  inputTokens: number,
  outputTokens: number,
  totalTokens?: number,
): void {
  const input = inputTokens || 0;
  const output = outputTokens || 0;
  totals = {
    inputTokens: totals.inputTokens + input,
    outputTokens: totals.outputTokens + output,
    totalTokens: totals.totalTokens + (totalTokens ?? input + output),
    costUsd: totals.costUsd + costUsd(model, input, output),
    turns: totals.turns + 1,
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(totals));
  } catch {
    // ignore quota errors
  }
  for (const fn of listeners) fn(totals);
}

export function resetUsage(): void {
  totals = { ...EMPTY };
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  for (const fn of listeners) fn(totals);
}
