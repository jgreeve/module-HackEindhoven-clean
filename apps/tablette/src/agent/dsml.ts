// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/agent/dsml.ts — recover DeepSeek "DSML" tool-call markup from text.
//
// Some providers/models (notably DeepSeek) can emit their native tool-call
// syntax as plain text instead of structured tool calls, e.g.
//
//   <｜DSML｜tool_calls>
//     <｜DSML｜invoke name="propose_actions">
//       <｜DSML｜parameter name="proposals" string="false">[{...}]</｜DSML｜parameter>
//     </｜DSML｜invoke>
//   </｜DSML｜tool_calls>
//
// The text stream then shows raw markup. This module strips it from rendered
// text and recovers the tool calls (so proposals can still be shown).

import type { Proposal } from "./proposal";

// Fullwidth vertical bar (U+FF5C) or ASCII pipe.
const B = "[\\uFF5C|]";

function tokenRe(): RegExp {
  return new RegExp(`<${B}DSML${B}[^>]*>|<\\/${B}DSML${B}[^>]*>`, "g");
}
function blockRe(): RegExp {
  return new RegExp(
    `<${B}DSML${B}tool_calls[^>]*>[\\s\\S]*?<\\/${B}DSML${B}tool_calls>`,
    "g",
  );
}
function invokeRe(): RegExp {
  return new RegExp(
    `<${B}DSML${B}invoke\\s+name="([^"]+)"[^>]*>([\\s\\S]*?)<\\/${B}DSML${B}invoke>`,
    "g",
  );
}
function paramRe(): RegExp {
  return new RegExp(
    `<${B}DSML${B}parameter\\s+name="([^"]+)"([^>]*)>([\\s\\S]*?)<\\/${B}DSML${B}parameter>`,
    "g",
  );
}

/** Whether the text contains DSML tool-call markup. */
export function hasDsml(text: string): boolean {
  return /[|｜]?\s*DSML/i.test(text);
}

/** Remove DSML tool-call markup (and the JSON it carries) from text. */
export function stripDsml(text: string): string {
  if (!hasDsml(text)) return text;
  let out = text.replace(blockRe(), "");
  out = out.replace(invokeRe(), "");
  out = out.replace(tokenRe(), "");
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

export interface DsmlToolCall {
  name: string;
  args: Record<string, unknown>;
}

/** Parse DSML tool-call invocations from text. */
export function extractDsmlToolCalls(text: string): DsmlToolCall[] {
  if (!hasDsml(text)) return [];
  const calls: DsmlToolCall[] = [];
  for (const invoke of text.matchAll(invokeRe())) {
    const name = invoke[1];
    const body = invoke[2];
    const args: Record<string, unknown> = {};
    for (const param of body.matchAll(paramRe())) {
      const key = param[1];
      const attrs = param[2];
      const content = param[3].trim();
      if (/string="true"/.test(attrs)) {
        args[key] = content;
      } else {
        try {
          args[key] = JSON.parse(content);
        } catch {
          args[key] = content;
        }
      }
    }
    calls.push({ name, args });
  }
  return calls;
}

/** Recover proposals from a leaked `propose_actions` DSML call. */
export function extractDsmlProposals(text: string): Proposal[] {
  for (const call of extractDsmlToolCalls(text)) {
    if (call.name === "propose_actions") {
      const proposals = (call.args as { proposals?: unknown }).proposals;
      if (Array.isArray(proposals)) return proposals as Proposal[];
    }
  }
  return [];
}
