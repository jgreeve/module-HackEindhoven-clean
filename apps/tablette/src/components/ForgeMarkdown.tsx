// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";

// Allow heading ids (rehype-slug) and class names through sanitization.
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] ?? []), "id", "className"],
  },
};

const EXTERNAL = /^[a-z][a-z0-9+.-]*:/i;

interface Props {
  text: string;
  /** Handle an in-repo relative link (e.g. another .md page). Return true if handled. */
  onNavigate?: (href: string) => boolean;
  /** Base URL used to resolve relative images (forge raw directory URL). */
  imageBase?: string;
}

/** Markdown renderer for forge content: GFM, sanitized, heading anchors, and
 * relative link/image resolution against the current document. */
export function ForgeMarkdown({ text, onNavigate, imageBase }: Props) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, schema], rehypeSlug]}
        components={{
          a: ({ node: _node, href, children, ...props }) => {
            const h = href ?? "";
            const internal = onNavigate && !EXTERNAL.test(h) && !h.startsWith("#");
            if (internal) {
              return (
                <a
                  {...props}
                  href={h}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate?.(h);
                  }}
                >
                  {children}
                </a>
              );
            }
            return (
              <a {...props} href={h} target="_blank" rel="noreferrer">
                {children}
              </a>
            );
          },
          img: ({ node: _node, src, ...props }) => {
            const s = src ?? "";
            const resolved =
              imageBase && !EXTERNAL.test(s) && !s.startsWith("/")
                ? `${imageBase}/${s}`
                : s;
            return <img {...props} src={resolved} loading="lazy" />;
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
