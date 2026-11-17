// echo: afterimage ghosts and smear cards, the two ways a drawn frame shows speed. Both are see-through overlays (no
// depth write, premultiplied): blend "under" draws beneath what the layer holds, so a ghost never covers a character
// (exact on the plates path, where the cel target starts empty), "normal" is vec4(rgb a, a), "add" vec4(rgb a, 0).
//   makeEchoes(engine, { source, at })  re-draws the source's opaque meshes with one flat ghost material where they were
//     i * gap steps (of fps; null = the style's) ago. at(t, out: Matrix4) returns the source's local matrix or a position
//     and is scrub-safe; without it each step is recorded, so only forward play has ghosts. Alpha 1 - i / (count + 1)
//     (0.75 / 0.5 / 0.25) or `alphas` (newest first); stretched along the trail about the figure's centre; hidden within
//     minMove m of the source. One instanced draw per source mesh; set({ k }) is the 0..1 master.
//   makeSmear(engine, { from, to, bend } | { centre, radius, start, sweep }, normal)  camera-facing arc cards in group
//     space (bend: signed share of the chord, |bend| <= 0.49): a hard convex head at `to` / start + sweep (lead: cap
//     length in half-widths), the rear `tail` share cut into `streaks`, colour -> mix toward the tail, ink edge inkPx at
//     800 px; width = head thickness (m). count > 1 is a flurry: seeded smears of `span` (path share; null = 1 alone,
//     0.22 in a flurry) scattered by `spread` m, each living `life` drawings at `fps`, reseeded per life (`alphas` by
//     drawing). Shown for ts in [t0, t0 + dur) (dur null = one life), or for 0 < k < 1 once set({ k }). One draw.
import {
  AdditiveBlending, BackSide, Box3, BufferAttribute, CapsuleGeometry, Color, CustomBlending, DoubleSide, DynamicDrawUsage,
  Group, InstancedBufferAttribute, InstancedBufferGeometry, InstancedMesh, Matrix4, Mesh, NormalBlending, OneFactor,
  OneMinusDstAlphaFactor, ShaderMaterial, SphereGeometry, Vector2, Vector3, Vector4,
} from "three";

export const ECHO_DEFAULTS = {
  source: null, at: null, count: 3, gap: 2, fps: null, alphas: null, alpha: 1, k: 1,
  tint: "#c9d4e8", emit: 0, stretch: 1.15, minMove: 0.02, blend: "under", filter: null, plateDepth: true,
};
export const SMEAR_DEFAULTS = {
  from: null, to: null, bend: 0.25, centre: [0, 1, 0], radius: 0.4, start: 0, sweep: 2, normal: [0, 0, 1],
  width: 0.08, taper: 0.15, lead: 0.8, tail: 0.55, streaks: 7,
  color: "#ffffff", mix: null, emit: 0, alpha: 1, alphas: null, ink: null, inkPx: 2,
  count: 1, span: null, stretch: 1, spread: 0, life: 2, fps: 24, t0: 0, dur: null, k: null, blend: "normal", seed: 1, plateDepth: true,
};
export const DEFAULTS = { makeEchoes: ECHO_DEFAULTS, makeSmear: SMEAR_DEFAULTS };

const frameIndex = (t, fps) => Math.floor(t * fps + 1e-6);
const tierN = (engine, n) => ((engine?.tier ?? 2) <= 1 ? Math.max(1, Math.ceil(n / 2)) : n);
const mix32 = (h) => { h = Math.imul(h ^ (h >>> 16), 0x7feb352d); h = Math.imul(h ^ (h >>> 15), 0x846ca68b); return h ^ (h >>> 16); };
const rnd = (a, b, c, d) => (mix32(mix32(mix32(mix32(a | 0) + (b | 0)) + (c | 0)) + (d | 0)) >>> 0) / 4294967296;
const AX = new Vector3(1, 0, 0), AY = new Vector3(0, 1, 0);

// linear colour from hex, lit luma capped at 0.92, then the emit gain on top (the only way past 1)
function lit(c, hex, emit = 0) {
  c.set(hex);
  const y = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  if (y > 0.92) c.multiplyScalar(0.92 / y);
  return c.multiplyScalar(1 + Math.max(0, emit));
}
function blendAs(mat, mode) {
  mat.blending = mode === "add" ? AdditiveBlending : mode === "under" ? CustomBlending : NormalBlending;
  mat.blendSrc = OneMinusDstAlphaFactor; mat.blendDst = OneFactor;
  mat.uniforms.uAOut.value = mode === "add" ? 0 : 1;
}
const overlay = (o) => new ShaderMaterial({ transparent: true, depthWrite: false, premultipliedAlpha: true, ...o });

const ECHO_V = /* glsl */ `
  varying float vA;
  void main() {
    vA = 1.0;
    mat4 m = modelViewMatrix;
  #ifdef USE_INSTANCING
    m = m * instanceMatrix;
  #endif
  #ifdef USE_INSTANCING_COLOR
    vA = instanceColor.r;
  #endif
    gl_Position = projectionMatrix * m * vec4(position, 1.0);
  }`;
const ECHO_F = /* glsl */ `
  uniform vec3 uCol; uniform float uAOut; varying float vA;
  void main() { gl_FragColor = vec4(uCol * vA, vA * uAOut); }`;

function solidMesh(m) {
  const mt = Array.isArray(m.material) ? m.material[0] : m.material;
  return !!(m.isMesh && !m.isInstancedMesh && !m.isSkinnedMesh && m.geometry?.attributes?.normal && mt && mt.side !== BackSide && !mt.transparent);
}
// scale by k along unit d about c: I + (k - 1) d d^T, translated so c stays put
function stretchAbout(m, c, d, k) {
  const s = k - 1, x = d.x, y = d.y, z = d.z;
  m.set(1 + s * x * x, s * x * y, s * x * z, 0, s * x * y, 1 + s * y * y, s * y * z, 0, s * x * z, s * y * z, 1 + s * z * z, 0, 0, 0, 0, 1);
  const e = m.elements;
  e[12] = c.x - (e[0] * c.x + e[4] * c.y + e[8] * c.z);
  e[13] = c.y - (e[1] * c.x + e[5] * c.y + e[9] * c.z);
  e[14] = c.z - (e[2] * c.x + e[6] * c.y + e[10] * c.z);
  return m;
}

export function makeEchoes(engine, opts = {}) {
  const o = { ...ECHO_DEFAULTS, ...opts }, src = o.source;
  if (!src?.isObject3D) throw new Error("makeEchoes: opts.source must be an Object3D");
  const group = new Group();
  group.name = "echoes"; group.userData.plateDepth = o.plateDepth; // the set hides it (post.js); plateDepth: false keeps it drawn over the whole plate
  const mat = overlay({ uniforms: { uCol: { value: new Color() }, uAOut: { value: 1 } }, vertexShader: ECHO_V, fragmentShader: ECHO_F });
  const cap = Math.max(1, o.count | 0), keep = o.filter ?? solidMesh, meshes = [];
  src.updateWorldMatrix(true, true);
  src.traverse((m) => { if (keep(m)) meshes.push(m); });
  const box = new Box3();
  for (const m of meshes) box.expandByObject(m);
  const pivot = box.isEmpty() ? new Vector3() : box.getCenter(new Vector3()).applyMatrix4(new Matrix4().copy(src.matrixWorld).invert());
  const inst = meshes.map((m) => {
    const im = new InstancedMesh(m.geometry, mat, cap);
    im.instanceMatrix.setUsage(DynamicDrawUsage);
    im.instanceColor = new InstancedBufferAttribute(new Float32Array(cap * 3), 3).setUsage(DynamicDrawUsage);
    im.count = 0; im.frustumCulled = false; // drawn at count 0 too, so the program links at build
    group.add(im);
    return im;
  });
  // the record, one slot per step: the source's world matrix, then each mesh relative to it
  const M = meshes.length, stride = (M + 1) * 16, slots = cap * Math.max(4, o.gap | 0) + 1;
  const rec = new Float32Array(slots * stride), recStep = new Float64Array(slots).fill(NaN);
  const slot = (s) => ((s % slots) + slots) % slots;
  const rel = meshes.map(() => new Matrix4());
  const R = new Matrix4(), G = new Matrix4(), S = new Matrix4(), T = new Matrix4(), inv = new Matrix4(), loc = new Matrix4();
  const now = new Vector3(), p = new Vector3(), c = new Vector3(), d = new Vector3();
  const shown = (m) => { for (let x = m; x && x !== src.parent; x = x.parent) if (!x.visible) return false; return true; };
  const poseAt = (t) => {
    const r = o.at(t, loc);
    if (r?.isMatrix4) { if (r !== loc) loc.copy(r); } else if (r) loc.compose(r.isVector3 ? p.copy(r) : p.fromArray(r), src.quaternion, src.scale);
    return src.parent ? R.multiplyMatrices(src.parent.matrixWorld, loc) : R.copy(loc);
  };
  const paint = () => { lit(mat.uniforms.uCol.value, o.tint, o.emit); blendAs(mat, o.blend); };
  paint();
  return {
    group,
    update(ts) {
      const fps = o.fps ?? engine?.style?.timing?.fps ?? 12, gap = Math.max(1, o.gap | 0), n = Math.min(cap, tierN(engine, o.count | 0));
      const step = frameIndex(ts, fps);
      src.updateWorldMatrix(true, true);
      group.updateWorldMatrix(true, false);
      inv.copy(group.matrixWorld).invert();
      T.copy(src.matrixWorld).invert();
      for (let j = 0; j < M; j++) rel[j].multiplyMatrices(T, meshes[j].matrixWorld);
      if (!o.at) {
        const b = slot(step) * stride;
        recStep[slot(step)] = step;
        src.matrixWorld.toArray(rec, b);
        for (let j = 0; j < M; j++) rel[j].toArray(rec, b + 16 * (j + 1));
      }
      now.setFromMatrixPosition(src.matrixWorld);
      let k = 0;
      for (let q = 0; q < n && o.k > 0; q++) {
        const i = o.blend === "under" ? q + 1 : n - q, s = step - i * gap; // under: newest first; normal / add: oldest first
        const a = Math.min(1, o.k * o.alpha * (o.alphas ? o.alphas[Math.min(i, o.alphas.length) - 1] : 1 - i / (n + 1)));
        if (!(a > 0)) continue;
        let b = -1;
        if (o.at) poseAt(s / fps);
        else { if (recStep[slot(s)] !== s) continue; b = slot(s) * stride; R.fromArray(rec, b); }
        d.subVectors(now, p.setFromMatrixPosition(R));
        const len = d.length();
        if (len < o.minMove) continue;
        c.copy(pivot).applyMatrix4(R);
        G.multiplyMatrices(stretchAbout(S, c, d.divideScalar(len), o.stretch), R).premultiply(inv);
        for (let j = 0; j < M; j++) {
          T.multiplyMatrices(G, b < 0 ? rel[j] : S.fromArray(rec, b + 16 * (j + 1)));
          T.toArray(inst[j].instanceMatrix.array, k * 16);
          inst[j].instanceColor.array[k * 3] = a;
        }
        k++;
      }
      for (let j = 0; j < M; j++) {
        const im = inst[j];
        im.count = shown(meshes[j]) ? k : 0;
        im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
      }
    },
    set(patch) { Object.assign(o, patch); paint(); },
    dispose() { for (const im of inst) { group.remove(im); im.dispose(); } mat.dispose(); },
  };
}

const SMEAR_V = /* glsl */ `
  attribute vec4 aC; attribute vec4 aE1; attribute vec4 aE2; attribute vec4 aArc;
  uniform float uTaper; uniform vec2 uRes;
  varying vec2 vUv; varying vec3 vS;
  vec3 arcAt(float u) {
    float th = aArc.x + aArc.y * u;
    return abs(aArc.y) < 1e-6 ? aC.xyz + aE1.xyz * u : aC.xyz + cos(th) * aE1.xyz + sin(th) * aE2.xyz;
  }
  void main() {
    float u = position.x;
    vec3 wp = (modelMatrix * vec4(arcAt(u), 1.0)).xyz;
    vec3 tg = (modelMatrix * vec4(arcAt(u + 0.02), 1.0)).xyz - wp;
    vec3 sd = cross(tg, cameraPosition - wp);
    sd = dot(sd, sd) > 1e-14 ? normalize(sd) : vec3(0.0, 1.0, 0.0);
    vec4 cp = projectionMatrix * viewMatrix * vec4(wp, 1.0);
    float px = 2.0 * max(cp.w, 1e-4) / (projectionMatrix[1][1] * uRes.y);
    wp += sd * position.y * max(aArc.z * mix(uTaper, 1.0, sqrt(u)), 0.75 * px);
    vUv = vec2(u, position.y);
    vS = vec3(aC.w, aArc.w, aE1.w);
    gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
  }`;
// head: a convex cut at u = 1 - cap (1 - sqrt(1 - v^2)); tail: per-streak ends, centre streaks reaching furthest back
const SMEAR_F = /* glsl */ `
  uniform vec3 uCol; uniform vec3 uMix; uniform vec4 uInk; uniform float uInkPx; uniform vec2 uRes;
  uniform float uTail; uniform float uStreaks; uniform float uAOut;
  varying vec2 vUv; varying vec3 vS;
  float sh1(float n) { return fract(sin(n * 91.3458 + 17.17) * 47453.5453); }
  void main() {
    float u = vUv.x, v = vUv.y, av = min(abs(v), 1.0);
    float fu = fwidth(u) + 1e-5, fv = fwidth(v) + 1e-5;
    float head = 1.0 - vS.z * (1.0 - sqrt(1.0 - av * av));
    float cov = 1.0 - smoothstep(head - fu, head, u);
    float x = (v * 0.5 + 0.5) * uStreaks, fx = fwidth(x) + 1e-5;
    float b = min(floor(x), uStreaks - 1.0);
    float e = uTail * mix(0.65 * sh1(b + vS.x * 61.0), 1.0, abs((b + 0.5) / uStreaks * 2.0 - 1.0));
    cov *= smoothstep(e, e + fu, u);
    float gap = 0.16 * (1.0 - smoothstep(0.0, uTail, u));
    float sv = fract(x);
    cov *= smoothstep(gap - fx, gap, min(sv, 1.0 - sv));
    vec3 c = mix(uMix, uCol, smoothstep(0.0, 1.0, u));
    float edge = min((1.0 - av) / fv, (head - u) / fu), ink = uInkPx * uRes.y / 800.0;
    c = mix(c, uInk.rgb, uInk.w * (1.0 - smoothstep(ink - 1.0, ink, edge)));
    float a = cov * vS.y;
    if (a < 0.004) discard;
    gl_FragColor = vec4(c * a, a * uAOut);
  }`;

const SEG = 24;
function stripGeometry() {
  const geo = new InstancedBufferGeometry(), pos = new Float32Array((SEG + 1) * 6), idx = [];
  for (let i = 0; i <= SEG; i++) {
    pos.set([i / SEG, -1, 0, i / SEG, 1, 0], i * 6);
    if (i < SEG) idx.push(2 * i, 2 * i + 2, 2 * i + 1, 2 * i + 1, 2 * i + 2, 2 * i + 3);
  }
  geo.setAttribute("position", new BufferAttribute(pos, 3));
  geo.setIndex(idx);
  return geo;
}

export function makeSmear(engine, opts = {}) {
  const o = { ...SMEAR_DEFAULTS, ...opts }, cap = Math.max(1, o.count | 0);
  const geo = stripGeometry();
  const attrs = ["aC", "aE1", "aE2", "aArc"].map((k) => {
    const at = new InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(DynamicDrawUsage);
    geo.setAttribute(k, at);
    return at;
  });
  const [aC, aE1, aE2, aArc] = attrs.map((x) => x.array);
  geo.instanceCount = 0;
  const u = {
    uCol: { value: new Color() }, uMix: { value: new Color() }, uInk: { value: new Vector4() }, uInkPx: { value: 2 }, uTail: { value: 0.55 },
    uStreaks: { value: 7 }, uTaper: { value: 0.15 }, uAOut: { value: 1 }, uRes: engine?.shared?.uRes ?? { value: new Vector2(1280, 800) },
  };
  const mat = overlay({ uniforms: u, vertexShader: SMEAR_V, fragmentShader: SMEAR_F, side: DoubleSide });
  const mesh = new Mesh(geo, mat);
  mesh.frustumCulled = false;
  const group = new Group();
  group.name = "smear"; group.userData.plateDepth = o.plateDepth;
  group.add(mesh);
  const C = new Vector3(), E1 = new Vector3(), E2 = new Vector3(), N = new Vector3(), Q = new Vector3(), Af = new Vector3(), Bf = new Vector3();
  const P = new Vector3(), off = new Vector3(), tc = new Color(), arc = { start: 0, sweep: 0, len: 0 };
  // the base path: C + E1 u (a line, sweep 0) or C + cos(th) E1 + sin(th) E2, th = start + sweep u (|E1| = |E2| = r)
  const path = () => {
    N.fromArray(o.normal).normalize();
    arc.start = 0; arc.sweep = 0;
    if (o.from && o.to) {
      Af.fromArray(o.from); Bf.fromArray(o.to); E1.subVectors(Bf, Af); C.copy(Af);
      const L = E1.length(), bend = Math.max(-0.49, Math.min(0.49, o.bend));
      arc.len = L;
      if (Math.abs(bend) < 1e-3 || L < 1e-6) return;
      Q.crossVectors(N, E1);
      if (Q.lengthSq() < 1e-12 * L * L) Q.crossVectors(Math.abs(E1.y) < 0.9 * L ? AY : AX, E1);
      Q.normalize().multiplyScalar(Math.sign(bend));
      const s = Math.abs(bend) * L, r = (L * L / 4 + s * s) / (2 * s);
      C.addVectors(Af, Bf).multiplyScalar(0.5).addScaledVector(Q, s - r);
      N.crossVectors(E1, Q).normalize();
      E1.subVectors(Af, C); E2.crossVectors(N, E1); Bf.sub(C);
      arc.sweep = Math.atan2(Bf.dot(E2), Bf.dot(E1)); arc.len = r * Math.abs(arc.sweep);
      return;
    }
    C.fromArray(o.centre);
    E1.copy(Math.abs(N.x) > 0.9 ? AY : AX).addScaledVector(N, -(Math.abs(N.x) > 0.9 ? N.y : N.x)).normalize();
    E2.crossVectors(N, E1).multiplyScalar(o.radius); E1.multiplyScalar(o.radius);
    arc.start = o.start; arc.sweep = Math.abs(o.sweep) < 1e-5 ? 1e-5 : o.sweep; arc.len = o.radius * Math.abs(arc.sweep);
  };
  const write = (j, ua, ub, hw, alpha, seed) => {
    const k = j * 4, span = ub - ua, line = arc.sweep === 0, sw = arc.sweep * span;
    P.copy(C).add(off);
    if (line) P.addScaledVector(E1, ua);
    const s1 = line ? span : 1;
    aC[k] = P.x; aC[k + 1] = P.y; aC[k + 2] = P.z; aC[k + 3] = seed;
    aE1[k] = E1.x * s1; aE1[k + 1] = E1.y * s1; aE1[k + 2] = E1.z * s1; aE1[k + 3] = Math.min(0.5, (o.lead * hw) / Math.max(arc.len * span, 1e-4));
    aE2[k] = line ? 0 : E2.x; aE2[k + 1] = line ? 0 : E2.y; aE2[k + 2] = line ? 0 : E2.z; aE2[k + 3] = 0;
    aArc[k] = line ? 0 : arc.start + arc.sweep * ua; aArc[k + 1] = line ? 0 : (sw < 0 ? -1 : 1) * Math.max(Math.abs(sw), 2e-6);
    aArc[k + 2] = hw; aArc[k + 3] = alpha;
  };
  const paint = () => {
    lit(u.uCol.value, o.color, o.emit); lit(u.uMix.value, o.mix ?? o.color, o.emit);
    if (o.ink) { lit(tc, o.ink); u.uInk.value.set(tc.r, tc.g, tc.b, 1); } else u.uInk.value.w = 0;
    u.uInkPx.value = o.inkPx; u.uTail.value = Math.max(0.01, o.tail); u.uStreaks.value = Math.max(1, Math.round(o.streaks)); u.uTaper.value = o.taper;
    blendAs(mat, o.blend);
  };
  paint();
  const hide = () => { geo.instanceCount = 0; };
  return {
    group,
    update(ts) {
      const life = Math.max(1, o.life | 0), fps = o.fps, D = o.dur ?? life / fps;
      let tau = ts - o.t0;
      if (o.k !== null && o.k !== undefined) { if (!(o.k > 0 && o.k < 1)) return hide(); tau = o.k * (Number.isFinite(D) ? D : life / fps); }
      else if (!(tau >= 0 && tau < D)) return hide();
      path();
      const a = frameIndex(tau, fps), many = (o.count | 0) > 1, n = Math.min(cap, tierN(engine, Math.max(1, o.count | 0)));
      const span = (o.span ?? (many ? 0.22 : 1)) * o.stretch, hw = o.width / 2;
      let j = 0;
      for (let i = 0; i < n; i++) {
        const t = a + (many ? Math.floor(rnd(o.seed, i, -1, 0) * life) : 0), age = t % life, g = Math.floor(t / life);
        const alpha = o.alpha * (o.alphas ? o.alphas[Math.min(age, o.alphas.length - 1)] : 1);
        if (!(alpha > 0)) continue;
        if (many) {
          const sp = Math.min(1, span * (0.8 + 0.4 * rnd(o.seed, i, g, 1))), ub = sp + (1 - sp) * rnd(o.seed, i, g, 2);
          off.set(rnd(o.seed, i, g, 3) * 2 - 1, rnd(o.seed, i, g, 4) * 2 - 1, rnd(o.seed, i, g, 5) * 2 - 1).multiplyScalar(o.spread);
          write(j++, ub - sp, ub, hw * (0.75 + 0.5 * rnd(o.seed, i, g, 6)), alpha, rnd(o.seed, i, g, 7));
        } else {
          off.set(0, 0, 0);
          write(j++, 1 - span, 1, hw, alpha, rnd(o.seed, i, g, 7));
        }
      }
      for (let q = 0; q < 4; q++) attrs[q].needsUpdate = true;
      geo.instanceCount = j;
    },
    set(patch) { Object.assign(o, patch); paint(); },
    dispose() { geo.dispose(); mat.dispose(); },
  };
}

// left: silver ghosts of a dodging figure (at, under); right: additive cyan ghosts of a hopping figure (at) and an
// inked white slap arc on each landing; centre: a flurry of 40 gold fist smears under a red spinning arc. Loops in 4 s.
export function demo(engine) {
  const group = new Group();
  const paint = (geo, col, shade) => {
    const n = geo.attributes.position.count, fill = (v) => new BufferAttribute(new Float32Array(n * 3).map((_, i) => v[i % 3]), 3);
    geo.setAttribute("aCol", fill(new Color(col).toArray())); geo.setAttribute("aShade", fill(new Color(shade).toArray())); geo.setAttribute("aXrd", fill([0.5, 1, 0]));
    return geo;
  };
  const figure = (x, col, shade) => {
    const g = new Group(), body = engine.figure(paint(new CapsuleGeometry(0.1, 0.14, 4, 12), col, shade)), head = engine.prop(paint(new SphereGeometry(0.095, 16, 12), col, shade), 1);
    body.position.y = 0.17; head.position.y = 0.4; g.position.x = x;
    g.add(body, head); group.add(g);
    return g;
  };
  const fa = figure(-0.62, "#d0604e", "#713044"), fb = figure(0.62, "#4fa7bd", "#2b4c72");
  const dodge = (t) => -0.62 + 0.2 * Math.sin(1.5 * Math.PI * t), hop = (t) => 0.3 + 0.45 * Math.abs(Math.sin(Math.PI * t));
  const fx = [
    makeEchoes(engine, { source: fa, at: (t, m) => m.makeTranslation(dodge(t), 0.55, 0) }),
    makeEchoes(engine, { source: fb, at: (t, m) => m.makeTranslation(0.62, hop(t), 0), count: 4, gap: 1, tint: "#7fd4ff", emit: 1.2, stretch: 1.3, blend: "add" }),
    makeSmear(engine, { from: [-0.05, 0.25, -0.3], to: [0.1, 1.2, 0.5], bend: 0.05, count: 40, spread: 0.2, span: 0.2, stretch: 1.15, width: 0.045,
      life: 1, fps: 12, dur: Infinity, color: "#e8b84a", mix: "#fff3c8", emit: 0.8 }),
    makeSmear(engine, { centre: [0, 1.6, 0], radius: 0.28, sweep: 2.4, width: 0.09, streaks: 9, life: 1, fps: 12, dur: Infinity, color: "#d33d49", mix: "#ffd0c4" }),
    makeSmear(engine, { from: [0.36, 0.95, 0.1], to: [0.86, 0.35, 0.1], bend: 0.3, width: 0.07, life: 2, fps: 12, color: "#ebebeb", ink: "#1a1214" }),
  ];
  for (const f of fx) group.add(f.group);
  const spin = { start: 0 }, slap = { t0: 0 };
  return {
    group,
    update(ts) {
      const t = ((ts % 4) + 4) % 4;
      fa.position.set(dodge(t), 0.55, 0);
      fb.position.set(0.62, hop(t), 0);
      spin.start = (frameIndex(t, 12) * Math.PI) / 4; slap.t0 = Math.floor(t);
      fx[3].set(spin); fx[4].set(slap);
      for (const f of fx) f.update(t);
    },
    dispose() { for (const f of fx) f.dispose(); for (const g of [fa, fb]) g.traverse((x) => { x.geometry?.dispose(); x.material?.dispose(); }); },
  };
}
