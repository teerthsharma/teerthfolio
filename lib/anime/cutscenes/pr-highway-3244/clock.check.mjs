// Checks clock.js against the live race path: the card beats, the five flings, the warp round trip and the dock point.
import { T, PASS } from "./live/path.js";
import { C, DOCK, FLING, LINE, POP, SH, unwarp, warp, W } from "./clock.js";
import { FIST, HOLD, RACE2 } from "./lens.js";

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
near(C.plate, C.bloom[1], 0, "C.plate is the live bloom end");
const AREA = { duration: 25.8, sign: [0.45, 1.05], impact: 1.15, bloom: [1.15, 1.6], enter: 1.95, lineA: 2.4, move: [7.2, 7.8], lineB: 15.3, credit: 21, collapse: [25, 25.4] };
const same = (a, b, what) => { if (JSON.stringify(a) !== JSON.stringify(b)) fail.push(`${what}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`); };
same(LINE.end, AREA.duration, "duration");
same(C.sign, AREA.sign, "sign"); same(C.impact, AREA.impact, "impact"); same(C.bloom, AREA.bloom, "bloom"); same(C.enter, AREA.enter, "enter");
same(LINE.A[0], AREA.lineA, "lineA"); same(LINE.B[0], AREA.lineB, "lineB"); same(LINE.credit[0], AREA.credit, "credit"); same(LINE.collapse, AREA.collapse, "collapse");
if (!(C.cry >= AREA.move[0] && C.cry <= AREA.move[1])) fail.push(`cry ${C.cry} outside the move ${AREA.move}`);
const pop12 = POP * 12, pop24 = POP * 24;
if (Math.abs(pop12 - Math.round(pop12)) > 1e-9 || Math.abs(pop24 - Math.round(pop24)) > 1e-9) fail.push(`POP ${POP} is off the 24 grid`);
if (!(POP > C.turn[1] - 0.06 && POP < C.turn[1])) fail.push(`POP ${POP} outside (${C.turn[1] - 0.06}, ${C.turn[1]})`);
if (!(HOLD.eye.length === 3 && HOLD.aim.length === 3 && HOLD.fov === 34)) fail.push("HOLD shape");
if (!(RACE2.eye.length === 3 && RACE2.aim.length === 3 && RACE2.fov === 48)) fail.push("RACE2 shape");
if (![FIST.dist, FIST.up, FIST.fov].every(Number.isFinite)) fail.push("FIST values");
if (!FIST.rots.includes(FIST.rot)) fail.push(`FIST.rot ${FIST.rot} is not in FIST.rots`);

if (fail.length) { console.error(fail.join("\n")); process.exit(1); }
console.log("ok clock");
