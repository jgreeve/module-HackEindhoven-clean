// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

import type { Proposal, ProposalChoice, ProposalOption } from "../agent/proposal";

interface Props {
  proposals: Proposal[];
  /** The user's choice once made (collapses the card to its outcome). */
  resolved?: ProposalChoice | null;
  onChoose: (proposalId: string, option: ProposalOption) => void;
}

function Preview({ proposal }: { proposal: Proposal }) {
  const preview = proposal.preview;
  if (!preview) return null;
  if (preview.type === "files") {
    return (
      <ul className="proposal-files">
        {preview.content.map((f, i) => (
          <li key={i}>
            <code className="md-code">{f}</code>
          </li>
        ))}
      </ul>
    );
  }
  return <pre className="proposal-preview">{preview.content}</pre>;
}

/** Renders one or more proposals as clickable options. */
export function ProposalCard({ proposals, resolved, onChoose }: Props) {
  return (
    <div className="proposal">
      {proposals.map((p) => {
        const choice = resolved && resolved.proposalId === p.id ? resolved : null;
        const chosen = choice
          ? p.options.find((o) => o.id === choice.optionId)?.label ?? choice.optionId
          : null;
        return (
          <div className={`proposal-card ${choice ? "resolved" : ""}`} key={p.id}>
            <div className="proposal-title">{p.title}</div>
            {p.summary && <div className="proposal-summary">{p.summary}</div>}
            {p.steps && p.steps.length > 0 && (
              <ol className="proposal-steps">
                {p.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            )}
            <Preview proposal={p} />
            {choice ? (
              <div className="proposal-resolved">chosen: {chosen}</div>
            ) : (
              <div className="proposal-options">
                {p.options.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    className={`btn ${o.variant === "primary" ? "primary" : o.variant === "danger" ? "danger" : ""}`}
                    onClick={() => onChoose(p.id, o)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
