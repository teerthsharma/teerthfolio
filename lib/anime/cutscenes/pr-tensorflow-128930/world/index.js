// WORLD layer for pr-tensorflow-128930: the harbour set, restaged to face each held lens (plate, facade cards, tower, quay). Layer 0, baked per shot.
// Threads: gzHarborSky, gzSkyline, gzBayWater, gzRainField (plate), gzNearBlocks (facades). Written new: the staging maths.
import { Group, Mesh, PlaneGeometry, ShaderMaterial } from "three";
import { loadPack } from "../../../tools/packs.js";
import { glslFor, uniformsFor } from "../../../tools/index.js";
import { bandFrac, cameras, depthOf, rectAt } from "../stage.js";
import { SHOTS } from "../layout.js";

await loadPack("cuts");

const PLATE_TOOLS = ["gzKit", "gzHarborSky", "gzSkyline", "gzBayWater", "gzRainField"];
const PLATE = /* glsl */ `
  uniform float uHy; uniform float uBand; uniform float uRain; uniform float uDawnK;
  vec3 paint(vec2 p) {
    // q: the image band, y up from 0 to 1; the shore line sits at hy
    vec2 q = vec2(p.x, (p.y - (1.0 - uBand) * 0.5) / uBand);
    float hy = 1.0 - uHy;
    vec2 sp = vec2(q.x, q.y - hy);
    vec3 sky = gzHarborSky(vec2(q.x, clamp((q.y - hy) / (1.0 - hy), 0.0, 1.0)), 0.0);
    vec3 sk = gzSkyline(sp, 0.0);
    vec3 city = mix(sky, sk, step(0.004, length(sk - gzBack(sp))));
    vec3 sea = gzBayWater(vec2(q.x, clamp(q.y, 0.0, hy) * 0.88 / hy), 0.0);
    vec3 c = mix(sea, city, step(hy, q.y));
    c += (gzRainField(q, 0.0) - gzBack(q)) * step(hy - 0.3, q.y) * uRain;
    // lift the night out of the ink floor: dark values x2.7, lit windows untouched
    c *= 1.0 + 1.7 * (1.0 - smoothstep(0.0, 0.45, dot(c, vec3(0.2126, 0.7152, 0.0722))));
    c = mix(c, c * 1.35, uDawnK);
    return pow(max(c, 0.0), vec3(2.2));
  }`;

const FACADE_V = "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
const facade = (seed, cols, rows, dim = 0.65) => new ShaderMaterial({
  uniforms: { ...uniformsFor(["gzKit", "gzNearBlocks"], { gzKit: { uGzSeed: seed }, gzNearBlocks: { uGzCols: cols, uGzRows: rows } }), uDim: { value: dim } },
  vertexShader: FACADE_V,
  fragmentShader: `uniform float uDim; varying vec2 vUv; ${glslFor(["gzKit", "gzNearBlocks"])} void main() { vec3 c = gzNearBlocks(vUv, 0.2); c *= uDim * (1.0 + 1.0 * (1.0 - smoothstep(0.0, 0.3, dot(c, vec3(0.33))))); gl_FragColor = vec4(pow(c, vec3(2.2)), 0.5); }`,
});

export default function build(ctx) {
  const { THREE, engine } = ctx, sh = engine.shared;
  const group = new Group();
  const prev = { dir: sh.uLightDir.value.clone(), col: sh.uLightCol.value.clone() };

  const pu = { ...uniformsFor(PLATE_TOOLS), uHy: { value: 0.66 }, uBand: { value: 0.67 }, uRain: { value: 1 }, uDawnK: { value: 0 } };
  group.add(ctx.bake.plateLayer(PLATE, { tools: PLATE_TOOLS, uniforms: pu }));

  // the facade pool: every block of every shot is one of these, re-aimed on the cut
  const plane = new PlaneGeometry(1, 1), seeds = [3, 7, 11, 5, 9, 13, 17, 21, 25], mats = new Map(seeds.map((s) => [s, facade(s, 7 + (s % 5), 17 + (s % 7))]));
  const towerMat = facade(31, 22, 36, 0.4);
  const panelMat = new ShaderMaterial({
    vertexShader: FACADE_V,
    fragmentShader: `varying vec2 vUv; void main() { vec3 c = vec3(0.055, 0.075, 0.1); float e = min(min(vUv.x, 1.0 - vUv.x) * 40.0, min(vUv.y, 1.0 - vUv.y) * 20.0); c += vec3(0.15, 0.21, 0.27) * (1.0 - smoothstep(0.0, 1.0, e)); gl_FragColor = vec4(pow(c, vec3(2.2)), 0.5); }`,
  });
  // pool[11] starts with the board panel's material, so its program is linked at build, not at the first board cut (t = 2 s)
  const pool = Array.from({ length: 12 }, (_, k) => { const m = new Mesh(plane, k === 11 ? panelMat : towerMat); m.frustumCulled = false; group.add(m); return m; });
  const tower = pool[0];

  let cams = null, asp = 0, shot = -1;
  const aim = (i) => {
    const c = cams[i], L = SHOTS[i], zh = depthOf(c, c.hero), a = asp;
    // the key comes from the lens side, up and left, so the creatures read whichever way the lens turns
    sh.uLightDir.value.set(0, 0.6, 0).addScaledVector(c.F, -0.6).addScaledVector(c.R, -0.5).normalize();
    sh.uLightCol.value.setRGB(...(L.dawn ? [0.95, 0.97, 1.0] : [0.78, 0.86, 1.0]));
    pu.uHy.value = L.hy; pu.uBand.value = bandFrac(a); pu.uDawnK.value = L.dawn ?? 0;
    pu.uGzShift.value = L.shift;
    pu.uGzDawn.value = ctx.tier >= 2 ? L.dawn : L.dawn > 0 ? 1 : 0;
    pu.uRain.value = ctx.tier >= 2 ? 0 : 1;
    let n = 1;
    const place = (m, r, z, mat) => {
      const g = rectAt(c, a, r, z);
      m.material = mat; m.visible = true; m.position.copy(g.pos); m.quaternion.copy(c.q); m.scale.set(g.w, g.h, 1);
    };
    if (L.tower) { place(tower, L.tower, zh * 1.06, towerMat); towerMat.uniforms.uGzLock.value = L.lock ?? 0; } else tower.visible = false;
    for (const b of pool.slice(1)) b.visible = false;
    for (const b of L.blocks ?? []) {
      if (n >= pool.length) break;
      const m = pool[n++], mat = mats.get(b[4]) ?? mats.get(3);
      place(m, [b[0], b[1], b[2], b[3]], zh * (1.55 + 0.05 * (b[4] % 5)), mat);
      mat.uniforms.uGzSiren.value = L.siren ?? 0; mat.uniforms.uGzLock.value = L.lock ?? 0;
    }
    if (L.board) place(pool[11], [0.58, 1.04, 0.14, 0.76], zh * 1.055, panelMat);
  };

  return {
    group,
    update(t, dt, cue) {
      const a = ctx.aspect();
      if (!cams || Math.abs(a - asp) > 1e-3) { asp = a; cams = cameras(ctx, a); shot = -1; }
      const i = cue.shot?.i ?? 0;
      if (i !== shot || engine.tier !== (aim.tier ?? -1)) { shot = i; aim.tier = engine.tier; aim(i); }
    },
    dispose() { sh.uLightDir.value.copy(prev.dir); sh.uLightCol.value.copy(prev.col); plane.dispose(); panelMat.dispose(); },
  };
}
