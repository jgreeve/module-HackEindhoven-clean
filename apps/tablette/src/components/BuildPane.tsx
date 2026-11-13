// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/components/BuildPane.tsx — live preview of a generated GIS map app.
//
// The agent publishes the composed document through gis_preview_app. It is
// rendered in a sandboxed srcdoc iframe: no same-origin access, no persistence,
// no Studio state. Tiles and Leaflet still load from their pinned URLs.

import { useEffect, useState } from "react";
import { subscribePreview } from "../map/preview";
import type { MapPreview } from "../map/preview";

export function BuildPane() {
  const [preview, setPreview] = useState<MapPreview | null>(null);

  useEffect(() => subscribePreview(setPreview), []);

  if (!preview) {
    return (
      <div className="mode-placeholder">
        <h2>Build</h2>
        <p>Build web artefacts.</p>
        <p className="dim">
          Ask the assistant for a map. It composes the app from the gis-src
          blocks and the preview appears here. Saving is a separate, confirmed
          step.
        </p>
      </div>
    );
  }

  return (
    <div className="build-pane">
      <div className="build-head">
        <span className="build-title">{preview.title}</span>
        <span className="build-badge">preview</span>
      </div>
      <iframe
        key={preview.updated}
        className="build-frame"
        title={`Preview of ${preview.title}`}
        srcDoc={preview.html}
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
