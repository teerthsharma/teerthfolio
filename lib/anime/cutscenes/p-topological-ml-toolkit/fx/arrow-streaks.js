// arrow-streaks: Accelerator vector storm as screen streaks. Overcast city, arrows #e5142e.
// Maths: 18 radial lines from the chest; each line is a Gaussian ribbon
//   d = | (p - o) × dir |; a = exp(-(d/w)^2) * smoothstep(0, 0.2, along) * (1 - along)
//   reverse after t=3.4: colour mix(RED, WHITE, rev); luma cap 0.92
import { Mesh, PlaneGeometry, ShaderMaterial } from "three";
import { V } from "../../../paint.js";

export const meta = { params: { arrow: { default: "#e5142e" }, overcast: { default: "#c8d4e4" } } };

export default function buildStreaks(ctx) {
  const mat = new ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uT: { value: 0 }, uRev: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.99999, 1.0); }",
    fragmentShader: `uniform float uT; uniform float uRev; varying vec2 vUv;
      const vec3 RED = ${V("#e5142e")}; const vec3 WHT = ${V("#e8eef4")}; const vec3 INK = ${V("#2a3a8a")};
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        vec2 o = vec2(0.0, -0.08);
        vec3 col = vec3(0.0); float a = 0.0;
        for (int i = 0; i < 18; i++) {
          float ang = float(i) * 0.349066 + uT * 0.15;
          vec2 dir = vec2(cos(ang), sin(ang));
          vec2 q = p - o;
          float along = dot(q, dir);
          float d = abs(q.x * dir.y - q.y * dir.x);
          float w = 0.012 + 0.004 * fract(float(i) * 0.17);
          float g = exp(-(d * d) / (w * w)) * smoothstep(0.0, 0.12, along) * (1.0 - smoothstep(0.55, 1.15, along));
          col += mix(RED, WHT, uRev) * g;
          a += g;
        }
        col += INK * 0.08 * a;
        float Y = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col *= min(1.0, 0.92 / max(Y, 1e-4));
        gl_FragColor = vec4(col, clamp(a * 0.55, 0.0, 0.62));
      }`,
  });
  const mesh = new Mesh(new PlaneGeometry(2, 2), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 6;
  mesh.userData.layer = 1;
  const group = new ctx.THREE.Group();
  group.add(mesh);
  return {
    group,
    update(t) {
      mat.uniforms.uT.value = t;
      mat.uniforms.uRev.value = Math.min(1, Math.max(0, (t - 3.4) / 0.4));
      mesh.visible = t > 1.2 && t < 10.4;
    },
    dispose() { mesh.geometry.dispose(); mat.dispose(); },
  };
}
