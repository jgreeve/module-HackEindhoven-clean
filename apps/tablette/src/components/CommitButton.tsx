// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

import { useCallback, useEffect, useState } from "react";
import * as session from "../modules/bimr/session";
import * as workspace from "../forge/workspace";
import * as git from "../forge/git";
import * as forge from "../forge/forgejo";
import { ensureSandbox } from "../forge/sandbox";
import { simpleDiff } from "../forge/diff";
import type { LineDiff } from "../forge/diff";
import { fallbackMessage, generateCommitMessage } from "../agent/commit";
import { record } from "../agent/trace";
import { CommitModal } from "./CommitModal";
import type { CommitResult } from "./CommitModal";

interface Props {
  activePath: string;
  /** Only shown in the editor view. */
  enabled: boolean;
}

/** Floating, dirty-only commit button at the editor's bottom-right corner. */
export function CommitButton({ activePath, enabled }: Props) {
  const [dirty, setDirty] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [diff, setDiff] = useState<LineDiff | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CommitResult | null>(null);

  const refresh = useCallback(() => {
    void git
      .isDirty(activePath)
      .then(setDirty)
      .catch(() => setDirty(false));
  }, [activePath]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Poll for dirty state: covers the boot-time git init and external changes.
  useEffect(() => {
    const id = setInterval(refresh, 2000);
    return () => clearInterval(id);
  }, [refresh]);

  // Recompute dirty shortly after the file content changes (editor or agent).
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = session.subscribePython(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(refresh, 300);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsub();
    };
  }, [refresh]);

  const openModal = useCallback(async () => {
    setOpen(true);
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const before = (await git.readHead(activePath)) ?? "";
      const after = await workspace.readFile(activePath);
      const d = simpleDiff(before, after);
      setDiff(d);
      setMessage(await generateCommitMessage({ path: activePath, diff: d.text }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setMessage(fallbackMessage(activePath));
    } finally {
      setBusy(false);
    }
  }, [activePath]);

  const doCommit = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const msg = message.trim() || fallbackMessage(activePath);
      const oid = await git.commitPaths([activePath], msg);
      record("commit", `${activePath} ${oid.slice(0, 7)}`);

      const info = await (async () => {
        let ri = await git.repoInfo();
        if (!ri) {
          // Connect the workspace to the sandbox so the commit can reach the forge.
          await ensureSandbox();
          ri = await git.repoInfo();
        }
        return ri;
      })();
      let url: string | null = null;
      let pushed = false;
      let failure: string | null = null;

      if (info) {
        try {
          await git.push();
          pushed = true;
          url = git.commitUrl(info, oid);
        } catch (pushErr) {
          // Divergent / no fast-forward: publish the file via the contents API.
          try {
            const content = await workspace.readFile(activePath);
            await forge.putFile(info.owner, info.repo, activePath, content, msg);
            const branch = (await git.currentBranch()) ?? "main";
            url = git.fileUrl(info, branch, activePath);
            pushed = true;
          } catch (pubErr) {
            const p = pushErr instanceof Error ? pushErr.message : String(pushErr);
            const q = pubErr instanceof Error ? pubErr.message : String(pubErr);
            failure = `push failed (${p}); publish failed (${q})`;
          }
        }
      }

      if (failure) setError(`Committed locally; ${failure}`);
      setResult({ oid, url, pushed });
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [activePath, message]);

  const close = useCallback(() => {
    if (busy) return;
    setOpen(false);
    refresh();
  }, [busy, refresh]);

  if (!enabled || !dirty) return null;

  return (
    <>
      <button
        type="button"
        className="commit-fab"
        title="Commit changes"
        aria-label="Commit changes"
        onClick={() => void openModal()}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <circle cx="12" cy="12" r="6" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <CommitModal
          path={activePath}
          message={message}
          onMessageChange={setMessage}
          diff={diff}
          busy={busy}
          error={error}
          result={result}
          onCommit={() => void doCommit()}
          onClose={close}
        />
      )}
    </>
  );
}
