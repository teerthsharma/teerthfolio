import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { selectContributions } from "./extract-contributions.mjs";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/contributions.allow.fixture.json", import.meta.url), "utf8"));
const out = selectContributions(fixture);
const keys = out.map((e) => `${e.repo}#${e.pr}`);

test("a CLOSED PR without landedCommit does not reach the output", () => {
  assert.equal(keys.includes("example/closed-candidate#1"), false);
});

test("a CLOSED PR with landedCommit is shown as landed, linked by commit", () => {
  const row = out.find((e) => `${e.repo}#${e.pr}` === "example/landed-import#7");
  assert.deepEqual(row, {
    repo: "example/landed-import",
    pr: 7,
    title: "Landed by a Google import, PR closed",
    state: "CLOSED",
    status: "landed",
    commit: "3d5df1da699b",
    url: "https://github.com/example/landed-import/commit/3d5df1da699b",
  });
});

test("openxla/xla#46539 and facebook/pyrefly#4180 are absent", () => {
  assert.equal(keys.includes("openxla/xla#46539"), false);
  assert.equal(keys.includes("facebook/pyrefly#4180"), false);
});

test("private-repo PRs are absent", () => {
  assert.equal(out.some((e) => e.repo === "teerthsharma/Yuddh-Niti"), false);
});

test("held PRs are absent even when OPEN", () => {
  assert.equal(keys.includes("example/held-open#2"), false);
});

test("exactly the public, unheld MERGED, OPEN and landed PRs remain", () => {
  assert.deepEqual(keys, ["google-deepmind/mujoco#3396", "google/XNNPACK#10801", "triton-lang/kernels#22", "example/landed-import#7"]);
});
