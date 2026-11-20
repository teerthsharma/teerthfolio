import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BARS, LIMIT, evaluate, walkNumbers } from "../neutral.mjs";

const PREREG = readFileSync(new URL("../PREREGISTRATION-T5.md", import.meta.url), "utf8");

const good = (a) => ({ progs: LIMIT[a].programs, window: LIMIT[a].window, tick: LIMIT[a].tick, key: LIMIT.key });
const pix = () => ({ diffs: [0, 0, 0], controls: [0, 0, 0], linked: [true, true, true] });
const runs = (patch = {}) => {
  const base = {};
  for (const a of ["intel", "nvidia"]) base[a] = { off: [good(a)], neutral: [good(a), good(a), good(a)], pixels: [pix(), pix(), pix()] };
  for (const [path, v] of Object.entries(patch)) {
    const [a, arm, i, k] = path.split(".");
    if (arm === "pixels") base[a].pixels[i] = v;
    else base[a][arm][i][k] = v;
  }
  return base;
};

test("every bar string occurs verbatim in PREREGISTRATION-T5.md", () => {
  for (const s of Object.values(BARS)) assert.ok(PREREG.includes(s), `missing: ${s}`);
});

test("walkNumbers reads the window, the longest logged tick and the first key frame; no log counts as the 30 ms floor", () => {
  const w = walkNumbers({ fresh: { frames: 941, warmLog: [["a", "s", 3, 33], ["b", "s", 1, 88]] }, walk: { firstKey: 24.4 } });
  assert.deepEqual(w, { window: 941, tick: 88, tickLogged: true, key: 24.4 });
  const none = walkNumbers({ fresh: { frames: 900, warmLog: null }, walk: { firstKey: 30 } });
  assert.deepEqual([none.tick, none.tickLogged], [30, false]);
});

test("every number on its limit passes on both adapters", () => {
  const r = evaluate(runs());
  assert.equal(r.verdict, "PASS");
  for (const a of ["intel", "nvidia"]) for (const row of Object.values(r.bars[a])) assert.equal(row.pass, true);
});

test("one step past each limit kills, and only that row, on the adapter it belongs to", () => {
  const cases = [
    ["intel.neutral.1.progs", 110, "intel", "programs"],
    ["nvidia.neutral.2.progs", 125, "nvidia", "programs"],
    ["intel.neutral.0.window", 937, "intel", "window"],
    ["nvidia.neutral.1.window", 843, "nvidia", "window"],
    ["intel.neutral.2.tick", 38, "intel", "tick"],
    ["nvidia.neutral.0.tick", 41, "nvidia", "tick"],
    ["intel.neutral.1.key", 36.5, "intel", "key"],
    ["nvidia.neutral.1.key", 36.5, "nvidia", "key"],
  ];
  for (const [path, v, adapter, row] of cases) {
    const r = evaluate(runs({ [path]: v }));
    assert.equal(r.verdict, "KILL", path);
    for (const a of ["intel", "nvidia"]) for (const [k, x] of Object.entries(r.bars[a])) assert.equal(x.pass, !(a === adapter && k === row), `${path} ${a}.${k}`);
  }
});

test("a limit that differs by adapter does not cross over: 110 programs pass on the RTX and fail on Intel", () => {
  assert.equal(evaluate(runs({ "nvidia.neutral.0.progs": 110 })).verdict, "PASS");
  assert.equal(evaluate(runs({ "intel.neutral.0.progs": 110 })).verdict, "KILL");
});

test("pixels: a difference of 1 passes, 2 kills; a control that moves or a missing chunk voids", () => {
  assert.equal(evaluate(runs({ "intel.pixels.0": { ...pix(), diffs: [1, 0, 1] } })).verdict, "PASS");
  assert.equal(evaluate(runs({ "intel.pixels.0": { ...pix(), diffs: [0, 2, 0] } })).verdict, "KILL");
  assert.equal(evaluate(runs({ "nvidia.pixels.1": { ...pix(), controls: [0, 0, 2] } })).verdict, "VOID");
  assert.equal(evaluate(runs({ "nvidia.pixels.1": { ...pix(), linked: [true, false, true] } })).verdict, "VOID");
});

test("the bars use the neutral arm: the off arm failing a limit does not kill", () => {
  const r = runs();
  r.intel.off[0].progs = 500;
  assert.equal(evaluate(r).verdict, "PASS");
});
