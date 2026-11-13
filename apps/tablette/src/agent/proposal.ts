// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/agent/proposal.ts — the proposal / approval primitive.
//
// A Proposal is a serializable decision the agent hands to the user: a title,
// an optional preview, and clickable options. It is UI-agnostic.

export type ProposalVariant = "primary" | "danger" | "default";

export interface ProposalOption {
  id: string;
  label: string;
  variant?: ProposalVariant;
  /** Tool call to run if chosen (same tool names the agent uses). */
  action?: { tool: string; args: Record<string, unknown> };
}

export type ProposalKind =
  | "plan"
  | "choose-repo"
  | "create-repo"
  | "clone"
  | "commit"
  | "push"
  | "open-pr"
  | "switch-mode"
  | "generic";

export type ProposalPreview =
  | { type: "diff"; content: string }
  | { type: "files"; content: string[] }
  | { type: "markdown"; content: string };

export interface Proposal {
  id: string;
  kind: ProposalKind;
  title: string;
  summary?: string;
  options: ProposalOption[];
  preview?: ProposalPreview;
  /** For `plan`: the ordered steps the agent intends to take. */
  steps?: string[];
}

/** The user's answer to a proposal (what `propose_actions` returns). */
export interface ProposalChoice {
  proposalId: string;
  optionId: string;
}
