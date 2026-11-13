// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/components/MapEditor.tsx — the HTML editor of the GIS app pane.
//
// Hosts a CodeMirror 6 editor configured for HTML. It edits the active app
// source in the map session; Mod-Enter runs the app and refreshes the viewer.
// The surrounding pane is the same Editor | Viewer surface as the old BIMR
// studio, with a map instead of an IFCX model.

import { useEffect, useRef } from "react";
import { basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { html } from "@codemirror/lang-html";
import * as map from "../map/session";

interface Props {
  onRun?: () => void;
}

const LIGHT_THEME = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "13px",
    backgroundColor: "#ffffff",
    color: "#1f2328",
  },
  ".cm-content": {
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
    padding: "8px 0",
  },
  ".cm-gutters": {
    backgroundColor: "#f7f6f4",
    color: "#9aa0a6",
    borderRight: "1px solid #e5e0dc",
  },
  ".cm-activeLine": { backgroundColor: "#f4f8ff" },
  ".cm-activeLineGutter": { backgroundColor: "#eff4ff" },
  "&.cm-focused": { outline: "none" },
});

export function MapEditor({ onRun }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const onRunRef = useRef(onRun);
  onRunRef.current = onRun;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: map.getState().source,
        extensions: [
          basicSetup,
          html(),
          LIGHT_THEME,
          EditorView.lineWrapping,
          keymap.of([
            {
              key: "Mod-Enter",
              run: () => {
                onRunRef.current?.();
                return true;
              },
            },
          ]),
          EditorView.updateListener.of((update) => {
            if (!update.docChanged) return;
            map.setSource(update.state.doc.toString());
          }),
        ],
      }),
    });

    const unsub = map.subscribeState((state) => {
      const current = view.state.doc.toString();
      if (current === state.source) return;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: state.source },
      });
    });

    return () => {
      unsub();
      view.destroy();
    };
  }, []);

  return <div ref={hostRef} className="map-editor" />;
}
