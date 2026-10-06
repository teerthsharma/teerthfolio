// page-tear: the kill is a torn-page DIMENSION, not a flash. Layer 1, behind the seal (z pushed).
// Maths: tear edge T(y) = 0.08 + 0.22 * ridged(vec2(y*6, t)) * uTear
//   left of T = paper (fibre + gold #d9a441 edge); right = under-page teal #1fbdb4
//   uTear 0 at 6.5 s (crack), 1 by 8.2 s so the 8 s still is already a torn page
import { Mesh, PlaneGeometry, ShaderMaterial } from "three";
import { KIT, V } from "../../../paint.js";
import { GLSL as FIBER } from "./page-fiber.js";

export const meta = { params: { paper: { default: "#f4e8c8" }, gold: { default: "#d9a441" }, teal: { default: "#1fbdb4" } } };

export default function makePageTear(ctx) {
  const mat = new ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: true,
    uniforms: { uT: { value: 0 }, uTear: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.99999, 1.0); }",
    fragmentShader: `uniform float uT; uniform float uTear; varying vec2 vUv; ${KIT} ${FIBER}
      const vec3 PAPER = ${V("#f4e8c8")}; const vec3 GOLD = ${V("#d9a441")}; const vec3 TEAL = ${V("#1fbdb4")}; const vec3 INK = ${V("#0b2a55")};
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float edge = 0.08 + 0.22 * ridged(vec2(vUv.y * 6.0, uT * 0.4)) * uTear;
        float d = p.x - (-0.15 + edge);
        float w = fwidth(d) + 0.01;
        float paper = 1.0 - smoothstep(-w, w, d);
        float lip = 1.0 - smoothstep(0.0, 0.03, abs(d));
        vec3 col = mix(mix(TEAL, INK, 0.35), PAPER * (0.88 + 0.12 * pageFiber(vUv)), paper);
        col = mix(col, GOLD, lip * uTear * 0.85);
        float Y = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col *= min(1.0, 0.92 / max(Y, 1e-4));
        gl_FragColor = vec4(col, mix(0.0, 0.72, uTear));
      }`,
  });
  const mesh = new Mesh(new PlaneGeometry(2, 2), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 8;
  mesh.userData.layer = 1;
  const group = new ctx.THREE.Group();
  group.add(mesh);
  return {
    group,
    update(t) {
      const tear = Math.min(1, Math.max(0, (t - 6.5) / 1.7));
      mat.uniforms.uT.value = t;
      mat.uniforms.uTear.value = tear * tear * (3 - 2 * tear);
      mesh.visible = tear > 0.01;
    },
    dispose() { mesh.geometry.dispose(); mat.dispose(); },
  };
}
