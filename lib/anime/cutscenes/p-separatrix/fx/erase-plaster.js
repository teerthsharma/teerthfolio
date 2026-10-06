// erase-plaster: GER wipe — plaster lifts to the red under-sketch #b3122a. Not a flash.
// Maths: f = fbm(p*7); erased where f < mix(0.05, 0.98, uErase)
//   flake rim = 1 - smoothstep(0, 0.014, |f - thr|); sketch = UNDER * (0.7 + 0.3 * strokes)
import { Mesh, PlaneGeometry, ShaderMaterial } from "three";
import { KIT, V } from "../../../paint.js";

export const meta = { params: { under: { default: "#b3122a" }, plaster: { default: "#f4e8c8" } } };

export function erasePlaster() {
  const mat = new ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uErase: { value: 0 }, uT: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.99999, 1.0); }",
    fragmentShader: `uniform float uErase; uniform float uT; varying vec2 vUv; ${KIT}
      const vec3 UNDER = ${V("#b3122a")}; const vec3 PLAST = ${V("#f4e8c8")}; const vec3 GOLD = ${V("#d9a441")};
      void main() {
        if (uErase < 0.001) discard;
        vec2 p = vUv * 2.0;
        float f = fbm(p * 7.0 + 3.0);
        float thr = mix(0.05, 0.98, uErase);
        float er = 1.0 - step(thr, f);
        float rim = 1.0 - smoothstep(0.0, 0.014, abs(f - thr));
        vec3 sketch = UNDER * (0.7 + 0.3 * strokes(p * 4.0, 0.4, 0.07, 0.012));
        vec3 col = mix(PLAST, sketch, er);
        col = mix(col, GOLD, rim * 0.35 * (1.0 - uErase));
        float Y = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col *= min(1.0, 0.92 / max(Y, 1e-4));
        gl_FragColor = vec4(col, er * 0.55 * uErase);
      }`,
  });
  const mesh = new Mesh(new PlaneGeometry(2, 2), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 12;
  mesh.userData.layer = 1;
  return {
    mesh,
    uniforms: mat.uniforms,
    dispose() { mesh.geometry.dispose(); mat.dispose(); },
  };
}
