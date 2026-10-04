// ITOMORI AT KATAWARE-DOKI, the shared GLSL and uniforms (Shinkai light: a hyper-luminous painted sky,
// glowing cloud edges, lens glare, deep blue to amber twilight). Every material of the scene shares ONE
// uniform set, so a frame is a handful of writes. Frame: shaders take positions in the rig's local frame
// (the pup at the origin, the lens out along +z) and directions in the world (the rig turns about the pup).

import { Vector3 } from "three";

export const hash = (i, k = 0) => (((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1) + 1) % 1;
export const ss = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const lerp = (a, b, t) => a + (b - a) * t;
// sRGB hex to a GLSL vec3 literal (these shaders pick in sRGB and write pow 2.2, like the stage's)
export const g3 = (h) => `vec3(${[1, 3, 5].map((i) => (parseInt(h.slice(i, i + 2), 16) / 255).toFixed(3)).join(",")})`;

// the one uniform set (objects shared by reference across every material)
export function sharedUniforms() {
  return {
    uTime: { value: 0 },
    uTw: { value: 0 }, // 0 the golden twilight .. 1 it is over
    uDis: { value: 0 }, // 0 the dimension whole .. 1 gone (the island shows through)
    uSun: { value: new Vector3(0.17, 0.02, -0.98).normalize() },
    uFlare: { value: 0 }, // the comet's light on the sky
    uComet: { value: new Vector3(0.1, 0.3, -0.9).normalize() },
    uKeep: { value: 0 }, // the pup's twilight look gives way to its own colour (0 twilight .. 1 its own)
  };
}

export const NOISE = /* glsl */ `
  float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }
  float fbm3(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { s += a * vnoise(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }`;

// THE SKY: a function of the view direction. Deep ultramarine overhead through violet and magenta to coral
// and gold at the sun; towering clouds whose edges toward the sun glow; thin cirrus; first stars; the sun's
// glare. uTw drains it to the night blue when kataware-doki is over.
export const SKY = /* glsl */ `
  uniform vec3 uSun, uComet;
  uniform float uTime, uTw, uFlare;
  vec3 ramp5(float h, vec3 a, vec3 b, vec3 c, vec3 d, vec3 e) {
    vec3 col = mix(a, b, smoothstep(0.0, 0.07, h));
    col = mix(col, c, smoothstep(0.05, 0.22, h));
    col = mix(col, d, smoothstep(0.18, 0.5, h));
    return mix(col, e, smoothstep(0.4, 1.0, h));
  }
  vec3 skyBase(vec3 v, float warm) {
    float h = max(v.y, 0.0);
    vec3 horiz = mix(${g3("#ff7a59")}, ${g3("#ffd890")}, pow(warm, 1.6));
    vec3 low = mix(${g3("#c8449e")}, ${g3("#ff7f6a")}, warm * 0.85);
    vec3 mid = mix(${g3("#6a46c8")}, ${g3("#a458c0")}, warm * 0.6);
    vec3 high = ${g3("#2a3fb4")};
    vec3 zen = ${g3("#3b1f8f")};
    vec3 day = ramp5(h, horiz, low, mid, high, zen);
    vec3 nHoriz = mix(${g3("#2a3a8a")}, ${g3("#4a4a9a")}, warm * 0.5);
    vec3 night = ramp5(h, nHoriz, ${g3("#1e2c78")}, ${g3("#141e5c")}, ${g3("#0c1448")}, ${g3("#050930")});
    return mix(day, night, smoothstep(0.0, 1.0, uTw));
  }
  float hash3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  vec3 sky(vec3 v) {
    vec3 sd = uSun;
    float warm = clamp(dot(normalize(vec3(v.x, 0.0, v.z) + 1e-4), normalize(vec3(sd.x, 0.0, sd.z))) * 0.5 + 0.5, 0.0, 1.0);
    warm = warm * warm;
    vec3 col = skyBase(v, warm);
    float tw = 1.0 - uTw;
    // towering clouds on a flattened dome, lit along their sun-facing edges
    vec2 cuv = v.xz / (max(v.y, 0.0) + 0.2) * 0.85;
    vec2 wind = vec2(uTime * 0.01, uTime * 0.004);
    vec2 toSun = normalize(vec2(sd.x, sd.z) + 1e-4);
    float d = fbm(cuv * 1.25 + wind);
    float d2 = fbm(cuv * 1.25 + wind + toSun * 0.07);
    float body = smoothstep(0.5, 0.7, d) * smoothstep(0.015, 0.1, v.y);
    float edge = clamp((d - d2) * 11.0, 0.0, 1.0) * body;
    vec3 shade = mix(${g3("#3c3290")}, ${g3("#8a4ea8")}, warm);
    shade = mix(shade, ${g3("#1a2268")}, uTw);
    col = mix(col, shade + ${g3("#ff9a7a")} * 0.25 * warm * tw, body * 0.88);
    col += ${g3("#ffc08a")} * edge * (0.5 + 1.1 * warm) * tw;
    float rim = smoothstep(0.5, 0.52, d) * (1.0 - smoothstep(0.52, 0.58, d)) * smoothstep(0.015, 0.08, v.y);
    col += ${g3("#ff9ab0")} * rim * (0.2 + 0.7 * warm) * tw;
    // high cirrus, streaked
    float ci = fbm3(vec2(v.x * 3.0 / (v.y + 0.35) + uTime * 0.006, v.z * 30.0 / (v.y + 0.35)));
    col += ${g3("#f0a0d0")} * smoothstep(0.55, 0.85, ci) * smoothstep(0.1, 0.45, v.y) * 0.22 * tw;
    // first stars, brighter as the light drains
    float st = step(0.9965, hash3(floor(v * 260.0))) * smoothstep(0.2, 0.55, v.y);
    col += vec3(1.0, 0.95, 0.85) * st * (0.35 + 0.65 * uTw) * (0.6 + 0.4 * sin(uTime * 3.0 + hash3(floor(v * 260.0)) * 40.0));
    // the sun's glare: a hot core, a broad bloom, a long anamorphic streak along the horizon
    float s = max(dot(v, sd), 0.0);
    float sunK = tw * tw;
    float streak = exp(-abs(v.y - sd.y) * 38.0) * exp(-(1.0 - s) * 14.0);
    col += ${g3("#ffe0a8")} * (pow(s, 1200.0) * 2.5 + pow(s, 90.0) * 0.55 + pow(s, 10.0) * 0.28) * sunK;
    col += ${g3("#ffc890")} * streak * 0.5 * sunK;
    // the comet's light on the clouds, and its flare when a piece falls
    float cd = max(dot(v, uComet), 0.0);
    col += ${g3("#9fd8ff")} * (pow(cd, 120.0) * 0.5 + pow(cd, 14.0) * 0.1);
    col += ${g3("#ffd8b0")} * uFlare * (0.35 + 0.65 * pow(max(dot(v, normalize(vec3(sd.x - 0.25, 0.05, sd.z))), 0.0), 6.0)) * (1.0 - smoothstep(0.0, 0.7, v.y));
    return col;
  }`;

// THE LIGHT on land: a low amber key from the sun, violet-blue skylight, haze toward the sky's horizon
export const LIGHT = /* glsl */ `
  vec3 hazeAt(vec3 v) { vec3 f = normalize(vec3(v.x, 0.03, v.z)); return sky(f) * 0.9; }
  vec3 lightLand(vec3 base, vec3 n, vec3 V, float dist, float shine) {
    vec3 L = normalize(uSun + vec3(0.0, 0.12, 0.0));
    float ndl = dot(n, L);
    float tw = 1.0 - uTw;
    float key = smoothstep(-0.15, 0.75, ndl);
    vec3 amb = mix(${g3("#3a3f94")}, ${g3("#6a4a9a")}, 0.4) * (0.55 + 0.45 * n.y);
    amb = mix(amb, ${g3("#1c2468")}, uTw * 0.8);
    vec3 lit = base * (amb * 0.95 + key * ${g3("#ff9c64")} * 1.25 * tw);
    // the rim: ridges and branches that stand between the lens and the sun catch its light
    float rim = pow(1.0 - clamp(abs(dot(n, V)), 0.0, 1.0), 2.6) * smoothstep(-0.3, 0.8, dot(V, uSun));
    lit += ${g3("#ffb070")} * rim * 0.55 * tw * shine;
    lit *= 1.0 - 0.38 * uTw;
    float fogK = 1.0 - exp(-pow(dist * 0.0085, 1.15));
    return mix(lit, hazeAt(V), fogK * 0.92);
  }`;

// the dimension's end: the world thins to light and the island shows through. m 0..1.4 is how far the
// point is (near goes first); returns the luminous edge to add.
export const DISSOLVE = /* glsl */ `
  uniform float uDis;
  float dissolveEdge(float m) {
    float t = uDis * 1.55 - m;
    if (t > 0.0) discard;
    return smoothstep(-0.1, 0.0, t);
  }`;

// every mesh's vertex stage: local position, world position, world normal
export const VERT = /* glsl */ `
  varying vec3 vW;
  varying vec3 vL;
  varying vec3 vN;
  void main() {
    vec4 p = vec4(position, 1.0);
    vec3 n = normal;
    #ifdef USE_INSTANCING
      p = instanceMatrix * p;
      n = mat3(instanceMatrix) * n;
    #endif
    vL = p.xyz;
    vec4 w = modelMatrix * p;
    vW = w.xyz;
    vN = normalize(mat3(modelMatrix) * n);
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;

export const OUT = "gl_FragColor = vec4(pow(max(col, vec3(0.0)), vec3(2.2)), 1.0);";
