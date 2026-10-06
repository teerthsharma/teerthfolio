// throne-haze: dust-and-violet volume in the Throne Room, American-show haze (key shafts, not manga grain).
// Maths: ray-marched 6 steps along view, density = fbm(P.xz * 0.08 + t*0.04) * exp(-P.y / 8)
//   col = KEY * d * 0.18 + GOLD * shaft * 0.12; shaft = exp(-(P.x + 4)^2 / 18)
//   AA: no hard step; luma cap 0.92; ink #1a0c24
import { BackSide, Mesh, ShaderMaterial, SphereGeometry } from "three";
import { KIT, V } from "../../../paint.js";

export const meta = { params: { key: { default: "#a23cff" }, gold: { default: "#d9a441" } } };

export function liveHaze() {
  const mat = new ShaderMaterial({
    side: BackSide, transparent: true, depthWrite: false,
    uniforms: { uT: { value: 0 } },
    vertexShader: "varying vec3 vW; varying vec3 vD; void main() { vW = position; vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform float uT; varying vec3 vW; varying vec3 vD; ${KIT}
      const vec3 KEY = ${V("#a23cff")}; const vec3 GOLD = ${V("#d9a441")}; const vec3 FILL = ${V("#1a0c24")};
      void main() {
        vec3 d = normalize(vD);
        float acc = 0.0; vec3 col = vec3(0.0);
        for (int i = 0; i < 6; i++) {
          float s = 4.0 + float(i) * 3.4;
          vec3 P = d * s;
          float den = fbm(P.xz * 0.08 + vec2(uT * 0.04, 0.0)) * exp(-max(P.y, 0.0) / 8.0);
          float shaft = exp(-pow(P.x + 4.0, 2.0) / 18.0);
          acc += den * 0.16;
          col += KEY * den * 0.14 + GOLD * shaft * den * 0.10;
        }
        col = mix(FILL, col, clamp(acc, 0.0, 0.55));
        float Y = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col *= min(1.0, 0.92 / max(Y, 1e-4));
        gl_FragColor = vec4(col, clamp(acc * 0.45, 0.0, 0.42));
      }`,
  });
  const mesh = new Mesh(new SphereGeometry(28, 32, 16), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  mesh.userData.layer = 1;
  return {
    mesh,
    uniforms: mat.uniforms,
    dispose() { mesh.geometry.dispose(); mat.dispose(); },
  };
}
