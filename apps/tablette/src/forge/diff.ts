// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/forge/diff.ts — a tiny line diff for commit previews and prompts.
//
// The workspace files are small sketches, so trimming the common prefix/suffix
// and marking the middle as removed/added is enough for a readable preview and
// for feeding the commit-message model. This is not a full diff algorithm.

export interface LineDiff {
  /** Unified-ish text: "@@ line N @@", then "- old" / "+ new" lines. */
  text: string;
  added: number;
  removed: number;
}

export function simpleDiff(before: string, after: string): LineDiff {
  const a = before.length ? before.split("\n") : [];
  const b = after.length ? after.split("\n") : [];

  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;

  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }

  const removed = a.slice(start, endA);
  const added = b.slice(start, endB);
  if (removed.length === 0 && added.length === 0) {
    return { text: "", added: 0, removed: 0 };
  }

  const lines = [`@@ line ${start + 1} @@`];
  for (const l of removed) lines.push(`- ${l}`);
  for (const l of added) lines.push(`+ ${l}`);
  return { text: lines.join("\n"), added: added.length, removed: removed.length };
}
