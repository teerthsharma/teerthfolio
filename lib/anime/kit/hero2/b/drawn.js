// Drawn materials for method b: the face is shapes in head space (eyes, lids, nose, toothed mouth, fur strokes, marks, cel shadow shapes shifted by the key);
// the cloth draws baked fold shapes as hard shadows. Both write a character id (alpha 1).
import { Color, ShaderMaterial, Vector2, Vector3, Vector4 } from "three";
import { SHADOW_GLSL } from "../../../render/shadow.js";

export const NM = 40, NF = 20;

const VERT = /* glsl */ `
  attribute vec3 aCol; attribute vec3 aShade; attribute float aFold;
  varying vec3 vP; varying vec3 vN; varying vec3 vCol; varying vec3 vShade; varying vec3 vWP; varying vec3 vWN; varying float vFold;
  void main() {
    vP = position; vN = normal; vCol = aCol; vShade = aShade; vFold = aFold;
    vWP = (modelMatrix * vec4(position, 1.0)).xyz; vWN = mat3(modelMatrix) * normal;
    gl_Position = projectionMatrix * viewMatrix * vec4(vWP, 1.0);
  }`;

const COMMON = /* glsl */ `
  uniform vec3 uLightL; uniform vec3 uLightCol; uniform vec4 uS0; uniform vec3 uRimDir; uniform vec3 uRimCol; uniform float uRimK;
  varying vec3 vP; varying vec3 vN; varying vec3 vCol; varying vec3 vShade; varying vec3 vWP; varying vec3 vWN; varying float vFold;
  ${SHADOW_GLSL}
  const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
  float px(float d) { return d / max(fwidth(d), 1e-7); }
  float fill(float d) { return clamp(0.5 - px(d), 0.0, 1.0); }
  float edge(float d, float w) { return clamp(0.5 * w + 0.5 - abs(px(d)), 0.0, 1.0); }
  vec3 litOf(vec3 a) { vec3 c = a * uLightCol; return c * min(1.0, uS0.w / max(dot(c, LUMA), 1e-4)); }
  float seg(vec2 p, vec2 a, vec2 b, float w0, float w1) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-9), 0.0, 1.0); return length(pa - ba * h) - mix(w0, w1, h) * 0.5; }
  float ell(vec2 p, vec2 c, vec2 r) { return (length((p - c) / r) - 1.0) * min(r.x, r.y); }
  float castOf(vec3 N) {
    if (uShadowP.x < 0.5) return 0.0;
    vec3 Ls = -normalize(vec3(uShadowMat[0].z, uShadowMat[1].z, uShadowMat[2].z) + 1e-9);
    return rxCast(vWP, N) * uShadowP.w * smoothstep(-0.12, -0.02, dot(N, Ls));
  }
  vec3 rimOf(vec3 col, vec3 lit, vec3 Nw) {
    float nv = 1.0 - clamp(dot(Nw, normalize(cameraPosition - vWP)), 0.0, 1.0), rw = fwidth(nv) + 1e-4;
    float k = smoothstep(mix(0.82, 0.46, uRimK) - rw, mix(0.82, 0.46, uRimK) + rw, nv) * step(0.1, dot(Nw, normalize(uRimDir)));
    return mix(col, min(mix(lit, uRimCol, 0.75) * 1.2, vec3(uS0.w * 1.25)), k * mix(0.55, 0.95, uRimK));
  }
`;

const CLOTH_F = /* glsl */ `
  ${COMMON}
  uniform vec3 uFoldCol; uniform float uDeepK;
  void main() {
    vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
    vec3 Nw = normalize(vWN); if (!gl_FrontFacing) Nw = -Nw;
    float h = dot(N, uLightL), w = max(fwidth(h) * 1.2, 0.015);
    float b = smoothstep(0.05 - w, 0.05 + w, h), b2 = smoothstep(-0.5 - w, -0.5 + w, h);
    float fold = vFold, fw = max(fwidth(fold) * 1.1, 0.02);
    float fs = smoothstep(0.55 - 0.42 * (1.0 - h) - fw, 0.55 - 0.42 * (1.0 - h) + fw, fold);
    vec3 lit = litOf(vCol), sh = vShade;
    vec3 col = mix(sh * uDeepK, mix(sh, lit, b), b2);
    col = mix(col, sh * uFoldCol, fs * (0.35 + 0.65 * (1.0 - b)) * 0.9);
    float c = castOf(Nw); col = mix(col, sh, c * 0.8);
    col = rimOf(col, lit, Nw);
    gl_FragColor = vec4(col, 1.0);
  }`;

const FACE_F = /* glsl */ `
  ${COMMON}
  uniform vec3 uSkin; uniform vec3 uSkinSh; uniform vec3 uSkinDk; uniform vec3 uSkinLt; uniform vec3 uNoseC; uniform vec3 uInk; uniform vec3 uBlush;
  uniform vec4 uEye[2]; uniform vec2 uEyeT[2]; uniform vec4 uEyeA; uniform vec4 uEyeB; uniform vec3 uIrisC; uniform vec3 uIrisLo; uniform vec3 uIrisHot; uniform vec3 uSclera;
  uniform vec4 uMouthA; uniform vec4 uMouthB; uniform vec3 uGum; uniform vec3 uTooth; uniform vec3 uToothSh; uniform vec3 uTongue;
  uniform float uPupil; uniform vec4 uBrow; uniform vec3 uBrowCol; uniform vec4 uHair; uniform vec4 uFace;
  uniform vec4 uMarkA[${NM}]; uniform vec4 uMarkW[${NM}]; uniform vec3 uMarkC[${NM}];
  uniform vec4 uFur[${NF}];
  vec3 acc; float gB;
  void put(vec3 c, float a) { acc = mix(acc, c, a); }

  float eye(vec2 p, vec4 e, vec2 t, float side, float K) {
    float hw = e.z, hh = e.w, open = uEyeA.x * t.y * (1.0 - uEyeB.w), cut = uEyeA.z, tilt = t.x + uEyeA.y * K;
    vec2 q = p - e.xy; q.x *= side;
    float ca = cos(tilt), sa = sin(tilt);
    q = vec2(q.x * ca + q.y * sa, -q.x * sa + q.y * ca);
    float x = q.x / hw, k = max(1.0 - x * x, 0.0);
    float yU = open * hh * pow(k, 0.5), yL = -open * hh * (0.78 - 0.5 * uEyeA.w) * pow(k, 0.75);
    yU = min(yU, mix(yU, hh * 0.32 + 0.1 * hh * x, cut * step(0.001, open)));
    float dE = max(max(q.y - yU, yL - q.y), abs(q.x) - hw);
    float inside = fill(dE) * step(0.002, open);
    float halo = exp(-max(dE, 0.0) / (0.0055 * (0.5 + uEyeB.x))) * uEyeB.x * (0.35 + 0.65 * open) * K;
    acc = mix(acc, uIrisC * 1.1, halo * 0.42 * (1.0 - inside));
    if (inside > 0.0) {
      vec2 g = uEyeB.yz * vec2(0.3 * hw, 0.25 * hh), c = g;
      float ri = (0.56 + 0.0 * K) * hw, tt = length((q - c) / vec2(ri * 0.92, ri));
      vec3 ir = mix(uIrisHot, mix(uIrisC, uIrisLo, smoothstep(0.45, 1.0, tt)), smoothstep(0.0, 0.5, tt));
      ir *= 1.0 + uEyeB.x * 0.6 * (1.0 - tt);
      ir = mix(ir, uIrisLo * 0.5, smoothstep(0.86, 1.0, tt));
      float lid = smoothstep(yU - 0.55 * hh, yU, q.y) * (0.25 + 0.65 * cut);
      ir = mix(ir, ir * vec3(0.45, 0.3, 0.35), lid);
      float pu = (1.0 - smoothstep(0.0, 1.0, length((q - c) / (uPupil < 0.5 ? vec2(ri * 0.13, ri * 0.52) : vec2(ri * 0.3, ri * 0.34))))) * step(uPupil, 1.5);
      ir = mix(ir, uInk * 0.5, step(0.5, pu) * K);
      vec3 sc = mix(uSclera, uSclera * vec3(0.55, 0.4, 0.45), lid);
      vec3 ec = mix(sc, ir, fill(length((q - c) / vec2(ri * 0.92, ri)) - 1.0));
      float cl = max(fill(length(q - c - vec2(-0.22 * ri, 0.3 * ri)) - 0.2 * ri), fill(length(q - c - vec2(0.3 * ri, -0.34 * ri)) - 0.085 * ri)) * step(0.3, open);
      ec = mix(ec, vec3(1.0, 0.92, 0.92), cl * 0.95);
      put(ec, inside);
    }
    float th = 0.0030 * (0.55 + 0.9 * smoothstep(-0.7, 0.9, x)) * K + 0.0012;
    float up = abs(q.y - yU) - th, lw = abs(q.y - yL) - 0.0011 * K - 0.0006;
    float lineU = fill(max(up, abs(q.x) - hw * 1.0)) * step(0.0, q.y - 0.0 * hh + hh * 0.0);
    float lineL = fill(max(lw, abs(q.x) - hw)) * step(q.y, 0.0) * 0.9;
    float closed = step(open, 0.002);
    float shutLine = fill(abs(q.y + 0.0045 * x * x) - 0.0034 * K - 0.0012) * fill(abs(q.x) - hw);
    put(uInk, max(lineU * (1.0 - closed), shutLine * closed));
    put(uInk, lineL * (1.0 - closed));
    float flick = fill(seg(q, vec2(hw * 0.9, 0.0), vec2(hw * 1.22, 0.009 + 0.004 * K), 0.0045 * K + 0.001, 0.0008));
    put(uInk, flick * step(0.002, open) * K);
    return inside;
  }

  float browShape(vec2 p) {
    vec2 c = vec2(uBrow.x, uBrow.y - uBrow.w); float ang = uBrow.z, L = uBrow.x * 0.62;
    vec2 d = vec2(cos(ang), -sin(ang)) * L * 0.5;
    return seg(p, c - d, c + d, 0.021, 0.0085);
  }

  void teeth(vec2 p, float e, float L, float hw, float n, float sharp, float dir, float fang) {
    float tw = 2.0 * hw / n, fi = (p.x + hw) / tw, tx = fract(fi) * 2.0 - 1.0, ci = (floor(fi) + 0.5) * tw - hw;
    float big = fang * step(0.3 * hw, abs(ci)) * step(abs(ci), 0.66 * hw);
    float g = mix(sqrt(max(0.0, 1.0 - pow(abs(tx), 4.0))), 1.0 - abs(tx) * 0.85, max(sharp, big));
    float d = max((e - dir * L * (1.0 + 1.1 * big) * g - p.y) * dir, abs(p.x) - hw);
    float a = fill(d);
    vec3 tc = mix(uToothSh, uTooth, mix(gB, 1.0, 0.35));
    put(tc, a);
    put(uInk, a * edge(d, 1.3) * 0.75);
  }

  void mouth(vec2 p) {
    float kind = uMouthA.x, amt = uMouthA.y, lift = uMouthA.z, sharp = uMouthA.w;
    float yM = uMouthB.x, w = uMouthB.y, lw = 0.0017, ax = abs(p.x);
    float u = clamp(p.x / w, -1.0, 1.0), q = 1.0 - u * u;
    float cornerY = yM + lift * u * u;
    if (kind > 0.5) {
      float yU = cornerY + 0.004, h = (0.004 + 0.044 * amt) * pow(q, 0.55), yL = yU - h;
      float dO = max(max(p.y - yU, yL - p.y), ax - w), inside = fill(dO);
      if (inside > 0.0) {
        put(uGum, inside);
        put(mix(uGum, uTongue, 0.8), inside * fill(length((p - vec2(0.0, yL + 0.3 * h)) / vec2(w * 0.5, h * 0.32)) - 1.0) * step(0.4, amt));
        float L = max(0.004, h * 0.95);
        teeth(p, yU, L, w * 0.985, 11.0, sharp, 1.0, 1.0);
        teeth(p, yL, L * 0.8, w * 0.9, 11.0, sharp, -1.0, 0.7);
      }
      put(uInk, fill(abs(dO) - lw * 1.15));
      float cc = fill(seg(vec2(ax, p.y), vec2(w, cornerY + 0.004), vec2(w + 0.016, cornerY + 0.026), 0.0042, 0.0008));
      put(uInk, cc);
      put(uInk, fill(seg(p, vec2(0.0, uMouthB.z), vec2(0.0, yU), 0.0034, 0.0034)));
    } else {
      float hw = w * 0.78, uu = p.x / hw, c = lift * 0.75 + 0.006;
      float d = max(abs(p.y - (yM - 0.002 + c * uu * uu)) - lw * 1.7 * (1.0 - 0.55 * uu * uu), abs(p.x) - hw);
      put(uInk, fill(d));
      put(uInk, fill(seg(vec2(ax, p.y), vec2(hw, yM - 0.002 + c), vec2(hw + 0.01, yM - 0.002 + c + 0.011), 0.0036, 0.0008)));
      put(uInk, fill(seg(p, vec2(0.0, uMouthB.z), vec2(0.0, yM + 0.004), 0.0034, 0.0034)));
    }
  }

  void main() {
    vec3 N = normalize(vN), Nw = normalize(vWN);
    vec2 p = vP.xy;
    float h = dot(N, uLightL), w = max(fwidth(h) * 1.2, 0.02);
    gB = smoothstep(0.02 - w, 0.02 + w, h);
    float lx = uLightL.x, sgn = lx >= 0.0 ? 1.0 : -1.0;
    vec2 off = -uLightL.xy * 0.026;
    acc = mix(uSkinSh, litOf(uSkin), gB);
    float front = step(0.04, vP.z) * smoothstep(-0.05, 0.25, N.z);

    float sh = 0.0, ap = abs(p.x);
    float hl = uHair.y - uHair.z * abs(sin(p.x * 38.0 + 0.5)) + off.y * 0.9;
    sh = max(sh, fill(max(p.y - hl, hl - uHair.w - p.y)) * uHair.x);
    vec2 e0 = (vec2(ap, p.y) - vec2(0.103, 0.052) - off * 0.55) / vec2(0.07, 0.056), e1 = (vec2(ap, p.y) - vec2(0.103, 0.022) - off * 0.4) / vec2(0.07, 0.056);
    sh = max(sh, fill(max((length(e0) - 1.0) * 0.056, -(length(e1) - 1.0) * 0.056)));
    vec2 m0 = (p - vec2(0.0, -0.085) - off) / vec2(0.118, 0.078), m1 = (p - vec2(0.0, -0.066) - off * 0.6) / vec2(0.118, 0.078);
    sh = max(sh, fill(max((length(m0) - 1.0) * 0.078, -(length(m1) - 1.0) * 0.078)) * step(-0.17, p.y));
    float fx = -sgn * p.x, yy = p.y + 0.04;
    sh = max(sh, fill(0.12 + 1.2 * yy * yy - fx) * smoothstep(0.03, 0.12, abs(lx)) * step(p.y, 0.1) * step(-0.12, p.y));
    acc = mix(acc, uSkinSh, sh * front);
    { float c0 = castOf(Nw); acc = mix(acc, uSkinSh, c0 * 0.85 * front); acc = rimOf(acc, litOf(uSkin), Nw); }

    float mz = fill(ell(p, vec2(0.0, -0.075), vec2(0.108, 0.07))) * 0.35;
    acc = mix(acc, mix(acc, uSkinLt, 0.55), mz * front * gB);
    for (int i = 0; i < ${NF}; i++) {
      if (uFur[i].z < 0.001 && uFur[i].w < 0.001) break;
      vec2 a = uFur[i].xy, b = uFur[i].zw; float wdt = 0.012 - 0.0004 * float(i);
      float d = seg(vec2(abs(p.x), p.y), a, b, wdt, 0.0008);
      put(mix(uSkinDk, uSkinSh, 0.35 * (1.0 - gB)), fill(d) * front);
    }
    for (int r = 0; r < 3; r++) for (int i = 0; i < 4; i++) {
      vec2 c = vec2(0.046 + 0.0135 * float(i) + 0.006 * float(r), -0.066 - 0.0125 * float(r));
      put(uSkinDk, fill(length(vec2(abs(p.x), p.y) - c) - 0.0021) * front * 0.95);
    }
    for (int s = 0; s < 2; s++) {
      float sd = s == 0 ? 1.0 : -1.0; vec2 c = vec2(sd * 0.034, -0.075);
      float dd = abs(length((p - c) / vec2(0.034, 0.03)) - 1.0) * 0.03;
      put(uInk * 1.0, fill(dd - 0.0007) * step(p.y, c.y + 0.004) * step(0.0, (p.x - c.x) * -sd * -1.0 + 0.04) * front * 0.5);
    }

    vec2 nc = vec2(0.0, -0.037); vec2 nq = vec2(abs(p.x - nc.x), p.y - nc.y) / vec2(0.04, 0.03);
    float nose = fill(max(max(nq.y - (0.72 - 0.22 * nq.x * nq.x), -(nq.y + 0.95 - 0.55 * nq.x * nq.x)), nq.x - (0.5 + 0.5 * (nq.y + 0.95) / 1.67)) * 0.03);
    put(mix(uNoseC * 0.5, uNoseC, gB), nose * front);
    put(uInk, nose * front * fill(length((nq - vec2(0.42, -0.45)) / vec2(0.2, 0.13)) - 1.0));
    put(vec3(0.82, 0.84, 0.9), nose * front * gB * fill(length((nq * vec2(sign(p.x - nc.x), 1.0) - vec2(-0.3, 0.38)) / vec2(0.22, 0.08)) - 1.0));
    put(uInk, edge(max(max(nq.y - (0.72 - 0.22 * nq.x * nq.x), -(nq.y + 0.95 - 0.55 * nq.x * nq.x)), nq.x - (0.5 + 0.5 * (nq.y + 0.95) / 1.67)) * 0.03, 1.3) * 0.8 * front);

    for (int i = 0; i < ${NM}; i++) { if (uMarkW[i].z < 0.5) break; put(uMarkC[i], fill(seg(p, uMarkA[i].xy, uMarkA[i].zw, uMarkW[i].x, uMarkW[i].y)) * front); }

    put(uBrowCol, fill(browShape(vec2(ap, p.y))) * front * uFace.x);
    mouth(p);
    for (int i = 0; i < 2; i++) { if (uEye[i].z > 0.001) eye(vec2(ap, p.y), uEye[i], uEyeT[i], 1.0, i == 0 ? 1.0 : 0.72); }
    gl_FragColor = vec4(acc, 1.0);
  }`;

const V3 = (c) => new Color(c);
export function sharedLight(shared) {
  return { uLightCol: shared.uLightCol, uS0: shared.uS0, uRimDir: shared.uRimDir, uRimCol: shared.uRimCol,
    tShadow: shared.tShadow, uShadowMat: shared.uShadowMat, uShadowP: shared.uShadowP, tShadowH: shared.tShadowH, uShadowMatH: shared.uShadowMatH, uShadowPH: shared.uShadowPH };
}

export function clothMaterial(shared, look, fold = look.outfit.foldCol ?? "#7a6a96", deep = 0.62) {
  return new ShaderMaterial({ vertexShader: VERT, fragmentShader: CLOTH_F, uniforms: { ...sharedLight(shared), uLightL: { value: new Vector3(0, 0, 1) }, uRimK: { value: 1 }, uFoldCol: { value: V3(fold) }, uDeepK: { value: deep } } });
}

export function faceMaterial(shared, look) {
  const f = look.fur, E = look.eyes, M = look.mouth;
  const arr = (n, f2) => Array.from({ length: n }, f2);
  const u = {
    ...sharedLight(shared), uLightL: { value: new Vector3(0, 0, 1) }, uRimK: { value: 1 },
    uSkin: { value: V3(f.coat) }, uSkinSh: { value: V3(f.shade) }, uSkinDk: { value: V3(f.dark) }, uSkinLt: { value: V3(f.light) }, uNoseC: { value: V3(f.nose) }, uInk: { value: V3(f.ink) }, uBlush: { value: V3(f.shade) },
    uEye: { value: arr(2, () => new Vector4()) }, uEyeT: { value: arr(2, () => new Vector2()) },
    uEyeA: { value: new Vector4(1, 0.25, 0.3, 0.1) }, uEyeB: { value: new Vector4(1, 0, 0, 0) },
    uIrisC: { value: V3(E.iris) }, uIrisLo: { value: V3(E.irisLo) }, uIrisHot: { value: V3(E.hot) }, uSclera: { value: V3(E.sclera) },
    uMouthA: { value: new Vector4(1, 0.5, 0.02, 1) }, uMouthB: { value: new Vector4(-0.1, 0.15, -0.064, 0) },
    uGum: { value: V3(M.gum) }, uTooth: { value: V3(M.tooth) }, uToothSh: { value: V3(M.toothShade) }, uTongue: { value: V3(M.tongue) },
    uPupil: { value: E.pupil ?? 0 }, uBrow: { value: new Vector4(0.104, 0.092, 0, 0) }, uBrowCol: { value: V3(f.dark) },
    uHair: { value: new Vector4(1, look.hair.shadowY, look.hair.shadowZig, look.hair.shadowH) }, uFace: { value: new Vector4(1, 0, 0, 0) },
    uMarkA: { value: arr(NM, () => new Vector4()) }, uMarkW: { value: arr(NM, () => new Vector4()) }, uMarkC: { value: arr(NM, () => new Color()) },
    uFur: { value: arr(NF, () => new Vector4()) },
  };
  let n = 0;
  for (const mk of look.marks) {
    const pts = mk.pts, w0 = mk.w0, w1 = mk.w1 ?? mk.w0;
    if (pts.length === 1) { if (n < NM) { u.uMarkA.value[n].set(pts[0][0], pts[0][1], pts[0][0], pts[0][1]); u.uMarkW.value[n].set(w0, w0, 1, 0); u.uMarkC.value[n].set(mk.col ?? f.ink); n++; } continue; }
    const mirrors = mk.mirror ? [1, -1] : [1];
    for (const sd of mirrors) for (let i = 0; i < pts.length - 1 && n < NM; i++) {
      const a = pts[i], b = pts[i + 1], t0 = i / (pts.length - 1), t1 = (i + 1) / (pts.length - 1);
      u.uMarkA.value[n].set(a[0] * sd, a[1], b[0] * sd, b[1]); u.uMarkW.value[n].set(w0 + (w1 - w0) * t0, w0 + (w1 - w0) * t1, 1, 0); u.uMarkC.value[n].set(mk.col ?? f.ink); n++;
    }
  }
  look.fur.strokes.forEach((s, i) => { if (i < NF) u.uFur.value[i].set(...s); });
  return new ShaderMaterial({ vertexShader: VERT, fragmentShader: FACE_F, uniforms: u, extensions: { derivatives: true } });
}
