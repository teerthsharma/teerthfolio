// COMET TIAMAT (bible 3.12, frame 08-yn-tiamat.jpg): a 3-band rainbow tail with star-dust inside, a thin second blue streak,
// a head flare, a break-up into two then three pieces (threes), and a small RED EMBER piece that falls to the far shore and
// bursts there (fan burst, impact flare 0.9, the far shore lit). Easter egg 4: the comet splits in two, then three.
//
// Palette (S = sampled from the frame): core #b0c8f8 (S), head #9bfeff (S), outer haze #2964b7 (S), magenta #d04ab8 (E),
// green #2fe0b0 (E), ember #ff4a3a (E), sky #192b3e (S).
//
// Tail maths. u = 0 at the head, 1 at the tail end; v in [-1, 1] across (signed).
//   half width      w(u) = mix(W0, W1, u^.8)                 (6 percent of frame at the head tapering to 2 percent)
//   ragged edge     r = |v| + (vn(14 u + seed) - .5) * .18 u
//   bands (painted, soft-edged, NOT a gradient):
//       core    1 - smoothstep(.16, .30, r)                   pale cyan #b0c8f8, head end tinted #9bfeff
//       magenta band on v in (+.18, +.58)  = smoothstep(.12,.24,v) * (1 - smoothstep(.46,.62,v))
//       green band   on v in (-.58, -.18)  = the mirror
//       haze    (1 - smoothstep(.35, 1, r)) * .55 of #2964b7
//   star-dust       cells (u 90, v 9 + step): hash > .93 -> a round speck of radius .32 cell, twinkle on threes
//   alpha           (1 - smoothstep(.55, 1, u)) * smoothstep(0, .02, u) * (1 - smoothstep(.7, 1, r)) * uK
// Flight. Main head Pm(t) = H0 + (I - H0) e(u), u = (t - cs)/(ti - cs), e = u^1.5 (it accelerates).
//   piece B leaves A at the split: off_B = (right * -170 + up * 80) sc * smoothstep(split, ti, t)   (on threes)
//   ember E leaves B at the third beat and FALLS to the impact point I: lerp(P_B(t3), I, ((t - t3)/(ti - t3))^2)
import { ribbon, billboard, clamp01, sstep, lerp } from "./lib.js";

export default function makeComet(ctx, sh, T, L) {
  const { THREE } = ctx;
  const group = new THREE.Group(); group.name = "comet";
  const C = (h) => new THREE.Color(h);
  const sc = L.sc;
  const H0 = new THREE.Vector3(...L.cometFrom), I = new THREE.Vector3(...L.impact);
  const rt = new THREE.Vector3(...L.rt), UP = new THREE.Vector3(0, 1, 0);
  const cs = T.cometStart, ti = T.cometImpact, ts = T.cometSplit, t3 = T.cometThird, TS = T.sc;

  const tailFs = /* glsl */ `
    uniform float uK; uniform float uSeed; uniform float uStep; uniform float uMode;
    uniform vec3 cCore; uniform vec3 cHead; uniform vec3 cMag; uniform vec3 cGreen; uniform vec3 cOuter; uniform vec3 cEmber; uniform vec3 cEmberDeep;
    void main() {
      float u = vUV.x, v = vUV.y;
      float rag = (vn(vec2(u * 14. + uSeed, uSeed * .37)) - .5) * .18 * u;
      float r = abs(v) + rag;
      float tail = (1. - smoothstep(.55, 1., u)) * smoothstep(0., .02, u);
      float edge = 1. - smoothstep(.7, 1., r);
      vec3 col; float hdr = 1.; float a;
      if (uMode < .5) {
        float core = 1. - smoothstep(.16, .30, r);
        float mag = smoothstep(.12, .24, v) * (1. - smoothstep(.46, .62, v));
        float grn = smoothstep(.12, .24, -v) * (1. - smoothstep(.46, .62, -v));
        col = cOuter * (1. - smoothstep(.35, 1., r)) * .55;
        col = mix(col, cMag, mag * .85);
        col = mix(col, cGreen, grn * .8);
        col = mix(col, mix(cCore, cHead, 1. - smoothstep(0., .1, u)), core);
        // star-dust inside the tail, twinkling on threes
        vec2 cell = vec2(u * 90., v * 9. + uStep * .37);
        vec2 g = floor(cell), f = fract(cell) - .5;
        float hs = h21(g + uSeed);
        float star = step(.93, hs) * (1. - smoothstep(.12, .32, length(f))) * (.5 + .5 * h21(g + uStep));
        col += vec3(.82, .92, 1.) * star * (1. - r) * 1.6;
        hdr = 1.15 + 0.5 * (1. - smoothstep(0., .12, u)); // the head end blooms
        a = tail * edge * (.35 + .65 * max(max(core, max(mag, grn)), 1. - r));
      } else if (uMode < 1.5) {
        // the thin second streak: one blue band, a hard bright centre
        float core = 1. - smoothstep(.0, .35, r);
        col = mix(cOuter * 1.2, cCore, core); hdr = 1.05;
        a = tail * (1. - smoothstep(.45, 1., r));
      } else {
        // the red ember: hot cream core, ember body, deep wine edge; a short fiery ribbon
        float core = 1. - smoothstep(.0, .28, r);
        float body = 1. - smoothstep(.2, .7, r);
        col = mix(cEmberDeep, cEmber, body); col = mix(col, vec3(1., .86, .62), core);
        float flick = .75 + .25 * h21(vec2(floor(u * 24.), uStep));
        hdr = 1.25; a = tail * edge * flick;
      }
      gl_FragColor = vec4(col * hdr, a * uK);
    }`;
  const tailU = () => ({
    uMode: { value: 0 }, cCore: { value: C("#b0c8f8") }, cHead: { value: C("#9bfeff") }, cMag: { value: C("#d04ab8") },
    cGreen: { value: C("#2fe0b0") }, cOuter: { value: C("#2964b7") }, cEmber: { value: C("#ff4a3a") }, cEmberDeep: { value: C("#7a1840") },
  });

  const headFs = /* glsl */ `
    uniform vec3 uCol; uniform vec3 uCol2; uniform float uHdr; uniform float uRays; uniform float uSeed; uniform float uSize;
    void main() {
      float d = length(vUv); if (d > 1.) discard;
      float g = glint(vUv, uSize) * (1. - smoothstep(.75, 1., d));
      float ang = atan(vUv.y, vUv.x);
      float rays = uRays > 0. ? pow(abs(sin(ang * uRays * .5 + uSeed + floor(uStep * .5) * .0)), 26.) * exp(-d * 3.2) : 0.;
      float tot = g + rays;
      vec3 col = mix(uCol, uCol2, clamp(tot - .5, 0., 1.));
      gl_FragColor = vec4(col * uHdr, clamp(tot, 0., 1.) * uK * vFade);
    }`;
  const mkHead = (col, col2, rays, size, order = 5) => {
    const b = billboard(THREE, sh, headFs, { uCol: { value: C(col) }, uCol2: { value: C(col2) }, uHdr: { value: 1.4 }, uRays: { value: rays }, uSeed: { value: 0.7 }, uSize: { value: size } }, { order });
    group.add(b); return b;
  };

  // pieces: A (main), B (second), E (ember)
  const mkPiece = (mode, seed) => {
    const r = ribbon(THREE, tailFs, { ...tailU(), uMode: { value: mode }, uSeed: { value: seed } }, { order: 2 });
    group.add(r); return r;
  };
  const A = mkPiece(0, 1.7), B = mkPiece(0, 4.1), E = mkPiece(2, 7.3), S2 = mkPiece(1, 2.9);
  const hA = mkHead("#9bfeff", "#ffffff", 0, 0.3), hB = mkHead("#9bfeff", "#ffffff", 0, 0.3), hE = mkHead("#ff4a3a", "#fff0c0", 10, 0.34, 6);
  // impact: the flare (0.9), the radial fan, the far shore glow (horizontal ellipse)
  const flare = mkHead("#ffd6a0", "#ffffff", 14, 0.3, 7);
  const shoreFs = /* glsl */ `
    uniform vec3 uCol; uniform float uHdr;
    void main() {
      float d = length(vUv * vec2(1., 1.)); if (d > 1.) discard;
      float g = pow(1. - d, 2.2);
      float streak = exp(-abs(vUv.y) * 9.) * exp(-abs(vUv.x) * 1.4); // light spilling flat across the water
      gl_FragColor = vec4(uCol * uHdr, clamp(g * .6 + streak * .55, 0., 1.) * uK * vFade);
    }`;
  const shore = billboard(THREE, sh, shoreFs, { uCol: { value: C("#ff9a80") }, uHdr: { value: 1.0 } }, { order: 4 });
  group.add(shore);

  const P = (out, tt, kind) => {
    // head position of a piece at time tt (real s), unclamped past impact so the pieces keep falling
    const u = (tt - cs) / Math.max(0.01, ti - cs);
    const e = Math.pow(Math.max(u, 0), 1.5);
    out.copy(H0).lerp(I, e * (kind === "E" ? 0.0 : 0.82));
    if (kind === "B") out.addScaledVector(rt, -170 * sc * sstep(ts, ti, tt)).addScaledVector(UP, 80 * sc * sstep(ts, ti, tt));
    if (kind === "A") out.addScaledVector(rt, 40 * sc * sstep(ts, ti, tt)).addScaledVector(UP, -25 * sc * sstep(ts, ti, tt));
    return out;
  };
  const pa = new THREE.Vector3(), pb = new THREE.Vector3(), pe = new THREE.Vector3(), pb3 = new THREE.Vector3(), dir = new THREE.Vector3(), q = new THREE.Vector3();
  const place = (r, head, tt, kind, len, w0, w1, k) => {
    // tail direction = the reversed velocity, from a finite difference
    P(q, tt - 0.12, kind === "E" ? "B" : kind); dir.copy(q).sub(head);
    if (kind === "E") dir.copy(H0).sub(I);
    if (dir.lengthSq() < 1e-6) dir.copy(H0).sub(I);
    dir.normalize();
    const u = r.userData.u;
    u.uHead.value.copy(head); u.uTail.value.copy(dir); u.uBend.value.set(0, len * 0.12, 0);
    u.uLen.value = len; u.uW0.value = w0; u.uW1.value = w1; u.uK.value = k; u.uStep.value = sh.uStep.value;
    r.visible = k > 0.003;
  };

  return {
    group,
    update(t, dt, cue) {
      const on = t > cs - 0.2 && t < ti + 2.2 * TS;
      for (const o of [A, B, E, S2, hA, hB, hE, flare, shore]) o.visible = false;
      if (!on) return;
      // the break-up runs on threes: positions of the pieces are read from the stepped clock
      const tt3 = Math.floor(t * 8) / 8;
      const appear = sstep(cs - 0.1, cs + 0.8 * TS, t);
      const fade = 1 - sstep(12.0 * TS, 15.0 * TS, t); // bible: fade 12.0-15.0
      const kAB = appear * fade;
      // A: the main body, shrinking a little at the split
      const split = sstep(ts, ts + T.cometSplitD, t);
      P(pa, ts > t ? t : tt3, "A");
      place(A, pa, ts > t ? t : tt3, "A", lerp(520, 400, split) * sc, 28 * sc, 7 * sc, kAB);
      hA.userData.u.uCenter.value.copy(pa); hA.userData.u.uSize.value.set(48 * sc, 48 * sc); hA.userData.u.uK.value = kAB * 0.95; hA.visible = kAB > 0.01;
      // the thin second streak, alongside A (about 18 percent of its length)
      q.copy(pa).addScaledVector(rt, -36 * sc).addScaledVector(UP, 18 * sc);
      place(S2, q.clone(), tt3, "A", 95 * sc, 5 * sc, 1.5 * sc, kAB * 0.9 * sstep(cs + 0.3, cs + 1.2, t));
      // B: leaves at the split
      if (t >= ts) {
        P(pb, tt3, "B");
        const kb = kAB * sstep(ts, ts + 0.35, t);
        place(B, pb, tt3, "B", 360 * sc, 20 * sc, 5 * sc, kb);
        hB.userData.u.uCenter.value.copy(pb); hB.userData.u.uSize.value.set(34 * sc, 34 * sc); hB.userData.u.uK.value = kb * 0.9; hB.visible = kb > 0.01;
      }
      // E: the red ember, off B at the third beat, falling to the far shore
      if (t >= t3 && t < ti + 0.15) {
        P(pb3, t3, "B");
        const u3 = clamp01((tt3 - t3) / Math.max(0.05, ti - t3));
        pe.copy(pb3).lerp(I, u3 * u3);
        const ke = sstep(t3, t3 + 0.3, t) * (1 - sstep(ti - 0.05, ti + 0.15, t));
        place(E, pe, tt3, "E", 240 * sc, 12 * sc, 2.5 * sc, ke);
        hE.userData.u.uCenter.value.copy(pe); hE.userData.u.uSize.value.set(40 * sc, 40 * sc); hE.userData.u.uK.value = ke; hE.visible = ke > 0.01;
        hE.userData.u.uSeed.value = 0.7 + Math.floor(t * 8) * 0.31; // the fan re-rolls on threes
      }
      // impact: the flare 0.9 with a radial fan at the far shore, the far shore lit
      if (t >= ti) {
        const a = t - ti, f = Math.exp(-a * 2.4) * (1 - sstep(1.2 * TS, 1.8 * TS, a));
        flare.userData.u.uCenter.value.copy(I).addScaledVector(UP, 1.5 * sc);
        flare.userData.u.uSize.value.set(90 * sc, 90 * sc); flare.userData.u.uK.value = 0.9 * f;
        flare.userData.u.uSeed.value = 0.3 + Math.floor(t * 8) * 0.17; flare.visible = f > 0.01;
        shore.userData.u.uCenter.value.copy(I).addScaledVector(UP, 4 * sc);
        shore.userData.u.uSize.value.set(260 * sc, 40 * sc); shore.userData.u.uK.value = 0.7 * Math.exp(-a * 1.1) * sstep(0, 0.12, a);
        shore.visible = shore.userData.u.uK.value > 0.01;
      }
    },
    dispose() { group.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); }); },
  };
}
