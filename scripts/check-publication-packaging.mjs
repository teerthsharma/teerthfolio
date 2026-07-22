import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const vercelConfigPath = join(root, "vercel.json");
const readLines = (file) =>
  readFileSync(join(root, file), "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

assert.ok(existsSync(vercelConfigPath), "root vercel.json must pin the deployment framework");
let vercelConfig;
assert.doesNotThrow(() => {
  vercelConfig = JSON.parse(readFileSync(vercelConfigPath, "utf8"));
}, "root vercel.json must parse as JSON");
assert.equal(vercelConfig.$schema, "https://openapi.vercel.sh/vercel.json");
assert.equal(vercelConfig.framework, "nextjs");

const gitignore = new Set(readLines(".gitignore"));
assert.ok(gitignore.has(".verification/"), ".gitignore must exclude local verification evidence");

const vercelignore = new Set(readLines(".vercelignore"));
for (const excludedPath of [
  ".verification/",
  "verification/",
  "donotcommit/",
  ".superpowers/sdd/review-*.diff",
]) {
  assert.ok(
    vercelignore.has(excludedPath),
    `.vercelignore must exclude ${excludedPath} from CLI deployment bundles`,
  );
}

console.log(
  "Publication packaging contract passed: Next.js is pinned and local evidence/review packages are excluded.",
);
