import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BARS, verdict } from "../verdict.mjs";

const PREREG = readFileSync(new URL("../PREREGISTRATION.md", import.meta.url), "utf8");

const roam = (xA, xU, medB) => ({ xA, xU, medB });
const gateOk = { ok: true };

test("every bar string quoted by the verdict occurs verbatim in PREREGISTRATION.md", () => {
  for (const s of Object.values(BARS)) assert.ok(PREREG.includes(s), `missing from PREREGISTRATION.md: ${s}`);
});

test("PASS when the tour clears 0.5 and the median margin over the best control is at least 0.15", () => {
  const r = verdict({ gate: gateOk, tourXA: 0.6, roams: [roam(0.8, 0.3, 0.2), roam(0.7, 0.4, 0.1), roam(0.9, 0.5, 0.2)] });
  assert.equal(r.verdict, "PASS");
});

test("DEAD when the median margin is at most 0.05", () => {
  const r = verdict({ gate: gateOk, tourXA: 0.9, roams: [roam(0.5, 0.46, 0.2), roam(0.6, 0.56, 0.3), roam(0.4, 0.3, 0.1)] });
  assert.equal(r.verdict, "DEAD");
});

test("DEAD when the median X_A over roams is below 0.2", () => {
  const r = verdict({ gate: gateOk, tourXA: 0.9, roams: [roam(0.1, 0, 0), roam(0.15, 0, 0), roam(0.18, 0, 0)] });
  assert.equal(r.verdict, "DEAD");
});

test("UNRESOLVED between the bars", () => {
  const r = verdict({ gate: gateOk, tourXA: 0.6, roams: [roam(0.4, 0.3, 0.2), roam(0.42, 0.3, 0.2), roam(0.45, 0.3, 0.2)] });
  assert.equal(r.verdict, "UNRESOLVED");
});

test("UNRESOLVED when the tour is under 0.5 even with a clean margin", () => {
  const r = verdict({ gate: gateOk, tourXA: 0.4, roams: [roam(0.9, 0.2, 0.2), roam(0.9, 0.2, 0.2), roam(0.9, 0.2, 0.2)] });
  assert.equal(r.verdict, "UNRESOLVED");
});

test("VOID when the known-answer gate fails, whatever the numbers say", () => {
  const r = verdict({ gate: { ok: false }, tourXA: 0.9, roams: [roam(0.9, 0, 0), roam(0.9, 0, 0), roam(0.9, 0, 0)] });
  assert.equal(r.verdict, "VOID");
});
