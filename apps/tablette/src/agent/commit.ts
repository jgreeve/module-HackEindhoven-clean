// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/agent/commit.ts — generate a commit message for a file change.
//
// A focused, single-shot model call (not the full agent loop): given the path
// and a diff, return one conventional-commit subject line. Falls back to a
// deterministic message when the model is unconfigured or fails, so committing
// never blocks on the model.

import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { isConfigured, loadConfig } from "./config";
import { addUsage } from "./usage";
import { nowMs, record, span } from "./trace";

const SYSTEM = `You write git commit messages for a browser-based AEC model editor.
Given the diff of one file, reply with ONE concise conventional-commit subject line.
Format: "<type>: <summary>" where type is one of feat, fix, docs, refactor, chore, test.
Rules: max 72 characters, imperative mood, no body, no quotes, no trailing period.
Example: "feat: add a roof to the house function"`;

function clean(text: string): string {
  const first = text.trim().split("\n")[0] ?? "";
  return first.replace(/^["'`]+|["'`]+$/g, "").trim().slice(0, 100);
}

export function fallbackMessage(path: string): string {
  return `update ${path}`;
}

export interface CommitMessageInput {
  path: string;
  diff: string;
}

/** One-shot commit-message generation with a deterministic fallback. */
export async function generateCommitMessage({
  path,
  diff,
}: CommitMessageInput): Promise<string> {
  const fallback = fallbackMessage(path);
  const cfg = loadConfig();
  if (!isConfigured(cfg)) return fallback;

  const t0 = nowMs();
  try {
    const provider = createOpenAI({ baseURL: cfg.baseUrl, apiKey: cfg.apiKey });
    const res = await generateText({
      model: provider.chat(cfg.model),
      system: SYSTEM,
      prompt: `File: ${path}\n\nDiff:\n${diff.slice(0, 4000)}`,
      temperature: 0.2,
    });
    addUsage(
      cfg.model,
      res.usage?.inputTokens ?? 0,
      res.usage?.outputTokens ?? 0,
      res.usage?.totalTokens ?? undefined,
    );
    const message = clean(res.text);
    span("commit message", t0, message || fallback);
    return message || fallback;
  } catch (e) {
    record("commit message error", e instanceof Error ? e.message : String(e));
    return fallback;
  }
}
