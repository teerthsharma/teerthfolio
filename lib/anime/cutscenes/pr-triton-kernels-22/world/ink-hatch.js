// SHRINE INK HATCH (Korean manhwa, same Sukuna law as Caustic). Local world shader.
// One blood. Protected look: no copied face. Ink #0e0b0d, never #000.
//
// MATHS
//   hatch: h = (gl_FragCoord.x * 0.82 - gl_FragCoord.y) / (4.5 px * H/720)
//          line where |fract(h)-0.5|*2 > 0.78, AA = fwidth(h)
//   weight = (1 - celStep) so only the shadow band takes ink
//   blood: one accent #8a1a28 where a second, sparser hatch (9 px) crosses the first
//   luma ≤ 0.92. Applied as a multiply overlay card on the shrine maw.
import { DoubleSide, Mesh, PlaneGeometry, ShaderMaterial } from "three";
import { SHRINE_Z, SCALE } from "./shrine.js";

export const meta = {
  name: "jojo-hatch-ink",
  params: {
    ink: { default: "#0e0b0d" },
    blood: { default: "#8a1a28" },
    cellPx: { default: 4.5 },
  },
};

const VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG = /* glsl */ `varying vec2 vUv; uniform float uA;
  const vec3 INK = vec3(0.055, 0.043, 0.051);
  const vec3 BLOOD = vec3(0.541, 0.102, 0.157);
  const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
  void main(){
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p * vec2(1.0, 0.72));
    if (r > 1.0) discard;
    float h = (gl_FragCoord.x * 0.82 - gl_FragCoord.y) / 4.5;
    float line = smoothstep(0.76, 0.84, abs(fract(h) - 0.5) * 2.0);
    float h2 = (gl_FragCoord.x + gl_FragCoord.y * 0.4) / 9.0;
    float blood = smoothstep(0.88, 0.94, abs(fract(h2) - 0.5) * 2.0) * line;
    float maw = smoothstep(0.22, 0.55, r) * (1.0 - smoothstep(0.88, 1.0, r));
    vec3 col = mix(INK, BLOOD, blood);
    col *= min(1.0, 0.92 / max(dot(col, LUMA), 1e-3));
    float a = maw * mix(0.22, 0.55, line) * uA;
    if (a < 0.02) discard;
    gl_FragColor = vec4(col, a);
  }`;

export function create(ctx) {
  const { THREE } = ctx;
  const mat = new ShaderMaterial({
    uniforms: { uA: { value: 0.85 } }, vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthWrite: false, side: DoubleSide,
  });
  const mesh = new Mesh(new PlaneGeometry(1, 1), mat);
  mesh.frustumCulled = false; mesh.renderOrder = 6; mesh.name = "shrine-ink-hatch";
  const S = SCALE;
  mesh.position.set(0, 5.2 * S, SHRINE_Z + 2.4 * S);
  mesh.scale.set(14 * S * 0.88, 9 * S, 1);
  return {
    group: mesh,
    update(t, open = 0.28) {
      mat.uniforms.uA.value = 0.55 + 0.4 * open;
      mesh.scale.set(14 * S * 0.88, (8 + 4 * open) * S, 1);
    },
    dispose() { mesh.geometry.dispose(); mat.dispose(); },
  };
}
