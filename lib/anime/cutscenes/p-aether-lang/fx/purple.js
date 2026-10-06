// SHOT 9: HOLLOW PURPLE, composed as ref 06 (bible 3.18, 3.19, FX 8, 9, 10; easter eggs 2 and 6).
//
// SPHERE     a unit sphere scaled to R(t), centre = chest + dirCore d(t) (+0.2 up). Shaded by the view-space normal z (ndv = cos of the angle
//            to the lens), POSTERISED in 4 flat bands:   ndv > 0.93 white-hot core #ffffff,  > 0.45 envelope #b84dff,  > 0.20 #5a2bc0,  else #2a1480.
//            Dark swirl kept: sin(4 ang + 16 (1 - ndv) - 5 t) > 0.82 inside the envelope bands -> ink #0f0a36.   Silhouette thread #ede0ff.
//            R(t) keys: (17.79, 0.35) (18.10, 1.3) (18.60, 2.6) (19.00, 4.2) (19.50, 5.7).  d(t) keys (the victims are met at their erase times):
//            (17.79, 0.9) (17.92, 1.2) (18.42, 6.5) (18.71, 7.8) (19.00, 9.5) (19.50, 14); cosine-eased between keys.
// COMPOSITION a camera-facing quad of 9 R about the sphere (vP = +-1 is 4.5 R):
//            8-spike flare  6 thin (len 0.55) + 2 long (1.0), #ff5a8a, intensity 0.5 (the 40% pink on a white core, ref 06)
//            thin ring      r = 0.36 (1.6 R), 1.5 px #d9b8ff with R/B fringe, 72 cells of 4-point sparkle dust (p = 0.5), drifting
//            huge halo ring r = 0.92, thin, with 8 white four-point stars on its rim (sizes 0.05..0.10)
//            violet envelope  flat band 0.222..0.30 at 22%
// VIOLET FIELD the deep #2a1480 -> #5a2bc0 field of 06: a full-lens additive radial about the sphere, K <= 0.35, 17.95..18.6 s, behind the seal.
// TUNNEL     18.6..19.4 s: camera-fixed violet tube about the sphere's screen point: z = 1 / (r + 0.08), rings fract(0.55 z - 2.2 t), 56 radial streak
//            cells; alpha 0 at the centre to 0.85 at the wall. Plus radial speed lines (ctx.sakuga) and TWO impact frames at f447 and f449.
// ERASE      Hanami f442 (18.417 s), Jogo f449 (18.708 s), Toji f456 (19.0 s, LAST: the Hidden Inventory homage). A 2-frame white-violet
//            (#f0e6ff) seal silhouette (the 01 white-cut look) pushed 0.6 m toward the lens, then 36 violet #b84dff sparks on twos:
//            p(a) = p0 + v a (1 - 0.3 a) + (0, -1.1 a^2, 0), life 1.1 s, size 0.10..0.22 shrinking, alpha 1 - a/1.1.
import { billboard, screenQuad, quadSet, mkMat, hexLin, sstep, lerp, hash } from "./lib.js";

const keys = (K, t) => {
  if (t <= K[0][0]) return K[0][1];
  for (let i = 1; i < K.length; i++) if (t <= K[i][0]) { const k = (t - K[i - 1][0]) / (K[i][0] - K[i - 1][0]); return lerp(K[i - 1][1], K[i][1], 0.5 - 0.5 * Math.cos(Math.PI * k)); }
  return K[K.length - 1][1];
};
const D_KEYS = [[17.79, 0.9], [17.92, 1.2], [18.42, 6.5], [18.71, 7.8], [19.0, 9.5], [19.5, 14]];
const R_KEYS = [[17.79, 0.35], [18.1, 1.3], [18.6, 2.6], [19.0, 4.2], [19.5, 5.7]];

export default function make(ctx, L) {
  const { THREE } = ctx;
  const group = new THREE.Group(); group.name = "fx-purple";
  const V = (h) => new THREE.Vector3(...hexLin(h));
  const pu = L.T("purple", 17.92, 1.6), tu = L.T("tunnel", 18.6, 0.8);

  // ---- sphere ------------------------------------------------------------------------------------------------------------------
  const sphM = mkMat(THREE, {
    add: false, u: { uK: 0, uTime: 0, uWhite: V("#ffffff"), uEnv: V("#b84dff"), uMid: V("#5a2bc0"), uDeep: V("#2a1480"), uInk: V("#0f0a36"), uRim: V("#ede0ff") },
    vs: `varying vec3 vN; void main() { vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fs: `uniform float uK; uniform float uTime; uniform vec3 uWhite; uniform vec3 uEnv; uniform vec3 uMid; uniform vec3 uDeep; uniform vec3 uInk; uniform vec3 uRim; varying vec3 vN;
      void main() {
        if (uK < 0.004) discard;
        vec3 n = normalize(vN); float ndv = clamp(n.z, 0., 1.);
        float ang = atan(n.y, n.x);
        vec3 col = ndv > 0.93 ? uWhite : (ndv > 0.45 ? uEnv : (ndv > 0.20 ? uMid : uDeep));
        float sw = sin(ang * 4. + (1. - ndv) * 16. - uTime * 5.);
        col = mix(col, uInk, step(0.82, sw) * step(0.20, ndv) * step(ndv, 0.90) * 0.85);
        col = mix(col, uRim, 1. - smoothstep(0.0, 0.06, ndv));
        gl_FragColor = vec4(min(col, vec3(1.4)), uK);
      }`,
  });
  sphM.depthWrite = true; sphM.side = THREE.FrontSide; // the solid sphere hides the back of the composition quad and itself
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), sphM); sphere.frustumCulled = false; sphere.renderOrder = 5;
  group.add(sphere);

  // ---- the 06 composition -------------------------------------------------------------------------------------------------------
  const comp = billboard(THREE, {
    order: 6, u: { uRot2: 0, uPink: V("#ff5a8a"), uRing: V("#d9b8ff"), uVio: V("#b84dff"), uWhite: V("#ffffff") },
    fs: /* glsl */ `
    uniform float uK; uniform float uRot2; uniform vec3 uPink; uniform vec3 uRing; uniform vec3 uVio; uniform vec3 uWhite;
    void main() {
      if (uK < 0.004) discard;
      vec2 p = vP; float r = length(p); float px = fwidth(r);
      vec3 c = vec3(0.);
      c += uPink * flare8(p / 0.9, 0.0) * 0.5;                                  // 8 spikes, pink at about 40%
      c += uWhite * (1. - smoothstep(0.10, 0.20, r)) * 0.8;                      // the white core glow (mostly behind the sphere)
      c += uVio * step(r, 0.30) * step(0.222, r) * 0.22;                         // flat violet envelope band
      c += ringFringe(r, 0.36, px * 1.5, px * 1.6) * uRing;                       // the thin ring
      // sparkle dust on the thin ring: 72 cells, drifting
      float a = atan(p.y, p.x) + uRot2;
      float M = 72.; float s = (a + 3.14159265) / 6.2831853; float ci = floor(s * M);
      float h1 = h11(ci * 1.9), h2 = h11(ci * 3.3 + 2.), h3 = h11(ci * 5.1 + 7.), h4 = h11(ci * 7.7 + 4.);
      float ac = (ci + 0.5 + (h1 - 0.5) * 0.8) / M * 6.2831853 - 3.14159265 - uRot2;
      vec2 pc = (0.36 + (h2 - 0.5) * 0.05) * vec2(cos(ac), sin(ac));
      c += mix(uRing, uWhite, 0.55) * star4(p - pc, 0.012 + 0.018 * h3) * step(h4, 0.5) * 1.1;
      // the huge halo ring with 8 four-point stars on its rim
      c += ringFringe(r, 0.92, px * 1.2, px * 1.5) * uRing * 0.8;
      for (int i = 0; i < 8; i++) {
        float fi = float(i); float ang = 0.3927 + fi * 0.7854 + uRot2 * 0.3;
        vec2 q = p - 0.92 * vec2(cos(ang), sin(ang));
        c += uWhite * star4(q, 0.05 + 0.05 * mod(fi * 3., 3.) * 0.5) * 1.1;
      }
      gl_FragColor = vec4(min(c, vec3(1.4)), uK);
    }`,
  });
  group.add(comp);

  // ---- violet field + tunnel (screen quads, behind everything) -------------------------------------------------------------------
  const field = screenQuad(THREE, {
    order: 0, u: { uA: V("#2a1480"), uB: V("#5a2bc0") },
    fs: `uniform float uK; uniform vec3 uA; uniform vec3 uB;
      void main() { if (uK < 0.004) discard; vec2 p = (vUv - vC) * vec2(vAsp, 1.); float r = length(p);
        vec3 c = mix(uB, uA, smoothstep(0.1, 1.1, r)) * (0.9 - 0.5 * smoothstep(0.0, 1.2, r)) * uK;
        gl_FragColor = vec4(min(c, vec3(0.45)), 1.); }`,
  });
  group.add(field);
  const tunnel = screenQuad(THREE, {
    order: 3, add: false, u: { uT: 0, uMid: V("#5a2bc0"), uDeep: V("#2a1480"), uVio: V("#b84dff"), uPale: V("#e0c8ff") },
    fs: /* glsl */ `
    uniform float uK; uniform float uT; uniform vec3 uMid; uniform vec3 uDeep; uniform vec3 uVio; uniform vec3 uPale;
    void main() {
      if (uK < 0.004) discard;
      vec2 p = (vUv - vC) * vec2(vAsp, 1.);
      float r = length(p), a = atan(p.y, p.x);
      float z = 1. / (r + 0.08);
      float rings = smoothstep(0.40, 0.48, abs(fract(z * 0.55 - uT * 2.2) - 0.5));
      float q = (a + 3.14159265) / 6.2831853 * 56.;
      float cell = floor(q), fa = abs(fract(q) - 0.5);
      float on = step(0.55, h11(cell * 1.7 + floor(uT * 12.) * 0.37));
      float streak = on * (1. - smoothstep(0.02, 0.07 + 0.05 * r, fa)) * smoothstep(0.1, 0.5, r);
      float wall = smoothstep(0.12, 1.05, r);
      vec3 base = mix(uMid, uDeep, wall);
      vec3 col = base + uVio * rings * 0.55 * wall + uPale * streak * 0.7;
      float al = uK * mix(0., 0.85, wall);
      if (al < 0.01) discard;
      gl_FragColor = vec4(min(col, vec3(1.2)), al);
    }`,
  });
  group.add(tunnel);

  // ---- erase: silhouettes + sparks -----------------------------------------------------------------------------------------------
  const SIL = /* glsl */ `
    uniform float uK; uniform vec3 uWhite; uniform vec3 uEdge;
    void main() {
      if (uK < 0.004) discard;
      vec2 p = vP;
      float body = length((p - vec2(0., -0.18)) / vec2(0.50, 0.42)) - 1.;
      float head = length((p - vec2(0., 0.40)) / vec2(0.30, 0.27)) - 1.;
      float fl = length((vec2(abs(p.x), p.y) - vec2(0.50, -0.10)) / vec2(0.15, 0.20)) - 1.;
      float d = min(min(body, head), fl);
      float w = fwidth(d) + 1e-4;
      float m = 1. - smoothstep(-w, w, d);
      if (m < 0.01) discard;
      vec3 c = mix(uWhite, uEdge, smoothstep(-0.14, -0.02, d)) * 1.15;
      gl_FragColor = vec4(min(c, vec3(1.4)), m * uK);
    }`;
  const VIC = L.victims; // [{ p:[x,y,z], sc, t0 }]
  const sil = VIC.map(() => { const b = billboard(THREE, { add: false, order: 8, fs: SIL, u: { uWhite: V("#f0e6ff"), uEdge: V("#b84dff"), uPush: 0.6 } }); group.add(b); return b; });
  const NS = 36;
  const sp = quadSet(THREE, NS * VIC.length, /* glsl */ `
    uniform float uK; uniform vec3 uA; uniform vec3 uW;
    void main() { float s = star4(vP, 0.9); float a = s * vS.y * uK; if (a < 0.01) discard;
      vec3 c = mix(uA, uW, vS.z); gl_FragColor = vec4(min(c * (0.8 + 0.5 * s), vec3(1.3)), a); }`, { u: { uA: V("#b84dff"), uW: V("#f0e6ff") }, order: 9 });
  sp.mesh.userData.u.uK.value = 1;
  group.add(sp.mesh);
  const rng = ctx.rng(31);
  const vel = [];
  for (let i = 0; i < NS * VIC.length; i++) vel.push([(rng() - 0.5) * 5, 1 + rng() * 3.5, (rng() - 0.5) * 5, 0.10 + rng() * 0.12, rng() < 0.25 ? 1 : 0, rng() * 0.15]);

  // one-shot effects on the Purple's firing
  ctx.sakuga.impact(447 / 24, [[1, 1]]);
  ctx.sakuga.impact(449 / 24, [[2, 1]]);
  ctx.sakuga.speedLines({ t: tu.t, dur: tu.dur, kind: "radial", at: [0.5, 0.5], strength: 0.9, col: "#f0e6ff" });
  ctx.sakuga.speedLines({ t: pu.t, dur: 0.5, kind: "radial", at: [0.5, 0.5], strength: 0.55, col: "#ede0ff" });
  const st = { fired: false };
  const cen = new THREE.Vector3(), pos = new THREE.Vector3(), anch = new THREE.Vector3();

  return {
    group,
    update(t, dt, cue) {
      L.chest(cen);
      const d = keys(D_KEYS, t), R = keys(R_KEYS, t);
      pos.copy(cen).addScaledVector(L.dirCore, d); pos.y += 0.2;
      const t0 = 17.79 + 1 / 24;
      const alive = t >= t0 && t < 19.55;
      const K = alive ? 1 - sstep(19.2, 19.5, t) : 0;
      sphere.position.copy(pos); sphere.scale.setScalar(R);
      sphM.userData.u.uK.value = K; sphM.userData.u.uTime.value = t;
      const cu = comp.userData.u;
      cu.uPos.value.copy(pos); cu.uSize.value.set(9 * R, 9 * R); cu.uK.value = K * sstep(t0, t0 + 0.2, t) * 0.95; cu.uRot2.value = t * 0.35; cu.uRot.value = 0;
      anch.copy(pos);
      field.userData.u.uK.value = sstep(17.95, 18.15, t) * (1 - sstep(18.5, 18.9, t)) * 0.35; field.userData.u.uAnchor.value.copy(anch);
      const tk = sstep(tu.t, tu.t + 0.12, t) * (1 - sstep(tu.t + tu.dur - 0.2, tu.t + tu.dur, t));
      const tuU = tunnel.userData.u; tuU.uK.value = tk; tuU.uT.value = t - tu.t; tuU.uAnchor.value.copy(anch);
      // the one-shot camera kick on the firing
      if (cue.t < pu.t - 0.05) st.fired = false;
      else if (!st.fired && cue.t >= pu.t) { st.fired = true; ctx.sakuga.trauma(0.35); }
      // erase
      for (let v = 0; v < VIC.length; v++) {
        const te = VIC[v].t0, o = VIC[v].p, sc = VIC[v].sc;
        const su = sil[v].userData.u;
        su.uPos.value.set(o[0], o[1] + 0.45 * sc, o[2]); su.uSize.value.set(1.6 * sc, 1.6 * sc);
        su.uK.value = t >= te - 0.04 && t < te + 2 / 24 + 1 / 12 ? 1 : 0;
        const ts = te + 2 / 24;
        for (let i = 0; i < NS; i++) {
          const id = v * NS + i, a = t - ts, w = vel[id], life = 1.1;
          if (a < 0 || a > life) { sp.set(id, 0, -99, 0, 0); continue; }
          const f = a * (1 - 0.3 * a);
          sp.set(id, o[0] + w[0] * f, o[1] + 0.45 * sc + w[1] * f - 1.1 * a * a + w[5], o[2] + w[2] * f,
            w[3] * (1 - a / life) * (0.8 + 0.2 * hash(Math.floor(t * 12) + id)), 1 - a / life, w[4]);
        }
      }
      sp.flush();
    },
    dispose() {},
  };
}
