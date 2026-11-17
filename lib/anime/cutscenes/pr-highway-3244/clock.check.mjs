// Checks clock.js against the live race path: the card beats, the five flings, the warp round trip and the dock point.
import { T, PASS } from "./live/path.js";
import { C, DOCK, FLING, SH, unwarp, warp, W } from "./clock.js";
import { FIST, HOLD } from "./lens.js";

const fail = [];
const near = (a, b, e, what) => { if (!(Math.abs(a - b) <= e)) fail.push(`${what}: ${a} vs ${b}`); };

near(unwarp(T.cry), 7.638, 0.002, "cry");
const flings = PASS.map((p, i) => [p, i]).filter(([p]) => p > 0).sort((a, b) => a[0] - b[0]).map(([p]) => unwarp(p));
FLING.forEach((v, k) => near(v, flings[k], 0.002, `fling ${k}`));
const beats = { hop0: [T.hop[0], C.hop[0]], hop1: [T.hop[1], C.hop[1]], go: [T.go, C.go], kachow: [T.kachow, C.kachow], cross: [T.cross, C.cross], cover0: [T.cover[0], C.cover[0]], cover1: [T.cover[1], C.cover[1]], swap: [T.swap, C.swap], turn1: [T.turn[1], C.turn[1]], stop: [T.stop, C.stop], leave: [T.leave, C.leave] };
for (const [k, [r, c]] of Object.entries(beats)) near(unwarp(r), c, 0.002, k);
for (let k = 1; k <= 20; k++) near(warp(unwarp(k * 0.6)), k * 0.6, 1e-6, `round trip ${k}`);
const origin = W([0, 0, 0]);
near(Math.hypot(origin[0] - DOCK[0], origin[1] - DOCK[1], origin[2] - DOCK[2]), 0, 1e-9, "dock");
for (const [k, span] of Object.entries(SH)) for (const v of span) near(v * 12, Math.round(v * 12), 1e-6, `SH.${k} on the 12 grid`);
if (!(SH.a[1] - SH.a[0] >= 1.5)) fail.push(`SH.a holds ${SH.a[1] - SH.a[0]} s, need 1.5`);
near(C.plate, 1.5, 0, "C.plate");
if (!(HOLD.eye.length === 3 && HOLD.aim.length === 3 && HOLD.fov === 34)) fail.push("HOLD shape");
if (![FIST.dist, FIST.up, FIST.fov].every(Number.isFinite)) fail.push("FIST values");

if (fail.length) { console.error(fail.join("\n")); process.exit(1); }
console.log("ok clock");
