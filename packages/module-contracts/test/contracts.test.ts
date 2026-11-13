import assert from "node:assert/strict";
import test from "node:test";
import { collectModuleSamples } from "../src/index.ts";
import type { ModuleSample, ProjectModule } from "../src/index.ts";

const sample: ModuleSample = {
  id: "example", title: "Example", description: "Example", html: "<h1>Example</h1>", created: "2026-11-13",
};
function descriptor(samples = [sample]): ProjectModule {
  return {
    id: "example", label: "Example", description: "Example", version: "0.1.0",
    docs: "/modules/example", modes: ["sketch"], defaultEnabled: true,
    dataSources: [], attribution: [], prompt: "", createTools: () => ({}), samples,
  };
}
test("disabled module samples are excluded", () => {
  assert.deepEqual(collectModuleSamples([descriptor()], new Set()), []);
  assert.deepEqual(collectModuleSamples([descriptor()], new Set(["example"])), [sample]);
});
test("foreign sample ids and duplicate ids fail with an actionable error", () => {
  assert.throws(() => collectModuleSamples([descriptor([{ ...sample, id: "other" }])], new Set(["example"])), /prefixed/);
  assert.throws(() => collectModuleSamples([descriptor([sample, sample])], new Set(["example"])), /Duplicate/);
});
