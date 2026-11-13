// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/components/MapPane.tsx — the right-hand GIS app pane.
//
// Same shell as the old BIMR studio pane: a toolbar (Samples, Run), an
// Editor | Viewer tab bar, the active app on one side, and a status footer on
// the other. The artifact is an OpenStreetMap + Leaflet app instead of a
// compiled IFCX model.

import { useCallback, useEffect, useState } from "react";
import * as map from "../map/session";
import type { MapState } from "../map/session";
import { listApps } from "../map/repo";
import type { GisAppIndexEntry } from "../map/types";
import type { Pane } from "./StudioApp";
import { MapEditor } from "./MapEditor";
import { MapViewer } from "./MapViewer";

interface Props {
  pane: Pane;
  onPaneChange: (pane: Pane) => void;
}

export function MapPane({ pane, onPaneChange }: Props) {
  const [state, setState] = useState<MapState>(() => map.getState());
  const [samplesOpen, setSamplesOpen] = useState(false);
  const [samples, setSamples] = useState<GisAppIndexEntry[] | null>(null);
  const [sampleError, setSampleError] = useState<string | null>(null);

  useEffect(() => map.subscribeState(setState), []);

  // Warm the workspace and render the starter page once.
  useEffect(() => {
    void map.boot();
  }, []);

  const run = useCallback(
    (openViewer = true) => {
      const ok = map.runApp();
      if (ok && openViewer) onPaneChange("viewer");
    },
    [onPaneChange],
  );

  const choosePane = useCallback(
    (next: Pane) => {
      if (next === "viewer") run(false);
      onPaneChange(next);
    },
    [onPaneChange, run],
  );

  const toggleSamples = useCallback(async () => {
    setSamplesOpen((open) => !open);
    if (samples) return;
    setSampleError(null);
    try {
      setSamples(await listApps());
    } catch (e) {
      setSamples([]);
      setSampleError(e instanceof Error ? e.message : String(e));
    }
  }, [samples]);

  const loadSample = useCallback(
    async (id: string | null) => {
      setSamplesOpen(false);
      setSampleError(null);
      try {
        if (id === null) {
          await map.loadStarter();
        } else {
          await map.openSavedApp(id);
        }
        onPaneChange("viewer");
      } catch (e) {
        setSampleError(e instanceof Error ? e.message : String(e));
      }
    },
    [onPaneChange],
  );

  // Close the samples menu on an outside click.
  useEffect(() => {
    if (!samplesOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".samples")) setSamplesOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [samplesOpen]);

  const isHtml = state.path.endsWith(".html");

  return (
    <div className="bimr gis-pane">
      <div className="bimr-toolbar">
        <div className="samples">
          <button
            type="button"
            className="btn"
            onClick={() => void toggleSamples()}
            aria-haspopup="menu"
            aria-expanded={samplesOpen}
          >
            Samples <span className="caret">{"\u25be"}</span>
          </button>
          {samplesOpen && (
            <ul className="menu" role="menu">
              <li>
                <button type="button" onClick={() => void loadSample(null)}>
                  <span className="menu-name">Starter page</span>
                  <span className="menu-desc">A minimal HTML page to start from</span>
                </button>
              </li>
              {samples?.map((app) => (
                <li key={app.id}>
                  <button type="button" onClick={() => void loadSample(app.id)}>
                    <span className="menu-name">{app.title}</span>
                    {app.description && <span className="menu-desc">{app.description}</span>}
                  </button>
                </li>
              ))}
              {samples === null && (
                <li>
                  <button type="button" disabled>
                    <span className="menu-desc">Loading generated apps...</span>
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>
        <button
          type="button"
          className="btn ghost small"
          onClick={() => void loadSample(null)}
          title="Reset the active app to the starter page"
        >
          New app
        </button>
        <div className="spacer" />
        <button
          type="button"
          className="btn primary"
          onClick={() => run(true)}
          disabled={!isHtml}
          title="Render the active app in the viewer"
        >
          {"\u25b6 Run"}
        </button>
      </div>

      <nav className="layout-tabs">
        {(["editor", "viewer"] as const).map((p) => (
          <button
            key={p}
            type="button"
            className={`tab ${pane === p ? "active" : ""}`}
            onClick={() => choosePane(p)}
          >
            {p === "editor" ? "Editor" : "Viewer"}
          </button>
        ))}
      </nav>

      <div className="bimr-content">
        {pane === "editor" ? <MapEditor onRun={() => run(true)} /> : <MapViewer />}
      </div>

      <footer className={`map-status ${state.status.kind}`}>
        <span className={`map-status-kind ${state.documentKind}`}>
          {state.documentKind === "report"
            ? "Report"
            : state.documentKind === "map"
              ? "Map"
              : "File"}
        </span>
        <span className="map-status-path">{state.path}</span>
        <span className="map-status-text">{state.status.text}</span>
        {sampleError && <span className="map-status-error">{sampleError}</span>}
      </footer>
    </div>
  );
}
