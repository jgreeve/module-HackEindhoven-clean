// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

interface Props {
  files: string[];
  activePath: string;
  onOpen: (path: string) => void;
}

interface TreeNode {
  name: string;
  path: string;
  children: TreeNode[];
}

function buildTree(files: string[]): TreeNode[] {
  const root: TreeNode = { name: "", path: "", children: [] };
  for (const file of files) {
    const parts = file.split("/");
    let node = root;
    let acc = "";
    for (const part of parts) {
      acc = acc ? `${acc}/${part}` : part;
      let child = node.children.find((c) => c.name === part);
      if (!child) {
        child = { name: part, path: acc, children: [] };
        node.children.push(child);
      }
      node = child;
    }
  }
  return root.children;
}

function renderNodes(
  nodes: TreeNode[],
  depth: number,
  activePath: string,
  onOpen: (path: string) => void,
): ReactNode {
  return nodes.map((node) =>
    node.children.length > 0 ? (
      <li key={node.path}>
        <div className="file-dir" style={{ paddingLeft: 8 + depth * 12 }}>
          {node.name}
        </div>
        <ul className="file-list">{renderNodes(node.children, depth + 1, activePath, onOpen)}</ul>
      </li>
    ) : (
      <li key={node.path}>
        <button
          type="button"
          className={`file-item ${node.path === activePath ? "active" : ""}`}
          style={{ paddingLeft: 8 + depth * 12 }}
          onClick={() => onOpen(node.path)}
          title={node.path}
        >
          {node.name}
        </button>
      </li>
    ),
  );
}

/** Workspace file tree popover (multi-file navigation). */
export function FileMenu({ files, activePath, onOpen }: Props) {
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
    <div className="file-menu" ref={ref}>
      <button
        type="button"
        className="icon-btn"
        title="Workspace files"
        aria-label="Workspace files"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
        </svg>
      </button>
      {open && (
        <div className="file-pop">
          <div className="file-pop-head">Files</div>
          {files.length === 0 ? (
            <div className="file-empty">(no files)</div>
          ) : (
            <ul className="file-list">
              {renderNodes(buildTree(files), 0, activePath, (p) => {
                onOpen(p);
                setOpen(false);
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
