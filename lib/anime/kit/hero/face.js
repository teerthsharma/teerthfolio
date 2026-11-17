// HERO FACE: everything crisp on the head. One analytic decal over the head mesh paints the nose pad and its
// gloss, the whisker pores, the mouth (closed, w, smile, grin, open, snarl) with clean separate teeth and a
// tongue, the brows and the markings, anti-aliased in pixels; eyes are anime-eye-decal quads bent onto the head;
// whiskers are pup.js constant-pixel ribbons. Coordinates are head-local front projection (metres).
import { Color, Mesh, PlaneGeometry, ShaderMaterial, Vector2, Vector3, Vector4 } from "three";
import { eyeMaterial } from "../anime-eye-decal.js";
import { lineGeometry, lineMaterial } from "../../pup.js";
import { SHADOW_GLSL } from "../../render/shadow.js";
import { DOME, darker, fieldOf } from "./body.js";

export const MOUTHS = ["closed", "w", "smile", "grin", "open", "snarl", "smirk", "grit"];
// nose [x, y, half width, half height]; mouth [line y, half width, corner lift, nose bottom y]; muzzle cream ellipse; brow centre
export const FACE = { nose: [0, 0.158, 0.05, 0.031], mouth: [0.066, 0.074, 0.0, 0.127], muzzle: [0, 0.098, 0.112, 0.08], brow: [0.084, 0.262], eye: [0.088, 0.206] };
const NM = 24;

// the head surface from its SDF: front projection z(x, y), the normal, and a march along a normal onto it
export function headSurface(prims) {
  const f = fieldOf(prims), e = 0.0015;
  const zAt = (x, y) => { let a = 0.45, b = 0.0; for (let i = 0; i < 26; i++) { const m = (a + b) / 2; if (f(x, y, m) > 0) a = m; else b = m; } return (a + b) / 2; };
  const nAt = (p) => new Vector3(f(p.x + e, p.y, p.z) - f(p.x - e, p.y, p.z), f(p.x, p.y + e, p.z) - f(p.x, p.y - e, p.z), f(p.x, p.y, p.z + e) - f(p.x, p.y, p.z - e)).normalize();
  const onto = (p, n) => { let a = -0.06, b = 0.06; for (let i = 0; i < 24; i++) { const m = (a + b) / 2; if (f(p.x + n.x * m, p.y + n.y * m, p.z + n.z * m) > 0) b = m; else a = m; } return p.clone().addScaledVector(n, (a + b) / 2); };
  const at = (x, y) => { const p = new Vector3(x, y, zAt(x, y)); return { p, n: nAt(p) }; };
  return { zAt, nAt, onto, at, f };
}

export function eyeMesh(surf, o) {
  const { p: C, n: N } = surf.at(o.x, o.y);
  const T = new Vector3(1, 0, 0).addScaledVector(N, -N.x).normalize(), B = new Vector3().crossVectors(N, T);
  const ca = Math.cos(o.tilt ?? 0), sa = Math.sin(o.tilt ?? 0);
  const g = new PlaneGeometry(o.w, o.h, 10, 10), P = g.attributes.position;
  for (let i = 0; i < P.count; i++) {
    const u = P.getX(i) * ca - P.getY(i) * sa, v = P.getX(i) * sa + P.getY(i) * ca;
    const q = surf.onto(C.clone().addScaledVector(T, u).addScaledVector(B, v), N).addScaledVector(N, o.lift ?? 0.0025);
    P.setXYZ(i, q.x, q.y, q.z);
  }
  g.computeVertexNormals();
  const m = new Mesh(g, eyeMaterial(o));
  m.renderOrder = 2;
  m.userData.eye = true;
  return m;
}

export function whiskers(engine, surf, col, px = 0.8, root = [0.072, 0.122]) {
  const curves = [];
  for (const s of [1, -1]) for (let k = 0; k < 3; k++) {
    const { p, n } = surf.at(s * root[0], root[1] - k * 0.016);
    const a = p.addScaledVector(n, 0.002), pts = [];
    const clear = (q) => { for (let j = 0; j < 6; j++) { const d = surf.f(q.x, q.y, q.z); if (d >= 0.008) break; q.addScaledVector(surf.nAt(q), 0.008 - d); } return q; };
    for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(clear(a.clone().add(new Vector3(s * (0.012 + 0.2 * t), (0.012 - 0.014 * k) * t - 0.035 * t * t * (0.3 + 0.5 * k), -0.03 * t - 0.06 * t * t)))); }
    curves.push(pts);
  }
  const m = new Mesh(lineGeometry(curves), lineMaterial(engine.shared, col, px));
  m.frustumCulled = false;
  return m;
}

const VERT = /* glsl */ `
  attribute vec3 aCol; attribute vec3 aShade;
  varying vec3 vP; varying vec3 vCol; varying vec3 vShade; varying float vNz; varying vec3 vWP; varying vec3 vWN;
  void main() {
    vP = position; vNz = normal.z; vWP = (modelMatrix * vec4(position, 1.0)).xyz; vWN = mat3(modelMatrix) * normal; vCol = aCol; vShade = aShade;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

const FRAG = /* glsl */ `
  uniform vec3 uLightL; uniform float uHeadR; uniform vec3 uLightCol; uniform vec4 uS0; uniform vec4 uS1;
  uniform vec4 uMuz; uniform vec3 uMuzCol; uniform vec3 uMuzShade;
  uniform vec4 uNose; uniform vec3 uNoseCol; uniform vec3 uNoseShade;
  uniform vec4 uMouth; uniform vec4 uMouthP; uniform vec3 uInk; uniform vec3 uGum; uniform vec3 uTongue; uniform vec3 uTooth; uniform vec3 uToothShade;
  uniform vec4 uBrowR; uniform vec4 uBrowL; uniform vec4 uBrow; uniform vec3 uBrowCol;
  uniform vec4 uMarkA[${NM}]; uniform vec4 uMarkW[${NM}]; uniform vec3 uMarkC[${NM}];
  uniform vec4 uPore; uniform vec3 uPoreCol; uniform vec4 uHair; uniform float uTeeth;
  varying vec3 vP; varying vec3 vCol; varying vec3 vShade; varying float vNz; varying vec3 vWP; varying vec3 vWN;
  ${SHADOW_GLSL}
  const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
  float gB, gSd; vec4 acc;
  // d: signed distance (< 0 inside), any unit. Coverage and a centred line, both measured in pixels.
  float px(float d) { return d / max(fwidth(d), 1e-7); }
  float fill(float d) { return clamp(0.5 - px(d), 0.0, 1.0); }
  float edge(float d, float wpx) { return clamp(0.5 * wpx + 0.5 - abs(px(d)), 0.0, 1.0); }
  vec3 lit(vec3 a) { vec3 c = a * uLightCol; return c * min(1.0, uS0.w / max(dot(c, LUMA), 1e-4)); }
  vec3 cel(vec3 a, vec3 s) { return mix(s, lit(a), gB); }
  void put(vec3 c, float a) { acc.rgb = mix(acc.rgb, c, a); acc.a = max(acc.a, a); }
  float seg(vec2 p, vec2 a, vec2 b, float w0, float w1) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-9), 0.0, 1.0); return length(pa - ba * h) - mix(w0, w1, h) * 0.5; }
  float strokeY(vec2 p, float c, float s, float hl, float lw) { float d = abs(p.y - c) / sqrt(1.0 + s * s), e = abs(p.x) - hl; return (e > 0.0 ? length(vec2(e, d)) : d) - lw; }

  // a row of n teeth along the edge y = e(x) (dir 1 hangs down, -1 stands up), length L; fangs near the corners
  void teethRow(vec2 p, float e, float L, float hw, float n, float sharp, float dir, float fang) {
    float tw = 2.0 * hw / n, fi = (p.x + hw) / tw, tx = fract(fi) * 2.0 - 1.0, ci = (floor(fi) + 0.5) * tw - hw;
    float big = fang * step(0.38 * hw, abs(ci)) * step(abs(ci), 0.74 * hw);
    float g = mix(sqrt(max(0.0, 1.0 - pow(abs(tx), 4.0))), 1.0 - abs(tx), max(sharp, big));
    float d = max((e - dir * L * (1.0 + 0.9 * big) * g - p.y) * dir, abs(p.x) - hw);
    float a = fill(d);
    put(cel(uTooth, uToothShade), a);
    put(uInk, a * edge(d, 1.2) * 0.7);
  }

  void mouth(vec2 p) {
    float kind = uMouth.x, amt = uMouth.y, sharp = uMouth.z, fang = uMouth.w;
    float yM = uMouthP.x, w = uMouthP.y, cu = uMouthP.z, ny = uMouthP.w, lw = 0.0018, ax = abs(p.x), topY = yM + 0.004;
    bool open = kind > 3.5 && kind < 4.5, snarl = kind > 4.5 && kind < 5.5;
    if (kind > 2.5 && kind < 5.5) { // grin, open, snarl: an opening between the edges yU and yL
      float ww = w * (open ? 0.8 + 0.14 * amt : 1.0), u = clamp(p.x / ww, -1.0, 1.0), q = 1.0 - u * u;
      float lift = open ? 0.004 + 0.006 * amt : (snarl ? 0.008 + 0.01 * amt : 0.006 + 0.022 * amt);
      float yU = yM + cu + lift * u * u + (snarl ? 0.008 * amt * q * q : 0.0);
      float h = open ? 0.006 + 0.05 * amt : (snarl ? 0.008 + 0.024 * amt : 0.006 + 0.026 * amt);
      float yL = yU - h * pow(q, open ? 0.62 : 0.8);
      float dOpen = max(max(p.y - yU, yL - p.y), ax - ww), inside = fill(dOpen);
      if (inside > 0.0) {
        put(uGum, inside);
        if (open) put(cel(uTongue, uTongue * vec3(0.72, 0.55, 0.62)), inside * fill(length((p - vec2(0.0, yL + 0.28 * h)) / vec2(ww * 0.55, h * 0.4)) - 1.0));
        float L = (open ? min(0.016, 0.28 * h + 0.004) : h * 0.52) * uTeeth;
        teethRow(p, yU, L, ww * 0.97, open ? 9.0 : 10.0, sharp, 1.0, fang);
        teethRow(p, yL, L * (open ? 0.85 : 1.0), ww * (open ? 0.84 : 0.94), open ? 8.0 : 9.0, sharp, -1.0, fang * 0.7);
      }
      put(uInk, fill(abs(dOpen) - lw));
      topY = yU;
    } else if (kind > 5.5) { // smirk: a closed line, one corner hauled up into a cheek crease with a fang under it
      float hw = w * 0.8, u = clamp(p.x / hw, -1.0, 1.0), up = max(u, 0.0), dn = min(u, 0.0);
      float ys = yM - 0.002 * amt + 0.022 * amt * up * up + 0.006 * amt * dn * dn;
      float dl = max(abs(p.y - ys) / (1.0 + 2.0 * amt * up), abs(p.x) - hw) - lw * 1.1;
      put(uInk, fill(dl));
      vec2 k = vec2(hw, yM + 0.02 * amt);
      put(uInk, fill(seg(p, k, k + vec2(0.005, 0.009), lw * 1.8, lw * 0.5)));
      float fx = 0.62 * hw, fy = yM - 0.002 * amt + 0.022 * amt * 0.38 - lw, t = (fy - p.y) / 0.015;
      float dT = max(max(-t, t - 1.0) * 0.015, abs(p.x - fx) - 0.0045 * (1.0 - t));
      put(cel(uTooth, uToothShade), fill(dT) * step(0.3, amt));
      put(uInk, edge(dT, 1.2) * 0.8 * step(0.3, amt));
      topY = yM;
    } else if (kind < 0.5) { // closed: one line, the ends curling up (amt > 0) or down (amt < 0)
      float hw = w * 0.72, c = 0.004 + 0.012 * amt, u = p.x / hw;
      put(uInk, fill(strokeY(p, yM + c * u * u, 2.0 * c * u / hw, hw, lw)));
    } else if (kind < 1.5) { // the seal w: two lower arcs either side of the philtrum
      float r = 0.019 + 0.006 * amt; vec2 c = vec2(sign(p.x) * r, yM + 0.6 * r);
      float d = p.y < c.y ? abs(length(p - c) - r) : min(length(p - vec2(0.0, c.y)), length(p - vec2(sign(p.x) * 2.0 * r, c.y)));
      put(uInk, fill(d - lw));
      topY = c.y;
    } else { // smile: a wider U with turned-up corners; an optional fang under the line
      float hw = w * 0.86, c = 0.006 + 0.018 * amt, u = p.x / hw;
      put(uInk, fill(strokeY(p, yM + c * u * u, 2.0 * c * u / hw, hw, lw)));
      vec2 k = vec2(sign(p.x) * hw, yM + c);
      put(uInk, fill(seg(p, k, k + vec2(sign(p.x) * 0.006, 0.006), lw * 1.6, lw * 0.6)));
      if (fang > 0.5) {
        float fx = 0.42 * hw, fy = yM + c * 0.18 - lw, t = (fy - p.y) / 0.016;
        float dT = max(max(-t, t - 1.0) * 0.016, abs(p.x - fx) - 0.0048 * (1.0 - t));
        put(cel(uTooth, uToothShade), fill(dT));
        put(uInk, edge(dT, 1.2) * 0.8);
      }
    }
    put(uInk, fill(seg(p, vec2(0.0, ny), vec2(0.0, topY), lw * 2.0, lw * 2.0)));
  }

  // designed shadow shapes, hard-edged, in head space: under the brow ridge, under the muzzle, the hair on the forehead
  float shadowShapes(vec2 p) {
    vec2 e0 = (vec2(abs(p.x), p.y) - vec2(0.078, 0.214)) / vec2(0.068, 0.046), e1 = (vec2(abs(p.x), p.y) - vec2(0.078, 0.2)) / vec2(0.066, 0.042);
    float brw = max((length(e0) - 1.0) * 0.046, -(length(e1) - 1.0) * 0.046);
    vec2 m0 = (p - vec2(0.0, 0.098)) / vec2(0.112, 0.08), m1 = (p - vec2(0.0, 0.109)) / vec2(0.112, 0.08);
    float mz = max((length(m0) - 1.0) * 0.08, -(length(m1) - 1.0) * 0.08);
    float d = min(brw, mz);
    vec2 pp = vec2(p.x * gSd, p.y), j0 = (pp - vec2(0.0, 0.08)) / vec2(0.21, 0.15), j1 = (pp - vec2(0.035, 0.1)) / vec2(0.2, 0.13);
    d = min(d, max(max(length(j0) - 1.0, -(length(j1) - 1.0)) * 0.13, p.y - 0.09));
    if (uHair.x > 0.5) { float hl = uHair.y - 0.011 * abs(sin(p.x * 41.0 + 0.6)); d = min(d, max(p.y - hl, hl - uHair.z - p.y)); }
    return fill(d);
  }
  // a drawn lip under the mouth line: a half ellipse arc
  float lipLine(vec2 p, float yM) {
    vec2 c = vec2(0.0, yM - 0.043), q = (p - c) / vec2(0.032, 0.011);
    return max(fill(abs(length(q) - 1.0) * 0.011 - 0.0012), 0.0) * step(p.y, c.y + 0.001) * smoothstep(0.0, 0.5, 1.0 - abs(q.x));
  }

  float brow(vec2 p, vec4 b, float side) {
    vec2 c = b.xy - vec2(0.0, b.w), dir = vec2(side * cos(b.z), sin(b.z));
    float t = clamp(dot(p - c, dir) / uBrow.x + 0.5, 0.0, 1.0);
    vec2 cp = c + dir * (t - 0.5) * uBrow.x + vec2(0.0, uBrow.w * (1.0 - pow(2.0 * t - 1.0, 2.0)));
    return length(p - cp) - uBrow.y * mix(1.0, 0.4, t * t);
  }

  void main() {
    if (vNz < 0.08 || vP.z < 0.04) discard;
    // the material's analytic face shadow (id 2), in head space: the same boundary as the head under the decal
    vec2 lh = vec2(uLightL.x, uLightL.z); float e = 0.06 + uS0.y;
    gB = mix(smoothstep(-e, e, vP.x / uHeadR * sign(lh.x + 1e-5) + lh.y / max(length(lh), 1e-4)), 1.0, uS1.w);
    gSd = lh.x >= 0.0 ? 1.0 : -1.0;
    vec3 N = normalize(vWN);
    if (uShadowP.x > 0.0) {
      vec3 Ls = -normalize(vec3(uShadowMat[0].z, uShadowMat[1].z, uShadowMat[2].z) + 1e-9);
      gB = min(gB, 1.0 - rxCast(vWP, N) * uShadowP.w * smoothstep(-0.12, -0.02, dot(N, Ls)));
    }
    vec2 p = vP.xy;
    float mz = 1.0 - smoothstep(-0.02, 0.02, length((p - uMuz.xy) / uMuz.zw) - 1.0);
    acc = vec4(cel(mix(vCol, uMuzCol, mz), mix(vShade, uMuzShade, mz)), 0.0);
    vec2 q = vec2(abs(p.x - uNose.x), p.y - uNose.y) / uNose.zw, g2 = (p - uNose.xy) / uNose.zw;
    float nose = fill(max(max(q.y - (0.72 - 0.22 * q.x * q.x), -(q.y + 0.95 - 0.55 * q.x * q.x)), q.x - (0.5 + 0.5 * (q.y + 0.95) / 1.67)));
    put(cel(uNoseCol, uNoseShade), nose);
    put(uNoseShade * 0.5, nose * fill(length((q - vec2(0.42, -0.4)) / vec2(0.2, 0.12)) - 1.0));
    put(min(lit(vec3(1.0)), vec3(0.93)), nose * (0.3 + 0.7 * gB) * fill(length((g2 - vec2(-0.3, 0.4)) / vec2(0.2, 0.085)) - 1.0));
    if (uPore.x > 0.0) for (int r = 0; r < 3; r++) for (int i = 0; i < 4; i++) {
      vec2 c = vec2(0.034 + 0.0125 * float(i) + 0.006 * float(r), 0.118 - 0.013 * float(r));
      put(uPoreCol, fill(length(vec2(abs(p.x), p.y) - c) - uPore.y));
    }
    put(mix(vShade, uMuzShade, mz), shadowShapes(p) * 0.999);
    for (int i = 0; i < 4; i++) { float fi = float(i), y0 = 0.15 + 0.022 * fi, x0 = 0.15 + 0.012 * mod(fi, 2.0); // fur breaking at the cheek edge: short slanted ticks in the shade tone
      put(mix(vShade, uMuzShade, mz) * 0.8, fill(seg(vec2(abs(p.x), p.y), vec2(x0, y0), vec2(x0 + 0.03, y0 - 0.014), 0.0035, 0.0006))); }
    mouth(p);
    if (uMouth.x < 2.5) put(uInk, lipLine(p, uMouthP.x) * 0.85);
    for (int i = 0; i < ${NM}; i++) { if (uMarkW[i].z < 0.5) break; put(uMarkC[i], fill(seg(p, uMarkA[i].xy, uMarkA[i].zw, uMarkW[i].x, uMarkW[i].y))); }
    if (uBrow.z > 0.0) put(uBrowCol, max(fill(brow(p, uBrowR, 1.0)), fill(brow(p, uBrowL, -1.0))));
    if (acc.a < 0.003) discard;
    gl_FragColor = vec4(acc.rgb, 1.0);
  }`;

const V3 = (c) => new Color(c);
export function faceMaterial(shared, spec) {
  const f = spec.fur, m = spec.mouth ?? {}, brows = spec.brows ?? {};
  const u = {
    uLightL: { value: new Vector3(0, 0, 1) }, uHeadR: { value: DOME.r[0] }, uLightCol: shared.uLightCol, uS0: shared.uS0, uS1: shared.uS1,
    tShadow: shared.tShadow, uShadowMat: shared.uShadowMat, uShadowP: shared.uShadowP, tShadowH: shared.tShadowH, uShadowMatH: shared.uShadowMatH, uShadowPH: shared.uShadowPH,
    uTeeth: { value: ["open", "grin", "snarl"].includes(m.rest) ? 1 : 0.5 },
    uMuz: { value: new Vector4(...FACE.muzzle) }, uMuzCol: { value: V3(f.belly) }, uMuzShade: { value: V3(f.bellyShade) },
    uNose: { value: new Vector4(...FACE.nose) }, uNoseCol: { value: V3(f.nose) }, uNoseShade: { value: V3(f.nose).multiplyScalar(0.55) },
    uMouth: { value: new Vector4(1, 0, m.sharp ?? 0.6, m.fangs ? 1 : 0) }, uMouthP: { value: new Vector4(...FACE.mouth) },
    uInk: { value: V3(f.ink) }, uGum: { value: V3(m.gum ?? "#3a1418") }, uTongue: { value: V3(m.tongue ?? "#c9606a") }, uTooth: { value: V3(m.tooth ?? "#f4efe6") }, uToothShade: { value: V3(m.toothShade ?? "#b9b2c4") },
    uBrowR: { value: new Vector4(FACE.brow[0], FACE.brow[1], 0, 0) }, uBrowL: { value: new Vector4(-FACE.brow[0], FACE.brow[1], 0, 0) },
    uBrow: { value: new Vector4(0.066, 0.0072 * (brows.thick ?? 1), brows.thick === 0 ? 0 : 1, 0.004) }, uBrowCol: { value: V3(brows.col ?? f.ink) },
    uMarkA: { value: Array.from({ length: NM }, () => new Vector4()) }, uMarkW: { value: Array.from({ length: NM }, () => new Vector4()) }, uMarkC: { value: Array.from({ length: NM }, () => new Color()) },
    uPore: { value: new Vector4(f.pores === false ? 0 : 1, 0.0024, 0, 0) }, uPoreCol: { value: V3(f.poreCol ?? darker(f.belly, 0.62)) },
    uHair: { value: new Vector4(spec.hair ? 1 : 0, spec.hair?.shadowY ?? 0.304, spec.hair?.shadowH ?? 0.034, 0) },
  };
  // marks: [u, v] in head-front units (u across the dome, v up from its centre); an arc bulges by `bend`
  let n = 0;
  const toM = ([a, b]) => new Vector2(a * DOME.r[0], DOME.c[1] + b * DOME.r[1]);
  const add = (a, b, w0, w1, col) => { if (n >= NM) return; u.uMarkA.value[n].set(a.x, a.y, b.x, b.y); u.uMarkW.value[n].set(w0, w1, 1, 0); u.uMarkC.value[n].set(col); n++; };
  for (const mk of spec.marks ?? []) {
    const a = toM(mk.at), b = toM(mk.to ?? mk.at), w = mk.w ?? 0.01, w1 = mk.w1 ?? w, col = mk.col ?? "#1a120c";
    if (mk.kind === "dot") add(a, a, w, w, col);
    else if (mk.kind === "arc") {
      const nrm = new Vector2(-(b.y - a.y), b.x - a.x).multiplyScalar(mk.bend ?? 0.3), pts = [];
      for (let i = 0; i <= 4; i++) { const t = i / 4; pts.push(a.clone().lerp(b, t).addScaledVector(nrm, 4 * t * (1 - t))); }
      for (let i = 0; i < 4; i++) add(pts[i], pts[i + 1], w + (w1 - w) * i / 4, w + (w1 - w) * (i + 1) / 4, col);
    } else if (mk.kind === "scar") {
      const d = b.clone().sub(a), nrm = new Vector2(-d.y, d.x).normalize();
      add(a, b, w, w, col);
      for (const t of [0.25, 0.5, 0.75]) { const c = a.clone().lerp(b, t); add(c.clone().addScaledVector(nrm, -w * 2.2), c.clone().addScaledVector(nrm, w * 2.2), w * 0.7, w * 0.7, col); }
    } else add(a, b, w, w1, col);
  }
  return new ShaderMaterial({ uniforms: u, vertexShader: VERT, fragmentShader: FRAG, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
}

// live face channels: mouth state + amount, brows {angle (> 0 lowers the inner ends: anger), drop, tilt, raise}
export function faceChannels(mat, ch) {
  const u = mat.uniforms;
  const grit = ch.mouth === "grit";
  u.uMouth.value.x = grit ? 3 : Math.max(0, MOUTHS.indexOf(ch.mouth)); u.uMouth.value.y = grit ? 0.3 + 0.2 * ch.mouthAmt : ch.mouthAmt;
  u.uTeeth.value = grit ? 1.5 : ["open", "grin", "snarl"].includes(ch.mouth) ? 1 : 0.5;
  u.uBrowR.value.z = ch.brow.angle; u.uBrowR.value.w = ch.brow.drop;
  u.uBrowL.value.z = ch.brow.angle + (ch.brow.tilt ?? 0); u.uBrowL.value.w = ch.brow.drop - (ch.brow.raise ?? 0);
}
