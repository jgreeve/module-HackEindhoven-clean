import { readdirSync, readFileSync } from "node:fs";
import { dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
function scan(directory, packageRoot) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) { scan(path, packageRoot); continue; }
    if (![".ts", ".tsx", ".js", ".mjs"].includes(extname(path))) continue;
    const text = readFileSync(path, "utf8");
    const imports = text.matchAll(/\b(?:from\s*|import\s*\(\s*|require\s*\(\s*|import\s*)["']([^"']+)["']/g);
    for (const [, specifier] of imports) {
      if (!specifier.startsWith(".")) continue;
      const target = relative(packageRoot, resolve(dirname(path), specifier));
      if (target.startsWith("..") || isAbsolute(target)) {
        failures.push(`${relative(root, path)} imports outside its package: ${specifier}. Use a public package contract instead.`);
      }
    }
  }
}
for (const entry of readdirSync(join(root, "packages"), { withFileTypes: true })) {
  if (entry.isDirectory()) {
    const packageRoot = join(root, "packages", entry.name);
    scan(join(packageRoot, "src"), packageRoot);
  }
}
if (failures.length) throw new Error(failures.join("\n"));
console.log("Module source imports stay within package boundaries.");
