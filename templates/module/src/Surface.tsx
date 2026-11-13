import { useState } from "react";
import type { ModuleSurfaceProps } from "@tablette/module-sdk";

export function Surface({ onUse }: ModuleSurfaceProps) {
  const [tab, setTab] = useState<"overview" | "sources">("overview");
  return (
    <section aria-label="__MODULE_ID__ module">
      <h2>__MODULE_ID__</h2>
      <div role="tablist" aria-label="__MODULE_ID__ sections">
        <button type="button" role="tab" aria-selected={tab === "overview"} onClick={() => setTab("overview")}>Overview</button>
        <button type="button" role="tab" aria-selected={tab === "sources"} onClick={() => setTab("sources")}>Sources</button>
      </div>
      {tab === "overview" ? (
        <div role="tabpanel">
          <p>Build this module's UI here. Use injected host capabilities for workspace actions.</p>
          <button className="btn" type="button" disabled={!onUse} onClick={() => onUse?.("Help me with __MODULE_ID__.")}>Ask in Sketch</button>
        </div>
      ) : (
        <div role="tabpanel"><p>Declare data endpoints, licenses and attribution in this module's descriptor.</p></div>
      )}
    </section>
  );
}
