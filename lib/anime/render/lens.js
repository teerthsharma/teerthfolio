// OPTICS. S6: gathered depth of field at half resolution, coc = (|1/focus - 1/z| - 0.04/focus) * strength, scatter-as-gather
// on a golden-angle disc; bright taps weigh more, most at the rim of their own disc, so highlights open into rimmed discs.
// A cel (id >= 0.98) keeps focus CEL further out than the plate, so a hero stays sharp when a shot's focus misses it; depth
// order still uses the true coc. S8: FXAA 3.11.
import { HalfFloatType, LinearFilter, Vector2, Vector4, WebGLRenderTarget } from "three";
import { Quad } from "./pass.js";
import { RX } from "./common.glsl.js";

const RADIUS = 0.03; // largest disc radius as a fraction of frame height (coc 1)
const CEL = 0.3;

const COC = /* glsl */ `
  float coc(float d) { float k = uCoc.x - 1.0 / rxLin(d, uNear, uFar); return sign(k) * clamp((abs(k) - 0.04 * uCoc.x) * uCoc.y, 0.0, 1.0); }`;
const RAD = /* glsl */ `
  float rad(float s, float ch) { return max(abs(s) - ${CEL.toFixed(3)} * ch, 0.0); }`;

const PRE = /* glsl */ `
  uniform sampler2D tCol; uniform sampler2D tDA; uniform sampler2D tDB;
  uniform vec2 uTexel; uniform vec2 uCoc; uniform float uNear; uniform float uFar; varying vec2 vUv;
  ${RX}
  ${COC}
  void main() {
    vec3 col = vec3(0.0); float d = 1.0, ch = 0.0;
    for (int i = 0; i < 4; i++) {
      vec2 uv = vUv + 0.5 * uTexel * vec2(i < 2 ? -1.0 : 1.0, i == 0 || i == 2 ? -1.0 : 1.0);
      vec4 t = texture2D(tCol, uv);
      float di = min(texture2D(tDA, uv).r, texture2D(tDB, uv).r);
      col += 0.25 * t.rgb;
      if (di < d) { d = di; ch = step(0.98, t.a); }
    }
    // alpha packs the signed coc of the nearest pixel and whether it is a cel ([0, 0.5) sets, [0.5, 1] cels);
    // the gather reads texel centres only, so no filter blends the pack across a cel edge
    gl_FragColor = vec4(col, 0.25 + 0.24 * coc(d) + 0.5 * ch);
  }`;

const GATHER = /* glsl */ `
  uniform sampler2D tHalf; uniform vec2 uTexel; uniform float uR; uniform float uTaps; varying vec2 vUv;
  ${RX}
  ${RAD}
  const float GA = 2.39996323;
  vec4 tap(vec2 uv, out float s, out float rt) {
    vec4 t = texture2D(tHalf, (floor(uv / uTexel) + 0.5) * uTexel);
    float ch = step(0.5, t.a);
    s = (t.a - 0.25 - 0.5 * ch) / 0.24; rt = rad(s, ch) * uR;
    return t;
  }
  float hw(vec3 c) { return 1.0 + 14.0 * clamp(rxLuma(c) - 0.9, 0.0, 3.0); }
  void main() {
    float sc, rc, st, rt;
    vec4 c = tap(vUv, sc, rc);
    float rk = rc;
    // ponytail: 8 probes stand in for a tile-max pass; a thin blurred foreground can be missed, add the tile pass if it shows
    for (int i = 0; i < 8; i++) {
      float fi = float(i), r = uR * sqrt((fi + 0.5) / 8.0);
      tap(vUv + vec2(cos(fi * GA), sin(fi * GA)) * r * uTexel, st, rt);
      if (st < sc - 0.02 && rt > r) rk = max(rk, rt);
    }
    float wc = hw(c.rgb), ws = wc, fg = 0.0;
    vec3 acc = c.rgb * wc;
    for (int i = 0; i < 48; i++) {
      if (float(i) >= uTaps) break;
      float fi = float(i), r = rk * sqrt((fi + 0.5) / uTaps);
      vec4 t = tap(vUv + vec2(cos(fi * GA), sin(fi * GA)) * r * uTexel, st, rt);
      if (st > sc + 0.02) rt = clamp(rt, rc, 2.0 * rc);
      float m = smoothstep(r - 0.5, r + 0.5, rt), w = m * hw(t.rgb) * (1.0 + 0.6 * smoothstep(0.7, 1.0, r / max(rt, 1e-3)));
      acc += t.rgb * w + c.rgb * wc * (1.0 - m); ws += w + wc * (1.0 - m);
      fg += w * step(st, sc - 0.02) * step(1.0, rt);
    }
    gl_FragColor = vec4(acc / ws, fg / ws);
  }`;

const MIX = /* glsl */ `
  uniform sampler2D tCol; uniform sampler2D tDA; uniform sampler2D tDB; uniform sampler2D tGath; uniform sampler2D tPre;
  uniform vec2 uCoc; uniform float uNear; uniform float uFar; uniform float uRf; varying vec2 vUv;
  ${RX}
  ${COC}
  ${RAD}
  void main() {
    vec4 c = texture2D(tCol, vUv), g = texture2D(tGath, vUv);
    float px = rad(coc(min(texture2D(tDA, vUv).r, texture2D(tDB, vUv).r)), step(0.98, c.a)) * uRf;
    // a sharp pixel keeps its full-res detail under the share (g.a) of nearer blurred taps that cover it
    vec3 lay = max(g.rgb + (c.rgb - texture2D(tPre, vUv).rgb) * (1.0 - g.a), 0.0);
    gl_FragColor = vec4(mix(lay, g.rgb, smoothstep(0.5, 2.0, px)), c.a);
  }`;

const FXAA = /* glsl */ `
  uniform sampler2D tIn; uniform vec2 uTexel; uniform float uOn; varying vec2 vUv;
  float lu(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
  void main() {
    vec3 m = texture2D(tIn, vUv).rgb;
    gl_FragColor = vec4(m, 1.0);
    if (uOn < 0.5) return;
    vec2 o = 0.5 * uTexel;
    float nw = lu(texture2D(tIn, vUv - o).rgb), sw = lu(texture2D(tIn, vUv + vec2(-o.x, o.y)).rgb);
    float ne = lu(texture2D(tIn, vUv + vec2(o.x, -o.y)).rgb) + 1.0 / 384.0, se = lu(texture2D(tIn, vUv + o).rgb), lm = lu(m);
    float lMax = max(max(nw, sw), max(ne, se)), lMin = min(min(nw, sw), min(ne, se));
    if (max(lMax, lm) - min(lMin, lm) < max(0.08, lMax * 0.166)) return;
    vec2 dir = vec2((sw - ne) + (se - nw), (sw - ne) - (se - nw));
    vec2 d1 = dir / max(length(dir), 1e-6);
    vec2 d2 = clamp(d1 / max(min(abs(d1.x), abs(d1.y)) * 8.0, 1e-4), -2.0, 2.0);
    vec3 a = texture2D(tIn, vUv - d1 * o).rgb + texture2D(tIn, vUv + d1 * o).rgb;
    vec3 b = (texture2D(tIn, vUv - d2 * 2.0 * uTexel).rgb + texture2D(tIn, vUv + d2 * 2.0 * uTexel).rgb) * 0.25 + a * 0.25;
    float lb = lu(b);
    gl_FragColor = vec4(lb < lMin || lb > lMax ? a * 0.5 : b, 1.0);
  }`;

export class Lens {
  constructor(renderer, { type = HalfFloatType, tier = 2 } = {}) {
    this.r = renderer;
    this.type = type;
    this.tier = tier;
    this.params = { fxaa: 1, radius: RADIUS };
    this.w = 4; this.h = 4;
    this.q = new Quad(renderer);
    this.half = this.rt(4, 4);
    this.gath = this.rt(4, 4);
    this.full = null;
    this.u = { tCol: { value: null }, tDA: { value: null }, tDB: { value: null }, uTexel: { value: new Vector2() },
      uCoc: { value: new Vector2() }, uNear: { value: 0.1 }, uFar: { value: 100 } };
    this.mPre = this.q.material(PRE, this.u);
    this.mGather = this.q.material(GATHER, { tHalf: { value: this.half.texture }, uTexel: { value: new Vector2() }, uR: { value: 0 }, uTaps: { value: 22 } });
    this.mMix = this.q.material(MIX, { ...this.u, tGath: { value: this.gath.texture }, tPre: { value: this.half.texture }, uRf: { value: 0 } });
    this.mOut = this.q.material(FXAA, { tIn: { value: null }, uTexel: { value: new Vector2() }, uOn: { value: 1 } });
    this.vp = new Vector4(); this.sc = new Vector4();
    // link every program now, under the target kind it draws to (the program key differs for canvas and targets)
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(this.half);
    for (const m of [this.mPre, this.mGather, this.mMix]) { this.q.mesh.material = m; renderer.compile(this.q.scene, this.q.cam); }
    renderer.setRenderTarget(null);
    this.q.mesh.material = this.mOut; renderer.compile(this.q.scene, this.q.cam);
    renderer.setRenderTarget(prev);
  }
  rt(w, h) {
    return new WebGLRenderTarget(w, h, { type: this.type, minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: false });
  }
  setSize(w, h) {
    this.w = w; this.h = h;
    const hw = Math.max(1, w >> 1), hh = Math.max(1, h >> 1);
    this.half.setSize(hw, hh); this.gath.setSize(hw, hh);
    this.full?.setSize(w, h);
    this.u.uTexel.value.set(1 / w, 1 / h);
    this.mGather.uniforms.uTexel.value.set(1 / hw, 1 / hh);
  }
  dof({ tCol, tDepthA, tDepthB, camera, focus, strength, target }) {
    if (!(strength > 0) || this.tier < 2) return tCol.renderTarget ?? null;
    const r = this.r, prev = r.getRenderTarget(), u = this.u;
    u.tCol.value = tCol; u.tDA.value = tDepthA; u.tDB.value = tDepthB ?? tDepthA;
    u.uCoc.value.set(1 / Math.max(focus, 1e-3), strength);
    u.uNear.value = camera.near; u.uFar.value = camera.far;
    const R = (this.params.radius ?? RADIUS) * this.h;
    this.mGather.uniforms.uR.value = R * 0.5;
    this.mGather.uniforms.uTaps.value = this.tier >= 3 ? 48 : 22; // 22 taps leave gaps in the disc of a source a few px wide
    this.mMix.uniforms.uRf.value = R;
    const out = target ?? (this.full ??= this.rt(this.w, this.h));
    this.q.draw(this.mPre, this.half);
    this.q.draw(this.mGather, this.gath);
    this.q.draw(this.mMix, out);
    r.setRenderTarget(prev);
    return out;
  }
  out({ tLdr, rect = null }) {
    const r = this.r, prev = r.getRenderTarget(), u = this.mOut.uniforms;
    u.tIn.value = tLdr;
    u.uTexel.value.set(1 / tLdr.image.width, 1 / tLdr.image.height);
    u.uOn.value = this.params.fxaa > 0 && this.tier >= 2 ? 1 : 0;
    if (rect) {
      r.getViewport(this.vp); r.getScissor(this.sc);
      const test = r.getScissorTest(), pr = r.getPixelRatio(), [x, y, w, h] = rect.map((v) => v / pr);
      r.setViewport(x, y, w, h); r.setScissor(x, y, w, h); r.setScissorTest(true);
      this.q.draw(this.mOut, null);
      r.setViewport(this.vp); r.setScissor(this.sc); r.setScissorTest(test);
    } else this.q.draw(this.mOut, null);
    r.setRenderTarget(prev);
  }
  dispose() {
    for (const t of [this.half, this.gath, this.full]) t?.dispose();
    for (const m of [this.mPre, this.mGather, this.mMix, this.mOut]) m.dispose();
    this.q.mesh.geometry.dispose();
  }
}
