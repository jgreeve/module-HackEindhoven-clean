import { useState } from "react";
import type { ModuleSurfaceProps } from "@tablette/module-sdk";
import { eindhovenSample } from "./sample";

export function EindhovenSurface({ host }: ModuleSurfaceProps) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function openInSketch() {
    if (!host) return;
    setBusy(true);
    setError("");
    try {
      await host.workspace.writeFile("maps/eindhoven.html", eindhovenSample.html);
      await host.workspace.openFile("maps/eindhoven.html");
      if (!host.runApp()) throw new Error("The Viewer could not run the map.");
      host.setMode("sketch", "handoff");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 12 }} aria-label="Eindhoven module">
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button className="btn primary" type="button" disabled={!host || busy} onClick={() => void openInSketch()}>
          {busy ? "Opening…" : "Open in Sketch"}
        </button>
        <span>20 districts, 116 neighbourhoods and live permits from Gemeente Eindhoven.</span>
      </div>
      {error && <p role="alert">{error}</p>}
      <iframe
        title="Eindhoven module map"
        srcDoc={eindhovenSample.html}
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="strict-origin-when-cross-origin"
        style={{ width: "100%", height: "min(70vh, 800px)", minHeight: 420, border: "1px solid #d9e2ec", borderRadius: 8 }}
      />
    </section>
  );
}
