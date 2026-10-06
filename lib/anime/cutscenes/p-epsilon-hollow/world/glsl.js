// Shared GLSL chunks for the p-epsilon-hollow world. Every maths line is commented.

// 3D value noise. h3: scalar hash of a point; n3: trilinear value noise with the fade u = f^2 (3 - 2 f);
// f3: 3 octaves (weights 1/2, 1/4, 1/8, lacunarity ~2.07, so the range is [0, 7/8]).
// cracks(p): Voronoi on the 3D lattice; returns (F2 - F1, hash of the nearest cell). F2 - F1 -> 0 on the seam between two cells,
// so smoothstep(w, 0, F2 - F1) is a thin crack; the cell hash picks which cracks burn gold (1 in 5) and their breathing phase.
export const NOISE3 = /* glsl */ `
  float h3(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
  vec3 h33(vec3 p) { return fract(sin(vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)))) * 43758.5453); }
  float n3(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(h3(i), h3(i + vec3(1, 0, 0)), f.x), mix(h3(i + vec3(0, 1, 0)), h3(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(h3(i + vec3(0, 0, 1)), h3(i + vec3(1, 0, 1)), f.x), mix(h3(i + vec3(0, 1, 1)), h3(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
  float f3(vec3 p) { return 0.5 * n3(p) + 0.25 * n3(p * 2.07 + 3.1) + 0.125 * n3(p * 4.13 + 7.7); }
  vec2 cracks(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    float d1 = 8.0, d2 = 8.0, id = 0.0;
    for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {
      vec3 g = vec3(float(x), float(y), float(z));
      vec3 o = g + h33(i + g) - f;
      float d = dot(o, o);
      if (d < d1) { d2 = d1; d1 = d; id = h3(i + g + 5.0); } else if (d < d2) { d2 = d; }
    }
    return vec2(sqrt(d2) - sqrt(d1), id);
  }`;

// 2D noise for the eye plate (self-contained: distinct names from the paint kit)
export const NOISE2 = /* glsl */ `
  float hsh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float nz(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hsh(i), hsh(i + vec2(1, 0)), u.x), mix(hsh(i + vec2(0, 1)), hsh(i + vec2(1, 1)), u.x), u.y); }
  float fbm2(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * nz(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }`;

// THE SLASH (bible 3.10): a line through the screen centre with normal uCutN (aspect-corrected NDC), open to half-width
// 0.55 * uCut. d = |dot(q, n)| is the NDC distance from the line; d < open is the opening (discard: the pocket's island shows
// through). The edge burn is a band around d = open, crimson (uEdgeA) fading to gold (uEdgeB) as d -> open; the first frame
// uses Susanoo purple for both (egg 3). The edge colour is lifted x1.5 so it blooms (values above 1 bloom).
export const SLASH = /* glsl */ `
  uniform float uCut; uniform vec2 uCutN; uniform vec2 uRes; uniform vec3 uEdgeA; uniform vec3 uEdgeB;
  float slashCut(out vec3 edgeCol, out float edge) {
    vec2 q = (gl_FragCoord.xy / max(uRes, vec2(1.0))) * 2.0 - 1.0;
    q.x *= uRes.x / max(uRes.y, 1.0);
    float d = abs(dot(q, uCutN));
    float open = uCut * 0.55;
    float near = smoothstep(0.05, 0.0, abs(d - open));
    edge = uCut > 0.0 ? near : 0.0;
    edgeCol = mix(uEdgeA, uEdgeB, smoothstep(0.03, 0.0, abs(d - open))) * 1.5;
    return d < open ? 1.0 : 0.0;
  }`;

// 3 hard cel bands from a lighting value l (bible 3.3): shadow below 0, mid 0..0.5, lit above 0.5. fwidth gives a one pixel
// anti-aliased edge. hatch4: 4 px diagonal hatch in screen space (shadow only).
export const BANDS = /* glsl */ `
  vec3 band3(float l, vec3 shadow, vec3 mid, vec3 lit) {
    float w = fwidth(l) * 0.75 + 1e-4;
    return mix(mix(shadow, mid, smoothstep(-w, w, l)), lit, smoothstep(0.5 - w, 0.5 + w, l));
  }
  float hatch4() { return step(0.6, fract((gl_FragCoord.x + gl_FragCoord.y) / 4.0)); }`;
