// SHARED GLSL for the dam world (Araki's dimension). Every shader here is flat colour + hard edges; the maths:
//
//  noise       hash(p) = fract(sin(dot(p, (127.1, 311.7))) * 43758.5453);  vnoise = bilinear of hashes with smoothstep weights;
//              fbm = sum_{k<4} 2^-k vnoise(2^k p)
//  bullseye    th = acos(d . bull) (angle from the ring centre); rr = th / 6deg; ring i = floor(rr) takes palette colour
//              uP[i mod 5] for i < 8, the outer field beyond. Edges are hard, anti-aliased by w = fwidth(rr):
//              col = mix(colour(i-1), colour(i), smoothstep(0, w, fract(rr))).
//  storm       q = (az*2.6 + el*3.4, el*8 - az*1.2) (a sheared plane, so every cloud leans the same way); n = fbm(q);
//              cloud = step(0.58, n) (AA by fwidth), its colour = ring*0.42 + shadow tint*0.38, an ink line at the iso 0.58.
//  diag cut    s = dot((az, el), (0.83, -0.56))*3 + shift; shadowed where fract(s) > 0.66: bold diagonal shadow shapes across
//              the whole frame; the edge distance d = min(fract(s)-0.66, 1-fract(s)), cut = clamp(d / fwidth(s) + 0.5, 0, 1).
export const NOISE = /* glsl */ `
  float awHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float awVn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(awHash(i), awHash(i + vec2(1.0, 0.0)), f.x), mix(awHash(i + vec2(0.0, 1.0)), awHash(i + vec2(1.0, 1.0)), f.x), f.y); }
  float awFbm(vec2 p) { float a = 0.5, s = 0.0; for (int k = 0; k < 4; k++) { s += a * awVn(p); p *= 2.03; a *= 0.5; } return s; }
`;

export const PAL_UNIFORMS = /* glsl */ `
  uniform vec3 uP[5]; uniform vec3 uField; uniform vec3 uLightC; uniform vec3 uShadeC; uniform vec3 uHaze;
  uniform vec3 uWater0; uniform vec3 uWater1; uniform vec3 uBull; uniform float uRingW; uniform float uShift; uniform vec3 uKey;
  uniform vec2 uRes;
`;

export const SKY = /* glsl */ `
  const vec3 AW_INK = vec3(0.0015, 0.0006, 0.003);
  const vec3 AW_LUMA = vec3(0.2126, 0.7152, 0.0722);
  vec3 awRingCol(int i) { return i >= 8 ? uField : uP[i - (i / 5) * 5]; }
  vec3 awRing(float rr) {
    float f = fract(rr), w = clamp(fwidth(rr), 1e-4, 0.5);
    int i = int(floor(rr));
    return mix(awRingCol(max(i - 1, 0)), awRingCol(i), smoothstep(0.0, w * 1.2, f));
  }
  vec3 awSky(vec3 d) {
    float th = acos(clamp(dot(d, uBull), -1.0, 1.0));
    vec3 c = awRing(th / uRingW);
    float az = atan(d.x, -d.z), el = asin(clamp(d.y, -1.0, 1.0));
    // the storm: hard sheared clouds with an ink edge
    float n = awFbm(vec2(az * 2.6 + el * 3.4, el * 8.0 - az * 1.2));
    float aa = fwidth(n) + 1e-4;
    float cl = smoothstep(0.58 - aa, 0.58 + aa, n) * smoothstep(-0.02, 0.05, el);
    c = mix(c, c * 0.42 + uShadeC * 0.38, cl * 0.85);
    float edge = (1.0 - smoothstep(0.0, aa * 2.2 + 0.004, abs(n - 0.58))) * step(0.0, el);
    c = mix(c, AW_INK, edge * 0.85);
    // the lit lip of the cloud: a second, higher iso in a light tint
    float lip = (1.0 - smoothstep(0.0, aa * 1.6 + 0.003, abs(n - 0.67))) * step(0.04, el);
    c = mix(c, uLightC, lip * 0.55);
    // the bold diagonal shadow band across the frame
    float s = dot(vec2(az, el), vec2(0.83, -0.56)) * 3.0 + uShift, fs = fract(s), w = fwidth(s) + 1e-5;
    float cut = clamp(min(fs - 0.66, 1.0 - fs) / w + 0.5, 0.0, 1.0);
    c = mix(c, c * 0.6 + uShadeC * 0.22, cut * 0.45);
    // the flat horizon haze band, and the ground colour under the horizon
    c = mix(c, uHaze, 0.7 * (1.0 - smoothstep(0.03, 0.03 + fwidth(el) + 1e-4, el)));
    c = mix(c, uField * 0.55 + uP[1] * 0.15, step(el, -0.012));
    return min(c, vec3(0.95));
  }
`;

// the vertex trick of paint.js bakedDome: a sphere at infinity, depth at the far plane
export const DOME_V = /* glsl */ `varying vec3 vD; void main() { vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = vec4(p.xy, p.w * 0.99999, p.w); }`;
