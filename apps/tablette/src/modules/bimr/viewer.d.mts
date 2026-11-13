// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/modules/bimr/viewer.d.mts — types for the synced IfcxViewer class bundle
// (src/modules/bimr/viewer.mjs, generated in bimr-web by `make sync-viewer`). The
// adjacent .d.mts is how TypeScript types the generated .mjs. Never edit the
// .mjs; keep this declaration in sync with bimr-web's viewer.d.ts.

export interface IfcxViewerOptions {
  /** Fit the camera to the model bounding box on the first render (default true). */
  autoCamera?: boolean;
  /** Called whenever the selection changes; null when nothing is selected. */
  onSelect?: (path: string | null) => void;
}

/** A self-contained IFCX viewer instance (Three.js). Renders into its own
 * container's `.viewport`; no window globals. */
export declare class IfcxViewer {
  constructor(container: HTMLElement, options?: IfcxViewerOptions);
  /** Add an IFCX document under `name` and re-render the composed model. */
  addModel(name: string, model: unknown): Promise<void>;
  /** Remove every loaded model from the layer list. */
  clearModels(): void;
  /** Dispose GPU resources and stop the render loop. */
  destroy(): void;
}

export default IfcxViewer;
