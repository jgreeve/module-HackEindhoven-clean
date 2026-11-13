import { tool } from "ai";
import { z } from "zod";
import type { ModuleContext } from "@tablette/module-sdk";
import { eindhovenSample } from "./sample";

export function createEindhovenTools(ctx: ModuleContext) {
  return {
    eindhoven_open_map: tool({
      description: "Open the Eindhoven districts, neighbourhoods and live permits map in the workspace. This opens a map, not an import of current permit records into the chat.",
      inputSchema: z.object({}),
      execute: async () => {
        if (!ctx.workspace || !ctx.runApp) throw new Error("The host must provide a workspace and Viewer.");
        const path = "maps/eindhoven.html";
        await ctx.workspace.writeFile(path, eindhovenSample.html);
        await ctx.workspace.openFile(path);
        const ok = ctx.runApp();
        ctx.markRun?.(ok);
        ctx.setMode?.("sketch", "handoff");
        return { ok, path, source: "https://data.eindhoven.nl/" };
      },
    }),
  };
}
