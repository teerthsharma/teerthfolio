// E03 EMBERS: the key visual's warm fire in the foreground. 220 additive points rising 0.4 m/s (on twos), flickering, drifting in a slow sway.
// Region 0: the rubble flanks (|x| 6-24 m, z -7..8: never within 6 m of the seal). Region 1: the crack corridor (z -30..-3), lit only
// while the ground crack races (f79-103) and after, the "ember burst".
//
// MATHS  y = 0.2 + mod(6 d + 0.4 t, 6);  sway = 0.35 sin(1.3 t + 20 a);  flicker = 0.5 + 0.5 sin(9 t + 40 c);  alpha = (1 - y/6)(0.5 + 0.5 flicker).
//  point size = (2.5 + 2 b) px * (resY / 720). Core #fff0c8 in the middle of the dot, ember #ff9a3c at the rim.
import { V } from "../../../paint.js";
import { C, T, additive, timing } from "./pal.js";

const VERT = /* glsl */ `
  attribute vec4 aS; attribute float aR; uniform float uT; uniform float uAmt; uniform vec2 uRes;
  varying float vA;
  void main() {
    float side = aS.x < 0.5 ? -1.0 : 1.0;
    vec3 p;
    p.x = aR > 0.5 ? (aS.y - 0.5) * 10.0 : side * (6.0 + aS.y * 18.0);
    p.z = aR > 0.5 ? mix(-30.0, -3.0, aS.z) : mix(-7.0, 8.0, aS.z);
    float rise = mod(aS.w * 6.0 + uT * 0.4, 6.0);
    p.y = 0.2 + rise;
    p.x += sin(uT * 1.3 + aS.x * 20.0) * 0.35; p.z += cos(uT * 1.1 + aS.y * 20.0) * 0.35;
    float fl = 0.5 + 0.5 * sin(uT * 9.0 + aS.z * 40.0);
    vA = (1.0 - rise / 6.0) * (0.5 + 0.5 * fl) * (aR > 0.5 ? uAmt : 1.0);
    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
    gl_PointSize = (2.5 + 2.0 * aS.y) * uRes.y / 720.0;
  }`;
const FRAG = /* glsl */ `
  varying float vA;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    if (r > 1.0) discard;
    vec3 c = mix(${V(C.ember)}, ${V(C.emberCore)}, 1.0 - r);
    gl_FragColor = vec4(c * vA * (1.0 - r * r) * 1.3, 0.0);
  }`;

export function buildEmbers(ctx) {
  const { THREE, engine } = ctx;
  const R = ctx.rng("embers"), H = timing(ctx), N = 220;
  const s = new Float32Array(N * 4), reg = new Float32Array(N), pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { for (let k = 0; k < 4; k++) s[i * 4 + k] = R(); reg[i] = i < 60 ? 1 : 0; }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("aS", new THREE.BufferAttribute(s, 4)); g.setAttribute("aR", new THREE.BufferAttribute(reg, 1));
  const m = additive(new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: { uT: { value: 0 }, uAmt: { value: 0 }, uRes: engine.shared.uRes } }));
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.userData.layer = 1;
  const group = new THREE.Group(); group.add(pts);
  return {
    group,
    update(t, dt, cue) { m.uniforms.uT.value = t; m.uniforms.uAmt.value = H.prog("crack", T.crack[0], T.crack[1], t, cue); },
    dispose() { g.dispose(); m.dispose(); },
  };
}
