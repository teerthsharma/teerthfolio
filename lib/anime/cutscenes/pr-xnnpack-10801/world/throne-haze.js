// throne-haze: Las Noches heat-haze over the dais. Protected Aizen set: desert #f4e8c8, sky #0a0614, one cold blue.
// Maths: screen warp q = uv + 0.004 * (fbm(uv*8 + t*0.3) - 0.5) on a BackSide card behind the throne.
//   density = exp(-|xz|^2 / 28) * (0.35 + 0.65 * fbm); colour = mix(DESERT, BLUE, 0.12) * density
//   luma cap 0.92; ink #0a0614 not #000
import { DoubleSide, Mesh, PlaneGeometry, ShaderMaterial } from "three";
import { KIT, V } from "../../../paint.js";

export const meta = { params: { desert: { default: "#f4e8c8" }, sky: { default: "#0a0614" } } };

export function throneHaze() {
  const mat = new ShaderMaterial({
    side: DoubleSide, transparent: true, depthWrite: false,
    uniforms: { uT: { value: 0 } },
    vertexShader: "varying vec2 vUv; varying vec3 vW; void main() { vUv = uv; vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform float uT; varying vec2 vUv; varying vec3 vW; ${KIT}
      const vec3 DES = ${V("#f4e8c8")}; const vec3 SKY = ${V("#0a0614")}; const vec3 BLUE = ${V("#3d7fc4")};
      void main() {
        vec2 q = vUv + 0.004 * (vec2(fbm(vUv * 8.0 + uT * 0.3), fbm(vUv * 8.0 + 4.0 - uT * 0.22)) - 0.5);
        float den = exp(-dot(vUv - 0.5, vUv - 0.5) / 0.22) * (0.35 + 0.65 * fbm(q * 5.0));
        vec3 col = mix(SKY, mix(DES, BLUE, 0.12), clamp(den, 0.0, 1.0));
        float Y = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col *= min(1.0, 0.92 / max(Y, 1e-4));
        gl_FragColor = vec4(col, clamp(den * 0.38, 0.0, 0.4));
      }`,
  });
  const mesh = new Mesh(new PlaneGeometry(14, 9), mat);
  mesh.position.set(0, 4.2, -2.2);
  mesh.userData.layer = 1;
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  return {
    mesh,
    uniforms: mat.uniforms,
    dispose() { mesh.geometry.dispose(); mat.dispose(); },
  };
}
