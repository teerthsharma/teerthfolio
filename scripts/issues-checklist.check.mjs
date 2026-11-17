// node scripts/issues-checklist.check.mjs : the issues page builder on two fake docks and the real umbrella file.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildChecklist } from "./issues-checklist.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const umbrella = JSON.parse(readFileSync(path.join(root, "lib/anime/accept/_umbrella.json"), "utf8"));

const accepts = [
  {
    dock: "p-fake-a", issue: 16, clock: {}, budget: {}, every: [],
    stills: [{ t: 4.0, role: "money", tests: [
      { id: "16.1", stage: "L", kind: "disc", hMin: 0.4, hMax: 0.6, src: "#16 L481" },
      { id: "16.2", stage: "C", kind: "custom", src: "#16 L483" },
      { id: "16.3", stage: "P", kind: "hue", src: "#16 L485" },
    ] }],
    manual: [{ id: "16.8", text: "Blue and Red meet by eye", src: "#16 L488" }],
  },
  {
    dock: "p-fake-b", issue: 19, clock: {}, budget: {}, stills: [], manual: [],
    every: [{ id: "19.1", stage: "L", kind: "beam", src: "#19 L430" }],
  },
];
const results = [
  { dock: "p-fake-a", issue: 16, sha: "abc1234", adapter: "fake", results: [
    { id: "16.1", t: 4.0, status: "pass", measured: 0.5, expected: 0.4 },
  ] },
  { dock: "p-fake-b", issue: 19, sha: "abc1234", adapter: "fake", results: [
    { id: "19.1", t: 0, status: "fail", measured: 0.1, expected: 0.7, note: "short" },
  ] },
];

const { markdown, totals } = buildChecklist({ accepts, results, umbrella, sha: "abc1234", date: "2026-11-10" });

const lines = markdown.split("\n");
const row = (id) => {
  const hit = lines.find((l) => l.startsWith(`| ${id} |`));
  assert.ok(hit, `row ${id} present`);
  return hit;
};
const section = (n) => {
  const start = lines.findIndex((l) => l.startsWith(`## #${n} `));
  assert.ok(start >= 0, `section #${n} present`);
  const next = lines.findIndex((l, i) => i > start && l.startsWith("## #"));
  return lines.slice(start, next < 0 ? undefined : next).join("\n");
};

assert.match(row("16.1"), /\| passed \|/, "a pass result is passed");
assert.match(row("16.2"), /\| owner's eye \|/, "a custom test is owner's eye");
assert.match(row("16.3"), /\| not run \|/, "a test with no result is not run");
assert.doesNotMatch(row("16.3"), /passed/, "a test with no result is never passed");
assert.match(row("16.8"), /\| owner's eye \|/, "a manual item is owner's eye");
assert.match(row("19.1"), /\| failed \|/, "a fail result is failed");
assert.match(section(16), /Ready to close: no \(0 failed, 1 not run\)/);
assert.match(section(19), /Ready to close: no \(1 failed, 0 not run\)/);

const issueOrder = lines.filter((l) => l.startsWith("## #")).map((l) => Number(l.match(/^## #(\d+)/)[1]));
assert.deepEqual(issueOrder, [...issueOrder].sort((a, b) => a - b), "sections in issue-number order");
for (const n of [10, 12, 13]) {
  assert.ok(umbrella.issues.some((i) => i.issue === n), `umbrella #${n} in the real file`);
  assert.match(section(n), /\| owner's eye \|/, `umbrella #${n} rows are owner's eye`);
}
const umbrellaRows = umbrella.issues.reduce((sum, i) => sum + i.rows.length, 0);
assert.equal(totals.passed, 1);
assert.equal(totals.failed, 1);
assert.equal(totals["not run"], 1);
assert.equal(totals["owner's eye"], 2 + umbrellaRows);
assert.match(markdown, /sha `?abc1234/, "header carries the sha");

console.log("issues-checklist.check: ok");
