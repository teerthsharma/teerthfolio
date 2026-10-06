// THE COMPOSITE: the scene renders once into a half-float target (colour + the
// set-line id in alpha, plus a depth texture); then
//   1 dual-Kawase pyramid (4 down, 3 up) carrying rgb = emissive excess
//     max(c - 1, 0) (bloom) and a = luma (diffusion glow), in one chain;
//   2 light shafts at half resolution (GPU Gems 3 ch. 13), only when a style
//     and tier ask: C = sum decay^i I(uv - i (uv - pL) density / N), N = 24;
//   3 ONE fused fullscreen pass: shockwave warp, misregistration / impact
//     aberration, set lines (depth Laplacian + id edges, nearer side only),
//     shafts, bloom, diffusion c + k max(blur(L) - L, 0), palette and
//     posterise, grading with lift locked at 0, paper, focus/speed lines,
//     impact frames, IGN grain, vignette, linear -> sRGB.
import { BufferAttribute, BufferGeometry, Color, Vector3, DepthTexture, HalfFloatType, LinearFilter, Mesh, NearestFilter, OrthographicCamera, Scene, ShaderMaterial, UnsignedByteType, UnsignedIntType, Vector2, Vector4, WebGLRenderTarget } from "three";

const QUAD_V = "varying vec2 vUv; void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }";

const PREFILTER = /* glsl */ `
  uniform sampler2D tIn; uniform vec2 uTexel; varying vec2 vUv;
  vec4 f(vec2 uv) { vec3 c = texture2D(tIn, uv).rgb; return vec4(max(c - 1.0, 0.0), dot(min(c, vec3(1.0)), vec3(0.2126, 0.7152, 0.0722))); }
  void main() { vec2 o = uTexel; gl_FragColor = (f(vUv + vec2(-o.x, -o.y)) + f(vUv + vec2(o.x, -o.y)) + f(vUv + vec2(-o.x, o.y)) + f(vUv + o)) * 0.25; }`;
const DOWN = /* glsl */ `
  uniform sampler2D tIn; uniform vec2 uTexel; varying vec2 vUv;
  void main() { vec2 o = uTexel;
    gl_FragColor = texture2D(tIn, vUv) * 0.5 + (texture2D(tIn, vUv - o) + texture2D(tIn, vUv + o) + texture2D(tIn, vUv + vec2(o.x, -o.y)) + texture2D(tIn, vUv - vec2(o.x, -o.y))) * 0.125; }`;
const UP = /* glsl */ `
  uniform sampler2D tIn; uniform vec2 uTexel; varying vec2 vUv;
  void main() { vec2 o = uTexel;
    vec4 s = texture2D(tIn, vUv + vec2(-2.0 * o.x, 0.0)) + texture2D(tIn, vUv + vec2(2.0 * o.x, 0.0)) + texture2D(tIn, vUv + vec2(0.0, -2.0 * o.y)) + texture2D(tIn, vUv + vec2(0.0, 2.0 * o.y));
    s += 2.0 * (texture2D(tIn, vUv + vec2(-o.x, o.y)) + texture2D(tIn, vUv + o) + texture2D(tIn, vUv - o) + texture2D(tIn, vUv + vec2(o.x, -o.y)));
    gl_FragColor = s / 12.0; }`;
const SHAFT = /* glsl */ `
  uniform sampler2D tIn; uniform vec2 uLightUV; uniform float uDensity; uniform float uDecay; varying vec2 vUv;
  float mask(vec2 uv) { vec4 c = texture2D(tIn, uv); float l = dot(min(c.rgb, vec3(4.0)), vec3(0.2126, 0.7152, 0.0722));
    return max(l - 1.0, 0.0) * (c.a < 0.002 ? 1.0 : 0.4); }
  void main() {
    vec2 d = (vUv - uLightUV) * uDensity / 24.0; vec2 uv = vUv; float w = 1.0; float s = 0.0;
    for (int i = 0; i < 24; i++) { uv -= d; s += mask(uv) * w; w *= uDecay; }
    gl_FragColor = vec4(vec3(s / 24.0), 1.0); }`;

// THE PLATE: the static world, rendered once per shot and style, then painted:
//   Kuwahara (4 quadrants, radius R): the mean of the least-variance quadrant, which
//     flattens texture into brush dabs while keeping edges (the painted-background look);
//   saturation and posterise of the set; atmospheric haze by linear depth (sky excluded).
const PLATE = /* glsl */ `
  uniform sampler2D tIn; uniform sampler2D tDepth; uniform vec2 uRes; uniform float uNear; uniform float uFar;
  uniform vec4 uBg; uniform vec3 uHaze; uniform vec4 uHazeR; varying vec2 vUv;
  uniform vec3 uRamp[3]; uniform float uRampAmt;              // gradient map by value (shadow, mid, light)
  uniform float uFlower;                                      // clover flowers dotted in the grass
  uniform vec4 uFil; uniform vec3 uFilCol;                    // cursed-energy filaments: x amount, y scale
  float hsh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hsh(i), hsh(i + vec2(1, 0)), f.x), mix(hsh(i + vec2(0, 1)), hsh(i + vec2(1, 1)), f.x), f.y); }
  const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
  float lin(float d) { float z = d * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
  void main() {
    vec4 c0 = texture2D(tIn, vUv);
    vec3 col = c0.rgb;
    float R = uBg.x;
    if (R > 0.5 && uBg.w > 0.5) {
      // generalized Kuwahara (Papari / Kyprianidis): 8 angular sectors, Gaussian radial weight,
      // the sector means blended by 1 / (1 + (k var)^4): smooth painterly strokes, edges kept
      vec3 m[8]; vec3 s[8]; float w[8];
      for (int k = 0; k < 8; k++) { m[k] = vec3(0.0); s[k] = vec3(0.0); w[k] = 0.0; }
      for (int j = -8; j <= 8; j++) for (int i = -8; i <= 8; i++) {
        vec2 o = vec2(i, j); float l = length(o);
        if (l > R) continue;
        vec3 c = min(texture2D(tIn, vUv + o / uRes).rgb, vec3(1.0));
        float g = exp(-l * l / (0.5 * R * R));
        float a = atan(o.y, o.x) / 0.785398 + 4.0;
        int k0 = int(floor(a)) - (int(floor(a)) / 8) * 8; float fk = fract(a);
        int k1 = k0 + 1 - ((k0 + 1) / 8) * 8;
        float g0 = g * (1.0 - fk) + (l < 0.5 ? g : 0.0), g1 = g * fk;
        m[k0] += c * g0; s[k0] += c * c * g0; w[k0] += g0;
        m[k1] += c * g1; s[k1] += c * c * g1; w[k1] += g1;
      }
      vec3 acc = vec3(0.0); float ws = 0.0;
      for (int k = 0; k < 8; k++) { if (w[k] < 1e-4) continue; vec3 mu = m[k] / w[k]; float v = dot(s[k] / w[k] - mu * mu, vec3(1.0));
        float a = 1.0 / (1.0 + pow(max(v, 0.0) * 120.0, 2.0)); acc += mu * a; ws += a; }
      if (ws > 0.0) col = mix(col, acc / ws, step(c0.r + c0.g + c0.b, 3.0));
    } else if (R > 0.5) {
      vec3 m0 = vec3(0.0), m1 = vec3(0.0), m2 = vec3(0.0), m3 = vec3(0.0), s0 = vec3(0.0), s1 = vec3(0.0), s2 = vec3(0.0), s3 = vec3(0.0);
      for (int j = -6; j <= 6; j++) for (int i = -6; i <= 6; i++) {
        if (abs(float(i)) > R || abs(float(j)) > R) continue;
        vec3 c = min(texture2D(tIn, vUv + vec2(i, j) / uRes).rgb, vec3(1.0));
        if (i <= 0 && j <= 0) { m0 += c; s0 += c * c; }
        if (i >= 0 && j <= 0) { m1 += c; s1 += c * c; }
        if (i <= 0 && j >= 0) { m2 += c; s2 += c * c; }
        if (i >= 0 && j >= 0) { m3 += c; s3 += c * c; }
      }
      float n = (R + 1.0) * (R + 1.0);
      m0 /= n; m1 /= n; m2 /= n; m3 /= n;
      vec3 v0 = s0 / n - m0 * m0, v1 = s1 / n - m1 * m1, v2 = s2 / n - m2 * m2, v3 = s3 / n - m3 * m3;
      float a = dot(v0, vec3(1.0)), b = dot(v1, vec3(1.0)), c = dot(v2, vec3(1.0)), d = dot(v3, vec3(1.0));
      vec3 k = m0; float e = a;
      if (b < e) { e = b; k = m1; } if (c < e) { e = c; k = m2; } if (d < e) { k = m3; }
      col = mix(col, k, step(c0.r + c0.g + c0.b, 3.0)); // emissive (sun) stays sharp
    }
    if (c0.a > 0.001) { // sets only: the sky keeps its own colour
      float z = lin(texture2D(tDepth, vUv).r);
      col = mix(col, uHaze, uHazeR.x * smoothstep(uHazeR.y, uHazeR.z, z));
    }
    float zl = lin(texture2D(tDepth, vUv).r);
    vec2 fc = vUv * uRes;
    if (uFlower > 0.0 && abs(c0.a - 0.99) < 0.004) { // white clover heads with a yellow eye, sized by depth
      float cs = clamp(150.0 / zl, 7.0, 60.0);
      vec2 g = fc / cs, id = floor(g), f = fract(g) - 0.5 - (vec2(hsh(id), hsh(id + 3.1)) - 0.5) * 0.5;
      float on = step(0.72, hsh(id + 7.7));
      float a = atan(f.y, f.x), r = length(f) / (0.2 + 0.05 * cos(a * 5.0 + hsh(id) * 6.0));
      col = mix(col, vec3(0.92, 0.93, 0.86), on * (1.0 - smoothstep(0.85, 1.0, r)) * uFlower);
      col = mix(col, vec3(0.9, 0.75, 0.25), on * (1.0 - smoothstep(0.3, 0.42, r)) * uFlower);
    }
    float L = dot(col, LUMA);
    if (uRampAmt > 0.0) col = mix(col, L < 0.5 ? mix(uRamp[0], uRamp[1], L * 2.0) : mix(uRamp[1], uRamp[2], L * 2.0 - 1.0), uRampAmt);
    L = dot(col, LUMA);
    col = mix(vec3(L), col, uBg.y);
    if (uBg.z > 0.0) col = floor(col * uBg.z + 0.5) / uBg.z;
    if (uFil.x > 0.0) { // filaments: iso-lines of a warped noise field, thin, emissive so they bloom
      vec2 q = fc / uRes.y * uFil.y;
      q += vec2(vn(q * 1.7 + 3.0), vn(q * 1.7 + 9.0)) * 1.2;
      float n = vn(q) * 0.65 + vn(q * 2.3) * 0.35;
      float w = fwidth(n) * 1.2;
      float fil = 1.0 - smoothstep(0.0, w, abs(fract(n * 4.0) - 0.5) / 4.0 - 0.0015);
      fil *= smoothstep(0.35, 0.75, vn(q * 0.5 + 21.0));
      col = mix(col, uFilCol, fil * uFil.x);
    }
    gl_FragColor = vec4(col, c0.a);
  }`;
// THE COMPOSITE: the character layer over the plate by depth (FINAL reads min(plate, char) depth).
const COMP = /* glsl */ `
  uniform sampler2D tPlate; uniform sampler2D tPlateD; uniform sampler2D tChar; uniform sampler2D tCharD; varying vec2 vUv;
  void main() {
    vec4 p = texture2D(tPlate, vUv), c = texture2D(tChar, vUv);
    gl_FragColor = c.a > 0.5 && texture2D(tCharD, vUv).r < texture2D(tPlateD, vUv).r ? c : p;
  }`;

const FINAL = /* glsl */ `
  uniform sampler2D tCol; uniform sampler2D tDepth; uniform sampler2D tDepth2;
  uniform sampler2D tBloom; uniform sampler2D tShaft; uniform sampler2D tBlur; uniform vec3 uDof;
  uniform vec2 uRes; uniform float uNear; uniform float uFar; uniform float uSeed; uniform float uTime;
  float dep(vec2 uv) { return min(texture2D(tDepth, uv).r, texture2D(tDepth2, uv).r); }
  uniform vec4 uSet; uniform vec3 uSetCol; uniform float uCharLines;          // x strength, y width px, z colour mix (0 darkened scene, 1 uSetCol), w depth gain
  uniform float uBloom; uniform float uDiffuse; uniform float uShaft; uniform vec3 uShaftCol;
  uniform vec3 uGain; uniform vec3 uGamma; uniform float uSat; uniform vec3 uSplit; uniform float uPoster;
  uniform vec3 uPal[8]; uniform float uPalN; uniform float uPalMix;
  uniform vec3 uPaperCol; uniform vec4 uPaper;      // x amount (multiply pigment over paper), y texture kind, z texture strength, w bleed px
  uniform float uMisreg; uniform float uCA; uniform float uGrain; uniform float uVig; uniform float uMono;
  uniform vec4 uImpact; uniform vec3 uImpA; uniform vec3 uImpB;
  uniform vec4 uFocus; uniform vec3 uFocusCol; uniform vec4 uShock;
  uniform vec4 uInkT; uniform vec3 uInkPaper; uniform vec3 uInkInk; uniform vec3 uInkRed; uniform float uBox;
  varying vec2 vUv;
  const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
  float lin(float d) { float z = d * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
  vec3 toSRGB(vec3 c) { c = clamp(c, 0.0, 1.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
  float cells(vec2 p) { vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(x, y); vec2 o = vec2(hash(i + g), hash(i + g + 7.0));
      float d = length(g + o - f); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
    return d2 - d1; }
  void main() {
    vec2 px = 1.0 / uRes;
    vec2 uv = vUv;
    // shockwave: uv' = uv + n A exp(-((r - R)/w)^2)
    if (uShock.w > 0.0) { vec2 asp = vec2(uRes.x / uRes.y, 1.0); vec2 dv = (uv - uShock.xy) * asp; float r = length(dv);
      uv -= normalize(dv + 1e-6) / asp * uShock.w * exp(-pow((r - uShock.z) / 0.045, 2.0)); }
    // watercolour bleed: low-frequency wobble of where the pigment landed
    if (uPaper.w > 0.0) uv += (vec2(vnoise(uv * uRes / 40.0), vnoise(uv * uRes / 40.0 + 13.0)) - 0.5) * uPaper.w * px;
    vec4 c0 = texture2D(tCol, uv);
    vec3 col = c0.rgb;
    float ab = uMisreg + uCA * length(uv - 0.5) * 2.0;
    if (ab > 0.0) { vec2 o = (uMisreg > 0.0 ? vec2(0.7, 0.4) : normalize(uv - 0.5 + 1e-6)) * ab * px;
      col.r = texture2D(tCol, uv + o).r; col.b = texture2D(tCol, uv - o).b; }
    // set lines: depth Laplacian (creases + silhouettes) and id edges, drawn on the nearer side
    float line = 0.0;
    if (uSet.x > 0.0 && (c0.a < 0.98 || uCharLines > 0.5)) {
      float zc = lin(dep(uv));
      float lap = 0.0; float ide = 0.0; float hasChar = 0.0;
      vec2 o = uSet.y * px;
      for (int i = 0; i < 8; i++) {
        float a = float(i) * 0.785398;
        vec2 q = uv + vec2(cos(a), sin(a)) * o * (i == 1 || i == 3 || i == 5 || i == 7 ? 1.4142 : 1.0);
        float zn = lin(dep(q)); float idn = texture2D(tCol, q).a;
        lap += zn - zc;
        hasChar = max(hasChar, step(0.98, idn));
        ide = max(ide, step(0.004, abs(idn - c0.a)) * step(zc, zn));
      }
      float dEdge = smoothstep(0.02, 0.06, abs(lap) / max(zc, 1e-3) * uSet.w) * step(0.0, lap);
      line = max(dEdge, ide) * (1.0 - hasChar * (1.0 - uCharLines)) * step(0.002, c0.a);
      vec3 dk = max(vec3(0.0), mix(vec3(dot(col, LUMA)), col, 1.4)) * 0.28;
      col = mix(col, mix(dk, uSetCol, uSet.z), line * uSet.x);
    }
    // depth of field: blend toward the quarter-res Kawase blur by circle of confusion |1/zf - 1/z|
    if (uDof.z > 0.0) { float z = lin(dep(uv)); float coc = clamp(abs(1.0 / uDof.x - 1.0 / z) * uDof.y, 0.0, 1.0);
      col = mix(col, texture2D(tBlur, uv).rgb, smoothstep(0.05, 0.6, coc)); }
    // light: shafts, emissive bloom, diffusion glow on highlights only
    vec4 bl = texture2D(tBloom, uv);
    col += texture2D(tShaft, uv).rgb * uShaftCol * uShaft;
    col += bl.rgb * uBloom;
    float L = dot(col, LUMA);
    col += uDiffuse * max(bl.a - L, 0.0) * smoothstep(0.6, 0.95, bl.a) * smoothstep(0.08, 0.3, L) * mix(vec3(1.0), col / max(L, 1e-3), 0.5);
    // palette (woodblock, fresco pigments): nearest swatch, blended
    if (uPalN > 0.0) { vec3 best = col; float bd = 1e9;
      for (int i = 0; i < 8; i++) { if (float(i) >= uPalN) break; vec3 d = (col - uPal[i]) * vec3(0.9, 1.4, 0.6); float e = dot(d, d); if (e < bd) { bd = e; best = uPal[i]; } }
      col = mix(col, best, uPalMix); }
    // grading, lift locked at 0: black stays black
    L = dot(col, LUMA);
    col = mix(vec3(L), col, uSat);
    col += uSplit * L * (1.0 - L);
    col = pow(max(col * uGain, 0.0), 1.0 / uGamma);
    // soft shoulder above 0.8 (only emissive can get there)
    col = mix(col, 0.8 + 0.2 * (1.0 - exp(-(col - 0.8) / 0.2)), step(0.8, col));
    // pigment over paper (watercolour, fresco, woodblock): multiply onto the paper colour
    vec2 fc = uv * uRes;
    if (uPaper.x > 0.0) {
      float tex = 0.0;
      if (uPaper.y == 1.0) tex = vnoise(fc / 3.0) * 0.5 + vnoise(fc / 11.0) * 0.5;                      // cold-press paper
      else if (uPaper.y == 2.0) tex = vnoise(fc / 2.0) * 0.4 + vnoise(fc / 23.0) * 0.6 - (1.0 - smoothstep(0.0, 0.035, cells(fc / 70.0))) * 0.9; // plaster + craquelure
      else if (uPaper.y == 3.0) tex = vnoise(vec2(fc.x / 90.0, fc.y / 2.5)) * 0.7 + vnoise(fc / 4.0) * 0.3;  // wood grain
      vec3 paper = uPaperCol * (1.0 - uPaper.z * (0.5 - tex) * 0.6);
      col = mix(col, col * paper / max(uPaperCol, vec3(0.05)), uPaper.x);
      col = mix(col, paper, uPaper.x * smoothstep(0.86, 0.98, dot(col, LUMA)) * 0.7);
    }
    if (uPoster > 0.0) col = floor(col * uPoster + 0.5) / uPoster;
    if (uMono > 0.0) col = mix(col, vec3(step(0.5, dot(col, LUMA))), uMono);
    // ink (Kubo / TYBW): three values, black, one grey, paper, with dry-brush edges from a
    // jittered threshold; one blood-red accent survives where the colour was strongly red
    if (uInkT.x > 0.0) {
      float v = dot(col, LUMA) + (vnoise(fc / 2.5) - 0.5) * 0.06 + (vnoise(fc / 13.0) - 0.5) * 0.07;
      vec3 k = v < uInkT.y ? uInkInk : (v < uInkT.z ? mix(uInkInk, uInkPaper, uInkT.w) : uInkPaper);
      float red = smoothstep(0.1, 0.2, col.r - max(col.g, col.b)) * step(0.12, col.r);
      col = mix(col, mix(k, uInkRed, red), uInkT.x);
    }
    vec3 o = toSRGB(col);
    // focus lines (radial, kind 0) / speed lines (horizontal, kind 1), redrawn every step
    if (uFocus.z > 0.0) {
      vec2 asp = vec2(uRes.x / uRes.y, 1.0);
      float m;
      if (uFocus.w < 0.5) { vec2 d = (vUv - uFocus.xy) * asp; float a = atan(d.y, d.x) / 6.28318 + 0.5; float r = length(d);
        float bin = floor(a * 160.0); float rnd = hash(vec2(bin, uSeed));
        m = step(1.0 - 0.35 * rnd, fract(a * 160.0)) * smoothstep(0.28 + 0.25 * hash(vec2(bin, uSeed + 3.0)), 0.75, r);
      } else { float bin = floor(vUv.y * 140.0); float rnd = hash(vec2(bin, uSeed));
        float len = 0.25 + 0.5 * hash(vec2(bin, uSeed + 1.0)); float st = fract(hash(vec2(bin, uSeed + 2.0)) - uTime * 2.5);
        float x = fract(vUv.x - st); m = step(0.75, rnd) * step(x, len) * step(0.35, fract(vUv.y * 140.0)) * smoothstep(0.0, 0.3, abs(vUv.y - uFocus.y)); }
      o = mix(o, uFocusCol, m * uFocus.z);
    }
    // grain (IGN) and vignette
    float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy + uSeed * 5.588238, vec2(0.06711056, 0.00583715))));
    o += (ign - 0.5) * uGrain;
    vec2 vd = vUv - 0.5; o *= 1.0 - uVig * dot(vd, vd) * 2.0;
    if (abs(vUv.y - 0.5) > 0.5 - uBox) o = vec3(0.0); // letterbox
    // impact frames: 1 two-tone, 2 inverted, 3 two-tone swapped. Frame-locked, no easing.
    if (uImpact.x > 0.5) { float l = dot(o, LUMA);
      if (uImpact.x < 1.5) o = l > uImpact.y ? uImpA : uImpB;
      else if (uImpact.x < 2.5) o = 1.0 - o;
      else o = l > uImpact.y ? uImpB : uImpA; }
    gl_FragColor = vec4(o, 1.0);
  }`;

export class Composer {
  constructor(renderer, o = {}) {
    this.r = renderer;
    this.tier = o.tier ?? 2;
    this.float = renderer.extensions.has("EXT_color_buffer_float") || renderer.extensions.has("EXT_color_buffer_half_float");
    const type = this.float ? HalfFloatType : UnsignedByteType;
    this.type = type;
    this.samples = o.samples ?? 0;
    this.scene = new WebGLRenderTarget(4, 4, { type, depthTexture: new DepthTexture(4, 4, UnsignedIntType), samples: this.samples, minFilter: NearestFilter, magFilter: NearestFilter });
    this.levels = this.tier <= 1 ? 3 : 4;
    this.down = Array.from({ length: this.levels }, () => new WebGLRenderTarget(4, 4, { type, minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: false }));
    this.up = Array.from({ length: this.levels - 1 }, () => new WebGLRenderTarget(4, 4, { type, minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: false }));
    this.blur = [0, 1].map(() => new WebGLRenderTarget(4, 4, { type, minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: false }));
    this.shaft = new WebGLRenderTarget(4, 4, { type: UnsignedByteType, minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: false });
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    this.quad = new Mesh(geo);
    this.quad.frustumCulled = false;
    this.qs = new Scene().add(this.quad);
    this.qc = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const mk = (fs, u) => new ShaderMaterial({ vertexShader: QUAD_V, fragmentShader: fs, uniforms: u, depthTest: false, depthWrite: false });
    this.mPre = mk(PREFILTER, { tIn: { value: null }, uTexel: { value: new Vector2() } });
    this.mDown = mk(DOWN, { tIn: { value: null }, uTexel: { value: new Vector2() } });
    this.mUp = mk(UP, { tIn: { value: null }, uTexel: { value: new Vector2() } });
    this.mShaft = mk(SHAFT, { tIn: { value: null }, uLightUV: { value: new Vector2(0.5, 0.8) }, uDensity: { value: 0.85 }, uDecay: { value: 0.955 } });
    this.u = {
      tCol: { value: null }, tDepth: { value: null }, tDepth2: { value: null }, tBloom: { value: null }, tShaft: { value: null }, tBlur: { value: null }, uDof: { value: new Vector3(3, 0, 0) },
      uRes: { value: new Vector2() }, uNear: { value: 0.1 }, uFar: { value: 100 }, uSeed: { value: 0 }, uTime: { value: 0 },
      uSet: { value: new Vector4(1, 1, 0, 1) }, uSetCol: { value: new Color(0, 0, 0) }, uCharLines: { value: 0 },
      uBloom: { value: 1 }, uDiffuse: { value: 0.2 }, uShaft: { value: 0 }, uShaftCol: { value: new Color(1, 0.9, 0.7) },
      uGain: { value: new Color(1, 1, 1) }, uGamma: { value: new Color(1, 1, 1) }, uSat: { value: 1 }, uSplit: { value: new Color(0, 0, 0) }, uPoster: { value: 0 },
      uPal: { value: Array.from({ length: 8 }, () => new Color()) }, uPalN: { value: 0 }, uPalMix: { value: 0 },
      uPaperCol: { value: new Color(1, 1, 1) }, uPaper: { value: new Vector4() },
      uMisreg: { value: 0 }, uCA: { value: 0 }, uGrain: { value: 0.02 }, uVig: { value: 0.25 }, uMono: { value: 0 },
      uImpact: { value: new Vector4(0, 0.5, 0, 0) }, uImpA: { value: new Color(1, 1, 1) }, uImpB: { value: new Color(0, 0, 0) },
      uFocus: { value: new Vector4(0.5, 0.5, 0, 0) }, uFocusCol: { value: new Color(0, 0, 0) }, uShock: { value: new Vector4(0.5, 0.5, 0, 0) },
      uInkT: { value: new Vector4() }, uInkPaper: { value: new Color("#efeeee") }, uInkInk: { value: new Color("#0f0e15") }, uInkRed: { value: new Color("#7a1e17") }, uBox: { value: 0 },
    };
    // plates: off until a shot opts in (composer.plates = true) and tags its characters layer 1
    this.plates = false;
    const rt = (o2) => new WebGLRenderTarget(4, 4, { type, minFilter: NearestFilter, magFilter: NearestFilter, ...o2 });
    this.plateRT = rt({ depthTexture: new DepthTexture(4, 4, UnsignedIntType), samples: this.samples });
    this.plateCol = rt({ depthBuffer: false, minFilter: LinearFilter, magFilter: LinearFilter });
    this.charRT = rt({ depthTexture: new DepthTexture(4, 4, UnsignedIntType), samples: this.samples });
    this.comp = rt({ depthBuffer: false });
    this.pu = { tIn: { value: null }, tDepth: { value: null }, uRes: { value: new Vector2() }, uNear: { value: 0.1 }, uFar: { value: 100 }, uBg: { value: new Vector4(0, 1, 0, 0) }, uHaze: { value: new Color(1, 1, 1) }, uHazeR: { value: new Vector4(0, 3, 30, 0) },
      uRamp: { value: [new Color(), new Color(), new Color()] }, uRampAmt: { value: 0 },
      uFlower: { value: 0 }, uFil: { value: new Vector4() }, uFilCol: { value: new Color() } };
    this.mPlate = mk(PLATE, this.pu);
    this.mComp = mk(COMP, { tPlate: { value: this.plateCol.texture }, tPlateD: { value: this.plateRT.depthTexture }, tChar: { value: this.charRT.texture }, tCharD: { value: this.charRT.depthTexture } });
    this.plateKey = null; this.charKey = null;
    this.mFinal = mk(FINAL, this.u);
    this.w = 0; this.h = 0;
  }
  setSize(w, h) {
    if (w === this.w && h === this.h) return;
    this.w = w; this.h = h;
    this.scene.setSize(w, h);
    for (let i = 0; i < this.levels; i++) this.down[i].setSize(Math.max(1, w >> (i + 1)), Math.max(1, h >> (i + 1)));
    for (let i = 0; i < this.levels - 1; i++) this.up[i].setSize(Math.max(1, w >> (i + 1)), Math.max(1, h >> (i + 1)));
    this.shaft.setSize(Math.max(1, w >> 1), Math.max(1, h >> 1));
    this.blur[0].setSize(Math.max(1, w >> 1), Math.max(1, h >> 1));
    this.blur[1].setSize(Math.max(1, w >> 2), Math.max(1, h >> 2));
    this.u.uRes.value.set(w, h);
    for (const t of [this.plateRT, this.plateCol, this.charRT, this.comp]) t.setSize(w, h);
    this.pu.uRes.value.set(w, h);
    this.plateKey = null; this.charKey = null;
  }
  // the static world once per (shot, style), painted; the characters only when their step changes
  layered(scene, camera, keys) {
    const r = this.r, mask = camera.layers.mask;
    if (keys.plate !== this.plateKey) {
      camera.layers.set(0);
      r.setRenderTarget(this.plateRT); r.setClearColor(0x000000, 0); r.clear(); r.render(scene, camera);
      this.pu.tIn.value = this.plateRT.texture; this.pu.tDepth.value = this.plateRT.depthTexture;
      this.pu.uNear.value = camera.near; this.pu.uFar.value = camera.far;
      this.pass(this.mPlate, this.plateCol);
      this.plateKey = keys.plate; this.charKey = null;
    }
    if (keys.char !== this.charKey) {
      camera.layers.set(1);
      r.setRenderTarget(this.charRT); r.setClearColor(0x000000, 0); r.clear(); r.render(scene, camera);
      this.charKey = keys.char;
    }
    camera.layers.mask = mask;
    this.pass(this.mComp, this.comp);
    return this.comp;
  }
  pass(m, target) {
    this.quad.material = m;
    this.r.setRenderTarget(target);
    this.r.render(this.qs, this.qc);
  }
  // rect: [x, y, w, h] in drawing-buffer px of the canvas (null = full canvas)
  render(scene, camera, rect = null, shafts = null, keys = null) {
    const r = this.r;
    let S = this.scene, D = this.scene.depthTexture, D2 = D;
    if (this.plates && keys) { S = this.layered(scene, camera, keys); D = this.plateRT.depthTexture; D2 = this.charRT.depthTexture; }
    else {
      r.setRenderTarget(this.scene);
      r.setClearColor(0x000000, 0);
      r.clear();
      r.render(scene, camera);
    }
    // pyramid
    let src = S.texture;
    this.mPre.uniforms.tIn.value = src;
    this.mPre.uniforms.uTexel.value.set(0.5 / this.w, 0.5 / this.h);
    this.pass(this.mPre, this.down[0]);
    for (let i = 1; i < this.levels; i++) {
      this.mDown.uniforms.tIn.value = this.down[i - 1].texture;
      this.mDown.uniforms.uTexel.value.set(1 / this.down[i - 1].width, 1 / this.down[i - 1].height);
      this.pass(this.mDown, this.down[i]);
    }
    let up = this.down[this.levels - 1];
    for (let i = this.levels - 2; i >= 0; i--) {
      this.mUp.uniforms.tIn.value = up.texture;
      this.mUp.uniforms.uTexel.value.set(0.5 / up.width, 0.5 / up.height);
      this.pass(this.mUp, this.up[i]);
      up = this.up[i];
    }
    if (this.u.uDof.value.z > 0) {
      this.mDown.uniforms.tIn.value = S.texture; this.mDown.uniforms.uTexel.value.set(1 / this.w, 1 / this.h); this.pass(this.mDown, this.blur[0]);
      this.mDown.uniforms.tIn.value = this.blur[0].texture; this.mDown.uniforms.uTexel.value.set(1 / this.blur[0].width, 1 / this.blur[0].height); this.pass(this.mDown, this.blur[1]);
      this.mUp.uniforms.tIn.value = this.blur[1].texture; this.mUp.uniforms.uTexel.value.set(1.5 / this.blur[1].width, 1.5 / this.blur[1].height); this.pass(this.mUp, this.blur[0]);
    }
    const useShaft = shafts && this.tier >= 2 && this.u.uShaft.value > 0;
    if (useShaft) {
      this.mShaft.uniforms.tIn.value = S.texture;
      this.mShaft.uniforms.uLightUV.value.copy(shafts);
      this.pass(this.mShaft, this.shaft);
    }
    const u = this.u;
    u.tCol.value = S.texture;
    u.tDepth.value = D; u.tDepth2.value = D2;
    u.tBloom.value = up.texture;
    u.tShaft.value = this.shaft.texture;
    u.tBlur.value = this.blur[0].texture;
    const sh = u.uShaft.value;
    if (!useShaft) u.uShaft.value = 0;
    u.uNear.value = camera.near; u.uFar.value = camera.far;
    this.quad.material = this.mFinal;
    r.setRenderTarget(null);
    if (rect) { r.setViewport(...rect.map((v) => v / r.getPixelRatio())); r.setScissor(...rect.map((v) => v / r.getPixelRatio())); r.setScissorTest(true); }
    r.render(this.qs, this.qc);
    if (rect) r.setScissorTest(false);
    u.uShaft.value = sh;
  }
  dispose() {
    for (const t of [this.scene, ...this.down, ...this.up, ...this.blur, this.shaft, this.plateRT, this.plateCol, this.charRT, this.comp]) t.dispose();
  }
}
