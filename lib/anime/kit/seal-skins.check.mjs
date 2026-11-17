// node lib/anime/kit/seal-skins.check.mjs : S0.1 registry gates (spec seal-skins.md s2, s4) on hex keys.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SKINS, defineSkin, buildSkin, lab, checkKey } from "./seal-skins.js";

const PANDA = {
  back: { col: "#848e9d", shade: "#1c1e21", bias: 0.64 },
  flank: { col: "#bfc4c9", shade: "#898d91", bias: 0.53 },
  belly: { col: "#d5d2cd", shade: "#999794", bias: 0.53 },
  pad: { col: "#c7bfb5", shade: "#8f8982", bias: 0.53 },
  freckle: { col: "#544c46" },
  eye: { col: "#0e0f13" },
  flipper: { col: "#848e9d" },
};
const withKey = (over) => ({ ...PANDA, ...over });
const skin = (key) => ({ studio: "test", source: "test", key, body: { pose: "sit", H: 0.8, prims: [] }, line: { ink: "#0e0c16" }, wear: { prims: [] } });

const white = lab("#ffffff");
assert.ok(Math.abs(white.L - 100) < 0.01 && Math.abs(white.a) < 0.01 && Math.abs(white.b) < 0.01, "lab: white is L 100, a 0, b 0");
assert.ok(Math.abs(lab("#000000").L) < 0.01, "lab: black is L 0");

const pan = checkKey(PANDA, "p-aether-lang");
console.log(JSON.stringify({ panda: pan }));
assert.ok(pan.C1 >= 1.40 && pan.C2.C >= 4 && pan.C3.padMinusBelly >= -15 && pan.C4.eyeL <= 30, "gate: Panda key passes C1-C4 on its hexes");

assert.throws(() => defineSkin("pup-coat", skin(withKey({ back: { col: "#8e8c91", shade: "#5f6278", bias: 0.64 } }))), /C2/, "gate: the pup coat #8e8c91 as back throws on C2");
assert.equal(SKINS["pup-coat"], undefined, "gate: a failing skin is not registered");

assert.throws(() => defineSkin("dark-belly", skin(withKey({ belly: { col: "#c0c0c0", shade: "#999999", bias: 0.53 } }))), /C1/, "gate: belly under 1.40 times the back throws on C1");

assert.throws(() => defineSkin("light-eye", skin(withKey({ eye: { col: "#7ec8ff", shade: "#3a6a88", bias: 0.5 } }))), /C4/, "gate: a light eye (#7ec8ff) throws on C4");

assert.throws(() => defineSkin("nokey", { body: { prims: [] } }), /key/, "gate: a skin with no key throws");

const reg = defineSkin("p-aether-lang", skin(PANDA));
assert.equal(SKINS["p-aether-lang"], reg, "gate: the Panda key registers under its dock");

const calls = { paint: [], ell: [], cone: [] };
const fakeSdf = {
  paint: (col, shade, o) => (calls.paint.push({ col, shade, o }), { tag: "paint", col, shade, o }),
  ell: (...args) => (calls.ell.push(args), { tag: "ell", args }),
  cone: (...args) => (calls.cone.push(args), { tag: "cone", args }),
  polygonize: (prims, h) => ((calls.poly = { prims, h }), "GEO"),
};
const VEC = ["uDecA", "uDecB", "uDecCol", "uDecShade", "uBlush", "uBlushCol", "uFace", "uEyeCol", "uKeyV"];
function fakeFig() {
  const rec = [];
  const vec = (name) => ({ value: { set: (...a) => rec.push([name, ...a]) } });
  const mat = { uniforms: { uCut: { value: -1 }, uBand: { value: 0 }, ...Object.fromEntries(VEC.map((n) => [n, vec(n)])) } };
  const hull = { uniforms: { uInkGain: { value: 0 }, uKeyV: vec("hull.uKeyV") } };
  return { userData: { mat, hull }, rec };
}
const fakeEngine = { figure: (geo, o) => { const fig = fakeFig(); calls.figure = { geo, o, fig }; return fig; } };
const wearCone = { shape: "cone", a: [0, 0.9, 0], b: [0, 0.7, -0.1], r1: 0.05, r2: 0.02, paint: "eye", id: 1 };
const bodyEll = { shape: "ell", c: [0, 0.1, 0.02], r: [0.2, 0.1, 0.24], paint: "flank", k: 0.08 };
const bodyRot = { shape: "ell", c: [0, 0.4, 0], r: [0.3, 0.3, 0.27], paint: "back", k: 0.06, rot: [0.1, 0, 0] };
const bodyCone = { shape: "cone", a: [0, 0.2, -0.2], b: [0, 0.2, 0.3], r1: 0.05, r2: 0.03, paint: "belly" };
const built = buildSkin(
  fakeEngine,
  { ...reg, line: { ink: "#0e0c16", gain: 1.4 }, body: { ...reg.body, prims: [bodyEll, bodyRot, bodyCone] }, wear: { prims: [wearCone] } },
  fakeSdf,
);
assert.equal(calls.poly.h, 0.011, "buildSkin: polygonize is called at h 0.011");
assert.equal(calls.poly.prims.length, 4, "buildSkin: body and wear prims go into one polygonize");
assert.equal(calls.poly.prims[0].tag, "ell", "buildSkin: first prim is the body ell");
assert.equal(calls.poly.prims[2].tag, "cone", "buildSkin: body cone reaches sdf.cone");
assert.equal(calls.poly.prims[3].tag, "cone", "buildSkin: wear cone reaches sdf.cone");
assert.deepEqual(calls.ell[0].slice(0, 2), [bodyEll.c, bodyEll.r], "buildSkin: ell gets c and r");
assert.equal(calls.ell[0][3], 0.08, "buildSkin: ell gets k");
assert.equal(calls.ell[1][4], bodyRot.rot, "buildSkin: ell gets rot when the data has one");
assert.equal(calls.ell[0][4], undefined, "buildSkin: ell has no rot when the data has none");
assert.deepEqual(calls.cone[0].slice(0, 4), [bodyCone.a, bodyCone.b, 0.05, 0.03], "buildSkin: cone gets a, b, r1, r2");
assert.deepEqual(calls.cone[1][0], wearCone.a, "buildSkin: wear cone reaches sdf.cone with its own a");
const flankCall = calls.paint.find((c) => c.col === PANDA.flank.col);
assert.equal(flankCall.shade, PANDA.flank.shade, "buildSkin: paint gets the skin's shade for the named region");
assert.equal(flankCall.o.bias, PANDA.flank.bias, "buildSkin: paint gets the region bias");
const wearPaint = calls.paint.find((c) => c.col === PANDA.eye.col);
assert.equal(wearPaint.o.id, 1, "buildSkin: a prim id reaches paint");
assert.equal(calls.ell[0][2].tag, "paint", "buildSkin: the ell's material is the paint object");
assert.equal(calls.figure.geo, "GEO", "buildSkin: figure gets the polygonized geometry");
assert.equal(calls.figure.o.ink, "#0e0c16", "buildSkin: figure gets the skin's ink");
assert.equal(calls.figure.o.lineMul, 1.4, "buildSkin: figure gets the skin's line gain");
assert.equal(built, calls.figure.fig, "buildSkin: returns the figure");

assert.throws(
  () => buildSkin(fakeEngine, { ...reg, body: { prims: [{ ...bodyEll, paint: "nope" }] }, wear: { prims: [] } }, fakeSdf),
  /paint "nope"/,
  "buildSkin: a paint name with no key colour throws, naming it",
);
assert.throws(
  () => buildSkin(fakeEngine, { ...reg, body: { prims: [{ shape: "tube", paint: "flank" }] }, wear: { prims: [] } }, fakeSdf),
  /unknown shape "tube"/,
  "buildSkin: an unknown prim shape throws",
);

const reset = () => { calls.paint.length = 0; calls.ell.length = 0; calls.cone.length = 0; calls.poly = null; };
reset();
const colWear = { shape: "ell", c: [0, 0.6, 0], r: [0.2, 0.05, 0.19], col: "#19171f", shade: "#19171f" };
const colBuilt = buildSkin(
  fakeEngine,
  { ...reg, line: { ink: "#0e0c16", gain: 1 }, body: { ...reg.body, prims: [] }, wear: { prims: [colWear], hair: { count: "5-7" }, eye: { r: 0.02 }, cover: 0.25 } },
  fakeSdf,
);
assert.equal(calls.poly.prims.length, 1, "buildSkin: wear.hair, wear.eye and wear.cover are not converted, only wear.prims");
assert.equal(calls.ell.length, 1, "buildSkin: a col-only prim reaches sdf.ell once");
assert.equal(calls.ell[0][2].tag, "paint", "buildSkin: a col-only prim gets a paint made from its colours");
assert.deepEqual(calls.paint[0].col, "#19171f", "buildSkin: col-only prim paints its col");
assert.deepEqual(calls.paint[0].shade, "#19171f", "buildSkin: col-only prim paints its shade");
assert.equal(colBuilt, calls.figure.fig, "buildSkin: a col-only wear prim still returns the figure");

reset();
buildSkin(
  fakeEngine,
  { ...reg, line: { ink: "#0e0c16", gain: 1 }, body: { ...reg.body, prims: [] }, wear: { prims: [{ ...colWear, shade: undefined, bias: 0.3, id: 1 }] } },
  fakeSdf,
);
assert.equal(calls.paint[0].shade, "#19171f", "buildSkin: a col-only prim with no shade uses col as its shade");
assert.equal(calls.paint[0].o.bias, 0.3, "buildSkin: a col prim passes its bias");
assert.equal(calls.paint[0].o.id, 1, "buildSkin: a col prim passes its id");

assert.throws(
  () => buildSkin(fakeEngine, { ...reg, body: { prims: [bodyEll] }, wear: { prims: [{ shape: "cone", a: [0, 0, 0], b: [0, 1, 0], r1: 0.1, r2: 0.1 }] } }, fakeSdf),
  /prim 1 \(cone\) has neither a paint name nor col/,
  "buildSkin: a prim with neither a paint name nor col throws, naming its index and shape",
);

reset();
const look = {
  ...reg,
  cel: { cut: 0.53, band: 0, keyV: [-0.448, 0.647, 0.617] },
  face: { uFace: [1, 0.04, 0.715, 0.024], eyeCol: "#0e0f13", blush: 0 },
  decals: { col: "#d5d2cd", shade: "#999794", belly: [0, 0.33, 0.24, 0.22], muzzle: [0, 0.67, 0.07, 0.05] },
  line: { ink: "#0e0c16", gain: 0.5 },
  body: { ...reg.body, prims: [] },
  wear: { prims: [] },
};
const lookFig = buildSkin(fakeEngine, look, fakeSdf);
const wrote = (name) => calls.figure.fig.rec.filter((r) => r[0] === name).map((r) => r.slice(1));
assert.equal(lookFig, calls.figure.fig, "look: buildSkin returns the figure it looked after");
assert.deepEqual(wrote("uFace"), [[1, 0.04, 0.715, 0.024]], "look: uFace from face.uFace");
assert.deepEqual(wrote("uEyeCol"), [["#0e0f13"]], "look: uEyeCol from face.eyeCol");
assert.deepEqual(wrote("uKeyV"), [[-0.448, 0.647, 0.617]], "look: uKeyV from cel.keyV on the surface");
assert.deepEqual(wrote("hull.uKeyV"), [[-0.448, 0.647, 0.617]], "look: uKeyV also on the hull");
assert.equal(lookFig.userData.mat.uniforms.uCut.value, 0.53, "look: uCut from cel.cut");
assert.equal(lookFig.userData.mat.uniforms.uBand.value, 0, "look: uBand from cel.band");
assert.equal(lookFig.userData.hull.uniforms.uInkGain.value, 0.5, "look: uInkGain on the hull from line.gain");
assert.deepEqual(wrote("uDecCol"), [["#d5d2cd"]], "look: uDecCol from decals.col");
assert.deepEqual(wrote("uDecShade"), [["#999794"]], "look: uDecShade from decals.shade");
assert.deepEqual(wrote("uDecA"), [[0, 0.33, 0.24, 0.22]], "look: uDecA is the belly oval");
assert.deepEqual(wrote("uDecB"), [[0, 0.67, 0.07, 0.05]], "look: uDecB is the muzzle oval");
assert.deepEqual(wrote("uBlush"), [[0, 0, 0, 0]], "look: blush 0 switches uBlush off");
assert.deepEqual(wrote("uBlushCol"), [[0, 0, 0, 0]], "look: blush 0 zeroes the blush colour");

reset();
buildSkin(fakeEngine, { ...look, face: { ...look.face, blush: 0.5 } }, fakeSdf);
assert.deepEqual(wrote("uBlush"), [], "look: a blush above 0 leaves uBlush alone");

const bare = { userData: { mat: { uniforms: {} }, hull: { uniforms: {} } } };
assert.doesNotThrow(() => buildSkin({ figure: () => bare }, look, fakeSdf), "look: a figure without the named uniforms does not throw");

const src = readFileSync(new URL("./seal-skins.js", import.meta.url), "utf8");
assert.ok(!/from\s+["']three["']/.test(src), "module: seal-skins.js does not import three");

console.log("seal-skins.check ok");
