// ARAKI SET SHADER (JoJo Part 3). Local world shader for pr-tensorflow-124410.
// NEEDS.md named this; the stone program in geo.js already runs it. This file is the
// one-element module: a face-on hatch plate that holds the Araki cut-shadow in a still.
//
// MATHS
//   v = N·L * 0.5 + 0.5 - 0.42 * cut
//   cut = hard world diagonal: s = dot(wp.xz, (0.62,-0.78))*0.045 + wp.y*0.03
//         shadowed where fract(s) > 0.64, AA = fwidth(s)
//   3 cel steps at 0.42 / 0.70 (fwidth). Complementary shadow hue.
//   hatch: screen (x-y)/(5 px), |fract-0.5|*2 > 0.8 in the shadow step only.
//   ink #05020a, never #000. luma ≤ 0.92.
import { FrontSide, Mesh, PlaneGeometry, ShaderMaterial, Vector3 } from "three";
import { NOISE, PAL_UNIFORMS } from "./glsl.js";

export const meta = {
  name: "araki-set-shader",
  params: {
    ink: { default: "#05020a" },
    hatchPx: { default: 5 },
    lumaCap: { default: 0.92 },
  },
};

const VERT = /* glsl */ `
  varying vec3 vWP; varying vec3 vN;
  void main(){
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWP = w.xyz; vN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;

const FRAG = /* glsl */ `
  ${PAL_UNIFORMS}
  ${NOISE}
  const vec3 INK = vec3(0.0196, 0.0078, 0.0392);
  const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
  varying vec3 vWP; varying vec3 vN;
  float aa(float v, float t){ float w = fwidth(v) * 0.75 + 1e-4; return smoothstep(t - w, t + w, v); }
  void main(){
    vec3 N = normalize(vN);
    float ndl = dot(N, normalize(uKey)) * 0.5 + 0.5;
    float s = dot(vWP.xz, vec2(0.62, -0.78)) * 0.045 + vWP.y * 0.03 + uShift;
    float fs = fract(s), sw = fwidth(s) + 1e-5;
    float cut = clamp(min(fs - 0.64, 1.0 - fs) / sw + 0.5, 0.0, 1.0);
    float v = ndl - 0.42 * cut;
    vec3 base = uP[1];
    vec3 lit = mix(base, uLightC, 0.22); lit *= min(1.0, 0.92 / max(dot(lit, LUMA), 1e-3));
    vec3 mid = mix(base * 0.66, uShadeC, 0.28);
    vec3 shd = mix(base * 0.36, uShadeC * 0.6, 0.5);
    vec3 col = mix(mix(shd, mid, aa(v, 0.42)), lit, aa(v, 0.70));
    float hp = (gl_FragCoord.x - gl_FragCoord.y) / (5.0 * uRes.y / 720.0);
    float hl = abs(fract(hp) - 0.5) * 2.0;
    col = mix(col, col * 0.55, smoothstep(0.78, 0.86, hl) * (1.0 - aa(v, 0.42)) * 0.7);
    gl_FragColor = vec4(col, 0.5);
  }`;

export function create(ctx, U) {
  const mat = new ShaderMaterial({ uniforms: { ...U }, vertexShader: VERT, fragmentShader: FRAG, side: FrontSide });
  const mesh = new Mesh(new PlaneGeometry(18, 8), mat);
  mesh.rotation.x = -Math.PI / 2; mesh.position.set(0, 0.03, 8);
  mesh.frustumCulled = false; mesh.name = "araki-set-shader";
  return { group: mesh, dispose() { mesh.geometry.dispose(); mat.dispose(); } };
}
