// THE PAINTER'S GLSL: what a background artist does by hand, as functions. Needs the "noise" tool (h21 vn fbm vor rot ramp3 ramp4).
//   bgN3 / bgF3      3D value noise and fbm (surfaces are textured in world space, so a seam never shows)
//   bgTone(v,n,s)    posterise a 0..1 value into n painted tones with soft edges of width s
//   bgBrush(p,a,l)   bristle noise stretched along an angle: the grain of a dry brush
//   bgRamp5          five-stop colour ramp (shadow, low, mid, high, hot)
// And the one lighting frame every kit material shares (BG_FRAME): cel bands with a cool authored shadow, a coloured rim from behind,
// pools of light (up to 4) that fall off across the surface, a darker base with grime, and aerial haze that pales with distance and height.
export const PAINT = /* glsl */ `
  float bgH3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float bgN3(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(bgH3(i), bgH3(i + vec3(1, 0, 0)), f.x), mix(bgH3(i + vec3(0, 1, 0)), bgH3(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(bgH3(i + vec3(0, 0, 1)), bgH3(i + vec3(1, 0, 1)), f.x), mix(bgH3(i + vec3(0, 1, 1)), bgH3(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
  float bgF3(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * bgN3(p); p = p * 2.03 + 17.1; a *= 0.5; } return s / 0.96875; }
  float bgTone(float v, float n, float s) { float x = clamp(v, 0.0, 1.0) * n, i = floor(x), f = fract(x); return (i + smoothstep(0.5 - s, 0.5 + s, f)) / n; }
  float bgBrush(vec2 p, float a, float len) { vec2 q = rot(a) * p; return vn(vec2(q.x / len, q.y * 7.0)) * 0.6 + vn(vec2(q.x / len * 2.3, q.y * 17.0 + 3.0)) * 0.4; }
  vec3 bgRamp5(float t, vec3 a, vec3 b, vec3 c, vec3 d, vec3 e) { t = clamp(t, 0.0, 1.0) * 4.0;
    return t < 1.0 ? mix(a, b, t) : t < 2.0 ? mix(b, c, t - 1.0) : t < 3.0 ? mix(c, d, t - 2.0) : mix(d, e, t - 3.0); }
  float bgLuma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
  float bgBox(vec2 p, vec2 lo, vec2 hi) { vec2 s = step(lo, p) * step(p, hi); return s.x * s.y; }
`;

// the shared lighting frame. A material supplies  void bgSurf(vec3 P, vec3 N, vec3 V, out vec3 alb, out vec3 emit, out float ao, out float wet)
// alb albedo (linear), emit emissive added after lighting (above 1 blooms), ao multiplies the lit and the shade, wet 0..1 mirrors the pools.
export const BG_UNIFORMS = /* glsl */ `
  uniform vec3 uLightDir; uniform vec3 uLightCol; uniform float uTime; uniform float uId;
  uniform vec3 uShadeCol; uniform vec4 uBands;
  uniform vec4 uBase; uniform vec4 uHaze; uniform vec4 uHaze2;
  uniform vec3 uRimDir; uniform vec3 uRimCol; uniform vec4 uRim;
  uniform vec4 uPool[4]; uniform vec3 uPoolCol[4];
  uniform vec3 uAmb; uniform vec4 uFocus;
`;

export const BG_FRAME = /* glsl */ `
  float gFw = 0.0;
  float bgLod(float f) { return 1.0 - smoothstep(0.25, 0.8, gFw * f); }
  vec3 bgFinish(vec3 alb, vec3 emit, float ao, float wet, vec3 P, vec3 N, vec3 V) {
    vec3 L = normalize(uLightDir);
    float h = 0.5 * dot(N, L) + 0.5;
    float tone = bgTone(h, uBands.x, uBands.y);
    ao = clamp(ao, 0.0, 1.0);
    // the authored shadow: a cool, saturated darker colour, never albedo times a grey
    vec3 sh = alb * uShadeCol * (0.55 + 0.45 * uAmb.x);
    vec3 lit = alb * uLightCol;
    vec3 col = mix(sh, lit, tone) * ao;
    // sky bounce into the up-facing planes, ground bounce into the down-facing ones
    col += alb * uAmb * (0.5 + 0.5 * N.y) * 0.25 * ao;
    // rim from behind: a coloured edge light where the normal turns away from the lens
    float nv = 1.0 - clamp(dot(N, V), 0.0, 1.0);
    float rim = smoothstep(uRim.x, uRim.y, nv) * smoothstep(0.0, 0.45, dot(N, normalize(uRimDir))) * mix(1.0, 0.12, smoothstep(0.55, 0.9, abs(N.y)));
    col += uRimCol * rim * uRim.z * (0.4 + 0.6 * ao) * alb * 2.2;
    // pools of light: falloff across the surface, banded a little so it reads as paint, and wet surfaces mirror it
    for (int i = 0; i < 4; i++) {
      float R = uPool[i].w; if (R <= 0.0) continue;
      vec3 d = uPool[i].xyz - P; float r = length(d);
      float f = 1.0 / (1.0 + (r * r) / (R * R)); f = f * f;
      f = mix(f, bgTone(f, 5.0, 0.18), 0.55);
      float facing = clamp(dot(N, d / max(r, 1e-3)), 0.0, 1.0) * 0.6 + 0.4;
      col += uPoolCol[i] * f * facing * (alb * 1.4 + 0.04 * wet);
      col += uPoolCol[i] * pow(f, 1.6) * wet * 0.45 * (0.5 + 0.5 * bgN3(vec3(P.x * 2.2, P.y * 40.0, P.z * 2.2)));
    }
    // the foot of everything is darker and dirtier; grime streaks run down
    float grime = bgF3(vec3(P.x * 0.55, P.y * 0.12, P.z * 0.55) + uBase.w);
    float foot = 1.0 - uBase.x * (1.0 - smoothstep(0.0, uBase.y, P.y)) * (0.65 + 0.7 * grime);
    col *= mix(1.0, foot, 1.0);
    col *= 1.0 - uBase.z * smoothstep(0.55, 0.9, bgN3(vec3(P.x * 1.7, P.y * 0.18, P.z * 1.7) + uBase.w * 3.0));
    col += emit;
    if (uFocus.w > 0.0) { vec2 sc = (gl_FragCoord.xy / uRes - uFocus.xy) * vec2(uRes.x / uRes.y, 1.0); col *= 1.0 - uFocus.w * smoothstep(uFocus.z, uFocus.z + 0.55, length(sc)); }
    // aerial perspective: pale toward the haze colour with distance, pooled low
    float dist = length(P - cameraPosition);
    float hz = 1.0 - exp(-uHaze.w * max(dist - uHaze2.x, 0.0));
    hz *= mix(1.0, exp(-max(P.y - uHaze2.w, 0.0) / max(uHaze2.y, 1.0)), step(0.0, uHaze2.y - 0.0));
    col = mix(col, uHaze.rgb, clamp(hz * uHaze2.z, 0.0, 1.0));
    return col;
  }
`;
