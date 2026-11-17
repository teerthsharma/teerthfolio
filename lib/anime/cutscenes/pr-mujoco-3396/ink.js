// The live look's shared inks: the deployed charcoal.js of the live site (460bafd), one copy for every lane of this cutscene.
import { Vector2, Vector3 } from "three";

export const U = {
  uPx: { value: 1 }, uTime: { value: 0 }, uRes: { value: new Vector2(1280, 720) }, uBurn: { value: -1 },
  uBurnC: { value: new Vector2() }, uSun: { value: new Vector3(0.22, 0.16, -0.96).normalize() },
};

export const INK = /* glsl */ `
  uniform float uPx, uTime, uBurn;
  uniform vec2 uRes, uBurnC;
  uniform vec3 uSun;
  float iHash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  float iNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(iHash(i), iHash(i + vec2(1, 0)), f.x), mix(iHash(i + vec2(0, 1)), iHash(i + vec2(1, 1)), f.x), f.y);
  }
  // one family of strokes at angle a, sp px apart, half-width w (0..1 of the gap), broken along their length
  float strokes(vec2 q, float a, float sp, float w) {
    vec2 d = vec2(cos(a), sin(a));
    float along = dot(q, d);
    float u = dot(q, vec2(-d.y, d.x)) / sp;
    float row = floor(u);
    float wob = iNoise(vec2(along * 0.035, row * 1.7)) - 0.5;
    float f = abs(fract(u + wob * 0.35) - 0.5) * 2.0;
    float press = 0.55 + 0.45 * iNoise(vec2(along * 0.06, row * 3.1));
    float line = 1.0 - smoothstep(w * press, w * press + 0.22, f);
    return line * step(0.2, iNoise(vec2(along * 0.045, row * 5.3 + 7.0)));
  }
  float tooth() {
    vec2 q = gl_FragCoord.xy / uPx;
    return iNoise(q * 0.85) * 0.55 + iNoise(q * 0.21) * 0.45;
  }
  // tone 0 black .. 1 paper: how much graphite lands here
  float graphite(float tone) {
    vec2 q = gl_FragCoord.xy / uPx;
    float ink = strokes(q, 0.95, 8.0, 0.18) * (1.0 - smoothstep(0.34, 0.56, tone));
    ink = max(ink, strokes(q, -0.7, 8.0, 0.2) * (1.0 - smoothstep(0.16, 0.3, tone)));
    ink = max(ink, strokes(q, 0.12, 6.0, 0.3) * (1.0 - smoothstep(0.04, 0.14, tone)));
    float smudge = pow(1.0 - clamp(tone, 0.0, 1.0), 2.0) * 0.4;
    return clamp(max(ink * 0.82, smudge), 0.0, 1.0);
  }
  // craquelure: the cracked network of old oil paint, thin dark veins on the cell edges of a jittered grid
  float craquelure(vec2 q) {
    vec2 p = q / 46.0;
    vec2 i = floor(p), f = fract(p);
    float d1 = 9.0, d2 = 9.0;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = vec2(iHash(i + g), iHash(i + g + 17.0));
      float d = length(g + o - f);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
    }
    return 1.0 - smoothstep(0.0, 0.05, d2 - d1);
  }
  // THE PAINTED GROUND: warm umber canvas, a gold-leaf or vermilion wash, lapis and vermilion kept colours; chiaroscuro
  // (deep umber shadows, a lit crown), brush strokes, a canvas weave, craquelure, and god-light pouring from above
  vec3 drawn(float tone, float wash, vec3 keep, float keepK) {
    vec2 q = gl_FragCoord.xy / uPx;
    float t = tooth();
    vec3 gold = vec3(0.9, 0.66, 0.2);
    vec3 vermilion = vec3(0.84, 0.27, 0.12);
    vec3 base = vec3(0.6, 0.4, 0.22) * (0.9 + 0.2 * t);
    base = mix(base, mix(gold, vermilion, smoothstep(0.3, 0.75, wash)), clamp(wash * 1.2, 0.0, 1.0));
    base = mix(base, keep * (0.8 + 0.3 * clamp(tone, 0.0, 1.0)), keepK);
    float lit = pow(clamp(tone, 0.0, 1.0), 1.35); // chiaroscuro: the shadows go deep
    vec3 c = base * mix(0.1, 1.18, lit);
    c = mix(c, vec3(0.05, 0.03, 0.02), (1.0 - smoothstep(0.0, 0.3, tone)) * 0.45);
    float brush = strokes(q, 0.6, 13.0, 0.55) * 0.11 + (iNoise(q * 0.3) - 0.5) * 0.12;
    float weave = (sin(q.x * 1.9) * sin(q.y * 1.9)) * 0.03;
    c *= 1.0 + brush + weave;
    c *= 1.0 - 0.38 * craquelure(q);
    // god-light: warm, brightest at the top of the frame, falling in broad slanted shafts
    float up = clamp(gl_FragCoord.y / uRes.y, 0.0, 1.0);
    float shaft = smoothstep(0.6, 1.0, sin(q.x * 0.011 + q.y * 0.0045 + 1.3)) * up;
    c *= 0.78 + 0.42 * up;
    c += gold * shaft * 0.1 * lit;
    return c;
  }
  // the drawing burning off: discard inside the hole, a charred band and an ember edge round it
  vec3 burn(vec3 c) {
    if (uBurn < 0.0) return c;
    float d = length((gl_FragCoord.xy - uBurnC) / uRes.y) + (iNoise(gl_FragCoord.xy / uPx * 0.025) - 0.5) * 0.16 + (iNoise(gl_FragCoord.xy / uPx * 0.11) - 0.5) * 0.04;
    float e = d - uBurn;
    if (e < 0.0) discard;
    c *= mix(0.25, 1.0, smoothstep(0.012, 0.07, e));
    return mix(c, vec3(1.0, 0.52, 0.16), 1.0 - smoothstep(0.0, 0.016, e));
  }
  // the gilded frame: a gold bevelled border at the screen edge and a dark vignette inside it
  vec3 framed(vec3 c) {
    vec2 uv = gl_FragCoord.xy / uRes;
    float edge = min(min(uv.x * uRes.x, (1.0 - uv.x) * uRes.x), min(uv.y * uRes.y, (1.0 - uv.y) * uRes.y)) / uRes.y;
    c *= mix(0.5, 1.0, smoothstep(0.0, 0.2, edge));
    float lift = 0.75 + 0.5 * iNoise(gl_FragCoord.xy / uPx * 0.4);
    vec3 gilt = vec3(0.86, 0.64, 0.22) * lift;
    float bevel = smoothstep(0.012, 0.016, edge) * 0.6 + 0.4;
    c = mix(c, gilt * bevel, 1.0 - smoothstep(0.018, 0.022, edge));
    return mix(c, vec3(0.1, 0.05, 0.02), (1.0 - smoothstep(0.0, 0.003, abs(edge - 0.0225))) * 0.8);
  }
  // burn outside framed, never framed(burn(c)): ANGLE's D3D11 compiler rejects that nesting ("invalid access of
  // unbound variable"), every charcoal draw is dropped and the scene is a void
  vec4 outColor(vec3 c, float a) { return vec4(pow(max(burn(framed(c)), 0.0), vec3(2.2)), a); }
`;

export const PAL = {
  ink: "#0D0805", char: "#1A1715", base: "#99663A", gold: "#E6A833", vermilion: "#D6451F", gilt: "#DBA338", cream: "#FBFAF7",
  bolt: "#FFF4DC", boltHalo: "#FF8A3A", ember: "#FF8529", sea: "#2952A8",
  coral: ["#ff8f7a", "#f6a08a", "#ff7d6b", "#ffa48e"], coralKeep: "#ff5a4a", blue: "#2a52a8", eren: "#2f6b3a", march: "#b8452a",
  deep: "#402312", dots: "#FFD7BA", ringCyan: "#2EC5FF", accent: "#FF8A3A",
};
export const SOLID_ID = 0.99;
