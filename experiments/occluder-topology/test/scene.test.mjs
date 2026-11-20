// Scene (L1): provenance, rays, inventory, heightfield, walkers, validity, determinism, tile-skip equivalence, the seal stream.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { LAND_COLLIDERS } from "../../../lib/world/land.js";
import { heightAt } from "../../../lib/world/terrain.js";
import { makePath } from "../../topo-field/path.mjs";
import { makeField } from "../../topo-field/field.mjs";
import {
  W, N, sealStream, makeFollowCamera, pupBox, projectBox, buildOccluders, makeWalkers,
  castMask, frameValid, heightfieldAt, bakeHeightfield,
} from "../scene.mjs";

const SRC = new URL("../scene.mjs", import.meta.url);
const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const still = (x, z, climb = 0) => ({ x, z, vx: 0, vz: 0, speed: 0, throttle: 0, boost: 0, climb, pupY: climb, heading: Math.PI });
const centre = (box) => [0, 1, 2].map((a) => (box.corners[a] + box.corners[21 + a]) / 2);
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scl = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function frameAt(x, z) {
  const cam = makeFollowCamera();
  let c = null;
  for (let i = 0; i < 600; i++) c = cam.step(still(x, z));
  const box = pupBox(still(x, z));
  return { cam: c, box, proj: projectBox(c, box) };
}

function mask(cam, box, occ, walkers = null, opts) {
  const proj = projectBox(cam, box);
  const m = new Uint8Array(N);
  const count = castMask(cam, proj, box, occ, walkers, m, opts);
  return { m, count };
}

const EMPTY = () => ({ cyl: [], box: [], sph: [], hf: null });
const cone = (x, z, y0, y1, r) => ({ type: "cone", x, z, y0, y1, rb: r, rt: r, kind: "test", src: "t" });

test("provenance: every path:line in the scene.mjs header names an existing file with that many lines", () => {
  const src = readFileSync(SRC, "utf8");
  const header = src.slice(0, src.indexOf("\nimport "));
  const tokens = [...header.matchAll(/([\w./-]+\.(?:js|jsx|mjs)):(\d+(?:[-,]\d+)*)/g)];
  assert.ok(tokens.length >= 25, `only ${tokens.length} tokens`);
  for (const [, rel, nums] of tokens) {
    const file = join(ROOT, rel);
    assert.ok(existsSync(file), `missing ${rel}`);
    const text = readFileSync(file, "utf8");
    const lines = text.endsWith("\n") ? text.split(/\r?\n/).length - 1 : text.split(/\r?\n/).length;
    for (const n of nums.split(/[-,]/).map(Number)) assert.ok(n <= lines, `${rel}:${n} beyond ${lines} lines`);
  }
});

test("rays: midway cylinder covers all N pixels; behind the pup 0; at depth-0.4 0 (depth-0.6 counts)", () => {
  const { cam, box } = frameAt(0, 30);
  const c = centre(box);
  const mid = add(cam.eye, scl(sub(c, cam.eye), 0.5));
  const all = mask(cam, box, { ...EMPTY(), cyl: [cone(mid[0], mid[2], mid[1] - 1.5, mid[1] + 1.5, 1)] });
  assert.equal(all.count, N);
  const behind = add(c, scl(sub(c, cam.eye), 0.5));
  assert.equal(mask(cam, box, { ...EMPTY(), cyl: [cone(behind[0], behind[2], behind[1] - 1.5, behind[1] + 1.5, 1)] }).count, 0);
  // radius 0.3, shifted 0.6 m across the view: on the axis it would contain the pup centre and be skipped by the containment rule
  const r = 0.3;
  const d0 = projectBox(cam, box).depth;
  const place = (target) => {
    const D = target + r * Math.hypot(cam.fwd[0], cam.fwd[2]);
    return add(add(cam.eye, scl(cam.fwd, D)), scl(cam.right, 0.6));
  };
  const p1 = place(d0 - 0.4);
  assert.equal(mask(cam, box, { ...EMPTY(), cyl: [cone(p1[0], p1[2], p1[1] - 1.5, p1[1] + 1.5, r)] }).count, 0);
  const p2 = place(d0 - 0.6);
  assert.ok(mask(cam, box, { ...EMPTY(), cyl: [cone(p2[0], p2[2], p2[1] - 1.5, p2[1] + 1.5, r)] }).count > 0);
});

test("rays: a thin pole gives a vertical strip of 3..4 columns; flat heightfield and a box top below ground+0.4 give 0", () => {
  const { cam, box } = frameAt(0, 30);
  const c = centre(box);
  const mid = add(cam.eye, scl(sub(c, cam.eye), 0.5));
  const { m } = mask(cam, box, { ...EMPTY(), cyl: [cone(mid[0], mid[2], mid[1] - 1.5, mid[1] + 1.5, 0.05)] });
  const cols = new Set();
  for (let i = 0; i < N; i++) if (m[i]) cols.add(i % W);
  // the pup's rect spans only ~0.21 NDC, so one column is ~0.027 m at this depth; a 0.1 m pole spans 3.7 columns, so 3 or 4
  const proj = projectBox(cam, box);
  const midDepth = 0.5 * proj.depth; // the midpoint of the eye-to-centre line is half the centre's view depth
  const colWidth = ((proj.x1 - proj.x0) / W) * midDepth * Math.tan((14 * Math.PI) / 180) * 1.6;
  assert.ok(cols.size >= Math.floor(0.1 / colWidth) && cols.size <= Math.ceil(0.1 / colWidth), `columns ${cols.size}, colWidth ${colWidth.toFixed(4)}`);
  assert.equal(mask(cam, box, { ...EMPTY(), hf: bakeHeightfield(() => 0) }).count, 0);
  const top = box.ground + 0.2;
  const slab = { type: "box", x0: c[0] - 3, x1: c[0] + 3, z0: c[2] - 3, z1: c[2] + 3, y0: -1, y1: top, kind: "test", src: "t" };
  assert.equal(mask(cam, box, { ...EMPTY(), box: [slab] }).count, 0);
});

test("inventory: 10 lab towers, 8 igloo courses, 9 hoodoos, 12 snowballs, 4 beachballs, 4 crates, dam = land dam entries, 20 walkers", () => {
  const occ = buildOccluders({ variant: "nominal" });
  const labs = new Set(occ.box.filter((b) => b.kind === "lab").map((b) => b.src));
  assert.equal(labs.size, 10);
  assert.equal(occ.cyl.filter((c) => c.kind === "igloo").length, 8);
  assert.equal(occ.cyl.filter((c) => c.kind === "hoodoo").length, 9);
  assert.equal(occ.sph.filter((s) => s.kind === "snowball").length, 12);
  assert.equal(occ.sph.filter((s) => s.kind === "beachball").length, 4);
  assert.equal(occ.box.filter((b) => b.kind === "crate").length, 4);
  assert.equal(occ.cyl.filter((c) => c.kind === "dam").length, LAND_COLLIDERS.filter((c) => c.land === "dam").length);
  assert.equal(makeWalkers(1, { N: 20 }).x.length, 20);
});

test("envelope adds exactly 10 cylinders (labs minus the hideout) and nothing else", () => {
  const nom = buildOccluders({ variant: "nominal" });
  const env = buildOccluders({ variant: "envelope" });
  assert.equal(env.cyl.length - nom.cyl.length, 10);
  assert.equal(env.cyl.filter((c) => c.kind === "labEnvelope").length, 10);
  assert.equal(env.box.length, nom.box.length);
  assert.equal(env.sph.length, nom.sph.length);
});

test("heightfield: nodes equal heightAt exactly; bilinear mid-points equal the mean of their four corners within 1e-9", () => {
  const hf = buildOccluders({ variant: "nominal" }).hf;
  for (let k = 0; k < 400; k++) {
    const i = (k * 97) % hf.n, j = (k * 53) % hf.n;
    assert.equal(hf.h[j * hf.n + i], heightAt(hf.x0 + i * hf.step, hf.z0 + j * hf.step));
  }
  const x = hf.x0 + 10.5 * hf.step, z = hf.z0 + 20.5 * hf.step;
  const corners = [0, 1].flatMap((dj) => [0, 1].map((di) => hf.h[(20 + dj) * hf.n + 10 + di]));
  const mean = corners.reduce((a, b) => a + b, 0) / 4;
  assert.ok(Math.abs(heightfieldAt(hf, x, z) - mean) <= 1e-9);
});

test("walkers: same seed gives identical positions over 100 updates; shuffle mean jump > 10 m; equal to the E1 bed movers", () => {
  const a = makeWalkers(1, { N: 20 });
  const b = makeWalkers(1, { N: 20 });
  for (let f = 0; f < 100; f++) { a.step(0, 0); b.step(0, 0); }
  assert.deepEqual(Array.from(a.x), Array.from(b.x));
  assert.deepEqual(Array.from(a.z), Array.from(b.z));
  const e1 = makeField({ n: 0, x: new Float64Array(0), z: new Float64Array(0) }, { N: 20, seed: 1 });
  const w = makeWalkers(1, { N: 20 });
  for (let f = 0; f < 100; f++) { e1.update(0, 0); w.step(0, 0); }
  assert.deepEqual(Array.from(w.x), Array.from(e1.movers.x));
  const s = makeWalkers(2, { N: 20, shuffle: true });
  let prev = Array.from(s.x), prevZ = Array.from(s.z), total = 0, n = 0;
  for (let f = 0; f < 100; f++) {
    s.step(0, 0);
    for (let i = 0; i < 20; i++) { total += Math.hypot(s.x[i] - prev[i], s.z[i] - prevZ[i]); n++; }
    prev = Array.from(s.x); prevZ = Array.from(s.z);
  }
  assert.ok(total / n > 10, `mean jump ${(total / n).toFixed(2)}`);
});

test("validity (D5): inside the igloo invalid, SPAWN valid, a mountain invalid, a tour dock point valid", () => {
  const path = makePath(1);
  assert.equal(frameValid(still(0, -8)), false);
  assert.equal(frameValid(still(0, 9)), true);
  assert.equal(frameValid(still(-35, -67)), false);
  const dock = path.docks[0];
  assert.equal(frameValid(still(dock.x, dock.z)), true);
});

test("determinism: frames 0..120 of seed 1 give an identical mask hash on two runs", () => {
  const occ = buildOccluders({ variant: "nominal" });
  const path = makePath(1);
  const stream = sealStream(path);
  const run = () => {
    const cam = makeFollowCamera();
    const walkers = makeWalkers(1, { N: 20 });
    const m = new Uint8Array(N);
    let h = 0;
    for (let f = 0; f <= 120; f++) {
      const seal = stream.at(f);
      const c = cam.step(seal);
      const box = pupBox(seal);
      walkers.step(seal.x, seal.z);
      castMask(c, projectBox(c, box), box, occ, walkers, m);
      for (let i = 0; i < N; i++) h = (Math.imul(h, 31) + m[i]) | 0;
    }
    return h;
  };
  assert.equal(run(), run());
});

test("tile skip changes no pixel over 120 frames of seed 1 (spawn region and the first dock run)", () => {
  const occ = buildOccluders({ variant: "nominal" });
  const stream = sealStream(makePath(1));
  const camA = makeFollowCamera();
  const camB = makeFollowCamera();
  const wA = makeWalkers(1, { N: 20 });
  const wB = makeWalkers(1, { N: 20 });
  const sampled = new Set([...Array(60).keys(), ...Array.from({ length: 60 }, (_, i) => 1200 + i)]);
  for (let f = 0; f < 1260; f++) {
    const seal = stream.at(f);
    const ca = camA.step(seal), cb = camB.step(seal);
    const box = pupBox(seal);
    wA.step(seal.x, seal.z); wB.step(seal.x, seal.z);
    if (!sampled.has(f)) continue;
    const ma = new Uint8Array(N), mb = new Uint8Array(N);
    castMask(ca, projectBox(ca, box), box, occ, wA, ma, { tileSkip: true });
    castMask(cb, projectBox(cb, box), box, occ, wB, mb, { tileSkip: false });
    assert.deepEqual(Array.from(ma), Array.from(mb), `frame ${f}`);
  }
});

test("sealStream: 7308 frames, boost 1 for f < 3707, speed max within 0.01 of 15", () => {
  const path = makePath(1);
  const s = sealStream(path);
  assert.equal(path.frames, 7308);
  let vmax = 0;
  for (let f = 0; f < path.frames; f++) {
    const seal = s.at(f);
    assert.equal(seal.boost, f < 3707 ? 1 : 0, `boost at ${f}`);
    vmax = Math.max(vmax, seal.speed);
  }
  assert.ok(Math.abs(vmax - 15) <= 0.01, `vmax ${vmax}`);
  assert.equal(W, 32);
});
