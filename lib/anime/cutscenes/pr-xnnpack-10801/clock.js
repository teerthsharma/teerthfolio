// pr-xnnpack-10801 (Bleach, Aizen: Illusion Broken): the clock and the live constants. The engine runs on real seconds t; the live
// beats below are scene seconds tt = warp(t), through the site's PACE curve (lib/world/cutscene/clock.js). The lenses are livecam's.
import { beatT, realAt } from "../../../world/cutscene/clock.js";

export const ID = "pr-xnnpack-10801";
export const warp = (t) => beatT(ID, t);
export const unwarp = (u) => realAt(ID, u);

// the live jsx's beats (scene s, components/world/cutscene/moves/pr-xnnpack-10801.jsx)
export const T = { rise: [1.5, 3.0], sit: [2.7, 3.2], hype: 3.3, slash: [4.85, 5.4], crack: 5.35, holeIn: [5.4, 5.75], holeOut: [6.0, 6.45], webOut: [6.0, 6.5], reach: [9.25, 9.6], gap: [9.3, 9.6], snap: 9.6, web: [9.65, 9.98], brk: 10.0 };
// the card's bloom, collapse and stage radius (scene s; lib/world/cutscene/timeline.js with cards/pr-xnnpack-10801.js)
const BLOOM = [1.15, 1.6], COLLAPSE = [14.4, 14.8];
export const RADIUS = 40;

export const CORE_Y = 0.9, SEAT = 3.3, THRONE_Z = 1.0, PUPS_Z = 4.6, CRACK1 = [-7, 11, -26], SLASH_AT = [-3.3, 3.3, 4.6];
export const AIZEN_AT = [4.0, 1.2, 0.4], ICHIGO = [-4.6, 0.6, 4.2], GIN = [-2.8, 0.6, 4.0], URAHARA = [4.9, 0.6, 4.1];
export const MOON_WIDE = [-50, 34, -118], MOON_TALL = [-24, 40, -118], MOON_R = 17;

export const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

// the live useCutFrame envelopes, in scene seconds. `bloom` is radiusAt's factor (radius RADIUS * bloom). `inside` is camera-free:
// the live tests the sphere against the camera distance, here it is true once the stage has started to swell.
export function env(tt) {
  const rise = smooth(T.rise[0], T.rise[1], tt);
  const brk = tt - T.brk, dropK = Math.min(1, Math.max(0, brk / 0.5));
  const seatTop = SEAT - (SEAT + 2) * (1 - rise);
  const mend = smooth(T.webOut[0], T.webOut[1], tt);
  const bloom = smooth(BLOOM[0], BLOOM[1], tt) * (1 - smooth(COLLAPSE[0], COLLAPSE[1], tt));
  return {
    bloom, inside: bloom > 0, rise, sit: smooth(T.sit[0], T.sit[1], tt), slash: smooth(T.slash[0], T.slash[1], tt),
    hole: smooth(T.holeIn[0], T.holeIn[1], tt) * (1 - smooth(T.holeOut[0], T.holeOut[1], tt)) * 0.8, mend,
    web1: smooth(T.crack, T.crack + 0.2, tt) * (1 - mend), web2: smooth(T.web[0], T.web[1], tt),
    reach: smooth(T.reach[0], T.reach[0] + 0.15, tt),
    gap: smooth(T.gap[0], T.gap[1], tt) * (1 - smooth(T.brk, T.brk + 0.15, tt)) * (0.75 + 0.25 * Math.sin(tt * 18)),
    snap: Math.max(0, tt - T.snap), brk, dropK, seatTop,
    lift: brk > 0 ? SEAT * (1 - dropK * dropK) : Math.max(0, seatTop),
  };
}
export const liftAt = (t) => env(warp(t)).lift;

export const F = (f) => f / 24, G = (g) => g / 12;
export const TURN_T = G(27), INK_ON = G(38), BACK = F(421);
export const HIT = { crack: F(188), snap: F(387), brk: F(403) };
export const LINE = { A: F(100), B: F(244), C: F(378), credit: F(541), impact: [F(53), F(57)], shing: [F(61), F(83)], collapse: [26.65, 27.958] };
export const SHOT = [0, 1.0, TURN_T, INK_ON, 3.75, 4.5, 6.0, G(83), HIT.crack, 9.0, G(122), 12.0, G(167), G(183), HIT.brk, G(208), G(215), LINE.credit, 29.25];
export const CHEST = [0, SEAT + 1.2, 0];
export const AIM = { turn: [0, 0.9, 0], lineA: CHEST, lineB: CHEST, hold: [1.48, SEAT + 1.1, 0.61], land: [0, 1.0, 0] };
export const TELE_FOV = { turn: 14, lineA: 19, lineB: 20, hold: 19, land: 20 };

// livecam.json (T1): the rig origin is the seal's rest point, and the live rig group sits at world y 0 (`g.position` in the jsx)
export const DOCK = [60, 0, -43.9], TURN = 0.3655;
export const W = (p) => [DOCK[0] + p[0] * Math.cos(TURN) + p[2] * Math.sin(TURN), DOCK[1] + p[1], DOCK[2] + p[2] * Math.cos(TURN) - p[0] * Math.sin(TURN)];
export const FOV = 50, LENS_FOV = { island: 36.06, dimFar: 42.799, dimLow: 49.966 };
export const LENS = {
  island: [[-5.171, 3.5714, 13.9499], [0.3397, -0.2597, -0.904]],
  dimFar: [[0.1982, 1.0341, 8.9634], [0.2838, -0.1473, -0.9475]],
  dimLow: [[5.7842, 3.6989, 7.9639], [-0.4856, -0.0039, -0.8742]],
  lineA: [[6.5978, 4.1793, 10.5109], [-0.4889, 0, -0.8723]],
  slash: [[6.4264, 4.1712, 10.2422], [-0.4889, 0, -0.8723]],
  mend: [[6.3192, 4.1659, 10.0735], [-0.4889, 0, -0.8723]],
  lineB: [[-4.7927, 4.5456, 11.6157], [0.3793, -0.027, -0.9249]],
  lineC: [[-3.6208, 4.4006, 8.9602], [0.3793, -0.027, -0.9249]],
  brk: [[-3.3721, 4.3048, 8.4132], [0.3793, -0.0271, -0.9249]],
  island2: [[-3.0356, 3.2933, 7.0067], [0.3775, -0.3176, -0.8699]],
  credit: [[-3.1164, 3.3966, 7.1786], [0.3775, -0.3176, -0.8699]],
};
export const SEAL = { scale: 1.6, yaw: 0 };
