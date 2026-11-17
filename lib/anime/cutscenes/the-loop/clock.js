// The-loop clock: beat times in real seconds on the 12 and 24 grids, the envelopes, the live demon circles, the seal and the dock.
import { heightAt } from "../../../world/terrain.js";

export const G = (f) => f / 12;
export const F = (f) => f / 24;
export const step12 = (t) => Math.floor(t * 12 + 1e-6) / 12;
export const smooth = (a, b, x) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

export const T = {
  drain: [1.0, 2.0], impactA: 2.0, impactAEnd: G(26), erupt: [2.0, 3.0], crack: [G(26), G(38)], pop: [G(31), G(34), G(37), G(40)],
  b3: 5.0, impactB: G(75), impactBEnd: G(77), shard: [G(77), 9.0], circlesOut: [7.0, 8.0], dip: [G(77), 6.75],
  sky: 9.0, rise: [9.3, 12.2], calm: 12.2, speak: [12.5, 17.0], card: [17.6, 21.8], cut: G(262), back: 22.5, hop: 23.2,
  iris: [24.0, 24.9167], end: 25.0,
};

export const POP = [0.38, 0.68, 0.99, 1.0];
export const popScale = (t, at) => (t < at ? 0 : POP[Math.floor(12 * (t - at) + 1e-6)] ?? 1);

export const CIRCLES = [
  { r: 4.4, h: 0, tilt: 0, spin: 0.22, hex: 1.0, spoke: 0.4, at: T.pop[0] },
  { r: 2.3, h: 0.12, tilt: 0.36, spin: -0.6, hex: 0.4, spoke: 1.0, at: T.pop[1] },
  { r: 1.65, h: 1.75, tilt: 0.46, spin: 0.9, hex: 0.4, spoke: 1.0, at: T.pop[2] },
  { r: 1.1, h: 3.0, tilt: 0.52, spin: -1.3, hex: 0.4, spoke: 1.0, at: T.pop[3] },
];

export const auraAt = (t) => smooth(2.0, 3.0, t) * (t < T.calm ? 1 : 0) + 0.4 * Math.exp(-((t - T.impactB) ** 2) / 0.04);
export const crackAt = (t) => smooth(T.crack[0], T.crack[1], t) * (t < T.sky ? 1 : 0);
export const drainAt = (t) => (t < T.calm ? smooth(T.drain[0], T.drain[1], t) : 0);
export const powerAt = (t) => smooth(2.0, 2.2, t) * (t < T.calm ? 1 : 0);
export const emblemAt = (t) => (t < F(48) ? 0 : t < F(50) ? 0.5 : t < T.cut ? 1 : 0);
export const liftAt = (t) => {
  if (t >= T.sky) return 0;
  const hover = 0.55 * smooth(2.0, 2.45, t);
  const dip = -0.3 * smooth(T.dip[0], T.dip[0] + 0.15, t) * (1 - smooth(T.dip[1] - 0.1, T.dip[1], t));
  return hover + dip;
};

export const SEAL = { scale: 1.6, yaw: 0 };
export const LINE = {
  text: "My Destruction Source was given a rude awakening.",
  src: "S1 E8 The Final Duel 15:13 to 15:15; wording TBV (issue #39, comment 2026-10-09)",
};
export const DOCK = [20.5, heightAt(20.5, -47), -47];
export const FOV = 34;
export const BACK = T.back;

export const PLATE = [T.impactA, F(50)];
export const plateOn = (t) => t >= PLATE[0] && t < PLATE[1];
export const DEBRIS = { a: [F(52), 3.6], b: [9.3, 10.9], size: [0.05, 0.2], arc: [Math.PI + 0.4, 2 * Math.PI - 0.4], reach: [0.5, 1.6] };
export const SPHERE = { r: 1.5, at: [2.2, 2.0, -2.6] };
export const LINE_PX = 2.1;
export const CAM = { eyes1: 0.4, eyes10: 0.3, eyes11: 0.33, face11x: 0.65 };
