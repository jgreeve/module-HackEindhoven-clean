// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/modules/credits.ts — attribution lines for a mode's enabled modules.
//
// The module descriptors own their source-specific credits; the core owns the
// OSM line. Generated apps can render this list in their footer.

import type { Mode } from "../app/mode";
import { attributionsForModules } from "./registry.ts";

export const OSM_CREDIT = "© OpenStreetMap contributors (ODbL)";

/** OSM credit followed by every enabled module's credit line. */
export function creditLines(mode: Mode, enabled: Set<string>): string[] {
  return [OSM_CREDIT, ...attributionsForModules(enabled, mode)];
}
