import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./extract-workbench.mjs", import.meta.url));
const fixture = (name) => fileURLToPath(new URL(`./fixtures/workbench/${name}`, import.meta.url));
const check = (file) => spawnSync(process.execPath, [script, "--check", "--from", file], { encoding: "utf8" });

test("check passes on the allowlisted fixture", () => {
  const r = check(fixture("allowlisted.json"));
  assert.equal(r.status, 0, r.stderr);
});

test("check fails on a fixture with a private repo, a fork and an unlisted repo", () => {
  const r = check(fixture("with-private.json"));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /teerthsharma\/tangle: private/);
  assert.match(r.stderr, /teerthsharma\/nerve: fork/);
  assert.match(r.stderr, /teerthsharma\/blog: not on the allowlist/);
});
