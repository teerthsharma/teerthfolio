// cel: drawn effects as flat polygons in screen space, one draw call per factory (docs/FX-KIT.md). Hard edges, an ink pass under every
// shape, two or three flat tones, redrawn on twos. Positions are frame fractions [u, v] from the top-left, sizes in frame heights.
// Factories (engine, opts) -> { group, update(ts), set(patch), dispose }: makeVeins makeCrescent makeBurst makeRing makeCracks makePlume
// makeDebris makeAura makeSpeedLines makeFlat, and makeCel({ draw }) for a custom drawing. `events: [{ at, ... }]` fires many from one mesh.
import { BufferAttribute, BufferGeometry, Color, DynamicDrawUsage, Group, Mesh, NormalBlending, ShaderMaterial, Sphere, Vector2, Vector3, Vector4 } from "three";
import { clamp01 } from "../../sakuga.js";

const E3 = (k) => 1 - (1 - clamp01(k)) ** 3;
const rgbCache = new Map();
export const rgb = (hex, g = 1) => { const key = `${hex}|${g}`; let v = rgbCache.get(key); if (!v) { const c = new Color(hex); v = [c.r * g, c.g * g, c.b * g]; rgbCache.set(key, v); } return v; };
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const hash = (...v) => { let h = 0x9e3779b9; for (const x of v) { h = Math.imul(h ^ (x | 0), 0x85ebca6b); h ^= h >>> 13; } return Math.imul(h ^ (h >>> 16), 0xc2b2ae35) >>> 0; };

class Batch {
  constructor(max) {
    this.max = max; this.n = 0;
    this.pos = new Float32Array(max * 9); this.col = new Float32Array(max * 12);
    const g = (this.geo = new BufferGeometry());
    g.setAttribute("position", new BufferAttribute(this.pos, 3).setUsage(DynamicDrawUsage));
    g.setAttribute("aCol", new BufferAttribute(this.col, 4).setUsage(DynamicDrawUsage));
    g.boundingSphere = new Sphere(new Vector3(), 1e6);
    g.setDrawRange(0, 0);
  }
  clear() { this.n = 0; }
  tri(ax, ay, bx, by, cx, cy, c, a = 1) {
    if (this.n >= this.max) return;
    const p = this.n * 9, q = this.n * 12, P = this.pos, C = this.col;
    P[p] = ax; P[p + 1] = ay; P[p + 3] = bx; P[p + 4] = by; P[p + 6] = cx; P[p + 7] = cy;
    for (let i = 0; i < 3; i++) { C[q + i * 4] = c[0]; C[q + i * 4 + 1] = c[1]; C[q + i * 4 + 2] = c[2]; C[q + i * 4 + 3] = a; }
    this.n++;
  }
  strip(L, R, c, a = 1) { for (let i = 0; i < L.length - 1; i++) { this.tri(L[i][0], L[i][1], R[i][0], R[i][1], L[i + 1][0], L[i + 1][1], c, a); this.tri(R[i][0], R[i][1], R[i + 1][0], R[i + 1][1], L[i + 1][0], L[i + 1][1], c, a); } }
  fan(cx, cy, ring, c, a = 1) { for (let i = 0; i < ring.length; i++) { const p = ring[i], q = ring[(i + 1) % ring.length]; this.tri(cx, cy, p[0], p[1], q[0], q[1], c, a); } }
  rect(x0, y0, x1, y1, c, a = 1) { this.tri(x0, y0, x1, y0, x1, y1, c, a); this.tri(x0, y0, x1, y1, x0, y1, c, a); }
  ribbon(pts, ws, c, a = 1, bias = 0.5) {
    const n = pts.length; if (n < 2) return;
    const L = [], R = [];
    for (let i = 0; i < n; i++) {
      const p = pts[Math.min(n - 1, i + 1)], q = pts[Math.max(0, i - 1)];
      let tx = p[0] - q[0], ty = p[1] - q[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      const w = ws[i] * 2;
      L.push([pts[i][0] - ty * w * bias, pts[i][1] + tx * w * bias]); R.push([pts[i][0] + ty * w * (1 - bias), pts[i][1] - tx * w * (1 - bias)]);
    }
    this.strip(L, R, c, a);
  }
  upload() { this.geo.attributes.position.needsUpdate = this.geo.attributes.aCol.needsUpdate = true; this.geo.setDrawRange(0, this.n * 3); }
}

const VS = /* glsl */ `
  attribute vec4 aCol; uniform vec2 uRes; uniform vec4 uHole; uniform float uZ; varying vec4 vC; varying vec3 vHole;
  void main() {
    vC = aCol; vHole = vec3(0.0, 0.0, -1.0);
    gl_Position = vec4(position.x * 2.0 * uRes.y / uRes.x - 1.0, 1.0 - 2.0 * position.y, uZ, 1.0);
    if (uHole.w > 0.0) { vec4 hc = projectionMatrix * viewMatrix * vec4(uHole.xyz, 1.0); if (hc.w > 1e-3) vHole = vec3(hc.xy / hc.w, uHole.w * projectionMatrix[1][1] / hc.w); }
  }`;
const FS = /* glsl */ `
  uniform vec2 uRes; uniform vec4 uBoxE; varying vec4 vC; varying vec3 vHole;
  void main() {
    float a = vC.a;
    if (uBoxE.z > 0.0) { vec2 e = (gl_FragCoord.xy / uRes * 2.0 - 1.0 - uBoxE.xy) / uBoxE.zw; a *= smoothstep(0.86, 1.1, length(e)); }
    if (vHole.z > 0.0) { vec2 q = (gl_FragCoord.xy / uRes * 2.0 - 1.0 - vHole.xy) * vec2(uRes.x / uRes.y, 1.0); a *= smoothstep(vHole.z * 0.9, vHole.z * 1.1, length(q)); }
    if (a < 0.002) discard;
    gl_FragColor = vec4(vC.rgb * a, a);
  }`;

export function makeCel(engine, opts = {}) {
  const o = { max: 24000, order: 1002, hole: null, behind: false, draw() {}, ...opts };
  const B = new Batch(o.max), res = engine?.shared?.uRes ?? { value: new Vector2(1280, 720) }, hole = new Vector4(), boxE = new Vector4(0, 0, 0, 0);
  const mat = new ShaderMaterial({ uniforms: { uRes: res, uHole: { value: hole }, uBoxE: { value: boxE }, uZ: { value: o.behind ? 0.9995 : 0.0 } }, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, depthTest: !!o.behind, premultipliedAlpha: true, blending: NormalBlending, side: 2 });
  const mesh = new Mesh(B.geo, mat), group = new Group();
  mesh.frustumCulled = false; mesh.renderOrder = o.order;
  group.userData.plateDepth = false;
  group.add(mesh);
  let lastTs = NaN, lastA = 0;
  const setHole = () => { const h = o.hole; if (h) hole.set(h[0] ?? h.x, h[1] ?? h.y, h[2] ?? h.z, h[3] ?? h.w); else hole.w = 0; };
  setHole();
  return {
    group, batch: B, mesh,
    update(ts, cue) {
      const bx = o.sealBox?.(); if (bx) boxE.set(bx[0] + bx[2] - 1, 1 - bx[1] - bx[3], bx[2] - bx[0], bx[3] - bx[1]); else boxE.z = 0;
      const A = res.value.x / res.value.y;
      if (ts === lastTs && A === lastA) return;
      lastTs = ts; lastA = A;
      B.clear(); o.draw(B, ts, A, cue); B.upload();
      mesh.visible = B.n > 0;
    },
    set(p) { Object.assign(o, p); lastTs = NaN; setHole(); mat.depthTest = !!o.behind; mat.uniforms.uZ.value = o.behind ? 0.9995 : 0; },
    dispose() { B.geo.dispose(); mat.dispose(); },
  };
}

const COMMON = { sealBox: null, at: 0, fps: 12, seed: 1, loop: 0, order: 1002, hole: null, behind: false, max: 24000, ink: "#0b0608", inkW: 0.0024, emit: 2.6, alpha: 1 }; // emit lifts only the thin cores above 1.0; a body (edge, body, near) stays below it (the photography value budget)

// an effect = defaults + a life in s + draw(B, e, age, X); X = { A, f frame, cycle, rnd(salt), P(u, v), low }
function factory(name, defaults, life, draw) {
  return (engine, opts = {}) => {
    const base = { ...COMMON, ...defaults, ...opts }, low = (engine?.tier ?? 2) <= 1;
    let evs = [];
    const build = () => { evs = (base.events ?? [{}]).map((e, i) => ({ ...base, ...e, i })); };
    build();
    const cel = makeCel(engine, { max: base.max, order: base.order, hole: base.hole, behind: base.behind, sealBox: base.sealBox, draw(B, ts, A) {
      for (const e of evs) {
        let age = ts - e.at; if (age < 0) continue;
        let cycle = 0;
        if (e.loop > 0) { cycle = Math.floor(age / e.loop); age -= cycle * e.loop; }
        if (age > life(e)) continue;
        const f = Math.floor(age * e.fps + 1e-6);
        draw(B, e, age, { A, f, cycle, low, rnd: (s = 0) => mulberry(hash(e.seed, e.i, cycle, s)), P: (u, v) => [u * A, v] });
      }
    } });
    const set = cel.set;
    cel.set = (p) => { Object.assign(base, p); build(); set(p); };
    cel.events = () => evs; cel.name = name;
    return cel;
  };
}

// ---- polylines: arc-length trim, branching paths
function sub(pts, g0, g1) {
  const n = pts.length, cum = [0];
  for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const T = cum[n - 1] || 1, a = g0 * T, b = g1 * T, out = [], ts = [];
  if (g1 <= g0) return { pts: out, ts };
  const at = (s) => { let i = 1; while (i < n - 1 && cum[i] < s) i++; const k = cum[i] > cum[i - 1] ? (s - cum[i - 1]) / (cum[i] - cum[i - 1]) : 0; return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k]; };
  out.push(at(a)); ts.push(g0);
  for (let i = 1; i < n - 1; i++) if (cum[i] > a && cum[i] < b) { out.push(pts[i]); ts.push(cum[i] / T); }
  out.push(at(b)); ts.push(g1);
  return { pts: out, ts };
}

function branchPaths(rnd, o) {
  const out = [], segs = o.segs, bp = o.branchP;
  const grow = (x, y, ang, len, w, order, delay, dur) => {
    const n = Math.max(3, Math.round(segs * Math.sqrt(len / o.len))), step = len / n, pts = [[x, y]];
    let sign = rnd() < 0.5 ? -1 : 1;
    for (let i = 1; i <= n; i++) {
      const a = ang + sign * o.kink * (0.35 + 0.85 * rnd()), s = step * (0.55 + 0.9 * rnd());
      x += Math.cos(a) * s; y += Math.sin(a) * s * (o.squash ?? 1); pts.push([x, y]);
      sign = rnd() < 0.78 ? -sign : sign;
    }
    out.push({ pts, w, order, delay, dur });
    if (order >= o.orders) return;
    for (let j = 1; j < n; j++) if (rnd() < bp * (1 - 0.45 * (j / n))) {
      const lb = len * (0.22 + 0.38 * rnd()), ab = ang + (rnd() < 0.5 ? -1 : 1) * (0.35 + 0.65 * rnd()), jd = j / n;
      grow(pts[j][0], pts[j][1], ab, lb, w * 0.56, order + 1, delay + jd * dur, dur * (lb / len));
    }
  };
  grow(o.x, o.y, o.ang, o.len, o.w, 0, 0, 1);
  return out;
}

// ---- veins: branching angular lightning. from/to frame fractions; field: { count, ... } fills the frame from its borders
export const VEINS = { from: [0.5, 0], to: [0.5, 0.6], width: 0.0075, core: "#ffd9cf", body: "#ff3b3b", far: "#5a0a16", swell: 0.35, segs: 8, kink: 0.55, branchP: 0.5, orders: 3, draw: 3 / 24, hold: 0.4, tau: 0.1, variants: 3, fps: 12, halo: 0.05 };
export function veinField(o = {}) {
  const { count = 16, A = 16 / 9, seed = 7, width = [0.004, 0.022], len = [0.45, 1.1], loop = 0.9, at = 0 } = o, r = mulberry(hash(seed, 5)), ev = [];
  for (let i = 0; i < count; i++) {
    const side = r() * (2 * A + 2), u = side < A ? side / A : side < A + 1 ? 1 : side < 2 * A + 1 ? 1 - (side - A - 1) / A : 0, v = side < A ? 0 : side < A + 1 ? side - A : side < 2 * A + 1 ? 1 : 1 - (side - 2 * A - 1);
    const tx = (0.2 + 0.6 * r()) * A, ty = 0.2 + 0.6 * r(), L = len[0] + (len[1] - len[0]) * r(), dx = tx - u * A, dy = ty - v, d = Math.hypot(dx, dy) || 1;
    ev.push({ from: [u, v], to: [u + (dx / d) * L / A, v + (dy / d) * L], width: (width[0] + (width[1] - width[0]) * r() ** 2) * (i % 5 === 0 ? 1.8 : 1), swell: i % 5 === 0 ? 0.7 : 0.35, at: at + r() * loop, loop, seed: seed + i * 17, hold: loop * 0.5, tau: loop * 0.12, draw: 4 / 24 });
  }
  return ev;
}
export const makeVeins = factory("veins", VEINS, (e) => e.draw * 1.4 + e.hold + e.tau * 3, (B, e, age, X) => {
  const { A, f, low } = X, ink = rgb(e.ink), core = rgb(e.core, e.emit), body = rgb(e.body), far = rgb(e.far);
  const done = age >= e.draw * 1.4, variant = done ? f % e.variants : 0, rnd = mulberry(hash(e.seed, e.i, X.cycle, variant));
  const [x0, y0] = X.P(...e.from), [x1, y1] = X.P(...e.to), len = Math.hypot(x1 - x0, y1 - y0);
  const paths = branchPaths(rnd, { x: x0, y: y0, ang: Math.atan2(y1 - y0, x1 - x0), len, w: e.width, segs: e.segs, kink: e.kink, branchP: low ? e.branchP * 0.5 : e.branchP, orders: low ? Math.min(2, e.orders) : e.orders });
  const g = age / e.draw, tail = clamp01((age - e.draw * 1.4 - e.hold) / (e.tau * 3)), flick = done && f % 2 ? 0.8 : 1;
  for (const p of paths.sort((a, b) => b.order - a.order)) {
    const g1 = clamp01((g - p.delay) / p.dur), g0 = tail > 0 ? clamp01(tail * 1.2 - p.delay * 0.2) : 0, s = sub(p.pts, g0, g1);
    if (s.pts.length < 2) continue;
    const sw = p.order === 0 ? e.swell : e.swell * 0.4, ws = s.ts.map((t) => p.w * flick * ((1 - sw) * (1 - t) ** 0.85 + sw * Math.sin(Math.PI * Math.min(1, 0.12 + 0.88 * t)) ** 0.8) * (1 - tail * 0.5) + 0.0006), o = p.order / (e.orders + 0.5), c = mix(body, far, o * 0.85);
    if (p.order === 0 && e.halo > 0) B.ribbon(s.pts, ws.map((w) => w * 4.2), c, e.halo * e.alpha);
    B.ribbon(s.pts, ws.map((w) => w + e.inkW * (1 - 0.3 * o)), ink, e.alpha);
    B.ribbon(s.pts, ws, c, e.alpha);
    if (p.order <= 1) B.ribbon(s.pts, ws.map((w) => w * 0.42), p.order ? mix(core, c, 0.5) : core, e.alpha);
  }
});

// ---- crescent: the white smear with a coloured edge. from/to chord, bend = sagitta / chord (signed), thick in h
export const CRESCENT = { from: [0.15, 0.7], to: [0.85, 0.25], bend: 0.22, thick: 0.045, edge: "#d1081f", body: "#fff7ee", core: "#ffffff", draw: 1 / 24, hold: 4 / 24, tau: 0.16, after: 2, fps: 24, points: 30 };
export const makeCrescent = factory("crescent", CRESCENT, (e) => e.draw + e.hold + e.tau, (B, e, age, X) => {
  const { A, f } = X, p0 = X.P(...e.from), p1 = X.P(...e.to), dx = p1[0] - p0[0], dy = p1[1] - p0[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const cx = (p0[0] + p1[0]) / 2 + nx * e.bend * L * 2, cy = (p0[1] + p1[1]) / 2 + ny * e.bend * L * 2, N = e.points, curve = [];
  for (let i = 0; i <= N; i++) { const t = i / N, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t; curve.push([a * p0[0] + b * cx + c * p1[0], a * p0[1] + b * cy + c * p1[1]]); }
  const k = E3(age / e.draw), retire = clamp01((age - e.draw - e.hold) / e.tau), pulse = f === 0 ? 1.35 : f === 1 ? 1.15 : 1;
  const shape = (lag, off, scale, colour, alpha, bias, inkOn) => {
    const g0 = clamp01((retire - lag * 0.15) * 1.0), g1 = k;
    const s = sub(curve, Math.min(g0, g1), g1); if (s.pts.length < 2) return;
    const ws = s.ts.map((t) => { const u = g1 > g0 ? (t - g0) / (g1 - g0) : 1; return Math.max(0, e.thick * pulse * scale * Math.sin(Math.PI * clamp01(u)) ** 0.65 * (0.5 + 0.5 * u) * (1 - 0.55 * retire)); });
    const pts = s.pts.map((q) => [q[0] + nx * off, q[1] + ny * off]);
    if (inkOn) B.ribbon(pts, ws.map((w) => w + e.inkW), rgb(e.ink), e.alpha * alpha, bias);
    B.ribbon(pts, ws, colour, e.alpha * alpha, bias);
  };
  for (let i = e.after; i >= 1; i--) shape(i, -e.thick * 0.5 * i, 0.62 - 0.12 * i, rgb(e.edge), 0.55 - 0.15 * i, 0.5, i === 1);
  shape(0, 0, 1, rgb(e.edge), 1, 0.18, true);
  shape(0, e.thick * 0.12, 0.66, rgb(e.body), 1, 0.3, false);
  shape(0, e.thick * 0.2, 0.2, rgb(e.core, e.emit), 1, 0.5, false);
});

// ---- burst: the impact drawing. spikes, splat, speed lines; bg frames burn the hit into flat colour (white on ink, then inverted)
export const BURST = { at2: [0.5, 0.5], size: 0.32, spikes: 16, edge: "#d1081f", body: "#fff7ee", core: "#ffffff", frames: 8, bgFrames: 0, splat: 6, lines: 18, fps: 24, hold2: 2 };
const SCALE = [0.55, 1.3, 1.14, 1.04, 0.98, 0.92, 0.84, 0.7];
export const makeBurst = factory("burst", BURST, (e) => e.frames / e.fps, (B, e, age, X) => {
  const { A, f } = X, at = e.where ?? e.at2, [cx, cy] = X.P(...at), ink = rgb(e.ink), s = e.size * SCALE[Math.min(f, SCALE.length - 1)] * (f >= e.frames - 2 ? 0.8 : 1);
  const hold = Math.floor(f / e.hold2), rnd = mulberry(hash(e.seed, e.i, hold)), N = e.spikes;
  if (f < e.bgFrames) { const inv = f % 2 === 1; B.rect(0, 0, A, 1, inv ? rgb(e.body) : ink, e.alpha); }
  const inv = f < e.bgFrames && f % 2 === 1, fill = inv ? ink : rgb(e.edge), mid = inv ? ink : rgb(e.body);
  const star = (rs, jit, valley) => { const r = []; for (let i = 0; i < N; i++) { const a0 = ((i + (rnd() - 0.5) * jit) / N) * Math.PI * 2, tip = i % 2 === 0 ? 0.72 + 0.5 * rnd() : 0.34 + 0.2 * rnd(), a1 = a0 + (Math.PI / N) * (0.9 + 0.2 * rnd()); r.push([cx + Math.cos(a0) * s * tip * rs, cy + Math.sin(a0) * s * tip * rs], [cx + Math.cos(a1) * s * valley * rs, cy + Math.sin(a1) * s * valley * rs]); } return r; };
  const ring = star(1, 0.5, 0.36), out = ring.map(([x, y]) => { const d = Math.hypot(x - cx, y - cy) || 1; return [x + ((x - cx) / d) * e.inkW * 1.6, y + ((y - cy) / d) * e.inkW * 1.6]; });
  for (let i = 0; i < (X.low ? e.lines / 2 : e.lines); i++) {
    const a = rnd() * Math.PI * 2, r0 = s * (0.95 + 0.3 * rnd()), r1 = r0 + s * (0.3 + 0.9 * rnd()), w = 0.0035 + 0.011 * rnd() ** 2, ca = Math.cos(a), sa = Math.sin(a);
    B.tri(cx + ca * r0 - sa * w, cy + sa * r0 + ca * w, cx + ca * r0 + sa * w, cy + sa * r0 - ca * w, cx + ca * r1, cy + sa * r1, inv ? ink : mid, e.alpha);
  }
  B.fan(cx, cy, out, ink, e.alpha); B.fan(cx, cy, ring, fill, e.alpha);
  B.fan(cx, cy, star(0.66, 0.7, 0.4), mid, e.alpha);
  const disc = []; for (let i = 0; i < 12; i++) disc.push([cx + Math.cos((i / 12) * 6.283) * s * 0.2, cy + Math.sin((i / 12) * 6.283) * s * 0.2]);
  B.fan(cx, cy, disc, inv ? ink : rgb(e.core, e.emit), e.alpha);
  for (let j = 0; j < (X.low ? e.splat / 2 : e.splat); j++) {
    const a = rnd() * Math.PI * 2, d = s * (0.85 + 0.7 * rnd()), bx = cx + Math.cos(a) * d, by = cy + Math.sin(a) * d, r = s * (0.05 + 0.1 * rnd()), blob = [], lobes = 9, rr = [];
    for (let i = 0; i < lobes; i++) rr.push(r * (0.6 + 0.6 * rnd()));
    for (let i = 0; i < lobes; i++) blob.push([bx + Math.cos((i / lobes) * 6.283) * rr[i], by + Math.sin((i / lobes) * 6.283) * rr[i]]);
    B.fan(bx, by, blob.map(([x, y]) => [bx + (x - bx) * 1.25, by + (y - by) * 1.25]), ink, e.alpha); B.fan(bx, by, blob, inv ? ink : fill, e.alpha);
  }
});

// ---- ring: hard-edged shock ring, ellipse (squash < 1 lies it on the ground), broken, thinning, expanding on twos
export const RING = { at2: [0.5, 0.78], radius: 0.55, squash: 0.28, thick: 0.07, edge: "#d1081f", body: "#fff4ea", dur: 0.55, rings: 2, gap: 0.22, fps: 12, points: 56 };
export const makeRing = factory("ring", RING, (e) => e.dur + (e.rings - 1) * 0.12, (B, e, age, X) => {
  const { A, f } = X, [cx, cy] = X.P(...(e.where ?? e.at2)), ink = rgb(e.ink), t = f / e.fps;
  for (let r = e.rings - 1; r >= 0; r--) {
    const a = t - r * 0.12, k = a / e.dur; if (k < 0 || k > 1) continue;
    const R = e.radius * E3(k) * (1 - r * 0.22), th = e.thick * (1 - k) ** 1.1 * (1 - r * 0.3) + 0.003, rnd = mulberry(hash(e.seed, e.i, r, f >> 1)), N = e.points;
    const rad = []; for (let i = 0; i <= N; i++) rad.push(1 + (rnd() - 0.5) * 0.06);
    const gaps = []; for (let i = 0; i < 3; i++) gaps.push(rnd() * N);
    const pass = (sc, c, pad) => {
      let L = [], Rr = [];
      const flush = () => { if (L.length > 1) B.strip(L, Rr, c, e.alpha); L = []; Rr = []; };
      for (let i = 0; i <= N; i++) {
        if (gaps.some((g) => Math.abs(i - g) < N * e.gap * 0.5 * (1 - k * 0.5))) { flush(); continue; }
        const ang = (i / N) * 6.283, ca = Math.cos(ang), sa = Math.sin(ang), ro = (R * rad[i]) + (th * sc) / 2 + pad, ri = Math.max(0, R * rad[i] - (th * sc) / 2 - pad);
        L.push([cx + ca * ro, cy + sa * ro * e.squash]); Rr.push([cx + ca * ri, cy + sa * ri * e.squash]);
      }
      flush();
    };
    pass(1, ink, e.inkW); pass(1, rgb(e.edge), 0); pass(0.5, rgb(e.body), 0);
  }
});

// ---- cracks: running branching ground cracks, ink with a hot seam. at = origin, count radial, squash lies them on the ground
export const CRACKS = { at2: [0.5, 0.8], count: 7, len: 0.9, spread: [-2.9, -0.25], squash: 0.3, width: 0.016, seam: "#ff4a2a", run: 0.35, segs: 9, kink: 0.4, branchP: 0.5, orders: 2, fps: 12, hold: Infinity, tau: 0.4, dir: null };
export const makeCracks = factory("cracks", CRACKS, (e) => e.run + (Number.isFinite(e.hold) ? e.hold + e.tau : 1e9), (B, e, age, X) => {
  const [x0, y0] = X.P(...(e.where ?? e.at2)), rnd = mulberry(hash(e.seed, e.i, 3)), ink = rgb(e.ink), seam = rgb(e.seam, e.emit), g = E3(age / e.run), fade = Number.isFinite(e.hold) ? 1 - clamp01((age - e.run - e.hold) / e.tau) : 1, lowN = X.low ? 0.6 : 1;
  const [a0, a1] = e.spread;
  for (let c = 0; c < e.count * lowN; c++) {
    const ang = e.dir ?? (a0 + ((c + rnd() * 0.6) / e.count) * (a1 - a0)), len = e.len * (0.45 + 0.7 * rnd());
    const paths = branchPaths(rnd, { x: x0, y: y0, ang, len, w: e.width, segs: e.segs, kink: e.kink, branchP: e.branchP, orders: e.orders, squash: e.squash });
    for (const p of paths.sort((a, b) => b.order - a.order)) {
      const s = sub(p.pts, 0, clamp01((g - p.delay * 0.7) / Math.max(0.2, p.dur))); if (s.pts.length < 2) continue;
      const ws = s.ts.map((t) => p.w * (1 - t) ** 0.7 + 0.0008);
      B.ribbon(s.pts, ws.map((w) => w + e.inkW), ink, fade); B.ribbon(s.pts, ws.map((w) => w * 0.62), mix(ink, seam, 0.18), fade);
      if (p.order < 2) B.ribbon(s.pts, ws.map((w) => w * 0.26), seam, fade);
    }
  }
});

// ---- plume: ball-and-tail smoke, a shadow tone and a lit crescent under one ink outline, boiling on twos
export const PLUME = { at2: [0.5, 0.85], size: 0.13, lobes: 10, rise: 0.4, grow: 0.5, life: 1.8, shadow: "#1c050a", lit: "#44101c", light: [-0.4, -0.55], fps: 12, tail: 0.6 };
export const makePlume = factory("plume", PLUME, (e) => e.life, (B, e, age, X) => {
  const [ox, oy] = X.P(...(e.where ?? e.at2)), g = E3(age / e.grow), fade = 1 - clamp01((age - e.life * 0.55) / (e.life * 0.45)) ** 2, rnd = mulberry(hash(e.seed, e.i, 1)), jr = mulberry(hash(e.seed, e.i, 2, X.f >> 1));
  const hy = oy - e.rise * E3(age / e.life) * e.size * 3 - e.size * 0.6 * g, balls = [], n = X.low ? Math.ceil(e.lobes / 2) : e.lobes;
  for (let j = 0; j < n; j++) { const a = rnd() * 6.283, d = Math.sqrt(rnd()) * e.size * 1.25; balls.push({ x: ox + Math.cos(a) * d * 1.35 + (jr() - 0.5) * e.size * 0.12, y: hy + Math.sin(a) * d * 0.6 + (jr() - 0.5) * e.size * 0.12, r: e.size * (0.42 + 0.5 * rnd()) * (0.25 + 0.75 * g) * (0.4 + 0.6 * fade) }); }
  const circle = (b, k, sx, sy) => { const r = []; for (let i = 0; i < 14; i++) { const a = (i / 14) * 6.283; r.push([b.x + sx + Math.cos(a) * b.r * k * (1 + 0.04 * Math.sin(i * 2.3)), b.y + sy + Math.sin(a) * b.r * k * (1 + 0.04 * Math.cos(i * 1.7))]); } return r; };
  const tailPts = [], ws = [], tn = 8, tw = e.size * e.tail * (0.3 + 0.7 * g) * fade;
  for (let i = 0; i <= tn; i++) { const t = i / tn; tailPts.push([ox + (balls[0]?.x - ox || 0) * t + Math.sin(t * 5 + e.seed) * e.size * 0.18 * t, oy + (hy - oy) * t]); ws.push(tw * (1 - t * 0.85) * 0.5); }
  B.ribbon(tailPts, ws.map((w) => w + e.inkW), rgb(e.ink), e.alpha);
  for (const b of balls) B.fan(b.x, b.y, circle(b, 1, 0, 0).map(([x, y]) => [b.x + (x - b.x) * 1.0 + ((x - b.x) / b.r) * e.inkW, b.y + (y - b.y) + ((y - b.y) / b.r) * e.inkW]), rgb(e.ink), e.alpha);
  B.ribbon(tailPts, ws, rgb(e.shadow), e.alpha);
  for (const b of balls) B.fan(b.x, b.y, circle(b, 1, 0, 0), rgb(e.shadow), e.alpha);
  const ll = Math.hypot(e.light[0], e.light[1]) || 1, lx = e.light[0] / ll, ly = e.light[1] / ll;
  for (const b of balls) B.fan(b.x, b.y, circle(b, 0.76, lx * b.r * 0.22, ly * b.r * 0.22), rgb(e.lit), e.alpha);
});

// ---- debris: angular chunks on ballistic arcs, drawn on twos with a motion smear behind. heavy-tailed sizes, a few big and near
export const DEBRIS = { at2: [0.5, 0.7], count: 20, speed: 1.1, dir: -Math.PI / 2, cone: 1.25, g: 2.3, size: [0.012, 0.075], tone: "#2a1a1e", lit: "#c94a54", life: 1.6, fps: 12, smear: 0.7 };
export const makeDebris = factory("debris", DEBRIS, (e) => e.life, (B, e, age, X) => {
  const [ox, oy] = X.P(...(e.where ?? e.at2)), rnd = mulberry(hash(e.seed, e.i, 9)), t = X.f / e.fps, n = Math.round(e.count * (X.low ? 0.6 : 1)), ink = rgb(e.ink), dt = 1 / e.fps;
  for (let j = 0; j < n; j++) {
    const a = e.dir + (rnd() - 0.5) * e.cone, sp = e.speed * (0.45 + 0.9 * rnd()), size = e.size[0] + (e.size[1] - e.size[0]) * rnd() ** 3, spin = (rnd() - 0.5) * 14, rot0 = rnd() * 6.283, vx = Math.cos(a) * sp, vy = Math.sin(a) * sp, sh = [rnd(), rnd(), rnd(), rnd(), rnd()];
    const at = (u) => [ox + vx * u, oy + vy * u + 0.5 * e.g * u * u], p = at(t), q = at(Math.max(0, t - dt * 1.2)), k = 1 - clamp01((age - e.life * 0.7) / (e.life * 0.3));
    if (p[0] < -0.2 || p[0] > X.A + 0.2 || p[1] > 1.3) continue;
    const poly = [], r0 = rot0 + spin * t;
    for (let i = 0; i < 5; i++) { const ang = r0 + (i / 5) * 6.283 + (sh[i] - 0.5) * 0.5, r = size * k * (0.62 + 0.4 * sh[(i + 2) % 5]); poly.push([p[0] + Math.cos(ang) * r, p[1] + Math.sin(ang) * r]); }
    const dx = p[0] - q[0], dy = p[1] - q[1], dl = Math.hypot(dx, dy);
    if (dl > size * 0.4) { const nx = -dy / dl * size * k * 0.55, ny = dx / dl * size * k * 0.55; B.tri(p[0] + nx, p[1] + ny, p[0] - nx, p[1] - ny, q[0], q[1], rgb(e.tone), e.smear * e.alpha); }
    B.fan(p[0], p[1], poly.map(([x, y]) => [p[0] + (x - p[0]) * 1.0 + ((x - p[0]) / (size * k + 1e-6)) * e.inkW * 1.4, p[1] + (y - p[1]) + ((y - p[1]) / (size * k + 1e-6)) * e.inkW * 1.4]), ink, e.alpha);
    B.fan(p[0], p[1], poly, rgb(e.tone), e.alpha);
    B.tri(p[0], p[1], poly[0][0], poly[0][1], poly[1][0], poly[1][1], rgb(e.lit), e.alpha);
  }
});

// ---- aura: flame tongues round an ellipse (a figure), three flat tones, embers; drive(ts) is the 0..1 number for hair and cloth sway
export const AURA = { at2: [0.5, 0.55], size: [0.2, 0.34], tongues: 22, len: 0.34, edge: "#9a0f22", body: "#ff3d3d", core: "#ffc9b0", embers: 36, grow: 0.5, until: Infinity, tau: 0.4, k: null, fps: 12, follow: null, hole: null, sway: 0.5 };
const auraK = (e, age) => (e.k != null ? e.k : E3(age / e.grow) * (Number.isFinite(e.until) ? 1 - clamp01((age - e.until) / e.tau) : 1));
export const makeAura = (engine, opts = {}) => {
  const run = factory("aura", AURA, (e) => (Number.isFinite(e.until) ? e.until + e.tau : 1e9), (B, e, age, X) => {
    const fol = e.follow?.(age), [ux, uy] = fol ? [fol[0], fol[1]] : e.where ?? e.at2, [rx, ry] = fol?.[2] ? [fol[2], fol[3]] : e.size, [cx, cy] = X.P(ux, uy), k = auraK(e, age), rnd = mulberry(hash(e.seed, e.i, X.f)), n = Math.round(e.tongues * (X.low ? 0.6 : 1)), ink = rgb(e.ink);
    if (k <= 0) return;
    const tongue = (ang, L, bw, c, inkOn, sway) => {
      const bx = cx + Math.cos(ang) * rx, by = cy + Math.sin(ang) * ry * 0.95, dx = Math.cos(ang) * 0.55, dy = Math.sin(ang) * 0.55 - 1, dl = Math.hypot(dx, dy), ux2 = dx / dl, uy2 = dy / dl, pts = [], ws = [];
      for (let i = 0; i <= 6; i++) { const t = i / 6, bend = Math.sin(t * 3.2 + sway) * L * 0.22 * t; pts.push([bx + ux2 * L * t - uy2 * bend, by + uy2 * L * t + ux2 * bend]); ws.push(bw * (1 - t) ** 0.9 * 0.5); }
      if (inkOn) B.ribbon(pts, ws.map((w) => w + e.inkW * 1.2), ink, e.alpha);
      B.ribbon(pts, ws, c, e.alpha);
    };
    const T = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * 6.283 + (rnd() - 0.5) * 0.18, L = e.len * k * (0.45 + 0.9 * rnd()) * (1 + 0.35 * Math.max(0, -Math.sin(a))), w = L * (0.3 + 0.3 * rnd()); T.push([a, L, w, rnd() * 6.28]); }
    for (const [a, L, w, s] of T) tongue(a, L, w * 1.3, rgb(e.edge), true, s);
    for (const [a, L, w, s] of T) tongue(a, L * 0.72, w, rgb(e.body), false, s);
    for (const [a, L, w, s] of T) tongue(a, L * 0.4, w * 0.5, rgb(e.core, e.emit), false, s);
    const er = mulberry(hash(e.seed, e.i, 4));
    for (let j = 0; j < (X.low ? e.embers / 2 : e.embers); j++) {
      const ph = (age * (0.5 + er() * 0.7) + er()) % 1, x = cx + (er() - 0.5) * rx * 3 + Math.sin(ph * 9 + j) * 0.03, y = cy + ry * 0.7 - ph * ry * 3.2 * k, s = (0.004 + 0.009 * er()) * (1 - ph) * k;
      if (s > 0.0008) B.fan(x, y, [[x, y - s * 1.6], [x + s, y], [x, y + s * 1.6], [x - s, y]], rgb(er() < 0.4 ? e.core : e.body, e.emit), e.alpha);
    }
  });
  const cel = run(engine, opts), ev0 = () => cel.events()[0];
  cel.level = (ts) => { const e = ev0(); return ts < e.at ? 0 : auraK(e, ts - e.at); };
  cel.drive = (ts) => { const e = ev0(), age = ts - e.at, k = age < 0 ? 0 : auraK(e, age), fr = Math.floor(Math.max(0, age) * e.fps); return k * (0.7 + 0.3 * Math.sin(fr * 2.1) * Math.cos(fr * 0.9)) * e.sway * 2; };
  return cel;
};

// ---- speed lines: tapered radial lines from a focus, redrawn on twos. in:true points them at the focus, false away from it
export const SPEED = { focus: [0.5, 0.5], count: 70, inner: 0.22, width: [0.002, 0.012], dur: 0.5, col: "#0b0608", in: true, fps: 12, reach: 0 };
export const makeSpeedLines = factory("speed", SPEED, (e) => e.dur, (B, e, age, X) => {
  const [cx, cy] = X.P(...e.focus), rnd = mulberry(hash(e.seed, e.i, X.f)), R = e.reach || Math.hypot(X.A, 1) * 1.05, c = rgb(e.col), fade = 1 - clamp01((age - e.dur * 0.7) / (e.dur * 0.3));
  for (let i = 0; i < e.count * (X.low ? 0.6 : 1); i++) {
    const a = rnd() * 6.283, r0 = e.inner * (0.8 + 0.6 * rnd()) + 0.1 * rnd(), w = (e.width[0] + (e.width[1] - e.width[0]) * rnd() ** 2) * fade, ca = Math.cos(a), sa = Math.sin(a);
    const rt = e.in ? r0 : R, rb = e.in ? R : r0, wb = e.in ? w : 0.0004, wt = e.in ? 0.0004 : w;
    B.tri(cx + ca * rt - sa * wt, cy + sa * rt + ca * wt, cx + ca * rt + sa * wt, cy + sa * rt - ca * wt, cx + ca * rb + sa * wb, cy + sa * rb - ca * wb, c, e.alpha);
    B.tri(cx + ca * rt - sa * wt, cy + sa * rt + ca * wt, cx + ca * rb - sa * wb, cy + sa * rb + ca * wb, cx + ca * rb + sa * wb, cy + sa * rb - ca * wb, c, e.alpha);
  }
});

// ---- field: the painted red energy that IS the background of the show frame. a stepped dark vignette (large dark masses), then three
// depths of ragged flame ribbons (far dark fill, mid body with a lit edge, near thick with a hot seam), embers between. the middle stays clear
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const FIELD = { at2: [0.5, 0.5], dark: 0.15, steps: 4, vig: "#0a0206", far: "#380610", mid: "#640a18", near: "#d0182c", hot: "#ffb09a", ink: "#09020a", streams: 30, width: [0.012, 0.06], lean: 0.35, clear: [0.5, 0.42, 0.2], embers: 70, grow: 0.5, until: Infinity, tau: 0.5, fps: 12, flow: 0.5, lit: -1, tiers: [0.5, 0.32, 0.18], emit: 1.35, halo: [0.62, 0.46, 0.3], haloA: 0.22, k: null };
const fieldK = (e, age) => (e.k != null ? e.k : E3(age / e.grow) * (Number.isFinite(e.until) ? 1 - clamp01((age - e.until) / e.tau) : 1));
const fieldRun = factory("field", FIELD, (e) => (Number.isFinite(e.until) ? e.until + e.tau : 1e9), (B, e, age, X) => {
  const { A, f, low } = X, k = fieldK(e, age);
  if (k <= 0) return;
  const rnd = mulberry(hash(e.seed, e.i, 11)), jit = mulberry(hash(e.seed, e.i, 12, f >> 1)), ink = rgb(e.ink), [clx, cly, clr] = e.clear, cx = clx * A;
  if (e.halo?.length) {
    const hc = [rgb(e.far), rgb(e.mid), rgb(e.near)], [hx, hy] = X.P(...e.at2), hr = mulberry(hash(e.seed, 15));
    e.halo.forEach((r, j) => { const ring = [], ph = hr() * 6.28, R = r * (0.92 + 0.08 * k); for (let i = 0; i < 36; i++) { const a = (i / 36) * 6.2832, w = 1 + 0.06 * Math.sin(a * 4 + ph) + 0.04 * Math.sin(a * 9 + f * 0.0 + ph); ring.push([hx + Math.cos(a) * R * 0.9 * w, hy + Math.sin(a) * R * w]); } B.fan(hx, hy, ring, hc[j] ?? hc[2], e.haloA * k * e.alpha); });
  }
  if (e.dark > 0) {
    const vc = rgb(e.vig), steps = e.steps, vr = mulberry(hash(e.seed, 13));
    for (let s = 0; s < steps; s++) {
      const R = (0.5 + 0.2 * s) * (0.9 + 0.1 * k), N = 40, inner = [], outer = [], ph = vr() * 6.28;
      for (let i = 0; i <= N; i++) { const a = (i / N) * 6.2832, w = 1 + 0.08 * Math.sin(a * 3 + ph) + 0.05 * Math.sin(a * 7 + ph * 2); inner.push([A * 0.5 + Math.cos(a) * R * A * 0.78 * w, 0.5 + Math.sin(a) * R * 0.9 * w]); outer.push([A * 0.5 + Math.cos(a) * 3 * A, 0.5 + Math.sin(a) * 3]); }
      B.strip(inner, outer, vc, e.dark * k * e.alpha);
    }
  }
  const tiers = [{ n: e.tiers[0], wS: 0.6, c: rgb(e.far), lit: null, core: false, a: 0.92, inkOn: false }, { n: e.tiers[1], wS: 1, c: rgb(e.mid), lit: rgb(e.near), core: false, a: 1, inkOn: true }, { n: e.tiers[2], wS: 1.7, c: mix(rgb(e.mid), rgb(e.near), 0.45), lit: rgb(e.near, e.emit), core: true, a: 1, inkOn: true }];
  const total = e.streams * (low ? 0.55 : 1);
  tiers.forEach((T, ti) => {
    const n = Math.max(1, Math.round(total * T.n)), flow = f * e.flow * 0.045 * (0.6 + ti * 0.5);
    for (let j = 0; j < n; j++) {
      const side = rnd() < 0.5 ? -1 : 1, x0 = cx + side * (clr * 0.9 + rnd() * (A * 0.5 - clr * 0.9)) * 1.05, ph = rnd() * 6.28, amp = 0.02 + 0.04 * rnd(), fr = 2.6 + 2.4 * rnd(), ww = e.width[0] + (e.width[1] - e.width[0]) * rnd() ** 1.5, top = -0.15 - 0.1 * rnd(), bot = 1.1 + 0.1 * rnd();
      const N = low ? 9 : 14, pts = [], wl = [], wr = [], lean = e.lean * -side * (0.5 + rnd());
      let kink = 0;
      for (let i = 0; i <= N; i++) {
        const t = i / N, y = bot + (top - bot) * t, ang = Math.sin(t * fr * 3.14 + ph + flow * 4) * amp * A;
        if (i % 2 === 0) kink = (jit() - 0.5) * 0.045;
        const x = x0 + lean * (bot - y) * A * 0.5 + ang + kink * A;
        const mask = smooth(0.55, 1.05, Math.hypot((x - cx) / (A * 0.5), (y - cly) * 1.15) / (clr * 1.4 + 0.001) * 0.9);
        const sw = (0.25 + 0.75 * Math.sin(Math.PI * clamp01(t * 0.92 + 0.04)) ** 0.7) * ww * T.wS * (0.35 + 0.65 * mask) * k;
        pts.push([x, y]); wl.push(sw * (0.45 + 1.1 * rnd())); wr.push(sw * (0.45 + 1.1 * rnd()));
      }
      const side2 = (sgn, scale, pad) => pts.map((p, i) => { const q = pts[Math.min(N, i + 1)], r0 = pts[Math.max(0, i - 1)]; let tx = q[0] - r0[0], ty = q[1] - r0[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l; const w = (sgn < 0 ? wl[i] : wr[i]) * scale + pad; return [p[0] - ty * w * sgn, p[1] + tx * w * sgn]; });
      const L = side2(-1, 1, T.inkOn ? e.inkW : 0), R = side2(1, 1, T.inkOn ? e.inkW : 0);
      if (T.inkOn) B.strip(L, R, ink, e.alpha);
      B.strip(side2(-1, 1, 0), side2(1, 1, 0), T.c, T.a * e.alpha);
      if (T.lit) {
        const lw = e.lit < 0 ? -1 : 1, edge = side2(lw, 1, 0), inner = side2(lw, 0.8, 0);
        B.strip(edge, side2(lw, 0.5, 0), mix(T.c, T.lit, 0.55), e.alpha);
        B.strip(edge, inner, T.lit, e.alpha);
        if (T.core) for (let i = 0; i < N; i += 2) if (jit() < 0.7) B.strip([edge[i], edge[i + 1]], [side2(lw, 0.75, 0)[i], side2(lw, 0.75, 0)[i + 1]], rgb(e.hot, e.emit * 1.1), e.alpha);
      }
    }
  });
  const er = mulberry(hash(e.seed, e.i, 14)), ne = Math.round(e.embers * (low ? 0.5 : 1));
  for (let j = 0; j < ne; j++) {
    const big = er() ** 3, sz = 0.003 + 0.011 * big, x = er() * A, sp = 0.05 + 0.25 * (sz / 0.014), ph = (er() + age * sp * 0.6 + big * 0.2) % 1, y = 1.05 - ph * 1.2, sx = x + Math.sin(ph * 9 + j) * 0.03;
    if (Math.hypot((sx - cx) / A, y - cly) < clr * 0.6) continue;
    const s = sz * k * (1 - ph * 0.6), c = er() < 0.35 ? rgb(e.hot, e.emit) : rgb(e.near);
    B.fan(sx, y, [[sx, y - s * 1.8], [sx + s, y], [sx, y + s * 1.8], [sx - s, y]], c, e.alpha);
  }
});

export const makeField = (engine, opts) => { const c = fieldRun(engine, opts); c.level = (ts) => { const e = c.events()[0]; return ts < e.at ? 0 : fieldK(e, ts - e.at); }; return c; };

// ---- flat: a full-frame flat colour for `dur` (the silhouette frame of an impact), optional blink on frames
export const makeFlat = factory("flat", { col: "#ffffff", dur: 2 / 24, fps: 24, order: 1003, pattern: null }, (e) => e.dur, (B, e, age, X) => {
  if (e.pattern && !e.pattern[X.f % e.pattern.length]) return;
  B.rect(0, 0, X.A, 1, rgb(e.col, 1), e.alpha);
});

export const DEFAULTS = { field: FIELD, veins: VEINS, crescent: CRESCENT, burst: BURST, ring: RING, cracks: CRACKS, plume: PLUME, debris: DEBRIS, aura: AURA, speed: SPEED };

// the gallery demo (the `_fx` lab, ?fx=cel): the whole vocabulary, one drawing each in a 3 x 3 grid, looping every 1.6 s
export function demo(engine) {
  const q = typeof location === "undefined" ? new URLSearchParams() : new URLSearchParams(location.search), only = q.get("cel");
  const U = (i) => 0.16 + (i % 3) * 0.34, V = (i) => 0.17 + Math.floor(i / 3) * 0.33, L = 1.6, fx = [];
  const add = (mk, i, o) => { fx.push(mk(engine, { loop: L, at: 0.2, ...o })); };
  const all = !only || only === "all";
  if (all || only === "veins") add(makeVeins, 0, all ? { from: [U(0), V(0) - 0.14], to: [U(0) + 0.04, V(0) + 0.15], width: 0.006, hold: 0.8 } : { from: [0.5, 0.02], to: [0.55, 0.95], width: 0.012, hold: 0.9 });
  if (all || only === "crescent") add(makeCrescent, 1, all ? { from: [U(1) - 0.12, V(1) + 0.1], to: [U(1) + 0.12, V(1) - 0.1], thick: 0.025, hold: 0.5 } : { hold: 0.8 });
  if (all || only === "burst") add(makeBurst, 2, all ? { where: [U(2), V(2)], size: 0.17, frames: 20 } : { frames: 36, bgFrames: 3 });
  if (all || only === "ring") add(makeRing, 3, all ? { where: [U(3), V(3) + 0.05], radius: 0.28, thick: 0.03, dur: 1 } : { dur: 1 });
  if (all || only === "cracks") add(makeCracks, 4, all ? { where: [U(4), V(4) + 0.08], len: 0.35, count: 6, hold: 1, width: 0.008 } : { hold: 1 });
  if (all || only === "plume") add(makePlume, 5, all ? { where: [U(5), V(5) + 0.12], size: 0.06 } : {});
  if (all || only === "debris") add(makeDebris, 6, all ? { where: [U(6), V(6) + 0.12], speed: 0.7, size: [0.006, 0.03] } : {});
  if (all || only === "aura") add(makeAura, 7, all ? { loop: 0, where: [U(7), V(7)], size: [0.07, 0.12], len: 0.12, embers: 12 } : { loop: 0, where: [0.64, 0.58], size: [0.17, 0.3] });
  if (all || only === "speed") add(makeSpeedLines, 8, all ? { focus: [U(8), V(8)], count: 36, inner: 0.05, reach: 0.17, dur: 1.2 } : { dur: 1.4 });
  const group = new Group();
  fx.forEach((f) => group.add(f.group));
  return { group, update(ts, cue) { for (const f of fx) f.update(ts, cue); }, dispose() { fx.forEach((f) => f.dispose()); } };
}

// ---- the data hook. scene.cel = [{ kind, at, ...opts }] is turned into factories by composeLayers and updated on the fx clock (a `ones` window
// steps them at 24). kinds: field veins crescent burst ring cracks plume debris aura speed flat, and the macros hit, slashes, quake.
// effects keep off the seal: an ellipse cut-out fitted to its screen box (front: true draws over it; behind: true tests depth against the cast, exact but hidden behind any layer-1 set)
const KINDS = { field: makeField, veins: makeVeins, crescent: makeCrescent, burst: makeBurst, ring: makeRing, cracks: makeCracks, plume: makePlume, debris: makeDebris, aura: makeAura, speed: makeSpeedLines, flat: makeFlat };

const slashChord = (i, seed = 1) => { const r = mulberry(hash(seed, i, 77)), side = i % 2 ? 1 : -1, y0 = 0.1 + 0.8 * r(), y1 = 0.1 + 0.8 * r(); return { from: [side > 0 ? 0.02 : 0.98, y0], to: [side > 0 ? 0.98 : 0.02, y1], bend: side * (0.1 + 0.15 * r()), where: [0.12 + 0.76 * r(), 0.15 + 0.7 * r()] }; };

// macros return [[kind, opts], ...]
const MACROS = {
  // one hit: [flat], crescent chord, impact drawing 1 frame later, debris, and when big a ring, speed lines and the burned-in silhouette
  hit: (o) => { const at = o.at ?? 0, big = !!o.big, w = o.where ?? [0.5, 0.5], sz = o.size ?? (big ? 0.5 : 0.22), out = [];
    if (big) out.push(["flat", { at, col: o.flash ?? "#fff7ee", dur: 1 / 24 }]);
    if (o.slash !== false) { const c = o.slash ? { from: o.slash[0], to: o.slash[1], bend: o.slash[2] ?? 0.2 } : slashChord(o.i ?? 0, o.seed); out.push(["crescent", { ...c, at: at + (big ? 2 / 24 : 0), thick: o.thick ?? (big ? 0.12 : 0.05), hold: big ? 1.1 : 0.17, tau: big ? 0.5 : 0.16, edge: o.edge, body: o.body }]); }
    out.push(["burst", { where: w, at: at + 1 / 24, size: sz, frames: big ? 12 : 8, bgFrames: big ? 3 : 0, spikes: big ? 22 : 16, lines: big ? 30 : 18, edge: o.edge, body: o.body }]);
    out.push(["debris", { where: w, at: at + 1 / 24, count: big ? 26 : 10, speed: big ? 1.6 : 1.1, cone: big ? 3.4 : 1.6, size: big ? [0.015, 0.1] : [0.012, 0.05], seed: (o.i ?? 0) + 3, tone: o.tone, lit: o.lit }]);
    if (big) { out.push(["ring", { where: [w[0], Math.min(0.9, w[1] + 0.2)], at: at + 3 / 24, radius: 0.8, thick: 0.07, edge: o.edge }]); out.push(["speed", { at: at - 0.5, dur: 0.5, count: 90, inner: 0.3, focus: w }]); }
    return out; },
  // many hits on a clock: times [..], chords from a seeded rule, or chords: [[from, to, bend], ...]
  slashes: (o) => (o.times ?? []).flatMap((t, i) => MACROS.hit({ at: t, i, seed: o.seed, slash: o.chords?.[i], where: o.chords?.[i] ? o.chords[i][1] : undefined, size: o.size ?? 0.14, edge: o.edge, body: o.body, tone: o.tone, lit: o.lit })),
  // the ground takes it: cracks, rings, a row of plumes, debris
  quake: (o) => { const at = o.at ?? 0, w = o.where ?? [0.5, 0.88];
    return [["cracks", { at, where: w, count: 9, len: 1.2, hold: 2.5, width: 0.02, seam: o.seam }], ["ring", { at, where: w, radius: 0.9, thick: 0.08, rings: 3, edge: o.edge }],
      ["plume", { events: [0.12, 0.3, 0.5, 0.7, 0.88].map((u, i) => ({ where: [u, 0.95], at: at + 0.1 + i * 0.06, seed: i + 2, size: 0.16 })), shadow: o.shadow, lit: o.lit }], ["debris", { at, where: w, count: 24, speed: 1.4, cone: 2, size: [0.01, 0.09] }]]; },
};

export function celLayer(ctx) {
  const engine = ctx.engine, s = ctx.seal, k = s?.scale ?? 1, group = new Group(), fx = [];
  const sealHole = s ? [s.at[0], s.at[1] + 0.42 * k, s.at[2], 0.4 * k] : null;
  group.name = "cel";
  let order = 1100;
  const put = (kind, o) => {
    const mk = KINDS[kind]; if (!mk) throw new Error(`scene.cel: unknown kind "${kind}"`);
    const behind = !!o.behind, hole = o.hole === undefined || o.hole === "seal" ? null : o.hole, sealBox = behind || o.front || o.hole === null ? null : () => ctx.player?.box;
    const f = mk(engine, { ...o, behind, hole, sealBox, order: o.order ?? order++ }); group.add(f.group); fx.push(f); return f;
  };
  const merged = new Map(); // macros share one mesh per kind (a barrage of 17 slashes is 4 draw calls, not 68)
  for (const { kind, ...o } of ctx.scene.cel ?? []) {
    if (MACROS[kind]) {
      const { tier, front, hole, ...rest } = o; if ((engine.tier ?? 2) < (tier ?? 0)) continue;
      for (const [k2, o2] of MACROS[kind](rest)) { const key = `${k2}|${front ? 1 : 0}`, m = merged.get(key) ?? merged.set(key, { kind: k2, base: { front, ...(hole !== undefined ? { hole } : {}) }, events: [] }).get(key); const { events, ...r2 } = o2; m.events.push(...(events ? events.map((ev) => ({ ...r2, ...ev })) : [r2])); }
    } else if ((engine.tier ?? 2) >= (o.tier ?? 0)) put(kind, o);
  }
  const RANK = ["flat", "speed", "cracks", "ring", "plume", "debris", "crescent", "burst"];
  for (const m of [...merged.values()].sort((x, y) => RANK.indexOf(x.kind) - RANK.indexOf(y.kind))) put(m.kind, { ...m.base, events: m.events });
  const sh = engine.shared ?? {}, aura = (sh.uAura ??= { value: new Vector4(0, 3, 1.5, 0.6) }), rim = (sh.uFxRim ??= { value: new Vector4(0, 0, 0, 0) });
  let rimOn = false;
  const lead = fx.filter((f) => f.level), glow = ctx.scene.cel?.find((c) => c.rim)?.rim ?? (ctx.scene.cel?.some((c) => c.rim === false) ? null : (() => { const o = ctx.scene.cel?.find((c) => c.edge ?? c.body ?? c.near); return o ? (o.edge ?? o.body ?? o.near) : "#ff3b3b"; })());
  return {
    group, fx,
    update(t, dt, cue) {
      for (const f of fx) f.update(t, cue);
      const L0 = lead.reduce((m, f) => Math.max(m, f.level(t)), 0); aura.value.x = L0;
      const L = Math.max(L0, 0.9 * Math.exp(-Math.min(cue?.since?.("shake") ?? 9, cue?.since?.("impact") ?? 9) * 3.5)); // a hit lights the seal too
      if (glow) {
        const c = rgb(glow); rim.value.set(c[0], c[1], c[2], L);
        if (sh.uRimCol && sh.uRimDir) { if (L > 0.01) { sh.uRimCol.value.setRGB(c[0], c[1], c[2]); sh.uRimDir.value.set(-0.35, 0.25, -0.9); } else if (rimOn) { sh.uRimDir.value.set(0, 0, 0); } rimOn = L > 0.01; }
      }
    },
    dispose() { fx.forEach((f) => f.dispose()); aura.value.x = 0; rim.value.w = 0; },
  };
}
