// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/polyfills.ts — Node globals required by isomorphic-git in the browser.
//
// isomorphic-git (and its deps: sha.js, readable-stream, pako) expect Node's
// Buffer and process. Vite does not polyfill them, so install them on globalThis
// before any isomorphic-git code runs. Imported first in main.tsx.

import { Buffer } from "buffer";
import process from "process";

const g = globalThis as unknown as {
  Buffer?: unknown;
  process?: unknown;
  global?: unknown;
};

if (!g.Buffer) g.Buffer = Buffer;
if (!g.process) g.process = process;
if (!g.global) g.global = globalThis;
