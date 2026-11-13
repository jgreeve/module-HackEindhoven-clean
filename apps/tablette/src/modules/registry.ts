// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/modules/registry.ts — the Studio module registry.
//
// The registry composes installed @tablette/module-* packages (generated from
// package.json by scripts/gen-registry.mjs) with core-owned modules. It stays
// static: every package is installed, locked, type-checked and built before it
// ships. There is no remote code and no runtime import() of modules.
//
// Adding or removing a module is a package.json edit; see
// tasks/projects/studio_modules_extraction.md. The legacy BIMR engine remains
// core-owned until it is reclassified as an engine package (section 5.3).

import type { Tool, ToolSet } from "ai";
import type { Mode } from "../app/mode";
import { validateModules as validateModuleDescriptors } from "@tablette/module-sdk";
import type {
  ModuleContext,
  ModuleRuntime,
  StudioModule,
} from "@tablette/module-sdk";
import { bimrModule } from "./bimr/module.ts";
import { GENERATED_MODULES } from "./registry.generated.ts";

/**
 * Core-owned modules that are not (yet) npm packages. BIMR owns the engine
 * session, the synced viewer bundle and the MicroPython assets, and is still
 * imported by legacy panes outside the registry; packaging it is a separate
 * decision (studio_modules_extraction.md section 5.3).
 */
export const CORE_MODULES: StudioModule[] = [bimrModule];

/** Every Studio module: installed packages first, then core-owned modules. */
export const MODULES: StudioModule[] = [...GENERATED_MODULES, ...CORE_MODULES];

function modulesFor(enabled: Set<string>, mode?: Mode): StudioModule[] {
  return MODULES.filter(
    (module) => enabled.has(module.id) && (mode === undefined || module.modes.includes(mode)),
  );
}

/** Enabled modules that declare the given mode. */
export function modulesForMode(mode: Mode, enabled: Set<string>): StudioModule[] {
  return modulesFor(enabled, mode);
}

/** Build the per-module runtime context. Exported for diagnostics and tests. */
export function moduleContextFor(
  module: StudioModule,
  runtime: ModuleRuntime,
  mode?: Mode,
): ModuleContext {
  return {
    mode,
    settings: runtime.settingsFor(module.id),
    enabled: runtime.enabled,
    credits: attributionsForModules(runtime.enabled, mode),
    trace: runtime.trace,
    now: runtime.now,
    markRun: runtime.markRun,
    fetch: runtime.fetch,
    workspace: runtime.workspace,
    runApp: runtime.runApp,
    setMode: runtime.setMode,
  };
}

function stubContext(enabled = new Set<string>()): ModuleContext {
  return {
    settings: {},
    enabled,
    credits: [],
    trace: () => {},
    now: () => 0,
    fetch: (() => Promise.reject(new Error("no fetch in module inspection"))) as typeof fetch,
  };
}

/** Tool names a module exposes, without executing any tool. */
export function toolNamesForModule(module: StudioModule): string[] {
  try {
    return Object.keys(module.createTools(stubContext(new Set([module.id])))).sort();
  } catch {
    return [];
  }
}

/**
 * Compose module tools. With a mode, only modules scoped to that mode are
 * included; without one, every enabled module is included (useful for parsing
 * chat history).
 */
export function toolsForModules(runtime: ModuleRuntime, mode?: Mode): ToolSet {
  const out: Record<string, Tool> = {};
  for (const module of modulesFor(runtime.enabled, mode)) {
    for (const [name, tool] of Object.entries(module.createTools(moduleContextFor(module, runtime, mode)))) {
      if (!name.startsWith(`${module.id}_`)) {
        throw new Error(
          `module "${module.id}" exposes "${name}"; tool names must start with "${module.id}_"`,
        );
      }
      if (out[name]) throw new Error(`duplicate module tool "${name}"`);
      out[name] = tool;
    }
  }
  return out as ToolSet;
}

/** Every enabled module's prompt section, in registry order. */
export function promptsForModules(enabled: Set<string>, mode?: Mode): string[] {
  return modulesFor(enabled, mode)
    .map((module) => module.prompt.trim())
    .filter(Boolean);
}

/** Every enabled module's visible credit line, in registry order. */
export function attributionsForModules(enabled: Set<string>, mode?: Mode): string[] {
  return modulesFor(enabled, mode).flatMap((module) => module.attribution);
}

/** Tool names for a mode, used by tests and diagnostics. */
export function toolNamesForModules(runtime: ModuleRuntime, mode?: Mode): string[] {
  return Object.keys(toolsForModules(runtime, mode)).sort();
}

/** Descriptor validation; returns human-readable errors (empty = valid). */
export function validateModules(modules: StudioModule[] = MODULES): string[] {
  return validateModuleDescriptors(modules);
}
