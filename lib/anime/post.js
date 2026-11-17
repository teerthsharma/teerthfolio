// THE COMPOSITE, in frame order (S0 shadow is the engine's): plate (layer 0, per shot) and cel (layer 1, per step)
// into half-float targets with the id in alpha; render/lines.js line buffers for both; render/satsuei.js composites
// them with the photography; then
//   1 dual-Kawase pyramid (4 down, 3 up) carrying rgb = emissive excess
//     max(c - 1, 0) (bloom) and a = luma (diffusion glow), in one chain;
//   2 light shafts at half resolution (GPU Gems 3 ch. 13), only when a style
//     and tier ask: C = sum decay^i I(uv - i (uv - pL) density / N), N = 24;
//   3 render/lens.js gathered depth of field (FINAL's blur mix when it falls back);
//   4 ONE fused fullscreen pass (FINAL) into an LDR target: shockwave warp, misregistration / impact
//     aberration, set lines (only with off "lines"), shafts, bloom, diffusion c + k max(blur(L) - L, 0),
//     palette and posterise, grading with lift locked at 0, paper, focus/speed lines,
//     impact frames, IGN grain, vignette, letterbox (studio ink), linear -> sRGB,
//     gradeCap last (luma <= 0.92, ink lift);
//   5 render/lens.js FXAA to the canvas.
import { glslFor } from "./tools/index.js";
import { AddEquation, AdditiveBlending, AlwaysDepth, BackSide, BufferAttribute, BufferGeometry, Color, CustomBlending, Matrix4, Vector3, DepthTexture, HalfFloatType, LinearFilter, Mesh, NearestFilter, NoBlending, NormalBlending, OneFactor, OneMinusSrcAlphaFactor, OrthographicCamera, Scene, ShaderMaterial, SrcAlphaFactor, UnsignedByteType, UnsignedIntType, Vector2, Vector4, WebGLRenderTarget, ZeroFactor } from "three";
import { LinePass } from "./render/lines.js";
import { Satsuei } from "./render/satsuei.js";
import { Lens } from "./render/lens.js";
import { RX } from "./render/common.glsl.js";
import { shadowUniforms, SHADOW_GLSL } from "./render/shadow.js";

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
  uniform vec4 uBg; uniform vec3 uHaze; uniform vec4 uHazeR; uniform vec3 uKuwaD; varying vec2 vUv;
  ${glslFor(["kuwahara"])}
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
    float R = uBg.x * mix(1.0, uKuwaD.z, smoothstep(uKuwaD.x, uKuwaD.y, lin(texture2D(tDepth, vUv).r)));
    // painterly smoothing: tools/kuwahara.js (emissive pixels stay sharp)
    if (R > 0.5) col = mix(col, uBg.w > 0.5 ? kuwahara8(tIn, vUv, uRes, R) : kuwahara4(tIn, vUv, uRes, R), step(c0.r + c0.g + c0.b, 3.0));
    if (c0.a > 0.001) { // sets only: the sky keeps its own colour
      float z = lin(texture2D(tDepth, vUv).r);
      col = mix(col, uHaze, uHazeR.x * (uHazeR.w > 0.0 ? 1.0 - exp(-uHazeR.w * max(z - uHazeR.y, 0.0)) : smoothstep(uHazeR.y, uHazeR.z, z)));
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
  uniform sampler2D tPlate; uniform sampler2D tPlateD; uniform sampler2D tChar; uniform sampler2D tCharD; uniform sampler2D tFx; uniform float uFx; varying vec2 vUv;
  void main() {
    vec4 p = texture2D(tPlate, vUv), c = texture2D(tChar, vUv);
    float cd = texture2D(tCharD, vUv).r;
    if (c.a > 0.5 && cd < texture2D(tPlateD, vUv).r) gl_FragColor = c;     // depth-written: the character is in front
    else if (cd >= 0.9999 && (c.a > 0.001 || max(max(c.r, c.g), c.b) > 0.001)) gl_FragColor = vec4(p.rgb * (1.0 - c.a) + c.rgb, p.a);  // no depth written: additive / alpha overlay
    else gl_FragColor = p;
    if (uFx > 0.5) { vec4 o = texture2D(tFx, vUv); gl_FragColor.rgb = gl_FragColor.rgb * (1.0 - clamp(o.a, 0.0, 1.0)) + o.rgb; }
  }`;
// LAYER-1 OVERLAYS (no depth write; an over blend, or an add blend that is premultiplied or keeps the target alpha, so alpha is coverage and not opacity) are drawn apart from the cel into fxRT, against PRIME's depth, and composited after the lines and the photography; any other transparent blend stays on the cel. An overlay lies over the whole plate and behind the cast (a veil), unless it or an ancestor has userData.plateDepth = true: then nearer set geometry hides it; veils are drawn first. While the cel is drawn the overlays wait on layer 0, where a kit mirror's own pass still sees them.
const keepsAlpha = (m) => m.premultipliedAlpha === true || (m.blendSrcAlpha === ZeroFactor && m.blendDstAlpha === OneFactor);
const overlay = (m) => m.transparent === true && m.depthWrite === false && (m.blending === NormalBlending || (m.blending === AdditiveBlending && m.premultipliedAlpha === true)
  || (m.blending === CustomBlending && m.blendEquation === AddEquation && (m.blendSrc === OneFactor || m.blendSrc === SrcAlphaFactor)
    && (m.blendDst === OneFactor ? keepsAlpha(m) : m.blendDst === OneMinusSrcAlphaFactor && (m.blendSrcAlpha ?? m.blendSrc) !== ZeroFactor)));
// a set id of exactly 0.5 (engine.prop's and kit/surface.js's default, the plate's convention) is not above the cel threshold, so on layer 1 it is drawn as a solid: above 2/3, so a pixel with 3 of 4 MSAA samples covered still shows, as a character's does
const SET_ID = 0.5, SOLID_ID = 0.75;
const inWorld = (o) => { for (; o; o = o.parent) if (o.userData.plateDepth !== undefined) return o.userData.plateDepth ? 1 : 0; return 0; };
// PRIME: the cel's depth where satsuei shows the cel (id above 0.5; an MSAA edge whose resolved depth missed takes its neighbours'), and with uPlate the nearer of it and the plate, the plate one pixel of its own slope farther (at most 2% of its distance) so an overlay lying on a set surface is not cut by it.
const PRIME = /* glsl */ `
  uniform sampler2D tPlateD; uniform sampler2D tChar; uniform sampler2D tCharD; uniform vec2 uPx; uniform float uPlate; varying vec2 vUv;
  void main() {
    float pd = texture2D(tPlateD, vUv).r, cd = texture2D(tCharD, vUv).r;
    if (texture2D(tChar, vUv).a <= 0.5) cd = 1.0;
    else if (cd >= 0.9999) cd = min(min(texture2D(tCharD, vUv + vec2(uPx.x, 0.0)).r, texture2D(tCharD, vUv - vec2(uPx.x, 0.0)).r),
      min(texture2D(tCharD, vUv + vec2(0.0, uPx.y)).r, texture2D(tCharD, vUv - vec2(0.0, uPx.y)).r));
    gl_FragColor = vec4(0.0);
    gl_FragDepth = uPlate > 0.5 ? min(cd, pd + min(fwidth(pd), 0.02 * (1.0 - pd))) : cd;
  }`;
// frame law, a 2D camera move: the crop window uWin of the overscanned plate, colour and depth, into the frame-sized plate
const CROP = /* glsl */ `
  uniform sampler2D tIn; uniform sampler2D tDepth; uniform vec4 uWin; varying vec2 vUv;
  void main() { vec2 uv = uWin.xy + vUv * uWin.zw; gl_FragColor = texture2D(tIn, uv); gl_FragDepth = texture2D(tDepth, uv).r; }`;

// lab views: 4 the line buffers (cel white, plate grey), 5 the cast-shadow term as greys (sky black)
const VIEW = /* glsl */ `
  uniform sampler2D tLineP; uniform sampler2D tLineC; uniform sampler2D tDA; uniform sampler2D tDB;
  uniform mat4 uInvProj; uniform mat4 uCamW; uniform vec2 uRes; uniform float uMode; varying vec2 vUv;
  ${RX}
  ${SHADOW_GLSL}
  void main() {
    float da = texture2D(tDA, vUv).r, db = texture2D(tDB, vUv).r, d = min(da, db);
    vec3 n = db < da ? rxNormal(tDB, vUv, 1.0 / uRes, uInvProj) : rxNormal(tDA, vUv, 1.0 / uRes, uInvProj);
    float cs = rxCast((uCamW * vec4(rxViewPos(vUv, d, uInvProj), 1.0)).xyz, mat3(uCamW) * n);
    vec3 ln = vec3(max(texture2D(tLineC, vUv).r, 0.5 * texture2D(tLineP, vUv).r));
    gl_FragColor = vec4(uMode < 4.5 ? ln : vec3(d < 1.0 ? 1.0 - 0.8 * cs : 0.0), 1.0);
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
  uniform vec4 uImpact; uniform vec3 uImpA; uniform vec3 uImpB; uniform sampler2D tLineP; uniform sampler2D tLineC; uniform vec2 uLineK;
  uniform vec4 uFocus; uniform vec3 uFocusCol; uniform vec4 uShock;
  uniform vec4 uInkT; uniform vec3 uInkPaper; uniform vec3 uInkInk; uniform vec3 uInkRed; uniform float uBox; uniform vec3 uInkFloor;
  uniform float uView; uniform vec2 uNotan;   // lab views: 0 full, 2 notan greys, 3 set-line ids (1 is the flat view in material.js)
  // frame law (cutscenes/framework/law.js): split tone, grain weight and seed, flat and invert frames, iris, bar ink, lift edges, shake, spokes
  uniform vec3 uFSh; uniform vec3 uFHi; uniform vec2 uFGrade; uniform vec3 uFGrain; uniform vec2 uFlatK; uniform vec3 uFlatCol; uniform float uInv;
  uniform vec4 uIris; uniform vec3 uIrisCol; uniform vec3 uFInk; uniform vec2 uLift; uniform vec3 uShake; uniform vec4 uFocus2;
  varying vec2 vUv;
  const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
  ${glslFor(["grade", "huegrade"])}
  uniform vec4 uHueG; uniform vec3 uHueD; uniform vec3 uHueM; uniform vec3 uHueL;  // single-hue grade: x amount, y accent hue, z accent width
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
  float lin(float d) { float z = d * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
  vec3 toSRGB(vec3 c) { c = clamp(c, 0.0, 1.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
  float cells(vec2 p) { vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(x, y); vec2 o = vec2(hash(i + g), hash(i + g + 7.0));
      float d = length(g + o - f); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
    return d2 - d1; }
  vec3 gradeCap(vec3 c) {
    float Y = dot(c, LUMA);
    if (Y > 0.92) c *= 0.92 / Y;
    Y = dot(c, LUMA);
    return mix(uInkFloor, c, smoothstep(uLift.x, uLift.y, Y));
  }
  void main() {
    vec2 px = 1.0 / uRes;
    vec2 uv = vUv;
    if (uShake.z > 0.0) uv = 0.5 + (vUv - 0.5) * (1.0 - uShake.z) + uShake.xy; // frame law: the shake beat, pushed in by its own reach
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
    if (uHueG.x > 0.0) col = hueGrade(col, uHueD, uHueM, uHueL, uHueG.x, accentMask(col, uHueG.y, uHueG.z)); // tools/huegrade.js
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
      if (uFocus.w < 0.5) { vec2 d = (vUv - uFocus.xy) * asp; float r = length(d);
        if (uFocus2.z >= 0.0) d = (vUv - uFocus2.zw) * asp; // frame law: spokes (x), taper (y), a converge point of their own (zw)
        float a = atan(d.y, d.x) / 6.28318 + 0.5; float N = uFocus2.x;
        float bin = floor(a * N); float rnd = hash(vec2(bin, uSeed));
        m = step(1.0 - 0.35 * rnd * mix(1.0, smoothstep(0.2, 0.9, r), uFocus2.y), fract(a * N)) * smoothstep(0.28 + 0.25 * hash(vec2(bin, uSeed + 3.0)), 0.75, r);
      } else { float bin = floor(vUv.y * 140.0); float rnd = hash(vec2(bin, uSeed));
        float len = 0.25 + 0.5 * hash(vec2(bin, uSeed + 1.0)); float st = fract(hash(vec2(bin, uSeed + 2.0)) - uTime * 2.5);
        float x = fract(vUv.x - st); m = step(0.75, rnd) * step(x, len) * step(0.35, fract(vUv.y * 140.0)) * smoothstep(0.0, 0.3, abs(vUv.y - uFocus.y)); }
      o = mix(o, uFocusCol, m * uFocus.z);
    }
    // ---- FRAME LAW TAIL, fixed order: grade, grain, impact / flat / invert frames, iris, letterbox; gradeCap last. A bypass frame takes o0
    vec3 o0 = o;
    if (uFlatK.x > 0.5 && uFlatK.x < 1.5) o = uFlatCol;
    if (uFGrade.y > 0.0) o = mix(o, vec3(dot(o, LUMA)), uFGrade.y);
    if (uFGrade.x > 0.0) o = mix(o, mix(uFSh, uFHi, smoothstep(0.2, 0.8, dot(o, LUMA))), uFGrade.x);
    o += (ign(gl_FragCoord.xy, uFGrain.z > 0.5 ? uFGrain.y : uSeed) - 0.5) * uGrain * mix(1.0, 1.0 - clamp(dot(o, LUMA), 0.0, 1.0), uFGrain.x);     // tools/grade.js
    o = vignette(o, vUv, uVig);
    // impact frames: 1 two-tone, 2 inverted, 3 two-tone swapped. Frame-locked, no easing. The line buffers' strokes
    // land on the ink side: a traced line over a pale fill stays above the threshold and would vanish
    if (uImpact.x > 0.5) { float lk = max(uLineK.x * max(step(c0.a, 0.979), 1.0 - uLineK.y) * texture2D(tLineP, uv).r, uLineK.y * texture2D(tLineC, uv).r);
      float l = dot(o, LUMA) * (1.0 - step(0.35, lk));
      if (uImpact.x < 1.5) o = l > uImpact.y ? uImpA : uImpB;
      else if (uImpact.x < 2.5) o = 1.0 - o;
      else o = l > uImpact.y ? uImpB : uImpA; }
    if (uInv > 0.5) o = clamp(0.92 - (uInv > 1.5 ? o0 : o), 0.0, 1.0);
    if (uFlatK.x > 1.5) o = uFlatCol;
    if (uIris.z >= 0.0) { float d = length((vUv - uIris.xy) * vec2(uRes.x / uRes.y, 1.0)), e = 1.0 / uRes.y; // radius in frame heights, ring in px
      o = mix(o, uIrisCol, step(0.5, uIris.w) * smoothstep(uIris.z - (uIris.w + 1.0) * e, uIris.z - uIris.w * e, d));
      o = mix(o, uFInk, max(smoothstep(uIris.z - e, uIris.z + e, d), step(uIris.z, 0.0))); }
    if (abs(vUv.y - 0.5) > 0.5 - uBox && uFlatK.x * uFlatK.y < 0.5) o = uFInk; // letterbox in the dock's ink (a flat frame may paint over it)
    // ---- end of the frame law tail
    // lab views (uView): 3 ids bypass the grade and letterbox; 2 notan takes three greys from the capped luma; 0 and 1 are the router's line
    if (uView > 2.5 && uView < 3.5) gl_FragColor = vec4(vec3(c0.a), 1.0);
    else if (uView > 1.5 && uView < 2.5) { float y = dot(gradeCap(o), LUMA); gl_FragColor = vec4(vec3(y < uNotan.x ? 0.08 : y < uNotan.y ? 0.45 : 0.90), 1.0); }
    else gl_FragColor = vec4(gradeCap(o), 1.0);
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
      uHueG: { value: new Vector4() }, uHueD: { value: new Color() }, uHueM: { value: new Color() }, uHueL: { value: new Color() },
      uPal: { value: Array.from({ length: 8 }, () => new Color()) }, uPalN: { value: 0 }, uPalMix: { value: 0 },
      uPaperCol: { value: new Color(1, 1, 1) }, uPaper: { value: new Vector4() },
      uMisreg: { value: 0 }, uCA: { value: 0 }, uGrain: { value: 0.02 }, uVig: { value: 0.25 }, uMono: { value: 0 },
      uImpact: { value: new Vector4(0, 0.5, 0, 0) }, uImpA: { value: new Color(1, 1, 1) }, uImpB: { value: new Color(0, 0, 0) },
      tLineP: { value: null }, tLineC: { value: null }, uLineK: { value: new Vector2() },
      uFocus: { value: new Vector4(0.5, 0.5, 0, 0) }, uFocusCol: { value: new Color(0, 0, 0) }, uShock: { value: new Vector4(0.5, 0.5, 0, 0) },
      uInkT: { value: new Vector4() }, uInkPaper: { value: new Color("#efeeee") }, uInkInk: { value: new Color("#0f0e15") }, uInkRed: { value: new Color("#7a1e17") }, uBox: { value: 0 }, uInkFloor: { value: new Color(14 / 255, 12 / 255, 22 / 255) },
      uView: { value: 0 }, uNotan: { value: new Vector2(0.12, 0.40) },
      // frame law: every one a no-op at these values (the cutscene player writes them, framework.js applyFrame)
      uFSh: { value: new Color(0, 0, 0) }, uFHi: { value: new Color(1, 1, 1) }, uFGrade: { value: new Vector2() }, uFGrain: { value: new Vector3() }, uFlatK: { value: new Vector2() }, uFlatCol: { value: new Color(1, 1, 1) }, uInv: { value: 0 },
      uIris: { value: new Vector4(0.5, 0.5, -1, 0) }, uIrisCol: { value: new Color(1, 1, 1) }, uFInk: { value: new Color(14 / 255, 12 / 255, 22 / 255) }, uLift: { value: new Vector2(0.035, 0.08) }, uShake: { value: new Vector3() }, uFocus2: { value: new Vector4(160, 0, -1, -1) },
    };
    // plates: off until a shot opts in (composer.plates = true) and tags its characters layer 1
    this.plates = false;
    const rt = (o2) => new WebGLRenderTarget(4, 4, { type, minFilter: NearestFilter, magFilter: NearestFilter, ...o2 });
    this.plateRT = rt({ depthTexture: new DepthTexture(4, 4, UnsignedIntType), samples: this.samples });
    this.plateCol = rt({ depthBuffer: false, minFilter: LinearFilter, magFilter: LinearFilter });
    this.charRT = rt({ depthTexture: new DepthTexture(4, 4, UnsignedIntType), samples: this.samples });
    this.comp = rt({ depthBuffer: false });
    this.pu = { tIn: { value: null }, tDepth: { value: null }, uRes: { value: new Vector2() }, uNear: { value: 0.1 }, uFar: { value: 100 }, uBg: { value: new Vector4(0, 1, 0, 0) }, uKuwaD: { value: new Vector3(0, 1, 1) }, uHaze: { value: new Color(1, 1, 1) }, uHazeR: { value: new Vector4(0, 3, 30, 0) },
      uRamp: { value: [new Color(), new Color(), new Color()] }, uRampAmt: { value: 0 },
      uFlower: { value: 0 }, uFil: { value: new Vector4() }, uFilCol: { value: new Color() } };
    this.mPlate = mk(PLATE, this.pu);
    this.mComp = mk(COMP, { tPlate: { value: this.plateCol.texture }, tPlateD: { value: this.plateRT.depthTexture }, tChar: { value: this.charRT.texture }, tCharD: { value: this.charRT.depthTexture }, tFx: { value: null }, uFx: { value: 0 } });
    this.fxRT = rt({ samples: this.samples }); this.fx = false; this.fxo = []; this.lift = [];
    this.mPrime = new ShaderMaterial({ vertexShader: QUAD_V, fragmentShader: PRIME, depthFunc: AlwaysDepth, blending: NoBlending,
      uniforms: { tPlateD: { value: this.plateRT.depthTexture }, tChar: { value: this.charRT.texture }, tCharD: { value: this.charRT.depthTexture }, uPx: { value: new Vector2() }, uPlate: { value: 0 } } });
    const prev = renderer.getRenderTarget();
    this.quad.material = this.mPrime; renderer.setRenderTarget(this.fxRT); renderer.compile(this.qs, this.qc); renderer.setRenderTarget(prev);
    this.plateKey = null; this.charKey = null;
    this.over = null; this.cropKey = null;
    this.mCrop = new ShaderMaterial({ vertexShader: QUAD_V, fragmentShader: CROP, uniforms: { tIn: { value: null }, tDepth: { value: null }, uWin: { value: new Vector4(0, 0, 1, 1) } }, depthFunc: AlwaysDepth });
    this.mFinal = mk(FINAL, this.u);
    this.w = 0; this.h = 0;
    // shared: material.sharedUniforms() (light + the shadow map); a composer made without it gets its own, shadow off
    this.shared = o.shared ?? null;
    this.shadowU = this.shared ?? shadowUniforms();
    this.off = new Set();
    this.linePass = new LinePass(renderer, { tier: this.tier });
    this.lineP = this.linePass.target(); this.lineC = this.linePass.target();
    this.u.tLineP.value = this.lineP.texture; this.u.tLineC.value = this.lineC.texture;
    this.satsuei = new Satsuei(renderer, { type, tier: this.tier, shadow: this.shadowU });
    this.lens = new Lens(renderer, { type, tier: this.tier });
    this.ldr = new WebGLRenderTarget(4, 4, { type: UnsignedByteType, minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: false });
    // the cel's flat paint, for the line pass (material.js uFlat 2); FX and hulls are left out of it
    this.paintRT = new WebGLRenderTarget(4, 4, { type: UnsignedByteType, minFilter: NearestFilter, magFilter: NearestFilter });
    this.hid = [];
    this.gpu = null; // lab timing (?gpu=1): { ms: { pass: milliseconds } }, by gl.finish round each pass
    this.mView = mk(VIEW, { ...this.shadowU, tLineP: { value: this.lineP.texture }, tLineC: { value: this.lineC.texture }, tDA: { value: null }, tDB: { value: null },
      uInvProj: { value: new Matrix4() }, uCamW: { value: new Matrix4() }, uRes: this.u.uRes, uMode: { value: 4 } });
    this.cam = null; // the camera the current plate and cel were drawn with
    this.focus = null; // the hero's chest (engine.shadowFocus): para and wrap are sized by it
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
    for (const t of [this.plateRT, this.plateCol, this.charRT, this.comp, this.ldr, this.paintRT, this.fxRT]) t.setSize(w, h);
    this.mPrime.uniforms.uPx.value.set(1 / w, 1 / h);
    this.linePass.setSize(w, h); this.satsuei.setSize(w, h); this.lens.setSize(w, h);
    this.pu.uRes.value.set(w, h);
    this.plateKey = null; this.charKey = null;
  }
  // frame law: the overscanned plate targets, s frames wide and tall (colour + depth, and the painted colour)
  overscan(s) {
    const type = this.type, k = Math.min(s, 4096 / Math.max(this.w, this.h, 1)), w = Math.max(4, Math.round(this.w * k)), h = Math.max(4, Math.round(this.h * k));
    const O = (this.over ??= {
      rt: new WebGLRenderTarget(w, h, { type, minFilter: NearestFilter, magFilter: NearestFilter, depthTexture: new DepthTexture(w, h, UnsignedIntType), samples: this.samples }),
      col: new WebGLRenderTarget(w, h, { type, minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: false }),
    });
    if (O.rt.width !== w || O.rt.height !== h) { O.rt.setSize(w, h); O.col.setSize(w, h); }
    return O;
  }
  // at load, so neither the targets nor the crop program first appear on a cut
  warmOverscan(s) {
    const O = this.overscan(s), c = this.mCrop.uniforms, prev = this.r.getRenderTarget();
    c.tIn.value = O.col.texture; c.tDepth.value = O.rt.depthTexture;
    this.pass(this.mCrop, this.plateRT);
    this.r.setRenderTarget(prev); this.plateKey = null;
  }
  // the static world once per (shot, style), painted; the characters only when their step changes; lines with each
  layered(scene, camera, keys, lines, lightDir) {
    const r = this.r, mask = camera.layers.mask, sp = this.shadowU.uShadowP.value, seed = keys.seed ?? 0, bg = scene.background;
    const ov = keys.over ?? null, A = camera.aspect, pseed = keys.plateSeed ?? seed; // ov: { s, win: [x, y, w, h] y down, key }; the camera arrives with that window as its view offset
    if (keys.plate !== this.plateKey) {
      const on = sp.x, big = ov ? this.overscan(ov.s) : null;
      sp.x = 0; // satsuei lays the cel's current shadow on the plate; baking one in would double it
      camera.layers.set(0);
      if (big) camera.clearViewOffset(); // the whole overscanned frame, once; a pan or zoom never renders the world again
      if (bg?.isColor) scene.background = null; // a Color sky clears at id 0, as in the single-target path, so haze and lens read it as sky
      r.setRenderTarget(big ? big.rt : this.plateRT); r.setClearColor(bg?.isColor ? bg : 0x000000, 0); r.clear(); r.render(scene, camera);
      sp.x = on; scene.background = bg;
      if (big) { camera.setViewOffset(A, 1, ov.win[0] * A, ov.win[1], ov.win[2] * A, ov.win[3]); this.pu.uRes.value.set(big.rt.width, big.rt.height); }
      this.pu.tIn.value = (big ? big.rt : this.plateRT).texture; this.pu.tDepth.value = (big ? big.rt : this.plateRT).depthTexture;
      this.pu.uNear.value = camera.near; this.pu.uFar.value = camera.far;
      this.pass(this.mPlate, big ? big.col : this.plateCol);
      this.pu.uRes.value.set(this.w, this.h);
      if (lines && !big) this.linePass.render({ tCol: this.plateRT.texture, tDepth: this.plateRT.depthTexture, camera, target: this.lineP, lightDir, seed: pseed });
      this.plateKey = keys.plate; this.charKey = null; this.cropKey = null;
    }
    if (ov && ov.key !== this.cropKey) {
      const c = this.mCrop.uniforms, big = this.over;
      c.uWin.value.set(ov.win[0], 1 - ov.win[1] - ov.win[3], ov.win[2], ov.win[3]);
      c.tIn.value = big.rt.texture; c.tDepth.value = big.rt.depthTexture; this.pass(this.mCrop, this.plateRT);
      c.tIn.value = big.col.texture; this.pass(this.mCrop, this.plateCol);
      if (lines) this.linePass.render({ tCol: this.plateRT.texture, tDepth: this.plateRT.depthTexture, camera, target: this.lineP, lightDir, seed: pseed });
      this.cropKey = ov.key; this.charKey = null;
    }
    if (keys.char !== this.charKey) {
      // a Color background would clear the cel to bg at alpha 1, which the composite reads as an overlay over the whole plate
      camera.layers.set(1); scene.background = null;
      const fxo = this.fxo, lift = this.lift, ovl = !this.off.has("overlay"), ids = !this.off.has("ids");
      this.fxBack();
      scene.traverseVisible((o) => {
        if (!(o.layers.mask & 2) || !o.material) return;
        const ms = [].concat(o.material);
        if (ovl && ms.every(overlay)) fxo.push(o, o.layers.mask, inWorld(o));
        else if (ids) for (const m of ms) { const u = m.uniforms?.uId; if (u && u.value === SET_ID) { u.value = SOLID_ID; lift.push(u); } }
      });
      for (let i = 0; i < fxo.length; i += 3) fxo[i].layers.set(0);
      this.tick("cel");
      r.setRenderTarget(this.charRT); r.setClearColor(0x000000, 0); r.clear(); r.render(scene, camera);
      for (const u of lift) u.value = SET_ID;
      lift.length = 0;
      this.fx = fxo.length > 0;
      if (this.fx) {
        this.tick("fx");
        const pm = this.mPrime;
        for (let w = 0, drawn = false; w < 2; w++) {
          let n = 0;
          for (let i = 0; i < fxo.length; i += 3) if (fxo[i + 2] === w) { fxo[i].layers.set(2 + w); n++; }
          if (!n) continue;
          pm.uniforms.uPlate.value = w; pm.colorWrite = !drawn; r.autoClear = !drawn;
          this.pass(pm, this.fxRT);
          camera.layers.set(2 + w); r.autoClear = false; r.render(scene, camera);
          drawn = true;
        }
        camera.layers.set(1); r.autoClear = true; pm.colorWrite = true;
        this.fxBack();
      }
      const paint = lines && this.shared && this.linePass.params.paint > 0 && this.tier >= 2;
      if (paint) {
        this.tick("paint");
        const hid = this.hid, flat = this.shared.uFlat, was = flat.value;
        scene.traverseVisible((o) => { if ((o.layers.mask & 2) && o.material && (o.isPoints || o.isLine || o.isSprite || [].concat(o.material).some((m) => m.transparent || m.depthWrite === false || m.side === BackSide))) hid.push(o); });
        for (const o of hid) o.visible = false;
        flat.value = 2;
        r.setRenderTarget(this.paintRT); r.clear(); r.render(scene, camera);
        flat.value = was;
        for (const o of hid) o.visible = true;
        hid.length = 0;
      }
      scene.background = bg;
      this.tick("lines");
      if (lines) this.linePass.render({ tCol: this.charRT.texture, tDepth: this.charRT.depthTexture, camera, target: this.lineC, lightDir, seed, tPaint: paint ? this.paintRT.texture : null });
      this.tick(null);
      this.cam = (this.cam ??= camera.clone()).copy(camera);
      this.charKey = keys.char;
    }
    camera.layers.mask = mask;
    return this.cam;
  }
  fxBack() {
    const f = this.fxo;
    for (let i = 0; i < f.length; i += 3) f[i].layers.mask = f[i + 1];
    for (const u of this.lift) u.value = SET_ID;
    f.length = this.lift.length = 0;
  }
  tick(name) {
    const g = this.gpu;
    if (!g) return;
    this.r.getContext().finish();
    const now = performance.now();
    if (g.name) g.ms[g.name] = g.ms[g.name] === undefined ? now - g.t : g.ms[g.name] * 0.9 + (now - g.t) * 0.1;
    g.name = name; g.t = now;
  }
  pass(m, target) {
    this.quad.material = m;
    this.r.setRenderTarget(target);
    this.r.render(this.qs, this.qc);
  }
  // rect: [x, y, w, h] in drawing-buffer px of the canvas (null = full canvas)
  render(scene, camera, rect = null, shafts = null, keys = null) {
    const r = this.r, off = this.off, lightDir = this.shared?.uLightDir.value ?? null;
    // the line buffers' only reader is satsuei, so without it the old FINAL set lines come back
    const sat = !off.has("satsuei"), lines = sat && !off.has("lines") && this.linePass.ok;
    this.linePass.tier = this.lens.tier = this.tier;
    if (this.satsuei.tier !== this.tier) { this.satsuei.tier = this.tier; this.satsuei.setSize(this.w, this.h); }
    let S = this.scene, D = this.scene.depthTexture, D2 = D, cam = camera;
    if (this.plates && keys) {
      cam = this.layered(scene, camera, keys, lines, lightDir);
      D = this.plateRT.depthTexture; D2 = this.charRT.depthTexture; S = this.comp;
      this.tick("satsuei");
      const tFx = this.fx ? this.fxRT.texture : null, cu = this.mComp.uniforms;
      if (sat) this.satsuei.render({ tPlate: this.plateCol.texture, tPlateD: D, tCel: this.charRT.texture, tCelD: D2, hasCel: true, tLineP: lines ? this.lineP.texture : null, tLineC: lines ? this.lineC.texture : null, tFx, camera: cam, target: S, lightDir, seed: keys.seed ?? 0, focus: this.focus });
      else { cu.tFx.value = tFx; cu.uFx.value = tFx ? 1 : 0; this.pass(this.mComp, S); }
    } else {
      const bg = scene.background;
      if (bg?.isColor) scene.background = null; // the sky keeps the bg colour but id 0, so satsuei never takes it for a character
      r.setRenderTarget(this.scene);
      r.setClearColor(bg?.isColor ? bg : 0x000000, 0);
      r.clear();
      r.render(scene, camera);
      scene.background = bg;
      if (sat) {
        const seed = keys?.seed ?? 0;
        if (lines) this.linePass.render({ tCol: this.scene.texture, tDepth: D, camera, target: this.lineP, lightDir, seed });
        S = this.satsuei.render({ tPlate: this.scene.texture, tPlateD: D, hasCel: false, tLineP: lines ? this.lineP.texture : null, camera, target: this.comp, lightDir, seed, focus: this.focus });
      }
    }
    // S6 before S5: the gathered lens when it runs (tier 2+), so bloom reads the discs it opened; FINAL then skips its own blur mix
    this.tick("lens");
    const dofV = this.u.uDof.value, dofOn = dofV.z;
    let C = S;
    if (dofOn > 0 && !off.has("lens")) {
      const out = this.lens.dof({ tCol: S.texture, tDepthA: D, tDepthB: D2, camera: cam, focus: dofV.x, strength: dofV.y });
      if (out && out !== S) { C = out; dofV.z = 0; }
    }
    this.tick("bloom");
    let src = C.texture;
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
    if (dofV.z > 0) {
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
    this.tick("final");
    const u = this.u;
    u.tCol.value = C.texture;
    u.tDepth.value = D; u.tDepth2.value = D2;
    u.tBloom.value = up.texture;
    u.tShaft.value = this.shaft.texture;
    u.tBlur.value = this.blur[0].texture;
    const sh = u.uShaft.value, setX = u.uSet.value.x;
    if (!useShaft) u.uShaft.value = 0;
    if (lines) u.uSet.value.x = 0; // the line pass replaced FINAL's set lines
    u.uLineK.value.set(lines ? 1 : 0, lines && this.plates && keys ? 1 : 0);
    u.uNear.value = camera.near; u.uFar.value = camera.far;
    if (u.uView.value > 3.5) {
      const v = this.mView.uniforms;
      v.uMode.value = u.uView.value; v.tDA.value = D; v.tDB.value = D2;
      v.uInvProj.value.copy(cam.projectionMatrixInverse); v.uCamW.value.copy(cam.matrixWorld);
      this.quad.material = this.mView;
    } else this.quad.material = this.mFinal;
    // S7 into the LDR target and S8 FXAA to the canvas; with off "lens" FINAL draws to the canvas itself
    const direct = off.has("lens");
    r.setRenderTarget(direct ? null : this.ldr);
    if (direct && rect) { r.setViewport(...rect.map((v) => v / r.getPixelRatio())); r.setScissor(...rect.map((v) => v / r.getPixelRatio())); r.setScissorTest(true); }
    r.render(this.qs, this.qc);
    if (direct && rect) r.setScissorTest(false);
    this.tick("fxaa");
    if (!direct) this.lens.out({ tLdr: this.ldr.texture, rect });
    this.tick(null);
    u.uShaft.value = sh; u.uSet.value.x = setX; dofV.z = dofOn;
  }
  dispose() {
    for (const t of [this.scene, ...this.down, ...this.up, ...this.blur, this.shaft, this.plateRT, this.plateCol, this.charRT, this.comp, this.ldr, this.paintRT, this.fxRT, this.lineP, this.lineC]) t.dispose();
    this.linePass.dispose(); this.satsuei.dispose(); this.lens.dispose(); this.mPrime.dispose();
    this.over?.rt.dispose(); this.over?.col.dispose(); this.mCrop.dispose();
  }
}
