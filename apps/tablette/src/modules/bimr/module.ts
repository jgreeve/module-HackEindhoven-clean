// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/modules/bimr/module.ts — the BIMR Studio module descriptor.
//
// The legacy BIMR Python/IFCX engine, expressed as a module: its help/sample
// tools and prompt are composed only in the modes that use Python models. The
// run tool is Learn-only (see ./tools.ts). The workspace/file tools stay core.

import type { StudioModule } from "../types";
import { createBimrTools } from "./tools.ts";
import { BIMR_PROMPT } from "./prompts.ts";

export const bimrModule: StudioModule = {
  id: "bimr",
  label: "BIMR",
  description:
    "Legacy BIMR Python/IFCX runtime: compile models and render them in the viewer.",
  version: "0.1.0",
  docs: "/modules/bimr",
  modes: ["explore", "learn", "build"],
  defaultEnabled: true,
  dataSources: [],
  attribution: [],
  prompt: BIMR_PROMPT,
  createTools: (ctx) => createBimrTools(ctx),
};
