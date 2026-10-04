// THE JOJO ARAKI LOOK, shared by every surface of the dam dimension: flat saturated palette swaps (one
// palette uniform array drives the whole scene, so a beat re-colours the sky, the concrete, the water and the
// Stand at once), a three-step cel with diagonal ink hatching in the shade, bold hard-edged diagonal shadow
// bands cut across the screen on twos, a thick black inverted-hull outline, a colour-invert (the time-stop and
// the sky panels on the impacts) and the torn-poster wipe that carries the scene home. No post pass: all of it is
// in the materials. Colours are picked as sRGB and written pow 2.2, like the other docks' shaders.

import { BackSide, BufferAttribute, Color, DoubleSide, Euler, Matrix4, ShaderMaterial, Vector2, Vector3, Vector4 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export const sr = (h) => new Vector3(...[1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255));
export const hash = (i, k = 0) => (((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1) + 1) % 1;

// palette slots (uPal[i])
export const R = { concrete: 0, concreteDk: 1, mint: 2, coral: 3, rock: 4, ink: 5, standA: 6, standB: 7, water: 8, sky0: 9, sky1: 10, sky2: 11, cloudHi: 12, cloudLo: 13, haze: 14, cream: 15 };

const P = (o) => [o.concrete, o.concreteDk, o.mint, o.coral, o.rock, o.ink, o.standA, o.standB, o.water, ...o.sky, o.cloudHi, o.cloudLo, o.haze, o.cream].map(sr);
// every beat swaps the sky and the world: violet dusk, citrus, magenta, cyan and orange. The lime stays a band,
// never a wash.
export const PALETTES = [
  P({ concrete: "#cdbfe0", concreteDk: "#5a478a", mint: "#7ff5c8", coral: "#ff5a54", rock: "#6d4f96", ink: "#110a22", standA: "#3a52e0", standB: "#ff4fa8", water: "#6a3a9e", sky: ["#1b1246", "#b52f7c", "#ff9d4a"], cloudHi: "#e66a8a", cloudLo: "#2b1560", haze: "#d9648f", cream: "#fff1d6" }),
  P({ concrete: "#ece4bd", concreteDk: "#3f3b7c", mint: "#5ae8ff", coral: "#ff4f8f", rock: "#514c92", ink: "#10092a", standA: "#d2308f", standB: "#ffe14a", water: "#3f6fd0", sky: ["#241b5c", "#9cc23e", "#f5d94c"], cloudHi: "#c7e060", cloudLo: "#3a2a82", haze: "#d8d870", cream: "#fff6d0" }),
  P({ concrete: "#f4d3ea", concreteDk: "#7a2a86", mint: "#8ff0c8", coral: "#ffe14a", rock: "#8c3488", ink: "#14061f", standA: "#2fd0ff", standB: "#ff7a2f", water: "#d83a9a", sky: ["#3d0f5e", "#e0287f", "#ffb347"], cloudHi: "#ff7ab0", cloudLo: "#4a1070", haze: "#ff7fb0", cream: "#fff0e0" }),
  P({ concrete: "#eadfc4", concreteDk: "#2c3a78", mint: "#f6ff7a", coral: "#ff3f6f", rock: "#2b5088", ink: "#06122a", standA: "#ff8a1f", standB: "#e63f9f", water: "#1f8fd0", sky: ["#06223f", "#17b5c9", "#ffd35c"], cloudHi: "#7de0e6", cloudLo: "#0d3566", haze: "#ffe08a", cream: "#fff4d8" }),
];

// THE SHARED UNIFORMS: one object per scene, handed to every material (three keeps the references).
export function sharedUniforms() {
  return {
    uRes: { value: new Vector2(800, 600) },
    uTime: { value: 0 },
    uInvert: { value: 0 },
    uCell: { value: 7 },
    uShift: { value: 0 },
    uTear: { value: -1 },
    uTearDir: { value: new Vector2(0.8, 0.6) },
    uPanel: { value: new Vector4(0.6, 0.6, 0.0, 0) }, // the inverted sky panel: centre xy, half-width, on
    uPal: { value: PALETTES[0].map((v) => v.clone()) },
    uLight: { value: new Vector3(-0.5, 0.7, 0.55).normalize() },
    uShadow: { value: 1 },
  };
}
export function setPalette(U, i) {
  const p = PALETTES[i % PALETTES.length];
  for (let k = 0; k < p.length; k++) U.uPal.value[k].copy(p[k]);
}

export const COMMON = /* glsl */ `
  uniform vec2 uRes;
  uniform float uTime, uInvert, uCell, uShift, uTear, uShadow;
  uniform vec2 uTearDir;
  uniform vec4 uPanel;
  uniform vec3 uPal[16];
  uniform vec3 uLight;
  float h11(float x) { return fract(sin(x * 127.1) * 43758.5453); }
  float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.07; a *= 0.5; } return s; }
  vec2 scr() { return gl_FragCoord.xy / uRes; }
  // a hard diagonal shadow band across the whole frame, ragged like cut paper, moved a step every beat
  float bandShade() {
    vec2 p = scr();
    float jag = (h11(floor(gl_FragCoord.y / 18.0) + uShift * 3.0) - 0.5) * 0.03;
    float w = fract((p.x * 0.84 + p.y * 0.54 + jag) * 1.25 + uShift * 0.19);
    return (step(0.55, w) * step(w, 0.8)) * uShadow;
  }
  // diagonal ink hatching, a few px wide
  float hatch(float k) {
    float s = (gl_FragCoord.x + gl_FragCoord.y) / (uCell * 0.9);
    return step(1.0 - k, fract(s));
  }
  // the end: the picture tears off along a ragged diagonal, lower left to upper right, a cream edge on it
  void tearCut(inout vec3 c) {
    if (uTear < -0.5) return;
    vec2 p = scr();
    float q = dot(p, uTearDir) + (h11(floor(gl_FragCoord.y / 14.0) + 3.0) - 0.5) * 0.07 + (vnoise(p * 9.0) - 0.5) * 0.05;
    if (q < uTear) discard;
    if (q < uTear + 0.016) c = vec3(0.98, 0.95, 0.84);
    else if (q < uTear + 0.034) c = vec3(0.07, 0.04, 0.12);
  }
  vec3 outc(vec3 c) {
    c = mix(c, vec3(1.0) - c, uInvert);
    tearCut(c);
    return pow(max(c, vec3(0.0)), vec3(2.2));
  }
  // the colour-inverted sky panel: a jagged slanted strip that flips the colours behind it
  float panelOn() {
    if (uPanel.w < 0.01) return 0.0;
    vec2 p = scr() - uPanel.xy;
    float across = dot(p, normalize(vec2(0.62, -0.78)));
    float along = dot(p, normalize(vec2(0.78, 0.62)));
    float jag = (h11(floor(along * 26.0)) - 0.5) * 0.05;
    float len = 0.55 * uPanel.w;
    return step(abs(across + jag), uPanel.z * uPanel.w) * step(abs(along), len);
  }
`;

const SOLID_VERT = /* glsl */ `
  attribute float aRole;
  attribute vec3 aOut;
  uniform float uHull;
  varying vec3 vN;
  varying vec3 vW;
  varying float vR;
  varying vec3 vIC;
  void main() {
    mat4 M = modelMatrix;
    #ifdef USE_INSTANCING
      M = M * instanceMatrix;
    #endif
    vec4 w = M * vec4(position, 1.0);
    vN = normalize(mat3(M) * normal);
    #ifdef HULL
      float d = length(w.xyz - cameraPosition);
      w.xyz += normalize(mat3(M) * aOut) * uHull * d;
    #endif
    vW = w.xyz;
    vR = aRole;
    vIC = vec3(1.0);
    #ifdef USE_INSTANCING_COLOR
      vIC = instanceColor;
    #endif
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;

const SOLID_FRAG = /* glsl */ `
  uniform float uGlow, uHaze, uRim;
  varying vec3 vN;
  varying vec3 vW;
  varying float vR;
  varying vec3 vIC;
  ${COMMON}
  void main() {
    #ifdef HULL
      gl_FragColor = vec4(outc(uPal[5]), 1.0);
      return;
    #endif
    vec3 n = normalize(vN);
    vec3 v = normalize(cameraPosition - vW);
    vec3 base = uPal[int(vR + 0.5)];
    #ifdef USE_INSTANCING_COLOR
      base = vIC;
    #endif
    float d = dot(n, normalize(uLight)) * 0.5 + 0.5;
    float band = d < 0.4 ? 0.0 : (d < 0.7 ? 1.0 : 2.0);
    vec3 shade = mix(uPal[5], base, 0.42);
    vec3 c = band < 0.5 ? shade : (band < 1.5 ? base : mix(base, uPal[15], 0.3));
    if (band < 0.5) c = mix(c, uPal[5], hatch(0.42) * 0.85);
    else if (band < 1.5) c = mix(c, uPal[5], hatch(0.1) * 0.5 * step(d, 0.5));
    float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0);
    c = mix(c, uPal[15], step(0.55, rim) * uRim * 0.7);
    c = mix(c, base * 1.15 + 0.1, uGlow);
    if (bandShade() > 0.5) c = mix(c, uPal[5] * 0.8 + vec3(0.02, 0.0, 0.08), 0.62);
    // atmospheric haze: far layers fade to the horizon colour in flat steps
    float dist = length(vW - cameraPosition);
    float hz = floor(smoothstep(40.0, 190.0, dist) * 4.0) / 4.0 * uHaze;
    c = mix(c, uPal[14], hz * 0.85);
    gl_FragColor = vec4(outc(c), 1.0);
  }`;

// a solid, hull on/off; `glow` > 0 draws lit flat (the control edges, the lamps)
export function solidMaterial(U, { hull = false, glow = 0, haze = 1, rim = 1, side } = {}) {
  return new ShaderMaterial({
    uniforms: { ...U, uHull: { value: 0.0042 }, uGlow: { value: glow }, uHaze: { value: haze }, uRim: { value: rim } },
    defines: hull ? { HULL: "" } : {},
    side: hull ? BackSide : side ?? 0,
    vertexShader: SOLID_VERT,
    fragmentShader: SOLID_FRAG,
  });
}

// ---- geometry helpers: parts with a role (a palette slot) and an outward direction for the outline hull ----
const M4 = new Matrix4();
export function part(g, role, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1 } = {}) {
  const n = g.index ? g.toNonIndexed() : g.clone();
  n.deleteAttribute("uv");
  M4.makeRotationFromEuler(new Euler(rx, ry, rz));
  M4.scale(new Vector3(sx, sy, sz));
  M4.setPosition(x, y, z);
  n.applyMatrix4(M4);
  if (!n.attributes.normal) n.computeVertexNormals();
  const p = n.attributes.position;
  n.computeBoundingBox();
  const c = n.boundingBox.getCenter(new Vector3());
  const out = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const dx = p.getX(i) - c.x;
    const dy = p.getY(i) - c.y;
    const dz = p.getZ(i) - c.z;
    const l = Math.hypot(dx, dy, dz) || 1;
    out[i * 3] = dx / l;
    out[i * 3 + 1] = dy / l;
    out[i * 3 + 2] = dz / l;
  }
  n.setAttribute("aOut", new BufferAttribute(out, 3));
  n.setAttribute("aRole", new BufferAttribute(new Float32Array(p.count).fill(role), 1));
  return n;
}
export const merge = (parts) => mergeGeometries(parts);

export { BackSide, Color, DoubleSide, ShaderMaterial };
