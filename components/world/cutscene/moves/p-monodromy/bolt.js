// LIGHTNING as geometry: forked paths of camera-facing ribbons in one draw call (additive, a white-blue core in a
// cyan glow). Each segment carries a reveal time, so a bolt GROWS from its start down every branch; the points
// jitter on twos so it crawls. Three uses: BAARARAQ SAIQA (the city-scale strike: trunks from the vortex to the
// pup and every roof, sheets across the cloud ceiling), the wreath of little arcs round the equipped pup, and the
// fan of bolts bursting out of the screen at the viewer.
// Frame: the move's rig (the pup at the origin, the lens out along +z).

import { AdditiveBlending, BufferAttribute, BufferGeometry, ShaderMaterial, Vector3 } from "three";
import { hash } from "./look";

const V = (x, y, z) => new Vector3(x, y, z);

// one path from `from` to `to`, jittered; `grow` calls itself for forks
function build(out, from, to, o, lvl = 0, t0 = 0, span = 1, seed = 1) {
  const n = o.n[lvl] ?? 6;
  const d = to.clone().sub(from);
  const len = d.length();
  const dir = d.clone().normalize();
  const u = new Vector3().crossVectors(dir, Math.abs(dir.y) > 0.9 ? V(1, 0, 0) : V(0, 1, 0)).normalize();
  const w = new Vector3().crossVectors(dir, u);
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    const edge = i === 0 || i === n ? 0 : 1;
    const j = len * o.jag * (lvl ? 0.8 : 1) * edge;
    pts.push(from.clone().lerp(to, s).addScaledVector(u, (hash(seed * 13 + i, 1) - 0.5) * 2 * j).addScaledVector(w, (hash(seed * 13 + i, 2) - 0.5) * 2 * j));
  }
  for (let i = 0; i < n; i++) {
    const wa = o.width(pts[i], lvl);
    const wb = o.width(pts[i + 1], lvl);
    out.push({ a: pts[i], b: pts[i + 1], wa, wb, t0: t0 + (i / n) * span, t1: t0 + ((i + 1) / n) * span, lvl, ia: out.id++, ib: out.id });
    if (i === n - 1) out.id++;
    // forks: off the path, away from it and downward
    if (lvl < (o.depth ?? 2) && i > 0 && hash(seed * 29 + i, 3) < (o.fork[lvl] ?? 0.3)) {
      const side = new Vector3().addScaledVector(u, hash(seed * 7 + i, 4) - 0.5).addScaledVector(w, hash(seed * 7 + i, 5) - 0.5).normalize();
      const fd = dir.clone().multiplyScalar(0.6).addScaledVector(side, 0.9).add(V(0, -0.3, 0)).normalize();
      const fl = len * (0.18 + 0.3 * hash(seed * 7 + i, 6)) * (lvl ? 0.6 : 1);
      build(out, pts[i], pts[i].clone().addScaledVector(fd, fl), o, lvl + 1, t0 + (i / n) * span + 0.02, span * (0.25 + 0.2 * hash(seed + i, 7)), seed * 5 + i);
    }
  }
}

// the segments become one geometry: 4 vertices a segment, the ribbon built in the vertex shader
export function boltGeometry(paths) {
  const segs = [];
  segs.id = 0;
  paths.forEach(([from, to, o, t0, span, seed]) => build(segs, from, to, o, 0, t0, span, seed));
  const m = segs.length;
  const pa = new Float32Array(m * 12);
  const pb = new Float32Array(m * 12);
  const ids = new Float32Array(m * 8);
  const su = new Float32Array(m * 8);
  const wd = new Float32Array(m * 8);
  const tt = new Float32Array(m * 8);
  const lv = new Float32Array(m * 4);
  const idx = new Uint32Array(m * 6);
  segs.forEach((s, i) => {
    for (let k = 0; k < 4; k++) {
      const u = k < 2 ? 0 : 1;
      const v = k % 2 ? 1 : -1;
      const o = i * 4 + k;
      pa.set([s.a.x, s.a.y, s.a.z], o * 3);
      pb.set([s.b.x, s.b.y, s.b.z], o * 3);
      ids.set([s.ia, s.ib], o * 2);
      su.set([u, v], o * 2);
      wd.set([s.wa, s.wb], o * 2);
      tt.set([s.t0, s.t1], o * 2);
      lv[o] = s.lvl;
    }
    idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 1, i * 4 + 3, i * 4 + 2], i * 6);
  });
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(pa, 3));
  g.setAttribute("aPB", new BufferAttribute(pb, 3));
  g.setAttribute("aId", new BufferAttribute(ids, 2));
  g.setAttribute("aS", new BufferAttribute(su, 2));
  g.setAttribute("aW", new BufferAttribute(wd, 2));
  g.setAttribute("aT", new BufferAttribute(tt, 2));
  g.setAttribute("aLv", new BufferAttribute(lv, 1));
  g.setIndex(new BufferAttribute(idx, 1));
  return g;
}

// uGrow: how far the heads have run (0..1+); uFade: overall brightness; uJit: how far the points crawl (m);
// uStep: the drawing (twos); uHue 0 white-blue .. 1 gold-white (the flip when it tears the screen)
export function boltMaterial() {
  return new ShaderMaterial({
    uniforms: { uGrow: { value: 0 }, uFade: { value: 0 }, uJit: { value: 0.4 }, uStep: { value: 0 }, uDecay: { value: 1.3 }, uTime: { value: 0 }, uCore: { value: 0.16 } },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: 2,
    vertexShader: /* glsl */ `
      attribute vec3 aPB;
      attribute vec2 aId, aS, aW, aT;
      attribute float aLv;
      uniform float uStep, uJit;
      varying float vT, vV, vLv;
      float hh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      vec3 jit(float id) { return (vec3(hh(vec2(id, uStep)), hh(vec2(id + 7.1, uStep)), hh(vec2(id + 3.3, uStep))) - 0.5) * uJit; }
      void main() {
        vec3 a = position + jit(aId.x);
        vec3 b = aPB + jit(aId.y);
        vec3 wa = (modelMatrix * vec4(a, 1.0)).xyz;
        vec3 wb = (modelMatrix * vec4(b, 1.0)).xyz;
        vec3 p = mix(wa, wb, aS.x);
        vec3 dir = normalize(wb - wa);
        vec3 side = normalize(cross(dir, normalize(cameraPosition - p)));
        float w = mix(aW.x, aW.y, aS.x);
        p += dir * (aS.x * 2.0 - 1.0) * w * 0.9 + side * aS.y * w;
        vT = mix(aT.x, aT.y, aS.x);
        vV = aS.y;
        vLv = aLv;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uGrow, uFade, uDecay, uCore;
      varying float vT, vV, vLv;
      void main() {
        float age = uGrow - vT;
        if (age < 0.0) discard;
        float head = exp(-age * uDecay);
        float core = 1.0 - smoothstep(0.0, uCore, abs(vV));
        float glow = exp(-abs(vV) * 4.2);
        vec3 col = vec3(1.0) * core * 1.25 + vec3(0.31, 0.89, 1.0) * glow * 0.85;
        float a = uFade * (0.5 + 0.5 * head) * mix(1.0, 0.65, vLv) * (1.0 + 1.2 * exp(-age * 9.0));
        gl_FragColor = vec4(pow(col * a, vec3(2.2)), 1.0);
      }`,
  });
}

// ---- the one bolt of the scene ----
// BARARAQ SAIQA: ONE bolt, fixed hash seeds so it is identical every play (the move holds uJit at 0): from the sky
// sigil (0, 9, 0) to the raised flipper and on into the lens. 6 kinks a path, no forks. Core 0.35 m white in a 1 m cyan sheath.
export function megaBoltGeometry() {
  const o = { n: [6, 0, 0], jag: 0.03, fork: [0, 0], depth: 0, width: () => 0.5 };
  return boltGeometry([
    [V(0, 9, 0), V(0.55, 0.9, 0.35), o, 0, 0.7, 1],
    [V(0.55, 0.9, 0.35), V(0.3, 1.5, 7.0), o, 0.7, 0.3, 2],
  ]);
}
