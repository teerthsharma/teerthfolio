/* global console */
// node lib/anime/cutscenes/frame-law.check.mjs : the frame law's clock and camera maths, no browser.
import assert from "node:assert/strict";
import { compileLaw, easeOf, isLaw, normBeat, OPEN } from "./framework/law.js";
import { CameraDirector } from "./framework/director.js";
import frameCard from "./_frame/scene.js";

const near = (a, b, m) => assert.ok(Math.abs(a - b) < 1e-9, `${m}: ${a} vs ${b}`);
const F = (f) => f / 24;
const S = {
  fps: 12, duration: 12,
  frame: { ink: "#1a120c", box: { ratio: 2.39, slide: 12 }, split: { shadow: "#000000", high: "#ffffff", amt: 0.2 }, grain: { amt: 0.03, fps: 12 } },
  beats: [
    { t: 0, name: "iris", dur: 1, from: 0, to: 1.4, ease: "linear" },
    { t: 4, name: "ones", dur: 0.5 },
    { t: 5, name: "freeze", dur: 1, layers: ["world"] },
    { t: 6, name: "flat", frames: 2, col: "#ff0000" },
    { t: 6.5, name: "invert" },
    { t: 7, name: "grade", dur: 1, mono: 1, ease: "cut" },
    { t: 8, name: "grade", dur: 1, split: { shadow: "#ff0000", high: "#00ff00" }, amt: 0.6, in: 0.5, out: 0.5, ease: "linear" },
    { t: 9, name: "box", on: false, slide: 0 },
    { t: 9.5, name: "shake", amp: 0.01, tau: 0.2, hz: 6 },
    { t: 11, name: "iris", dur: 0.5, to: 0.2, ones: true, ease: "linear" },
    { t: 3, name: "freeze", dur: 0.3 }, { t: 3, name: "iris", dur: 2, open: 1 }, { t: 3, name: "grade", dur: 1, to: "mono" }, // older free cues
  ],
};
const L = compileLaw(S);

// the per-layer clock
near(L.time("cast", 3.99), 47 / 12, "twos before the ones window");
near(L.time("cast", F(97)), F(97), "an odd 24 fps frame is drawn inside the ones window");
near(L.time("fx", F(97)), F(97), "fx is in the default ones layers");
near(L.time("world", F(97)), 4, "world stays on twos in a cast and fx window");
near(L.time("cast", 4.5), 4.5, "the ones window ends on its frame");
near(L.time("cast", F(109)), 4.5, "twos again after it");
near(L.time("cast", F(193)), 8, "a time on a frame boundary lands on that frame");
near(L.time("world", 5.7), 5, "a frozen layer holds the beat's start time");
near(L.time("cast", 5.75), 5.75, "the rest keep moving through a freeze");
near(L.time("world", 6), 6, "the freeze releases to the clock");
assert.equal(L.frozen("world", 5.5), true); assert.equal(L.frozen("cast", 5.5), false); assert.equal(L.frozen("world", 3.1), false);
assert.equal(L.onesAt(4.2), true); assert.equal(L.onesAt(4.5), false); assert.equal(L.rate("cast", 4.2), 24); assert.equal(L.rate("world", 4.2), 12);
assert.equal(L.grainFps(4.2), 24, "grain follows a ones window");
assert.equal(compileLaw({ ...S, frame: { grain: { ones: false } } }).grainFps(4.2), 12, "grain.ones false pins it");

// older free cues of the same names are not frame-law beats
assert.equal(isLaw({ name: "freeze", dur: 0.3 }), false); assert.equal(isLaw({ name: "iris", open: 1 }), false); assert.equal(isLaw({ name: "grade", to: "mono" }), false);
assert.deepEqual(normBeat({ t: 1, name: "zap" }), { dur: 0.5, t: 1, name: "zap" });
near(normBeat({ t: 1, name: "flat", frames: 3 }).dur, 3 / 24, "a flat's dur is its frame count");

// iris: radius in frame heights, stepped on twos (ones: true steps at 24), held at `to` until the next iris beat
near(L.iris(0).r, 0, "closed at t 0");
near(L.iris(0.5).r, 0.7, "half open");
near(L.iris(0.54).r, 0.7, "stepped on twos");
assert.equal(L.iris(1), null, "fully open is no mask"); assert.equal(L.iris(10.9), null, "held open until the next beat");
near(L.iris(11.25).r, 0.8, "closing from the last `to`");
near(L.iris(F(265)).r, OPEN + (0.2 - OPEN) * ((F(265) - 11) / 0.5), "ones: true steps at 24");
near(L.iris(11.9).r, 0.2, "held at `to` (a ring)");

// bars, flat, invert: windows counted in 24 fps frames
near(L.box(0, 1.6), 0, "bars start out"); near(L.box(0.25, 1.6), (1 - 1.6 / 2.39) / 4, "half way at frame 6 of 12");
assert.equal((L.box(1, 1.6) * 800).toFixed(1), "132.2", "132.2 px at 1280 x 800"); near(L.box(9, 1.6), 0, "a box beat takes them off");
assert.equal(compileLaw({ beats: [] }).box(1, 1.6), null, "no frame.box and no box beat leaves the style alone");
assert.equal(L.flat(F(143)), null); assert.equal(L.flat(6).col, "#ff0000"); assert.equal(L.flat(F(145)).bypass, true); assert.equal(L.flat(F(146)), null, "two frames");
assert.equal(L.invert(6.5), 2); assert.equal(L.invert(6.5 + 1 / 24), 0, "one frame by default");

// grade: frame.split, then the shot, then beats
assert.deepEqual(L.grade(2), { sh: [0, 0, 0], hi: [1, 1, 1], amt: 0.2, mono: 0 });
assert.equal(L.grade(2, { mono: 0.5 }).mono, 0.5, "a shot grade overrides the frame");
assert.equal(L.grade(2, { amt: 0.4 }).amt, 0.4);
assert.equal(L.grade(7).mono, 1, "ease cut swaps on the frame"); assert.equal(L.grade(7.99).mono, 1); assert.equal(L.grade(8).mono, 0, "and back");
near(L.grade(8.25).amt, 0.4, "half blended in"); near(L.grade(8.5).amt, 0.6, "in"); near(L.grade(8.75).sh[0], 0.5, "half blended out");
assert.equal(L.grade(7.5, { mono: 0.2 }).mono, 1, "a beat wins over the shot");
assert.equal(compileLaw({ beats: [{ t: 1, name: "grade", mono: 1, hold: true }] }).grade(9).mono, 1, "hold keeps a grade after its beat");

// shake: a pure, damped sum
assert.deepEqual(L.shake(9.4), [0, 0, 0]); near(L.shake(9.5)[1], 0.01, "full on the impulse"); assert.ok(Math.abs(L.shake(10)[1]) < 0.001 && L.shake(11)[2] === 0);
assert.ok(compileLaw({ beats: [{ t: 0, name: "shake", amp: 0.6 }] }).shake(0)[2] <= 0.04, "the reach is capped");
near(easeOf("easeOutCubic")(0.5), easeOf("out")(0.5), "ease aliases"); assert.equal(easeOf("cut")(0), 1); near(easeOf("nonsense")(0.5), 0.5, "unknown is smooth");

// the camera: hold, cut, step, long, one-frame shots, the 2D move
const seal = (t) => ({ at: [t, 0, 0], yaw: 0, scale: 1 }); // a seal sliding 1 m/s
const cam = (shots) => { const warns = [], d = new CameraDirector({ shots }, (m) => warns.push(m)); d.sealAt = seal; let now = 0; d.sealState = () => seal(now); return { d, warns, at: (t) => { now = t; return { ...d.at(t, 16 / 9) }; } }; };
const A = cam([
  { n: 1, t: [0, 2], law: "wide", r: [4, 8] },
  { n: 2, t: [2, 9], law: "arc", hold: true, r: [6, 3] },
  { n: 3, t: [9, 9 + 1 / 24], law: "free", ease: "cut", r: [5, 2] },
  { n: 4, t: [9 + 1 / 24, 11], law: "kill", step: 4, r: [3, 2] },
  { n: 5, t: [11, 18], law: "free", long: true, overscan: 1.25, pan: [[0, 0.5], [1, 0.5]], zoom: [1, 1.25], ease: "linear" },
]);
assert.deepEqual(A.warns, [], "hold and long shots are not auto-cut, a one-frame shot is no gap"); assert.deepEqual(A.d.report().filter((m) => !m.startsWith("missing")), []);
assert.equal(A.d.shots.length, 5);
assert.notDeepEqual(A.at(1.9).eye, A.at(1.99).eye, "a wide moves");
const h0 = A.at(2), h1 = A.at(8.9);
assert.equal(h0.cut, true, "the cut lands on the shot's first frame"); assert.deepEqual(h1.eye, h0.eye, "a held camera does not follow the seal or ease"); assert.deepEqual(h1.look, h0.look);
assert.equal(A.d.shots[1].moving, false, "so its plate is baked once");
const c0 = A.at(9); assert.equal(c0.shotIndex, 2); near(Math.hypot(c0.eye[0] - 9, c0.eye[2]), 2, "ease cut is at the `to` values on frame one");
assert.equal(A.at(9 + 1 / 24).shotIndex, 3, "the one-frame shot lasts one frame");
assert.deepEqual(A.at(9.1).fov, A.at(9.2).fov, "step 4 holds between quarter seconds"); assert.notEqual(A.at(9.2).fov, A.at(9.3).fov);
const p0 = A.at(11), p1 = A.at(14.5), p2 = A.at(17.99);
assert.deepEqual(p1.eye, p0.eye, "a 2D move never moves the base camera"); assert.equal(A.d.shots[4].moving, false, "nor re-bakes the plate");
near(p0.win[2], 0.8, "zoom 1 shows 1 / overscan of the plate"); near(p0.win[0], 0, "pan 0 is flush left"); near(p0.win[1], 0.1, "v 0.5 is centred");
assert.ok(p2.win[0] + p2.win[2] <= 1 + 1e-9 && p2.win[0] > p1.win[0], "the window travels and stays inside the plate");
near(p0.fovO, (2 * Math.atan(1.25 * Math.tan((p0.fov * Math.PI) / 360)) * 180) / Math.PI, "the overscanned field of view");
near(A.d.shots[4].over.scale, 1.25 * 1.25, "the plate target is sized for the deepest zoom");

// the test card itself compiles clean
const card = cam(frameCard.shots);
assert.deepEqual(card.warns, []); assert.deepEqual(card.d.report(), []);
console.log("frame-law.check: ok");
