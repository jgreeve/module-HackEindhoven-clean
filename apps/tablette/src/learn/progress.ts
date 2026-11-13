// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/learn/progress.ts — per-browser lesson progress.

const KEY = "studio.learn";

export interface LearnProgress {
  completed: string[];
  current?: string;
}

const EMPTY: LearnProgress = { completed: [] };

export function loadProgress(): LearnProgress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<LearnProgress>;
      return { completed: Array.isArray(p.completed) ? p.completed : [], current: p.current };
    }
  } catch {
    // ignore corrupted storage
  }
  return { ...EMPTY };
}

function save(p: LearnProgress): LearnProgress {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // ignore quota errors
  }
  return p;
}

export function markComplete(id: string): LearnProgress {
  const p = loadProgress();
  if (!p.completed.includes(id)) p.completed.push(id);
  return save(p);
}

export function setCurrent(id: string): LearnProgress {
  const p = loadProgress();
  p.current = id;
  return save(p);
}
