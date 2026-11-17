// beam: light lines as SDF ribbons, one draw call per instance.
//   makeBeam   a straight beam from -> to that grows, holds and decays (railgun, weigh line, kunai streak)
//   makeBolt   midpoint-displacement lightning with branches, redrawn on every drawn frame (fps)
//   makeSlash  tapered draw-on strokes along points, arcs or a cleave lattice, many per mesh with a
//              per-stroke delay; profile "comet" is an arc band with a bright head and a fading tail
// Ribbon: each centreline point is pushed sideways in screen space by w/2, w in px (x H/800), h (x H) or
//   m (x P11 H / 2 clip.w). Across it r = |v| in [0, 1] cuts three nested bands core < body < glow with
//   glow = exp(-(r - r_body) / lambda); the hard variant drops the glow and rims the body in ink.
// Blend: light is additive vec4(rgb, 0), so the id in alpha survives; ink, hard or blend "normal" is
//   premultiplied vec4(rgb a, a). Never writes depth. Linear colour: body, glow luma <= 0.92, core x emit.
// Time: age = ts - at, draw-on ease(age / grow), hold, then exp(-t / tau); set({ k }) with k in 0..1 drives
//   the whole life by hand instead (k = null is the clock). from / to / hole may be live vectors.
// Space: "world" points are in the group's frame; "screen" points are [x, y] in frame heights from the
//   top-left, y down (units "m" then means "h"). width is the body width or [core, body, glow]; hole
//   [x, y, z, r] cuts a world sphere (the seal) out of the ribbon on screen.
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, DoubleSide, DynamicDrawUsage, Group, Mesh, NormalBlending, ShaderMaterial, Sphere, Vector2, Vector3, Vector4 } from "three";
import { glslFor } from "../../tools/index.js";

const ease3 = (k) => 1 - (1 - k) ** 3;
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const tp = (d, t) => (t > 0 ? Math.sqrt(clamp01(d / t)) : 1);
const cx = (p) => p.x ?? p[0] ?? 0, cy = (p) => p.y ?? p[1] ?? 0, cz = (p) => p.z ?? p[2] ?? 0, cw = (p) => p.w ?? p[3] ?? 0;
const mixh = (h, v) => { h = Math.imul(h ^ v, 0x85ebca6b); return h ^ (h >>> 13); };
const hash = (a, b = 0, c = 0) => { let h = mixh(mixh(mixh(0x9e3779b9 | 0, a | 0), b | 0), c | 0); h = Math.imul(h ^ (h >>> 16), 0xc2b2ae35); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const FLOOR = new Color("#0e0c16");
const luma = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
const paint = (c, hex, gain = 1) => { c.set(hex); const y = luma(c); if (gain <= 1 && y > 0.92) c.multiplyScalar(0.92 / y); return c.multiplyScalar(gain); };
const inked = (c, hex) => { c.set(hex); const y = luma(c), f = luma(FLOOR); return y < f ? c.lerp(FLOOR, 1 - y / f) : c; };
const lowTier = (engine) => (engine?.tier ?? 2) <= 1;
const M = 48;

const VS = /* glsl */ `
  attribute vec3 aTan; attribute float aSide; attribute vec4 aData;
  uniform vec2 uRes; uniform vec3 uWid; uniform float uOn; uniform vec4 uHole;
  varying vec2 vQ; varying vec2 vI; varying vec3 vHole;
  void main() {
    vQ = vec2(aSide, aData.z); vI = aData.yw; vHole = vec3(0.0, 0.0, -1.0);
    if (uOn < 0.5) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    vec4 c; vec2 sd;
    if (uWid.z > 0.5) {
      c = vec4(position.x * 2.0 * uRes.y / uRes.x - 1.0, 1.0 - 2.0 * position.y, 0.0, 1.0);
      sd = vec2(aTan.x, -aTan.y);
    } else {
      c = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      vec4 dc = projectionMatrix * modelViewMatrix * vec4(aTan, 0.0);
      sd = (dc.xy * c.w - c.xy * dc.w) * uRes;
    }
    float l = length(sd);
    vec2 n = l > 1e-6 ? vec2(-sd.y, sd.x) / l : vec2(0.0, 1.0);
    float hw = aData.x * (uWid.x * uRes.y / 800.0 + uWid.y * projectionMatrix[1][1] * 0.5 * uRes.y / max(abs(c.w), 1e-4));
    c.xy += n * (aSide * hw * 2.0 * c.w) / uRes;
    gl_Position = c;
    if (uHole.w > 0.0) {
      vec4 hc = projectionMatrix * viewMatrix * vec4(uHole.xyz, 1.0);
      if (hc.w > 1e-3) vHole = vec3(hc.xy / hc.w, uHole.w * projectionMatrix[1][1] / hc.w);
    }
  }`;

const FS = /* glsl */ `
  uniform vec2 uRes; uniform vec3 uCore; uniform vec3 uBody; uniform vec3 uGlow; uniform vec3 uInk;
  uniform vec4 uBand; uniform vec4 uLook; uniform float uGlowA;
  varying vec2 vQ; varying vec2 vI; varying vec3 vHole;
  ${glslFor(["noise"])}
  void main() {
    float r0 = abs(vQ.x), r = r0;
    if (uLook.y > 0.0) r /= max(0.2, 1.0 + uLook.y * (2.0 * vn(vec2(vQ.y * uLook.z + vI.y, uLook.w)) - 1.0));
    float fw = fwidth(r) * 0.75 + 1e-4;
    float a = vI.x * (1.0 - smoothstep(1.0 - fwidth(r0) * 0.75 - 1e-4, 1.0, r0));
    if (vHole.z > 0.0) {
      vec2 q = (gl_FragCoord.xy / uRes * 2.0 - 1.0 - vHole.xy) * vec2(uRes.x / uRes.y, 1.0);
      a *= smoothstep(vHole.z * 0.9, vHole.z * 1.1, length(q));
    }
    if (a < 0.002 || r0 > 1.0) discard;
    float core = 1.0 - smoothstep(uBand.x - fw, uBand.x + fw, r);
    float body = 1.0 - smoothstep(uBand.y - fw, uBand.y + fw, r);
    float ink = 1.0 - smoothstep(uBand.z - fw, uBand.z + fw, r);
    float glow = uBand.w > 0.0 ? exp(-max(r - uBand.y, 0.0) / uBand.w) : 0.0;
    vec3 col = mix(mix(uGlow, uInk, ink), uBody, body);
    col = mix(col, uCore, core);
    if (uLook.x < 0.5) gl_FragColor = vec4(mix(uGlow * glow, col, ink) * a, 0.0);
    else { float al = max(glow * uGlowA, ink) * a; gl_FragColor = vec4(col * al, al); }
  }`;

function ribbons(engine, nRib, nPts) {
  const nV = nRib * nPts * 2;
  const pos = new Float32Array(nV * 3), tan = new Float32Array(nV * 3), data = new Float32Array(nV * 4), side = new Float32Array(nV);
  const idx = new (nV > 65535 ? Uint32Array : Uint16Array)(nRib * (nPts - 1) * 6);
  for (let r = 0, q = 0; r < nRib; r++) for (let i = 0; i < nPts; i++) {
    const v = (r * nPts + i) * 2;
    side[v] = -1; side[v + 1] = 1;
    if (i < nPts - 1) { idx[q++] = v; idx[q++] = v + 1; idx[q++] = v + 2; idx[q++] = v + 1; idx[q++] = v + 3; idx[q++] = v + 2; }
  }
  const geo = new BufferGeometry(), dyn = (a, k) => new BufferAttribute(a, k).setUsage(DynamicDrawUsage);
  geo.setAttribute("position", dyn(pos, 3)); geo.setAttribute("aTan", dyn(tan, 3)); geo.setAttribute("aData", dyn(data, 4));
  geo.setAttribute("aSide", new BufferAttribute(side, 1));
  geo.setIndex(new BufferAttribute(idx, 1));
  geo.boundingSphere = new Sphere(new Vector3(), 1e6);
  const u = {
    uRes: engine?.shared?.uRes ?? { value: new Vector2(1280, 800) }, uWid: { value: new Vector3() }, uOn: { value: 0 }, uHole: { value: new Vector4() },
    uCore: { value: new Color() }, uBody: { value: new Color() }, uGlow: { value: new Color() }, uInk: { value: new Color() },
    uBand: { value: new Vector4() }, uLook: { value: new Vector4() }, uGlowA: { value: 0.5 },
  };
  const mat = new ShaderMaterial({ uniforms: u, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, premultipliedAlpha: true, side: DoubleSide });
  const mesh = new Mesh(geo, mat);
  mesh.frustumCulled = false;
  const at = geo.attributes;
  return {
    mesh, mat, u, nPts,
    put(r, i, x, y, z, w, a, s, sd) {
      const v = (r * nPts + i) * 2, p = v * 3, d = v * 4;
      pos[p] = pos[p + 3] = x; pos[p + 1] = pos[p + 4] = y; pos[p + 2] = pos[p + 5] = z;
      data[d] = data[d + 4] = w; data[d + 1] = data[d + 5] = a; data[d + 2] = data[d + 6] = s; data[d + 3] = data[d + 7] = sd;
    },
    tangents(r) {
      const b = r * nPts;
      for (let i = 0; i < nPts; i++) {
        const p = (b + Math.min(nPts - 1, i + 1)) * 6, q = (b + Math.max(0, i - 1)) * 6, v = (b + i) * 6;
        tan[v] = tan[v + 3] = pos[p] - pos[q]; tan[v + 1] = tan[v + 4] = pos[p + 1] - pos[q + 1]; tan[v + 2] = tan[v + 5] = pos[p + 2] - pos[q + 2];
      }
    },
    zero(r) { data.fill(0, r * nPts * 8, (r + 1) * nPts * 8); },
    clear() { data.fill(0); },
    frame(o, ts, upload = true) {
      u.uLook.value.w = Math.floor(ts * o.fps + 1e-6) % 997;
      const h = o.hole;
      if (h) u.uHole.value.set(cx(h), cy(h), cz(h), cw(h)); else u.uHole.value.w = 0;
      if (upload && u.uOn.value) at.position.needsUpdate = at.aTan.needsUpdate = at.aData.needsUpdate = true;
    },
    dispose() { geo.dispose(); mat.dispose(); },
  };
}

const ENUMS = { units: ["m", "px", "h"], space: ["world", "screen"], blend: ["add", "normal"], profile: ["slash", "comet", "even"] };
const LOOK_KEYS = new Set(["width", "units", "space", "core", "body", "glow", "ink", "inkW", "emit", "glowAlpha", "hard", "blend", "boil", "boilF", "order"]);
function prep(o, name) {
  for (const k in ENUMS) if (k in o && !ENUMS[k].includes(o[k])) throw new Error(`${name}: ${k} must be one of ${ENUMS[k].join(", ")}`);
  if (typeof o.taper === "number") o.taper = [o.taper, o.taper];
}
const touchesLook = (patch) => { for (const k in patch) if (LOOK_KEYS.has(k)) return true; return false; };

// widths [core, body, glow] -> band radii in r units of the outer half width, and the px / m half width
function look(R, o) {
  const u = R.u, normal = o.hard || o.ink != null || o.blend === "normal", screen = o.space === "screen";
  const W = Array.isArray(o.width) ? o.width : [o.width * 0.4, o.width, o.width * 2.4];
  const wc = W[0], wb = W[1], wg = o.hard ? 0 : W[2];
  const ink = normal && (o.hard || o.ink != null) ? o.inkW ?? wb * 0.3 : 0;
  const half = Math.max(wb * 0.5 + ink, wg * 0.5, 1e-9), rb = (wb * 0.5) / half;
  u.uBand.value.set(wc > 0 ? (wc * 0.5) / half : -1, rb, (wb * 0.5 + ink) / half, wg > wb ? (1 - rb) / 3 : 0);
  const metres = o.units === "m" && !screen;
  u.uWid.value.set(metres ? 0 : o.units === "px" ? half : half * 800, metres ? half : 0, screen ? 1 : 0);
  paint(u.uCore.value, o.core, o.emit ?? (o.hard || o.ink != null ? 1 : 2.2)); paint(u.uBody.value, o.body); paint(u.uGlow.value, o.glow);
  if (ink) inked(u.uInk.value, o.ink ?? "#140a0c"); else u.uInk.value.copy(u.uBody.value);
  u.uLook.value.set(normal ? 1 : 0, o.boil, o.boilF, u.uLook.value.w);
  u.uGlowA.value = o.glowAlpha;
  R.mat.blending = normal ? NormalBlending : AdditiveBlending;
  R.mat.depthTest = !screen;
  R.mesh.renderOrder = o.order;
}

const lifeOf = (o, lead) => lead + (Number.isFinite(o.hold) ? o.hold + 3 * o.tau : 0);
const ageOf = (o, ts, life) => (o.k == null ? ts - o.at : o.k > 0 ? o.k * life : -Infinity);
const decay = (o, age, lead) => (age < 0 ? 0 : age < lead + o.hold ? 1 : Math.exp(-(age - lead - o.hold) / Math.max(o.tau, 1e-4)));
const prog = (lead, age) => (lead > 0 ? clamp01(age / lead) : 1);

// inkW null = 0.3 x body; emit null = 2.2, or 1 when hard or inked; thin is the share of the decay that also
// narrows the width; boil a ragged edge
const LOOK = {
  space: "world", units: "m", width: 0.08, inkW: null,
  core: "#ffffff", body: "#7fd4ff", glow: "#2d6bff", ink: null, emit: null, glowAlpha: 0.5,
  hard: false, blend: "add", boil: 0, boilF: 9,
  at: 0, hold: Infinity, tau: 0.5, ease: ease3, k: null, fade: 1, thin: 0.5,
  fps: 12, seed: 1, hole: null, order: 10, plateDepth: true,
};
export const BEAM_DEFAULTS = { ...LOOK, from: [0, 1, 0], to: [3, 1, 0], width: 0.12, core: "#fff6d6", body: "#ffd23a", glow: "#ff6a1a",
  grow: 4 / 24, taper: [0.04, 0.08], boil: 0.06, points: 33 };
export const BOLT_DEFAULTS = { ...LOOK, from: [0, 2, 0], to: [0, 0, 0], width: 0.03, core: "#f4ffff", body: "#76d8d6", glow: "#8a5aff",
  grow: 0, thin: 0, taper: [0, 0.05], segments: 8, depth: 4, amp: 0.18, rough: 0.55, branches: 3, branchLen: 0.35, branchW: 0.55, flicker: 0.25 };
export const SLASH_DEFAULTS = { ...LOOK, list: [{ points: [[-0.8, 0.5, 0], [0.8, 1.5, 0]] }], width: 0.04, core: "#ffffff", body: "#f2ece0", glow: "#d1081f",
  profile: "slash", power: 0.6, taper: [0.05, 0.05], tail: 0.6, headW: 0.3, draw: 2 / 12, hold: 4 / 12, tau: 0.25, retract: true, thin: 0.6, points: 25, max: 0 };
export const DEFAULTS = { beam: BEAM_DEFAULTS, bolt: BOLT_DEFAULTS, slash: SLASH_DEFAULTS };

function handle(R, o, name, update, pre, post) {
  const group = new Group();
  group.userData.plateDepth = o.plateDepth; // the set hides it (post.js); plateDepth: false keeps it drawn over the whole plate
  group.add(R.mesh);
  return {
    group, update,
    set(patch) { prep(patch, name); pre?.(patch); Object.assign(o, patch); prep(o, name); group.userData.plateDepth = o.plateDepth; if (touchesLook(patch)) look(R, o); post?.(patch); },
    dispose: R.dispose,
  };
}

export function makeBeam(engine, opts = {}) {
  const o = { ...BEAM_DEFAULTS, ...opts };
  prep(o, "makeBeam");
  const n = Math.max(2, lowTier(engine) ? Math.ceil(o.points / 2) : o.points), R = ribbons(engine, 1, n);
  look(R, o);
  return handle(R, o, "makeBeam", (ts) => {
    const lead = o.grow, age = ageOf(o, ts, lifeOf(o, lead)), d = decay(o, age, lead), f = d * o.fade;
    R.u.uOn.value = f > 0.004 ? 1 : 0;
    if (f > 0.004) {
      const screen = o.space === "screen", F = o.from, E = o.to, fx = cx(F), fy = cy(F), fz = screen ? 0 : cz(F);
      const dx = cx(E) - fx, dy = cy(E) - fy, dz = (screen ? 0 : cz(E)) - fz, L = Math.hypot(dx, dy, dz);
      const head = o.ease(prog(lead, age)), hl = head * L, tA = o.taper[0] * L, tB = o.taper[1] * L, wk = 1 - o.thin * (1 - d), sd = hash(o.seed, 1) * 50;
      for (let i = 0; i < n; i++) {
        const s = head * 0.5 * (1 - Math.cos((Math.PI * i) / (n - 1))), x = s * L;
        R.put(0, i, fx + dx * s, fy + dy * s, fz + dz * s, tp(x, tA) * tp(hl - x, tB) * wk, f, s, sd);
      }
      R.tangents(0);
    }
    R.frame(o, ts);
  });
}

// B: origin 0-2, span 3-5 (to - from), e1 6-8, e2 9-11 (unit, across the span), length 12
function frameOf(fx, fy, fz, tx, ty, tz, screen, B) {
  const dx = tx - fx, dy = ty - fy, dz = tz - fz, L = Math.hypot(dx, dy, dz) || 1e-6, ax = dx / L, ay = dy / L, az = dz / L;
  B[0] = fx; B[1] = fy; B[2] = fz; B[3] = dx; B[4] = dy; B[5] = dz; B[12] = L;
  if (screen) { B[6] = -ay; B[7] = ax; B[8] = 0; B[9] = B[10] = B[11] = 0; return; }
  let ex = -az, ey = 0, ez = ax;
  if (Math.abs(ay) >= 0.95) { ex = 0; ey = az; ez = -ay; }
  const el = Math.hypot(ex, ey, ez) || 1;
  B[6] = ex / el; B[7] = ey / el; B[8] = ez / el;
  B[9] = ay * B[8] - az * B[7]; B[10] = az * B[6] - ax * B[8]; B[11] = ax * B[7] - ay * B[6];
}
// sideways offset at s in units of the span: jittered joints between `segs` pieces, then `depth` midpoint
// levels per piece; a level spanning l of the length moves by amp l^H, H = -log2(rough)
function jag(s, sk, rib, segs, depth, amp, rough, J) {
  const H = -Math.log2(rough), j = Math.min(segs - 1, Math.floor(s * segs)), t = s * segs - j;
  let ox = 0, oy = 0;
  if (segs > 1) {
    const A = amp * (2 / segs) ** H, a = j > 0 ? A : 0, b = j + 1 < segs ? A : 0;
    const x0 = (hash(sk, rib * 8, j * 2) * 2 - 1) * a, y0 = (hash(sk, rib * 8, j * 2 + 1) * 2 - 1) * a;
    ox = x0 + ((hash(sk, rib * 8, j * 2 + 2) * 2 - 1) * b - x0) * t; oy = y0 + ((hash(sk, rib * 8, j * 2 + 3) * 2 - 1) * b - y0) * t;
  }
  for (let l = 1; l <= depth; l++) {
    const m = 2 ** (l - 1), k = Math.min(m - 1, Math.floor(t * m)), g = t * m - k, A = amp * (1 / (segs * m)) ** H * (1 - Math.abs(2 * g - 1)), id = (j * 64 + k) * 2;
    ox += (hash(sk, rib * 8 + l, id) * 2 - 1) * A; oy += (hash(sk, rib * 8 + l, id + 1) * 2 - 1) * A;
  }
  J[0] = ox; J[1] = oy;
}
function pointAt(B, s, sk, rib, o, segs, depth, J, P) {
  jag(s, sk, rib, segs, depth, o.amp, o.rough, J);
  const a = J[0] * B[12], b = J[1] * B[12];
  P[0] = B[0] + B[3] * s + B[6] * a + B[9] * b; P[1] = B[1] + B[4] * s + B[7] * a + B[10] * b; P[2] = B[2] + B[5] * s + B[8] * a + B[11] * b;
}

export function makeBolt(engine, opts = {}) {
  const o = { ...BOLT_DEFAULTS, ...opts };
  prep(o, "makeBolt");
  const lo = lowTier(engine), nb = lo ? Math.ceil(o.branches / 2) : o.branches;
  const n = Math.min(Math.max(1, Math.round(o.segments)) * 2 ** Math.max(0, Math.min(6, Math.round(o.depth))), lo ? 48 : 96) + 1;
  const R = ribbons(engine, 1 + nb, n), T = new Float64Array(13), B = new Float64Array(13), J = new Float64Array(2), P = new Float64Array(3);
  look(R, o);
  return handle(R, o, "makeBolt", (ts) => {
    const lead = o.grow, age = ageOf(o, ts, lifeOf(o, lead)), sk = (Math.imul(o.seed | 0, 7919) + Math.imul(Math.floor(ts * o.fps + 1e-6), 104729)) | 0;
    const d = decay(o, age, lead), f = d * o.fade * (1 - o.flicker * hash(sk, 977));
    R.u.uOn.value = f > 0.004 ? 1 : 0;
    if (f > 0.004) {
      const screen = o.space === "screen", F = o.from, E = o.to, head = o.ease(prog(lead, age)), wk = 1 - o.thin * (1 - d);
      const segs = Math.max(1, Math.round(o.segments)), depth = Math.max(0, Math.min(6, Math.round(o.depth)));
      frameOf(cx(F), cy(F), screen ? 0 : cz(F), cx(E), cy(E), screen ? 0 : cz(E), screen, T);
      for (let i = 0; i < n; i++) {
        const s = (head * i) / (n - 1);
        pointAt(T, s, sk, 0, o, segs, depth, J, P);
        R.put(0, i, P[0], P[1], P[2], (1 - 0.5 * s * s) * tp(s, o.taper[0]) * tp(head - s, o.taper[1]) * wk, f, s, 0);
      }
      R.tangents(0);
      const L = T[12], ax = T[3] / L, ay = T[4] / L, az = T[5] / L, hk = sk ^ 0x5bd1e995;
      for (let b = 1; b <= nb; b++) {
        const sb = 0.15 + 0.6 * hash(hk, b, 1), hb = b > o.branches ? 0 : clamp01((head - sb) / (1 - sb));
        if (hb <= 0) { R.zero(b); continue; }
        pointAt(T, sb, sk, 0, o, segs, depth, J, P);
        const th = 0.35 + 0.5 * hash(hk, b, 2), ph = 6.2832 * hash(hk, b, 3), lb = L * o.branchLen * (0.6 + 0.6 * hash(hk, b, 4));
        const qc = screen ? (hash(hk, b, 5) < 0.5 ? -1 : 1) : Math.cos(ph), qs = screen ? 0 : Math.sin(ph), c = Math.cos(th) * lb, sn = Math.sin(th) * lb;
        frameOf(P[0], P[1], P[2], P[0] + ax * c + (T[6] * qc + T[9] * qs) * sn, P[1] + ay * c + (T[7] * qc + T[10] * qs) * sn, P[2] + az * c + (T[8] * qc + T[11] * qs) * sn, screen, B);
        for (let i = 0; i < n; i++) {
          const s = (hb * i) / (n - 1);
          pointAt(B, s, sk, b, o, segs, depth, J, P);
          R.put(b, i, P[0], P[1], P[2], o.branchW * (1 - 0.6 * s) * tp(hb - s, 0.2) * wk, f * 0.85, s, b);
        }
        R.tangents(b);
      }
    }
    R.frame(o, ts);
  });
}

const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
// in-plane axes: screen x right / y up (visual angles counter-clockwise), world from the normal
function plane(nrm, screen) {
  if (screen) return [[1, 0, 0], [0, -1, 0]];
  const n = unit([cx(nrm), cy(nrm), cz(nrm)]), e1 = unit(cross(Math.abs(n[1]) < 0.95 ? [0, 1, 0] : [1, 0, 0], n));
  return [e1, cross(n, e1)];
}
const onPlane = (c, e, x, y, screen) => [cx(c) + e[0][0] * x + e[1][0] * y, cy(c) + e[0][1] * x + e[1][1] * y, (screen ? 0 : cz(c)) + e[0][2] * x + e[1][2] * y];
function strokesOf(list, screen, lo) {
  const out = [];
  for (const it of list) {
    const base = { delay: it.delay ?? 0, w: it.width ?? 1, gain: it.gain ?? 1 };
    if (it.points) {
      if (it.points.length < 2) throw new Error("makeSlash: points needs at least 2 points");
      out.push({ ...base, pts: it.points.flatMap((p) => [cx(p), cy(p), screen ? 0 : cz(p)]) });
    } else if (it.arc) {
      const { center = [0, 0, 0], radius = 1, start = 0, sweep = Math.PI / 2, normal = [0, 0, 1] } = it.arc, e = plane(normal, screen), pts = [];
      for (let i = 0; i < M; i++) { const t = start + (sweep * i) / (M - 1); pts.push(...onPlane(center, e, Math.cos(t) * radius, Math.sin(t) * radius, screen)); }
      out.push({ ...base, pts });
    } else if (it.lattice) {
      const { center = [0, 0, 0], size = [2, 2], angle = 0.96, spacing = 0.12, cross: both = true, normal = [0, 0, 1], stagger = 0 } = it.lattice;
      const e = plane(normal, screen), hw = size[0] / 2, hh = size[1] / 2, sp = spacing * (lo ? 2 : 1);
      let idx = 0;
      for (const ang of both ? [angle, -angle] : [angle]) {
        const dx = Math.cos(ang), dy = Math.sin(ang), J = Math.floor((Math.abs(dy) * hw + Math.abs(dx) * hh) / sp);
        for (let j = -J; j <= J; j++) {
          const px = -dy * j * sp, py = dx * j * sp;
          let t0 = -Infinity, t1 = Infinity;
          for (const [p, q, h] of [[px, dx, hw], [py, dy, hh]]) {
            if (Math.abs(q) < 1e-9) { if (Math.abs(p) > h) t0 = Infinity; continue; }
            t0 = Math.max(t0, Math.min((-h - p) / q, (h - p) / q)); t1 = Math.min(t1, Math.max((-h - p) / q, (h - p) / q));
          }
          if (t1 - t0 < sp * 0.5) continue;
          out.push({ ...base, delay: base.delay + stagger * idx++, pts: [...onPlane(center, e, px + dx * t0, py + dy * t0, screen), ...onPlane(center, e, px + dx * t1, py + dy * t1, screen)] });
        }
      }
    } else throw new Error("makeSlash: each list item needs points, arc or lattice");
  }
  return out;
}
function densify(src, out, off) {
  const n = src.length / 3, cum = new Float64Array(n);
  for (let i = 1; i < n; i++) cum[i] = cum[i - 1] + Math.hypot(src[i * 3] - src[i * 3 - 3], src[i * 3 + 1] - src[i * 3 - 2], src[i * 3 + 2] - src[i * 3 - 1]);
  for (let j = 0, i = 0; j < M; j++) {
    const d = (cum[n - 1] * j) / (M - 1);
    while (i < n - 2 && cum[i + 1] < d) i++;
    const seg = cum[i + 1] - cum[i], t = seg > 0 ? clamp01((d - cum[i]) / seg) : 0;
    for (let k = 0; k < 3; k++) out[off + j * 3 + k] = src[i * 3 + k] + (src[i * 3 + 3 + k] - src[i * 3 + k]) * t;
  }
}

// strokes along list items { points } | { arc: { center, radius, start, sweep, normal } } | { lattice: { center, size,
// angle, spacing, cross, normal, stagger } }, each with optional delay (s), width (scale) and gain. Angles in radians.
export function makeSlash(engine, opts = {}) {
  const o = { ...SLASH_DEFAULTS, ...opts };
  prep(o, "makeSlash");
  const lo = lowTier(engine), n = Math.max(2, lo ? Math.ceil(o.points / 2) : o.points);
  let strokes = strokesOf(o.list, o.space === "screen", lo);
  const cap = Math.max(1, strokes.length, o.max), R = ribbons(engine, cap, n), P = new Float32Array(cap * M * 3), meta = new Float32Array(cap * 3), on = new Uint8Array(cap);
  let count = 0, maxDelay = 0, last = NaN, dirty = true, next = null;
  const load = () => {
    count = strokes.length; maxDelay = 0;
    strokes.forEach((s, r) => { densify(s.pts, P, r * M * 3); meta[r * 3] = s.delay; meta[r * 3 + 1] = s.w; meta[r * 3 + 2] = s.gain; maxDelay = Math.max(maxDelay, s.delay); });
    R.clear(); on.fill(0); dirty = true;
  };
  load();
  look(R, o);
  const h = handle(R, o, "makeSlash", (ts) => {
    if (ts === last && !dirty) { R.frame(o, ts, false); return; }
    last = ts; dirty = false;
    const lead = o.draw, base = ageOf(o, ts, maxDelay + lifeOf(o, lead)), comet = o.profile === "comet", even = o.profile === "even";
    let any = false;
    for (let r = 0; r < cap; r++) {
      const age = r < count ? base - meta[r * 3] : -Infinity, d = decay(o, age, lead), f = d * o.fade;
      if (f <= 0.004) { if (on[r]) { R.zero(r); on[r] = 0; } continue; }
      on[r] = 1; any = true;
      const head = o.ease(prog(lead, age)), back = o.retract ? (1 - d) ** 2 : 0;
      let tail = comet ? Math.max(0, head - o.tail) : 0;
      tail += (head - tail) * back;
      const wk = meta[r * 3 + 1] * (1 - o.thin * (1 - d)), ak = f * meta[r * 3 + 2], sd = hash(o.seed, r) * 50, off = r * M * 3;
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1), s = tail + (head - tail) * u, g = s * (M - 1), i0 = Math.min(M - 2, Math.floor(g)), t = g - i0, q = off + i0 * 3;
        const w = comet ? (o.headW + (1 - o.headW) * (1 - u)) * tp(1 - u, 0.04) : even ? tp(u, o.taper[0]) * tp(1 - u, o.taper[1]) : Math.sin(Math.PI * u) ** o.power;
        R.put(r, i, P[q] + (P[q + 3] - P[q]) * t, P[q + 1] + (P[q + 4] - P[q + 1]) * t, P[q + 2] + (P[q + 5] - P[q + 2]) * t, w * wk, comet ? ak * u ** 1.5 : ak, s, sd);
      }
      R.tangents(r);
    }
    R.u.uOn.value = any ? 1 : 0;
    R.frame(o, ts);
  }, (patch) => {
    next = null;
    if (!patch.list && !("space" in patch)) return;
    const nx = strokesOf(patch.list ?? o.list, (patch.space ?? o.space) === "screen", lo);
    if (nx.length > cap) throw new Error(`makeSlash: ${nx.length} strokes exceed the capacity ${cap}; pass max`);
    next = nx;
  }, () => { if (next) { strokes = next; next = null; load(); } dirty = true; });
  return h;
}

// gallery: beams (railgun, weigh line, kunai streak) | bolt | slashes (two-finger cut + cleave lattice, comet arc); loops every 4 s
export function demo(engine) {
  const group = new Group(), wFrom = [0, 0, 0], wTo = [0, 0, 0];
  const fx = [
    makeBeam(engine, { from: [-0.95, 0.2, 0], to: [-0.42, 1.5, 0], width: 0.08, at: 0.3, grow: 4 / 24, hold: 1.5, tau: 0.35, boil: 0.08 }),
    makeBeam(engine, { from: wFrom, to: wTo, units: "px", width: [1, 2.6, 14], core: "#e6f3f8", body: "#9ab2b4", glow: "#a8b4d9", emit: 1, grow: 0.3, taper: [0, 0], boil: 0, thin: 0 }),
    makeBeam(engine, { from: [-0.98, 0.1, 0], to: [-0.35, 0.32, 0], width: [0.012, 0.03, 0], core: "#fdf8e0", body: "#ffd54a", at: 2.6, grow: 0, hold: 1 / 24, tau: 0.08, taper: [0.1, 0.02], boil: 0 }),
    makeBolt(engine, { from: [0, 1.95, 0], to: [0.05, 0.05, 0], width: [0.012, 0.03, 0.1], at: 0.2, grow: 2 / 24, hold: 2.4, tau: 0.3, branchLen: 0.22 }),
    makeSlash(engine, { hard: true, width: 0.035, core: "#f2e6e0", body: "#f2e6e0", at: 0.4, list: [
      { points: [[0.4, 0.3, 0], [0.98, 0.85, 0]] }, { points: [[0.36, 0.42, 0], [0.94, 0.97, 0]], delay: 1 / 24 },
      { lattice: { center: [0.67, 0.65, 0], size: [0.6, 0.6], spacing: 0.09 }, delay: 1.3, width: 0.5 }] }),
    makeSlash(engine, { profile: "comet", width: 0.06, core: "#c0fefb", body: "#67eefc", glow: "#2e71cc", at: 0.2, draw: 1.6, hold: 0.6, tau: 0.5, retract: false,
      list: [{ arc: { center: [0.67, 0.9, 0], radius: 0.8, start: 1.95, sweep: -0.75 } }] }),
  ];
  fx.forEach((e) => group.add(e.group));
  return {
    group,
    update(ts) {
      const lt = ((ts % 4) + 4) % 4, tau = Math.max(0, lt - 0.2), th = 0.34 * Math.exp(-1.6 * tau) * Math.cos(2 * Math.PI * 1.1 * tau);
      wFrom[0] = -0.675 - 0.27 * Math.cos(th); wFrom[1] = 1.8 - 0.27 * Math.sin(th);
      wTo[0] = -0.675 + 0.27 * Math.cos(th); wTo[1] = 1.8 + 0.27 * Math.sin(th);
      for (let i = 0; i < fx.length; i++) fx[i].update(lt);
    },
    dispose() { fx.forEach((e) => e.dispose()); },
  };
}
