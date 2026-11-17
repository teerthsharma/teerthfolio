// SIGIL: a magic circle drawn analytically in polar coordinates on one quad, crisp at any size and viewing angle
// (every stroke is measured in screen pixels through the local Jacobian of the card coordinates, so a floor circle
// seen at a grazing angle keeps its line width). One draw call per sigil; every option is a uniform except blend.
// Per-pixel cost is the same at any count, so tier <= 1 halves only the fine ticks and glyphs; gems and symmetry keep their design counts.
//   makeSigil(engine, opts) -> { group, update(ts, cue), set(patch), dispose() }      DEFAULTS, PRESETS, demo(engine)
//   card    radius m; face "ground" | "upright" | "camera"; blend "add" (light: rgb added, alpha 0), "normal"
//           (see-through overlay, premultiplied), "solid" (hides what is behind, writes depth, alpha 0.6).
//   parts   radii are shares of the radius: rings [{ r, w }] (or plain numbers), ticks, glyphs (block runes in a band; boil reseeds them every frame),
//           star {points/skip}, symmetry (n-fold spoke | arch | orb motifs, up to 2), gems, fill, emblem (mangekyo | ovals).
//   draw-on set({ k }) reveals the parts in that order, each by its own angle sweep, rune, tick, motif, gem or pen
//           stroke; the emblem opens like a lid from a slit; pop > 0 overshoots the scale while it draws.
//   colour  hex in, linear out, base luma capped at 0.92; lines and gems are x (1 + emit), so only emit blooms.
import { AdditiveBlending, Color, DoubleSide, Group, Mesh, NormalBlending, PlaneGeometry, ShaderMaterial, Vector2, Vector4 } from "three";
import { glslFor } from "../../tools/index.js";

export const DEFAULTS = {
  radius: 1, face: "ground", blend: "add", preset: null, plateDepth: true,
  rings: [{ r: 1, w: 0 }, { r: 0.855, w: 0 }, { r: 0.6, w: 0 }, { r: 0.382, w: 0 }],
  line: 2.5, outline: 0, color: "#d9a441", ink: "#1a0d12", emit: 0.6,
  fill: { color: "#2a1608", alpha: 0, r: 1 },
  ticks: { count: 48, r: 0.964, length: 0.09, spin: 0 },
  glyphs: { count: 0, r0: 0.64, r1: 0.84, seed: 1, boil: false, spin: 0 },
  star: { points: 7, skip: 3, r: 0.6, spin: 0 },
  symmetry: { n: 0, kind: "spoke", r: null, size: null, spin: 0 },
  gems: { count: 0, r: 0.727, size: 0.035, colors: ["#e0313b", "#f08a24", "#f2d03b", "#3fbf5a", "#2f8fe0", "#6b4fd8", "#e04fb0"], spin: 0 },
  emblem: { kind: null, r: 1, body: "#b00000", mark: "#1a0d12", emit: 0, blades: 3, twist: 0.55, spin: 0 },
  spin: 0, angle: 0, fps: 12, k: 1, pop: 0, alpha: 1,
};

const OFF = { rings: [], ticks: null, glyphs: null, star: null, symmetry: null, gems: null, fill: null, emit: 0, blend: "normal" };
export const PRESETS = {
  mangekyo: { ...OFF, emblem: { kind: "mangekyo", r: 1, body: "#b00000", mark: "#1a0d12", emit: 0, blades: 3, twist: 0.55 } },
  ovals: { ...OFF, emblem: { kind: "ovals", r: 1, body: "#641520", mark: "#db202b", emit: 1.3, blades: 3, twist: 0.55 } },
};

const VERT = /* glsl */ `
  uniform float uBill; varying vec2 vP;
  void main() {
    vP = position.xy;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    if (uBill > 0.5) { mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0); mv.xy += position.xy * length(modelMatrix[0].xyz); }
    gl_Position = projectionMatrix * mv;
  }`;

const FRAG = /* glsl */ `
  ${glslFor(["noise"])}
  varying vec2 vP;
  uniform vec2 uRes; uniform float uLine; uniform float uOutline; uniform float uMode; uniform float uAlpha; uniform float uMaxR;
  uniform vec3 uCol; uniform vec3 uInk; uniform vec4 uFill; uniform float uFillR;
  uniform vec4 uRing[8]; uniform float uRingN;
  uniform vec4 uTick; uniform float uTickA;
  uniform vec4 uGly; uniform float uGlyA; uniform float uSeed;
  uniform vec4 uStar; uniform float uStarA; uniform float uStarRank[16];
  uniform vec4 uSym[2]; uniform vec4 uSymS[2]; uniform float uSymN;
  uniform vec4 uGem; uniform float uGemA; uniform vec3 uGemCol[8]; uniform float uGemCN;
  uniform vec4 uEmb; uniform vec4 uEmbBody; uniform vec3 uEmbMark; uniform vec2 uEmbP;
  const float TAU = 6.2831853;
  vec2 gX; vec2 gY; float gL;
  // card units per pixel along n; edge: signed px of an area edge; lineE: signed px to a stroke of half width max(hw, line)
  float sc(vec2 n) { return max(length(vec2(dot(gX, n), dot(gY, n))), 1e-7); }
  float edge(float sd, vec2 n) { return sd / sc(n); }
  float lineE(vec2 v, float hw) { float l = length(v); float g = sc(v / max(l, 1e-7)); return (l - max(hw, gL * g)) / g; }
  float cov(float e) { return clamp(0.5 - e, 0.0, 1.0); }
  vec4 over(vec4 b, vec3 c, float a) { return vec4(c * a + b.rgb * (1.0 - a), a + b.a * (1.0 - a)); }
  vec2 rotv(vec2 v, float a) { float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }
  float imod(float a, float n) { return floor(mod(a + 0.5, n)); }
  vec4 cellAxes(float a, float n, float ro, out float c) {
    float s = TAU / n; c = floor((a - ro) / s + 0.5); float th = c * s + ro;
    return vec4(cos(th), sin(th), -sin(th), cos(th));
  }
  void main() {
    vec2 p = vP;
    gX = dFdx(p); gY = dFdy(p);
    float pxs = uRes.y / 800.0, oPx = uOutline * pxs;
    gL = max(0.5 * uLine * pxs, 0.6);
    float r = length(p);
    vec2 rh = p / max(r, 1e-6);
    if (edge(r - uMaxR, rh) > gL + oPx + 2.0) discard;
    float ang = atan(p.y, p.x + 1e-9);
    vec4 C = vec4(0.0);
    float eL = 1e4;
    if (uFill.w > 0.0) C = over(C, uFill.rgb, uFill.w * cov(edge(r - uFillR, rh)));
    if (uEmb.x > 0.5) {
      float re = uEmb.y, kk = max(uEmb.z, 0.01);
      vec2 pl = p / re;
      float al = length(vec2(pl.x, pl.y / kk));
      vec2 ag = vec2(pl.x, pl.y / (kk * kk)) / max(al, 1e-6);
      float agl = max(length(ag), 1e-6);
      float lid = step(1e-4, uEmb.z) * cov(edge((al - 1.0) / agl * re, ag / agl));
      if (uEmbBody.w > 0.0) C = over(C, uEmbBody.rgb, uEmbBody.w * lid * cov(edge(r - re, rh)));
      vec2 pe = rotv(pl, -uEmb.w);
      float rho = length(pe);
      vec2 eh = pe / max(rho, 1e-6);
      float m = 0.0;
      if (uEmb.x < 1.5) {
        float u = fract(uEmbP.x * atan(pe.y, pe.x + 1e-9) / TAU + uEmbP.y * rho);
        vec2 g = sign(u - 0.5) * (vec2(-eh.y, eh.x) * uEmbP.x / (TAU * max(rho, 0.02)) + eh * uEmbP.y) + eh * 0.18;
        float gl = max(length(g), 1e-6);
        float sd = (abs(u - 0.5) + 0.18 * rho - 0.2) / gl;
        vec2 n = g / gl;
        float lim = max(0.12 - rho, rho - 0.95);
        if (lim > sd) { sd = lim; n = eh; }
        float sp = rho - 0.16;
        if (sp < sd) { sd = sp; n = eh; }
        float sr = abs(rho - 0.985) - 0.015;
        if (sr < sd) { sd = sr; n = eh; }
        m = cov(edge(sd * re, rotv(n, uEmb.w)));
      } else {
        vec2 q = vec2(pe.x / 0.62, pe.y);
        float qr = max(length(q), 1e-6);
        vec2 qg = vec2(pe.x / 0.3844, pe.y) / qr;
        float qgl = max(length(qg), 1e-6);
        vec2 qn = rotv(qg / qgl, uEmb.w);
        float e = 1e4;
        for (int i = 0; i < 3; i++) {
          float r0 = i == 0 ? 0.22 : (i == 1 ? 0.38 : 0.55);
          e = min(e, lineE(qn * ((qr - r0) / qgl * re), 0.018 * re));
        }
        for (int s = 0; s < 2; s++) {
          float fs = float(s) * 2.0 - 1.0;
          vec2 w = pe - vec2(fs * 0.05, 0.35);
          float wl = max(length(w), 1e-6);
          if (step(-0.45, pe.y) * step(pe.y, 0.15) * step(0.25, fs * pe.x) > 0.5) e = min(e, lineE(rotv(w / wl, uEmb.w) * ((wl - 0.62) * re), 0.03 * re));
          vec2 t = vec2(pe.x, pe.y * fs);
          float td = t.y - 0.94, d1 = dot(t - vec2(0.0, 0.66), vec2(0.907, -0.421)), d2 = dot(t - vec2(0.0, 0.66), vec2(-0.907, -0.421));
          vec2 tn = vec2(0.0, 1.0);
          if (d1 > td) { td = d1; tn = vec2(0.907, -0.421); }
          if (d2 > td) { td = d2; tn = vec2(-0.907, -0.421); }
          e = min(e, edge(td * re, rotv(vec2(tn.x, tn.y * fs), uEmb.w)));
        }
        m = cov(e);
      }
      C = over(C, uEmbMark, m * lid);
    }
    for (int i = 0; i < 8; i++) {
      if (float(i) >= uRingN) break;
      vec4 R = uRing[i];
      if (fract(R.w * (ang - 1.5707963) / TAU) < R.z) eL = min(eL, lineE(rh * (r - R.x), R.y));
    }
    if (uGly.x > 0.5) {
      float c; vec4 E = cellAxes(ang, uGly.x, uGlyA, c);
      float gi = imod(c, uGly.x);
      if ((gi + 0.5) / uGly.x <= uGly.w) {
        float rm = 0.5 * (uGly.y + uGly.z), gh = 0.34 * (uGly.z - uGly.y);
        float gw = min(0.3 * rm * TAU / uGly.x, 0.8 * gh);
        vec2 q = vec2(dot(p, E.xy) - rm, dot(p, E.zw));
        vec2 best = vec2(1e4);
        for (int j = 0; j < 12; j++) {
          float fj = float(j);
          float A = floor(imod(fj, 6.0) * 0.5) - 1.0, B = imod(fj, 2.0) - 1.0;
          vec2 a = j < 6 ? vec2(A * gh, B * gw) : vec2(B * gh, A * gw);
          vec2 ba = j < 6 ? vec2(0.0, gw) : vec2(gh, 0.0);
          vec2 pa = q - a;
          vec2 v = pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
          if (h21(vec2(gi * 12.0 + fj, uSeed)) < 0.48 && dot(v, v) < dot(best, best)) best = v;
        }
        eL = min(eL, lineE(best.x * E.xy + best.y * E.zw, 0.0));
      }
    }
    if (uTick.x > 0.5) {
      float c; vec4 E = cellAxes(ang, uTick.x, uTickA, c);
      float qx = dot(p, E.xy), qy = dot(p, E.zw);
      float vx = qx - clamp(qx, uTick.y - uTick.z, uTick.y);
      if ((imod(c, uTick.x) + 0.5) / uTick.x <= uTick.w) eL = min(eL, lineE(vx * E.xy + qy * E.zw, 0.0));
    }
    for (int j = 0; j < 2; j++) {
      if (float(j) >= uSymN) break;
      vec4 S = uSym[j]; vec4 Z = uSymS[j];
      float c; vec4 E = cellAxes(ang, S.x, Z.z, c);
      if ((imod(c, S.x) + 0.5) / S.x > S.w) continue;
      vec2 q = vec2(dot(p, E.xy) - S.z, dot(p, E.zw));
      if (S.y < 0.5) {
        vec2 g = vec2(sign(q.x) / Z.x, sign(q.y) / Z.y);
        float gl = max(length(g), 1e-6);
        vec2 n = g / gl;
        eL = min(eL, edge((abs(q.x) / Z.x + abs(q.y) / Z.y - 1.0) / gl, n.x * E.xy + n.y * E.zw));
      } else if (S.y < 1.5) {
        float x = 0.5 * S.x * (ang - Z.z), cx = cos(x);
        vec2 g = rh + vec2(-rh.y, rh.x) * (Z.x * 0.5 * S.x * sign(cx) * sin(x) / max(r, 1e-3));
        float gl = max(length(g), 1e-6);
        eL = min(eL, lineE(g / gl * ((r - S.z - Z.x * abs(cx)) / gl), 0.0));
      } else {
        float ql = max(length(q), 1e-6);
        eL = min(eL, lineE((q.x * E.xy + q.y * E.zw) / ql * (ql - Z.x), 0.0));
      }
    }
    if (uStar.x > 1.5) {
      // segment i (vertex i to i + skip) is segment 0 turned by i TAU / n: turn p back instead of the segment
      float n = uStar.x, seg = uStar.w * n, t1 = TAU * uStar.y / n, cs = cos(TAU / n), sn = sin(TAU / n);
      vec2 a = vec2(0.0, uStar.z), ba = uStar.z * vec2(-sin(t1), cos(t1)) - a;
      vec2 ps = rotv(p, -uStarA), best = vec2(1e4);
      float bi = 0.0;
      for (int i = 0; i < 16; i++) {
        if (float(i) >= n) break;
        float lim = clamp(seg - uStarRank[i], 0.0, 1.0);
        vec2 pa = ps - a;
        vec2 v = pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, lim);
        if (lim > 0.0 && dot(v, v) < dot(best, best)) { best = v; bi = float(i); }
        ps = vec2(cs * ps.x + sn * ps.y, cs * ps.y - sn * ps.x);
      }
      eL = min(eL, lineE(rotv(best, uStarA + TAU * bi / n), 0.0));
    }
    float gA = 0.0; vec3 gC = uCol;
    if (uGem.x > 0.5) {
      float c; vec4 E = cellAxes(ang, uGem.x, uGemA, c);
      vec2 q = vec2(dot(p, E.xy) - uGem.y, dot(p, E.zw));
      float ql = max(length(q), 1e-6);
      vec2 n = (q.x * E.xy + q.y * E.zw) / ql;
      float gi = imod(c, uGem.x);
      if ((gi + 0.5) / uGem.x <= uGem.w) {
        gA = cov(edge(ql - uGem.z, n));
        eL = min(eL, lineE(n * (ql - uGem.z), 0.0));
        float ci = imod(gi, uGemCN);
        for (int i = 0; i < 8; i++) if (abs(float(i) - ci) < 0.5) gC = uGemCol[i];
      }
    }
    C = over(C, gC, gA);
    if (oPx > 0.0) C = over(C, uInk, cov(eL - oPx));
    C = over(C, uCol, cov(eL));
    if (uMode > 1.5) {
      if (C.a < 0.5 || uAlpha < 0.5) discard;
      gl_FragColor = vec4(C.rgb / C.a, 0.6);
    } else {
      if (C.a * uAlpha < 0.002) discard;
      gl_FragColor = uMode > 0.5 ? C * uAlpha : vec4(C.rgb * uAlpha, 0.0);
    }
  }`;

const SUB = new Set(["fill", "ticks", "glyphs", "star", "symmetry", "gems", "emblem"]);
const SYM_KIND = { spoke: [0, 0.28, [0.11, 0.035]], arch: [1, 0.8, [0.05]], orb: [2, 0.7, [0.07]] };
const EMBLEM = { mangekyo: 1, ovals: 2 };
const MODE = { add: 0, normal: 1, solid: 2 };
const FAST = new Set(["k", "alpha", "emit", "angle", "spin"]);
const EXT = 1.25; // quad half-size in radii: room for parts out to r 1.2 and the pop
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const lin = (hex, out) => {
  out.set(hex);
  const y = 0.2126 * out.r + 0.7152 * out.g + 0.0722 * out.b;
  return y > 0.92 ? out.multiplyScalar(0.92 / y) : y < 0.003 ? out.setRGB(0.0043, 0.0037, 0.008) : out;
};
function resolve(o, ...layers) {
  o = { ...o };
  for (const L of layers) for (const key in L ?? {}) {
    const v = L[key], base = o[key] && !Array.isArray(o[key]) ? o[key] : DEFAULTS[key];
    o[key] = SUB.has(key) && v && typeof v === "object" && !Array.isArray(v) ? { ...base, ...v } : v;
  }
  return o;
}

export function makeSigil(engine, opts = {}) {
  let o = resolve(DEFAULTS, PRESETS[opts.preset], opts);
  const blend = o.blend in MODE ? o.blend : "add";
  const v4 = (n) => Array.from({ length: n }, () => new Vector4());
  const U = {
    uRes: engine?.shared?.uRes ?? { value: new Vector2(1280, 800) },
    uBill: { value: 0 }, uLine: { value: 2.5 }, uOutline: { value: 0 }, uMode: { value: MODE[blend] }, uAlpha: { value: 1 }, uMaxR: { value: 1 },
    uCol: { value: new Color() }, uInk: { value: new Color() }, uFill: { value: new Vector4() }, uFillR: { value: 1 },
    uRing: { value: v4(8) }, uRingN: { value: 0 },
    uTick: { value: new Vector4() }, uTickA: { value: 0 },
    uGly: { value: new Vector4() }, uGlyA: { value: 0 }, uSeed: { value: 0 },
    uStar: { value: new Vector4() }, uStarA: { value: 0 }, uStarRank: { value: new Float32Array(16) },
    uSym: { value: v4(2) }, uSymS: { value: v4(2) }, uSymN: { value: 0 },
    uGem: { value: new Vector4() }, uGemA: { value: 0 }, uGemCol: { value: Array.from({ length: 8 }, () => new Color()) }, uGemCN: { value: 1 },
    uEmb: { value: new Vector4() }, uEmbBody: { value: new Vector4() }, uEmbMark: { value: new Color() }, uEmbP: { value: new Vector2(3, 0.55) },
  };
  const mat = new ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, uniforms: U, side: DoubleSide, premultipliedAlpha: true,
    transparent: blend !== "solid", depthWrite: blend === "solid", blending: blend === "add" ? AdditiveBlending : NormalBlending,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4,
  });
  const geo = new PlaneGeometry(2 * EXT, 2 * EXT), mesh = new Mesh(geo, mat), group = new Group();
  mesh.name = "sigil";
  group.userData.plateDepth = o.plateDepth; // the set hides it (post.js); plateDepth: false keeps it drawn over the whole plate
  group.add(mesh);
  const C = { col: new Color(), gem: Array.from({ length: 8 }, () => new Color()), mark: new Color(), tmp: new Color() };
  const slots = [];
  let sym = [], fillA = 0, tier = -1, lastTs = 0;

  function apply() {
    tier = engine?.tier ?? 2;
    const half = (n) => (tier <= 1 ? Math.max(1, Math.round(n / 2)) : Math.round(n));
    mesh.rotation.set(o.face === "ground" ? -Math.PI / 2 : 0, 0, 0);
    U.uBill.value = o.face === "camera" ? 1 : 0;
    U.uLine.value = o.line; U.uOutline.value = o.outline;
    lin(o.color, C.col); lin(o.ink, U.uInk.value);
    slots.length = 0;
    let maxR = 0;
    const stage = (v, c, r) => { slots.push({ v, c }); maxR = Math.max(maxR, r); };
    const rings = (o.rings ?? []).slice(0, 8);
    rings.forEach((g, i) => {
      const r = typeof g === "number" ? g : g.r, w = (typeof g === "number" ? 0 : g.w) ?? 0;
      U.uRing.value[i].set(r, w / 2, 1, i % 2 ? -1 : 1);
      stage(U.uRing.value[i], "z", r + w / 2);
    });
    U.uRingN.value = rings.length;
    const gl = o.glyphs?.count > 0 ? o.glyphs : null;
    U.uGly.value.set(gl ? half(gl.count) : 0, gl?.r0 ?? 0, gl?.r1 ?? 0, 1);
    if (gl) stage(U.uGly.value, "w", gl.r1);
    const tk = o.ticks?.count > 0 ? o.ticks : null;
    U.uTick.value.set(tk ? half(tk.count) : 0, tk?.r ?? 0, tk?.length ?? 0, 1);
    if (tk) stage(U.uTick.value, "w", tk.r);
    sym = (o.symmetry == null ? [] : [].concat(o.symmetry))
      .map((s) => (typeof s === "number" ? { ...DEFAULTS.symmetry, n: s } : { ...DEFAULTS.symmetry, ...s }))
      .filter((s) => s.n > 0).slice(0, 2);
    sym.forEach((s, j) => {
      const K = SYM_KIND[s.kind] ?? SYM_KIND.spoke, r = s.r ?? K[1], [a, b = a * 0.3] = s.size ?? K[2];
      U.uSym.value[j].set(Math.round(s.n), K[0], r, 1); U.uSymS.value[j].set(a, b, 0, 0);
      stage(U.uSym.value[j], "w", r + a);
    });
    U.uSymN.value = sym.length;
    const st = o.star?.points >= 2 ? o.star : null;
    U.uStar.value.x = 0;
    if (st) { // pen order: follow vertex i -> i + skip round each closed loop, so a {7/3} draws in one stroke
      const n = Math.min(16, Math.round(st.points)), m = ((Math.round(st.skip) % n) + n) % n || 1, seen = new Array(n).fill(false), rank = U.uStarRank.value;
      for (let s = 0, idx = 0; s < n; s++) for (let j = s; !seen[j]; j = (j + m) % n) { seen[j] = true; rank[j] = idx++; }
      U.uStar.value.set(n, m, st.r, 1);
      stage(U.uStar.value, "w", st.r);
    }
    const gm = o.gems?.count > 0 ? o.gems : null;
    U.uGem.value.set(gm ? Math.round(gm.count) : 0, gm?.r ?? 0, gm?.size ?? 0, 1);
    const cols = (gm?.colors ?? []).slice(0, 8);
    U.uGemCN.value = Math.max(1, cols.length);
    for (let i = 0; i < 8; i++) { if (i < cols.length) lin(cols[i], C.gem[i]); else C.gem[i].copy(C.col); }
    if (gm) stage(U.uGem.value, "w", gm.r + gm.size);
    const em = o.emblem?.kind in EMBLEM ? o.emblem : null;
    U.uEmb.value.set(em ? EMBLEM[em.kind] : 0, em?.r ?? 1, 1, 0);
    U.uEmbBody.value.w = 0;
    if (em) {
      if (em.body) { lin(em.body, C.tmp); U.uEmbBody.value.set(C.tmp.r, C.tmp.g, C.tmp.b, 1); }
      lin(em.mark, C.mark); U.uEmbP.value.set(em.blades ?? 3, em.twist ?? 0.55);
      stage(U.uEmb.value, "z", em.r);
    }
    const fl = o.fill?.alpha > 0 ? o.fill : null;
    fillA = fl ? fl.alpha : 0;
    if (fl) { lin(fl.color, C.tmp); U.uFill.value.set(C.tmp.r, C.tmp.g, C.tmp.b, 0); U.uFillR.value = fl.r; maxR = Math.max(maxR, fl.r); }
    U.uMaxR.value = maxR + 0.02;
    scalars(); rotate(lastTs);
  }
  // stage i of N draws over k in [i, i + 2] / (N + 1): each part starts while the one before it finishes
  function scalars() {
    const k = clamp01(o.k), g = 1 + o.emit, N = slots.length, w = N ? (N + 1) / 2 : 1;
    U.uCol.value.copy(C.col).multiplyScalar(g);
    for (let i = 0; i < 8; i++) U.uGemCol.value[i].copy(C.gem[i]).multiplyScalar(g);
    U.uEmbMark.value.copy(C.mark).multiplyScalar(1 + (o.emblem?.emit ?? 0));
    for (let i = 0; i < N; i++) slots[i].v[slots[i].c] = clamp01((k - i / (N + 1)) * w);
    U.uFill.value.w = fillA * clamp01(k * w);
    U.uAlpha.value = clamp01(o.alpha);
    mesh.scale.setScalar(o.radius * (1 + o.pop * Math.sin(Math.PI * clamp01(k / 0.6))));
  }
  function rotate(ts) {
    lastTs = ts;
    const f = Math.floor(ts * o.fps + 1e-6), t = f / o.fps, a = o.angle + o.spin * t;
    U.uSeed.value = (o.glyphs?.seed ?? 0) + (o.glyphs?.boil ? f : 0);
    U.uTickA.value = a + (o.ticks?.spin ?? 0) * t;
    U.uGlyA.value = a + (o.glyphs?.spin ?? 0) * t;
    U.uStarA.value = a + (o.star?.spin ?? 0) * t;
    U.uGemA.value = a + (o.gems?.spin ?? 0) * t;
    U.uEmb.value.w = a + (o.emblem?.spin ?? 0) * t;
    for (let j = 0; j < sym.length; j++) U.uSymS.value[j].z = a + (sym[j].spin ?? 0) * t;
  }
  function set(patch = {}) {
    let fast = true;
    for (const key in patch) if (!FAST.has(key)) fast = false;
    if (fast) { Object.assign(o, patch); scalars(); rotate(lastTs); return; }
    o = resolve(o, PRESETS[patch.preset], patch);
    o.blend = blend; // the blend mode picks the program, so it stays what it was at creation
    apply();
  }
  apply();
  return {
    group,
    update(ts) { if ((engine?.tier ?? 2) !== tier) apply(); rotate(ts); },
    set,
    dispose() { geo.dispose(); mat.dispose(); },
  };
}

// gallery: a gold floor circle drawing on with a pop (tilted back), a magenta 6/12-fold demon circle popping in
// over a fill, and a solid camera-facing iris that opens as a Mangekyo, turns in steps, then reopens as nested ovals
export function demo(engine) {
  const gold = makeSigil(engine, { radius: 0.42, face: "upright", pop: 0.12, ticks: { spin: 0.35 }, gems: { count: 7 } });
  gold.group.position.set(-0.5, 1.5, 0);
  gold.group.rotation.x = -0.75;
  const demon = makeSigil(engine, {
    radius: 0.42, face: "upright", blend: "normal", color: "#e955db", emit: 0.8, outline: 1.5, spin: -0.6, pop: 0.18,
    rings: [0.4, 0.52, 0.75, 0.88, 0.97, 1], ticks: null, star: { points: 6, skip: 2, r: 0.52 },
    glyphs: { count: 36, r0: 0.88, r1: 0.97, seed: 3 }, fill: { color: "#3a0a30", alpha: 0.6 },
    symmetry: [{ n: 6, kind: "arch", r: 0.8 }, { n: 12, kind: "spoke", r: 0.28 }],
  });
  demon.group.position.set(0.5, 1.5, 0);
  const eye = makeSigil(engine, { preset: "mangekyo", radius: 0.4, face: "camera", blend: "solid" });
  eye.group.position.set(0, 0.5, 0);
  const group = new Group();
  group.add(gold.group, demon.group, eye.group);
  const KG = { k: 0 }, KD = { k: 0 }, KE = { k: 0, angle: 0 };
  let shown = "mangekyo";
  return {
    group,
    update(ts) {
      const t = ((ts % 4) + 4) % 4, f = Math.floor(t * 12 + 1e-6);
      KG.k = clamp01(t / 2.2); gold.set(KG); gold.update(t);
      KD.k = clamp01((f - 6) / 6); demon.set(KD); demon.update(t);
      const want = t < 2 ? "mangekyo" : "ovals", e = t - (t < 2 ? 0 : 2);
      if (want !== shown) { eye.set({ preset: want }); shown = want; }
      KE.k = clamp01(e / 0.4);
      KE.angle = want === "mangekyo" ? (Math.PI / 18) * Math.min(12, Math.max(0, Math.floor((e - 0.5) * 12 + 1e-6))) : 0;
      eye.set(KE); eye.update(t);
    },
    dispose() { gold.dispose(); demon.dispose(); eye.dispose(); },
  };
}
