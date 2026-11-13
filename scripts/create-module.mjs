import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
export function createModule(root, id) {
  if (!id || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(id)) {
    throw new Error("Usage: npm run create:module -- <lowercase-module-id>");
  }
  const packageName = `@tablette/module-${id}`;
  const appManifestPath = join(root, "apps", "tablette", "package.json");
  const app = JSON.parse(readFileSync(appManifestPath, "utf8"));
  const target = join(root, "packages", `module-${id}`);
  if (existsSync(target) || app.dependencies[packageName]) {
    throw new Error(`Module ${id} already exists or is already installed.`);
  }
  function renderDirectory(source, destination) {
    mkdirSync(destination, { recursive: true });
    for (const entry of readdirSync(source, { withFileTypes: true })) {
      const from = join(source, entry.name);
      const to = join(destination, entry.name);
      if (entry.isDirectory()) renderDirectory(from, to);
      else writeFileSync(to, readFileSync(from, "utf8").replaceAll("__MODULE_ID__", id));
    }
  }
  renderDirectory(join(root, "templates", "module"), target);
  app.dependencies[packageName] = "0.1.0";
  app.dependencies = Object.fromEntries(Object.entries(app.dependencies).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(appManifestPath, `${JSON.stringify(app, null, 2)}\n`);
  console.log(`Created packages/module-${id} and registered ${packageName}.\nNext: npm install, then npm run check. Open it through Explore → Modules.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  createModule(root, process.argv[2]);
}
