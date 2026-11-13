// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// Minimal typing for the `process` browser polyfill (no bundled types).
declare module "process" {
  const process: {
    env: Record<string, string | undefined>;
    nextTick: (cb: (...args: unknown[]) => void, ...args: unknown[]) => void;
    [key: string]: unknown;
  };
  export default process;
}
