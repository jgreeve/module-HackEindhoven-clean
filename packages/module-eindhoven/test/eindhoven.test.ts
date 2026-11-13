import assert from "node:assert/strict";
import test from "node:test";
import { Script } from "node:vm";
import { validateModules } from "@tablette/module-sdk";
import type { ModuleContext } from "@tablette/module-sdk";
import { eindhovenModule, eindhovenSample } from "../dist/index.js";

function context(): ModuleContext {
  return { enabled: new Set(["eindhoven"]), settings: {}, credits: [], trace: () => {}, now: () => 0, fetch: globalThis.fetch };
}
test("descriptor is SDK-compatible and contains a runnable single-file map", () => {
  assert.deepEqual(validateModules([eindhovenModule]), []);
  assert.equal(eindhovenModule.samples?.[0].id, "eindhoven");
  const inlineScripts = [...eindhovenSample.html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.ok(inlineScripts.length > 0);
  for (const match of inlineScripts) new Script(match[1]);
});
test("opening a map uses injected host capabilities in the correct order", async () => {
  const calls: string[] = [];
  const ctx = context();
  ctx.workspace = {
    listFiles: async () => [], exists: async () => false, readFile: async () => "", subscribeFiles: () => () => {},
    writeFile: async (path, content) => { assert.equal(content, eindhovenSample.html); calls.push(`write:${path}`); },
    openFile: async (path) => { calls.push(`open:${path}`); },
  };
  ctx.runApp = () => { calls.push("run"); return true; };
  ctx.setMode = (mode) => { calls.push(`mode:${mode}`); };
  const result = await eindhovenModule.createTools(ctx).eindhoven_open_map.execute?.({}, { toolCallId: "test", messages: [] });
  assert.deepEqual(calls, ["write:maps/eindhoven.html", "open:maps/eindhoven.html", "run", "mode:sketch"]);
  assert.deepEqual(result, { ok: true, path: "maps/eindhoven.html", source: "https://data.eindhoven.nl/" });
});
test("missing host fails before doing any workspace work", async () => {
  const action = eindhovenModule.createTools(context()).eindhoven_open_map;
  await assert.rejects(async () => action.execute?.({}, { toolCallId: "test", messages: [] }), /host must provide/);
});
