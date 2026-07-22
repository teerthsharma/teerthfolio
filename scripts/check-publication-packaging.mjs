import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const readLines = (file) =>
  readFileSync(join(root, file), "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

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

console.log("Publication packaging contract passed: local evidence and review packages are excluded.");
