// Hair as flat drawn locks: tapered blades rooted on the skull in rings (crown, upper, wings, fringe, back), three tones per look,
// dark at the root and light at the tip, over a thin scalp cap. A look gives colours, counts and a seed; nothing else.
import { Vector3 } from "three";
import { ell, paint } from "../../../sdf.js";
import { blade, merge, mix } from "./surface.js";

const SC = [0, 0.148, -0.014], SR = [0.128, 0.126, 0.126], CC = [0, 0.175, -0.04], CR = [0.145, 0.1, 0.135], D2 = Math.PI / 180;

export const hairCap = (H) => [ell([0, 0.175, -0.04], [0.145, 0.1, 0.135], paint(H.dark, H.dark), 0.05), ell([0, 0.185, -0.045], [0.137, 0.092, 0.127], paint(H.dark, H.dark), 0.05)];

export function hairBlades(H) {
  let a = H.seed ?? 3;
  const rng = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296), P = [];
  const lock = (az, el, len, w, up, tone, spread = 1, onSkull = false) => {
    const A = az * D2, E = el * D2, ce = Math.cos(E);
    const q = new Vector3(Math.sin(A) * ce, Math.sin(E), Math.cos(A) * ce), [c0, r0] = onSkull ? [SC, SR] : [CC, CR], root = new Vector3(q.x * r0[0] * 0.97 + c0[0], q.y * r0[1] * 0.97 + c0[1], q.z * r0[2] * 0.97 + c0[2]);
    const n = new Vector3(q.x / r0[0], q.y / r0[1], q.z / r0[2]).normalize();
    const swirl = new Vector3(Math.cos(A), 0, -Math.sin(A)).multiplyScalar(0.18 * (rng() - 0.3));
    const d = n.clone().multiplyScalar(spread).add(new Vector3(0, up, 0)).add(swirl).normalize();
    const tip = tone === 0 ? H.hi : tone === 1 ? H.mid : mix(H.mid, H.dark, 0.35);
    P.push(blade({ root: root.toArray(), dir: d.toArray(), wide: [Math.cos(A), 0, -Math.sin(A)], len, w, th: 0.005, segs: 5, sharp: 0.55, bend: [swirl.x * 0.4, 0.006 * (1 - up) + 0.012, swirl.z * 0.4 + 0.012 * Math.sin(A)], base: H.dark, tip, side: H.mid }));
  };
  const jit = (v, k = 1) => v + (rng() - 0.5) * k;
  const tn = () => { const r = rng(); return r < 0.3 ? 0 : r < 0.75 ? 1 : 2; };
  const ring = (n, el, len, w, up, spread, skip = 0) => { for (let i = 0; i < n; i++) { const az = -180 + (360 * (i + 0.5)) / n; if (Math.abs(az) < skip) continue; lock(jit(az, 360 / n * 0.5), jit(el, 8), jit(len, len * 0.45), jit(w, w * 0.25), up, tn(), spread); } };
  ring(6, 85, 0.07, 0.075, 0.6, 1); ring(11, 72, 0.08, 0.075, 0.5, 1); ring(17, 58, 0.085, 0.075, 0.45, 1); ring(24, 44, 0.09, 0.075, 0.35, 1, 84); ring(20, 28, 0.09, 0.07, 0.2, 1.2, 88); ring(14, 10, 0.08, 0.055, 0.1, 1.2, 95);
  for (let i = 0; i < 8; i++) lock((i < 4 ? -1 : 1) * (86 + (i % 4) * 10), jit(34, 14), jit(0.12, 0.03), jit(0.055, 0.008), 0.1, tn(), 1.7);
  for (let i = 0; i < 13; i++) lock(-45 + i * 7.5 + jit(0, 2), jit(40, 3), jit(0.05, 0.016), jit(0.045, 0.006), -0.55, tn(), 0.7, true);
  return merge(P);
}
