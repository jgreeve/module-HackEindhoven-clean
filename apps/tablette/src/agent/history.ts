// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/agent/history.ts — persisted prompt history for the chat composer.
//
// Studio has no server, so the composer's ArrowUp / ArrowDown history is kept
// in localStorage (not a cookie: cookies are small and sent to the server).
// Capped, most-recent-last, consecutive duplicates collapsed.

const KEY = "studio.promptHistory";
const MAX = 100;

export function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string" && x.length > 0)
      : [];
  } catch {
    return [];
  }
}

/** Append a sent prompt and return the updated history. */
export function appendHistory(text: string): string[] {
  const t = text.trim();
  const history = loadHistory();
  if (!t) return history;
  if (history[history.length - 1] !== t) history.push(t);
  const capped = history.slice(-MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(capped));
  } catch {
    // ignore quota / private-mode errors
  }
  return capped;
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
