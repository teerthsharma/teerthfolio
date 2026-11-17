// CLOCK for p-asmodeus: the beat grid, the kill sub-clock, and the window and mote hash that mirror asmWinLit and asmFearMotes (packet.js).
export const F = (f) => f / 12;
export const K = (k) => (192 + k) / 24;
export const stepT = (t, fps = 12) => Math.floor(t * fps + 0.02) / fps;

export const T = { throne: [0, 1], gate: [1, 2], street: [2, 4.5], fear: [4.5, 6.5], rise: [6.5, 8], kill: [8, 8.5], mend: [8.5, 10.5], zero: [10.5, 12] };
export const TURN_IN = 1.0;
export const TURN_OUT = 11.25;
export const FORMS = [
  { t: 1.0, form: "satan" }, { t: 2.0, form: "base" }, { t: 5.5, form: "redEyes" }, { t: 6.5, form: "grow1" }, { t: 7.0, form: "grow2" },
  { t: 7.5, form: "satan" }, { t: 10.5, form: "grow2" }, { t: 10.833, form: "grow1" }, { t: 11.0, form: "base" },
];

// the silhouette height of each form, in crew heights (the Demon Lord's horns and hair are part of it)
export const FORM_H = { pup: 1, base: 1, redEyes: 1, grow1: 1.08, grow2: 1.16, satan: 1.22 };
export function formAt(t) {
  if (t < TURN_IN || t >= TURN_OUT) return "pup";
  let form = FORMS[0].form;
  for (const f of FORMS) if (f.t <= t) form = f.form;
  return form;
}

export const MOTES = 8;
export const kOf = (t) => (t < 8 || t >= 8.5 ? -1 : Math.min(11, Math.floor((t - 8) * 24 + 0.02)));
export const lampOn = (t) => (t < 4.5 || t >= 9.9 ? 1 : 0);

const ramp = (a, b, x) => Math.min(1, Math.max(0, (x - a) / (b - a)));
export function gradeK(t) {
  if (t < 1) return 1;
  if (t < 2) return 1 - ramp(1, 2, t);
  if (t < 4.5) return 0;
  if (t < 6.5) return ramp(4.5, 6.5, t);
  if (t < 8.5) return 1;
  if (t < 10.5) return 1 - ramp(8.5, 10.5, t);
  return 0;
}

// float32 at every step, as the GPU: the hash is ill-conditioned (float64 gives 89 lit windows, float32 91)
const R = Math.fround;
const fract = (x) => R(x - Math.floor(x));
const cH21 = (x, y) => {
  const px = fract(R(R(x) * R(123.34))), py = fract(R(R(y) * R(456.21)));
  const d = R(R(px * R(px + R(45.32))) + R(py * R(py + R(45.32))));
  return fract(R(R(px + d) * R(py + d)));
};
const litAt = (col, row, wall) => (cH21(R(R(col + 7 * wall) + R(3.7)), R(row + R(3.7))) <= R(0.571) ? 1 : 0);

export function windows() {
  const out = [];
  for (let wall = 0; wall < 2; wall++) for (let col = 0; col < 7; col++) for (let row = 0; row < 12; row++) if (litAt(col, row, wall)) out.push({ col, row, wall });
  return out;
}

const LANDS = [];
for (let i = 0; i < 24; i++) {
  const wall = cH21(i, R(1.3)) <= 0.5 ? 1 : 0;
  const col = Math.floor(R(cH21(i, R(2.7)) * R(6.999)));
  const row = Math.floor(R(cH21(i, R(5.1)) * R(11.999)));
  if (litAt(col, row, wall)) for (let j = 0; j < MOTES; j++) LANDS.push(4.5 + 0.083 * col + 0.04 * j + 0.9);
}
export const moteQ = (t) => LANDS.filter((a) => stepT(t, 12) >= a).length / LANDS.length;
