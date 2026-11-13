// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/components/MapViewer.tsx — the live GIS app viewer.
//
// Renders the app published by the map session in a sandboxed srcdoc iframe.
// The app has no same-origin access to Studio; OSM tiles and the pinned
// Leaflet build still load from their public URLs.

import { useEffect, useState } from "react";
import { getPreview, subscribePreview } from "../map/preview";
import type { MapPreview } from "../map/preview";

export function MapViewer() {
  const [preview, setPreview] = useState<MapPreview | null>(() => getPreview());

  useEffect(() => subscribePreview(setPreview), []);

  if (!preview) {
    return (
      <div className="map-empty">
        <h2>No map yet</h2>
        <p>Ask the assistant for a map, or write an app in the Editor tab.</p>
      </div>
    );
  }

  return (
    <iframe
      key={preview.updated}
      className="map-frame"
      title={`Map preview: ${preview.title}`}
      srcDoc={preview.html}
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}
