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
    uniforms: { uGrow: { value: 0 }, uFade: { value: 0 }, uJit: { value: 0.4 }, uStep: { value: 0 }, uDecay: { value: 1.3 }, uTime: { value: 0 } },
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
      uniform float uGrow, uFade, uDecay;
      varying float vT, vV, vLv;
      void main() {
        float age = uGrow - vT;
        if (age < 0.0) discard;
        float head = exp(-age * uDecay);
        float core = 1.0 - smoothstep(0.0, 0.16, abs(vV));
        float glow = exp(-abs(vV) * 4.2);
        vec3 col = vec3(0.78, 0.94, 1.0) * core * 1.25 + vec3(0.22, 0.52, 1.0) * glow * 0.85;
        float a = uFade * (0.5 + 0.5 * head) * mix(1.0, 0.65, vLv) * (1.0 + 1.2 * exp(-age * 9.0));
        gl_FragColor = vec4(pow(col * a, vec3(2.2)), 1.0);
      }`,
  });
}

// ---- the three bolts of the scene ----
// width: constant angular width, so a bolt is as bold far off as near (0.075 rad is a trunk)
const CAM = V(0.3, 2.1, 9.6);
const angular = (k) => (p, lvl) => Math.max(0.04, k * CAM.distanceTo(p) * [1, 0.5, 0.26][lvl]);

// BAARARAQ SAIQA: a bold trunk from the vortex to the pup, trunks to the roofs and out over the bay, sheets across the ceiling
export function megaBoltGeometry() {
  const o = { n: [16, 7, 4], jag: 0.05, fork: [0.2, 0.18], depth: 1, width: angular(0.05) };
  const thin = { n: [14, 6, 3], jag: 0.05, fork: [0.14, 0.12], depth: 1, width: angular(0.05) };
  const sheet = { n: [24, 8, 3], jag: 0.03, fork: [0.14, 0.1], depth: 1, width: angular(0.014) };
  const paths = [
    [V(0.8, 46, -16), V(0.15, 2.1, -0.4), { ...o, n: [13, 6, 3], jag: 0.035, width: angular(0.17), fork: [0.22, 0.16] }, 0, 0.5, 1], // the pup: the main trunk, a pillar in the plane of the shot
    [V(5, 68, -70), V(0, 24, -102), thin, 0.03, 0.5, 2], // the great dome
    [V(-8, 66, -76), V(-14.6, 20, -97), thin, 0.06, 0.5, 3], // a tower
    [V(12, 66, -80), V(38, 4, -84), thin, 0.09, 0.5, 6], // out over the bay
    [V(-70, 56, -66), V(60, 52, -62), sheet, 0.0, 0.7, 7], // the sheets across the cloud ceiling
    [V(-60, 46, -50), V(70, 58, -70), sheet, 0.1, 0.7, 8],
  ];
  return boltGeometry(paths);
}

// the wreath: little arcs standing round the pup, a ring of them, turned about its axis
export function wreathGeometry() {
  const o = { n: [5, 3, 2], jag: 0.08, fork: [0.25, 0.2], depth: 1, width: () => 0.02 };
  const paths = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + hash(i, 1) * 0.4;
    const r = 0.85 + 0.4 * hash(i, 2);
    const y0 = 0.15 + 1.4 * hash(i, 3);
    const a1 = a + 0.45 + 0.4 * hash(i, 4);
    paths.push([V(Math.sin(a) * r, y0, Math.cos(a) * r), V(Math.sin(a1) * (r + 0.15), y0 + 0.5 * (hash(i, 5) - 0.3), Math.cos(a1) * (r + 0.15)), o, hash(i, 6) * 0.3, 0.7, i + 11]);
  }
  return boltGeometry(paths);
}

// the fan out of the screen: bolts from the pup to a ring round the lens
export function burstGeometry() {
  const o = { n: [8, 3, 2], jag: 0.05, fork: [0.22, 0.15], depth: 1, width: (p, lvl) => (0.035 + 0.04 * Math.max(0, 1 - CAM.distanceTo(p) / 10)) * [1, 0.5, 0.3][lvl] };
  const paths = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.5;
    paths.push([V(0.2, 1.45, 0.6), V(0.3 + Math.cos(a) * (1.0 + 0.7 * hash(i, 1)), 2.0 + Math.sin(a) * (0.8 + 0.5 * hash(i, 2)), 4.6), o, hash(i, 3) * 0.15, 0.6, i + 31]);
  }
  return boltGeometry(paths);
}
