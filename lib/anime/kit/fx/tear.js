// TEAR: a card that opens along a ragged line onto an under-layer colour (or onto the scene behind it), in one draw.
//   Edge: a 1D fractal midpoint profile across the line, level l displacing amp * decay^l px, written closed form as
//   Schauder tents r(s) = sum_l a_l xi_lj tent(2^l s - j), so its slope is exact and lips keep their width on steep teeth.
//   Modes: "tear" (k 0..grow runs a hairline from line[0] to line[1], grow..1 parts the halves to `opening` px),
//   "shear" (the halves also slide apart along the line by `slide` of the card width), "erase" (a band `opening` px wide
//   wipes from line[0] to line[1] over k). bias: share of the motion the + half takes (the half left of line[0] -> line[1]).
//   Cross-section: gap (under, or see-through with a shade) | ink hairline | lip (lipColour x emit, emit > 1 blooms) | page
//   (face colour, map texture in card uv, or the scene itself, dimmed by `dim` on the + half and `fibre` specks).
//   px are card px, 1/800 of the card height (the frame height when screen-glued), so a 1280 x 800 frame reads 1:1.
//   screen: true glues the card to the frame at view depth `dist` m (or `margin` m behind `behind`, a Vector3/Object3D);
//   false is a world card of `size` m in the group's xy plane, front +z. Paper flakes are extra quads in the same draw.
//   Output: see-through overlay (premultiplied, no depth) by default; solid: true writes depth and alpha 0.6 (hard edges).
//   Creation-only: solid and the flake count built (halved at tier <= 1). k comes from set({ k }) or, with `beat`, the cue.
import { BufferAttribute, BufferGeometry, Color, DoubleSide, Group, Mesh, NormalBlending, ShaderMaterial, Vector2, Vector3, Vector4 } from "three";

export const DEFAULTS = {
  mode: "tear", k: 0, beat: null, dur: 1, fps: 12, seed: 1,
  screen: true, dist: 20, behind: null, margin: 0.6, size: [2, 1.25],
  line: [[0.38, 1], [0.6, 0]], levels: 8, amp: 60, decay: 0.58,
  opening: 26, grow: 0.6, bias: 0.5, slide: 0.06,
  lip: 4, lipColour: "#d9a441", emit: 1, hair: 1, ink: "#0e0c16",
  under: "#1fbdb4", face: null, map: null, dim: 0, fibre: 0, shadow: 6, boil: 0.35,
  flakes: 12, flakeColour: null, flakeSize: 10,
  solid: false, order: 10,
};

const RAG = /* glsl */ `
  uniform float uLevels; uniform float uAmp; uniform float uDecay; uniform float uSeed;
  float th(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
  vec2 rag(float s, float len) {
    float r = 0.0, dr = 0.0, a = uAmp, f = 1.0;
    for (int i = 0; i < 8; i++) {
      if (float(i) >= uLevels) break;
      float x = s * f, j = floor(x), u = x - j;
      float xi = th(vec2(j + 0.5, float(i) * 1.37 + uSeed)) * 2.0 - 1.0;
      r += a * xi * (1.0 - abs(2.0 * u - 1.0));
      dr += a * xi * (u < 0.5 ? 2.0 : -2.0) * f / len;
      a *= uDecay; f *= 2.0;
    }
    return vec2(r, dr);
  }`;

const VERT = /* glsl */ `${RAG}
  attribute float aFlake;
  uniform vec4 uLine; uniform float uMode; uniform float uK; uniform float uGrow; uniform float uOpenFull; uniform float uBias;
  uniform float uHair; uniform float uLip; uniform float uFlakeN; uniform float uFlakeSize; uniform float uTime;
  uniform float uScreen; uniform float uDepth; uniform vec2 uSize; uniform float uSpan;
  varying vec2 vUv; varying float vAsp; varying float vKind; varying vec3 vFl;
  float ism(float y) { return 0.5 - sin(asin(clamp(1.0 - 2.0 * y, -1.0, 1.0)) / 3.0); }
  void main() {
    float asp = uScreen > 0.5 ? projectionMatrix[1][1] / projectionMatrix[0][0] : uSize.x / uSize.y;
    vec2 cs = vec2(800.0 * asp, 800.0), c = uv * 2.0 - 1.0, q = uv;
    vKind = 0.0; vFl = vec3(c, 0.0);
    if (aFlake >= 0.0) {
      float h1 = th(vec2(aFlake, 1.7 + uSeed)), h2 = th(vec2(aFlake, 2.9 + uSeed)), h3 = th(vec2(aFlake, 4.1 + uSeed));
      float h4 = th(vec2(aFlake, 5.3 + uSeed)), h5 = th(vec2(aFlake, 6.7 + uSeed));
      float sI = mix(0.06, 0.94, h1), side = h2 < 0.5 ? -1.0 : 1.0;
      float kf = ism(sI / uSpan), kr = uMode > 1.5 ? kf : min(uGrow * kf + h3 * (1.0 - uGrow) * 0.6, 0.9);
      float ph = (uK - kr) / max(1.0 - kr, 1e-3);
      float on = step(0.0, ph) * step(ph, 1.0) * step(aFlake + 0.5, uFlakeN);
      vec2 A = uLine.xy * cs, D = uLine.zw * cs - A;
      float L = max(length(D), 1.0);
      vec2 d = D / L, n = vec2(-d.y, d.x);
      float wRel = uMode > 1.5 ? uOpenFull : uOpenFull * smoothstep(0.0, 1.0, (kr - uGrow) / max(1.0 - uGrow, 1e-3));
      float eB = rag(sI, L).x + side * (wRel * (side > 0.0 ? uBias : 1.0 - uBias) + uHair + uLip * 0.5);
      // torn off the lip when the front (smoothstep of k, inverted above) passes sI, then drift off, sway and fall
      vec2 P = A + d * (sI * L) + n * (eB + side * 40.0 * ph);
      P += vec2(14.0 * (0.5 + h4) * sin(ph * 7.0 + h5 * 6.283), -(140.0 + 260.0 * h4) * ph * ph);
      float ang = h5 * 6.283 + (h3 - 0.5) * 9.0 * ph + 0.25 * sin(uTime * 9.0 + h1 * 6.283);
      float flip = cos(ph * (2.0 + 5.0 * h2) * 3.14159 + h4 * 3.0);
      vec2 sz = uFlakeSize * vec2(0.7 + 0.6 * h3, (0.45 + 0.4 * h4) * max(abs(flip), 0.2)) * (1.0 - smoothstep(0.82, 1.0, ph)) * on;
      vec2 l = c * sz;
      float ca = cos(ang), sa = sin(ang);
      q = (P + vec2(ca * l.x - sa * l.y, sa * l.x + ca * l.y)) / cs;
      vKind = flip > 0.0 ? 1.0 : 2.0;
      vFl = vec3(c, 1.2 / max(min(sz.x, sz.y), 0.5));
    }
    vUv = q; vAsp = asp;
    vec2 xy = q * 2.0 - 1.0;
    if (uScreen > 0.5) {
      float w = projectionMatrix[2][3] < -0.5 ? uDepth : 1.0;
      vec3 v = vec3(0.0, 0.0, -uDepth);
      v.x = (xy.x * w - projectionMatrix[2][0] * v.z - projectionMatrix[3][0]) / projectionMatrix[0][0];
      v.y = (xy.y * w - projectionMatrix[2][1] * v.z - projectionMatrix[3][1]) / projectionMatrix[1][1];
      gl_Position = projectionMatrix * vec4(v, 1.0);
    } else gl_Position = projectionMatrix * modelViewMatrix * vec4(xy * 0.5 * uSize, aFlake >= 0.0 ? 0.002 : 0.0, 1.0);
    if (uK <= 0.0) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  }`;

const FRAG = /* glsl */ `${RAG}
  uniform vec4 uLine; uniform vec2 uEnds; uniform float uMode; uniform float uOpen; uniform float uSlide; uniform float uBias;
  uniform float uLip; uniform float uHair; uniform float uShadow; uniform float uDim; uniform float uFibre; uniform float uBoil;
  uniform float uDraw; uniform float uEmit; uniform float uSolid; uniform float uReach; uniform float uHasUnder; uniform float uHasFace; uniform float uHasMap;
  uniform vec3 uUnder; uniform vec3 uFace; uniform vec3 uLipCol; uniform vec3 uInk; uniform vec3 uFlakeCol; uniform sampler2D uMap;
  varying vec2 vUv; varying float vAsp; varying float vKind; varying vec3 vFl;
  float vn1(float x) { float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(th(vec2(i, uSeed)), th(vec2(i + 1.0, uSeed)), f); }
  void outPx(vec3 P, float A) {
    if (uSolid > 0.5) { if (A < 0.5) discard; gl_FragColor = vec4(P / A, 0.6); }
    else { if (A < 0.002 && max(max(P.r, P.g), P.b) < 0.002) discard; gl_FragColor = vec4(P, A); }
  }
  void main() {
    vec2 cs = vec2(800.0 * vAsp, 800.0), Q = vUv * cs;
    float aa = 0.4 * (fwidth(Q.x) + fwidth(Q.y)) + 1e-4;
    if (vKind > 0.5) {
      vec2 f = vFl.xy;
      float m = max(max(abs(f.x), abs(f.y)), (f.x - f.y) * 0.62 + 0.38);
      if (m > 1.0) discard;
      outPx(m > 1.0 - vFl.z ? uInk : uFlakeCol * (vKind > 1.5 ? 0.72 : 1.0), 1.0);
      return;
    }
    vec2 A = uLine.xy * cs, D = uLine.zw * cs - A;
    float L = max(length(D), 1.0);
    vec2 d = D / L, n = vec2(-d.y, d.x);
    float sp = dot(Q - A, d), e = dot(Q - A, n), s = sp / L, st = uEnds.x * L, fr = uEnds.y * L;
    if (uReach > 0.0 && abs(e) > uReach + 3.0 * aa) discard;
    float taper = uMode > 1.5 ? 1.0 : clamp(min(sp - st, fr - sp) / clamp(uOpen * 3.0, 24.0, max(L * 0.5, 24.0)), 0.0, 1.0);
    float slp = uSlide * cs.x, sr = slp * uBias, sl = slp - sr;
    float wr = uOpen * uBias * taper, wl = uOpen * taper - wr;
    vec2 rR = rag(s - sr / L, L), rL = slp > 0.0 ? rag(s + sl / L, L) : rR;
    float dR = (e - rR.x - wr) / sqrt(1.0 + rR.y * rR.y), dL = (rL.x - wl - e) / sqrt(1.0 + rL.y * rL.y);
    // dd < 0 in the gap, else px into the page of this half; where the halves overlap (shear) the + half lies on top
    bool plus = dR > 0.0 || dR > dL;
    float dd = max(plus ? dR : dL, max(st - sp, sp - fr));
    vec2 Qh = Q - (plus ? n * wr + d * sr : -(n * wl + d * sl));
    float lipK = uMode > 1.5 ? 1.0 : smoothstep(0.0, max(2.0 * uLip, 1e-3), max(uOpen * taper, slp));
    float speck = step(th(floor(Qh * 0.5) + 0.37 * uSeed), uFibre) * 0.06, dim = plus ? uDim * lipK : 0.0;
    float a = 1.0 - (1.0 - dim) * (1.0 - speck);
    vec3 P = uInk * a;
    if (uHasFace > 0.5 || uHasMap > 0.5) { P = (uHasMap > 0.5 ? texture2D(uMap, Qh / cs).rgb : uFace) * (1.0 - dim) * (1.0 - speck); a = 1.0; }
    float ink = max(uHair, aa * 1.2), lip = uLip * lipK * (1.0 + uBoil * (vn1(sp / 18.0 + uDraw * 17.31) - 0.5));
    float m = 1.0 - smoothstep(-aa, aa, dd - ink - lip);
    P = mix(P, uLipCol * uEmit * (0.9 + 0.1 * th(floor(Qh / 1.5) + 3.7)), m); a = mix(a, 1.0, m);
    m = 1.0 - smoothstep(-aa, aa, dd - ink);
    P = mix(P, uInk, m); a = mix(a, 1.0, m);
    m = 1.0 - smoothstep(-aa, aa, dd + aa);
    float sh = uShadow > 0.0 ? 1.0 - smoothstep(0.0, uShadow, -dd) : 0.0;
    P = mix(P, uHasUnder > 0.5 ? uUnder * (1.0 - 0.35 * sh) : uInk * (0.35 * sh), m); a = mix(a, uHasUnder > 0.5 ? 1.0 : 0.35 * sh, m);
    outPx(P, a);
  }`;

const MODES = { tear: 0, shear: 1, erase: 2 };
const COLOURS = new Set(["under", "face", "map", "lipColour", "ink", "flakeColour"]);
const FLOOR = new Color("#0e0c16");
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const sm = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const inside = (p) => p[0] > 0.002 && p[0] < 0.998 && p[1] > 0.002 && p[1] < 0.998;
// farthest card px along the line (in line lengths, >= 1) inside the band |e| <= R: the max of a linear map over
// card ∩ band sits on a corner or where a card edge crosses e = ±R. A front swept that far leaves no stub to pop in.
function span(p0, p1, asp, R) {
  const W = 800 * asp, ax = p0[0] * W, ay = p0[1] * 800;
  let dx = p1[0] * W - ax, dy = p1[1] * 800 - ay;
  const L = Math.max(Math.hypot(dx, dy), 1);
  dx /= L; dy /= L;
  let far = L;
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) & 3;
    const x0 = (((i + 1) >> 1) & 1) * W - ax, y0 = (i >> 1) * 800 - ay, x1 = (((j + 1) >> 1) & 1) * W - ax, y1 = (j >> 1) * 800 - ay;
    const s0 = x0 * dx + y0 * dy, e0 = y0 * dx - x0 * dy, s1 = x1 * dx + y1 * dy, e1 = y1 * dx - x1 * dy;
    if (Math.abs(e0) <= R) far = Math.max(far, s0);
    for (let b = -1; b <= 1; b += 2) if ((e0 - b * R) * (e1 - b * R) < 0) far = Math.max(far, s0 + (s1 - s0) * (b * R - e0) / (e1 - e0));
  }
  return far / L;
}
// linear from hex, lit luma capped at 0.92, darks lifted to the studio ink so nothing is pure black
function lin(c, hex) {
  c.set(hex);
  const y = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  if (y > 0.92) c.multiplyScalar(0.92 / y); else if (y < 0.004) c.lerp(FLOOR, 1 - y / 0.004);
  return c;
}

function geometry(n) {
  const q = n + 1, g = new BufferGeometry();
  const uv = new Float32Array(q * 8), fl = new Float32Array(q * 4), idx = new Uint16Array(q * 6);
  for (let i = 0; i < q; i++) {
    uv.set([0, 0, 1, 0, 1, 1, 0, 1], i * 8);
    fl.fill(i - 1, i * 4, i * 4 + 4);
    idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6);
  }
  g.setAttribute("position", new BufferAttribute(new Float32Array(q * 12), 3));
  g.setAttribute("uv", new BufferAttribute(uv, 2));
  g.setAttribute("aFlake", new BufferAttribute(fl, 1));
  g.setIndex(new BufferAttribute(idx, 1));
  return g;
}

export function makeTear(engine, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const share = (engine?.tier ?? 2) <= 1 ? 0.5 : 1, built = Math.max(0, Math.round(o.flakes * share));
  const U = {
    uLine: { value: new Vector4() }, uEnds: { value: new Vector2() }, uMode: { value: 0 }, uK: { value: 0 }, uGrow: { value: 0 },
    uOpen: { value: 0 }, uOpenFull: { value: 0 }, uSlide: { value: 0 }, uBias: { value: 0.5 },
    uLevels: { value: 8 }, uAmp: { value: 60 }, uDecay: { value: 0.58 }, uSeed: { value: 0 },
    uLip: { value: 4 }, uHair: { value: 1 }, uShadow: { value: 6 }, uDim: { value: 0 }, uFibre: { value: 0 }, uBoil: { value: 0 },
    uDraw: { value: 0 }, uTime: { value: 0 }, uEmit: { value: 1 }, uSolid: { value: o.solid ? 1 : 0 }, uReach: { value: -1 },
    uHasUnder: { value: 0 }, uHasFace: { value: 0 }, uHasMap: { value: 0 }, uMap: { value: null },
    uUnder: { value: new Color() }, uFace: { value: new Color() }, uLipCol: { value: new Color() }, uInk: { value: new Color() }, uFlakeCol: { value: new Color() },
    uScreen: { value: 1 }, uDepth: { value: 20 }, uSize: { value: new Vector2(2, 1.25) }, uFlakeN: { value: 0 }, uFlakeSize: { value: 10 },
    uSpan: { value: 1 },
  };
  const geo = geometry(built);
  const mat = new ShaderMaterial({
    uniforms: U, vertexShader: VERT, fragmentShader: FRAG, side: DoubleSide, blending: NormalBlending,
    transparent: !o.solid, depthWrite: !!o.solid, depthTest: true, premultipliedAlpha: true,
  });
  const mesh = new Mesh(geo, mat);
  mesh.frustumCulled = false; mesh.userData.layer = 1;
  const group = new Group();
  group.add(mesh);
  const tmp = new Vector3();
  let front = 0, band = 0, asp = 1.6;
  function ends() {
    const p0 = o.line[0], p1 = o.line[1], S = inside(p1) ? 1 : span(p0, p1, asp, band);
    U.uSpan.value = S;
    U.uEnds.value.set(inside(p0) ? 0 : -1e4, front >= 1 && !inside(p1) ? 1e4 : front * S);
  }
  mesh.onBeforeRender = (r, s, cam) => {
    if (!o.screen) return;
    let D = o.dist;
    if (o.behind) { (o.behind.isObject3D ? o.behind.getWorldPosition(tmp) : tmp.copy(o.behind)).applyMatrix4(cam.matrixWorldInverse); D = -tmp.z + o.margin; }
    U.uDepth.value = Math.min(Math.max(D, cam.near * 1.01), cam.far * 0.99);
    const e = cam.projectionMatrix.elements;
    asp = e[5] / e[0]; ends();
  };

  function paint() {
    U.uHasUnder.value = o.under == null ? 0 : 1; if (o.under != null) lin(U.uUnder.value, o.under);
    U.uHasFace.value = o.face == null ? 0 : 1; if (o.face != null) lin(U.uFace.value, o.face);
    lin(U.uLipCol.value, o.lipColour); lin(U.uInk.value, o.ink);
    lin(U.uFlakeCol.value, o.flakeColour ?? o.face ?? o.lipColour);
    U.uMap.value = o.map ?? null; U.uHasMap.value = o.map ? 1 : 0;
  }
  function shape() {
    const m = MODES[o.mode] ?? 0, k = clamp01(o.k), G = clamp01(o.grow), p0 = o.line[0], p1 = o.line[1];
    let g = sm(k), open = 1;
    if (m !== 2) { g = G > 0 ? sm(k / G) : 1; open = G < 1 ? sm((k - G) / (1 - G)) : k >= 1 ? 1 : 0; }
    U.uLine.value.set(p0[0], p0[1], p1[0], p1[1]);
    U.uMode.value = m; U.uK.value = k; U.uGrow.value = G;
    U.uOpenFull.value = o.opening; U.uOpen.value = o.opening * open; U.uSlide.value = m === 1 ? o.slide * open : 0; U.uBias.value = clamp01(o.bias);
    U.uLevels.value = Math.max(0, Math.min(8, Math.round(o.levels))); U.uAmp.value = o.amp; U.uDecay.value = o.decay;
    U.uSeed.value = (Math.abs(o.seed * 0.6180339887) % 1) * 61;
    U.uLip.value = o.lip; U.uHair.value = o.hair; U.uShadow.value = o.shadow; U.uDim.value = clamp01(o.dim);
    U.uFibre.value = clamp01(o.fibre); U.uBoil.value = o.boil; U.uEmit.value = o.emit;
    U.uScreen.value = o.screen ? 1 : 0; U.uDepth.value = o.dist; U.uSize.value.set(o.size[0], o.size[1]);
    U.uFlakeN.value = Math.min(built, Math.round(o.flakes * share)); U.uFlakeSize.value = o.flakeSize;
    mesh.renderOrder = o.order;
    // a see-through page draws nothing past the widest the edge can swing, so those pixels leave before the profile loop
    let reach = o.opening + o.lip * (1 + Math.abs(o.boil)) + o.hair + 4;
    for (let l = 0, a = Math.abs(o.amp); l < U.uLevels.value; l++, a *= Math.abs(o.decay)) reach += a;
    U.uReach.value = o.face == null && !o.map && !(o.dim > 0) && !(o.fibre > 0) ? reach : -1;
    // the tear's band at its end cut is the bare line (opening still 0); erase's is the full band
    front = g; band = reach - (m === 2 ? 0 : o.opening);
    if (!o.screen) asp = o.size[0] / o.size[1];
    ends();
  }
  paint(); shape();

  return {
    group,
    update(ts, cue) {
      const f = Math.max(0, o.fps);
      U.uTime.value = ts;
      U.uDraw.value = Math.floor(ts * (f || 24) + 1e-6) % 64;
      if (o.beat && cue) {
        const s = cue.since(o.beat), dur = Math.max(1e-3, o.dur), x = s === Infinity ? 0 : s / dur;
        o.k = f > 0 && x < 1 ? Math.floor(x * dur * f + 1e-6) / (dur * f) : x;
        shape();
      }
    },
    set(patch) {
      let col = false;
      for (const key in patch) { if (!(key in o) || key === "solid") continue; o[key] = patch[key]; if (COLOURS.has(key)) col = true; }
      if (col) paint();
      shape();
    },
    dispose() { geo.dispose(); mat.dispose(); },
  };
}

// gallery: a gold-lipped page tear onto teal whose right half then slides open (Magi), a shear split onto a red void
// (Fate), and a straight erase band to ink with bloom-lit violet edges (Jujutsu); opaque world cards, so solid
export function demo(engine) {
  const group = new Group(), card = { screen: false, size: [0.6, 0.86], solid: true };
  const v = [
    makeTear(engine, { ...card, face: "#f4e8c8", under: "#1fbdb4", lip: 7, hair: 1.5, opening: 40, bias: 1, dim: 0.08, fibre: 0.015, flakes: 10, flakeSize: 22, seed: 3 }),
    makeTear(engine, { ...card, mode: "shear", line: [[0, 0.18], [1, 0.82]], face: "#c8d8e8", under: "#790b08", lipColour: "#fadf92", lip: 6, hair: 1.5, levels: 6, opening: 30, grow: 0.45, flakes: 8, flakeSize: 20, seed: 7 }),
    makeTear(engine, { ...card, mode: "erase", line: [[0.78, 0.55], [0, 0.55]], levels: 0, opening: 240, face: "#5a6b8c", under: "#0e0c16", lipColour: "#e94bff", lip: 5, emit: 2.2, hair: 0, shadow: 0, flakes: 0 }),
  ];
  v.forEach((t, i) => { t.group.position.set((i - 1) * 0.68, 1, 0); group.add(t.group); });
  const P = { k: 0, opening: 40 }, Q = { k: 0 };
  return {
    group,
    update(ts) {
      const u = ((ts % 4) + 4) % 4;
      P.k = clamp01(u / 1.4); P.opening = 40 + 180 * sm((u - 1.6) / 1.2);
      Q.k = clamp01(u / 3);
      v[0].set(P); v[1].set(Q); v[2].set(Q);
      for (const t of v) t.update(u);
    },
    dispose() { for (const t of v) t.dispose(); },
  };
}
