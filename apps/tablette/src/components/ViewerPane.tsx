// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

import { useCallback, useEffect, useRef, useState } from "react";
import * as session from "../modules/bimr/session";
import type { IfcxViewer as IfcxViewerType } from "../modules/bimr/viewer.mjs";

function errorText(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/webgl|context/i.test(msg)) {
    return `3D viewer unavailable — WebGL error: ${msg}`;
  }
  return `Viewer error: ${msg}`;
}

function webgl2Available(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!c.getContext("webgl2");
  } catch {
    return false;
  }
}

/**
 * IFCX viewer host. Lazily imports the synced IfcxViewer class bundle
 * (three.js resolved by Vite) and subscribes to run snapshots: on a
 * successful compile it clears and re-renders the model. Failures are
 * surfaced with the underlying error (a compile must never depend on it).
 */
export function ViewerPane() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [fault, setFault] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setFault(null);
    let disposed = false;
    let viewer: IfcxViewerType | null = null;

    if (!webgl2Available()) {
      setFault("3D viewer unavailable: WebGL2 is not available in this browser.");
      return;
    }

    const apply = (snap: ReturnType<typeof session.getSnapshot>) => {
      const v = viewer;
      if (!v || !snap || snap.error || !snap.ifcx) return;
      try {
        const model = JSON.parse(snap.ifcx) as unknown;
        v.clearModels();
        void v.addModel("live", model).catch((e) => {
          console.error("[studio] viewer addModel:", e);
          if (!disposed && !hostRef.current?.querySelector("canvas")) {
            setFault(errorText(e));
          }
        });
      } catch (e) {
        console.warn("[studio] viewer parse:", e);
      }
    };

    const unsub = session.subscribeSnapshot(apply);

    void (async () => {
      try {
        const mod = await import("../modules/bimr/viewer.mjs");
        const IfcxViewer = mod.IfcxViewer;
        if (disposed || !hostRef.current) return;
        viewer = new IfcxViewer(hostRef.current, { autoCamera: true });
        const snap = session.getSnapshot();
        if (snap && !snap.error && snap.ifcx) apply(snap);
      } catch (e) {
        console.error("[studio] viewer unavailable:", e);
        if (!disposed) setFault(errorText(e));
      }
    })();

    return () => {
      disposed = true;
      unsub();
      viewer?.destroy();
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  return (
    <div className="viewer-pane">
      <div ref={hostRef} className="viewer-host" />
      {fault && (
        <div className="viewer-fault">
          <p>{fault}</p>
          <button type="button" className="btn" onClick={retry}>
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
