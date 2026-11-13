// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/agent/choices.ts — detect a "pick one" list in assistant text.
//
// The model is inconsistent about calling propose_actions for conversational
// options, so the chat also offers clickable buttons for a trailing list that
// is followed by a question. Handles bulleted/numbered lists and indented
// lines that contain markdown links. Deterministic, independent of the tool.

const LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])\s+(.+)$/;
const LINK_ITEM = /^\s{2,}\[([^\]]+)\]\(([^)\s]+)\)/;

export interface Choice {
  /** Short button label (the item before an em-dash clause). */
  label: string;
  /** Full item text, sent as the user message when clicked. */
  text: string;
}

function stripInline(s: string): string {
  return s
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim();
}

function isChoiceLine(line: string): boolean {
  return LIST_ITEM.test(line) || LINK_ITEM.test(line);
}

/** Returns the choices of a trailing list followed by a question, or null. */
export function extractChoices(text: string): Choice[] | null {
  const lines = text.split("\n");

  let end = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (isChoiceLine(lines[i])) {
      end = i;
      break;
    }
  }
  if (end < 0) return null;

  let start = end;
  while (start > 0 && isChoiceLine(lines[start - 1])) start--;

  const items = lines
    .slice(start, end + 1)
    .map((l) => {
      const m = LIST_ITEM.exec(l);
      return stripInline((m ? m[1] : l).trim());
    })
    .filter(Boolean);
  if (items.length < 2) return null;

  const before = lines.slice(0, start).join(" ").trim();
  const tail = lines.slice(end + 1).join(" ").trim();
  const isQuestion =
    tail.endsWith("?") ||
    (tail === "" && (before.endsWith("?") || text.trim().endsWith("?")));
  if (!isQuestion) return null;

  return items.map((item) => {
    const label = item.split(/\s+—\s+/)[0].split(/\s+-\s+/)[0].trim();
    return { label: label || item, text: item };
  });
}
