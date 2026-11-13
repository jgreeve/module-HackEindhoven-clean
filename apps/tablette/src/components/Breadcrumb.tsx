// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

import { useFileLocation } from "../app/useFileLocation";

/** Forgejo-style path of the active file; each segment links to the forge web
 * UI (opened in a new tab). Local (sandbox) dirs/files are plain text. */
export function Breadcrumb({ activePath }: { activePath: string }) {
  const { segments } = useFileLocation(activePath);

  return (
    <nav className="breadcrumb" aria-label="File location">
      {segments.map((s, i) => (
        <span className="bc-seg" key={`${s.kind}-${i}`}>
          {i > 0 && <span className="bc-sep">/</span>}
          {s.href ? (
            <a
              className={`bc-link ${s.kind === "file" ? "file" : ""}`}
              href={s.href}
              target="_blank"
              rel="noreferrer"
              title={s.href}
            >
              {s.label}
            </a>
          ) : (
            <span
              className={`bc-link ${s.kind === "file" ? "file" : ""}`}
              title={s.label}
            >
              {s.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
