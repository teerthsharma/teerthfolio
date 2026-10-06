// p-caustic WORLD / dust motes (bible 3.14): 120 points (80 + 40) in #b3a28c, #6f6355, #d6c8b2, drifting up on twos.
//   pos(t) = base + (1.2 sin(.3 t + ph), rise, 1.2 cos(.27 t + ph)), y = mod(base.y + .35 sp t, 9) + .2
//   size   = d_m * H * .5 * P11 / -z  (a metric diameter d_m projected with the camera's own focal length), clamped 1.5..10 px
import { since } from "./common.js";

const VERT = /* glsl */ `
  attribute vec3 aBase; attribute vec3 aCol; attribute vec3 aPar; uniform float uT; uniform float uH; varying vec3 vC;
  void main() {
    vec3 p = aBase;
    p.x += 1.2 * sin(0.3 * uT + aPar.x * 6.283);
    p.z += 1.2 * cos(0.27 * uT + aPar.x * 6.283);
    p.y = mod(aBase.y + 0.35 * aPar.y * uT, 9.0) + 0.2;
    vec4 vc = viewMatrix * modelMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * vc;
    gl_PointSize = clamp(aPar.z * uH * 0.5 * projectionMatrix[1][1] / max(-vc.z, 0.1), 1.5, 10.0);
    vC = aCol;
  }`;
const FRAG = /* glsl */ `
  varying vec3 vC;
  void main() { if (length(gl_PointCoord - 0.5) > 0.5) discard; gl_FragColor = vec4(min(vC, vec3(0.85)), 0.5); }`;

export function buildMotes(ctx, env) {
  const { THREE, engine } = ctx, rng = ctx.rng("p-caustic-motes");
  const cols = ["#b3a28c", "#6f6355", "#d6c8b2"].map((h) => new THREE.Color(h));
  const N = 120, base = new Float32Array(N * 3), col = new Float32Array(N * 3), par = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    base.set([(rng() - 0.5) * 120, rng() * 9, 4 - rng() * 90], i * 3);
    const c = cols[i < 80 ? (rng() < 0.5 ? 0 : 2) : 1]; col.set([c.r, c.g, c.b], i * 3);
    par.set([rng(), 0.6 + rng() * 0.8, 0.06 + rng() * 0.08], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  geo.setAttribute("aBase", new THREE.BufferAttribute(base, 3));
  geo.setAttribute("aCol", new THREE.BufferAttribute(col, 3));
  geo.setAttribute("aPar", new THREE.BufferAttribute(par, 3));
  const mat = new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uH: { value: 720 } }, vertexShader: VERT, fragmentShader: FRAG });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false; pts.userData.layer = 1;
  return {
    obj: pts,
    update(t, dt, cue) {
      mat.uniforms.uT.value = cue.ts;
      const r = engine.shared?.uRes?.value; mat.uniforms.uH.value = r ? r.y : 720;
      pts.visible = since(cue, "break") < 0.9;
    },
    dispose() { geo.dispose(); mat.dispose(); },
  };
}
