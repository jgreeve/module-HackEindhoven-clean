// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

import { useCallback, useEffect, useMemo, useState } from "react";
import { buildSessionDump } from "../app/debug";
import type { SessionDump } from "../app/debug";
import type { TraceEvent } from "../agent/trace";

interface Props {
  onClose: () => void;
}

type View = "timeline" | "json";

function Timeline({ events }: { events: TraceEvent[] }) {
  if (events.length === 0) {
    return <p className="debug-meta">No events recorded yet.</p>;
  }
  const maxDuration = Math.max(1, ...events.map((e) => e.durationMs ?? 0));
  return (
    <div className="timeline">
      {events.map((e, i) => {
        const heavy = e.durationMs !== undefined && e.durationMs / maxDuration >= 0.6;
        return (
          <div className="tl-row" key={i}>
            <span className="tl-time">+{(e.offsetMs / 1000).toFixed(2)}s</span>
            <span className="tl-label">{e.label}</span>
            <span className="tl-bar-wrap">
              {e.durationMs !== undefined && (
                <span
                  className={`tl-bar ${heavy ? "heavy" : ""}`}
                  style={{ width: `${Math.max(2, (e.durationMs / maxDuration) * 100)}%` }}
                />
              )}
            </span>
            <span className="tl-dur">
              {e.durationMs !== undefined ? `${e.durationMs} ms` : ""}
            </span>
            <span className="tl-detail">{e.detail ?? ""}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Raw JSON + process timeline of the current chat session for debugging. */
export function DebugDialog({ onClose }: Props) {
  const [dump, setDump] = useState<SessionDump>(() => buildSessionDump());
  const [view, setView] = useState<View>("timeline");
  const [copied, setCopied] = useState(false);

  const json = useMemo(() => JSON.stringify(dump, null, 2), [dump]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const refresh = useCallback(() => setDump(buildSessionDump()), []);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error("[studio] copy session dump:", e);
    }
  }, [json]);

  const download = useCallback(() => {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `studio-session-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [json]);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog debug" onClick={(e) => e.stopPropagation()}>
        <h2>Session dump</h2>
        <div className="debug-head">
          <span className="debug-meta">
            {dump.messages.length} messages · {dump.trace.length} events ·{" "}
            {dump.config.model}
          </span>
          <div className="view-mode-controls">
            <button
              type="button"
              className={`view-mode ${view === "timeline" ? "active" : ""}`}
              onClick={() => setView("timeline")}
            >
              timeline
            </button>
            <button
              type="button"
              className={`view-mode ${view === "json" ? "active" : ""}`}
              onClick={() => setView("json")}
            >
              json
            </button>
          </div>
        </div>

        {view === "timeline" ? (
          <Timeline events={dump.trace} />
        ) : (
          <pre className="debug-pre">{json}</pre>
        )}

        <div className="dialog-actions">
          <button type="button" className="btn" onClick={refresh}>
            Refresh
          </button>
          <span className="spacer" />
          <button type="button" className="btn" onClick={download}>
            Download .json
          </button>
          <button type="button" className="btn grey" onClick={() => void copy()}>
            {copied ? "Copied" : "Copy JSON"}
          </button>
          <button type="button" className="btn grey" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
