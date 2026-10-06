// THE ANIME SURFACE: one uber-program for every lit thing (characters, sets,
// props), varied only by uniforms, so a whole scene costs two programs (this
// and its hull) and a style switch never recompiles.
//
// Shading (all in linear light):
//   h = 0.5 (N.L) + 0.5                                   half-Lambert
//   b = smoothstep(t - w, t + w, h + 2 s (R - 0.5))       Xrd bias R from aXrd.x, w = fwidth(h) + soft
//   c = mix(S, A, b)                                      S authored shadow colour, never albedo * k
//   A is clamped to luma <= lumaMax (0.92): lit albedo can never reach the
//   bloom threshold (1.0), so only uEmit (emissive) blooms. That is the
//   milky-seal fix by construction, not by tuning.
// Faces (aXrd.z = 2): analytic Genshin shadow. In head space with u across
//   the face (-1..1), lit = smoothstep(-e, e, u sign(Lx) + Lz/|Lxz|): the
//   boundary sweeps from the far cheek (light in front) to the near cheek
//   (light behind), a clean half-face shadow with no Lambert facets.
// Hair (aXrd.z = 1): Kajiya-Kay angel ring on a shifted tangent,
//   T' = normalize(T + s N), ring = step on sqrt(1 - (T'.H)^2)^p, broken by a
//   strand hash so it reads as a drawn zigzag band.
// Tone (style): 1 Ben-Day dots, 2 manga screentone + solid blacks (mono),
//   3 watercolour granulation, 4 hatching. Screen-space, shadow side only.
// Vertex: smear (trailing vertices dragged back along velocity) and the
//   blob morph (mix toward aBlob, staggered by height) used by Rimuru.
import { BackSide, Color, ShaderMaterial, Vector2, Vector3, Vector4 } from "three";

// One object shared by every anime material: the light and the style live
// here, so applyStyle() is a handful of uniform writes.
export function sharedUniforms() {
  return {
    uLightDir: { value: new Vector3(-0.5, 0.75, 0.45).normalize() },
    uLightCol: { value: new Color(1, 0.97, 0.92) },
    uTime: { value: 0 },
    uRes: { value: new Vector2(1280, 800) },
    // x threshold, y softness, z bias strength, w lumaMax
    uS0: { value: new Vector4(0.5, 0.0, 1.0, 0.92) },
    // x tone mode, y tone scale (px), z tone strength, w flat (1 = no shading)
    uS1: { value: new Vector4(0, 6, 0, 0) },
    // x mono, y saturation of fills, z rim, w ring strength
    uS2: { value: new Vector4(0, 1, 0.6, 1) },
    uInk: { value: new Color(0, 0, 0) },
    // x hull px, y distance-aware 0..1, z ink mix (0 = coloured ink from albedo, 1 = uInk), w line on/off
    uLine: { value: new Vector4(2.2, 1, 0, 1) },
    uPaper: { value: new Color(1, 1, 1) },
    // rim light from a second direction (water bounce); zero = use the key
    uRimDir: { value: new Vector3() }, uRimCol: { value: new Color(1, 1, 1) },
  };
}

const COMMON_V = /* glsl */ `
  attribute vec3 aCol; attribute vec3 aShade; attribute vec3 aXrd; attribute vec4 aBlob; attribute vec3 aBlobN;
  uniform float uMorph; uniform float uStagger; uniform vec4 uSmear;
  float gMorphT;
  vec3 morphed(out vec3 n) {
    float hh = uStagger < 0.0 ? 1.0 - aBlob.w : aBlob.w;
    float s = abs(uStagger);
    float t = clamp(uMorph * (1.0 + s) - hh * s, 0.0, 1.0);
    t = t * t * (3.0 - 2.0 * t);
    gMorphT = t;
    vec3 p = mix(position, aBlob.xyz, t);
    n = normalize(mix(normal, aBlobN, t));
    // smear: the trailing side streaks back along the motion (object space)
    float sl = length(uSmear.xyz);
    if (sl > 1e-4) p -= uSmear.xyz * max(0.0, -dot(n, uSmear.xyz / sl)) * uSmear.w;
    return p;
  }`;

const SURF_V = /* glsl */ `${COMMON_V}
  varying vec3 vCol; varying vec3 vShade; varying vec3 vXrd; varying vec3 vN; varying vec3 vWP; varying vec3 vOP; varying vec3 vON;
  void main() {
    vec3 n;
    vec3 p = morphed(n);
    vOP = p; vON = n;
    vCol = aCol; vShade = aShade; vXrd = aXrd;
    vN = normalize(mat3(modelMatrix) * n);
    vec4 wp = modelMatrix * vec4(p, 1.0);
    vWP = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;

const SURF_F = /* glsl */ `
  uniform vec3 uLightDir; uniform vec3 uLightCol; uniform vec4 uS0; uniform vec4 uS1; uniform vec4 uS2;
  uniform vec3 uInk; uniform vec3 uPaper; uniform vec2 uRes; uniform float uTime;
  uniform vec3 uHeadPos; uniform vec3 uHeadFwd; uniform vec3 uHeadRight; uniform float uHeadR;
  uniform vec3 uEmit; uniform float uId; uniform vec3 uSlime; uniform float uSlimeAmt; uniform vec3 uTint; uniform float uTintAmt;
  varying vec3 vCol; varying vec3 vShade; varying vec3 vXrd; varying vec3 vN; varying vec3 vWP; varying vec3 vOP; varying vec3 vON;
  uniform vec4 uDecA; uniform vec4 uDecB; uniform vec3 uDecCol; uniform vec3 uDecShade; uniform vec4 uBlush; uniform vec4 uBlushCol;
  float hash2(vec2 p);
  uniform vec4 uLine; uniform vec3 uRimDir; uniform vec3 uRimCol;
  uniform vec4 uFace; uniform vec3 uEyeCol; uniform vec3 uFaceInk;
  float ring(vec2 p, vec2 c, float r, float w, float aa) { return 1.0 - smoothstep(w - aa, w + aa, abs(length(p - c) - r)); }
  float disc(vec2 p, vec2 c, vec2 r, float aa) { return 1.0 - smoothstep(-aa, aa, length((p - c) / r) - 1.0); }
  // THE FACE (the locked kawaii design), painted analytically in object space on the front of
  // the head: crisp at any distance, conformal under the three-quarter turn.
  vec3 face(vec3 col, vec2 P, vec3 ink) {
    float aa = fwidth(P.y) * 1.2 + 1e-5;
    float side = P.x < 0.0 ? -1.0 : 1.0;
    float er = uFace.w;
    vec2 q = (P - vec2(side * uFace.y, uFace.z)) / vec2(er, er * 1.1); // unit eye frame, unmirrored
    float ae = aa / er;
    float eye = 1.0 - smoothstep(1.0 - ae, 1.0 + ae, length(q));
    col = mix(col, uEyeCol, eye);
    // highlights: a big upper-left sparkle and a small lower-right one
    col = mix(col, vec3(0.95), max(disc(q, vec2(-0.3, 0.33), vec2(0.36), ae), disc(q, vec2(0.36, -0.38), vec2(0.16), ae)) * eye);
    // nose: a small soft oval with a tiny shine; the "w" mouth under it
    float ny = uFace.z - 0.03;
    col = mix(col, ink, disc(P, vec2(0.0, ny), vec2(0.024, 0.016), aa));
    col = mix(col, vec3(0.92), disc(P, vec2(-0.007, ny + 0.006), vec2(0.008, 0.004), aa) * 0.8);
    float my = uFace.z - 0.06, mw = 0.0042, m = 0.0;
    for (int i = 0; i < 2; i++) { vec2 c = vec2((i == 0 ? -1.0 : 1.0) * 0.0185, my + 0.014); m = max(m, ring(P, c, 0.0185, mw, aa) * step(P.y, c.y)); }
    m = max(m, (1.0 - smoothstep(mw - aa, mw + aa, abs(P.x))) * step(my + 0.012, P.y) * step(P.y, ny));
    return mix(col, ink, m);
  }
  uniform vec4 uBrush; uniform vec3 uMossCol; uniform vec3 uMossShade; uniform vec3 uBounce;
  float vn3(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    float a = hash2(i.xy + i.z * 17.0), b = hash2(i.xy + vec2(1, 0) + i.z * 17.0), c = hash2(i.xy + vec2(0, 1) + i.z * 17.0), d = hash2(i.xy + vec2(1, 1) + i.z * 17.0);
    float e = hash2(i.xy + (i.z + 1.0) * 17.0), f2 = hash2(i.xy + vec2(1, 0) + (i.z + 1.0) * 17.0), g = hash2(i.xy + vec2(0, 1) + (i.z + 1.0) * 17.0), h2 = hash2(i.xy + vec2(1, 1) + (i.z + 1.0) * 17.0);
    return mix(mix(mix(a, b, f.x), mix(c, d, f.x), f.y), mix(mix(e, f2, f.x), mix(g, h2, f.x), f.y), f.z); }
  // object-space ellipse decal on the front (z > 0), crisp per pixel: 1 inside
  float decal(vec4 e, vec2 p, float aa) { if (e.z <= 0.0) return 0.0; float d = length((p - e.xy) / e.zw) - 1.0; return 1.0 - smoothstep(-aa, aa, d); }
  const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
  float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  vec3 satur(vec3 c, float s) { float l = dot(c, LUMA); return max(vec3(0.0), mix(vec3(l), c, s)); }
  void main() {
    vec3 N = normalize(vN);
    if (!gl_FrontFacing) N = -N;
    vec3 L = normalize(uLightDir);
    vec3 V = normalize(cameraPosition - vWP);
    float id = floor(vXrd.z + 0.5);
    float h = 0.5 * dot(N, L) + 0.5;
    float w = fwidth(h) + uS0.y;
    float b = smoothstep(uS0.x - w, uS0.x + w, h + 2.0 * uS0.z * (vXrd.x - 0.5));
    if (id == 2.0) {
      vec2 lh = vec2(dot(L, uHeadRight), dot(L, uHeadFwd));
      float u = dot(vWP - uHeadPos, uHeadRight) / uHeadR;
      float e = 0.06 + uS0.y;
      float bf = smoothstep(-e, e, u * sign(lh.x + 1e-5) + lh.y / max(length(lh), 1e-4));
      b = bf;
    }
    b = mix(b, 1.0, uS1.w);
    if (uS1.x > 8.5) { // T6 harness: the field the threshold reads, the band, and the character mask
      float fld = h + 2.0 * uS0.z * (vXrd.x - 0.5);
      if (id == 2.0) { vec2 lh = vec2(dot(L, uHeadRight), dot(L, uHeadFwd)); fld = 0.5 + 0.25 * (dot(vWP - uHeadPos, uHeadRight) / uHeadR * sign(lh.x + 1e-5) + lh.y / max(length(lh), 1e-4)); }
      gl_FragColor = vec4(clamp(fld, 0.0, 1.0), b, (uId > 0.999 && id != 3.0) ? 1.0 : 0.0, uId);
      return;
    }
    vec3 alb = mix(vCol, uSlime, uSlimeAmt);
    vec3 sh = mix(vShade, uSlime * vec3(0.32, 0.52, 0.95), uSlimeAmt);
    alb = mix(alb, uTint, uTintAmt); sh = mix(sh, uTint * 0.45, uTintAmt);
    if (vOP.z > 0.0) { // cream belly / muzzle decals and blush, analytic so their edges stay crisp
      float aa = fwidth(vOP.y) * 1.5 + 1e-4;
      float dm = max(decal(uDecA, vOP.xy, aa / max(uDecA.w, 1e-3)), decal(uDecB, vOP.xy, aa / max(uDecB.w, 1e-3))) * smoothstep(0.0, 0.03, vON.z + 0.25);
      alb = mix(alb, uDecCol, dm); sh = mix(sh, uDecShade, dm);
      float bl = max(decal(uBlush, vOP.xy, 0.25), decal(vec4(-uBlush.x, uBlush.yzw), vOP.xy, 0.25)) * uBlushCol.a;
      alb = mix(alb, uBlushCol.rgb, bl); sh = mix(sh, uBlushCol.rgb * vec3(0.8, 0.72, 0.85), bl);
    }
    if (uBrush.x > 0.0) { // painted rock: posterised brush noise in 4 tones, moss on the up-facing side
      float nb = vn3(vWP * uBrush.y) * 0.6 + vn3(vWP * uBrush.y * 2.7) * 0.4;
      float tone = floor(nb * 4.0) / 3.0;
      alb *= mix(0.86, 1.08, tone); sh *= mix(0.82, 1.06, tone);
      float mz = smoothstep(uBrush.w - 0.04, uBrush.w + 0.04, N.y * 0.7 + nb * 0.6);
      alb = mix(alb, uMossCol * mix(0.9, 1.1, tone), mz * uBrush.z); sh = mix(sh, uMossShade, mz * uBrush.z);
    }
    sh += uBounce * max(0.0, -N.y) * 0.6;
    alb = satur(alb, uS2.y); sh = satur(sh, uS2.y);
    vec3 lit = alb * uLightCol;
    float la = dot(lit, LUMA);
    lit *= min(1.0, uS0.w / max(la, 1e-4));
    vec3 col = mix(sh, lit, b);

    if (id == 1.0) {
      vec3 T = normalize(vec3(0.0, 1.0, 0.0) - N * N.y + 1e-4);
      float strand = hash2(vec2(floor(atan(N.z, N.x) * 18.0), 3.0));
      vec3 Tp = normalize(T + (0.25 + 0.25 * strand) * N);
      vec3 H = normalize(L + V);
      float th = dot(Tp, H);
      float ring = smoothstep(0.86, 0.9, pow(sqrt(max(0.0, 1.0 - th * th)), 24.0));
      vec3 rc = min(alb * 1.35 + 0.12, vec3(uS0.w));
      col = mix(col, rc, ring * uS2.w * (0.35 + 0.65 * b));
    }
    // thin hard rim on the light-facing back edge (not a Fresnel wash)
    float nv = 1.0 - clamp(dot(N, V), 0.0, 1.0);
    float rw = fwidth(nv) + 1e-4;
    bool hasRim = dot(uRimDir, uRimDir) > 0.0;
    float rim = smoothstep(0.86 - rw, 0.86 + rw, nv) * step(0.15, dot(N, hasRim ? normalize(uRimDir) : L)) * uS2.z;
    col = mix(col, hasRim ? min(mix(lit, uRimCol, 0.7) * 1.1, vec3(uS0.w)) : min(lit * 1.15 + 0.06, vec3(uS0.w)), rim * 0.6);
    // tone: screen-space patterns in the shadow side
    float s = 1.0 - b;
    vec2 fc = gl_FragCoord.xy;
    float ts = uS1.y;
    if (uS1.x == 1.0) { // Ben-Day dots: shadow colour printed as a dot screen over the lit fill
      vec2 q = mat2(0.966, -0.259, 0.259, 0.966) * fc / ts;
      float d = length(fract(q) - 0.5);
      float dot_ = 1.0 - smoothstep(0.30, 0.36, d);
      col = mix(lit, sh, max(dot_ * step(0.2, s), step(0.85, s)) * uS1.z + (1.0 - uS1.z) * s);
    } else if (uS1.x == 2.0) { // manga: dark fills ink solid, light fills paper, shadow is screentone
      float v = dot(alb, LUMA);
      vec2 q = mat2(0.707, -0.707, 0.707, 0.707) * fc / ts;
      float d = length(fract(q) - 0.5);
      float tone = 1.0 - smoothstep(0.26, 0.32, d);
      vec3 inkc = uInk; vec3 pap = uPaper;
      vec3 m = v < 0.08 ? inkc : (v < 0.35 ? mix(pap, inkc, max(tone, step(0.5, s))) : mix(pap, inkc, tone * step(0.5, s)));
      col = mix(col, m, uS2.x);
    } else if (uS1.x == 3.0) { // watercolour: pigment granulation, darker where pigment pools
      float g = hash2(floor(fc / 2.0)) * 0.5 + hash2(floor(fc / 7.0) + 9.0) * 0.5;
      col *= 1.0 - uS1.z * (g - 0.5) * 0.35 - uS1.z * 0.12 * s;
    } else if (uS1.x == 4.0) { // hatching: parallel strokes in shadow, cross-hatch in deep shadow
      float l1 = step(0.55, fract((fc.x + fc.y) / ts));
      float l2 = step(0.55, fract((fc.x - fc.y) / ts));
      float hatch = max(l1 * step(0.35, s), l2 * step(0.8, s));
      col = mix(col, uInk, hatch * uS1.z * 0.85); // ink strokes over the authored shadow
    }
    if (id == 3.0) col = vCol;
    if (uFace.x > 0.0 && vOP.z > 0.1 && vOP.y > 0.4 && vON.z > 0.0) col = face(col, vOP.xy, uFaceInk);
    gl_FragColor = vec4(col + uEmit, uId);
  }`;

export function animeMaterial(shared, o = {}) {
  return new ShaderMaterial({
    uniforms: {
      ...shared,
      uMorph: { value: 0 }, uStagger: { value: 0 }, uSmear: { value: new Vector4() },
      uHeadPos: { value: new Vector3() }, uHeadFwd: { value: new Vector3(0, 0, 1) }, uHeadRight: { value: new Vector3(1, 0, 0) }, uHeadR: { value: 0.2 },
      uEmit: { value: new Color(0, 0, 0) },
      // alpha carries the set-line id: 0 sky, (0,1) sets, 1 characters (hulled; set lines skip them)
      uId: { value: o.id ?? 1 },
      uSlime: { value: new Color("#4fb6ff") }, uSlimeAmt: { value: 0 },
      uTint: { value: new Color(1, 1, 1) }, uTintAmt: { value: 0 },
      uDecA: { value: new Vector4() }, uDecB: { value: new Vector4() }, uDecCol: { value: new Color() }, uDecShade: { value: new Color() },
      uBlush: { value: new Vector4() }, uBlushCol: { value: new Vector4() },
      uFace: { value: new Vector4() }, uEyeCol: { value: new Color("#2e211d") }, uFaceInk: { value: new Color("#4a3f3c") },
      uBrush: { value: new Vector4() }, uMossCol: { value: new Color("#7aa83f") }, uMossShade: { value: new Color("#2f5a44") }, uBounce: { value: new Color(0, 0, 0) },
    },
    vertexShader: SURF_V,
    fragmentShader: SURF_F,
  });
}

// INK: inverted hull. Width in px, w = W * G_vertex * mix(1, clamp(dRef/d, .6, 1.4), distanceAware),
// offset in clip space so it is a pixel width at any distance. Ink colour is the
// albedo darkened and saturated (coloured line art), or the style's ink.
const HULL_V = /* glsl */ `${COMMON_V}
  uniform vec2 uRes; uniform vec4 uLine; uniform float uLineRef; uniform float uLineMul; uniform float uHullFade; uniform float uConst;
  varying vec3 vCol;
  void main() {
    vec3 n;
    vec3 p = morphed(n);
    vCol = aCol;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vec4 c = projectionMatrix * mv;
    vec2 d = (projectionMatrix * vec4(normalize(normalMatrix * n), 0.0)).xy;
    float dist = max(0.05, -mv.z);
    float px = uLine.x * uLineMul * aXrd.y * mix(1.0, clamp(uLineRef / dist, 0.6, 1.4), uLine.y * (1.0 - uConst)) * (uRes.y / 800.0) * uLine.w * (1.0 - gMorphT * uHullFade);
    c.xy += normalize(d + 1e-6) * px * 2.0 / uRes * c.w;
    gl_Position = c;
  }`;
const HULL_F = /* glsl */ `
  uniform vec3 uInk; uniform vec4 uLine; uniform vec3 uSlime; uniform float uSlimeAmt; uniform vec3 uInkOwn; uniform float uInkOwnAmt;
  varying vec3 vCol;
  const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
  void main() {
    vec3 a = mix(vCol, uSlime, uSlimeAmt);
    float l = dot(a, LUMA);
    vec3 ink = max(vec3(0.0), mix(vec3(l), a, 1.3)) * 0.3;
    ink = mix(ink, uInkOwn, uInkOwnAmt);
    gl_FragColor = vec4(mix(ink, uInk, uLine.z), 1.0);
  }`;

export function hullMaterial(shared, o = {}) {
  return new ShaderMaterial({
    side: BackSide,
    uniforms: {
      uRes: shared.uRes, uLine: shared.uLine, uInk: shared.uInk,
      uMorph: { value: 0 }, uStagger: { value: 0 }, uSmear: { value: new Vector4() },
      uLineRef: { value: o.ref ?? 4 }, uLineMul: { value: o.mul ?? 1 }, uHullFade: { value: 0 }, uConst: { value: o.constant ? 1 : 0 },
      uSlime: { value: new Color("#4fb6ff") }, uSlimeAmt: { value: 0 },
      uInkOwn: { value: new Color(o.ink ?? "#000000") }, uInkOwnAmt: { value: o.ink ? 1 : 0 },
    },
    vertexShader: HULL_V,
    fragmentShader: HULL_F,
  });
}
