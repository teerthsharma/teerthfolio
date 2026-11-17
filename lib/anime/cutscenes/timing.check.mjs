/* global console, process, URL */
// node lib/anime/cutscenes/timing.check.mjs [--report] : the timing law on every dock in DOCKS.
// Strict by default (exit 1 when any dock FAILs); --report prints the table and exits 0.
import assert from "node:assert/strict";
import { DOCKS } from "./index.js";
import { MAX_SHOT } from "./framework/director.js";
import { isLaw, normBeat, EASE_NAMES, MAX_SHAKE } from "./framework/law.js";

const TOL = 1e-3;
const LAST_SLACK = 0.5;
const CUE_TAIL = 0.4;
const FPS = [8, 12, 24];
// The hand-back beats (the iris out) run through the last 0.4 s by design; every other beat must end before it.
const HAND_BACK = /^wipe|^(home|islandReturn|iris|irisOut|clear)$/;
// A beat removed by parking it at t >= 98 (the layers fall back to a bible time): counted as parked, not checked.
const PARKED_AT = 98;

const BAD = {
  duration: 20,
  fps: 10,
  shots: [{ n: 1, t: [0, 6] }, { n: 2, t: [6.5, 10] }, { n: 3, t: [10, 20] }],
  beats: [{ t: 19.9, name: "late" }, { t: 1, name: "shake", amp: 0.6 }],
};
const GOOD = {
  duration: 20,
  fps: 12,
  shots: [{ n: 1, t: [0, 5] }, { n: 2, t: [5, 10] }, { n: 3, t: [10, 15] }, { n: 4, t: [15, 20] }],
  beats: [{ t: 2, name: "ok", dur: 1 }],
};

const WIPE_AT_END = { duration: 20, fps: 12, shots: GOOD.shots, beats: [{ t: 19.6, name: "wipe", dur: 0.4 }] };
const CLOSE_TOO_LATE = { duration: 20, fps: 12, shots: GOOD.shots, beats: [{ t: 19.5, name: "notebookClose", dur: 0.4 }] };
const PARKED_BEAT = { duration: 20, fps: 12, shots: GOOD.shots, beats: [{ t: 99, name: "zap", dur: 1 }] };
const LATE_BEAT = { duration: 11.5, fps: 12, shots: [{ n: 1, t: [0, 5] }, { n: 2, t: [5, 10] }, { n: 3, t: [10, 11.5] }], beats: [{ t: 11.0, name: "late", dur: 1.0 }] };

// the frame law's legal forms: a one-frame shot, a held or long shot past 5 s, frame-law beats running to the last frame
const LAW_OK = {
  duration: 20, fps: 12, frame: { ink: "#1a120c", box: { ratio: 2.39, slide: 11 }, split: { shadow: "#22304a", high: "#ffe6c0", amt: 0.35 } },
  shots: [{ n: 1, t: [0, 8], hold: true }, { n: 2, t: [8, 8 + 1 / 24], ease: "cut" }, { n: 3, t: [8 + 1 / 24, 15], long: true }, { n: 4, t: [15, 20], overscan: 1.25, pan: [[0, 0.5], [1, 0.5]], zoom: [1, 1.2] }],
  beats: [{ t: 0, name: "iris", dur: 1, from: 0, to: 1.4, at: "seal" }, { t: 8, name: "ones", dur: 0.5, layers: ["cast", "fx"] }, { t: 8, name: "flat", frames: 1, col: "#ebebeb" },
    { t: 9, name: "freeze", dur: 0.3 }, { t: 15, name: "grade", dur: 5, mono: 1, hold: true }, { t: 19, name: "iris", dur: 1, to: 0.09, at: [0.5, 0.5], ease: "easeInCubic" }, { t: 19.5, name: "box", on: false }],
};
const LAW_BAD = [
  [{ shots: [{ n: 1, t: [0, 0.02] }] }, "a shot shorter than a frame"], [{ shots: [{ n: 1, t: [0, 4], overscan: 3 }] }, "overscan above 2"],
  [{ shots: [{ n: 1, t: [0, 4], overscan: 1.25, pan: [[0, 0.5], [1.4, 0.5]] }] }, "a pan outside 0..1"], [{ beats: [{ t: 1, name: "flat", frames: 1, col: "red" }] }, "a colour that is not #rrggbb"],
  [{ beats: [{ t: 1, name: "iris", to: 0, at: "head" }] }, "an unknown iris centre"], [{ beats: [{ t: 1, name: "iris", to: 0, ease: "bounce" }] }, "an unknown ease"],
  [{ beats: [{ t: 1, name: "ones", dur: 0 }] }, "an empty ones window"], [{ beats: [{ t: 1, name: "shake", schedule: [{ t: 1 }] }] }, "a schedule entry without amp"],
  [{ frame: { box: { ratio: 0.5 } } }, "a letterbox ratio under 1"], [{ beats: [{ t: 1, name: "grade", split: { shadow: "#000000" } }] }, "a split with one colour"],
];
const RULES = { length: ruleLength, tiling: ruleTiling, cue: ruleCue, fps: ruleFps, frame: ruleFrame };
for (const [name, rule] of Object.entries(RULES)) {
  assert.ok(rule(BAD).length > 0, `${name} flags the seeded bad scene`);
  assert.equal(rule(GOOD).length, 0, `${name} passes the clean control`);
}
assert.equal(ruleCue(WIPE_AT_END).length, 0, "a wipe beat may end at duration");
assert.ok(ruleCue(CLOSE_TOO_LATE).length > 0, "a notebookClose beat ending at duration - 0.1 is flagged");
assert.equal(ruleCue(PARKED_BEAT).length, 0, "a beat parked at t 99 is skipped");
assert.ok(ruleCue(LATE_BEAT).length > 0, "a beat at t 11.0 with dur 1.0 in an 11.5 s scene is flagged");
for (const [name, rule] of Object.entries(RULES)) assert.deepEqual(rule(LAW_OK), [], `${name} passes the frame-law forms`);
for (const [bad, why] of LAW_BAD) assert.ok(ruleFrame({ ...GOOD, ...bad }).length > 0, `frame flags ${why}`);
console.log("timing.check self-test: ok");

function ruleLength(s) {
  return (s.shots ?? []).flatMap((sh, i) => {
    const len = sh.t[1] - sh.t[0];
    if (sh.hold || sh.long || sh.overscan || sh.pan || sh.zoom) return []; // a held camera, a 2D move and `long` are exempt from the 5 s cut
    return len > MAX_SHOT + 1e-6 ? [`shot #${i + 1} ${len.toFixed(2)} s > ${MAX_SHOT}`] : [];
  });
}

function ruleTiling(s) {
  const shots = s.shots ?? [];
  if (!shots.length) return ["no shots"];
  const out = [];
  if (Math.abs(shots[0].t[0]) > TOL) out.push(`first shot starts ${shots[0].t[0].toFixed(3)}, not 0`);
  for (let i = 1; i < shots.length; i++) {
    const prevEnd = shots[i - 1].t[1];
    if (Math.abs(shots[i].t[0] - prevEnd) > TOL) out.push(`shot #${i + 1} starts ${shots[i].t[0].toFixed(3)}, previous ends ${prevEnd.toFixed(3)}`);
  }
  const end = shots[shots.length - 1].t[1];
  if (Math.abs(end - s.duration) > LAST_SLACK + 1e-6) out.push(`last shot ends ${end.toFixed(2)}, duration ${s.duration}`);
  return out;
}

function ruleCue(s) {
  const limit = s.duration - CUE_TAIL;
  // frame furniture (iris, bars, a grade) may run to the last frame; the other frame-law beats end on their own computed dur
  const furniture = (c) => isLaw(c) && ["iris", "box", "grade"].includes(c.name);
  return (s.beats ?? []).filter((c) => typeof c.t === "number" && c.t < PARKED_AT && !HAND_BACK.test(c.name ?? "") && !furniture(c)).flatMap((c) => {
    const end = c.t + ((isLaw(c) ? normBeat(c).dur : c.dur) || 0);
    return end > limit + 1e-6 ? [`${c.name ?? "cue"} at ${c.t.toFixed(2)} ends ${end.toFixed(2)} > ${limit.toFixed(2)}`] : [];
  });
}

// the frame law (CONTRACT.md "Frame law"): the fields of scene.frame, the shot options and the reserved beats, in their legal ranges
function ruleFrame(s) {
  const out = [], F = s.frame ?? {};
  const hex = (v) => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v), num = (v) => typeof v === "number" && Number.isFinite(v);
  const ease = (e) => e === undefined || EASE_NAMES.includes(String(e).replace(/^ease/i, "").toLowerCase()) || /^(ease)?(incubic|outcubic|smoothstep|inout|inoutcubic|sine)$/i.test(e);
  const need = (ok, m) => { if (!ok) out.push(m); };
  const split = (g, at) => need(!g || (hex(g.shadow) && hex(g.high)), `${at} split needs shadow and high as #rrggbb`);
  for (const k of ["ink", "floor"]) need(F[k] === undefined || hex(F[k]), `frame.${k} is not #rrggbb`);
  need(!F.box || F.box.ratio === undefined || (num(F.box.ratio) && F.box.ratio > 1), "frame.box.ratio must be above 1");
  need(!F.lift || (num(F.lift[0]) && F.lift[0] < F.lift[1]), "frame.lift is [lo, hi] with lo < hi");
  need(!F.haze || F.haze.col === undefined || hex(F.haze.col), "frame.haze.col is not #rrggbb");
  split(F.split, "frame");
  (s.shots ?? []).forEach((sh, i) => {
    const at = `shot #${i + 1}`, os = sh.overscan ?? 1, pair = (v) => (Array.isArray(v) ? v : [v]);
    need(sh.t[1] - sh.t[0] >= 1 / 24 - TOL, `${at} is shorter than one frame (1/24 s)`);
    need(num(os) && os >= 1 && os <= 2, `${at} overscan ${os} outside 1..2`);
    need(!sh.pan || pair(sh.pan).flat().every((v) => num(v) && v >= 0 && v <= 1), `${at} pan is [[u, v], [u, v]] with every value in 0..1`);
    need(!sh.zoom || pair(sh.zoom).every((v) => num(v) && v >= 1 / os - 1e-6), `${at} zoom below 1 / overscan`);
    need(sh.step === undefined || (num(sh.step) && sh.step > 0), `${at} step must be a rate in Hz`);
    split(sh.grade?.split, at);
  });
  for (const b of (s.beats ?? []).filter((c) => typeof c.t === "number" && c.t < PARKED_AT && isLaw(c))) {
    const at = `${b.name} at ${b.t.toFixed(2)}`;
    need(ease(b.ease), `${at} ease "${b.ease}" unknown`);
    if (b.name === "iris") {
      need(b.to >= 0 && (b.from === undefined || (num(b.from) && b.from >= 0)), `${at} from / to are radii >= 0`);
      need(b.at === undefined || b.at === "seal" || b.at === "chest" || (Array.isArray(b.at) && b.at.length === 2 && b.at.every(num)), `${at} at is "seal", "chest" or [u, v]`);
      need(b.unit === undefined || b.unit === "h" || b.unit === "seal", `${at} unit is "h" or "seal"`);
    } else if (b.name === "flat" || b.name === "invert") {
      need(b.col === undefined || hex(b.col), `${at} col is not #rrggbb`);
      need(b.frames === undefined || (Number.isInteger(b.frames) && b.frames >= 1), `${at} frames is a whole count of 24 fps frames`);
      need(b.bars === undefined || b.bars === "keep" || b.bars === "paint", `${at} bars is "keep" or "paint"`);
    } else if (b.name === "ones" || b.name === "freeze") {
      need(normBeat(b).dur > 0, `${at} window is empty`);
      need(b.layers === undefined || (Array.isArray(b.layers) && b.layers.length > 0 && b.layers.every((l) => typeof l === "string")), `${at} layers is a list of layer names`);
    } else if (b.name === "grade") split(b.split, at);
    else if (b.name === "shake") {
      for (const e of b.schedule ?? [b]) need(num(e.amp) && e.amp > 0 && e.amp <= MAX_SHAKE && num(e.t), `${at} amp is in frame heights, above 0 and at most ${MAX_SHAKE} (0.0075 is 6 px at 800p); a schedule entry is { t, amp }`);
    }
  }
  return out;
}

function ruleFps(s) {
  return FPS.includes(s.fps) ? [] : [`fps ${s.fps} not in ${FPS.join("/")}`];
}

async function loadScene(id) {
  const mod = await import(new URL(`./${id}/scene.js`, import.meta.url).href);
  if (!mod.default || typeof mod.default !== "object") throw new Error("no default export object");
  return mod.default;
}

function countParked(s) {
  return (s.beats ?? []).filter((c) => typeof c.t === "number" && c.t >= PARKED_AT).length;
}

const report = process.argv.includes("--report");
const rows = [];
for (const id of DOCKS) {
  let fails, parked = 0;
  try {
    const scene = await loadScene(id);
    fails = Object.entries(RULES).flatMap(([name, rule]) => rule(scene).map((d) => `${name} ${d}`));
    parked = countParked(scene);
  } catch (e) {
    fails = [`load ${String(e.message).split("\n")[0]}`];
  }
  rows.push({ id, fails, parked });
}

let failed = 0;
for (const r of rows) {
  if (r.fails.length) {
    failed++;
    console.log(`FAIL ${r.id}: ${r.fails.join("; ")}`);
  } else {
    console.log(`ok ${r.id}`);
  }
  if (r.parked) console.log(`${r.id}: ${r.parked} parked`);
}
console.log(`timing: ${rows.length - failed} ok, ${failed} FAIL, ${rows.length} docks${report ? " (report mode)" : ""}`);
process.exitCode = report || failed === 0 ? 0 : 1;
