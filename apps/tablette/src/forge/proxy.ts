// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/forge/proxy.ts — resolve how the browser reaches the forge.
//
// A browser can only read from a forge that sends CORS headers. Forgejo sends
// them for the REST API (when enabled) but never for git, so a cross-origin
// forge is unreachable without a proxy. This module picks the access route:
// an explicit `proxyUrl`, the dev server, or a build-time same-origin default,
// falling back to a direct call. See proxy/proxy.mjs and
// tasks/projects/studio_proxy.md.

import { loadConfig } from "../agent/config";
import { forgeAuth, forgeUrl } from "./auth";

/** Raised when the forge cannot be reached because of CORS / network access. */
export class ForgeAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForgeAccessError";
  }
}

function normalizeBase(base: string): string {
  const trimmed = base.trim();
  if (!trimmed) return "";
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

/**
 * The proxy base URL ending in "/", or "" to call the forge directly.
 * Precedence: explicit config, dev server, build-time default.
 */
export function resolveProxyBase(): string {
  const configured = loadConfig().proxyUrl.trim();
  if (configured) return normalizeBase(configured);
  if (import.meta.env.DEV) return "/forge-proxy/";
  const baked = import.meta.env.VITE_FORGE_PROXY;
  if (typeof baked === "string" && baked.trim()) return normalizeBase(baked);
  return "";
}

/** Base URL for Forgejo REST calls (ends at `/api/v1`). */
export function apiBase(): string {
  const proxy = resolveProxyBase();
  return proxy ? `${proxy}${forgeUrl()}/api/v1` : `${forgeUrl()}/api/v1`;
}

/**
 * Route an absolute external URL through the same-origin proxy when one is
 * resolved, else return it unchanged (direct call). Used for non-forge reads
 * that need CORS, e.g. the BIMR help page on bimr.net.
 */
export function proxiedUrl(target: string): string {
  const proxy = resolveProxyBase();
  return proxy ? `${proxy}${target}` : target;
}

/** isomorphic-git `corsProxy`, or undefined for a direct call. */
export function gitCorsProxy(): string | undefined {
  return resolveProxyBase() || undefined;
}

/** Turn an opaque fetch failure into a forge-access error with a hint. */
export function describeAccessError(err: unknown): ForgeAccessError {
  const proxy = resolveProxyBase();
  const hint = proxy
    ? `Check the proxy at ${proxy} (is it running, and is this host allowed?).`
    : "This forge does not allow browser access. Set a proxy URL in Settings, or enable CORS on the forge (API only).";
  const detail = err instanceof Error ? err.message : String(err);
  return new ForgeAccessError(`Cannot reach the forge: ${detail}. ${hint}`);
}

export interface ProbeResult {
  tier: string;
  base: string;
  ok: boolean;
  detail: string;
}

/**
 * Probe the route the app actually uses (the resolved proxy, or direct). When a
 * token is configured the probe hits an authenticated endpoint (`/api/v1/user`)
 * and reports the login, so the test validates the token — not just reachability.
 */
export async function probeForge(): Promise<ProbeResult[]> {
  const forge = forgeUrl();
  const auth = forgeAuth();
  const base = resolveProxyBase();
  const tier = base
    ? loadConfig().proxyUrl.trim()
      ? "configured proxy"
      : "same-origin proxy"
    : "direct";
  const path = auth ? "/api/v1/user" : "/api/v1/version";
  const url = `${base}${forge}${path}`;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (auth) headers.Authorization = `token ${auth.token}`;

  try {
    const res = await fetch(url, { headers });
    let detail = `HTTP ${res.status}`;
    if (res.ok && auth) {
      const data = (await res.json().catch(() => null)) as { login?: string } | null;
      if (data?.login) detail += ` — signed in as ${data.login}`;
    }
    return [{ tier, base: base || "(direct)", ok: res.ok, detail }];
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const hint = base
      ? `Check the proxy at ${base} (running, and this host allowed).`
      : "Set a proxy URL in Settings, or enable CORS on the forge (API only).";
    return [{ tier, base: base || "(direct)", ok: false, detail: `${raw} — ${hint}` }];
  }
}
