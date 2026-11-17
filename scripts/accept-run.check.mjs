// node scripts/accept-run.check.mjs : the pure scoring layer on synthetic stills, no browser.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildResultFile, scoreDock, scoreTest } from "./accept-run.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const solid = (w, h, [r, g, b]) => {
  const a = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) a.set([r, g, b, 255], i * 4);
  return a;
};
const row = (parts) => {
  const px = parts.flatMap(([n, c]) => Array.from({ length: n }, () => c));
  const a = new Uint8Array(px.length * 4);
  px.forEach((c, i) => a.set([...c, 255], i * 4));
  return { rgba: a, w: px.length, h: 1 };
};
const ctx = (rgba, w, h) => ({ rgba, w, h, ids: null });
const status = (test, c) => scoreTest(test, c).status;

const RED = [229, 20, 46];
const BLACK = [0, 0, 0];
const WHITE = [255, 255, 255];
const GREY80 = [80, 80, 80];

// lumaCap
const cap = { id: "t.cap", kind: "lumaCap", max: 0.9239 };
assert.equal(status(cap, ctx(solid(8, 8, [128, 128, 128]), 8, 8)), "pass", "lumaCap passes on mid-grey");
assert.equal(status(cap, ctx(solid(8, 8, WHITE), 8, 8)), "fail", "lumaCap fails on white");

// inkFloor: a black corner wider than a 10 px grid cell (640x400 on a 64x40 grid) fails; the ink colour passes
const W = 640, H = 400;
const ink = { id: "t.ink", kind: "inkFloor", min: 0.035, grid: [64, 40] };
const inkBg = solid(W, H, [14, 12, 22]);
assert.equal(status(ink, ctx(inkBg, W, H)), "pass", "inkFloor passes on #0e0c16");
const corner = solid(W, H, [14, 12, 22]);
for (let y = 0; y < 30; y++) for (let x = 0; x < 30; x++) corner.set([0, 0, 0, 255], (y * W + x) * 4);
assert.equal(status(ink, ctx(corner, W, H)), "fail", "inkFloor fails on a black corner block");

// hueShare: red window across the 0 degree wrap; blue is outside it
const share = { id: "t.red", kind: "hueShare", where: { sMin: 0.25, vMin: 0.08 }, windows: [[340, 20]], min: 0.9 };
assert.equal(status(share, ctx(solid(16, 16, RED), 16, 16)), "pass", "hueShare red window passes on #e5142e");
assert.equal(status(share, ctx(solid(16, 16, [30, 60, 230]), 16, 16)), "fail", "hueShare red window fails on blue");

// hueMedian: range on a blue (hue 231)
const med = { id: "t.med", kind: "hueMedian", where: null, range: [200, 240] };
assert.equal(status(med, ctx(solid(16, 16, [30, 60, 230]), 16, 16)), "pass", "hueMedian in range");

// notan: 53/33/14 passes against target 53/33/14 +/- 10; 10/10/80 fails
const notan = { id: "t.notan", kind: "notan", thresholds: [0.12, 0.4], target: [53, 33, 14], tol: 10 };
const band = (parts) => {
  const img = row(parts);
  return ctx(img.rgba, img.w, img.h);
};
assert.equal(status(notan, band([[53, BLACK], [33, GREY80], [14, WHITE]])), "pass", "notan passes on 53/33/14");
assert.equal(status(notan, band([[10, BLACK], [10, GREY80], [80, WHITE]])), "fail", "notan fails on 10/10/80");

// lumaShare: all white is fully above yAbove
const bright = { id: "t.bright", kind: "lumaShare", yAbove: 0.7, min: 0.9 };
assert.equal(status(bright, ctx(solid(8, 8, WHITE), 8, 8)), "pass", "lumaShare above 0.7 on white");

// satStat: pure red is saturated, so a mean cap of 0.32 fails
const sat = { id: "t.sat", kind: "satStat", stat: "mean", max: 0.32 };
assert.equal(status(sat, ctx(solid(8, 8, RED), 8, 8)), "fail", "satStat mean cap fails on red");

// regionDisc: a black disc of radius 8 px on white in a 64 px square
const disc = { id: "t.disc", kind: "regionDisc", mask: { yBelow: 0.06, blurPx: 3 }, count: 1, diameterH: [0.2, 0.3], centre: [0.5, 0.5], tol: 0.05 };
const discImg = solid(64, 64, WHITE);
for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if ((x - 32) ** 2 + (y - 32) ** 2 <= 64) discImg.set([0, 0, 0, 255], (y * 64 + x) * 4);
assert.equal(status(disc, ctx(discImg, 64, 64)), "pass", "regionDisc finds one disc");

// kinds that need a named region or a second still are never pass
for (const kind of ["custom", "regionCover", "regionBox", "regionCount", "lumaRatio", "frozen"]) {
  const r = scoreTest({ id: "t.nr", kind, min: 0, max: 1, exact: 0, text: "x" }, ctx(solid(16, 16, RED), 16, 16));
  assert.equal(r.status, "not_run", `${kind} is not_run`);
  assert.notEqual(r.status, "pass", `${kind} never passes`);
}
assert.equal(status({ id: "t.nostill", kind: "custom", text: "x" }, null), "not_run", "no still is not_run");

// scoreDock walks stills and every[]; buildResultFile collapses to one row per id, worst status wins
const accept = {
  dock: "p-fake", issue: 99, clock: {},
  stills: [
    { t: 1.0, role: "money", tests: [
      { id: "99.1", stage: "C", kind: "hueShare", where: { sMin: null, vMin: null }, windows: [[340, 20]], min: 0.9 },
      { id: "99.2", stage: "P", kind: "custom", text: "owner check" },
    ] },
    { t: 2.0, role: "other", tests: [
      { id: "99.1", stage: "C", kind: "hueShare", where: { sMin: null, vMin: null }, windows: [[340, 20]], min: 0.9 },
    ] },
  ],
  every: [{ id: "99.3", stage: "C", kind: "lumaCap", max: 0.92 }],
};
const stills = new Map([[1.0, ctx(solid(16, 16, RED), 16, 16)], [2.0, ctx(solid(16, 16, BLACK), 16, 16)]]);
const results = scoreDock(accept, stills);
assert.equal(results.length, 3 + 2, "scoreDock: 3 stills tests plus the every test on 2 stills");
const file = buildResultFile(accept, results, { sha: "abc1234", adapter: "test-adapter" });
assert.equal(file.dock, "p-fake");
assert.equal(file.issue, 99);
assert.equal(file.sha, "abc1234");
assert.equal(file.adapter, "test-adapter");
for (const r of file.results) {
  assert.ok(r.id, "result has id");
  assert.ok(["pass", "fail", "not_run"].includes(r.status), `status ${r.status}`);
}
const byId = Object.fromEntries(file.results.map((r) => [r.id, r.status]));
assert.equal(byId["99.1"], "fail", "99.1 passes at 1.0 s but fails at 2.0 s, so the id fails");
assert.equal(byId["99.2"], "not_run", "custom-only id is not_run");
assert.equal(byId["99.3"], "pass", "every lumaCap passes on both stills");

// the pure layer must not import playwright or sharp statically
const src = readFileSync(path.join(root, "scripts/accept-run.mjs"), "utf8");
assert.doesNotMatch(src, /^import\b[^\n]*\b(playwright|sharp)\b/m, "pure layer has no static playwright or sharp import");

console.log("accept-run.check: ok");
