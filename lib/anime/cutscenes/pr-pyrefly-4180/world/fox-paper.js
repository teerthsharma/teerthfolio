// fox-paper: Nine-Tails as a kiri-e card on paper night. Layer 1, behind the seal.
// Maths: card-space p in metres; d = kiriFox(p); paper fibre = strokes(p*3)*0.1; lamp transmission at the cut.
import { DoubleSide, Mesh, PlaneGeometry, ShaderMaterial } from "three";
import { KIT, V } from "../../../paint.js";
import { GLSL as KIRI } from "./kiri-e-cut.js";

export const meta = { params: { paper: { default: "#f4e8c8" }, fox: { default: "#c3122e" } } };

export function foxCard() {
  const mat = new ShaderMaterial({
    side: DoubleSide, transparent: false, depthWrite: true,
    uniforms: { uT: { value: 0 }, uLamp: { value: 1 } },
    vertexShader: "varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform float uT; uniform float uLamp; varying vec2 vP; ${KIT} ${KIRI}
      const vec3 PAPER = ${V("#f4e8c8")}; const vec3 FOX = ${V("#c3122e")}; const vec3 NIGHT = ${V("#3a2a6a")};
      void main() {
        vec2 p = vP * vec2(1.15, 1.35);
        float d = kiriFox(p);
        if (d > 0.0) discard;
        float cut = kiriCut(d);
        float fib = strokes(p * 3.0, 0.7, 0.05, 0.01);
        vec3 col = mix(FOX, PAPER * 0.85, cut * 0.35);
        col *= 0.92 + 0.08 * fib;
        col = mix(col, NIGHT, (1.0 - uLamp) * 0.25);
        float Y = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col *= min(1.0, 0.92 / max(Y, 1e-4));
        gl_FragColor = vec4(col, 0.5);
      }`,
  });
  const mesh = new Mesh(new PlaneGeometry(7.2, 8.4), mat);
  mesh.position.set(-2.4, 2.8, -6.5);
  mesh.userData.layer = 1;
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;
  return {
    mesh,
    uniforms: mat.uniforms,
    dispose() { mesh.geometry.dispose(); mat.dispose(); },
  };
}
