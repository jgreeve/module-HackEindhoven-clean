// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

import { useEffect, useRef } from "react";

interface BimrEditorEl extends HTMLElement {
  value: string;
}

interface Props {
  /** The document to display (kept in sync with the editor). */
  doc: string;
  language?: "python" | "json";
  readOnly?: boolean;
  /** User edit (never fires for programmatic doc pushes). */
  onEdit: (doc: string) => void;
  /** Mod-Enter in the editor. */
  onRun?: () => void;
}

/**
 * Hosts the <bimr-editor> custom element (@bimr/web, CodeMirror) as a
 * controlled component. The element is created once; doc/language/read-only
 * prop changes are applied programmatically (suppressed so they never echo
 * back as edits). Only genuine user typing calls onEdit.
 */
export function ModelEditor({
  doc,
  language = "python",
  readOnly = false,
  onEdit,
  onRun,
}: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const elRef = useRef<BimrEditorEl | null>(null);
  const suppressRef = useRef(false);
  const onEditRef = useRef(onEdit);
  onEditRef.current = onEdit;
  const onRunRef = useRef(onRun);
  onRunRef.current = onRun;

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;

    const el = document.createElement("bimr-editor") as BimrEditorEl;
    el.setAttribute("no-shadow", "");
    if (language !== "python") el.setAttribute("language", language);
    if (readOnly) el.setAttribute("read-only", "");
    box.appendChild(el);
    elRef.current = el;

    suppressRef.current = true;
    try {
      el.value = doc;
    } finally {
      suppressRef.current = false;
    }

    const onChange = (e: Event) => {
      if (suppressRef.current) return;
      const detail = (e as CustomEvent<{ doc?: string }>).detail;
      if (typeof detail?.doc === "string") onEditRef.current(detail.doc);
    };
    const onRunEvent = () => onRunRef.current?.();

    el.addEventListener("bimr-change", onChange);
    el.addEventListener("bimr-run", onRunEvent);

    return () => {
      el.removeEventListener("bimr-change", onChange);
      el.removeEventListener("bimr-run", onRunEvent);
      box.removeChild(el);
      elRef.current = null;
    };
    // Create once; prop changes are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prop -> element sync (language, read-only, doc) without echoing an edit.
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    suppressRef.current = true;
    try {
      if (language === "json") el.setAttribute("language", "json");
      else el.removeAttribute("language");
      if (readOnly) el.setAttribute("read-only", "");
      else el.removeAttribute("read-only");
      if (el.value !== doc) el.value = doc;
    } finally {
      suppressRef.current = false;
    }
  }, [doc, language, readOnly]);

  return <div ref={boxRef} className="model-editor" />;
}
