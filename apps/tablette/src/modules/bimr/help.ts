// SPDX-FileCopyrightText: 2026 Milovann Yanatchkov
// SPDX-License-Identifier: MIT

// src/modules/bimr/help.ts — read the BIMR help page published on bimr.net.
//
// bimr.net is a static site whose HTML embeds the help dialog (entities,
// operators and editor commands). It sends no CORS headers, so the fetch is
// routed through the same-origin proxy when one is available (see
// ../forge/proxy). The parsed text grounds the agent's BIMR knowledge; the
// runtime vocabulary from @bimr/web stays authoritative.

import { proxiedUrl } from "../../forge/proxy.ts";

export const BIMR_SITE = "https://bimr.net/";

/** Extract the help dialog as readable text from the bimr.net HTML. */
export function parseBimrHelp(html: string): string | null {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const body = doc.querySelector("#help-dialog-body");
  if (!body) return null;

  const lines: string[] = [];
  const intro = body.querySelector(".help-intro")?.textContent?.trim();
  if (intro) lines.push(intro);

  for (const section of body.querySelectorAll(".help-section")) {
    const title = section.querySelector("h3")?.textContent?.trim();
    if (title) lines.push(`\n## ${title}`);
    for (const row of section.querySelectorAll("tr")) {
      const cells = [...row.querySelectorAll("td")].map((c) => c.textContent?.trim() ?? "");
      if (cells.length >= 2) lines.push(`- ${cells[0]} — ${cells[1]}`);
    }
  }

  const text = lines.join("\n").trim();
  return text || null;
}

let cache: Promise<string> | null = null;

/** Fetch and parse the BIMR help page (cached). Throws when unreachable. */
export function fetchBimrHelp(): Promise<string> {
  if (!cache) {
    cache = load().catch((e) => {
      cache = null;
      throw e;
    });
  }
  return cache;
}

async function load(): Promise<string> {
  const res = await fetch(proxiedUrl(BIMR_SITE), { headers: { Accept: "text/html" } });
  if (!res.ok) throw new Error(`bimr.net responded HTTP ${res.status}`);
  const help = parseBimrHelp(await res.text());
  if (!help) throw new Error("help section not found on bimr.net");
  return help;
}
