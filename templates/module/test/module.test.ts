import assert from "node:assert/strict";
import test from "node:test";
import { validateModules } from "@tablette/module-sdk";
import { moduleDescriptor } from "../dist/index.js";

test("module descriptor implements the shared SDK contract", () => {
  assert.deepEqual(validateModules([moduleDescriptor]), []);
});
