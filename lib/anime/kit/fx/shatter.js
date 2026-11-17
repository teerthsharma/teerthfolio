// SHATTER: a plane cut into Voronoi cells, every cell a rigid piece, all in one draw. k 0 intact -> k = crack the
// hairlines have run out from `origin` (cracked, nothing moved) -> k 1 every piece has fallen and holds there; mend 0..1
// runs the same paths backwards with easeOutCubic (nearest pieces first) and the seams heal. Pure in (k, mend, ts, opts).
//   makeShatter(engine, opts) -> { group, update(ts, cue), set(patch), dispose(), pieces }
//   Plane: size [w, h] (world m, the group's local xy, front +z; screen: true glues it to the frame in reference px at
//     800 px frame height, centred at `at` (uv), depth written at `dist` m; omit size there for the full frame).
//   Cells: cells (halved at tier <= 1), seed, focus (0 even, 1 small shards packed round origin). Look: colour (hex or up
//     to 4 hexes picked per cell), jitter (per-cell value once loose), split { at: uv, angle: deg, colour } (the side the
//     line's left normal faces), paint (GLSL `vec3 paint(vec2 p)`, p in plane height units like a plate) with tools and
//     uniforms, or map (texture). hairline px + hairColour + hairEmit (> 1 blooms); shade for faces turned away and backs.
//   Motion (units of size): fall along `down` (local), vary, spread (outward from origin), push (+z), rot (max deg),
//     gravity (0 eased slide, 1 ballistic), stagger (delay by distance from origin; < 0 far first), thick (slabs), glint
//     (share of moving pieces flashing per drawing), mendGlow (seam emit as a piece seats). fall/spread/push null = 0.6 / 0.08 / 0.1 h.
//   Time: k and mend are stepped on a 1 / (dur fps) grid (fps 6 = fours, 0 = as given); beat / mendBeat read the cue
//     instead of set() and latch (held broken after the beat window).
//   Output: opacity 1 is a solid thing (depth, alpha 0.6); opacity < 1 is a premultiplied see-through overlay (no depth).
// Creation-only: size, screen, cells, seed, focus, origin, stagger, vary, thick, paint, tools, solid vs see-through, and
// whether split / map exist. Everything else is live through set().
import { BufferAttribute, BufferGeometry, Color, DoubleSide, Group, Mesh, ShaderMaterial, Vector2, Vector3, Vector4 } from "three";
import { glslFor } from "../../tools/index.js";

export const DEFAULTS = {
  size: [2, 2], screen: false, at: [0.5, 0.5], dist: 1,
  cells: 36, seed: 1, focus: 0, origin: [0.5, 0.5],
  colour: "#8fa6c8", jitter: 0.08, split: null, paint: null, tools: ["noise"], uniforms: null, map: null,
  hairline: 1, hairColour: "#e8f2ff", hairEmit: 1, shade: 0.7,
  crack: 0.25, fall: null, vary: 0.5, spread: null, push: null, rot: 25, gravity: 1, down: [0, -1, 0], stagger: 0.5,
  thick: 0, glint: 0, glintColour: "#ffffff", glintEmit: 1.6, mendGlow: 0, opacity: 1,
  fps: 12, dur: 1, mendDur: 1, beat: null, mendBeat: null, k: 0, mend: 0,
};

const VERT = /* glsl */ `
  attribute vec4 aPiece; attribute vec4 aMove; attribute vec4 aSpin; attribute vec3 aEdge;
  uniform float uKf; uniform float uMend; uniform float uSpan; uniform float uFall; uniform float uSpread; uniform float uPush;
  uniform float uRot; uniform float uGrav; uniform vec3 uDown; uniform float uJitter; uniform float uShade;
  uniform float uStep; uniform float uGlint; uniform float uMendGlow; uniform vec2 uSize;
  uniform vec3 uCol0; uniform vec3 uCol1; uniform vec3 uCol2; uniform vec3 uCol3; uniform float uNCol;
  #ifdef SCREEN
  uniform vec2 uRes; uniform vec2 uAt; uniform float uDist; uniform float uFillX;
  #endif
  varying vec2 vP; varying vec3 vCol; varying float vTone; varying vec3 vE; varying vec3 vFx;
  float shHash(float x) { return fract(sin(x * 12.9898 + 78.233) * 43758.5453); }
  vec3 shSpin(vec3 v, vec3 a, float t) { float c = cos(t), s = sin(t); return v * c + cross(a, v) * s + a * dot(a, v) * (1.0 - c); }
  void main() {
    float u = clamp((uKf - aPiece.z) * uSpan, 0.0, 1.0);
    float tm = (uMend - aPiece.z) * uSpan * 1.2;
    float r = 1.0 - clamp(tm, 0.0, 1.0);
    float s = u * r * r * r;
    float sm = s * s * (3.0 - 2.0 * s);
    float th = uRot * aSpin.w * s;
    vec3 C = vec3(aPiece.xy, 0.0);
    vec3 p = C + shSpin(position - C, aSpin.xyz, th) + uDown * (uFall * aMove.x * mix(sm, s * s, uGrav))
      + vec3(aMove.zw * uSpread, uPush * aMove.y) * mix(sm, s, uGrav);
    // two-tone facet: a piece turned away from a fixed upper-left key steps down, one turned toward it steps up
    float b = dot(shSpin(vec3(0.0, 0.0, 1.0), aSpin.xyz, th), vec3(-0.41, 0.58, 0.7)) - 0.7;
    float h = aPiece.w;
    vTone = (b < -0.12 ? uShade : (b > 0.12 ? 1.12 : 1.0)) * (1.0 + uJitter * (2.0 * fract(h * 7.31) - 1.0) * smoothstep(0.0, 0.15, s));
    float ci = floor(fract(h * 3.17) * uNCol);
    vCol = ci < 0.5 ? uCol0 : (ci < 1.5 ? uCol1 : (ci < 2.5 ? uCol2 : uCol3));
    vE = aEdge;
    vP = (position.xy / uSize + 0.5) * vec2(uSize.x / uSize.y, 1.0);
    float d = (tm - 1.0) / 0.08;
    vFx = vec3(smoothstep(1.0, 1.15, tm), uMendGlow * exp(-d * d),
      step(1.0 - uGlint, shHash(h * 91.7 + mod(uStep, 97.0) * 1.618)) * step(0.001, s) * step(s, 0.999));
    #ifdef SCREEN
    vec4 cz = projectionMatrix * vec4(0.0, 0.0, -uDist, 1.0);
    gl_Position = vec4(p.x * uFillX / (400.0 * uRes.x / uRes.y) + uAt.x * 2.0 - 1.0, p.y / 400.0 + uAt.y * 2.0 - 1.0, cz.z / cz.w, 1.0);
    #else
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    #endif
  }`;

const frag = (o) => /* glsl */ `
  uniform vec3 uHair; uniform float uHairPx; uniform float uHairGain; uniform vec3 uCrack; uniform float uShade;
  uniform vec3 uGlintCol; uniform float uOpacity; uniform vec2 uRes; uniform float uTime; uniform vec2 uSize;
  #ifdef SPLIT
  uniform vec4 uSplit; uniform vec3 uSplitCol;
  #endif
  #ifdef MAP
  uniform sampler2D uMap;
  #endif
  varying vec2 vP; varying vec3 vCol; varying float vTone; varying vec3 vE; varying vec3 vFx;
  ${o.paint ? `${glslFor(o.tools ?? [])}\n${o.paint}` : ""}
  void main() {
    #if defined(PAINT)
    vec3 base = paint(vP);
    #elif defined(MAP)
    vec3 base = texture2D(uMap, vec2(vP.x * uSize.y / uSize.x, vP.y)).rgb;
    #else
    vec3 base = vCol;
    #endif
    #ifdef SPLIT
    if (dot(vP - uSplit.xy, uSplit.zw) > 0.0) base = uSplitCol;
    #endif
    const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
    float tone = vE.z > 1.5 ? uShade * 0.85 : ((vE.z > 0.5 || !gl_FrontFacing) ? uShade : vTone);
    vec3 col = base * tone;
    float y = dot(col, LUMA), cap = max(0.92, dot(base, LUMA));
    if (y > cap) col *= cap / y;
    col = mix(col, uGlintCol, vFx.z * 0.6);
    // hairline: vE.x is 1 at the cell centre and 0 on its rim, so rim distance in px is vE.x / |grad vE.x|; half per side
    float e = vE.x / max(length(vec2(dFdx(vE.x), dFdy(vE.x))), 1e-6);
    float hw = 0.5 * uHairPx * uRes.y / 800.0;
    float line = (1.0 - smoothstep(hw - 0.5, hw + 0.5, e)) * step(0.001, uHairPx) * vE.y
      * step(length(vP - uCrack.xy), uCrack.z) * (1.0 - vFx.x);
    col = max(mix(col, uHair * (uHairGain + vFx.y), line), vec3(0.008));
    #ifdef SOLID
    gl_FragColor = vec4(col, 0.6);
    #else
    float a = mix(uOpacity, 1.0, line);
    gl_FragColor = vec4(col * a, a);
    #endif
  }`;

function mulberry(seed) {
  let a = (seed * 2654435761) >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const cap = (c, m = 0.92) => { const y = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b; if (y > m) c.multiplyScalar(m / y); return c; };
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const reach2 = (poly, x, y) => { let r = 0; for (const v of poly) r = Math.max(r, (v[0] - x) ** 2 + (v[1] - y) ** 2); return r; };

// Sutherland-Hodgman against n.p <= c; v[2] flags the edge leaving v: 1 a crack between cells, 0 the plane border
function clip(poly, nx, ny, c) {
  const out = [];
  for (let k = 0; k < poly.length; k++) {
    const a = poly[k], b = poly[(k + 1) % poly.length];
    const da = nx * a[0] + ny * a[1] - c, db = nx * b[0] + ny * b[1] - c;
    if (da <= 0) out.push(a);
    if ((da <= 0) !== (db <= 0)) { const t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, da <= 0 ? 1 : a[2]]); }
  }
  return out;
}

function voronoi(pts, W, H) {
  return pts.map(([ax, ay]) => {
    let poly = [[-W / 2, -H / 2, 0], [W / 2, -H / 2, 0], [W / 2, H / 2, 0], [-W / 2, H / 2, 0]], r2 = reach2(poly, ax, ay);
    for (const [bx, by] of pts) {
      const nx = bx - ax, ny = by - ay, l2 = nx * nx + ny * ny;
      if (l2 === 0 || l2 > 4 * r2 || poly.length < 3) continue;
      poly = clip(poly, nx, ny, nx * (ax + nx / 2) + ny * (ay + ny / 2));
      r2 = reach2(poly, ax, ay);
    }
    return poly;
  });
}

function centroid(poly) {
  let a = 0, x = 0, y = 0;
  for (let k = 0; k < poly.length; k++) {
    const p = poly[k], q = poly[(k + 1) % poly.length], c = p[0] * q[1] - q[0] * p[1];
    a += c; x += (p[0] + q[0]) * c; y += (p[1] + q[1]) * c;
  }
  return Math.abs(a) < 1e-12 ? null : [x / (3 * a), y / (3 * a)];
}

function buildGeometry(o, n, W, H, rnd) {
  const cols = Math.max(1, Math.round(Math.sqrt((n * W) / H))), rows = Math.max(1, Math.ceil(n / cols)), pts = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) pts.push([((c + 0.1 + 0.8 * rnd()) / cols - 0.5) * W, ((r + 0.1 + 0.8 * rnd()) / rows - 0.5) * H]);
  for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]]; }
  pts.length = n;
  const ox = (o.origin[0] - 0.5) * W, oy = (o.origin[1] - 0.5) * H, reach = Math.hypot(W / 2 + Math.abs(ox), H / 2 + Math.abs(oy));
  if (o.focus > 0) for (const p of pts) { const dx = p[0] - ox, dy = p[1] - oy, f = (Math.hypot(dx, dy) / reach) ** (o.focus * 1.2); p[0] = ox + dx * f; p[1] = oy + dy * f; }
  const polys = [];
  for (const p of voronoi(pts, W, H)) { const c = p.length >= 3 && centroid(p); if (c) polys.push({ p, c, d: Math.hypot(c[0] - ox, c[1] - oy) }); }
  const dmax = Math.max(1e-6, ...polys.map((P) => P.d)), S = Math.max(-0.95, Math.min(0.95, o.stagger)), As = Math.abs(S);
  const T = Math.max(0, o.thick), per = T > 0 ? 12 : 3, eps = 1e-4 * H;
  const nv = polys.reduce((s, P) => s + P.p.length * per, 0);
  const pos = new Float32Array(nv * 3), aPiece = new Float32Array(nv * 4), aMove = new Float32Array(nv * 4), aSpin = new Float32Array(nv * 4), aEdge = new Float32Array(nv * 3);
  let v = 0, pc, mv, sp;
  const put = (x, y, z, b, f, kind) => {
    pos[v * 3] = x; pos[v * 3 + 1] = y; pos[v * 3 + 2] = z;
    aEdge[v * 3] = b; aEdge[v * 3 + 1] = f; aEdge[v * 3 + 2] = kind;
    aPiece.set(pc, v * 4); aMove.set(mv, v * 4); aSpin.set(sp, v * 4); v++;
  };
  for (const P of polys) {
    const [cx, cy] = P.c, dn = P.d / dmax;
    pc = [cx, cy, As * (0.85 * (S >= 0 ? dn : 1 - dn) + 0.15 * rnd()), rnd()];
    let dx = cx - ox, dy = cy - oy;
    if (P.d > 1e-9) { dx /= P.d; dy /= P.d; } else { const a = rnd() * 6.2832; dx = Math.cos(a); dy = Math.sin(a); }
    const sm = 0.6 + 0.4 * rnd();
    mv = [1 + o.vary * (2 * rnd() - 1), 0.4 + 0.6 * rnd(), dx * sm + (rnd() - 0.5) * 0.8, dy * sm + (rnd() - 0.5) * 0.8];
    const ph = rnd() * 6.2832, az = 0.7 * rnd(), al = Math.hypot(1, az);
    sp = [Math.cos(ph) / al, Math.sin(ph) / al, az / al, (0.35 + 0.65 * rnd()) * (rnd() < 0.5 ? -1 : 1)];
    // grow each cell a hair past its rim so shared edges computed twice never open a pinhole
    const q = P.p.map(([x, y, f]) => { const l = Math.hypot(x - cx, y - cy) || 1; return [x + ((x - cx) / l) * eps, y + ((y - cy) / l) * eps, f]; });
    const z = T / 2;
    for (let k = 0; k < q.length; k++) {
      const a = q[k], b = q[(k + 1) % q.length], f = a[2];
      put(cx, cy, z, 1, f, 0); put(a[0], a[1], z, 0, f, 0); put(b[0], b[1], z, 0, f, 0);
      if (T === 0) continue;
      put(cx, cy, -z, 1, f, 1); put(b[0], b[1], -z, 0, f, 1); put(a[0], a[1], -z, 0, f, 1);
      put(a[0], a[1], -z, 1, 0, 2); put(b[0], b[1], -z, 1, 0, 2); put(b[0], b[1], z, 1, 0, 2);
      put(a[0], a[1], -z, 1, 0, 2); put(b[0], b[1], z, 1, 0, 2); put(a[0], a[1], z, 1, 0, 2);
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(pos, 3));
  geo.setAttribute("aPiece", new BufferAttribute(aPiece, 4));
  geo.setAttribute("aMove", new BufferAttribute(aMove, 4));
  geo.setAttribute("aSpin", new BufferAttribute(aSpin, 4));
  geo.setAttribute("aEdge", new BufferAttribute(aEdge, 3));
  return { geo, pieces: polys.length, span: 1 / (1 - As) };
}

export function makeShatter(engine, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const uRes = engine?.shared?.uRes ?? { value: new Vector2(1280, 800) };
  const screen = !!o.screen, fill = screen && !opts.size, a0 = uRes.value.x / Math.max(1, uRes.value.y);
  const [W, H] = fill ? [800 * a0, 800] : (o.size ?? DEFAULTS.size);
  const n0 = Math.max(1, Math.round(o.cells)), n = (engine?.tier ?? 2) <= 1 ? Math.max(Math.min(n0, 5), Math.round(n0 / 2)) : n0;
  const { geo, pieces, span } = buildGeometry(o, n, W, H, mulberry(o.seed));
  const solid = o.opacity >= 1;
  const oh = [o.origin[0] * (W / H), o.origin[1]];
  const front = 1.02 * Math.max(...[[0, 0], [W / H, 0], [0, 1], [W / H, 1]].map(([x, y]) => Math.hypot(x - oh[0], y - oh[1])));
  const U = {
    uKf: { value: 0 }, uMend: { value: 0 }, uSpan: { value: span }, uFall: { value: 0 }, uSpread: { value: 0 }, uPush: { value: 0 },
    uRot: { value: 0 }, uGrav: { value: 1 }, uDown: { value: new Vector3() }, uJitter: { value: 0 }, uShade: { value: 0.7 },
    uStep: { value: 0 }, uGlint: { value: 0 }, uMendGlow: { value: 0 }, uSize: { value: new Vector2(W, H) },
    uCol0: { value: new Color() }, uCol1: { value: new Color() }, uCol2: { value: new Color() }, uCol3: { value: new Color() }, uNCol: { value: 1 },
    uHair: { value: new Color() }, uHairPx: { value: 1 }, uHairGain: { value: 1 }, uCrack: { value: new Vector3(oh[0], oh[1], -1) },
    uGlintCol: { value: new Color() }, uOpacity: { value: 1 }, uRes, uTime: { value: 0 },
    uAt: { value: new Vector2() }, uDist: { value: 1 }, uFillX: { value: 1 },
    uSplit: { value: new Vector4() }, uSplitCol: { value: new Color() }, uMap: { value: null },
    ...(o.uniforms ?? {}),
  };
  const cU = [U.uCol0, U.uCol1, U.uCol2, U.uCol3];
  const defines = {};
  if (screen) defines.SCREEN = "";
  if (solid) defines.SOLID = "";
  if (o.paint) defines.PAINT = ""; else if (o.map) defines.MAP = "";
  if (o.split) defines.SPLIT = "";
  const mat = new ShaderMaterial({
    defines, uniforms: U, vertexShader: VERT, fragmentShader: frag(o),
    side: DoubleSide, transparent: !solid, depthWrite: solid, premultipliedAlpha: !solid,
  });
  const mesh = new Mesh(geo, mat);
  mesh.frustumCulled = false; mesh.renderOrder = solid ? 0 : 3;
  mesh.userData.noShadow = true; // the shadow pass draws rest positions, so the pieces would cast the intact plane
  const group = new Group();
  group.add(mesh);

  const apply = () => {
    const cols = [].concat(o.colour);
    cU.forEach((u, i) => cap(u.value.set(cols[Math.min(i, cols.length - 1)])));
    U.uNCol.value = Math.min(4, cols.length);
    U.uJitter.value = o.jitter; U.uShade.value = o.shade;
    U.uFall.value = o.fall ?? 0.6 * H; U.uSpread.value = o.spread ?? 0.08 * H; U.uPush.value = screen ? 0 : (o.push ?? 0.1 * H);
    U.uRot.value = (o.rot * Math.PI) / 180; U.uGrav.value = clamp01(o.gravity);
    U.uDown.value.fromArray(o.down).normalize();
    cap(U.uHair.value.set(o.hairColour)); U.uHairPx.value = o.hairline; U.uHairGain.value = o.hairEmit;
    cap(U.uGlintCol.value.set(o.glintColour)).multiplyScalar(o.glintEmit); U.uGlint.value = clamp01(o.glint);
    U.uMendGlow.value = o.mendGlow; U.uOpacity.value = clamp01(o.opacity);
    U.uAt.value.fromArray(o.at); U.uDist.value = o.dist;
    if (o.split) {
      const a = ((o.split.angle ?? 0) * Math.PI) / 180, at = o.split.at ?? [0.5, 0.5];
      U.uSplit.value.set(at[0] * (W / H), at[1], -Math.sin(a), Math.cos(a));
      cap(U.uSplitCol.value.set(o.split.colour ?? o.hairColour));
    }
    U.uMap.value = o.map;
  };
  // k on a 1 / (dur fps) grid from its own start, so a beat drawn on twos or fours lands on its drawings
  const quant = (x, dur, f) => (x <= 0 ? 0 : x >= 1 ? 1 : f > 0 ? Math.floor(x * dur * f + 1e-6) / (dur * f) : x);
  const since = (cue, name, dur) => { const s = cue.since(name); return s === Infinity ? 0 : s / Math.max(1e-3, dur); };

  const handle = {
    group, pieces,
    update(ts, cue) {
      const f = Math.max(0, o.fps), dur = Math.max(1e-3, o.dur), mdur = Math.max(1e-3, o.mendDur);
      const k = quant(o.beat && cue ? since(cue, o.beat, dur) : o.k, dur, f);
      const m = quant(o.mendBeat && cue ? since(cue, o.mendBeat, mdur) : o.mend, mdur, f);
      const cr = clamp01(o.crack), kc = cr > 0 ? Math.min(1, k / cr) : k > 0 ? 1 : 0;
      U.uKf.value = cr < 1 ? clamp01((k - cr) / (1 - cr)) : 0;
      U.uMend.value = m;
      U.uCrack.value.z = kc > 0 ? kc * front : -1;
      U.uStep.value = Math.floor(ts * (f || 24) + 1e-6);
      U.uTime.value = ts;
      if (fill) U.uFillX.value = uRes.value.x / Math.max(1, uRes.value.y) / a0;
    },
    set(patch) {
      let full = false;
      for (const key in patch) { o[key] = patch[key]; if (key !== "k" && key !== "mend") full = true; }
      if (full) apply();
    },
    dispose() { geo.dispose(); mat.dispose(); },
  };
  apply();
  handle.update(0);
  return handle;
}

// gallery: a mirror picture (36 shards, cracks then fall, glints), a wall (14 slabs on fours), a road (220 shards, hold, mend)
export function demo(engine) {
  const group = new Group();
  const mirror = makeShatter(engine, {
    size: [0.6, 0.85], cells: 36, seed: 3, focus: 0.6, origin: [0.42, 0.62], colour: "#e7e2e1", split: { at: [0.5, 0.45], angle: 8, colour: "#4f7fbf" },
    hairColour: "#d8ecff", hairEmit: 1.5, crack: 0.3, fall: 0.7, vary: 0.3, rot: 40, glint: 0.12, stagger: 0.6, jitter: 0.1, dur: 1.8,
  });
  const wall = makeShatter(engine, {
    size: [0.6, 0.5], cells: 14, seed: 7, thick: 0.08, colour: ["#8c7a66", "#7a6a58", "#9a8873"], jitter: 0.12, hairline: 1.5, hairColour: "#2a1e16",
    crack: 0.15, fall: 0.9, vary: 0.4, rot: 25, origin: [0.5, 0], stagger: 0.7, fps: 6, dur: 1.4,
  });
  const road = makeShatter(engine, {
    size: [0.6, 0.6], cells: 220, seed: 11, paint: "vec3 paint(vec2 p) { return mix(vec3(0.05, 0.055, 0.08), vec3(0.17, 0.18, 0.24), vn(p * 14.0)); }",
    hairColour: "#ff4a5a", mendGlow: 3, crack: 0, fall: 0.2, spread: 0.05, push: 0.12, rot: 60, gravity: 0.3, stagger: 0.6, dur: 0.25, mendDur: 1.4,
  });
  mirror.group.position.set(-0.62, 1.5, 0); wall.group.position.set(0, 1.55, 0); road.group.position.set(0.62, 1.2, 0);
  group.add(mirror.group, wall.group, road.group);
  const pm = { k: 0 }, pw = { k: 0 }, pr = { k: 0, mend: 0 }, all = [mirror, wall, road];
  return {
    group,
    update(ts) {
      const t = ((ts % 4) + 4) % 4;
      pm.k = (t - 0.3) / 1.8; mirror.set(pm);
      pw.k = (t - 0.4) / 1.4; wall.set(pw);
      pr.k = (t - 0.3) / 0.25; pr.mend = (t - 1.9) / 1.4; road.set(pr);
      for (const f of all) f.update(t);
    },
    dispose() { for (const f of all) f.dispose(); },
  };
}
