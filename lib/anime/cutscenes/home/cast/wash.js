// The watercolour print of live/paper.js wash(), as a shader block, in gamma space: the pup and the character take it in their own main().
import { Vector2, Vector3 } from "three";
import { SUN, TONE } from "../tone.js";

export const WASH_U = {
  uWashRun: { value: 0 },
  uWashRes: { value: new Vector2(1, 1) },
  uWashPx: { value: 1 },
  uWashSun: { value: new Vector3(...SUN).normalize() },
};

export const WASH = /* glsl */ `
  uniform float uWashRun, uWashPx;
  uniform vec2 uWashRes;
  uniform vec3 uWashSun;
  float wpH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float wpH3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float wpN(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(wpH(i), wpH(i + vec2(1.0, 0.0)), f.x), mix(wpH(i + vec2(0.0, 1.0)), wpH(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float wpN3(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = mix(mix(wpH3(i), wpH3(i + vec3(1.0, 0.0, 0.0)), f.x), mix(wpH3(i + vec3(0.0, 1.0, 0.0)), wpH3(i + vec3(1.0, 1.0, 0.0)), f.x), f.y);
    float b = mix(mix(wpH3(i + vec3(0.0, 0.0, 1.0)), wpH3(i + vec3(1.0, 0.0, 1.0)), f.x), mix(wpH3(i + vec3(0.0, 1.0, 1.0)), wpH3(i + vec3(1.0, 1.0, 1.0)), f.x), f.y);
    return mix(a, b, f.z);
  }
  float wpFbm3(vec3 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { s += a * wpN3(p); p *= 2.03; a *= 0.5; } return s; }
  float wpFront() {
    float sy = 1.0 - gl_FragCoord.y / uWashRes.y;
    float cols = floor(gl_FragCoord.x / (uWashPx * 7.0));
    float st = wpH(vec2(cols, 4.0));
    float st2 = wpN(vec2(gl_FragCoord.x / (uWashPx * 38.0), gl_FragCoord.y / (uWashPx * 170.0) + cols * 0.31));
    return uWashRun * 1.95 - sy - st * 0.45 - st2 * 0.25;
  }
  vec3 wpRun(vec3 col, vec3 stain) {
    if (uWashRun <= 0.0) return col;
    float front = wpFront();
    float pool = smoothstep(-0.07, 0.0, front) * (1.0 - smoothstep(0.0, 0.07, front));
    col *= 1.0 - 0.2 * pool;
    return mix(col, mix(vec3(0.965, 0.929, 0.863), stain, 0.1), smoothstep(0.0, 0.2, front));
  }
  float wpGrain() {
    vec2 p = gl_FragCoord.xy / max(uWashPx, 1.0);
    return wpN(p * 0.42) * 0.55 + wpH(floor(p)) * 0.45;
  }
  vec3 wpPrint(vec3 base, vec3 n, vec3 v, vec3 p) {
    vec3 N = faceforward(n, -v, n);
    float ndv = max(dot(N, v), 0.0);
    float blot = wpFbm3(p * vec3(0.22, 0.3, 0.22) + 7.0);
    float wet = dot(N, uWashSun) * 0.5 + 0.5 + (blot - 0.5) * 0.4;
    vec3 col = mix(base * vec3(0.86, 0.84, 0.92), base, smoothstep(0.32, 0.7, wet));
    float e = pow(max(1.0 - ndv, 0.0), 2.4);
    col = mix(col, col * col * 1.2, 0.4 * 0.55 * e);
    col *= 1.0 - 0.4 * 0.45 * e;
    col += vec3(1.0, 0.74, 0.5) * pow(max(1.0 - ndv, 0.0), 3.0) * max(dot(N, uWashSun), 0.0) * 0.5;
    float pg = wpGrain();
    col *= 0.93 + 0.12 * pg;
    col -= (0.5 - pg) * 0.05 * (1.0 - dot(col, vec3(0.33)));
    col = wpRun(col, base);
    col = mix(vec3(dot(col, vec3(0.299, 0.587, 0.114))), col, 1.75);
    return clamp((col - 0.5) * 1.12 + 0.5, 0.0, 1.0);
  }`;

const MAIN = /void\s+main\s*\(\s*\)/;

// Wraps a rig material once: its main() becomes wpMain(), then the print takes its rgb (alpha is the object id and stays).
export function printWash(material, uniforms = WASH_U) {
  const f = material.fragmentShader;
  const n = f.includes("varying vec3 vWN") ? "vWN" : f.includes("varying vec3 vN") ? "vN" : null;
  if (!n || !f.includes("varying vec3 vWP") || f.split(MAIN).length !== 2) return;
  material.fragmentShader = f.replace(MAIN, "void wpMain()") + `
  ${TONE}
  ${WASH}
  void main() {
    wpMain();
    if (gl_FragColor.a > 0.75) {
      vec3 c = pow(max(gl_FragColor.rgb, vec3(0.0)), vec3(1.0 / 2.2));
      gl_FragColor.rgb = siteTone(pow(wpPrint(c, normalize(${n}), normalize(cameraPosition - vWP), vWP), vec3(2.2)));
    }
  }`;
  Object.assign(material.uniforms, uniforms);
  material.needsUpdate = true;
}
