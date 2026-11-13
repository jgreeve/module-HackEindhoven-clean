// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

import { useCallback, useEffect, useState } from "react";
import { loadConfig, isConfigured } from "../agent/config";
import { resetTrace } from "../agent/trace";
import { getUsage, resetUsage, subscribeUsage } from "../agent/usage";
import type { UsageTotals } from "../agent/usage";
import { getPreview } from "../map/preview";
import * as map from "../map/session";
import { useWorkspace } from "../app/useWorkspace";
import { useMode } from "../app/useMode";
import { Breadcrumb } from "./Breadcrumb";
import { ModeMenu } from "./ModeMenu";
import { FileMenu } from "./FileMenu";
import { ExplorePane } from "./ExplorePane";
import { LearnPane } from "./LearnPane";
import { BuildPane } from "./BuildPane";
import { MapPane } from "./MapPane";
import { ChatPanel } from "./ChatPanel";
import { ConfigDialog } from "./ConfigDialog";
import { DebugDialog } from "./DebugDialog";

export type Pane = "editor" | "viewer";

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function formatCost(usd: number): string {
  if (usd === 0) return "$0.00";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

export function StudioApp() {
  const [pane, setPane] = useState<Pane>("viewer");
  const [configOpen, setConfigOpen] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [cfgNonce, setCfgNonce] = useState(0);
  const [resetToken, setResetToken] = useState(0);
  const [usage, setUsage] = useState<UsageTotals>(() => getUsage());

  useEffect(() => subscribeUsage(setUsage), []);

  const { files, activePath, open } = useWorkspace();
  const mode = useMode();

  // Open the Viewer when the agent's last app preview succeeded.
  const handleTurnDone = useCallback((ok: boolean) => {
    if (ok && getPreview()) setPane("viewer");
  }, []);

  const handleNew = useCallback(() => {
    resetTrace();
    resetUsage();
    setPane("viewer");
    setResetToken((t) => t + 1);
    void map.reset();
  }, []);

  const configured = isConfigured(loadConfig());

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <span className="brand">Tablette</span>
          <button
            type="button"
            className="icon-btn"
            title="New session"
            aria-label="New session"
            onClick={handleNew}
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          </button>
          <button
            type="button"
            className={`icon-btn ${configured ? "" : "warn"}`}
            title="Model settings"
            aria-label="Model settings"
            onClick={() => setConfigOpen(true)}
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3.2" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h0a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v0a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z" />
            </svg>
          </button>
          <button
            type="button"
            className="icon-btn"
            title="Session dump (debug)"
            aria-label="Session dump (debug)"
            onClick={() => setDebugOpen(true)}
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M8 6 3 12l5 6" />
              <path d="m16 6 5 6-5 6" />
            </svg>
          </button>
          <FileMenu
            files={files}
            activePath={activePath}
            onOpen={(p) => void open(p)}
          />
        </div>
        <ModeMenu />
        <Breadcrumb activePath={activePath} />
        <span
          className="usage"
          title={`${usage.inputTokens} input · ${usage.outputTokens} output tokens · ${usage.turns} responses`}
        >
          {formatCost(usage.costUsd)} · {formatTokens(usage.totalTokens)} tok
        </span>
      </header>

      <div className="body">
        <section className="pane chat">
          <ChatPanel
            configured={configured}
            resetToken={resetToken}
            onTurnDone={handleTurnDone}
            onOpenConfig={() => setConfigOpen(true)}
          />
        </section>
        <section className="pane bimr">
          {mode === "sketch" ? (
            <MapPane pane={pane} onPaneChange={setPane} />
          ) : mode === "explore" ? (
            <ExplorePane />
          ) : mode === "learn" ? (
            <LearnPane />
          ) : (
            <BuildPane />
          )}
        </section>
      </div>

      {configOpen && (
        <ConfigDialog
          onClose={() => {
            setConfigOpen(false);
            setCfgNonce((n) => n + 1);
          }}
        />
      )}

      {debugOpen && <DebugDialog onClose={() => setDebugOpen(false)} />}
    </div>
  );
}
