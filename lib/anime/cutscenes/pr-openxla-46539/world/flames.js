// FLAMES for the Kamino street (bible 3: "flames as saturated yellow-orange cel shapes with hard dark holes", motion "fire flickers
// on twos; embers rise"; bible 6 Fire: yellow core, orange mid, dark holes; normal blend with an additive core).
// Layer 1: redrawn each step; every value is a pure function of the stepped time ts, so scrubbing equals playing.
//
// FIRE CARD (three baked variants, 4 x 6 m, swapped on twos): five tongues i with centre cx_i, height hh_i = 2.6 + 2.8 h, base half width w_i
//   per tongue, y = m.y / hh:  sway = 0.35 sin(5 y + 3 seed + 1.7 i) y;  half = w (1 - y)^0.85 (1 + 0.25 sin(11 y + i))
//   s = 1 - |x - cx - sway| / half   (1 on the axis, 0 on the edge);  best = max_i s (1 - 0.15 y)
//   cel bands:  edge #ff8a20 (best > 0)   mid #ffcf20 (> 0.30)   core #fff2a0 x 1.4 (> 0.68, above 1 so it blooms)
//   dark holes #7a2a10:  step(0.7, vn(2.6 m + seed)) inside 0.12 < best < 0.55
//   variant index = (floor(12 ts) + i) mod 3, scale jitter 1 +- 0.08 on the same hash: a flicker on twos
// GLOW: a soft additive billboard on every fire farther than 8 m from the seal (none near the pup: it must never be tinted);
//   intensity 0.55 (0.75 + 0.5 h(frame, i)) in #ff8a20.  GROUND POOL: a flat additive disc, radius 1.6 x height, intensity 0.16 (flicker).
// EMBERS: 160 instanced quads. age = fract(0.22 speed ts + phase) (about 4.5 s), position = base + (0.9 sin(9 age + 40 phase) + 0.6 age wind,
//   age (7 + 5 r) (1 + 2 up), 0.7 cos(7 age + 30 phase)),  size = (0.06 + 0.08 r)(1 - age),  colour #ff8a20 -> #fff2a0 x 1.6 by (1 - age) r.
//   `up` rises 0 -> 1 after the sky opens: the embers are drawn up into the light (the rain reverses to an updraft).
import { BufferAttribute, Color, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, PlaneGeometry, ShaderMaterial, Group } from "three";
import { C } from "./palette.js";
import { V, ADD, glowSprite, faceCamera } from "./lib.js";
import { FIRES } from "./layout.js";

const FIRE = (seed) => `
  vec4 paint(vec2 p) {
    const float SEED = ${seed.toFixed(2)};
    vec2 m = vec2((p.x / uAsp - 0.5) * 4.0, p.y * 6.0);
    float best = -1.0;
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      float cx = (h21(vec2(fi, SEED)) - 0.5) * 2.2;
      float hh = 2.6 + 2.8 * h21(vec2(fi, SEED + 1.0));
      float w0 = 0.55 + 0.45 * h21(vec2(fi, SEED + 2.0));
      float y = m.y / hh;
      if (y < 0.0 || y > 1.0) continue;
      float sway = 0.35 * sin(y * 5.0 + SEED * 3.0 + fi * 1.7) * y;
      float hf = w0 * pow(1.0 - y, 0.85) * (1.0 + 0.25 * sin(y * 11.0 + fi));
      float s = 1.0 - abs(m.x - cx - sway) / max(hf, 1e-3);
      best = max(best, s * (1.0 - 0.15 * y));
    }
    if (best <= 0.0) return vec4(0.0);
    float hole = step(0.7, vn(m * 2.6 + SEED)) * step(0.12, best) * step(best, 0.55);
    vec3 col = ${V(C.fireEdge)};
    col = mix(col, ${V(C.fireMid)}, celStep(best, 0.30));
    col = mix(col, ${V(C.fireCore)} * 1.4, celStep(best, 0.68));
    col = mix(col, ${V(C.fireHole)}, hole);
    col = mix(col, ${V(C.ink)}, 1.0 - smoothstep(0.0, 0.05, best));   // a thin ink edge
    return vec4(col, 1.0);
  }`;

export function buildFlames(ctx) {
  const { THREE } = ctx;
  const group = new Group(), own = [];
  const cards = [1.0, 2.7, 5.1].map((s) => { const c = ctx.bake.card(FIRE(s), { w: 256, h: 384, size: [4, 6], tools: ["noise", "cel"], id: 0.6, layer: 1 }); own.push(c); return c; });
  const geo = new PlaneGeometry(4, 6).translate(0, 3, 0);
  const fires = FIRES.map(([x, y, z, h], i) => {
    const m = new Mesh(geo, cards[0].material);
    m.position.set(x, y, z); m.userData.layer = 1; m.frustumCulled = false; faceCamera(m); group.add(m);
    const far = Math.hypot(x, z) > 8;
    let glow = null, pool = null;
    if (far) {
      glow = glowSprite(C.fireEdge, 2.0); glow.scale.set(h * 3.4, h * 3.4, 1); glow.position.set(x, y + h * 0.4, z); faceCamera(glow); group.add(glow);
      if (y < 0.5) { pool = glowSprite(C.fireEdge, 1.6); pool.rotation.x = -Math.PI / 2; pool.scale.set(h * 3.2, h * 3.2, 1); pool.position.set(x, 0.05, z); group.add(pool); }
    }
    return { m, glow, pool, h, i };
  });
  const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

  // embers
  const N = 160, base = new PlaneGeometry(1, 1);
  const eg = new InstancedBufferGeometry();
  eg.index = base.index; eg.setAttribute("position", base.attributes.position); eg.setAttribute("uv", base.attributes.uv);
  const R = ctx.rng(99), srcs = FIRES.filter((f) => Math.hypot(f[0], f[2]) > 8);
  const aBase = new Float32Array(N * 3), aRnd = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const s = srcs[i % srcs.length];
    aBase.set([s[0] + (R() - 0.5) * 2, s[1] + R() * s[3] * 0.5, s[2] + (R() - 0.5) * 2], i * 3);
    aRnd.set([R(), 0.6 + R() * 0.8, R()], i * 3);
  }
  eg.setAttribute("aBase", new InstancedBufferAttribute(aBase, 3)); eg.setAttribute("aRnd", new InstancedBufferAttribute(aRnd, 3));
  eg.instanceCount = N;
  const em = new ShaderMaterial({
    ...ADD,
    uniforms: { uT: { value: 0 }, uUp: { value: 0 }, uA: { value: new Color(C.fireEdge) }, uB: { value: new Color(C.fireCore) } },
    vertexShader: `uniform float uT; uniform float uUp; attribute vec3 aBase; attribute vec3 aRnd; varying vec2 vUv; varying float vL; varying float vK;
      void main() {
        float age = fract(uT * aRnd.y * 0.22 + aRnd.x);
        vec3 pos = aBase + vec3(0.9 * sin(9.0 * age + 40.0 * aRnd.x) + 0.6 * age, age * (7.0 + 5.0 * aRnd.z) * (1.0 + 2.0 * uUp), 0.7 * cos(7.0 * age + 30.0 * aRnd.x));
        vec4 mv = viewMatrix * modelMatrix * vec4(pos, 1.0);
        float sz = (0.06 + 0.08 * aRnd.z) * (1.0 - age);
        mv.xy += position.xy * sz * 2.0;
        vUv = uv; vL = 1.0 - age; vK = aRnd.z;
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uA; uniform vec3 uB; varying vec2 vUv; varying float vL; varying float vK;
      void main() { float r = length(vUv - 0.5) * 2.0; float k = 1.0 - smoothstep(0.55, 1.0, r);
        gl_FragColor = vec4(mix(uA, uB, vL * vK) * 1.6 * k * vL, 0.0); }`,
  });
  const embers = new Mesh(eg, em); embers.frustumCulled = false; embers.userData.layer = 1; embers.renderOrder = 5; group.add(embers);

  return {
    group,
    update(ts, up = 0) {
      const frame = Math.floor(ts * 12);
      for (const f of fires) {
        const v = (frame + f.i) % 3, j = hash(frame, f.i);
        f.m.material = cards[v].material;
        const s = (f.h / 5.4) * (1 + 0.16 * (j - 0.5)); f.m.scale.set(s, s, 1);
        if (f.glow) f.glow.material.uniforms.uA.value = 0.55 * (0.75 + 0.5 * j);
        if (f.pool) f.pool.material.uniforms.uA.value = 0.16 * (0.75 + 0.5 * j);
      }
      em.uniforms.uT.value = ts; em.uniforms.uUp.value = up;
    },
    dispose() {
      for (const o of own) o.userData?.dispose?.();
      geo.dispose(); eg.dispose(); em.dispose();
      for (const f of fires) { f.glow?.material.dispose(); f.glow?.geometry.dispose(); f.pool?.material.dispose(); f.pool?.geometry.dispose(); }
    },
  };
}
