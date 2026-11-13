// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/agent/pricing.ts — approximate model prices for the cost counter.
//
// USD per 1,000,000 tokens [input, output]. These are estimates for the
// OpenRouter model ids Studio uses; extend the table as needed. An unknown
// model costs 0 (the counter still shows token usage).

const PRICES: Record<string, [number, number]> = {
  "deepseek/deepseek-v4-flash": [0.1, 0.3],
  "deepseek/deepseek-chat": [0.14, 0.28],
  "openai/gpt-4o": [2.5, 10.0],
  "openai/gpt-4o-mini": [0.15, 0.6],
  "anthropic/claude-3.5-sonnet": [3.0, 15.0],
  "google/gemini-2.0-flash-001": [0.1, 0.4],
};

const DEFAULT_PRICE: [number, number] = [0, 0];

export function priceFor(model: string): [number, number] {
  const id = model.trim();
  if (PRICES[id]) return PRICES[id];
  for (const key of Object.keys(PRICES)) {
    if (id.startsWith(key) || id.includes(key)) return PRICES[key];
  }
  return DEFAULT_PRICE;
}

export function costUsd(model: string, inputTokens: number, outputTokens: number): number {
  const [inputPrice, outputPrice] = priceFor(model);
  return (inputTokens / 1_000_000) * inputPrice + (outputTokens / 1_000_000) * outputPrice;
}
