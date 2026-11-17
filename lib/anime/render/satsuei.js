// S4 SATSUEI: plate + plate lines + the cel's cast shadow on the plate, the cel + cel lines, then the
// photography on character pixels (para dark and light, key-side rim, background wrap) -> one HDR target.
import { Color, HalfFloatType, LinearFilter, Matrix4, Vector2, Vector3, Vector4, WebGLRenderTarget } from "three";
import { Quad } from "./pass.js";
import { RX } from "./common.glsl.js";
import { shadowUniforms, SHADOW_GLSL } from "./shadow.js";

export const SATSUEI_DEFAULTS = {
  on: 1,
  trace: 1, ink: "#1a120c", inkMix: 0.35, setInkMix: 0.5,
  shadowCol: "#5d6a88", shadowAmt: 0.5,
  paraDark: { dir: [-0.7, -0.7], col: "#1c2233", amt: 0.28 },
  paraLight: { dir: [0.7, 0.7], col: "#fff1d6", amt: 0.22 },
  rim: { col: "#fff6e6", amt: 0.85, w: 2.2 },
  wrap: { amt: 0.35, w: 10 },
};

const SHADOW = SHADOW_GLSL.includes(RX) ? SHADOW_GLSL : RX + SHADOW_GLSL;

const HEAD = /* glsl */ `
  uniform sampler2D tPlate; uniform sampler2D tPlateD; uniform sampler2D tCel; uniform sampler2D tCelD;
  uniform vec4 uFlags;  // x has cel, y plate lines, z cel lines, w seed
  varying vec2 vUv;
  float ssMatte(vec2 q) {
    if (uFlags.x > 0.5) return (texture2D(tCel, q).a >= 0.98 && texture2D(tCelD, q).r < texture2D(tPlateD, q).r) ? 1.0 : 0.0;
    return texture2D(tPlate, q).a >= 0.98 ? 1.0 : 0.0;
  }`;

const DOWN = /* glsl */ `${HEAD}
  uniform vec2 uOff;
  // only plate that shows is background: any cel coverage in front of it (a translucent body too) is not
  float ssBg(vec2 q) {
    if (uFlags.x > 0.5) return (texture2D(tCel, q).a > 0.004 && texture2D(tCelD, q).r < texture2D(tPlateD, q).r) ? 0.0 : 1.0;
    return 1.0 - ssMatte(q);
  }
  vec4 ssTap(vec2 q) { float b = ssBg(q); return vec4(min(texture2D(tPlate, q).rgb, vec3(4.0)) * b, b); }
  void main() {
    gl_FragColor = 0.25 * (ssTap(vUv - uOff) + ssTap(vUv + uOff) + ssTap(vUv + vec2(uOff.x, -uOff.y)) + ssTap(vUv + vec2(-uOff.x, uOff.y)));
  }`;

const DISC = /* glsl */ `
  uniform sampler2D tIn; uniform vec2 uR; varying vec2 vUv;
  void main() {
    vec4 s = texture2D(tIn, vUv);
    for (int i = 0; i < 12; i++) {
      float f = float(i), a = f * 2.39996323;
      s += texture2D(tIn, vUv + vec2(cos(a), sin(a)) * sqrt((f + 0.5) / 12.0) * uR);
    }
    gl_FragColor = s / 13.0;
  }`;

const MAIN = /* glsl */ `${HEAD}
  ${SHADOW}
  uniform sampler2D tLineP; uniform sampler2D tLineC; uniform sampler2D tWrap; uniform vec4 uHero; uniform sampler2D tFx; uniform float uFx;
  uniform vec2 uRes; uniform mat4 uInvProj; uniform mat4 uCamW;
  uniform vec4 uP; uniform vec3 uInkCol; uniform vec3 uShCol; uniform float uShAmt;
  uniform vec4 uParaD; uniform vec3 uParaDCol; uniform vec4 uParaL; uniform vec3 uParaLCol;
  uniform vec4 uRim; uniform vec3 uRimCol; uniform vec2 uWrap;  // uP: on, trace, inkMix, setInkMix; uRim: key dir on screen, amount, px; uHero: its centre uv, 1 / half extent
  vec3 ssInk(vec3 col, vec4 ln) {
    vec3 lc = mix(uInkCol, rxInk(col, uInkCol, mix(uP.w, uP.z, ln.b)), uP.y);
    return mix(col, min(col, lc), ln.r);
  }
  vec3 ssCap(vec3 c, float m) { float y = rxLuma(c); return y > m ? c * (m / y) : c; }
  float ssPara(vec2 q, vec2 d, float lo, float hi) { return smoothstep(lo, hi, dot(q, d)); }
  // the body is id 1; the ink hull (0.985) counts as outside, so the rim sits inside the line
  float ssOut(vec2 q, float dh) {
    float pd = texture2D(tPlateD, q).r;
    if (uFlags.x < 0.5) return texture2D(tPlate, q).a > 0.995 ? 0.0 : step(dh, pd);
    float cd = texture2D(tCelD, q).r;
    return (texture2D(tCel, q).a > 0.995 && cd < pd) ? 0.0 : step(dh, min(cd, pd));
  }
  void main() {
    vec2 px = 1.0 / uRes;
    vec4 p = texture2D(tPlate, vUv);
    vec3 col = p.rgb;
    float id = p.a;
    bool cel = uFlags.x > 0.5, wins = false, fx = false;
    vec4 c = vec4(0.0);
    float pd = texture2D(tPlateD, vUv).r, dh = pd, ma = p.a;
    if (cel) {
      c = texture2D(tCel, vUv);
      float cd = texture2D(tCelD, vUv).r;
      wins = c.a > 0.5 && cd < pd;
      // an MSAA edge whose resolved depth sample missed reads as unwritten: hide it when its written neighbours are behind the plate
      float nd = min(min(texture2D(tCelD, vUv + vec2(px.x, 0.0)).r, texture2D(tCelD, vUv - vec2(px.x, 0.0)).r),
        min(texture2D(tCelD, vUv + vec2(0.0, px.y)).r, texture2D(tCelD, vUv - vec2(0.0, px.y)).r));
      fx = !wins && cd >= 0.9999 && (c.a > 0.001 || max(max(c.r, c.g), c.b) > 0.001) && !(nd < 0.9999 && nd > pd);
      ma = wins ? c.a : 0.0;
      dh = cd;
    }
    float sh = 0.0;
    if (cel && uP.x > 0.5) { // uniform flow only: rxCast takes screen derivatives
      vec3 wp = (uCamW * vec4(rxViewPos(vUv, pd, uInvProj), 1.0)).xyz;
      sh = rxCast(wp, mat3(uCamW) * rxNormal(tPlateD, vUv, px, uInvProj));
    }
    if (!wins && p.a > 0.001 && p.a < 0.98 && pd < 1.0) col *= mix(vec3(1.0), uShCol, uShAmt * uShadowP.w * sh);
    if (wins) { col = c.rgb; id = c.a; }
    bool lw = wins ? uFlags.z > 0.5 : uFlags.y > 0.5;
    vec4 ln = vec4(0.0);
    if (lw) ln = wins ? texture2D(tLineC, vUv) : texture2D(tLineP, vUv);
    // para covers the whole matte (ink hull included); rim and wrap only the body (> 0.995) inside the hull
    if (ma >= 0.98 && uP.x > 0.5) {
      vec2 q = (vUv - uHero.xy) * uHero.zw;
      vec3 c0 = col;
      col *= mix(vec3(1.0), uParaDCol, uParaD.z * ssPara(q, uParaD.xy, -0.25, 1.3));
      col *= 1.0 + uParaLCol * (uParaL.z * ssPara(q, uParaL.xy, -0.4, 1.0));
      vec3 base = col;
      if (ma > 0.995 && uRim.z > 0.0) {
        vec2 o = uRim.xy * uRim.w * (0.7 + 0.6 * rxNoise(gl_FragCoord.xy * (30.0 / uRes.y) + uFlags.w * 1.7)) * px;
        float band = ssOut(vUv + o, dh);
        if (band > 0.0) {
          vec2 r = 1.3 * uRim.w * px;
          vec2 n = vec2(ssOut(vUv + vec2(r.x, 0.0), dh) - ssOut(vUv - vec2(r.x, 0.0), dh), ssOut(vUv + vec2(0.0, r.y), dh) - ssOut(vUv - vec2(0.0, r.y), dh));
          if (dot(n, n) > 0.0) band *= smoothstep(0.0, 0.3, dot(uRim.xy, n) * inversesqrt(dot(n, n)));
        }
        col = max(col, mix(col, ssCap(uRimCol, 0.92), uRim.z * band * (1.0 - ln.r)));
      }
      vec4 wb = texture2D(tWrap, vUv);
      if (ma > 0.995 && uWrap.x > 0.0 && wb.a > 0.02) {
        vec3 bg = min(wb.rgb / wb.a, vec3(1.0));
        // behind a hull of 1 to 4.5 px the disc's background share at the first body pixel is 0.2 to 0.4
        float e = smoothstep(0.02, 0.22, wb.a);
        // the lift is capped by the cel's own level, so a dark fill takes a glint, not a halo of the plate's colour
        vec3 d = max(bg - col, vec3(0.0));
        col += d * min(1.0, (1.5 * rxLuma(col) + 0.03) / max(rxLuma(d), 1e-4)) * uWrap.x * e * smoothstep(0.0, 0.12, rxLuma(bg) - rxLuma(base));
      }
      col = ssCap(col, max(0.92, rxLuma(c0)));
    }
    // lines after the photography: ink only ever darkens what is under it
    if (lw) col = ssInk(col, ln);
    if (fx) col = col * (1.0 - c.a) + c.rgb;
    if (uFx > 0.5) { vec4 o = texture2D(tFx, vUv); col = col * (1.0 - clamp(o.a, 0.0, 1.0)) + o.rgb; }
    gl_FragColor = vec4(col, id);
  }`;

const pick = (o, d, k) => o?.[k] ?? d[k];

export class Satsuei {
  constructor(renderer, { type = HalfFloatType, tier = 2, shadow = null } = {}) {
    this.r = renderer;
    this.tier = tier;
    this.w = 0; this.h = 0; this.div = 2;
    this.params = structuredClone(SATSUEI_DEFAULTS);
    this.q = new Quad(renderer);
    const rt = () => new WebGLRenderTarget(4, 4, { type, minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: false });
    this.wrapRT = [rt(), rt()];
    const v = (x) => ({ value: x });
    const io = { tPlate: v(null), tPlateD: v(null), tCel: v(null), tCelD: v(null), uFlags: v(new Vector4()) };
    this.u = {
      ...(shadow ?? shadowUniforms()), ...io,
      tLineP: v(null), tLineC: v(null), tFx: v(null), uFx: v(0), tWrap: v(this.wrapRT[1].texture), uHero: v(new Vector4(0.5, 0.5, 2, 2)),
      uRes: v(new Vector2(4, 4)), uInvProj: v(new Matrix4()), uCamW: v(new Matrix4()),
      uP: v(new Vector4()), uInkCol: v(new Color()), uShCol: v(new Color()), uShAmt: v(0),
      uParaD: v(new Vector4()), uParaDCol: v(new Color()), uParaL: v(new Vector4()), uParaLCol: v(new Color()),
      uRim: v(new Vector4()), uRimCol: v(new Color()), uWrap: v(new Vector2()),
    };
    this.mMain = this.q.material(MAIN, this.u);
    this.mDown = this.q.material(DOWN, { ...io, uOff: v(new Vector2()) });
    this.mDisc = this.q.material(DISC, { tIn: v(this.wrapRT[0].texture), uR: v(new Vector2()) });
    this.keyV = new Vector3(); this.fv = new Vector3();
    this.cols = new Map();
    // link every program now, against a render target so the program key matches playback
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(this.wrapRT[0]);
    for (const m of [this.mDown, this.mDisc, this.mMain]) { this.q.mesh.material = m; renderer.compile(this.q.scene, this.q.cam); }
    renderer.setRenderTarget(prev);
  }
  setSize(w, h) {
    this.w = w; this.h = h;
    this.div = this.tier <= 1 ? 4 : 2;
    this.u.uRes.value.set(w, h);
    for (const t of this.wrapRT) t.setSize(Math.max(1, Math.round(w / this.div)), Math.max(1, Math.round(h / this.div)));
  }
  setCol(u, hex) {
    if (this.cols.get(u) === hex) return;
    u.value.set(hex); this.cols.set(u, hex);
  }
  para(vecU, colU, o, d, key) {
    const dir = (o?.dir === "key" ? key : o?.dir) ?? d.dir, l = Math.hypot(dir[0], dir[1]);
    vecU.value.set(l > 0 ? dir[0] / l : 0, l > 0 ? dir[1] / l : 0, l > 0 ? pick(o, d, "amt") : 0, 0);
    this.setCol(colU, pick(o, d, "col"));
  }
  // focus: the hero's chest in world space (null: para runs across the whole frame)
  render({ tPlate, tPlateD, tCel = null, tCelD = null, hasCel = false, tLineP = null, tLineC = null, tFx = null, camera, target, lightDir = null, seed = 0, focus = null }) {
    const r = this.r, u = this.u, P = this.params, D = SATSUEI_DEFAULTS, prev = r.getRenderTarget();
    if (target && (target.width !== this.w || target.height !== this.h)) this.setSize(target.width, target.height);
    const cel = !!(hasCel && tCel && tCelD);
    const lineP = tLineP ?? (cel ? null : tLineC);
    u.tPlate.value = tPlate; u.tPlateD.value = tPlateD;
    u.tCel.value = cel ? tCel : null; u.tCelD.value = cel ? tCelD : null;
    u.tLineP.value = lineP; u.tLineC.value = cel ? tLineC : null;
    u.tFx.value = cel ? tFx : null; u.uFx.value = cel && tFx ? 1 : 0;
    u.uFlags.value.set(cel ? 1 : 0, lineP ? 1 : 0, cel && tLineC ? 1 : 0, Math.abs(Math.floor(seed)) % 61);
    const on = (P.on ?? D.on) > 0 ? 1 : 0, s = this.h / 1080;
    u.uP.value.set(on, P.trace ?? D.trace, P.inkMix ?? D.inkMix, P.setInkMix ?? D.setInkMix);
    this.setCol(u.uInkCol, P.ink ?? D.ink);
    this.setCol(u.uShCol, P.shadowCol ?? D.shadowCol);
    u.uShAmt.value = P.shadowAmt ?? D.shadowAmt;
    let k = 0;
    if (lightDir && camera) {
      const kv = this.keyV.copy(lightDir).transformDirection(camera.matrixWorldInverse), l = Math.hypot(kv.x, kv.y);
      if (l > 1e-4) { kv.x /= l; kv.y /= l; const t = Math.min(1, Math.max(0, (l - 0.05) / 0.3)); k = t * t * (3 - 2 * t); }
    }
    const kd = k > 0.5 ? [this.keyV.x, this.keyV.y] : null;
    this.para(u.uParaD, u.uParaDCol, P.paraDark, D.paraDark, kd && [-kd[0], -kd[1]]);
    this.para(u.uParaL, u.uParaLCol, P.paraLight, D.paraLight, kd);
    u.uRim.value.set(this.keyV.x, this.keyV.y, k * pick(P.rim, D.rim, "amt"), Math.max(1, pick(P.rim, D.rim, "w") * s));
    this.setCol(u.uRimCol, pick(P.rim, D.rim, "col"));
    // the hero as a 0.6 m sphere on screen: the frame para is laid across, and the cap on the wrap disc
    let figPx = this.h;
    u.uHero.value.set(0.5, 0.5, 2, 2);
    if (focus && camera) {
      const v = this.fv.copy(focus).applyMatrix4(camera.matrixWorldInverse), E = camera.projectionMatrix.elements;
      if (v.z < -1e-3) { const ry = 0.3 * E[5] / -v.z, rx = 0.3 * E[0] / -v.z; u.uHero.value.set(0.5 - 0.5 * E[0] * v.x / v.z, 0.5 - 0.5 * E[5] * v.y / v.z, 1 / rx, 1 / ry); figPx = 2 * ry * this.h; }
    }
    const wAmt = on * pick(P.wrap, D.wrap, "amt"), wPx = Math.max(1, Math.min(pick(P.wrap, D.wrap, "w") * s, 0.04 * figPx));
    u.uWrap.value.set(wAmt, wPx);
    u.uInvProj.value.copy(camera.projectionMatrixInverse);
    u.uCamW.value.copy(camera.matrixWorld);
    if (wAmt > 0) {
      this.mDown.uniforms.uOff.value.set(this.div / 4 / this.w, this.div / 4 / this.h);
      this.q.draw(this.mDown, this.wrapRT[0]);
      this.mDisc.uniforms.uR.value.set(wPx / this.w, wPx / this.h);
      this.q.draw(this.mDisc, this.wrapRT[1]);
    }
    this.q.draw(this.mMain, target);
    r.setRenderTarget(prev);
    return target;
  }
  dispose() {
    for (const t of this.wrapRT) t.dispose();
    for (const m of [this.mMain, this.mDown, this.mDisc]) m.dispose();
    this.q.mesh.geometry.dispose();
  }
}
