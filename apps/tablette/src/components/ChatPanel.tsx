// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { makeChatFetch } from "../agent/chat";
import type { ChatFetch } from "../agent/chat";
import * as workspace from "../forge/workspace";
import { extractDsmlProposals, stripDsml } from "../agent/dsml";
import { appendHistory, loadHistory } from "../agent/history";
import { extractChoices } from "../agent/choices";
import type { Proposal, ProposalChoice, ProposalOption } from "../agent/proposal";
import { MODE_LABELS, getMode, setMode } from "../app/mode";
import type { Mode } from "../app/mode";
import { useMode } from "../app/useMode";
import { subscribeHandoff, takeHandoff } from "../app/handoff";
import { record } from "../agent/trace";
import { registerMessagesSource } from "../app/debug";
import { Markdown } from "./Markdown";
import { ProposalCard } from "./ProposalCard";

const WELCOME: Record<Mode, string> = {
  sketch: "",
  explore: "Ask me what's on the forge, or browse it on the right.",
  learn: "Pick a lesson on the right — I can explain and give hints.",
  build: "Describe what to build and publish. Build tools are coming.",
};

const PLACEHOLDER: Record<Mode, string> = {
  sketch: "Describe a map...",
  explore: "Ask about the forge...",
  learn: "Ask about this lesson...",
  build: "Describe what to build...",
};

/** Turn provider errors into an actionable settings hint. */
function friendlyError(message: string): string {
  if (/\b401\b|missing authentication|invalid api key|no auth/i.test(message)) {
    return (
      "Authentication failed (401). The API key and the Base URL must come " +
      "from the same provider: OpenRouter keys start with sk-or-v1-, DeepSeek " +
      "keys start with sk- and need the DeepSeek preset. Open Settings to fix it."
    );
  }
  if (/\b404\b|model.*not found|unknown model/i.test(message)) {
    return `${message} — check the model id in Settings (e.g. deepseek/deepseek-v4-flash for OpenRouter, deepseek-flash for DeepSeek).`;
  }
  return message;
}

type ToolState =
  | "input-streaming"
  | "input-available"
  | "output-available"
  | "output-error";

interface AnyPart {
  type: string;
  text?: string;
  toolCallId?: string;
  state?: ToolState;
  input?: unknown;
  output?: unknown;
  errorText?: string;
}

interface AnyMessage {
  id: string;
  role: "user" | "assistant";
  content?: unknown;
  parts?: AnyPart[];
}

interface Props {
  configured: boolean;
  resetToken: number;
  onTurnDone: (ok: boolean) => void;
  onOpenConfig: () => void;
}

function textOf(msg: AnyMessage): string {
  if (Array.isArray(msg.parts)) {
    return msg.parts
      .filter((p) => p.type === "text" && typeof p.text === "string")
      .map((p) => p.text as string)
      .join("\n");
  }
  return typeof msg.content === "string" ? msg.content : "";
}

function toolName(part: AnyPart): string {
  return part.type.startsWith("tool-") ? part.type.slice("tool-".length) : part.type;
}

function ToolChip({ part, busy }: { part: AnyPart; busy: boolean }) {
  const name = toolName(part);
  const done = part.state === "output-available";
  // A tool call still "streaming" after the model stopped is truncated: the
  // provider cut the output (often a very large write_file) before the call
  // was complete. Say so instead of showing an endless ellipsis.
  const stopped = part.state === "input-streaming" && !busy;
  const result = part.output;

  let detail: string | null = null;
  if (done && typeof result === "string") {
    if (name === "run_app") {
      detail = result.startsWith("error")
        ? result
        : "map app rendered";
    } else if (name === "bimr_run") {
      detail = result.startsWith("compile error")
        ? result
        : "model compiled and rendered";
    } else if (name === "write_file") {
      detail = "file written";
    } else if (name === "edit_file") {
      detail = "file edited";
    } else if (name === "read_file") {
      detail = "file read";
    } else if (name === "list_files") {
      detail = "workspace listed";
    } else if (name === "open_file") {
      detail = "file opened";
    } else if (name === "forge_search_repos") {
      detail = "forge searched";
    } else if (name === "forge_list_repos") {
      detail = "forge repos listed";
    } else if (name === "forge_overview") {
      detail = "forge overview";
    } else if (name === "forge_read_file") {
      detail = "forge file read";
    } else if (name === "forge_list_files") {
      detail = "forge listed";
    } else if (name === "forge_repo_info") {
      detail = "repo info";
    } else if (name === "gis_list_blocks") {
      detail = "GIS blocks listed";
    } else if (name === "gis_read_block") {
      detail = "GIS block read";
    } else if (name === "gis_list_apps") {
      detail = "GIS apps listed";
    } else if (name === "gis_read_app") {
      detail = "GIS app read";
    } else if (name === "gis_preview_app") {
      detail = "GIS preview updated";
    } else if (name === "gis_save_app") {
      detail = "GIS app saved";
    } else if (name === "report_build") {
      try {
        const data = JSON.parse(result) as { path?: string; sections?: number };
        detail = `report written${data.path ? ` · ${data.path}` : ""}${data.sections ? ` · ${data.sections} sections` : ""}`;
      } catch {
        detail = "report written";
      }
    } else if (name === "opendata_topics") {
      try {
        const data = JSON.parse(result) as { topics?: unknown[]; countries?: unknown[] };
        detail = `${data.topics?.length ?? 0} topics · ${data.countries?.length ?? 0} countries`;
      } catch {
        detail = "open-data topics";
      }
    } else if (name === "opendata_search") {
      try {
        const data = JSON.parse(result) as { count?: number; sources?: unknown[] };
        detail = `${data.sources?.length ?? 0}/${data.count ?? "?"} sources`;
      } catch {
        detail = "open-data searched";
      }
    } else if (name === "opendata_source") {
      try {
        const data = JSON.parse(result) as { source?: { name?: string } };
        detail = data.source?.name ?? "open-data source";
      } catch {
        detail = "open-data source";
      }
    } else if (name === "wikimedia_search") {
      try {
        const data = JSON.parse(result) as { results?: unknown[] };
        detail = `${data.results?.length ?? 0} articles`;
      } catch {
        detail = "Wikipedia searched";
      }
    } else if (name === "wikimedia_summary") {
      try {
        const data = JSON.parse(result) as { title?: string };
        detail = data.title ?? "Wikipedia summary";
      } catch {
        detail = "Wikipedia summary";
      }
    } else if (name === "wikimedia_commons_search") {
      try {
        const data = JSON.parse(result) as { images?: unknown[]; skipped?: number };
        detail = `${data.images?.length ?? 0} images${data.skipped ? ` · ${data.skipped} skipped` : ""}`;
      } catch {
        detail = "Commons searched";
      }
    } else if (name.startsWith("git_")) {
      detail = name.replace("_", " ");
    }
  }
  const trimmed = detail && detail.length > 320 ? `${detail.slice(0, 320)}...` : detail;

  return (
    <div className={`toolchip ${done ? "done" : stopped ? "stopped" : "calling"}`}>
      <span className="toolchip-name">
        {name}
        {!done && !stopped && <span className="dots">...</span>}
      </span>
      {stopped && (
        <span className="toolchip-detail">
          incomplete: the model output was cut off. Ask to continue.
        </span>
      )}
      {trimmed && <span className="toolchip-detail">{trimmed}</span>}
    </div>
  );
}

function ProposalMessage({
  part,
  onChoose,
}: {
  part: AnyPart;
  onChoose: (toolCallId: string, choice: ProposalChoice, option: ProposalOption) => void;
}) {
  const proposals = (part.input as { proposals?: Proposal[] } | undefined)?.proposals ?? [];
  if (part.state === "input-streaming") {
    return (
      <div className="toolchip calling">
        <span className="toolchip-name">
          propose_actions<span className="dots">...</span>
        </span>
      </div>
    );
  }
  if (!proposals.length) return null;
  const resolved =
    part.state === "output-available" ? (part.output as ProposalChoice) : null;
  return (
    <ProposalCard
      proposals={proposals}
      resolved={resolved}
      onChoose={(proposalId, option) =>
        onChoose(part.toolCallId ?? "", { proposalId, optionId: option.id }, option)
      }
    />
  );
}

/** The agent's `switch_mode` tool: applies the switch and offers Undo. */
function ModeSwitchMessage({
  part,
  allow,
  onResolve,
}: {
  part: AnyPart;
  allow: boolean;
  onResolve: (toolCallId: string, output: unknown) => void;
}) {
  const input = part.input as { mode?: Mode; reason?: string } | undefined;
  const mode = input?.mode;
  const appliedRef = useRef<Mode | null>(null);
  const [previous, setPrevious] = useState<Mode | null>(null);

  useEffect(() => {
    if (!allow) return;
    if (!mode || part.state === "output-available") return;
    if (appliedRef.current === mode) return;
    const prev = getMode();
    appliedRef.current = mode;
    setPrevious(prev);
    setMode(mode, "agent-auto");
    if (part.toolCallId) onResolve(part.toolCallId, { switched: true, mode });
  }, [allow, mode, part.state, part.toolCallId, onResolve]);

  if (!allow || !mode) return null;
  return (
    <div className="modechip">
      <span className="modechip-label">Switched to {MODE_LABELS[mode]}</span>
      {previous && previous !== mode && (
        <button
          type="button"
          className="modechip-undo"
          onClick={() => setMode(previous, "user")}
        >
          Undo
        </button>
      )}
    </div>
  );
}

export function ChatPanel({ configured, resetToken, onTurnDone, onOpenConfig }: Props) {
  const onTurnDoneRef = useRef(onTurnDone);
  onTurnDoneRef.current = onTurnDone;

  const fetchImpl = useMemo<ChatFetch>(
    () => makeChatFetch({ onTurnDone: (ok) => onTurnDoneRef.current(ok) }),
    [],
  );

  // The transport is stable for the life of the panel; the hook reads the
  // custom fetch each request (model config is read inside the fetch).
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "local://studio/chat",
        fetch: fetchImpl as typeof fetch,
      }),
    [fetchImpl],
  );

  const {
    messages,
    status,
    error,
    stop,
    sendMessage,
    setMessages,
    clearError,
    addToolOutput,
  } = useChat({
    transport,
    // Client-side tools (propose_actions) pause the turn; when the user picks
    // an option we resolve the tool and the turn resumes automatically.
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  const [input, setInput] = useState("");
  const busy = status === "submitted" || status === "streaming";
  const mode = useMode();

  // A module surface can hand a ready-made prompt to the Map composer.
  useEffect(() => {
    return subscribeHandoff((pending) => {
      if (pending?.intent.kind !== "ask") return;
      takeHandoff();
      void sendMessage({ text: pending.intent.text });
    });
  }, [sendMessage]);

  // Sent user prompts, persisted across reloads for shell-like ArrowUp/Down.
  const [userHistory, setUserHistory] = useState<string[]>(() => loadHistory());
  const [histIndex, setHistIndex] = useState(-1);
  const [dsmlResolved, setDsmlResolved] = useState<Record<string, string>>({});
  const draftRef = useRef("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // React puts the caret at the end after a controlled value change; pin it so
  // repeated ArrowUp / ArrowDown keep working.
  const placeCaret = (pos: "start" | "end") => {
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      const p = pos === "start" ? 0 : el.value.length;
      el.setSelectionRange(p, p);
    });
  };

  // Move through the history: -1 is the live draft. Returns whether the key
  // was consumed (so the caller can preventDefault).
  const recallHistory = (dir: -1 | 1): boolean => {
    if (userHistory.length === 0) return false;
    if (dir === -1) {
      if (histIndex === -1) {
        draftRef.current = input;
        const idx = userHistory.length - 1;
        setHistIndex(idx);
        setInput(userHistory[idx]);
      } else if (histIndex > 0) {
        setHistIndex(histIndex - 1);
        setInput(userHistory[histIndex - 1]);
      }
      placeCaret("start");
      return true;
    }
    if (histIndex === -1) return false;
    if (histIndex < userHistory.length - 1) {
      setHistIndex(histIndex + 1);
      setInput(userHistory[histIndex + 1]);
    } else {
      setHistIndex(-1);
      setInput(draftRef.current);
    }
    placeCaret("end");
    return true;
  };

  // Expose the live messages to the session-dump dialog (debug.ts bridge).
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  useEffect(() => {
    registerMessagesSource(() => messagesRef.current);
  }, []);

  // "New" from the app header resets this conversation.
  useEffect(() => {
    if (resetToken > 0) {
      setMessages([]);
      setInput("");
      setHistIndex(-1);
      draftRef.current = "";
      clearError();
    }
  }, [resetToken, setMessages, clearError]);

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = input.trim();
    if (busy || !text) return;
    setInput("");
    setHistIndex(-1);
    draftRef.current = "";
    setUserHistory(appendHistory(text));
    void sendMessage({ text });
  };

  // Resolve a client-side proposal tool with the user's choice; the turn
  // resumes automatically (sendAutomaticallyWhen).
  const chooseProposal = useCallback(
    (toolCallId: string, choice: ProposalChoice, option: ProposalOption) => {
      if (!toolCallId) return;
      // A switch-mode option is local and idempotent: apply it optimistically
      // so the UI flips now, then resolve the proposal to resume the turn.
      if (option.action?.tool === "switch_mode") {
        const target = (option.action.args as { mode?: Mode } | undefined)?.mode;
        if (target) setMode(target, "agent-confirmed");
      }
      record("proposal chosen", `${choice.proposalId}:${choice.optionId}`);
      void addToolOutput({ tool: "propose_actions", toolCallId, output: choice });
    },
    [addToolOutput],
  );

  // Resolve the agent's switch_mode tool (the UI already applied the switch).
  const resolveSwitch = useCallback(
    (toolCallId: string, output: unknown) => {
      void addToolOutput({ tool: "switch_mode", toolCallId, output });
    },
    [addToolOutput],
  );

  // Clickable fallback for a trailing "pick one" list the model wrote as text.
  const pickChoice = useCallback(
    (text: string) => {
      setHistIndex(-1);
      draftRef.current = "";
      setUserHistory(appendHistory(text));
      void sendMessage({ text });
    },
    [sendMessage],
  );

  // A proposal recovered from leaked DSML markup (no tool call id). Run its
  // action locally where we can, else send the label as the next message.
  const handleDsmlChoose = useCallback(
    (proposalId: string, option: ProposalOption) => {
      setDsmlResolved((r) => ({ ...r, [proposalId]: option.id }));
      record("dsml proposal chosen", `${proposalId}:${option.id}`);
      const action = option.action;
      if (action?.tool === "switch_mode") {
        const m = (action.args as { mode?: Mode }).mode;
        if (m) setMode(m, "agent-confirmed");
        return;
      }
      if (action?.tool === "write_file") {
        const path = String((action.args as { path?: string }).path ?? "maps/sketch.html");
        const content = String((action.args as { content?: string }).content ?? "");
        void workspace.writeFile(path, content).then(() => setMode("sketch", "agent-confirmed"));
        return;
      }
      pickChoice(option.label);
    },
    [pickChoice],
  );

  const chatEmpty = messages.length === 0;
  const welcome = configured
    ? WELCOME[mode]
    : "Set up your model key first, then start.";

  // Show the working indicator (with the bot icon) only until the assistant
  // produces any text; once there is an answer, the icon is removed.
  const lastMsg = messages[messages.length - 1] as unknown as AnyMessage | undefined;
  const streamingText =
    lastMsg && lastMsg.role === "assistant" ? stripDsml(textOf(lastMsg)).trim() : "";
  const showThinking = busy && streamingText.length === 0;

  return (
    <div className="chat">
      {!configured && (
        <div className="chat-banner">
          <span>No model configured yet.</span>
          <button type="button" className="btn small" onClick={onOpenConfig}>
            Configure model
          </button>
        </div>
      )}

      {status === "error" && error && (
        <div className="chat-banner err">
          <span>{friendlyError(error.message)}</span>
          <button type="button" className="btn small" onClick={clearError}>
            Dismiss
          </button>
        </div>
      )}

      <div className="messages">
        {chatEmpty && !busy && welcome && (
          <div className="chat-welcome">{welcome}</div>
        )}

        {messages.map((raw, idx) => {
          const msg = raw as unknown as AnyMessage;
          const hasParts = Array.isArray(msg.parts) && msg.parts.length > 0;
          const text = stripDsml(textOf(msg));
          const dsmlProposals =
            msg.role === "assistant" ? extractDsmlProposals(textOf(msg)) : [];
          const hasProposalTool =
            msg.parts?.some((p) => p.type === "tool-propose_actions") ?? false;
          const choices =
            msg.role === "assistant" && idx === messages.length - 1 && !busy && !hasProposalTool
              ? extractChoices(text)
              : null;
          // Guardrail: at most one mode switch applies per assistant message.
          let switchSeen = false;
          return (
            <div key={msg.id} className={`msg ${msg.role}`}>
              {hasParts ? (
                msg.parts!.map((part, i) => {
                  if (part.type === "text") {
                    const clean = part.text ? stripDsml(part.text) : "";
                    return clean ? <Markdown key={i} text={clean} /> : null;
                  }
                  if (part.type === "tool-propose_actions") {
                    return <ProposalMessage key={i} part={part} onChoose={chooseProposal} />;
                  }
                  if (part.type === "tool-switch_mode") {
                    const allow = !switchSeen;
                    switchSeen = true;
                    return (
                      <ModeSwitchMessage
                        key={i}
                        part={part}
                        allow={allow}
                        onResolve={resolveSwitch}
                      />
                    );
                  }
                  if (part.type.startsWith("tool-")) {
                    return <ToolChip key={i} part={part} busy={busy} />;
                  }
                  return null;
                })
              ) : text ? (
                <Markdown text={text} />
              ) : null}
              {dsmlProposals.length > 0 && (
                <ProposalCard
                  proposals={dsmlProposals}
                  resolved={
                    dsmlResolved[dsmlProposals[0].id]
                      ? {
                          proposalId: dsmlProposals[0].id,
                          optionId: dsmlResolved[dsmlProposals[0].id],
                        }
                      : null
                  }
                  onChoose={handleDsmlChoose}
                />
              )}
              {choices && (
                <div className="choice-options">
                  {choices.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      className="btn"
                      onClick={() => pickChoice(c.text)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {showThinking && (
          <div className="msg assistant">
            <div className="thinking">
              <span className="msg-label">{"\u{1F916}"}</span>
              <span className="thinking-dots">working</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form className="composer" onSubmit={onSubmit}>
        <div className="composer-box">
          <textarea
            className="input"
            rows={2}
            ref={inputRef}
            value={input}
            placeholder={PLACEHOLDER[mode]}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
                return;
              }
              const el = e.currentTarget;
              const atStart =
                el.selectionStart === 0 && el.selectionEnd === 0;
              const atEnd =
                el.selectionStart === el.value.length &&
                el.selectionEnd === el.value.length;
              if (e.key === "ArrowUp" && atStart) {
                if (recallHistory(-1)) e.preventDefault();
              } else if (e.key === "ArrowDown" && atEnd) {
                if (recallHistory(1)) e.preventDefault();
              }
            }}
          />
          {busy ? (
            <button
              type="button"
              className="send-btn stop"
              title="Stop"
              aria-label="Stop"
              onClick={() => void stop()}
            >
              <svg viewBox="0 0 24 24" width="10" height="10" aria-hidden="true">
                <rect x="4" y="4" width="16" height="16" rx="1.5" fill="currentColor" />
              </svg>
            </button>
          ) : (
            <button
              type="submit"
              className="send-btn"
              disabled={!input.trim()}
              title="Send"
              aria-label="Send"
            >
              <svg
                className="send-arrow"
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 19V6" />
                <path d="M5.5 11.5 12 5l6.5 6.5" />
              </svg>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
