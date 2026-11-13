// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

import { useEffect, useRef, useState } from "react";
import { MODES, MODE_DESCRIPTIONS, MODE_LABELS, setMode } from "../app/mode";
import { useMode } from "../app/useMode";

/** Top-bar mode dropdown (sketch / explore / learn / build). */
export function ModeMenu() {
  const mode = useMode();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="mode-menu" ref={ref}>
      <button
        type="button"
        className="mode-btn"
        title="Mode"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="mode-name">{MODE_LABELS[mode]}</span>
        <span className="mode-caret">{"\u25be"}</span>
      </button>
      {open && (
        <ul className="menu mode-list" role="menu">
          {MODES.map((m) => (
            <li key={m}>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={m === mode}
                className={m === mode ? "active" : ""}
                onClick={() => {
                  setMode(m, "user");
                  setOpen(false);
                }}
              >
                <span className="menu-name">
                  {MODE_LABELS[m]}
                  {m === mode ? " \u2713" : ""}
                </span>
                <span className="menu-desc">{MODE_DESCRIPTIONS[m]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
