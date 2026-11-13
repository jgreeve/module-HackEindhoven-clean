import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(import.meta.url);

export function installedManifestPath(name) {
  for (const path of require.resolve.paths(name) ?? []) {
    const manifest = join(path, name, "package.json");
    if (existsSync(manifest)) return manifest;
  }
  throw new Error(`Package ${name} is not installed. Run npm ci from the repository root.`);
}
