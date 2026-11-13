// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/agent/config.ts — browser-persisted agent configuration.
//
// Studio talks directly to an OpenAI-compatible LLM endpoint from the
// browser (OpenRouter by default). The base URL, API key and model live in
// localStorage; the agent and editor state are not part of the config.

const KEY = "studio.agentConfig";

export interface AgentConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  forgeUrl: string;
  forgeUser: string;
  forgeToken: string;
  /** CORS proxy base (ending in "/"); empty means auto/direct. */
  proxyUrl: string;
}

export const DEFAULT_CONFIG: AgentConfig = {
  baseUrl: "https://openrouter.ai/api/v1",
  apiKey: "",
  model: "deepseek/deepseek-v4-flash",
  temperature: 0.4,
  forgeUrl: "https://artefacts.bimr.net",
  forgeUser: "bot",
  forgeToken: "",
  proxyUrl: "",
};

/**
 * Known OpenAI-compatible providers. The API key format depends on the
 * provider: OpenRouter keys start with `sk-or-v1-`; DeepSeek keys start with
 * `sk-`. Using the wrong base URL for a key returns HTTP 401.
 */
export interface ProviderPreset {
  id: "openrouter" | "deepseek";
  label: string;
  baseUrl: string;
  model: string;
  keyHint: string;
  note: string;
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "deepseek/deepseek-v4-flash",
    keyHint: "sk-or-v1-...",
    note: "Keys from openrouter.ai/keys (they start with sk-or-v1-).",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-flash",
    keyHint: "sk-...",
    note: "Keys from platform.deepseek.com (they start with sk-).",
  },
];

/** The preset matching a base URL, if any. */
export function providerFor(cfg: AgentConfig): ProviderPreset | null {
  const base = cfg.baseUrl.trim().replace(/\/+$/, "").toLowerCase();
  return (
    PROVIDER_PRESETS.find(
      (preset) => preset.baseUrl.replace(/\/+$/, "").toLowerCase() === base,
    ) ?? null
  );
}

export function loadConfig(): AgentConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    // ignore corrupted config
  }
  return { ...DEFAULT_CONFIG };
}

export function saveConfig(cfg: AgentConfig): void {
  localStorage.setItem(KEY, JSON.stringify(cfg));
}

export function isConfigured(cfg: AgentConfig): boolean {
  return cfg.apiKey.trim().length > 0;
}

export function isForgeConfigured(cfg: AgentConfig): boolean {
  return cfg.forgeUrl.trim().length > 0 && cfg.forgeToken.trim().length > 0;
}
