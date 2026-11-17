// node lib/anime/kit/skins/p-aether-lang.check.mjs : the section 3.1 numbers, registration, and the C2 mutation.
import assert from "node:assert/strict";
import { SKINS, defineSkin, checkKey } from "../seal-skins.js";
import { skin } from "./p-aether-lang.js";

// spec seal-skins.md section 3.1 (p-aether-lang, full numbers)
const SPEC = {
  back: "#848e9d",
  belly: "#d5d2cd",
  ink: "#0e0c16",
  eye: "#0e0f13",
  eyeCol: "#0e0f13",
};

assert.doesNotThrow(() => defineSkin("p-aether-lang", skin), "the skin registers without throwing");
assert.equal(SKINS["p-aether-lang"], skin, "registered under id p-aether-lang");

assert.equal(skin.key.back.col, SPEC.back, "BACK hex");
assert.equal(skin.key.belly.col, SPEC.belly, "BELLY hex");
assert.equal(skin.line.ink, SPEC.ink, "ink hex");
assert.equal(skin.key.eye.col, SPEC.eye, "EYE hex");
assert.equal(skin.face.eyeCol, SPEC.eyeCol, "uEyeCol hex");

const mutant = { ...skin, key: { ...skin.key, back: { ...skin.key.back, col: "#8e8c91" } } };
assert.throws(() => defineSkin("p-aether-lang", mutant), /C2/, "BACK #8e8c91 (pup coat) must fail C2");
assert.equal(SKINS["p-aether-lang"], skin, "a rejected registration leaves the real skin in place");

const prims = skin.body.prims;
assert.equal(prims.length, 11, "six body prims and five limb prims");
assert.ok(prims.every((p) => p.paint === "back"), "one coat: every body and limb prim is painted back");
assert.deepEqual(prims.slice(0, 6).map((p) => p.c), [[0, 0.1, 0.02], [0, 0.4, 0], [0, 0.33, 0.09], [0, 0.62, 0.05], [0, 0.67, 0.19], [0, 0.75, 0.1]], "body prim centres, the head at y 0.62");
assert.deepEqual(prims[3].r, [0.2, 0.17, 0.19], "head r [0.2, 0.17, 0.19] (departs from spec 3.1: a vase at the spec size)");
assert.ok(skin.key.flank && skin.key.belly && skin.key.pad, "key keeps flank, belly and pad (C1-C4 and the decals read them)");
assert.equal(skin.key.flip, undefined, "no flip paint: the limbs are one coat");
const belly = prims[2], muzzle = prims[4];
assert.deepEqual(skin.decals.belly, [belly.c[0], belly.c[1], belly.r[0], belly.r[1]], "uDecA is the belly prim's oval");
assert.deepEqual(skin.decals.muzzle, [muzzle.c[0], muzzle.c[1], muzzle.r[0], muzzle.r[1]], "uDecB is the muzzle prim's oval");
assert.equal(skin.decals.col, "#d5d2cd", "uDecCol is the belly hex");
assert.equal(skin.decals.shade, "#999794", "uDecShade is the belly shade");
assert.deepEqual(skin.face.uFace, [1, 0.13, 0.62, 0.034], "uFace: on, eye x 0.13, eye y at the head centre 0.62, radius 0.034");
const flips = prims.slice(6);
assert.equal(flips.length, 5, "two fore-flippers, the tail stub and two rear flippers");
const fore = flips.filter((p) => p.r[1] === 0.12);
assert.deepEqual(fore.map((p) => [p.c, p.rot]), [[[0.245, 0.3, 0.16], [0.35, -0.55, 0.5]], [[-0.245, 0.3, 0.16], [0.35, 0.55, -0.5]]], "fore-flippers at the pup's places, rot set");
const tail = flips.find((p) => p.c[2] === -0.3);
assert.deepEqual([tail.c, tail.r, tail.k], [[0, 0.07, -0.3], [0.15, 0.07, 0.14], 0.08], "tail stub at the pup's place");
const rear = flips.filter((p) => p.r[1] === 0.022);
assert.deepEqual(rear.map((p) => [p.c, p.rot]), [[[0.1, 0.03, -0.45], [0, 0.55, 0]], [[-0.1, 0.03, -0.45], [0, -0.55, 0]]], "rear flippers fanned, rot set");
assert.doesNotThrow(() => checkKey(skin.key, "p-aether-lang"), "the key still passes C1-C4");

const wear = skin.wear.prims;
assert.equal(wear.length, 2, "wear: a neck collar and a hair cap");
const collar = wear.find((p) => p.col === "#19171f");
assert.deepEqual([collar.c, collar.r], [[0, 0.46, 0.02], [0.22, 0.045, 0.2]], "collar: a neck band under the head");
assert.equal(collar.shade, "#19171f", "collar: shade #19171f");
const hair = wear.find((p) => p.col === "#ecebe8");
assert.deepEqual([hair.c, hair.r], [[0, 0.74, 0], [0.15, 0.07, 0.15]], "hair cap on the crown");
assert.equal(hair.shade, "#b8bcc4", "hair cap: shade #b8bcc4");
assert.ok(wear.every((p) => !(p.c[1] >= 0.55 && p.c[1] <= 0.69 && p.r[1] < 0.06)), "no thin wear band across the head");
const front = (p) => p.r[0] * p.r[1];
const wearArea = wear.reduce((sum, p) => sum + front(p), 0);
assert.ok(wearArea <= 0.25 * front(prims[1]), "wear front area at most 25% of the back prim (a lower bound on the silhouette)");
const [eyeX, eyeY, eyeR] = [skin.face.uFace[1], skin.face.uFace[2], skin.face.uFace[3]];
assert.ok(hair.c[1] - hair.r[1] > eyeY + eyeR, "hair cap bottom is above the eye top");
assert.ok(collar.c[1] + collar.r[1] < eyeY - eyeR, "collar top is below the eye bottom");
assert.ok(hair.c[1] - hair.r[1] > prims[2].c[1] + prims[2].r[1], "hair cap bottom is above the belly top");
const inside = (q, e) => ((q[0] - e.c[0]) / e.r[0]) ** 2 + ((q[1] - e.c[1]) / e.r[1]) ** 2 + ((q[2] - e.c[2]) / e.r[2]) ** 2 < 1;
let entered = 0;
for (let i = 0; i <= 40; i++) for (let j = 0; j < 80; j++) {
  const t = (i / 40) * Math.PI, f = (j / 80) * 2 * Math.PI;
  const q = [hair.c[0] + hair.r[0] * Math.sin(t) * Math.cos(f), hair.c[1] + hair.r[1] * Math.cos(t), hair.c[2] + hair.r[2] * Math.sin(t) * Math.sin(f)];
  if (inside(q, prims[4])) entered++;
}
assert.equal(entered, 0, "the hair cap surface does not enter the muzzle");

console.log("p-aether-lang.check ok");
