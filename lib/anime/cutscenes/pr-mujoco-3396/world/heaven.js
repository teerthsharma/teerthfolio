// The built cloud bank over the far crest, a low sun behind the gap that grows as the Wall opens, and the god-light over the Wall: two baked cards and nine shafts from the low sun, three draws in all. The shafts grow with the gap and fade with the burn; the sun is burned off with the drawing.
import { BufferGeometry, DoubleSide, Float32BufferAttribute, Group, Mesh, ShaderMaterial, Vector3 } from "three";
import { puffBanks, puffUniforms } from "../../../paint.js";
import { T, smooth } from "../clock.js";
import { TONE, tone } from "../tone.js";
import { FAR, ORDER, SUN, SUNCARD, burnable } from "./spec.js";

const CLOUD = /* glsl */ `
  vec4 paint(vec2 p) {
    vec4 f = puffs(p, 0.02);
    float lam = dot(f.xyz, normalize(vec3(0.2, -0.35, 0.9)));
    vec3 c = mix(vec3(0.17, 0.09, 0.05), vec3(0.90, 0.66, 0.20), smoothstep(0.1, 0.7, lam));
    return vec4(c, step(0.5, f.w));
  }`;
const hex = (h) => [1, 3, 5].map((i) => (parseInt(h.slice(i, i + 2), 16) / 255).toFixed(3)).join(", ");
const SUN_CARD = /* glsl */ `
  vec4 paint(vec2 p) {
    float r = length(p - vec2(0.5)) * 2.0;
    vec3 c = mix(vec3(${hex(SUNCARD.core)}), vec3(${hex(SUNCARD.halo)}), smoothstep(0.03, 0.2, r));
    return vec4(c, ${SUNCARD.a} * smoothstep(0.34, 0.1, r));
  }`;
const GROUND_Z = -300, HALF = 13;
const XS = [-230, -153, -76, 1, 78, 155, -4, 0, 4];
const SHAFTS = XS.length;
const SHAFT_VS = /* glsl */ `
  attribute float aI;
  uniform float uA[${SHAFTS}];
  varying vec2 vUv;
  varying float vA;
  void main() {
    vUv = uv;
    vA = uA[int(aI + 0.5)];
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;
const SHAFT_FS = /* glsl */ `
  varying vec2 vUv;
  varying float vA;
  ${TONE}
  void main() {
    float a = 1.0 - abs(vUv.x * 2.0 - 1.0);
    a = a * a * (1.0 - vUv.y) * vA;
    gl_FragColor = vec4(siteTone(vec3(0.90, 0.66, 0.20)) * a, a);
  }`;

export function buildHeaven(k, ctx) {
  const group = new Group();
  const cloud = ctx.bake.card(CLOUD, {
    w: 2048, h: 260, size: [2600, 330], tools: ["noise", "puffs"],
    uniforms: puffUniforms(puffBanks(11, [[0.1, 3.9, 0.04, 0.5, 15, 0.1, 0.07]])), id: 0.99,
  });
  tone(cloud.material);
  burnable(cloud.material);
  cloud.position.set(0, 150, FAR.z);
  cloud.renderOrder = ORDER.far;
  group.add(cloud);

  const sun = ctx.bake.card(SUN_CARD, { w: 512, h: 512, size: [SUNCARD.size, SUNCARD.size], id: 0.99 });
  tone(sun.material);
  burnable(sun.material);
  sun.position.set(SUNCARD.at[0], 52, SUNCARD.at[2]); // 22 m above SUNCARD.at: at 30 the disc sat behind the ruins line under the gap box (centre v 0.55)
  sun.renderOrder = ORDER.far;
  group.add(sun);

  const sunDir = new Vector3(...SUN).multiplyScalar(FAR.sun), up = new Vector3(0, 1, 0);
  const pos = [], uv = [], ids = [], index = [];
  for (let i = 0; i < SHAFTS; i++) {
    const b = new Vector3(XS[i], 0, GROUND_Z);
    const w = new Vector3().subVectors(b, sunDir).normalize().cross(up).normalize().multiplyScalar(HALF);
    const corners = [sunDir.clone().sub(w), sunDir.clone().add(w), b.clone().add(w), b.clone().sub(w)];
    const uvs = [[0, 0], [1, 0], [1, 1], [0, 1]];
    corners.forEach((c, j) => { pos.push(c.x, c.y, c.z); uv.push(...uvs[j]); ids.push(i); });
    index.push(4 * i, 4 * i + 1, 4 * i + 2, 4 * i, 4 * i + 2, 4 * i + 3);
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  geo.setAttribute("aI", new Float32BufferAttribute(ids, 1));
  geo.setIndex(index);
  const mat = new ShaderMaterial({
    transparent: true, depthWrite: false, premultipliedAlpha: true, side: DoubleSide,
    uniforms: { uA: { value: new Array(SHAFTS).fill(0) } },
    vertexShader: SHAFT_VS, fragmentShader: SHAFT_FS,
  });
  const shafts = new Mesh(geo, mat);
  shafts.frustumCulled = false;
  shafts.renderOrder = ORDER.haze;
  group.add(shafts);

  return {
    group,
    tier: 2,
    update(t, s) {
      const a = mat.uniforms.uA.value;
      const grow = 1 + 0.9 * smooth(T.shrink[0], T.flip[0], s), fade = 1 - smooth(T.burn[0], T.burn[0] + 0.5, s);
      for (let i = 0; i < SHAFTS; i++) a[i] = 0.11 * (0.85 + 0.15 * Math.sin(Math.floor(s * 12) * 0.9 + i)) * grow * fade;
      sun.visible = s >= T.sea[0];
      sun.scale.setScalar(0.4 + 0.6 * smooth(T.sea[0], T.sea[1], s));
    },
    dispose() {
      cloud.userData.dispose?.();
      sun.userData.dispose?.();
      geo.dispose();
      mat.dispose();
    },
  };
}
