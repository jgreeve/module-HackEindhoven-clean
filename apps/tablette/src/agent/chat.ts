// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/agent/chat.ts — the in-page chat transport for @ai-sdk/react useChat.
//
// Studio has no server, so the agent runs in the browser. useChat sends each
// user message through its transport (DefaultChatTransport with a custom
// fetch); that fetch runs the Vercel AI SDK `streamText` — tools bound to the
// live BIMR session — and returns `streamText`'s UI-message-stream Response
// for the hook to parse (text deltas, tool invocations, finish). Only the
// model provider is external (OpenRouter via @ai-sdk/openai).

import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import type { ToolSet, UIMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { loadConfig } from "./config";
import { allAgentTools, toolsForMode } from "./tools";
import { getTurnRunOk, resetTurnRunOk } from "./turn";
import { systemPromptFor } from "./prompts";
import { getMode, setMode } from "../app/mode";
import type { Mode } from "../app/mode";
import { addUsage } from "./usage";
import { beginTurn, nowMs, record, span } from "./trace";

export interface ChatFetchDeps {
  /** Called when the agent finishes a turn with whether the last run worked. */
  onTurnDone: (ok: boolean) => void;
}

export type ChatFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

// A first message that is only a greeting must not trigger coding. The model
// is unreliable at this on its own, so a greeting short-circuits to a fixed
// reply and never reaches the provider.
const GREETING_RE =
  /^\s*(hi+|hello+|hey+|yo|hiya|howdy|salut|bonjour|bonsoir|coucou|hola|good\s+(morning|afternoon|evening))(\s+there)?[\s!.,?]*$/i;

const GREETING_REPLY = "Hi! What would you like to build or change?";

// An explicit mode command ("switch to explore", "go to learn mode") is applied
// before the request so the same turn already runs in the new mode — no extra
// round-trip. Narrow on purpose: a bare "build a tower" must not match.
const MODE_COMMAND_RE =
  /\b(?:switch|go|change|open|show)\b[^.\n]{0,24}?\b(sketch|map|explore|learn|build)(?:\s+mode)?\b/i;

function explicitMode(text: string): Mode | null {
  const m = MODE_COMMAND_RE.exec(text);
  if (!m) return null;
  const name = m[1].toLowerCase();
  return (name === "map" ? "sketch" : name) as Mode;
}

/** Stream a fixed assistant text reply, without calling the model. */
function cannedReply(text: string): Response {
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const id = "greeting";
      writer.write({ type: "text-start", id });
      writer.write({ type: "text-delta", id, delta: text });
      writer.write({ type: "text-end", id });
    },
  });
  return createUIMessageStreamResponse({ stream });
}

function messageText(m: unknown): string {
  if (!m || typeof m !== "object") return "";
  const parts = (m as { parts?: unknown }).parts;
  if (Array.isArray(parts)) {
    return parts
      .map((p) =>
        p &&
        typeof p === "object" &&
        (p as { type?: unknown }).type === "text" &&
        typeof (p as { text?: unknown }).text === "string"
          ? (p as { text: string }).text
          : "",
      )
      .join(" ");
  }
  const content = (m as { content?: unknown }).content;
  return typeof content === "string" ? content : "";
}

function errorText(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  if (e && typeof e === "object") {
    const o = e as Record<string, unknown>;
    if (typeof o.message === "string") return o.message;
    const inner = o.error;
    if (inner && typeof inner === "object") {
      const msg = (inner as Record<string, unknown>).message;
      if (typeof msg === "string") return msg;
    }
    try {
      const s = JSON.stringify(e);
      if (s && s !== "{}") return s;
    } catch {
      // fall through
    }
  }
  return String(e);
}

/** Convert the UIMessage[] useChat sends us into ModelMessage[] for
 * streamText (text + completed tool invocations preserved). */
function toModelMessages(ui: unknown[], tools: ToolSet) {
  return convertToModelMessages(ui as UIMessage[], {
    tools,
    ignoreIncompleteToolCalls: true,
  });
}

export function makeChatFetch(deps: ChatFetchDeps): ChatFetch {
  return async (_input, init) => {
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    const uiMessages = (Array.isArray(body.messages) ? body.messages : []) as unknown[];

    // A greeting is answered directly: no provider call, no tools.
    if (uiMessages.length === 1 && GREETING_RE.test(messageText(uiMessages[0]).trim())) {
      record("greeting", "canned reply");
      return cannedReply(GREETING_REPLY);
    }

    // Deterministic pre-switch for an explicit mode command: apply before the
    // prompt is assembled so this very request runs in the new mode. Only on a
    // user message (never on the assistant text or a resumed tool result).
    const lastMsg = uiMessages[uiMessages.length - 1] as { role?: string } | undefined;
    if (lastMsg?.role === "user") {
      const target = explicitMode(messageText(lastMsg).trim());
      if (target) setMode(target, "agent-auto");
    }

    const cfg = loadConfig();
    if (!cfg.apiKey.trim()) {
      // Reject: useChat surfaces this as status "error" with the message.
      throw new Error("Model not configured. Open Model settings and add an API key.");
    }

    resetTurnRunOk();

    const provider = createOpenAI({
      baseURL: cfg.baseUrl,
      apiKey: cfg.apiKey,
    });

    // Timeline instrumentation.
    beginTurn();
    const turnStart = nowMs();
    record("chat request", `${uiMessages.length} messages`);
    let stepStart = turnStart;
    let stepNumber = 0;
    let firstToken = true;

    const result = streamText({
      // OpenRouter is OpenAI-compatible chat completions (not the Responses
      // API), so use `.chat()` rather than the provider's default.
      model: provider.chat(cfg.model),
      system: systemPromptFor(getMode()),
      messages: toModelMessages(uiMessages, allAgentTools() as ToolSet),
      tools: toolsForMode(getMode()),
      // The agent tool loop runs inside this single stream: keep going while
      // steps end with executed tool calls, capped at 32 model calls so a
      // build-and-debug turn can finish with a summary instead of truncating.
      stopWhen: stepCountIs(32),
      temperature: cfg.temperature,
      abortSignal: init?.signal ?? undefined,
      prepareStep: (options) => {
        stepStart = nowMs();
        stepNumber = options.stepNumber + 1;
        firstToken = true;
        return undefined;
      },
      onChunk: ({ chunk }) => {
        if (firstToken && chunk.type === "text-delta") {
          firstToken = false;
          record(`step ${stepNumber} first token`, `+${Math.round(nowMs() - stepStart)}ms`);
        }
      },
      onStepFinish: (step) => {
        const tools = step.toolCalls?.map((c) => c.toolName).join(", ");
        span(
          `step ${stepNumber}`,
          stepStart,
          tools ? `tools: ${tools}` : `finish: ${step.finishReason}`,
        );
      },
      onError: (e) => {
        record("model error", errorText(e));
        span("turn total", turnStart);
      },
      onFinish: () => {
        span("turn total", turnStart);
        deps.onTurnDone(getTurnRunOk());
      },
    });

    // Record token usage / cost once the stream finishes (all steps summed).
    void result.totalUsage
      .then((usage) => {
        addUsage(
          cfg.model,
          usage.inputTokens ?? 0,
          usage.outputTokens ?? 0,
          usage.totalTokens ?? undefined,
        );
      })
      .catch(() => {
        // usage unavailable (aborted, or the provider omitted it)
      });

    // The Response streamed to useChat (parsed by DefaultChatTransport). The
    // UI message stream carries text deltas + tool invocations across all the
    // internal steps.
    return result.toUIMessageStreamResponse();
  };
}
