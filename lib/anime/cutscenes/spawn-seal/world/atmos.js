// spawn-seal WORLD: atmosphere. (1) slow dust motes (hard-edged square-ish discs 2-6 px, cyan and gold, drifting up on twos), (2) low indigo
// mist cards at the cave edge (#1a1f5e at 0.2 alpha, camera-facing, never white, kept 18 m+ from the seal so nothing veils it). Layer 1.
//
// MOTES (vertex shader maths): p = base; p.y = gy + mod(base.y - gy + 0.16 t s, 10); p.xz += 0.35 (sin(0.3 t + 6 s), cos(0.27 t + 4 s)); t is the stepped clock.
//   size px = clamp(seed.w * 260 / -mv.z, 2, 6); colour = mix(#3fdcff, #ffd23a, step(0.82, seed.x) + uGold * seed.y); alpha 0.8, hard disc.
import { BufferGeometry, Float32BufferAttribute, Points, ShaderMaterial } from "three";
import { mistCard } from "../../../tools/mist.js";
import { C, SHARED_GLSL, V } from "./common.js";

export function buildAtmos(ctx, S) {
  const { THREE } = ctx;
  const R = ctx.rng(61), group = new THREE.Group();
  const N = 240, base = [], seed = [];
  for (let i = 0; i < N; i++) {
    const a = R() * Math.PI * 2, r = Math.sqrt(R()) * 22;
    base.push(Math.sin(a) * r, S.gy + R() * 10, Math.cos(a) * r);
    seed.push(R(), R(), R(), 0.5 + R() * 0.8);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(base, 3)); g.setAttribute("aSeed", new Float32BufferAttribute(seed, 4));
  const mat = new ShaderMaterial({
    transparent: true, depthWrite: false, blending: 5, blendSrc: 204, blendDst: 205, blendSrcAlpha: 200, blendDstAlpha: 201,
    uniforms: { ...S.U, uBase: { value: S.gy } },
    vertexShader: `attribute vec4 aSeed; uniform float uBase; varying vec3 vP; varying vec4 vS; ${SHARED_GLSL}
      void main() {
        vec3 p = position; p.y = uBase + mod(position.y - uBase + 0.16 * uT * (0.5 + aSeed.z), 10.0);
        p.xz += 0.35 * vec2(sin(0.3 * uT + 6.0 * aSeed.x), cos(0.27 * uT + 4.0 * aSeed.y));
        vec4 w = modelMatrix * vec4(p, 1.0); vP = w.xyz; vS = aSeed;
        vec4 mv = viewMatrix * w; gl_Position = projectionMatrix * mv; gl_PointSize = clamp(aSeed.w * 260.0 / max(-mv.z, 0.1), 2.0, 6.0);
      }`,
    fragmentShader: `varying vec3 vP; varying vec4 vS; ${SHARED_GLSL}
      void main() {
        vec2 c = abs(gl_PointCoord - 0.5);
        if (max(c.x, c.y) > 0.5 || c.x + c.y > 0.7) discard;
        vec3 col = mix(${V(C.cyan)}, ${V(C.gold)}, clamp(step(0.82, vS.x) + uGold * vS.y, 0.0, 1.0));
        gl_FragColor = vec4(worldFinish(col, vP), 0.8);
      }`,
  });
  const pts = new Points(g, mat); pts.frustumCulled = false; group.add(pts);

  const mists = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4, r = 18 + R() * 8;
    const m = mistCard(26, 6, C.fog, 0.2, 1 + i);
    m.position.set(Math.sin(a) * r, S.gy - 0.2 + R() * 0.8, Math.cos(a) * r);
    m.frustumCulled = false; m.renderOrder = 2;
    m.onBeforeRender = (_r, _s, cam) => { m.quaternion.copy(cam.quaternion); };
    group.add(m); mists.push(m);
  }
  return { group, dispose() { g.dispose(); mat.dispose(); mists.forEach((m) => { m.geometry.dispose(); m.material.dispose(); }); } };
}
