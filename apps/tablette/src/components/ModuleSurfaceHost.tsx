// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/components/ModuleSurfaceHost.tsx — generic host for a module's optional
// Explore surface. Surfaces are first-party React components; no remote code.

import { Suspense } from "react";
import type { ModuleSurfaceProps, StudioModule } from "../modules/types";
import * as workspace from "../forge/workspace";
import * as map from "../map/session";
import { setMode } from "../app/mode";

interface Props {
  module: StudioModule;
  onBack: () => void;
  onUse?: ModuleSurfaceProps["onUse"];
}

export function ModuleSurfaceHost({ module, onBack, onUse }: Props) {
  const Surface = module.Surface;
  if (!Surface) return null;

  const host = {
    workspace: {
      listFiles: workspace.listFiles,
      readFile: workspace.readFile,
      writeFile: workspace.writeFile,
      exists: workspace.exists,
      openFile: workspace.openFile,
      subscribeFiles: workspace.subscribeFiles,
    },
    runApp: () => map.runApp(),
    setMode: (mode: Parameters<typeof setMode>[0], reason?: string) =>
      setMode(mode, (reason as Parameters<typeof setMode>[1]) ?? "handoff"),
  };

  return (
    <div className="module-surface">
      <div className="module-surface-head">
        <button type="button" className="btn small" onClick={onBack}>
          Back
        </button>
        <strong>{module.label}</strong>
        <span className="explore-dim">{module.description}</span>
      </div>
      <Suspense fallback={<div className="explore-dim">Loading surface...</div>}>
        <Surface onUse={onUse} host={host} />
      </Suspense>
    </div>
  );
}
