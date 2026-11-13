// SPDX-License-Identifier: MIT
import { tool } from "ai";
import { z } from "zod";
import type { ModuleContext } from "@tablette/module-sdk";
import { projects } from "./data";
import { getStore } from "./store";
import { matchingPlaces } from "./search";
export function createTools(ctx: ModuleContext) {
  return {
    "fellenoord-samen_search": tool({
      description: "Find demo Fellenoord projects and locally stored ideas using short Dutch search terms (e.g. groen, fietsen, wonen). Returns up to 8 places. No official consultation or external lookup.",
      inputSchema: z.object({ query: z.string().max(200).default(""), kind: z.enum(["project", "idea", "all"]).default("all") }),
      execute: async ({ query, kind }) => {
        const start = ctx.now();
        try {
          const { data, error } = getStore().getSnapshot();
          if (error) return `error: ${error}`;
          const all = [...projects, ...data.ideas].filter(p => kind === "all" || p.kind === kind);
          const matches = matchingPlaces(all, query);
          ctx.trace("fellenoord-samen_search", start, `${matches.length} local matches`);
          return JSON.stringify({ demo: true, localOnly: true, total: matches.length, places: matches.slice(0, 8).map(p => ({ id: p.id, kind: p.kind, title: p.title, category: p.category, location: p.location, description: p.description, position: p.position })), navigation: "Explore → Modules → Fellenoord Samen → Open" });
        } catch { return "error: local discovery unavailable"; }
      },
    }),
    "fellenoord-samen_detail": tool({
      description: "Read a demo project/idea and up to 30 local comments by its search result id. Optionally select it in an already open Fellenoord Samen Surface. Cannot navigate the host or publish feedback.",
      inputSchema: z.object({ id: z.string().min(1).max(100), select: z.boolean().default(false) }),
      execute: async ({ id, select }) => {
        const start = ctx.now();
        try {
          const store = getStore(); const { data, error } = store.getSnapshot();
          if (error) return `error: ${error}`;
          const place = [...projects, ...data.ideas].find(p => p.id === id);
          if (!place) return "error: unknown Fellenoord demo place id";
          if (select) store.focus(id);
          const comments = data.comments.filter(c => c.targetId === id);
          ctx.trace("fellenoord-samen_detail", start, id);
          return JSON.stringify({ demo: true, localOnly: true, place, comments: comments.slice(-30), totalComments: comments.length, selectionRequested: select, navigation: "Explore → Modules → Fellenoord Samen → Open; selection is applied when the Surface is open." });
        } catch { return "error: local detail unavailable"; }
      },
    }),
  };
}
