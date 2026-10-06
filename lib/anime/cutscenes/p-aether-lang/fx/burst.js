// SHOT 2 to 8 light fields: the RAGGED BURST + bubble edge (bible 3.4, FX 2), the flood glow (3.20), the core pulse (shot 6), the hold-flash (FX 7).
//
// RAGGED BURST (the white blast of ref 01; torn paper, black negative shards, two rainbow-fringed halos)
//   angle a in [-pi, pi], N = 32 segments, q = N (a + pi) / 2 pi, seg = floor(q), f = fract(q)
//   edge radius  re(a) = mix(0.62, 1.0, h(seg)) * (1 - 0.28 smoothstep(0, 1, |2f - 1|)) + 0.04 vn(9 p)      spikes 0.6..1.0 of R
//   inside       r < 0.86 re          flat #ffffff (peak 1.25 so the seal, drawn in front, is never milky), outer 8% blends to #ede0ff
//   shards       7 wedges (angle h, half-width w, length l): |da| < w (1 - r/l), r in (0.10, l)  cut in #04030a
//   halos        two rings at r = 0.90 and 0.97, 1.5 px R/B fringe, #cfd8ff
//   re-seeded    uSeed = floor(t * 12): the silhouette re-randomises every 2 frames (twos); the radius envelope stays smooth
// BUBBLE EDGE   a sphere of radius 0.02 -> 140 m over 1.45..2.15 s (smoothstep); only its silhouette is drawn, a 3 px ring #ede0ff:
//               ring = 1 - smoothstep(0.6 w, 1.4 w, |n.v|), w = 1.5 fwidth(|n.v|), n the view normal, v the view vector.
// FLOOD GLOW    full-lens additive radial about the core's screen point; K ramps in 1.45..2.3 to 0.85, holds to 6.6, eases to 0.30 at
//               8.6, gone by 9.5. The colour is 0.5 K of a LINEAR colour <= 1 (max 0.43), so it never reaches the seal's 0.92 luma cap
//               or the bloom threshold; it is drawn at NDC depth ~1, behind the seal.
// CORE PULSE    10.4..15.3 s: a heartbeat (lub at 0, dub at 0.28 s, period 1 s): fringed rings spawn at the core and expand,
//               r = 0.12 + 0.7 phase, alpha (1 - phase)^2 amp.
// HOLD FLASH    the collision (17.79 s): #cdbdff, 0.8 for 2 frames, then smoothstep down over 8 frames. Behind the seal by depth.
import { billboard, screenQuad, mkMat, hexLin, sstep, clamp01, GLSL_COMMON, lerp } from "./lib.js";

export default function make(ctx, L) {
  const { THREE } = ctx;
  const group = new THREE.Group(); group.name = "fx-burst";
  const V = (h) => new THREE.Vector3(...hexLin(h));

  // ---- the ragged burst ------------------------------------------------------------------------------------------------------
  const burst = billboard(THREE, {
    add: false, order: 3,
    u: { uSeed: 0, uCol: V("#ffffff"), uEdge: V("#ede0ff"), uShard: V("#04030a"), uHalo: V("#cfd8ff") },
    fs: /* glsl */ `
    uniform float uK; uniform float uSeed; uniform vec3 uCol; uniform vec3 uEdge; uniform vec3 uShard; uniform vec3 uHalo;
    void main() {
      if (uK < 0.004) discard;
      vec2 p = vP; float r = length(p); float a = atan(p.y, p.x);
      const float N = 32.;
      float q = (a + 3.14159265) / 6.2831853 * N;
      float seg = floor(q), f = fract(q);
      float hh = h11(seg + uSeed * 13.1);
      float re = mix(0.62, 1.0, hh) * (1. - 0.28 * smoothstep(0., 1., abs(2. * f - 1.))) + 0.04 * vn(p * 9. + uSeed);
      float edge = 0.86 * re;
      float inside = 1. - smoothstep(edge - fwidth(r), edge + fwidth(r), r);
      float sh = 0.;
      for (int i = 0; i < 7; i++) {
        float fi = float(i);
        float ang = h11(fi * 7.3 + uSeed * 3.7 + 1.) * 6.2831853;
        float w = 0.09 + 0.12 * h11(fi * 3.1 + uSeed);
        float len = (0.35 + 0.5 * h11(fi * 5.7 + uSeed * 2.)) * 0.86;
        float da = abs(mod(a - ang + 3.14159265, 6.2831853) - 3.14159265);
        sh = max(sh, step(da, w * (1. - r / len)) * step(r, len) * step(0.10, r));
      }
      vec3 blast = mix(uCol, uEdge, smoothstep(edge * 0.72, edge, r)) * 1.25;
      blast = mix(blast, uShard, sh);
      float fr = fwidth(r) * 1.5;
      vec3 r1 = ringFringe(r, 0.90, 0.008, fr), r2 = ringFringe(r, 0.97, 0.005, fr);
      vec3 hc = clamp(r1 + r2 * 0.7, 0., 1.);
      float ha = max(max(hc.r, hc.g), hc.b);
      float al = max(inside, ha * (1. - inside));
      if (al < 0.01) discard;
      vec3 hcol = hc * uHalo / max(ha, 1e-3);
      vec3 col = inside > 0.5 ? blast : hcol;
      gl_FragColor = vec4(min(col, vec3(1.4)), al * uK);
    }`,
  });
  group.add(burst);

  // ---- the bubble edge ------------------------------------------------------------------------------------------------------
  const bubbleM = mkMat(THREE, {
    u: { uK: 0, uCol: V("#ede0ff") },
    vs: `varying vec3 vN; varying vec3 vV; void main() { vec4 mv = modelViewMatrix * vec4(position, 1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fs: `${GLSL_COMMON}\nuniform float uK; uniform vec3 uCol; varying vec3 vN; varying vec3 vV;
      void main() { float nd = abs(dot(normalize(vN), normalize(vV))); float w = fwidth(nd) * 1.5 + 1e-4;
        float ring = 1. - smoothstep(w * 0.6, w * 1.4, nd);
        if (ring * uK < 0.01) discard; gl_FragColor = vec4(uCol * 1.15, ring * uK); }`,
  });
  const bubble = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), bubbleM);
  bubble.frustumCulled = false; bubble.renderOrder = 4;
  group.add(bubble);

  // ---- the flood glow --------------------------------------------------------------------------------------------------------
  const glow = screenQuad(THREE, {
    order: 0,
    u: { uA: V("#8cb8ff"), uB: V("#c775f2") },
    fs: /* glsl */ `
    uniform float uK; uniform vec3 uA; uniform vec3 uB;
    void main() {
      if (uK < 0.004) discard;
      vec2 p = (vUv - vC) * vec2(vAsp, 1.);
      float r = length(p);
      float g = exp(-r * r * 1.6) * 0.8 + exp(-r * r * 14.) * 0.5;
      vec3 c = mix(uA, uB, smoothstep(0.1, 1.1, r)) * g * uK * 0.5;
      gl_FragColor = vec4(min(c, vec3(0.6)), 1.);
    }`,
  });
  group.add(glow);

  // ---- the core pulse ---------------------------------------------------------------------------------------------------------
  const pulse = billboard(THREE, {
    order: 2, u: { uCol: V("#ede0ff"), uViolet: V("#b84dff"), uP1: 0, uP2: 0 },
    fs: /* glsl */ `
    uniform float uK; uniform vec3 uCol; uniform vec3 uViolet; uniform float uP1; uniform float uP2;
    void main() {
      if (uK < 0.004) discard;
      float r = length(vP); float fr = fwidth(r) * 1.5;
      vec3 c = vec3(0.);
      for (int i = 0; i < 2; i++) {
        float ph = i == 0 ? uP1 : uP2; float amp = i == 0 ? 1. : 0.6;
        if (ph < 1.) {
          float a2 = (1. - ph) * (1. - ph) * amp;
          vec3 rf = ringFringe(r, 0.12 + 0.70 * ph, 0.012 * (1. - 0.5 * ph), fr);
          rf += ringFringe(r, 0.06 + 0.46 * ph, 0.008, fr) * 0.6;
          c += rf * a2 * uCol;
        }
      }
      float core = (1. - smoothstep(0.02, 0.07, r)) * (0.5 + 0.5 * (1. - uP1));
      c += uViolet * core * 0.5 + vec3(1.) * (1. - smoothstep(0.012, 0.03, r)) * 0.9;
      c += uCol * star4(vP * 1.8, 0.8) * (1. - uP1) * 0.6;
      gl_FragColor = vec4(min(c, vec3(1.4)), uK);
    }`,
  });
  pulse.userData.u.uSize.value.set(36, 36);
  group.add(pulse);

  // ---- the hold flash ----------------------------------------------------------------------------------------------------------
  const flash = screenQuad(THREE, {
    order: 1, u: { uCol: V("#cdbdff") },
    fs: /* glsl */ `
    uniform float uK; uniform vec3 uCol;
    void main() { if (uK < 0.004) discard;
      vec2 p = (vUv - vC) * vec2(vAsp, 1.);
      float g = 0.62 + 0.38 * exp(-dot(p, p) * 3.2);
      gl_FragColor = vec4(min(uCol * g * uK, vec3(0.8)), 1.); }`,
  });
  group.add(flash);

  const bl = L.T("bloom", 1.45, 0.7), fl = L.T("flood", 1.45, 7.15), co = L.T("collide", 17.79, 0.4), cp = L.T("corepulse", 10.4, 4.9);
  const cen = new THREE.Vector3(), tmp = new THREE.Vector3();
  return {
    group,
    update(t) {
      // burst + bubble centre: a point on the far side of the seal from the lens, so nothing here can stand in front of it
      L.chest(cen); L.away(cen, 2.2, tmp);
      const b0 = bl.t, e = t - b0;
      const R = lerp(0.15, 8.0, sstep(b0, b0 + 0.5, t));
      const bu = burst.userData.u;
      bu.uPos.value.copy(tmp); bu.uSize.value.set(2 * R, 2 * R); bu.uPush.value = 0;
      bu.uSeed.value = Math.floor(t * 12) % 997;
      bu.uK.value = e >= 0 ? 1 - sstep(b0 + 0.55, b0 + 1.05, t) : 0;
      // the bubble edge
      const Rb = lerp(0.02, 140, sstep(b0, b0 + bl.dur, t));
      bubble.position.copy(cen); bubble.scale.setScalar(Rb);
      bubbleM.userData.u.uK.value = e >= 0 ? 1 - sstep(b0 + bl.dur, b0 + bl.dur + 0.3, t) : 0;
      // flood glow
      const g0 = fl.t;
      const k = sstep(g0, g0 + 0.85, t) * 0.85 * (1 - 0.65 * sstep(6.6, 8.6, t)) * (1 - sstep(8.6, 9.5, t));
      glow.userData.u.uK.value = k; glow.userData.u.uAnchor.value.copy(L.CORE);
      // core pulse: heartbeat
      const pe = t - cp.t, on = pe >= 0 && pe < cp.dur + 0.3;
      const ph = pe - Math.floor(pe);
      const pu = pulse.userData.u;
      pu.uPos.value.copy(L.CORE); pu.uPush.value = 0;
      pu.uP1.value = clamp01(ph / 0.9); pu.uP2.value = ph < 0.28 ? 1 : clamp01((ph - 0.28) / 0.72);
      pu.uK.value = on ? sstep(cp.t, cp.t + 0.4, t) * (1 - sstep(cp.t + cp.dur, cp.t + cp.dur + 0.3, t)) * 0.9 : 0;
      // hold flash
      const fe = t - co.t;
      const fk = fe < 0 ? 0 : fe < 2 / 24 ? 1 : 1 - sstep(2 / 24, 10 / 24, fe);
      const fu = flash.userData.u; fu.uK.value = fk * 0.8; L.chest(fu.uAnchor.value);
    },
    dispose() {},
  };
}
