// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";

/** Drop local file URLs: an http page cannot follow them, and Firefox logs a
 * security error when a link tries. Relative/forge links keep working. */
function safeUrlTransform(url: string): string {
  if (/^file:/i.test(url.trim())) return "";
  return defaultUrlTransform(url);
}

/** A fence holding markdown (links / list items) — even language-tagged — is a
 * model formatting slip: unwrap it so the GFM renderer can render it. */
function looksLikeMarkdown(code: string): boolean {
  return /\]\(https?:\/\//.test(code) || /^\s*(?:[-*+]|\d+[.)])\s+/m.test(code);
}

function unwrapMarkdownFences(text: string): string {
  return text.replace(
    /```(\w*)\n([\s\S]*?)\n?```/g,
    (match, lang: string, code: string) =>
      /^(markdown|md)$/i.test(lang) || looksLikeMarkdown(code) ? code : match,
  );
}

/** Markdown via react-markdown + GFM (tables, task lists, strikethrough,
 * autolinks). Links open in a new tab. */
export function Markdown({ text }: { text: string }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={safeUrlTransform}
        components={{
          a: ({ node: _node, ...props }) => (
            <a {...props} target="_blank" rel="noreferrer" />
          ),
        }}
      >
        {unwrapMarkdownFences(text)}
      </ReactMarkdown>
    </div>
  );
}
