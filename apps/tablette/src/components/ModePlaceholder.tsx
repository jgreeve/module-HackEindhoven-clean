// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

import { MODE_DESCRIPTIONS, MODE_LABELS } from "../app/mode";
import type { Mode } from "../app/mode";

/** Placeholder for a mode whose pane is not built yet (explore/learn/build). */
export function ModePlaceholder({ mode }: { mode: Mode }) {
  return (
    <div className="mode-placeholder">
      <h2>{MODE_LABELS[mode]}</h2>
      <p>{MODE_DESCRIPTIONS[mode]}.</p>
      <p className="dim">
        This mode is under construction. Switch back to Sketch to model.
      </p>
    </div>
  );
}
