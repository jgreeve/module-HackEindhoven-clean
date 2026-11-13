// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/app/modules.ts — module enablement and per-module settings.
//
// Modules are enabled by default according to their descriptor. The user's
// overrides are stored separately from AgentConfig, and each module's settings
// live under their own key so one module cannot clobber another.

import { record } from "../agent/trace";
import { MODULES } from "../modules/registry";
import type { ModuleId } from "../modules/types";

const OVERRIDES_KEY = "studio.modules.overrides";
const SETTINGS_PREFIX = "studio.module.";

type Overrides = Record<string, boolean>;

function storage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

function loadOverrides(): Overrides {
  const store = storage();
  if (!store) return {};
  try {
    const raw = store.getItem(OVERRIDES_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Overrides = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "boolean") out[id] = value;
    }
    return out;
  } catch {
    return {};
  }
}

let overrides: Overrides = loadOverrides();
const listeners = new Set<(enabled: Set<string>) => void>();

function persistOverrides(): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
  } catch {
    // ignore quota errors
  }
}

/** Effective enabled module ids: descriptor defaults plus user overrides. */
export function getEnabledModuleIds(): Set<string> {
  const enabled = new Set<string>();
  for (const module of MODULES) {
    if (module.defaultEnabled) enabled.add(module.id);
  }
  for (const [id, on] of Object.entries(overrides)) {
    if (on) enabled.add(id);
    else enabled.delete(id);
  }
  return enabled;
}

export function isModuleEnabled(id: ModuleId): boolean {
  return getEnabledModuleIds().has(id);
}

/** Enable or disable one module; persists the override and notifies listeners. */
export function setModuleEnabled(id: ModuleId, enabled: boolean): void {
  overrides = { ...overrides, [id]: enabled };
  persistOverrides();
  record("module toggle", `${id}: ${enabled ? "on" : "off"}`);
  const effective = getEnabledModuleIds();
  for (const fn of listeners) fn(effective);
}

export function subscribeModules(fn: (enabled: Set<string>) => void): () => void {
  listeners.add(fn);
  fn(getEnabledModuleIds());
  return () => void listeners.delete(fn);
}

/** Module settings, or an empty object when unset/corrupted. */
export function getModuleSettings(id: ModuleId): Record<string, unknown> {
  const store = storage();
  if (!store) return {};
  try {
    const raw = store.getItem(`${SETTINGS_PREFIX}${id}`);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function setModuleSettings(id: ModuleId, settings: Record<string, unknown>): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(`${SETTINGS_PREFIX}${id}`, JSON.stringify(settings));
  } catch {
    // ignore quota errors
  }
}

/** Clear all overrides and module settings (tests / reset). */
export function resetModules(): void {
  overrides = {};
  const store = storage();
  if (store) {
    try {
      store.removeItem(OVERRIDES_KEY);
      for (const module of MODULES) store.removeItem(`${SETTINGS_PREFIX}${module.id}`);
    } catch {
      // ignore storage errors
    }
  }
  const effective = getEnabledModuleIds();
  for (const fn of listeners) fn(effective);
}
