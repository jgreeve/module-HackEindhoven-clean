// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/forge/sandbox.ts — the default sketch sandbox.
//
// The workspace is backed by the `bimr/sandbox` repo so the default
// `sketches/sketch.py` and anything written by the modes commits to the forge.
// The bot works under `sketches/` and commits straight to trunk (main).

import * as git from "./git";
import * as forge from "./forgejo";
import * as workspace from "./workspace";
import { forgeAuth } from "./auth";

export const SANDBOX_REPO = "bimr/sandbox";

/** Make the workspace a git repo connected to the sandbox (idempotent). */
export async function ensureSandbox(): Promise<void> {
  const auth = forgeAuth();

  if (await git.isRepo()) {
    // Already a repo: make sure it has a remote so commits can reach the forge.
    if (auth && !(await git.repoInfo())) {
      try {
        await git.setRemote(forge.cloneUrl("bimr", "sandbox"));
      } catch (e) {
        console.error("[studio] sandbox remote:", e);
      }
    }
    await workspace.ensureDefaultFile();
    return;
  }

  if (auth) {
    try {
      await git.clone(forge.cloneUrl("bimr", "sandbox"));
      await workspace.ensureDefaultFile();
      return;
    } catch (e) {
      console.error("[studio] sandbox clone failed:", e);
    }
  }
  await git.init("main");
  await workspace.ensureDefaultFile();
}
