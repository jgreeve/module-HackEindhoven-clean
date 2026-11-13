// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/app/debug.ts — the chat-session debug dump.
//
// A tiny bridge so the top-bar "Session dump" dialog can read the live
// useChat messages (owned by ChatPanel) without threading them through props.
// buildSessionDump() snapshots the conversation plus the context that explains
// it: model config (never the API key), system prompt, tool names, and the
// current python buffer / last run status.

import { loadConfig } from "../agent/config";
import { allAgentTools } from "../agent/tools";
import { systemPromptFor } from "../agent/prompts";
import { getMode } from "./mode";
import { getTrace } from "../agent/trace";
import type { TraceEvent } from "../agent/trace";
import * as session from "../modules/bimr/session";

export interface SessionDump {
  app: "studio";
  exportedAt: string;
  config: { baseUrl: string; model: string; temperature: number };
  tools: string[];
  systemPrompt: string;
  session: {
    python: string;
    lastRun: { error: string | null; entities: number } | null;
  };
  /** Chronological process timeline (boot, model steps, tools, compile). */
  trace: TraceEvent[];
  messages: unknown[];
}

let messagesSource: (() => unknown[]) | null = null;

/** Register the live chat messages getter (called by ChatPanel). */
export function registerMessagesSource(fn: () => unknown[]): void {
  messagesSource = fn;
}

/** Snapshot the whole session for debugging. */
export function buildSessionDump(): SessionDump {
  const cfg = loadConfig();
  const snap = session.getSnapshot();
  return {
    app: "studio",
    exportedAt: new Date().toISOString(),
    // apiKey is intentionally never included.
    config: {
      baseUrl: cfg.baseUrl,
      model: cfg.model,
      temperature: cfg.temperature,
    },
    tools: Object.keys(allAgentTools()),
    systemPrompt: systemPromptFor(getMode()),
    session: {
      python: session.getPython(),
      lastRun: snap
        ? { error: snap.error, entities: session.countEntities(snap.ifcx) }
        : null,
    },
    trace: getTrace(),
    messages: messagesSource ? messagesSource() : [],
  };
}
