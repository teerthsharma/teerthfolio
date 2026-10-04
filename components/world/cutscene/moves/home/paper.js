// THE NORDIC WATERCOLOUR DIMENSION's shared look. Every surface in the fjord
// is a ShaderMaterial built here: soft wet-edge washes on cold-pressed paper.
// Light is two glazes (a pale lit wash and a cool shadow glaze) whose border
// wobbles with pigment blooms; the brightest faces are left as bare paper;
// pigment pools darker at every silhouette edge (view angle); the paper's
// grain is read from gl_FragCoord, so it sits still on the screen while the
// world moves under it; distance only waters the colour down towards the
// dawn haze. No ink, no halftone, no hatching, no post pass: when the rain
// comes, the SAME shaders lift their pigment off in dripping columns
// (uRun, 0..1) down to the bare paper. Picks are sRGB, written as they read.

import { BufferAttribute, DoubleSide, ShaderMaterial, Vector2, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
export const col3 = (h) => new Vector3(...rgb(h));

// shared by every material of the scene: one object each, so a write is seen by all
export const U = {
  uTime: { value: 0 },
  uRun: { value: 0 }, // the rain has run the wash off the paper: 0 painted, 1 bare
  uRes: { value: new Vector2(1, 1) },
  uPx: { value: 1 },
  uSun: { value: new Vector3(0.3, 0.2, -0.93).normalize() }, // toward the low dawn sun, over the fjord mouth
  uPaper: { value: col3("#f6eddc") },
  uHaze: { value: col3("#ffb98a") },
};

export const NOISE = /* glsl */ `
  float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float h31(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
  }
  float vnoise3(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = mix(mix(h31(i), h31(i + vec3(1, 0, 0)), f.x), mix(h31(i + vec3(0, 1, 0)), h31(i + vec3(1, 1, 0)), f.x), f.y);
    float b = mix(mix(h31(i + vec3(0, 0, 1)), h31(i + vec3(1, 0, 1)), f.x), mix(h31(i + vec3(0, 1, 1)), h31(i + vec3(1, 1, 1)), f.x), f.y);
    return mix(a, b, f.z);
  }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }
  float fbm3(vec3 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { s += a * vnoise3(p); p *= 2.03; a *= 0.5; } return s; }`;

// THE DAWN SKY (sRGB): peach on the horizon to lilac overhead, laid in wet with
// blooms, a loaded-brush band or two, a few clouds whose undersides pool lilac,
// and the low sun as a paper-white disc with a darker wet edge.
export const SKY = /* glsl */ `
  vec3 skyCol(vec3 d, float t) {
    float h = clamp(d.y, -0.3, 1.0);
    vec3 hor = vec3(1.0, 0.77, 0.42);
    vec3 mid = vec3(0.70, 0.66, 0.70);
    vec3 top = vec3(0.23, 0.44, 0.85);
    vec3 c = mix(hor, mid, smoothstep(0.0, 0.2, h));
    c = mix(c, top, smoothstep(0.16, 0.8, h));
    float az = atan(d.x, -d.z);
    float w = fbm(vec2(az * 2.4 + t * 0.006, h * 5.0));
    c *= 0.94 + 0.12 * w;
    float band = fbm(vec2(az * 0.8, h * 34.0 + w * 2.5));
    c = mix(c, c * vec3(0.95, 0.92, 1.03), smoothstep(0.55, 0.78, band) * 0.4);
    // clouds: a bloom of paper on top, a pooled lilac belly
    float env = smoothstep(0.03, 0.2, h) * (1.0 - smoothstep(0.5, 0.9, h));
    float body = smoothstep(0.50, 0.58, fbm(vec2(az * 3.2 + t * 0.01, h * 9.0 - 0.8)) * env);
    float belly = smoothstep(0.50, 0.58, fbm(vec2(az * 3.2 + t * 0.01, h * 9.0 - 0.73)) * env);
    c = mix(c, vec3(1.0, 0.93, 0.86), body * 0.55);
    c = mix(c, c * vec3(0.8, 0.76, 0.95), clamp(body - belly * 0.6, 0.0, 1.0) * 0.25);
    float s = dot(d, uSun);
    c += vec3(1.0, 0.72, 0.45) * exp(-(1.0 - s) * 38.0) * 0.5;
    c += vec3(1.0, 0.85, 0.7) * exp(-(1.0 - s) * 7.0) * 0.12;
    float ring = smoothstep(0.99835, 0.9985, s) - smoothstep(0.9987, 0.99885, s);
    c = mix(c, vec3(0.95, 0.62, 0.38), ring * 0.7);
    c = mix(c, vec3(1.0, 0.975, 0.92), smoothstep(0.9985, 0.99875, s));
    return c;
  }`;

// the paper's own grain, in screen pixels
export const GRAIN = /* glsl */ `
  float paperGrain() {
    vec2 p = gl_FragCoord.xy / max(uPx, 1.0);
    return vnoise(p * 0.42) * 0.55 + h21(floor(p)) * 0.45;
  }`;

// the rain running the wash off, in columns down the paper, until it is bare
export const RUN = /* glsl */ `
  vec3 runWash(vec3 col, vec3 stain) {
    if (uRun <= 0.0) return col;
    float sy = 1.0 - gl_FragCoord.y / uRes.y;
    float cols = floor(gl_FragCoord.x / (uPx * 7.0));
    float st = h21(vec2(cols, 4.0));
    float st2 = vnoise(vec2(gl_FragCoord.x / (uPx * 38.0), gl_FragCoord.y / (uPx * 170.0) + cols * 0.31));
    float front = uRun * 1.95 - sy - st * 0.45 - st2 * 0.25;
    float lifted = smoothstep(0.0, 0.2, front);
    float pool = smoothstep(-0.07, 0.0, front) * (1.0 - smoothstep(0.0, 0.07, front));
    col *= 1.0 - 0.2 * pool;
    return mix(col, mix(uPaper, stain, 0.1), lifted);
  }`;

const HEAD = /* glsl */ `
  uniform float uTime, uRun, uPx;
  uniform vec2 uRes;
  uniform vec3 uPaper, uHaze;
`;

const glslType = (v) => (typeof v === "number" ? "float" : v.isVector3 ? "vec3" : "vec2");

// THE WASH MATERIAL. Options:
//   albedo   GLSL body returning vec3 sRGB, given vec3 W (world position), vec3 N (normal), vec3 vc (vertex colour)
//   alpha    GLSL expression for a translucent wash (N, V, W in scope)
//   vtx      GLSL body that may change vec3 p (local position) before the transform
//   paper    how much of the brightest light is left as bare paper (0..1)
//   edge     how hard the pigment pools at the silhouette (0..1)
//   rim      the warm dawn light on edges facing the sun
//   haze     the distance wash, per metre
//   flat     facet normals (rocks, hulls): the shape reads in washes, never in lines
export function wash({ albedo = "return vc;", alpha = null, vtx = "", paper = 0.7, edge = 0.34, rim = 0.35, haze = 0.0042, flat = false, vertexColors = true, side, transparent = false, extra = "", uniforms = {}, attributes = "", depthWrite }) {
  const decl = Object.keys(uniforms)
    .map((k) => `uniform ${glslType(uniforms[k].value)} ${k};`)
    .join("\n");
  return new ShaderMaterial({
    uniforms: { uSun: U.uSun, uTime: U.uTime, uRun: U.uRun, uRes: U.uRes, uPx: U.uPx, uPaper: U.uPaper, uHaze: U.uHaze, ...uniforms },
    vertexColors,
    transparent,
    ...(depthWrite === undefined ? {} : { depthWrite }),
    side: side ?? DoubleSide,
    defines: flat ? { FLAT: 1 } : {},
    vertexShader: /* glsl */ `
      uniform float uTime;
      ${decl}
      ${attributes}
      varying vec3 vW;
      varying vec3 vN;
      varying vec3 vC;
      varying vec2 vUv;
      void main() {
        vec3 p = position;
        vec3 nn = normal;
        ${vtx}
        vC = vec3(1.0);
        #ifdef USE_COLOR
          vC = color.rgb;
        #endif
        #ifdef USE_INSTANCING_COLOR
          vC *= instanceColor;
        #endif
        vUv = uv;
        vec4 wp = vec4(p, 1.0);
        #ifdef USE_INSTANCING
          wp = instanceMatrix * wp;
          nn = mat3(instanceMatrix) * nn;
        #endif
        wp = modelMatrix * wp;
        vW = wp.xyz;
        vN = normalize(mat3(modelMatrix) * nn);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      ${HEAD}
      ${decl}
      uniform vec3 uSun;
      varying vec3 vW;
      varying vec3 vN;
      varying vec3 vC;
      varying vec2 vUv;
      ${NOISE}
      ${GRAIN}
      ${RUN}
      ${extra}
      vec3 albedo(vec3 W, vec3 N, vec3 vc) { ${albedo} }
      void main() {
        vec3 V = normalize(cameraPosition - vW);
        vec3 N = normalize(vN);
        #ifdef FLAT
          N = normalize(cross(dFdx(vW), dFdy(vW)));
        #endif
        N = faceforward(N, -V, N);
        vec3 base = albedo(vW, N, vC);
        float ndl = dot(N, uSun) * 0.5 + 0.5;
        float blot = fbm3(vW * vec3(0.22, 0.3, 0.22) + 7.0);
        float wet = ndl + (blot - 0.5) * 0.4;
        float lit = smoothstep(0.32, 0.7, wet);
        vec3 col = mix(base * vec3(0.64, 0.68, 0.9), base, lit);
        col *= 1.0 - 0.16 * smoothstep(0.34, 0.0, wet);
        col = mix(col, uPaper, smoothstep(0.76, 1.0, wet + (blot - 0.5) * 0.18) * ${paper.toFixed(3)});
        float ndv = max(dot(N, V), 0.0);
        float e = pow(1.0 - ndv, 2.4);
        col = mix(col, col * col * 1.2, ${edge.toFixed(3)} * 0.55 * e);
        col *= 1.0 - ${edge.toFixed(3)} * 0.45 * e;
        col += vec3(1.0, 0.74, 0.5) * pow(1.0 - ndv, 3.0) * max(dot(N, uSun), 0.0) * ${rim.toFixed(3)};
        float pg = paperGrain();
        col *= 0.93 + 0.12 * pg;
        col -= (0.5 - pg) * 0.05 * (1.0 - dot(col, vec3(0.33)));
        float dist = distance(vW, cameraPosition);
        float hz = 1.0 - exp(-dist * ${haze.toFixed(5)});
        col = mix(col, uHaze, hz * 0.78);
        col = runWash(col, base);
        // the dopamine pass: saturated pigment, deeper shadow, never past the paper
        float lum = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(vec3(lum), col, 1.75);
        col = clamp((col - 0.5) * 1.12 + 0.5, 0.0, 1.0);
        float a = 1.0;
        ${alpha ? `a = (${alpha});` : ""}
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), a);
      }`,
  });
}

// build helpers ---------------------------------------------------------------

const tri = (i, seed) => 1 + (((Math.sin((i + seed * 17) * 12.9898) * 43758.5453) % 1) - 0.5);
// paint a geometry one colour (sRGB hex) with a little pigment jitter per facet, ready to merge
export function paint(g, hex, jitter = 0.06, seed = 1) {
  const n = g.index ? g.toNonIndexed() : g.clone();
  n.deleteAttribute("uv");
  if (!n.attributes.normal) n.computeVertexNormals();
  const [r, gg, b] = rgb(hex);
  const count = n.attributes.position.count;
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 3) {
    const j = 1 + (tri(i, seed) - 1) * 2 * jitter;
    for (let k = 0; k < 3; k++) {
      arr[(i + k) * 3] = Math.min(1, r * j);
      arr[(i + k) * 3 + 1] = Math.min(1, gg * j);
      arr[(i + k) * 3 + 2] = Math.min(1, b * j);
    }
  }
  n.setAttribute("color", new BufferAttribute(arr, 3));
  return n;
}
export function merge(list) {
  const out = mergeGeometries(list, false);
  for (const g of list) g.dispose();
  return out;
}
