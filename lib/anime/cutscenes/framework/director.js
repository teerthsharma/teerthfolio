// THE CAMERA-LAW DIRECTOR (L3). One law for every cutscene, driven by scene.js shot data.
//
//   WIDE  pull back and up      the camera backs off the seal to the wide (a zoom as well as a dolly)
//   ARC   arc into the seal     a cut at the wide, then a curved dolly onto the seal's face
//   KILL  the kill angle        the opposite flank, lower, tighter, a few degrees of dutch
//   HOME  the chase pose        behind and above the seal, in open ground, looking where it looks
//   FREE  explicit keys         for inserts (an eye, a hand, a victim); the law still applies:
//                               the seal is kept in frame, and a cut comes at least every 5 s
//
// Every shot is a spherical rig about the seal's chest, in the SEAL'S OWN frame
// (x right of the seal, y up, z forward = where it faces; yaw turns the frame):
//
//   az    azimuth off the seal's front, radians. 0 = the camera is in front, looking at the face;
//         + swings toward the seal's left (+x), pi = straight behind (the chase pose).
//   r     distance from the chest (m).     elev   height of the eye above the chest (m).
//   look  [x,y,z] offset of the aim point from the chest, seal-local (m).
//   fov   vertical degrees.     dutch   roll in degrees.
//   Each of az/r/elev/fov/look/dutch is a number (held) or [from, to] (eased over the shot).
//
//   Eye(t)  = C + R_y(yaw) * ( r sin(az), elev, r cos(az) )     (r is the horizontal radius, elev the height)
//   Look(t) = C + R_y(yaw) * look
//   C       = seal.at + (0, 0.4 * scale, 0)    (the chest; the pup is 0.8 m tall)
//
// Guarantees applied after the shot's own numbers (the "keep the seal" pass, L1/L2):
//   1. height fraction:  frac = (0.8 s) / (2 d tan(fov/2)).  A non-wide shot never lets frac fall under
//      MIN_FRAC (0.14), a wide never under MIN_WIDE (0.05): the eye is pulled in along its own ray.
//   2. in frame: the chest direction must stay inside 62% of the vertical half-fov and 62% of the horizontal
//      half-fov; if not, the aim point slides toward the chest (never the eye: the move is the shot).
//   3. a cut every <= 5 s: a shot longer than MAX_SHOT is split in equal parts; each later part is HARD-CUT
//      to a different angle (az +-0.4 alternating, r x0.86, fov x0.92), so it reads as a cut, not a drift.
//   4. law order (dev warning only): wide -> arc -> kill -> home, with FREE inserts allowed anywhere.
//
// Shot options of the frame law (CONTRACT.md): hold (the camera is frozen in the world at the shot's start values),
// ease "cut" (the `to` values from the first frame), step n (the move quantised to n Hz), long (no auto-cut),
// overscan / pan / zoom (a 2D move: a crop window inside the frame rendered `overscan` times larger; a lens shift).
//
// Pure maths: no THREE state is kept here except the three scratch vectors the caller passes in.
import { easeOf } from "./law.js";

export const MAX_SHOT = 5; // s, the longest a camera may hold one setup
export const MIN_FRAC = 0.14; // seal height / frame height, close shots (L1 asks 0.12)
export const MIN_WIDE = 0.05; // the wide may shrink the seal, never lose it
export const SEAL_H = 0.8; // m, the locked pup
const D2 = Math.PI / 180;

const smooth = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
export const EASE = {
  smooth,
  linear: (x) => Math.min(1, Math.max(0, x)),
  in: (x) => { x = Math.min(1, Math.max(0, x)); return x * x * x; },
  out: (x) => { x = Math.min(1, Math.max(0, x)); return 1 - (1 - x) ** 3; },
  // a dolly that eases in gently and arrives hard: for the push into the kill
  snap: (x) => { x = Math.min(1, Math.max(0, x)); return 1 - (1 - x) ** 5; },
};
const lerp = (a, b, k) => a + (b - a) * k;
const pair = (v, d) => { const a = v ?? d; return Array.isArray(a) ? [a[0], a[1] ?? a[0]] : [a, a]; };
const pair3 = (v, d) => { const a = v ?? d; return Array.isArray(a[0]) ? [a[0], a[1] ?? a[0]] : [a, a]; };

// Law defaults. A scene.js shot overrides any key. Distances in metres for a 0.8 m seal at scale 1;
// the director multiplies r, elev and look by seal.scale so a bigger seal gets a bigger rig.
export const LAW = {
  wide: { az: 0.7, r: [4, 15], elev: [1.0, 9], fov: [28, 42], look: [[0, 0.2, 0], [0, 1.2, 0]], dutch: 0, ease: "smooth", minFrac: MIN_WIDE },
  arc: { az: [0.95, 0.45], r: [6.5, 2.7], elev: [3.5, 1.1], fov: [38, 30], look: [0, 0.05, 0], dutch: 0, ease: "smooth", minFrac: MIN_FRAC },
  kill: { az: [-0.35, -0.6], r: [2.7, 1.9], elev: [0.9, 0.75], fov: [28, 24], look: [0, 0.05, 0], dutch: [0, 6], ease: "snap", minFrac: MIN_FRAC },
  home: { az: Math.PI, r: [3.4, 3.8], elev: [2.0, 2.3], fov: [36, 38], look: [0, 0.2, 3.2], dutch: 0, ease: "smooth", minFrac: MIN_FRAC },
  free: { az: 0.5, r: 3, elev: 1.2, fov: 32, look: [0, 0.1, 0], dutch: 0, ease: "smooth", minFrac: MIN_FRAC },
};
const ORDER = ["wide", "arc", "kill", "home"];

// THE DEFAULT HOLD: a scene whose shots name no `menace` gets one at its biggest burst (the run of shots from the hardest shake or impact
// until 1.2 s are held, at most 3). Opt out: scene.hold = false, or menace: false on a shot. The run's own camera is replaced by the chest-up hold.
const burstAt = (b) => (b.name === "shake" ? Math.max(b.amp ?? 0.0075, ...(b.schedule ?? []).map((x) => x.amp ?? 0)) : b.name === "impact" ? 0.012 + 0.004 * (b.seq ?? [[0, 2]]).reduce((n, q) => n + (q[1] ?? 1), 0) : b.name === "trauma" ? 0.03 * (b.amount ?? 0.3) : 0);
export function autoHold(scene, shots) {
  const run = new Set();
  if (scene.hold === false || shots.some((s) => s.menace) || (typeof location !== "undefined" && new URLSearchParams(location.search).get("hold") === "0")) return run; // &hold=0: the lab's before
  const score = shots.map((s) => (s.t[0] < 0.4 || s.menace === false ? 0 : (scene.beats ?? []).reduce((m, b) => (b.t >= s.t[0] - 0.05 && b.t < s.t[1] ? Math.max(m, burstAt(b)) : m), 0)));
  const holds = (scene.duration ?? 0) >= 18 ? 2 : 1; // a long cutscene has a second hold at its next biggest burst, at least 5 s from the first
  const picked = [];
  for (let k = 0; k < holds; k++) {
    let at = -1;
    score.forEach((v, i) => { if (v >= 0.012 && v >= 0.5 * Math.max(0, ...picked.map((j) => score[j])) && (at < 0 || v > score[at]) && picked.every((j) => Math.abs(shots[i].t[0] - shots[j].t[0]) >= 5)) at = i; });
    if (at < 0) break;
    picked.push(at);
    for (let i = at, span = 0; i < shots.length && span < 1.2 && i < at + 3; i++) { if (shots[i].menace === false) break; run.add(shots[i]); span += shots[i].t[1] - shots[i].t[0]; }
  }
  return run;
}

// scene.shots -> compiled, cut-checked shot list [{i, n, law, t0, t1, p, moving, cut}]
export function compileShots(scene, warn = (m) => console.warn("[camera law]", m)) {
  const out = [];
  const shots = [...(scene.shots ?? [])].sort((a, b) => a.t[0] - b.t[0]);
  const auto = autoHold(scene, shots);
  let lastLaw = -1;
  for (const s0 of shots) {
    const A = auto.has(s0);
    const s = A ? { ...s0, menace: { auto: true }, az: undefined, r: undefined, elev: undefined, fov: undefined, look: undefined, dutch: undefined, eye: undefined, lookAt: undefined, overscan: undefined, pan: undefined, zoom: undefined, ease: undefined, dof: undefined, hold: true, minFrac: undefined } : s0;
    const law = LAW[s.law] ? s.law : "free";
    if (ORDER.includes(law)) { const k = ORDER.indexOf(law); if (k < lastLaw) warn(`shot ${s.n}: ${law} after ${ORDER[lastLaw]}`); lastLaw = Math.max(lastLaw, k); }
    const mq = typeof location === "undefined" ? null : new URLSearchParams(location.search).get("menace"); // &menace=1 holds every shot (a lab preview)
    const M = s.menace || (mq && s.menace !== false) ? { frac: 0.7, ...(typeof s.menace === "object" ? s.menace : {}) } : null; // the calm-menace hold (CONTRACT.md "The hold"): chest-up, low, the seal large
    const base = M ? { ...LAW[law], az: 0.12, r: 1.9, elev: 0.1, fov: 30, look: [0, 0.16, 0], dutch: 0, ease: "smooth" } : LAW[law];
    const span = s.t[1] - s.t[0];
    const over = s.overscan || s.pan || s.zoom ? { s: Math.max(1, s.overscan ?? 1), pan: pair3(s.pan, [0.5, 0.5]), zoom: pair(s.zoom, 1) } : null;
    if (over) over.scale = Math.min(2, over.s * Math.max(1, ...over.zoom)); // the plate target, in frames: sharp at the deepest zoom
    const hold = !!(s.hold || over);
    const parts = hold || s.long ? 1 : Math.max(1, Math.ceil(span / MAX_SHOT - 1e-6));
    if (parts > 1) warn(`shot ${s.n} holds ${span.toFixed(1)} s > ${MAX_SHOT} s: auto-cut into ${parts}`);
    for (let k = 0; k < parts; k++) {
      const t0 = s.t[0] + (span * k) / parts, t1 = s.t[0] + (span * (k + 1)) / parts;
      // the part k of a long shot runs the same move, but on its own slice, from a different angle
      const sub = (v, d) => { const [a, b] = pair(v, d); return [lerp(a, b, k / parts), lerp(a, b, (k + 1) / parts)]; };
      const sub3 = (v, d) => { const [a, b] = pair3(v, d); return [a.map((x, j) => lerp(x, b[j], k / parts)), a.map((x, j) => lerp(x, b[j], (k + 1) / parts))]; };
      const flip = k % 2 ? -1 : 1;
      const cutAz = k ? flip * (s.cutAz ?? 0.4) : 0, cutR = k ? 0.86 ** k : 1, cutF = k ? 0.92 : 1;
      const [a0, a1] = sub(s.az, base.az), [r0, r1] = sub(s.r, base.r), [e0, e1] = sub(s.elev, base.elev), [f0, f1] = sub(s.fov, base.fov), [d0, d1] = sub(s.dutch, base.dutch);
      const [l0, l1] = sub3(s.look, base.look);
      out.push({
        i: out.length, n: s.n ?? out.length + 1, law, k, parts,
        t0, t1, ease: s.ease ?? base.ease, minFrac: M ? Math.max(M.frac, s.minFrac ?? 0) : s.minFrac ?? base.minFrac, free: s.eye ?? null,
        p: { az: [a0 + cutAz, a1 + cutAz], r: [r0 * cutR, r1 * cutR], elev: [e0, e1], fov: [f0 * cutF, f1 * cutF], dutch: [d0, d1], look: [l0, l1] },
        key: s.eye ? { eye: s.eye, look: s.lookAt ?? s.look } : null, // FREE: absolute world keys, [from, to]
        dof: s.dof ?? null, menace: M, data: s0, hold, step: s.step ?? (over ? 24 : 0), over,
        // a plate may be baked once if nothing about the camera moves in the shot
        moving: (!hold && s.ease !== "cut" && (a0 !== a1 || r0 !== r1 || e0 !== e1 || f0 !== f1 || !!s.eye)) || s.moving === true,
      });
    }
  }
  return out;
}

// the director: owns the compiled list and answers camera(t)
export class CameraDirector {
  constructor(scene, warn) {
    this.scene = scene;
    this.shots = compileShots(scene, warn);
    this.seal = scene.seal ?? {};
    this.shot = this.shots[0] ?? null;
    this.out = { eye: [0, 1, 4], look: [0, 0.4, 0], fov: 32, dutch: 0 };
    this.lastIndex = -1;
  }
  index(t) {
    const S = this.shots;
    if (!S.length) return -1;
    if (t <= S[0].t0) return 0;
    for (let i = S.length - 1; i >= 0; i--) if (t >= S[i].t0) return i;
    return 0;
  }
  // where the seal is right now (the player keeps this current as the seal moves): { at:[x,y,z], yaw, scale }
  sealState() { return this.seal; }
  // where the seal is at clock t (the player supplies it): a held shot is rigged about the seal as it stood on the cut
  sealAt() { return this.sealState(); }
  // write eye, look, fov, dutch into this.out and return it. aspect = width / height of the frame
  at(t, aspect = 16 / 10) {
    const i = this.index(t);
    const sh = this.shots[i];
    this.shot = sh;
    const o = this.out;
    if (!sh) return o;
    const S = sh.hold ? this.sealAt(sh.t0) : this.sealState();
    const sc = S.scale ?? 1, yaw = S.yaw ?? 0, at = S.at ?? [0, 0, 0];
    const C = [at[0], at[1] + 0.4 * sc, at[2]];
    const tq = sh.step ? sh.t0 + Math.floor((t - sh.t0) * sh.step + 1e-6) / sh.step : t;
    const mv = easeOf(sh.ease)((tq - sh.t0) / Math.max(1e-6, sh.t1 - sh.t0)); // the move; a held rig stays at 0 and the 2D move takes it
    const u = sh.hold ? 0 : mv;
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const toWorld = (x, y, z) => [C[0] + x * cy + z * sy, C[1] + y, C[2] - x * sy + z * cy]; // R_y(yaw), +z forward
    let eye, look, fov, dutch;
    if (sh.key) {
      // FREE: [from, to] world-space eye and look
      const e = sh.key.eye, l = sh.key.look ?? [C, C];
      const E0 = e[0], E1 = e[1] ?? e[0];
      const L0 = Array.isArray(l[0]) ? l[0] : l, L1 = Array.isArray(l[0]) ? l[1] ?? l[0] : l;
      eye = [0, 1, 2].map((j) => lerp(E0[j], E1[j], u));
      look = [0, 1, 2].map((j) => lerp(L0[j], L1[j], u));
      fov = lerp(sh.p.fov[0], sh.p.fov[1], u); dutch = lerp(sh.p.dutch[0], sh.p.dutch[1], u);
    } else {
      const P = sh.p;
      const az = lerp(P.az[0], P.az[1], u), r = lerp(P.r[0], P.r[1], u) * sc, el = lerp(P.elev[0], P.elev[1], u) * sc;
      fov = lerp(P.fov[0], P.fov[1], u); dutch = lerp(P.dutch[0], P.dutch[1], u);
      const lk = [0, 1, 2].map((j) => lerp(P.look[0][j], P.look[1][j], u) * sc);
      eye = toWorld(r * Math.sin(az), el, r * Math.cos(az));
      look = toWorld(lk[0], lk[1], lk[2]);
    }
    // ---- keep the seal (L1/L2) ----
    const vf = fov * D2, th = Math.tan(vf / 2), tw = th * aspect;
    const sealC = [at[0], at[1] + 0.4 * sc, at[2]];
    // 1. height fraction: pull the eye in along the eye->chest ray until the seal is big enough
    let v = [sealC[0] - eye[0], sealC[1] - eye[1], sealC[2] - eye[2]];
    let d = Math.hypot(...v) || 1;
    const dMax = (SEAL_H * sc) / (2 * th * sh.minFrac);
    if (d > dMax) {
      const k = dMax / d;
      eye = [sealC[0] - v[0] * k, sealC[1] - v[1] * k, sealC[2] - v[2] * k];
      v = [sealC[0] - eye[0], sealC[1] - eye[1], sealC[2] - eye[2]]; d = dMax;
    }
    // 2. in frame: slide the aim toward the chest until the chest is within 62% of the half-fov both ways
    const f = [look[0] - eye[0], look[1] - eye[1], look[2] - eye[2]];
    const fl = Math.hypot(...f) || 1; const F = f.map((x) => x / fl);
    // camera basis (world up y, ignoring dutch for the test)
    let R = [F[2], 0, -F[0]]; const rl = Math.hypot(...R) || 1; R = R.map((x) => x / rl);
    const U = [R[1] * F[2] - R[2] * F[1], R[2] * F[0] - R[0] * F[2], R[0] * F[1] - R[1] * F[0]];
    const cz = v[0] * F[0] + v[1] * F[1] + v[2] * F[2];
    if (cz > 0.05) {
      const cx = (v[0] * R[0] + v[1] * R[1] + v[2] * R[2]) / cz, cyv = (v[0] * U[0] + v[1] * U[1] + v[2] * U[2]) / cz;
      const ox = Math.abs(cx) > 0.62 * tw ? cx - Math.sign(cx) * 0.62 * tw : 0, oy = Math.abs(cyv) > 0.62 * th ? cyv - Math.sign(cyv) * 0.62 * th : 0;
      if (ox || oy) for (let j = 0; j < 3; j++) look[j] += (R[j] * ox + U[j] * oy) * cz;
    } else {
      look = sealC.slice(); // the seal is behind the lens: aim straight at it
    }
    o.eye = eye; o.look = look; o.fov = fov; o.dutch = dutch;
    o.shotIndex = i; o.shotU = mv; o.cut = this.lastIndex !== i; this.lastIndex = i;
    o.win = null; o.pan = null;
    if (sh.over) {
      const O = sh.over, z = Math.max(1 / O.s, lerp(O.zoom[0], O.zoom[1], mv)), w = 1 / (O.s * z);
      const pu = Math.min(1, Math.max(0, lerp(O.pan[0][0], O.pan[1][0], mv))), pv = Math.min(1, Math.max(0, lerp(O.pan[0][1], O.pan[1][1], mv)));
      o.win = [pu * (1 - w), pv * (1 - w), w, w]; o.pan = { u: pu, v: pv, zoom: z };
      o.fovO = (2 * Math.atan(O.s * th)) / D2;
    }
    return o;
  }
  // apply to a THREE camera (+ trauma shake offset, a Vector3 or null)
  apply(cam, out, shake = null) {
    cam.position.set(out.eye[0], out.eye[1], out.eye[2]);
    if (shake) cam.position.add(shake);
    cam.up.set(Math.sin(out.dutch * D2), Math.cos(out.dutch * D2), 0);
    cam.lookAt(out.look[0], out.look[1], out.look[2]);
    cam.fov = out.win ? out.fovO : out.fov;
    if (out.win) { const A = cam.aspect, W = out.win; cam.setViewOffset(A, 1, W[0] * A, W[1], W[2] * A, W[3]); }
    else if (cam.view?.enabled) cam.clearViewOffset();
    cam.updateProjectionMatrix();
  }
  // the law, as a report: used by the lab's overlay and by the Consolidate phase
  report() {
    const S = this.shots, issues = [];
    for (let i = 0; i < S.length; i++) {
      if (!S[i].hold && !S[i].data.long && S[i].t1 - S[i].t0 > MAX_SHOT + 1e-6) issues.push(`shot ${S[i].n}: > ${MAX_SHOT} s`);
      if (i && Math.abs(S[i].t0 - S[i - 1].t1) > 1e-3) issues.push(`gap between ${S[i - 1].n} and ${S[i].n}`);
    }
    const laws = S.map((s) => s.law).filter((l) => ORDER.includes(l));
    for (const need of ORDER) if (!laws.includes(need)) issues.push(`missing ${need}`);
    return issues;
  }
}
