// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

import { useEffect } from "react";
import type { LineDiff } from "../forge/diff";

export interface CommitResult {
  oid: string;
  url: string | null;
  pushed: boolean;
}

interface Props {
  path: string;
  message: string;
  onMessageChange: (message: string) => void;
  diff: LineDiff | null;
  busy: boolean;
  error: string | null;
  result: CommitResult | null;
  onCommit: () => void;
  onClose: () => void;
}

/** Commit modal: the (editable) agent message, a diff summary, and Commit. */
export function CommitModal({
  path,
  message,
  onMessageChange,
  diff,
  busy,
  error,
  result,
  onCommit,
  onClose,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  return (
    <div
      className="overlay"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        className="dialog commit-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Commit changes"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="commit-head">
          <span className="commit-title">Commit</span>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close"
            onClick={onClose}
            disabled={busy}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {result ? (
          <div className="commit-body">
            <p className="commit-done">
              Committed <code>{result.oid.slice(0, 7)}</code>.
            </p>
            {result.url ? (
              <a className="commit-link" href={result.url} target="_blank" rel="noreferrer">
                View on the forge
              </a>
            ) : (
              <p className="commit-dim">Not pushed to the forge.</p>
            )}
            {error && <div className="commit-error">{error}</div>}
            <div className="dialog-actions">
              <button type="button" className="btn primary" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="commit-body">
            <label className="commit-field">
              <span className="commit-label">Message</span>
              <input
                className="commit-input"
                value={message}
                onChange={(e) => onMessageChange(e.target.value)}
                placeholder="commit message"
                disabled={busy}
                autoFocus
              />
            </label>

            <div className="commit-diff">
              <div className="commit-diff-head">
                <code>{path}</code>
                {diff && (diff.added > 0 || diff.removed > 0) && (
                  <span className="commit-stat">
                    +{diff.added} -{diff.removed}
                  </span>
                )}
              </div>
              {diff && diff.text ? (
                <pre>{diff.text}</pre>
              ) : (
                <span className="commit-dim">No textual changes.</span>
              )}
            </div>

            {error && <div className="commit-error">{error}</div>}

            <div className="dialog-actions">
              <button type="button" className="btn" onClick={onClose} disabled={busy}>
                Cancel
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={onCommit}
                disabled={busy || !message.trim()}
              >
                {busy ? "Committing..." : "Commit"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
