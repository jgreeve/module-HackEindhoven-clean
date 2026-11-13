// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

import { useCallback, useEffect, useState } from "react";
import * as workspace from "../forge/workspace";

/** Workspace file list + active file, shared by the top-bar buffer menu and
 * the GIS app pane. */
export function useWorkspace() {
  const [files, setFiles] = useState<string[]>([]);
  const [activePath, setActivePath] = useState(workspace.getActivePath());

  useEffect(() => {
    void workspace
      .listFiles()
      .then(setFiles)
      .catch((e) => console.error("[studio] list files", e));
    return workspace.subscribeFiles(setFiles);
  }, []);

  useEffect(() => {
    return workspace.subscribeFile((path) => {
      if (path === workspace.getActivePath()) setActivePath(path);
    });
  }, []);

  const open = useCallback(async (path: string) => {
    await workspace.openFile(path);
    setActivePath(path);
  }, []);

  return { files, activePath, open };
}
