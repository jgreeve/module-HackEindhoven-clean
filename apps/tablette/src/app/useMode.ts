// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

import { useEffect, useState } from "react";
import { getMode, subscribeMode } from "./mode";
import type { Mode } from "./mode";

/** The active Studio mode, re-rendering on switches. */
export function useMode(): Mode {
  const [mode, setMode] = useState<Mode>(getMode());
  useEffect(() => subscribeMode(setMode), []);
  return mode;
}
