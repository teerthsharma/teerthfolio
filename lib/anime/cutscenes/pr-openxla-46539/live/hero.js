// Ported from moves/pr-openxla-46539/hero.js (the site's live move, read only). Imports point at this folder.
// The page's surfaces write alpha 0.99 (its line id); translucent materials pass through idSafe (support.js).
// The notes live with the original.

import { Box3, BufferGeometry, DoubleSide, Float32BufferAttribute, Mesh, PlaneGeometry, ShaderMaterial, Vector3 } from "three";
import { idSafe } from "./support.js";
import { PRINT, SH, u } from "./print.js";

export function cape(body) {
  body.geometry.computeBoundingBox();
  const bb = new Box3().copy(body.geometry.boundingBox).applyMatrix4(body.matrix);
  const c = bb.getCenter(new Vector3());
  const s = bb.getSize(new Vector3());
  const g = new PlaneGeometry(1, 1, 8, 10);
  const m = new ShaderMaterial({
    uniforms: { uCell: SH.uCell, uTime: SH.uTime, uSun: SH.uSun, uPal: SH.uPal, uWind: u(0.2), uBillow: u(0), uAt: u(new Vector3(c.x, c.y + s.y * 0.36, c.z + s.z * 0.24)), uW: u(s.x * 0.62) },
    side: DoubleSide,
    vertexShader: /* glsl */ `
      uniform float uTime, uWind, uBillow, uW;
      uniform vec3 uAt;
      varying vec2 vUv2;
      varying vec3 vW;
      void main() {
        vUv2 = uv;
        float x = uv.x - 0.5;
        float v = 1.0 - uv.y;
        vec3 dir = normalize(mix(vec3(0.0, -0.55, -1.0), vec3(0.15, 0.75, -0.7), uBillow));
        float wid = uW * (1.0 + v * (0.7 + 4.0 * uBillow));
        vec3 pos = vec3(x * wid, 0.0, 0.0) + dir * (1.7 * v) + uAt;
        float ph = uTime * (3.0 + 7.0 * uWind) - v * 6.0 + x * 3.0;
        pos.x += sin(ph) * 0.09 * v * (0.4 + uWind);
        pos.z += sin(ph * 1.3 + 1.3) * 0.22 * v * (0.3 + 1.6 * uWind);
        pos.y += cos(ph * 0.9) * 0.1 * v * uWind;
        pos.x += x * v * uWind * 0.9;
        vec4 w = modelViewMatrix * vec4(pos, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv2;
      varying vec3 vW;
      ${PRINT}
      void main() {
        vec3 n = normalize(cross(dFdx(vW), dFdy(vW)));
        vec4 t = uPal[14];
        float v = 1.0 - vUv2.y;
        float fold = 0.5 + 0.5 * sin(vUv2.x * 19.0 + sin(uTime * 2.0 + v * 4.0) * 0.5);
        t.w += step(0.66, fold) * 0.4 * (1.0 - t.w);
        t.w += (1.0 - smoothstep(0.0, 0.5, n.z * (gl_FrontFacing ? 1.0 : -1.0) + 0.3)) * 0.2;
        t = mix(t, uPal[15], step(0.86, v) * step(v, 0.92));
        t = mix(t, uPal[17], step(0.93, v));
        float edge = min(min(vUv2.x, 1.0 - vUv2.x), vUv2.y);
        float ink = 1.0 - smoothstep(0.0, 0.025, edge);
        ink = max(ink, 1.0 - smoothstep(0.0, 0.012, abs(v - 0.93)));
        vec3 col = mix(inkPrint(t), INK_K, ink);
        gl_FragColor = vec4(pow(max(col, vec3(0.0)), vec3(2.2)), 0.99);
      }`,
  });
  const mesh = new Mesh(g, m);
  mesh.frustumCulled = false;
  mesh.visible = false;
  return { mesh, m, g };
}

export function vAura() {
  const g = new BufferGeometry();
  const L = 1.25;
  const ray = (ang, len, w) => {
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const P = (x, y) => [x * c - y * s, x * s + y * c, 0];
    return [...P(-w, 0), ...P(w, 0), ...P(0, len)];
  };
  const pos = [...ray(0.3, L, 0.09), ...ray(-0.3, L, 0.09), ...ray(0.62, L * 0.6, 0.06), ...ray(-0.62, L * 0.6, 0.06)];
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  const uvs = [];
  for (let i = 0; i < 4; i++) uvs.push(0, 0, 1, 0, 0.5, 1);
  g.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  const m = idSafe(new ShaderMaterial({
    uniforms: { uCell: SH.uCell, uTime: SH.uTime, uK: u(0) },
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    vertexShader: /* glsl */ `
      uniform float uK;
      varying vec2 vUv2;
      void main() {
        vUv2 = uv;
        vec3 p = position * (0.15 + 0.85 * uK);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uK;
      varying vec2 vUv2;
      ${PRINT}
      void main() {
        float edge = 1.0 - abs(vUv2.x * 2.0 - 1.0) * (1.0 - vUv2.y * 0.2);
        float tone = clamp(edge * 1.2 - vUv2.y * 0.25, 0.0, 1.0);
        float cv;
        vec3 col = inkPrint(vec4(0.0, 0.0, tone, 0.0), cv);
        col = mix(col, vec3(1.0), smoothstep(0.55, 0.8, edge) * 0.9);
        float a = max(cv, smoothstep(0.55, 0.8, edge)) * uK;
        if (a < 0.02) discard;
        gl_FragColor = vec4(pow(col, vec3(2.2)), a);
      }`,
  }));
  const mesh = new Mesh(g, m);
  mesh.frustumCulled = false;
  mesh.visible = false;
  return { mesh, m, g };
}

