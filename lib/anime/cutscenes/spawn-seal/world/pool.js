// spawn-seal WORLD: the glowing pool (the stage) and the plinth. Layer 1 (the water animates on twos).
//
// WATER SHADER (maths), q = P.xz, r = |q|, rr = |q - seal.xz|:
//   core   = smoothstep(0, 4.5, r);  band = floor(min(core, .999) * 3) / 2     (3 posterised levels, darker #0d6ac0 core)
//   body   = mix(#0d6ac0, #1fb8ff, band)
//   caustics: cell(q * 0.8 + (0.12, 0.07) * t) = (d1, edge = d2 - d1, id)       Voronoi on the scroll of 0.15 m/s (t is stepped)
//     band lines  where edge < 0.07           -> #7ff8ff
//     hard white polygons where id > 0.78 && d1 < 0.55 && edge > 0.15  -> #e8ffff      (the slime / Predator highlight language)
//   rings (up to 8, vec3 = radius, half-width, amp): d = |rr - R|;  d < w -> #7ff8ff, d < 0.45 w -> #e8ffff  (3-step posterised)
//   edge glow = #3fdcff * 0.35 * smoothstep(4.2, 5.2, r)
import { CircleGeometry, CylinderGeometry, Mesh, ShaderMaterial, Vector3 } from "three";
import { C, SHARED_GLSL, V, FR, clamp, easeOut, tAt } from "./common.js";

const MAXR = 8;

export function buildPool(ctx, S) {
  const { THREE, engine } = ctx;
  const group = new THREE.Group();
  const ringU = { uRing: { value: Array.from({ length: MAXR }, () => new Vector3()) } };
  const mat = new ShaderMaterial({
    uniforms: { ...S.U, ...ringU },
    vertexShader: "varying vec3 vP; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: `varying vec3 vP; uniform vec3 uRing[${MAXR}]; ${SHARED_GLSL}
      vec2 hh(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
      vec3 cell(vec2 p) {
        vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0, id = 0.0;
        for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
          vec2 g = vec2(float(x), float(y)); vec2 o = hh(i + g); float d = length(g + o - f);
          if (d < d1) { d2 = d1; d1 = d; id = o.x; } else if (d < d2) d2 = d;
        }
        return vec3(d1, d2 - d1, id);
      }
      void main() {
        vec2 q = vP.xz; float r = length(q), rr = length(q - uSealPos.xz);
        float core = smoothstep(0.0, 4.5, r), band = floor(min(core, 0.999) * 3.0) / 2.0;
        vec3 col = mix(${V(C.poolDeep)}, ${V(C.poolBody)}, band * 0.85 + 0.15);
        col *= 0.88 + 0.12 * uPool;
        vec3 c = cell(q * 0.8 + vec2(0.12, 0.07) * uT);
        col = mix(col, ${V(C.poolCaus)}, (1.0 - smoothstep(0.06, 0.08, c.y)) * 0.8);
        float poly = step(0.78, c.z) * step(c.x, 0.55) * step(0.15, c.y);
        col = mix(col, ${V(C.poolHi)}, poly);
        for (int i = 0; i < ${MAXR}; i++) {
          vec3 rg = uRing[i]; float d = abs(rr - rg.x);
          col = mix(col, ${V(C.poolCaus)}, step(d, rg.y) * step(0.001, rg.z));
          col = mix(col, ${V(C.poolHi)}, step(d, rg.y * 0.45) * step(0.001, rg.z));
        }
        col += ${V(C.poolEdge)} * 0.35 * smoothstep(4.2, 5.2, r);
        gl_FragColor = vec4(worldFinish(min(col, vec3(1.0)), vP), 0.35);
      }`,
  });
  const geo = new CircleGeometry(5.2, 96).rotateX(-Math.PI / 2).translate(0, S.gy - 0.12, 0);
  const water = new Mesh(geo, mat); water.frustumCulled = false;
  group.add(water);

  // the plinth under the seal: 8-sided stone, 1.4 m wide x 0.35 m, top at ground level, inked; never eaten
  const pg = new CylinderGeometry(0.78, 0.9, 0.35, 8).translate(S.at[0], S.gy - 0.175, S.at[2]);
  const ps = new CylinderGeometry(1.15, 1.25, 0.18, 8).translate(S.at[0], S.gy - 0.34, S.at[2]);
  const plinth = new THREE.Group();
  for (const [g, a, b] of [[pg, C.stoneMid, C.stoneSh], [ps, C.stoneSh, "#283058"]]) {
    const m = engine.prop(ctx.sdf.painted(g, ctx.sdf.paint(a, b)), 0.55);
    m.material.uniforms.uStone.value.set(1, 3.0, 0.4, 0.3);
    engine.ink(m); plinth.add(m);
  }
  group.add(plinth);

  // rings: PLOP at 1.0 s (3 echo rings, +4 f apart, radius 0 -> 2.4 m over 14 f ease-out); morph base ripples 4.4 - 6.4 s;
  // the two-finger touch at 18.5 s; a calm pulse on the credit loop
  const rings = [];
  function update(cue) {
    rings.length = 0;
    const t = cue.ts;
    const plop = tAt(cue, "plop", 1.0);
    for (let i = 0; i < 3; i++) { const k = (t - plop - i * FR(4)) / FR(14); if (k > 0 && k < 1.35) rings.push([2.4 * easeOut(k), 0.16 * (1 - 0.5 * clamp(k)), k < 1.1 ? 1 : 0]); }
    const m0 = tAt(cue, "morph", 4.4);
    if (t > m0 && t < m0 + 2.3) { const n = Math.floor((t - m0) / 0.45); for (let j = Math.max(0, n - 2); j <= n; j++) { const k = (t - m0 - j * 0.45) / 0.55; if (k > 0 && k < 1) rings.push([1.7 * easeOut(k), 0.13, 1]); } }
    const touch = tAt(cue, "touch", 18.5);
    for (let i = 0; i < 2; i++) { const k = (t - touch - i * 0.35) / 1.0; if (k > 0 && k < 1) rings.push([3.4 * easeOut(k), 0.18, 1]); }
    for (let i = 0; i < MAXR; i++) { const v = ringU.uRing.value[i], r = rings[i]; if (r) v.set(r[0], r[1], r[2]); else v.set(0, 0, 0); }
  }
  return { group, plinth, update, dispose() { geo.dispose(); mat.dispose(); pg.dispose(); ps.dispose(); } };
}
