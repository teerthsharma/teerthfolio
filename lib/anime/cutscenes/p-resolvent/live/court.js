// Ported from components/world/cutscene/moves/p-resolvent.jsx; the pure court half, scalePose and the generators; its notes live with the original.

import { Object3D, Vector3 } from "three";
import { T, smooth } from "../clock.js";
import { AURA, BEAM, CHAIN, FULCRUM, HAND, SCALE_K } from "./cast.js";
import { hash } from "./toon.js";
import { groundY } from "./world.js";

export const CORE_Y = 0.9;
export const LEAVES = 260;
export const STONES = 70;
export const MOTES = 200;
export const DUST = 36;
export const SHARDS = 40;
const UP = new Vector3(0, 1, 0);
export const HW = new Vector3(...HAND).multiplyScalar(AURA.scale).applyAxisAngle(UP, AURA.yaw).add(new Vector3(...AURA.at));

export const RANKS = [[-7.6, 8, -2.0], [-9.0, 9, -2.7], [-10.4, 10, -3.4]];
export const FOOT = RANKS.flatMap(([z, n, x0], r) => Array.from({ length: n }, (_, i) => ({ x: x0 + i * 1.28 + 0.2 * (hash(r * 20 + i, 1) - 0.5), z: z + 0.3 * (hash(r * 20 + i, 2) - 0.5), r, k: i })));

const clamp01 = (v) => Math.min(1, Math.max(0, v));
export function tilt(tt) {
  let th = 0;
  const d = tt - T.tip;
  if (d > 0) th = 0.34 * (1 - Math.exp(-6 * d) * Math.cos(9 * d));
  th += 0.012 * Math.sin(tt * 1.7) * smooth(T.tip + 1, T.tip + 1.5, tt);
  th += 0.05 * smooth(T.gather, T.release, tt) + 0.012 * Math.sin(tt * 70) * smooth(T.gather + 0.5, T.release, tt);
  const k = smooth(T.swing[0], T.swing[1], tt);
  return th * (1 - k) + -0.95 * k * (0.35 + 0.65 * k);
}
export function arc(y0, vy, d) {
  let y = y0;
  let v = vy;
  let t = d;
  for (let k = 0; k < 3; k++) {
    const disc = Math.max(v * v + 19.6 * (y - 0.14), 0);
    const tl = (v + Math.sqrt(disc)) / 9.8;
    if (t <= tl) return y + v * t - 4.9 * t * t;
    t -= tl;
    y = 0.14;
    v = Math.sqrt(disc) * 0.34;
  }
  return 0.14;
}
export const PIECES = [
  { v: [-2.6, 3.8, 3.8], w: [3.5, 2.0, 5.0], rest: [0, 0.08] },
  { v: [1.9, 4.4, 2.4], w: [-2.0, 1.2, -6.0], rest: [0, -0.1] },
  { v: [-3.6, 3.4, 5.2], w: [1.0, 9.0, 0.5], rest: [0, 0] },
  { v: [1.7, 3.2, 3.8], w: [0.6, -8.0, 1.0], rest: [0, 0] },
  { v: [0.4, 2.2, 2.2], w: [2.0, 0.5, 3.0], rest: [0, Math.PI / 2] },
];

const O = new Object3D();

export function setM(m, i, x, y, z, sx, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) {
  O.position.set(x, y, z);
  O.rotation.set(rx, ry, rz);
  O.scale.set(sx, sy, sz);
  O.updateMatrix();
  m.setMatrixAt(i, O.matrix);
}
export function lift(x, y, z, d, up, swirl, out, o) {
  const r = Math.hypot(x, z);
  const a = Math.atan2(z, x) + swirl * d;
  const rr = r + out * d;
  o.x = Math.cos(a) * rr;
  o.z = Math.sin(a) * rr;
  o.y = y + up * d * (1 + 0.35 * d);
}

export function stoneAt() {
  return Array.from({ length: STONES }, (_, i) => {
    let x = -12 + 27 * hash(i, 1);
    const z = -24 + 27 * hash(i, 2);
    if (Math.hypot(x, z) < 2) x += 3;
    return { x, z, y: groundY(x, z), s: 0.12 + 0.5 * hash(i, 3) ** 2, h: hash(i, 4), at: T.release + 0.05 + 0.035 * Math.hypot(x, z), a: hash(i, 5) * 6, b: hash(i, 6) * 6 };
  });
}

export function leafAt() {
  return Array.from({ length: LEAVES }, (_, i) => ({ x: -18 + 40 * hash(i, 1), y: 0.25 + 9 * hash(i, 2), z: -30 + 37 * hash(i, 3), s: 0.2 + 0.16 * hash(i, 4), h: hash(i, 5), a: hash(i, 6) * 6 }));
}

export function moteAt() {
  return Array.from({ length: MOTES }, (_, i) => ({ x: -14 + 30 * hash(i, 1), y: 8 * hash(i, 2), z: -26 + 32 * hash(i, 3), s: 0.05 + 0.08 * hash(i, 4), sp: 0.25 + 0.5 * hash(i, 5), h: hash(i, 6) }));
}

export function scalePose(tt) {
  const K = SCALE_K;
  const broken = tt >= T.brk;
  const bk = Math.max(0, tt - T.brk);
  const sk = Math.max(0.001, smooth(T.scaleIn, T.scaleIn + 0.4, tt) * (1 + 0.18 * Math.sin(Math.PI * clamp01((tt - T.scaleIn) / 0.4))));
  const th = tilt(tt);
  const tb = broken ? tilt(T.brk) : th;
  const pv = HW.y + FULCRUM * K * (broken ? 1 : sk);
  const hang = broken ? 1 : sk;
  const cb = Math.cos(tb);
  const sb = Math.sin(tb);
  const swing = broken ? 0 : 0.05 * Math.sin(tt * 3.2) * (1 - Math.exp(-Math.max(0, tt - T.tip) * 0.8));
  const drop = CHAIN * K * hang;
  const place = (i, x, y, z, rz, d) => {
    if (!broken) return { p: [x, y, z], r: [0, 0, rz], s: sk * K };
    const P = PIECES[i];
    const e = (1 - Math.exp(-1.6 * d)) / 1.6;
    const f = (1 - Math.exp(-1.1 * d)) / 1.1;
    const settle = smooth(1.0, 1.9, d);
    return {
      p: [x + P.v[0] * f, arc(y, P.v[1], d), z + P.v[2] * f],
      r: [P.w[0] * e * (1 - settle) + P.rest[0] * settle, P.w[1] * e, (rz + P.w[2] * e) * (1 - settle) + P.rest[1] * settle],
      s: K,
    };
  };
  const stem = place(4, HW.x, HW.y, HW.z, 0, bk);
  const beamL = place(0, HW.x, pv, HW.z, -tb, bk);
  const beamR = place(1, HW.x, pv, HW.z, -tb, bk);
  const panL = place(2, HW.x - BEAM * K * cb * hang + Math.sin(swing) * drop, pv + BEAM * K * sb * hang - Math.cos(swing) * drop, HW.z, swing, bk);
  const panR = place(3, HW.x + BEAM * K * cb * hang + Math.sin(-swing) * drop, pv - BEAM * K * sb * hang - Math.cos(swing) * drop, HW.z, -swing, bk);
  return {
    sk, th, tb, hang, pv, bk, broken, swing, drop,
    stem: stem.p, beamL: beamL.p, beamR: beamR.p, panL: panL.p, panR: panR.p,
    rot: { stem: stem.r, beamL: beamL.r, beamR: beamR.r, panL: panL.r, panR: panR.r },
    scale: { stem: stem.s, beamL: beamL.s, beamR: beamR.s, panL: panL.s, panR: panR.s },
  };
}
