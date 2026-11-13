// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

import { useCallback, useEffect, useRef, useState } from "react";
import * as session from "../modules/bimr/session";
import type { ProjectSnapshot } from "@bimr/web";
import type { Pane } from "./StudioApp";
import { ModelEditor } from "./ModelEditor";
import { ViewerPane } from "./ViewerPane";
import { CommitButton } from "./CommitButton";

type ViewMode = "python" | "bimr" | "ifcx";

const VIEW_MODES: ViewMode[] = ["python", "bimr", "ifcx"];
const DEBOUNCE_MS = 500;

interface Props {
  pane: Pane;
  onPaneChange: (pane: Pane) => void;
  activePath: string;
}

function consoleText(snap: ProjectSnapshot | null): string {
  if (!snap) return "";
  if (snap.error) return snap.error;
  if (snap.output && snap.output.trim()) return snap.output;
  return "";
}

function prettyJson(text: string | null): string {
  if (!text) return "// no model yet — run the python first";
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

export function EditorPane({ pane, onPaneChange, activePath }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("python");
  const [realtime, setRealtime] = useState(true);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [pythonDoc, setPythonDoc] = useState(session.getPython());
  const [snap, setSnap] = useState<ProjectSnapshot | null>(session.getSnapshot());

  // Latest refs for the (stable) realtime input subscription.
  const realtimeRef = useRef(realtime);
  realtimeRef.current = realtime;
  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => session.subscribePython(setPythonDoc), []);
  useEffect(() => session.subscribeSnapshot(setSnap), []);

  // Opening a different file shows it in the python view.
  useEffect(() => {
    setViewMode("python");
  }, [activePath]);

  // Run without opening the viewer (realtime auto-runs).
  const runSilent = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      await session.runModel();
    } catch (e) {
      console.error("[studio] realtime run:", e);
    } finally {
      busyRef.current = false;
    }
  }, []);

  // Run and open the viewer on success (manual Run / Mod-Enter / sample).
  const runOpen = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const s = await session.runModel();
      if (s && !s.error && s.ifcx) onPaneChange("viewer");
    } catch (e) {
      console.error("[studio] run:", e);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [onPaneChange]);

  // Realtime mode (default): debounce-run on user edits in the python view.
  useEffect(() => {
    return session.subscribeInput(() => {
      if (!realtimeRef.current || viewModeRef.current !== "python") return;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        debounceTimer.current = null;
        void runSilent();
      }, DEBOUNCE_MS);
    });
  }, [runSilent]);

  // Clear a pending realtime run on unmount.
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const toggleRealtime = useCallback(() => {
    setRealtime((r) => {
      if (!r && debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      return !r;
    });
  }, []);

  // The controlled editor document depends on the active view.
  let editorDoc: string;
  let editorLang: "python" | "json";
  let editorReadOnly: boolean;
  let onEdit: (doc: string) => void = () => {};

  if (viewMode === "python") {
    editorDoc = pythonDoc;
    editorLang = activePath.endsWith(".json") ? "json" : "python";
    editorReadOnly = false;
    onEdit = (doc) => {
      session.setPython(doc);
      session.markUserInput();
    };
  } else if (viewMode === "bimr") {
    editorDoc = snap?.bimr ?? "// no bimr buffer yet — run the python first";
    editorLang = "python";
    editorReadOnly = true;
  } else {
    editorDoc = prettyJson(snap?.ifcx ?? null);
    editorLang = "json";
    editorReadOnly = true;
  }

  const consoleTextValue = consoleText(snap);
  const showConsole = consoleTextValue.trim().length > 0;

  return (
    <div className="bimr">
      <div className="layout-tabs">
        {(["editor", "viewer"] as const).map((p) => (
          <button
            key={p}
            type="button"
            className={`tab ${pane === p ? "active" : ""}`}
            onClick={() => onPaneChange(p)}
          >
            {p === "editor" ? "Editor" : "Viewer"}
          </button>
        ))}
      </div>
      <div className="bimr-content">
        {pane === "editor" ? (
          <ModelEditor
            doc={editorDoc}
            language={editorLang}
            readOnly={editorReadOnly}
            onEdit={onEdit}
            onRun={() => void runOpen()}
          />
        ) : (
          <ViewerPane />
        )}
        <CommitButton activePath={activePath} enabled={pane === "editor"} />
      </div>

      <div className="bimr-bottom">
        <div className="editor-footer">
          <div className="view-mode-controls">
            {VIEW_MODES.map((m) => (
              <button
                key={m}
                type="button"
                className={`view-mode ${viewMode === m ? "active" : ""}`}
                onClick={() => setViewMode(m)}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="run-controls">
            <button
              type="button"
              className={`mode-toggle ${realtime ? "active" : ""}`}
              onClick={toggleRealtime}
            >
              realtime
            </button>
            {!realtime && (
              <button
                type="button"
                className="btn run"
                onClick={() => void runOpen()}
                disabled={busy}
              >
                {busy ? "Running..." : "\u25b6 Run"}
              </button>
            )}
          </div>
        </div>
        {showConsole && (
          <div className={`console ${snap?.error ? "error" : ""}`}>
            <pre>{consoleTextValue}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
