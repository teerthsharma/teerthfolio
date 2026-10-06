// FX helpers for pr-mujoco-3450 (One Punch Man). Pure data + small maths; no engine mutation.
// Bible frames are 24 fps: fr(n) = n/24 s. Everything is anchored to ONE moment, the Serious Punch (TP, f94 = 3.917 s),
// unless scene.js names a beat. Cue / beat names this layer reads (all optional; the defaults are the bible's frames):
//   "punch" (TP), "hull" (born), "number" (15,361x card), "wipe" (credit wipe home)
//   reserved beats are only checked so this layer never double-fires them: "impact", "speedlines", "shock", "trauma".
import { Color, Vector3 } from "three";

export const FR = 24;
export const fr = (n) => n / FR;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const easeOut3 = (x) => 1 - (1 - clamp(x)) ** 3;
export const easeOutBack = (x) => { const t = clamp(x) - 1, c = 1.70158; return 1 + (c + 1) * t * t * t + c * t * t; };
export const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export const C = (hex) => new Color(hex);

// the bible's palette (sections 2, 3, 6)
export const PAL = {
  ink: "#12070a", cream: "#f3ecd8", white: "#ffffff", mint: "#3de0b0", mintLit: "#8ff5d5", mintSh: "#1f9d7f", mintDeep: "#0d5d55",
  violet: "#b79bff", violetLit: "#d7c8ff", violetSh: "#7a4be0", violetDeep: "#3a246f",
  coral: "#ff6a5a", coralLit: "#ff9a88", coralSh: "#c23a40", coralDeep: "#6b1b2b", hot: "#fff1d8",
  red: "#c0121f", redDeep: "#3a0a10", redHi: "#e0142c", yellow: "#ffd21f",
  shaft: "#f5e0b0", dome: "#cffff0", dust: "#96866c", dustLit: "#cdbd9e", dustInk: "#1a1620", stoneDeep: "#3b3340",
};

// ONE timeline, in seconds. every FX window is TP + n frames.
export function timeline(scene) {
  const bs = scene.beats ?? [];
  const at = (n, d) => { const b = bs.find((x) => x.name === n); return b ? b.t : d; };
  const has = (n) => bs.some((x) => x.name === n);
  const TP = at("punch", fr(94));
  const T = {
    has, TP,
    born: at("hull", TP - fr(53)), // f41 hull swells in f41-55
    rays: TP - fr(51),             // f43 rays grow, stagger 0.02 s per ray, done by f72
    wind: TP - fr(24),             // f70 cape on, crouch, parallel pressure lines f75-93
    par0: TP - fr(19), par1: TP - fr(1),
    rad0: TP - fr(1), rad1: TP + fr(20), // radial speed lines f93-f114
    snap: TP,                      // rays snap to hull vertices f94-106
    ringA: TP, ringB: TP + fr(2),  // f94 / f96-106
    dome0: TP + fr(4), dome1: TP + fr(29), // f98-f123
    close0: TP + fr(7), close1: TP + fr(41), // f101-f135 hull faces close mint -> violet
    shaft0: TP + fr(10), shaft1: TP + fr(29), // f104-f123, holds to f200
    deb0: TP, deb1: TP + fr(26),   // f94-f120
    num: at("number", TP + fr(136)), numEnd: at("number", TP + fr(136)) + fr(90), // f230 .. f320
    wipe: at("wipe", TP + fr(236)), // f330-336
    card0: TP + fr(2), card1: TP + fr(4), // red-black impact card f96-97
  };
  return T;
}

// the figure frame (seal-local: x right, y up, z forward; bible section 3)
export function figureFrame() {
  const H = new Vector3(2.4, 2.0, -1.3);               // hull centre
  const SH = new Vector3(0.5, 0.78, 0.12);             // shoulder (flipper root)
  const chest = new Vector3(0, 0.4, 0);
  const toSeal = chest.clone().sub(H).normalize();
  const corner = H.clone().addScaledVector(toSeal, 1.1); // the hull corner nearest the seal (ray root, unit hull radius 1.1)
  const D = corner.clone().sub(SH).normalize();          // the punch diagonal
  const M = SH.clone().addScaledVector(D, 2.0);          // mitt at full extension
  return { H, SH, chest, toSeal, corner, D, M, R: 1.1 };
}

// 42 unique hull vertices of IcosahedronGeometry(1, 1) (detail 1), deterministic order
export function hullVertices(ico) {
  const p = ico.attributes.position, seen = new Map(), out = [];
  for (let i = 0; i < p.count; i++) {
    const k = [p.getX(i), p.getY(i), p.getZ(i)].map((v) => v.toFixed(4)).join(",");
    if (!seen.has(k)) { seen.set(k, out.length); out.push(new Vector3(p.getX(i), p.getY(i), p.getZ(i)).normalize()); }
  }
  return out; // 42
}

// THE RAY PLAN: 48 rays sprayed from one corner over a 38 x 31 degree fan about the corner->hull axis.
// Fibonacci disc sampling: ray i sits at radius sqrt((i+.5)/48) of the fan, so the lowest ids are the centre rays (the hot nine).
// Each ray is greedily bound to the unused hull vertex its direction points at (42 land, 6 spare are left flying).
export function rayPlan(F, verts) {
  const A = F.H.clone().sub(F.corner).normalize();
  const up = new Vector3(0, 1, 0), Rv = new Vector3().crossVectors(A, up).normalize(), U = new Vector3().crossVectors(Rv, A).normalize();
  const tw = Math.tan((38 / 2) * Math.PI / 180), th = Math.tan((31 / 2) * Math.PI / 180);
  const used = new Set(), rays = [];
  for (let i = 0; i < 48; i++) {
    const ang = i * 2.39996323, rad = Math.sqrt((i + 0.5) / 48);
    const dir = A.clone().addScaledVector(Rv, Math.cos(ang) * rad * tw).addScaledVector(U, Math.sin(ang) * rad * th).normalize();
    let best = -1, bd = -2;
    verts.forEach((v, j) => {
      if (used.has(j)) return;
      const w = F.H.clone().addScaledVector(v, F.R).sub(F.corner).normalize();
      const d = dir.dot(w);
      if (d > bd) { bd = d; best = j; }
    });
    if (best >= 0 && used.size < 42) used.add(best); else best = -1;
    rays.push({ i, dir, len: 2.4 + hash(i * 3.1) * 1.8 - (i > 8 ? 0.8 * hash(i) : 0), delay: i * 0.02, v: best, hot: i < 9, thick: 1.15 - 0.85 * (i / 47) });
  }
  return rays;
}
export const landTime = (T, ray) => T.snap + 0.2 * ray.i / 47 + 0.15; // when the ray's tip arrives (also its vertex dot, 1-frame white tick)

// shared GLSL chunks
export const GLSL_HASH = `float h11(float n){ return fract(sin(n*127.1+311.7)*43758.5453); }
vec3 h31(float n){ return vec3(h11(n), h11(n+17.3), h11(n+41.9)); }`;
// screen-space overlay quad vertex: clip-space direct (no camera), vUv y-up
export const SCREEN_V = `varying vec2 vUv; void main(){ vUv = position.xy*0.5+0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
// the seal exclusion: the seal's box (x0,y0,x1,y1; y down) padded; overlays discard inside it (owner law: nothing covers the seal)
export const GLSL_BOX = `uniform vec4 uBox; uniform float uPad;
bool inSeal(vec2 uv){ vec2 s = vec2(uv.x, 1.0-uv.y); return uBox.x<2.0 && s.x>uBox.x-uPad && s.x<uBox.z+uPad && s.y>uBox.y-uPad && s.y<uBox.w+uPad; }`;
