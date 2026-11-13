import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const command = process.argv[2];
if (!["build", "typecheck", "test"].includes(command)) {
  throw new Error("Usage: node scripts/modules.mjs build|typecheck|test");
}
const packages = new Map(
  readdirSync(join(root, "packages"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const manifest = JSON.parse(readFileSync(join(root, "packages", entry.name, "package.json"), "utf8"));
      return [manifest.name, manifest];
    }),
);
const visited = new Set();
const visiting = new Set();
const ordered = [];
function visit(name) {
  if (visited.has(name)) return;
  if (visiting.has(name)) throw new Error(`Workspace dependency cycle: ${name}`);
  visiting.add(name);
  const pkg = packages.get(name);
  for (const dependency of Object.keys({ ...pkg.dependencies, ...pkg.peerDependencies })) {
    if (packages.has(dependency)) visit(dependency);
  }
  visiting.delete(name);
  visited.add(name);
  ordered.push(pkg);
}
for (const name of [...packages.keys()].sort()) visit(name);
for (const pkg of ordered) {
  if (!pkg.scripts?.[command]) throw new Error(`${pkg.name} must define a ${command} script`);
  const result = spawnSync("npm", ["run", command, `--workspace=${pkg.name}`], {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
