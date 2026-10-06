// SHOTS 7-8: LAPSE BLUE and REVERSAL RED, their jitter bolts, and the collision (bible 3.17, FX 6, FX 7).
//
// ORBS        two camera-facing discs shaded as spheres (fake normal n = (p/0.78, sqrt(1 - r^2)), key from upper left), POSTERISED to 3 tones:
//             tone = 2 if n.L > 0.35, 1 if > -0.15, else 0 -> lit / body / deep. Hard edge, flat bands, 3 px darker rim.
//             Blue  #4f86ff: white core r < 0.35, dark swirl rim bands  sin(3 ang + 6 ln(r + 0.08) - seed/2) > 0.55 for r > 0.45.
//             Red   #ff4157: pale core, BLACK radial crackle  |sin(7 ang + 7 vn(3 ang, 5 r))| < 0.07 for r > 0.12.
//             Radius 0.05 -> 0.35 m over 15.3..17.5 s (smoothstep). A two-band flat halo outside the sphere.
//             Placement: blue on the lens-left, red on the lens-right of the seal (lens right vector), at chest height, lateral lat = 1.15 m,
//             0.45 m toward the core. They frame the pup and never stand between lens and seal. From 17.3 s they converge on the point 0.9 m
//             in front of the chest (toward the core), lat = 1.15 (1 - ease3(k)), meeting at the collision (f427, 17.79 s).
// BOLTS       jitter at 24 steps per second (seed = floor(cue.t 24), a pure function of the clock): per orb 6 bolts of 8 segments, each a random
//             walk, offset (h - 0.5) 0.35 len per axis, width 1.4 (1 - j/8) times 3 px, shown with probability 0.6; plus 2 short bolts from each
//             orb to the seal's flippers; plus a 12-segment link bolt between the orbs during the approach.
// COLLISION   impact frame (1 inverted frame) at 17.79 s, trauma 0.22 (about 2 px of shake) fired once when the clock crosses, a shock ring.
//             The 0.8 #cdbdff hold-flash lives in burst.js.
import { billboard, segments, hexLin, sstep, clamp01, lerp, hash } from "./lib.js";

const ORB_FS = /* glsl */ `
  uniform float uK; uniform float uType; uniform float uSeed; uniform vec3 uCore; uniform vec3 uLit; uniform vec3 uBody; uniform vec3 uDeep;
  void main() {
    if (uK < 0.004) discard;
    float r = length(vP) / 0.78;
    vec3 col; float a;
    if (r < 1.) {
      vec3 n = vec3(vP / 0.78, sqrt(max(1. - r * r, 0.)));
      float nd = dot(n, normalize(vec3(-0.45, 0.6, 0.65)));
      float tone = nd > 0.35 ? 2. : (nd > -0.15 ? 1. : 0.);
      col = tone > 1.5 ? uLit : (tone > 0.5 ? uBody : uDeep);
      float ang = atan(vP.y, vP.x);
      if (uType < 0.5) {
        float sw = sin(ang * 3. + log(r + 0.08) * 6. - uSeed * 0.5);
        col = mix(col, uDeep, step(0.55, sw) * step(0.45, r) * 0.9);
        col = mix(col, vec3(1.), 1. - smoothstep(0.32, 0.38, r));
      } else {
        float cr = abs(sin(ang * 7. + vn(vec2(ang * 3., r * 5.) + uSeed) * 7.));
        float crack = (1. - smoothstep(0., 0.07, cr)) * smoothstep(0.12, 0.3, r);
        col = mix(col, vec3(0.02, 0., 0.03), crack);
        col = mix(col, uCore, 1. - smoothstep(0.2, 0.26, r));
      }
      float px = fwidth(r) * 3.; col = mix(col, uDeep * 0.5, smoothstep(1. - px, 1., r));   // 3 px darker rim
      a = 1.;
    } else {
      col = uBody; a = step(r, 1.35) * 0.22 + step(r, 1.15) * 0.2;
    }
    if (a < 0.01) discard;
    gl_FragColor = vec4(min(col, vec3(1.4)), a * uK);
  }`;

const BOLT_FS = /* glsl */ `
  uniform float uK; uniform vec3 uCol; uniform vec3 uCore;
  void main() {
    float s = abs(vSide);
    float a = 1. - smoothstep(0.55, 1., s);
    float core = 1. - smoothstep(0., 0.45, s);
    float al = uK * (1. - vU * 0.35);
    if (a * al < 0.01) discard;
    gl_FragColor = vec4(min(uCol * a + uCore * core, vec3(1.3)), al);
  }`;

export default function make(ctx, L) {
  const { THREE } = ctx;
  const group = new THREE.Group(); group.name = "fx-orbs";
  const V = (h) => new THREE.Vector3(...hexLin(h));

  const mkOrb = (type, c) => {
    const o = billboard(THREE, { add: false, order: 6, fs: ORB_FS, u: { uType: type, uSeed: 0, uCore: V(c.core), uLit: V(c.lit), uBody: V(c.body), uDeep: V(c.deep) } });
    group.add(o); return o;
  };
  const blue = mkOrb(0, { core: "#ffffff", lit: "#a9c8ff", body: "#4f86ff", deep: "#1b2a7a" });
  const red = mkOrb(1, { core: "#ffd0d6", lit: "#ff8a96", body: "#ff4157", deep: "#7a0f2a" });

  const mkBolt = (n, col, core) => { const s = segments(THREE, n, BOLT_FS, { u: { uCol: V(col), uCore: V(core), uPx: 3.5 / 720, uAsp: 16 / 9 }, order: 7 }); group.add(s.mesh); return s; };
  const bB = mkBolt(100, "#4f86ff", "#e8f2ff"), bR = mkBolt(100, "#ff4157", "#ffe0e4"), bL = mkBolt(16, "#b84dff", "#ffffff");

  const o0 = L.T("orbs", 15.3, 2.2), co = L.T("collide", 17.79, 0.4);
  // the collision's frame-locked effects are pure windows (scrub-safe)
  ctx.sakuga.impact(co.t, [[2, 1]]);
  ctx.sakuga.shock({ t: co.t, dur: 0.45, at: [0.5, 0.5], amp: 0.03, r1: 0.7 });
  const st = { fired: false };

  const P = [new THREE.Vector3(), new THREE.Vector3()], hand = [new THREE.Vector3(), new THREE.Vector3()], vtmp = new THREE.Vector3(), mid = new THREE.Vector3(), v2 = new THREE.Vector2();
  const pts = Array.from({ length: 14 }, () => new THREE.Vector3());

  // one random-walk bolt from a to b (n segments); returns segments used
  function walk(seg, i0, a, b, n, amp, seedBase, w) {
    for (let j = 0; j <= n; j++) {
      const f = j / n, s = seedBase + j * 3.17;
      pts[j].set(lerp(a.x, b.x, f), lerp(a.y, b.y, f), lerp(a.z, b.z, f));
      if (j > 0 && j < n) pts[j].add(vtmp.set((hash(s) - 0.5) * amp, (hash(s + 1.3) - 0.5) * amp, (hash(s + 2.9) - 0.5) * amp));
    }
    for (let j = 0; j < n; j++) seg.set(i0 + j, [pts[j].x, pts[j].y, pts[j].z], [pts[j + 1].x, pts[j + 1].y, pts[j + 1].z], w * (1.4 - 1.0 * (j / n)));
    return n;
  }

  return {
    group,
    update(t, dt, cue) {
      const e = t - o0.t, tc = co.t;
      const on = e >= 0 && t < tc + 2 / 24;
      const grow = sstep(o0.t, o0.t + 2.2, t);
      const rad = lerp(0.05, 0.35, grow) * (t > tc - 0.1 ? 1 + 0.5 * sstep(tc - 0.1, tc, t) : 1);
      const k = clamp01((t - (tc - 0.49)) / 0.49), cv = 1 - (1 - k) * (1 - k) * (1 - k);
      const lat = 1.15 * (1 - cv);
      L.chest(mid);
      const fw = 0.45 + 0.45 * cv;
      for (let i = 0; i < 2; i++) {
        const sgn = i === 0 ? -1 : 1;
        P[i].copy(mid).addScaledVector(L.camRight, sgn * lat).addScaledVector(L.dirCore, fw); P[i].y += 0.25 - 0.1 * cv;
      }
      const sz = 2 * rad / 0.78;
      const seed = Math.floor(cue.t * 24);
      const orbs = [blue, red];
      for (let i = 0; i < 2; i++) {
        const u = orbs[i].userData.u;
        u.uPos.value.copy(P[i]); u.uSize.value.set(sz, sz); u.uK.value = on ? 1 : 0; u.uSeed.value = Math.floor(t * 12) + i * 17;
      }
      // bolts on ones
      const bs = [bB, bR];
      if (on) {
        for (let i = 0; i < 2; i++) {
          const seg = bs[i]; let n = 0;
          const a0 = P[i];
          for (let b = 0; b < 6; b++) {
            const sd = seed * 11.3 + b * 7.7 + i * 101;
            if (hash(sd) > 0.6) continue;
            const th = hash(sd + 1) * Math.PI * 2, ph = Math.acos(2 * hash(sd + 2) - 1), len = rad * (2.5 + 3 * hash(sd + 3));
            vtmp.set(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th));
            const a = hand[0].copy(a0).addScaledVector(vtmp, rad * 0.9), bb = hand[1].copy(a0).addScaledVector(vtmp, rad * 0.9 + len);
            n += walk(seg, n, a, bb, 8, len * 0.35, sd + 20, 1);
          }
          // the flipper bolts: the pup holds the orbs (seal-local flipper points at +-0.3, 0.42, 0.2)
          for (let h = 0; h < 2; h++) {
            const sd = seed * 5.9 + h * 3.3 + i * 77;
            if (hash(sd) > 0.7) continue;
            const f = hand[0]; L.sealPoint(i === 0 ? 0.3 : -0.3, 0.42, 0.2, f);
            n += walk(seg, n, a0, f, 6, 0.18, sd + 5, 0.8);
          }
          seg.clear(n); seg.flush();
        }
        // link bolt during the approach
        if (k > 0 && k < 1) { walk(bL, 0, P[0], P[1], 12, 0.12 * (1 - k) + 0.02, seed * 3.7, 1.2); bL.clear(12); }
        else bL.clear(0);
        bL.flush();
      } else { bB.clear(0); bR.clear(0); bL.clear(0); bB.flush(); bR.flush(); bL.flush(); }
      // frame-dependent line width: 3.5 px at the drawing-buffer height, the real aspect
      try { ctx.engine.renderer.getSize(v2); } catch { v2.set(1280, 720); }
      const px = 3.5 / Math.max(240, v2.y), asp = ctx.aspect();
      for (const s of [bB, bR, bL]) { const u = s.mesh.userData.u; u.uPx.value = px; u.uAsp.value = asp; u.uK.value = on ? 1 : 0; }
      // the one-shot trauma on the collision (stateful: resets when the clock is scrubbed back)
      if (cue.t < tc - 0.05) st.fired = false;
      else if (!st.fired && cue.t >= tc) { st.fired = true; ctx.sakuga.trauma(0.22); }
    },
    dispose() {},
  };
}
