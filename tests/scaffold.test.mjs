import assert from "node:assert/strict";
import test from "node:test";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createModule } from "../scripts/create-module.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
function copyTree(source, target) {
  mkdirSync(target, { recursive: true });
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    if (entry.isDirectory()) copyTree(join(source, entry.name), join(target, entry.name));
    else copyFileSync(join(source, entry.name), join(target, entry.name));
  }
}
test("scaffolding registers an independent package and refuses collisions/path traversal", (t) => {
  const fixture = mkdtempSync(join(tmpdir(), "hackeindhoven-scaffold-"));
  t.after(() => rmSync(fixture, { recursive: true, force: true }));
  copyTree(join(root, "templates"), join(fixture, "templates"));
  mkdirSync(join(fixture, "apps", "tablette"), { recursive: true });
  writeFileSync(join(fixture, "apps", "tablette", "package.json"), JSON.stringify({ dependencies: {} }));
  createModule(fixture, "green-spaces");
  const manifest = JSON.parse(readFileSync(join(fixture, "packages", "module-green-spaces", "package.json"), "utf8"));
  assert.equal(manifest.studioModule.id, "green-spaces");
  assert.equal(manifest.name, "@tablette/module-green-spaces");
  const app = JSON.parse(readFileSync(join(fixture, "apps", "tablette", "package.json"), "utf8"));
  assert.equal(app.dependencies[manifest.name], manifest.version);
  assert.throws(() => createModule(fixture, "green-spaces"), /already exists/);
  assert.throws(() => createModule(fixture, "../outside"), /Usage/);

  symlinkSync(join(root, "node_modules"), join(fixture, "node_modules"), process.platform === "win32" ? "junction" : "dir");
  copyFileSync(join(root, "tsconfig.base.json"), join(fixture, "tsconfig.base.json"));
  mkdirSync(join(fixture, "scripts"));
  copyFileSync(join(root, "scripts", "module-vite-config.ts"), join(fixture, "scripts", "module-vite-config.ts"));
  const cwd = join(fixture, "packages", "module-green-spaces");
  for (const args of [
    [join(root, "node_modules", "vite", "bin", "vite.js"), "build"],
    [join(root, "node_modules", "typescript", "bin", "tsc"), "-p", "tsconfig.build.json"],
  ]) {
    const result = spawnSync(process.execPath, args, { cwd, encoding: "utf8" });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  }
});
