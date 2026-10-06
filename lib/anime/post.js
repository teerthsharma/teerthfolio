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
import { BufferAttribute, BufferGeometry, Color, DepthTexture, HalfFloatType, LinearFilter, Mesh, NearestFilter, OrthographicCamera, Scene, ShaderMaterial, UnsignedByteType, UnsignedIntType, Vector2, Vector4, WebGLRenderTarget } from "three";

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
    return c.a < 0.002 ? max(l - 0.55, 0.0) : max(l - 1.0, 0.0) * 0.5; }
  void main() {
    vec2 d = (vUv - uLightUV) * uDensity / 24.0; vec2 uv = vUv; float w = 1.0; float s = 0.0;
    for (int i = 0; i < 24; i++) { uv -= d; s += mask(uv) * w; w *= uDecay; }
    gl_FragColor = vec4(vec3(s / 24.0), 1.0); }`;

const FINAL = /* glsl */ `
  uniform sampler2D tCol; uniform sampler2D tDepth; uniform sampler2D tBloom; uniform sampler2D tShaft;
  uniform vec2 uRes; uniform float uNear; uniform float uFar; uniform float uSeed; uniform float uTime;
  uniform vec4 uSet; uniform vec3 uSetCol; uniform float uCharLines;          // x strength, y width px, z colour mix (0 darkened scene, 1 uSetCol), w depth gain
  uniform float uBloom; uniform float uDiffuse; uniform float uShaft; uniform vec3 uShaftCol;
  uniform vec3 uGain; uniform vec3 uGamma; uniform float uSat; uniform vec3 uSplit; uniform float uPoster;
  uniform vec3 uPal[8]; uniform float uPalN; uniform float uPalMix;
  uniform vec3 uPaperCol; uniform vec4 uPaper;      // x amount (multiply pigment over paper), y texture kind, z texture strength, w bleed px
  uniform float uMisreg; uniform float uCA; uniform float uGrain; uniform float uVig; uniform float uMono;
  uniform vec4 uImpact; uniform vec3 uImpA; uniform vec3 uImpB;
  uniform vec4 uFocus; uniform vec3 uFocusCol; uniform vec4 uShock;
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
    if (uSet.x > 0.0 && (c0.a < 0.999 || uCharLines > 0.5)) {
      float zc = lin(texture2D(tDepth, uv).r);
      float lap = 0.0; float ide = 0.0; float hasChar = 0.0;
      vec2 o = uSet.y * px;
      for (int i = 0; i < 8; i++) {
        float a = float(i) * 0.785398;
        vec2 q = uv + vec2(cos(a), sin(a)) * o * (i == 1 || i == 3 || i == 5 || i == 7 ? 1.4142 : 1.0);
        float zn = lin(texture2D(tDepth, q).r); float idn = texture2D(tCol, q).a;
        lap += zn - zc;
        hasChar = max(hasChar, step(0.999, idn));
        ide = max(ide, step(0.004, abs(idn - c0.a)) * step(zc, zn));
      }
      float dEdge = smoothstep(0.02, 0.06, abs(lap) / max(zc, 1e-3) * uSet.w) * step(0.0, lap);
      line = max(dEdge, ide) * (1.0 - hasChar * (1.0 - uCharLines)) * step(0.002, c0.a);
      vec3 dk = max(vec3(0.0), mix(vec3(dot(col, LUMA)), col, 1.4)) * 0.28;
      col = mix(col, mix(dk, uSetCol, uSet.z), line * uSet.x);
    }
    // light: shafts, emissive bloom, diffusion glow on highlights only
    vec4 bl = texture2D(tBloom, uv);
    col += texture2D(tShaft, uv).rgb * uShaftCol * uShaft;
    col += bl.rgb * uBloom;
    float L = dot(col, LUMA);
    col += uDiffuse * max(bl.a - L, 0.0) * smoothstep(0.35, 0.85, bl.a) * mix(vec3(1.0), col / max(L, 1e-3), 0.5);
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
      tCol: { value: null }, tDepth: { value: null }, tBloom: { value: null }, tShaft: { value: null },
      uRes: { value: new Vector2() }, uNear: { value: 0.1 }, uFar: { value: 100 }, uSeed: { value: 0 }, uTime: { value: 0 },
      uSet: { value: new Vector4(1, 1, 0, 1) }, uSetCol: { value: new Color(0, 0, 0) }, uCharLines: { value: 0 },
      uBloom: { value: 1 }, uDiffuse: { value: 0.2 }, uShaft: { value: 0 }, uShaftCol: { value: new Color(1, 0.9, 0.7) },
      uGain: { value: new Color(1, 1, 1) }, uGamma: { value: new Color(1, 1, 1) }, uSat: { value: 1 }, uSplit: { value: new Color(0, 0, 0) }, uPoster: { value: 0 },
      uPal: { value: Array.from({ length: 8 }, () => new Color()) }, uPalN: { value: 0 }, uPalMix: { value: 0 },
      uPaperCol: { value: new Color(1, 1, 1) }, uPaper: { value: new Vector4() },
      uMisreg: { value: 0 }, uCA: { value: 0 }, uGrain: { value: 0.02 }, uVig: { value: 0.25 }, uMono: { value: 0 },
      uImpact: { value: new Vector4(0, 0.5, 0, 0) }, uImpA: { value: new Color(1, 1, 1) }, uImpB: { value: new Color(0, 0, 0) },
      uFocus: { value: new Vector4(0.5, 0.5, 0, 0) }, uFocusCol: { value: new Color(0, 0, 0) }, uShock: { value: new Vector4(0.5, 0.5, 0, 0) },
    };
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
    this.u.uRes.value.set(w, h);
  }
  pass(m, target) {
    this.quad.material = m;
    this.r.setRenderTarget(target);
    this.r.render(this.qs, this.qc);
  }
  // rect: [x, y, w, h] in drawing-buffer px of the canvas (null = full canvas)
  render(scene, camera, rect = null, shafts = null) {
    const r = this.r;
    r.setRenderTarget(this.scene);
    r.setClearColor(0x000000, 0);
    r.clear();
    r.render(scene, camera);
    // pyramid
    let src = this.scene.texture;
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
    const useShaft = shafts && this.tier >= 2 && this.u.uShaft.value > 0;
    if (useShaft) {
      this.mShaft.uniforms.tIn.value = this.scene.texture;
      this.mShaft.uniforms.uLightUV.value.copy(shafts);
      this.pass(this.mShaft, this.shaft);
    }
    const u = this.u;
    u.tCol.value = this.scene.texture;
    u.tDepth.value = this.scene.depthTexture;
    u.tBloom.value = up.texture;
    u.tShaft.value = this.shaft.texture;
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
    for (const t of [this.scene, ...this.down, ...this.up, this.shaft]) t.dispose();
  }
}
