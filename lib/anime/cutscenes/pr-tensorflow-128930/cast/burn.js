// BURN patch: Mechasealzilla's smooth skin burns away from the breath's impact point and riveted metal shows under it.
// a_skin = step(tau, 0.35 n + |p - i| / R) (gzDisguiseBurn's field, in world space); ember edge #ff5a1a to #ffb24a; metal #b8c0c8 / #6a727c, spec band #e8f0f8.
import { Vector3, Vector4 } from "three";

const MARK = "if (id == 3.0) col = vCol;";
const BODY = /* glsl */ `
  if (uTau >= 0.0) {
    float bf = 0.35 * vn3(vWP * 1.3) + length(vWP - uImp.xyz) / uImp.w;
    float l = 0.5 * dot(N, L) + 0.5;
    vec2 g = vOP.xy * vec2(9.0, 8.0) + vec2(floor(vOP.y * 8.0) * 0.5, 0.0), gf = fract(g), gi = floor(g);
    float tilt = (hash2(gi) - 0.5) * 0.2;
    vec3 metal = mix(vec3(0.145, 0.17, 0.2), vec3(0.48, 0.53, 0.58), step(0.42, l + tilt));
    metal = mix(metal, vec3(0.81, 0.87, 0.94), 0.9 * step(0.9, pow(clamp(l + tilt, 0.0, 1.0), 4.0)));
    metal = mix(metal, vec3(0.023, 0.03, 0.04), 1.0 - smoothstep(0.02, 0.05, min(min(gf.x, 1.0 - gf.x), min(gf.y, 1.0 - gf.y))));
    float rv = 1.0 - smoothstep(0.05, 0.09, length(gf - 0.5) - 0.0);
    metal = mix(metal, vec3(0.023, 0.03, 0.04), 0.0 * rv);
    float edge = smoothstep(0.07, 0.0, abs(bf - uTau));
    col = mix(metal, col, step(uTau, bf));
    col += mix(vec3(1.0, 0.1, 0.01), vec3(1.0, 0.45, 0.07), step(0.5, edge * fract(bf * 9.0 + 0.5))) * edge * 1.5;
  }
  `;

// root: the guest's group; returns { set(cam, t, p) } driving the shared uniforms
export function burnPatch(root) {
  const U = { uImp: { value: new Vector4() }, uTau: { value: -1 } };
  root.traverse((o) => {
    const m = o.material;
    if (!m?.isShaderMaterial || !m.fragmentShader.includes(MARK)) return;
    m.onBeforeCompile = (s) => {
      s.uniforms.uImp = U.uImp; s.uniforms.uTau = U.uTau;
      s.fragmentShader = s.fragmentShader.replace("void main() {", "uniform vec4 uImp; uniform float uTau;\n  void main() {").replace(MARK, BODY + MARK);
    };
    m.needsUpdate = true;
  });
  const v = new Vector3();
  return {
    // the breath burns from the chest at tau = 1.4 clamp((t - 8.333) / 0.167); the arrival tear is a small fixed burn at the shoulder
    set(cam, t, p) {
      const k = Math.min(1, Math.max(0, (t - 8.333) / 0.167)), R = 0.85 * p.scale;
      let tau = -1;
      v.copy(p.pos); v.y += 0.4 * p.scale;
      if (t >= 8.333) tau = 1.4 * k;
      else if (t >= 5.333 && t < 5.667) { tau = 0.25; v.addScaledVector(cam.R, 0.22 * p.scale); v.y += 0.12 * p.scale; }
      U.uImp.value.set(v.x, v.y, v.z, tau >= 0 && t < 8.333 ? 0.3 * p.scale : R);
      U.uTau.value = tau;
    },
  };
}
