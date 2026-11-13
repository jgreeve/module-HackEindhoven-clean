// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/forge/auth.ts — forge credentials.
//
// The bot credentials live in the browser (AgentConfig, see
// src/agent/config.ts). This module is the single place that turns them into
// the Forgejo API headers and the isomorphic-git `onAuth` callback.

import { loadConfig } from "../agent/config";

export interface ForgeAuth {
  url: string;
  user: string;
  token: string;
}

/** Credentials from config, or null if the forge is not configured. */
export function forgeAuth(): ForgeAuth | null {
  const cfg = loadConfig();
  const url = cfg.forgeUrl.trim().replace(/\/+$/, "");
  const token = cfg.forgeToken.trim();
  if (!url || !token) return null;
  return { url, user: cfg.forgeUser.trim() || "bot", token };
}

/** The forge base URL, regardless of whether a token is configured. */
export function forgeUrl(): string {
  return loadConfig().forgeUrl.trim().replace(/\/+$/, "");
}

export function requireForgeAuth(): ForgeAuth {
  const auth = forgeAuth();
  if (!auth) {
    throw new Error(
      "Forge not configured. Open Settings and add the forge URL and access token.",
    );
  }
  return auth;
}

/** Authorization headers for the Forgejo REST API. */
export function apiHeaders(auth: ForgeAuth): Record<string, string> {
  return {
    Authorization: `token ${auth.token}`,
    Accept: "application/json",
  };
}

/** isomorphic-git onAuth callback. */
export function gitAuth(auth: ForgeAuth): () => { username: string; password: string } {
  return () => ({ username: auth.user, password: auth.token });
}

function basic(user: string, pass: string): string {
  const bytes = new TextEncoder().encode(`${user}:${pass}`);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return `Basic ${btoa(bin)}`;
}

/**
 * Preemptive Authorization header for isomorphic-git. Sending it on the first
 * request avoids the forge's 401 Basic challenge, which makes Firefox open its
 * password/auth modal.
 */
export function gitHeaders(auth: ForgeAuth): Record<string, string> {
  return { Authorization: basic(auth.user, auth.token) };
}
