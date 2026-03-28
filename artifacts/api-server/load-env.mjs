import { existsSync, readFileSync } from "node:fs";
import { parse } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Walk from `startDir` toward filesystem root; collect `.env` paths (deepest first). */
function walkUpEnvPaths(startDir) {
  const found = [];
  let dir = resolve(startDir);
  for (let i = 0; i < 16; i++) {
    const p = resolve(dir, ".env");
    if (existsSync(p)) found.push(p);
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Load monorepo root first, package-local last (overrides).
  return found.reverse();
}

function applyEnvFile(path) {
  let src = readFileSync(path, "utf8");
  if (src.charCodeAt(0) === 0xfeff) src = src.slice(1);
  const parsed = parse(src);
  for (const [k, v] of Object.entries(parsed)) {
    if (v !== undefined) process.env[k] = v;
  }
}

for (const p of walkUpEnvPaths(__dirname)) {
  applyEnvFile(p);
}
