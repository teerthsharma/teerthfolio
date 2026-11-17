// FUR (kit fx): drawn fur on a seal character part, in the body's own cel look. Parent `group` to the part.
//   clumps: tapered hard-edged 6-gon tufts (the hair-clump-kit construction: flat facets, highlight cut, a darker
//     root) with sawtooth teeth, rooted in the surface so they break the smooth silhouette. One engine.figure:
//     the shared anime program, an ink hull on smooth normals, alpha id 1, depth written, like the body.
//   strokes: short tapered dry-brush marks lying on the surface. One engine.prop: flat ink (id 3), or
//     side "shade" where the lit fill is the coat and only the shade side shows the stroke colour.
//   Wind: the fully lifted pose is baked into aBlob/aBlobN and the material's own uMorph mixes toward it
//     (no new program), lift * gust(ts); strokes boil between two drawings on floor(ts fps) parity.
// Options (DEFAULTS), lengths as shares of the surface radius R:
//   surface { c, r } ellipsoid | [{ p, n }] | BufferGeometry with normals (part space); radius: R override (0 auto)
//   regions "cheeks" "crown" "chest" "back" "sides" "all" (by outward normal) or (p, n) => bool (compose REGIONS)
//   flow: the direction fur grows along the surface; wind: the lift direction (its tangential part)
//   clumps { count | perSide (mirrored about the surface centre's x, wind too), length [min, max], width, out (0 flat, 1 upright), bend, spike,
//     jag, teeth, spread (rad), thick, rootDark, hi (null: derived), cut { at, slant, rate } }
//   strokes { count | perSide, length, width, angle (deg in the tangent plane from the patch's right, null =
//     flow), spread (deg), dry (max share of the region's area), broken (gap odds), side, col (null: ink),
//     boil, regions (null: same as clumps) }
//   col / shade / ink (null: no hull) hex, line (hull px x), lift 0..1, sway, hz, offset, id, fps (0: style), seed
// set({ lift, sway, hz, ink, line, id }). Engine tier <= 1 halves both counts.
import { BufferAttribute, BufferGeometry, Color, Group, SphereGeometry, Vector3 } from "three";

export const DEFAULTS = {
  surface: { c: [0, 0.555, 0.03], r: [0.27, 0.245, 0.255] },
  radius: 0,
  regions: ["cheeks", "crown"],
  flow: [0, -0.4, -1],
  wind: [0, 0.5, -1],
  clumps: { count: 8, perSide: 0, length: [0.1, 0.18], width: 0.09, out: 0.45, bend: 0.15, spike: 0.6, jag: 0.35, teeth: 2, spread: 0.5, thick: 0.45, rootDark: 0.35, hi: null, cut: { at: [0.45, 0.7], slant: 0.08, rate: 0.5 } },
  strokes: { count: 10, perSide: 0, length: 0.22, width: 0.018, angle: null, spread: 10, dry: 0.1, broken: 0.25, side: "all", col: null, boil: 0.3, regions: null },
  col: "#8e8c91", shade: "#6d6b7d", ink: "#4a3f3c", line: 0.8,
  lift: 0.15, sway: 0.4, hz: 1.25,
  offset: 0.006, id: 1, fps: 0, seed: 1,
};

const X = new Vector3(1, 0, 0), Y = new Vector3(0, 1, 0), Z = new Vector3(0, 0, 1);
const RING = 6, FRONT = [true, false, false, false, true, true], SEG = 6;
const QUAD = [0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 0];
const RIB = [0, 1, 0, -1, 1, 1, 0, -1, 1, -1, 1, 1];
export const REGIONS = {
  cheeks: (p, n) => n.z > 0.05 && Math.abs(n.x) > 0.5 && Math.abs(n.y) < 0.6,
  crown: (p, n) => n.y > 0.55,
  chest: (p, n) => n.z > 0.45 && n.y < 0.2 && n.y > -0.75,
  back: (p, n) => n.z < -0.35,
  sides: (p, n) => Math.abs(n.x) > 0.65,
  all: () => true,
};

function rng(seed) {
  let a = (Math.floor(seed) * 2654435761) >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const v3 = (a) => (a?.isVector3 ? a.clone() : new Vector3(a[0], a[1], a[2]));
const flipX = (v, x0 = 0) => new Vector3(2 * x0 - v.x, v.y, v.z);
const invSmooth = (y) => (y <= 0 ? 0 : y >= 1 ? 1 : 0.5 - Math.sin(Math.asin(1 - 2 * y) / 3));
function capLuma(c) {
  c.r = Math.min(1, Math.max(c.r, 0.004)); c.g = Math.min(1, Math.max(c.g, 0.004)); c.b = Math.min(1, Math.max(c.b, 0.004));
  const y = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  return y > 0.92 ? c.multiplyScalar(0.92 / y) : c;
}
const colOf = (hex) => capLuma(new Color(hex));
function tangentOf(n, f, out = new Vector3()) {
  out.copy(f).addScaledVector(n, -f.dot(n));
  if (out.lengthSq() < 1e-6) out.crossVectors(n, Math.abs(n.y) < 0.9 ? Y : X);
  return out.normalize();
}
function maskOf(reg) {
  if (typeof reg === "function") return reg;
  const fs = [].concat(reg).map((k) => { if (!REGIONS[k]) throw new Error(`fur: unknown region "${k}"`); return REGIONS[k]; });
  return (p, n) => fs.some((f) => f(p, n));
}

// candidate sites { p, n }, the length unit R, the area, and onto(q, n): q moved onto the surface, n its normal
function surfaceOf(s) {
  if (Array.isArray(s) || s?.isBufferGeometry) {
    let pts;
    if (Array.isArray(s)) pts = s.map((q) => ({ p: v3(q.p), n: v3(q.n).normalize() }));
    else {
      const P = s.attributes.position, N = s.attributes.normal, st = Math.max(1, Math.floor(P.count / 2000));
      if (!N) throw new Error("fur: a surface geometry needs normals");
      pts = [];
      for (let i = 0; i < P.count; i += st) pts.push({ p: new Vector3().fromBufferAttribute(P, i), n: new Vector3().fromBufferAttribute(N, i).normalize() });
    }
    const c = new Vector3();
    for (const q of pts) c.add(q.p);
    c.divideScalar(Math.max(1, pts.length));
    let R = 0;
    for (const q of pts) R += q.p.distanceTo(c) / Math.max(1, pts.length);
    return { pts, R, cx: c.x, area: 4 * Math.PI * R * R, onto: () => {} };
  }
  const c = v3(s.c), [a, b, e] = s.r, M = 720, pts = [], k = 1.6075;
  for (let i = 0; i < M; i++) {
    const y = 1 - (2 * i + 1) / M, rr = Math.sqrt(1 - y * y), ph = i * 2.399963;
    const u = new Vector3(Math.cos(ph) * rr, y, Math.sin(ph) * rr);
    pts.push({ p: new Vector3(c.x + u.x * a, c.y + u.y * b, c.z + u.z * e), n: new Vector3(u.x / a, u.y / b, u.z / e).normalize() });
  }
  const area = 4 * Math.PI * (((a * b) ** k + (a * e) ** k + (b * e) ** k) / 3) ** (1 / k);
  const onto = (q, n) => { q.sub(c); q.multiplyScalar(1 / Math.hypot(q.x / a, q.y / b, q.z / e)); n.set(q.x / (a * a), q.y / (b * b), q.z / (e * e)).normalize(); q.add(c); };
  return { pts, R: (a + b + e) / 3, cx: c.x, area, onto };
}

// ring stations [u, width factor]: each tooth widens toward the tip, then steps in (barbs point tipward)
function profile(teeth, jag) {
  const T = Math.max(1, Math.round(teeth)), out = [];
  for (let j = 0; j < T; j++) {
    for (const f of [0, 1 / 3, 2 / 3]) out.push([(j + f) / T, 1 - jag + jag * f]);
    if (j < T - 1) out.push([(j + 0.985) / T, 1 - jag + jag * 0.985]);
  }
  out.push([1, 1]);
  return out;
}

function tube(root, d, n, L, bend, W, prof, spike, thick) {
  const out = n.clone().addScaledVector(d, -n.dot(d));
  if (out.lengthSq() < 1e-8) out.crossVectors(d, Math.abs(d.x) < 0.9 ? X : Z);
  out.normalize();
  const P = prof.map(([u]) => root.clone().addScaledVector(d, L * u).addScaledVector(n, -bend * L * u * u));
  const pos = [], nrm = [], T = new Vector3(), sd = new Vector3(), ou = new Vector3();
  P.forEach((c, i) => {
    T.subVectors(P[Math.min(P.length - 1, i + 1)], P[Math.max(0, i - 1)]).normalize();
    sd.crossVectors(T, out).normalize(); ou.crossVectors(sd, T).normalize();
    const u = prof[i][0], w = W * ((1 - u) ** (0.4 + 1.6 * spike) + 0.06) * prof[i][1], th = w * thick, rp = [], rn = [];
    for (let k = 0; k < RING; k++) {
      const a = ((k + 0.5) * Math.PI) / 3, ca = Math.cos(a), sa = Math.sin(a);
      rp.push(c.clone().addScaledVector(sd, sa * w * 0.5).addScaledVector(ou, ca * th * 0.5));
      rn.push(new Vector3().addScaledVector(sd, sa / w).addScaledVector(ou, ca / th).normalize());
    }
    pos.push(rp); nrm.push(rn);
  });
  return { pos, nrm };
}

const e1 = new Vector3(), e2 = new Vector3();
function faceN(p0, p1, p2, fb, out) {
  out.crossVectors(e1.subVectors(p1, p0), e2.subVectors(p2, p0));
  return out.lengthSq() > 1e-24 ? out.normalize() : out.copy(fb);
}
const put = (a, v) => a.push(v.x, v.y, v.z);
const attr = (a, k) => new BufferAttribute(new Float32Array(a), k);

export function makeFur(engine, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const C = { ...DEFAULTS.clumps, ...opts.clumps, cut: { ...DEFAULTS.clumps.cut, ...opts.clumps?.cut } };
  const St = { ...DEFAULTS.strokes, ...opts.strokes };
  const half = (engine.tier ?? 2) <= 1, cnt = (n) => (half ? Math.ceil(n / 2) : n);
  const surf = surfaceOf(o.surface), R = o.radius > 0 ? o.radius : surf.R;
  const flow = v3(o.flow).normalize(), wind = v3(o.wind).normalize();
  const col = colOf(o.col), shade = colOf(o.shade), back = col.clone().multiplyScalar(0.82);
  const hi = C.hi ? colOf(C.hi) : capLuma(col.clone().multiplyScalar(1.2).addScalar(0.035));
  const sites = (mask, mirror) => surf.pts.filter((q) => mask(q.p, q.n) && (!mirror || q.p.x > surf.cx + 0.02 * R));
  const choose = (kept, n, rnd) => { n = Math.min(n, kept.length); const st = kept.length / Math.max(1, n); return Array.from({ length: n }, (_, i) => kept[Math.min(kept.length - 1, Math.floor((i + rnd()) * st))]); };

  // clumps: rest pose in position/normal, the fully lifted pose in aBlob/aBlobN; the hull reads smooth normals
  const c0 = { pos: [], nF: [], nS: [], bP: [], bNF: [], bNS: [], col: [], sh: [], xrd: [] };
  const rc = rng(o.seed * 7 + 1), U = profile(C.teeth, C.jag), len = [].concat(C.length), cl = new Color(), cs = new Color();
  const fn = new Vector3(), fl = new Vector3();
  const addClump = (at, n, fw, wd) => {
    const d = tangentOf(n, fw).applyAxisAngle(n, (rc() - 0.5) * C.spread);
    const out = C.out * (0.75 + 0.5 * rc());
    d.multiplyScalar(1 - out).addScaledVector(n, out).normalize();
    const L = R * (len[0] + rc() * ((len[1] ?? len[0]) - len[0])), W = R * C.width * (0.8 + 0.4 * rc()), a = 0.6 + 0.6 * rc();
    const d1 = d.clone().addScaledVector(n, 0.9 * a).addScaledVector(wd.clone().addScaledVector(n, -wd.dot(n)), a).normalize();
    const root = at.clone().addScaledVector(n, -0.2 * W), cutOn = rc() < C.cut.rate, jit = (rc() - 0.5) * 0.1;
    const A = tube(root, d, n, L, C.bend, W, U, C.spike, C.thick), B = tube(root, d1, n, L, C.bend * 0.4, W, U, C.spike, C.thick);
    for (let i = 0; i < U.length - 1; i++) {
      const u = (U[i][0] + U[i + 1][0]) * 0.5, rd = C.rootDark * Math.max(0, 1 - u / 0.3);
      for (let k = 0; k < RING; k++) {
        let cc = FRONT[k] ? col : back;
        if (cutOn && FRONT[k]) { const s = C.cut.slant * ((k === 4 ? 0 : k === 5 ? 1 : 2) - 1) + jit; if (u >= C.cut.at[0] + s && u <= C.cut.at[1] + s) cc = hi; }
        cl.copy(cc).lerp(shade, rd); cs.copy(shade).multiplyScalar(1 - 0.3 * rd);
        for (let tr = 0; tr < 2; tr++) {
          const ix = [0, 1, 2].map((j) => { const v = 3 * tr + j; return [i + QUAD[2 * v], (k + QUAD[2 * v + 1]) % RING]; });
          faceN(...ix.map(([r, q]) => A.pos[r][q]), A.nrm[ix[0][0]][ix[0][1]], fn);
          faceN(...ix.map(([r, q]) => B.pos[r][q]), B.nrm[ix[0][0]][ix[0][1]], fl);
          for (const [r, q] of ix) {
            const uu = U[r][0];
            put(c0.pos, A.pos[r][q]); put(c0.nF, fn); put(c0.nS, A.nrm[r][q]);
            put(c0.bP, B.pos[r][q]); c0.bP.push(0); put(c0.bNF, fl); put(c0.bNS, B.nrm[r][q]);
            c0.col.push(cl.r, cl.g, cl.b); c0.sh.push(cs.r, cs.g, cs.b); c0.xrd.push(0.42 + 0.13 * uu, 1 - 0.45 * uu, 0);
          }
        }
      }
    }
  };
  const mirC = C.perSide > 0, mflow = flipX(flow), mwind = flipX(wind);
  for (const s of choose(sites(maskOf(o.regions), mirC), cnt(mirC ? C.perSide : C.count), rc)) {
    addClump(s.p, s.n, flow, wind);
    if (mirC) addClump(flipX(s.p, surf.cx), flipX(s.n), mflow, mwind);
  }

  // strokes: a 6-segment tapered ribbon on the surface, broken by dry-brush gaps; a second drawing in aBlob boils it
  const s0 = { pos: [], n: [], bP: [], bN: [], col: [], sh: [], xrd: [] };
  const rs = rng(o.seed * 7 + 2), rb = rng(o.seed * 7 + 3), eps = o.offset * R, SW = R * St.width;
  const flat = St.side !== "shade", sc = colOf(St.col ?? o.ink ?? o.shade), fill = flat ? sc : col;
  const eh = new Vector3(), ev = new Vector3(), dir = new Vector3(), sv = new Vector3(), tmp = new Vector3();
  const line = (at, n, ang, L) => {
    eh.crossVectors(Y, n);
    if (eh.lengthSq() < 1e-4) eh.copy(X).addScaledVector(n, -n.x);
    eh.normalize(); ev.crossVectors(n, eh);
    dir.copy(eh).multiplyScalar(Math.cos(ang)).addScaledVector(ev, Math.sin(ang));
    const P = [], N = [];
    for (let j = 0; j <= SEG; j++) {
      const q = at.clone().addScaledVector(dir, L * (j / SEG - 0.35)), m = n.clone();
      surf.onto(q, m); P.push(q.addScaledVector(m, eps)); N.push(m);
    }
    return { P, N };
  };
  const corner = (S, j, sg) => {
    const s = j / SEG, w = 0.5 * SW * Math.min(1, 0.3 + 2.5 * s) * (1 - s) ** 0.6;
    sv.crossVectors(S.N[j], tmp.subVectors(S.P[Math.min(SEG, j + 1)], S.P[Math.max(0, j - 1)])).normalize();
    return S.P[j].clone().addScaledVector(sv, sg * w);
  };
  const addStroke = (at, n, fw, deg) => {
    eh.crossVectors(Y, n);
    if (eh.lengthSq() < 1e-4) eh.copy(X).addScaledVector(n, -n.x);
    eh.normalize(); ev.crossVectors(n, eh);
    const tf = tangentOf(n, fw), base = deg == null ? Math.atan2(tf.dot(ev), tf.dot(eh)) : (deg * Math.PI) / 180;
    const ang = base + ((rs() - 0.5) * St.spread * Math.PI) / 180, L = R * St.length * (0.8 + 0.4 * rs());
    const gaps = Array.from({ length: SEG }, (_, j) => j > 0 && rs() < St.broken);
    const A = line(at, n, ang, L);
    const at2 = at.clone().add(tmp.set(rb() - 0.5, rb() - 0.5, rb() - 0.5).projectOnPlane(n).multiplyScalar(St.boil * 0.16 * R)), n2 = n.clone();
    surf.onto(at2, n2);
    const B = line(at2, n2, ang + (rb() - 0.5) * 0.5 * St.boil, L * (1 + (rb() - 0.5) * 0.3 * St.boil));
    for (let j = 0; j < SEG; j++) {
      if (gaps[j]) continue;
      for (let v = 0; v < 6; v++) {
        const jj = j + RIB[2 * v], sg = RIB[2 * v + 1];
        put(s0.pos, corner(A, jj, sg)); put(s0.n, A.N[jj]); put(s0.bP, corner(B, jj, sg)); s0.bP.push(0); put(s0.bN, B.N[jj]);
        s0.col.push(fill.r, fill.g, fill.b); s0.sh.push(sc.r, sc.g, sc.b); s0.xrd.push(flat ? 0.5 : 0.55, 0, flat ? 3 : 0);
      }
    }
  };
  const mirS = St.perSide > 0, keptS = sites(maskOf(St.regions ?? o.regions), mirS);
  const cap = Math.floor((St.dry * surf.area * keptS.length) / Math.max(1, surf.pts.length) / Math.max(1e-12, R * R * St.length * St.width * 0.5 * (1 - 0.8 * St.broken)));
  for (const s of choose(keptS, Math.min(cap, cnt(mirS ? St.perSide : St.count)), rs)) {
    addStroke(s.p, s.n, flow, St.angle);
    if (mirS) addStroke(flipX(s.p, surf.cx), flipX(s.n), mflow, St.angle == null ? null : 180 - St.angle);
  }

  const group = new Group(), geos = [], mats = [];
  group.name = "fur";
  let fig = null, sm = null;
  if (c0.pos.length) {
    const g = new BufferGeometry(), gh = new BufferGeometry();
    g.setAttribute("position", attr(c0.pos, 3)); g.setAttribute("normal", attr(c0.nF, 3));
    g.setAttribute("aCol", attr(c0.col, 3)); g.setAttribute("aShade", attr(c0.sh, 3)); g.setAttribute("aXrd", attr(c0.xrd, 3));
    g.setAttribute("aBlob", attr(c0.bP, 4)); g.setAttribute("aBlobN", attr(c0.bNF, 3));
    for (const k of ["position", "aCol", "aShade", "aXrd", "aBlob"]) gh.setAttribute(k, g.attributes[k]);
    gh.setAttribute("normal", attr(c0.nS, 3)); gh.setAttribute("aBlobN", attr(c0.bNS, 3));
    g.computeBoundingSphere(); gh.boundingSphere = g.boundingSphere;
    fig = engine.figure(g, { lineMul: o.line, ink: o.ink ?? undefined });
    fig.userData.hullMesh.geometry = gh;
    fig.userData.mesh.frustumCulled = fig.userData.hullMesh.frustumCulled = false;
    fig.name = "fur-clumps";
    geos.push(g, gh); mats.push(fig.userData.mat, fig.userData.hull);
    group.add(fig);
  }
  if (s0.pos.length) {
    const g = new BufferGeometry();
    g.setAttribute("position", attr(s0.pos, 3)); g.setAttribute("normal", attr(s0.n, 3));
    g.setAttribute("aCol", attr(s0.col, 3)); g.setAttribute("aShade", attr(s0.sh, 3)); g.setAttribute("aXrd", attr(s0.xrd, 3));
    g.setAttribute("aBlob", attr(s0.bP, 4)); g.setAttribute("aBlobN", attr(s0.bN, 3));
    g.computeBoundingSphere();
    sm = engine.prop(g, o.id);
    Object.assign(sm.material, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
    sm.frustumCulled = false; sm.name = "fur-strokes";
    geos.push(g); mats.push(sm.material);
    group.add(sm);
  }

  const S = { lift: o.lift, sway: o.sway, hz: o.hz }, ph = rng(o.seed * 7 + 4)() * 2 * Math.PI;
  const api = {
    group,
    update(t) {
      if (fig) {
        const w = 2 * Math.PI * S.hz;
        const g = S.lift * (1 - S.sway * (0.5 + 0.35 * Math.sin(w * t + ph) + 0.15 * Math.sin(2 * w * t + 2.1 * ph)));
        fig.userData.mat.uniforms.uMorph.value = invSmooth(Math.min(1, Math.max(0, g)));
      }
      if (sm && St.boil > 0) sm.material.uniforms.uMorph.value = Math.floor(t * (o.fps || engine.style?.timing?.fps || 12) + 1e-6) & 1;
    },
    set(p = {}) {
      if (p.lift !== undefined) S.lift = p.lift;
      if (p.sway !== undefined) S.sway = p.sway;
      if (p.hz !== undefined) S.hz = p.hz;
      if (fig && p.ink !== undefined) {
        fig.userData.hullMesh.visible = p.ink !== null;
        if (p.ink !== null) { const h = fig.userData.hull.uniforms; h.uInkOwn.value.copy(colOf(p.ink)); h.uInkOwnAmt.value = 1; }
      }
      if (fig && p.line !== undefined) fig.userData.hull.uniforms.uLineMul.value = p.line;
      if (p.id !== undefined) { if (fig) fig.userData.mat.uniforms.uId.value = p.id; if (sm) sm.material.uniforms.uId.value = p.id; }
    },
    dispose() { group.removeFromParent(); for (const g of geos) g.dispose(); for (const m of mats) m.dispose(); },
  };
  if (fig) { fig.userData.mat.uniforms.uId.value = o.id; api.set({ ink: o.ink }); }
  api.update(0);
  return api;
}

// a painted ellipsoid on the anime program, the stand-in for a character part
function host(engine, r, col, shade, ink) {
  const g = new SphereGeometry(1, 48, 32), P = g.attributes.position, N = g.attributes.normal, n = new Vector3(), m = P.count;
  for (let i = 0; i < m; i++) {
    n.set(P.getX(i) / r[0], P.getY(i) / r[1], P.getZ(i) / r[2]).normalize();
    N.setXYZ(i, n.x, n.y, n.z); P.setXYZ(i, P.getX(i) * r[0], P.getY(i) * r[1], P.getZ(i) * r[2]);
  }
  const c = colOf(col), s = colOf(shade);
  const fill = (k, v) => { const a = new Float32Array(m * v.length); for (let i = 0; i < m; i++) a.set(v, i * v.length); g.setAttribute(k, new BufferAttribute(a, v.length)); };
  fill("aCol", [c.r, c.g, c.b]); fill("aShade", [s.r, s.g, s.b]); fill("aXrd", [0.55, 1, 0]); fill("aBlob", [0, 0, 0, 0]); fill("aBlobN", [0, 1, 0]);
  g.computeBoundingSphere();
  return engine.figure(g, { ink, lineMul: 1 });
}

// three parts side by side: the pup head (cheeks + crown), a dark Madhouse back in a 0.05..1 gust, JoJo hatch
export function demo(engine) {
  const group = new Group(), patch = { lift: 0 };
  const items = [
    { x: -0.68, yaw: 0.45, r: [0.27, 0.245, 0.255], col: "#8e8c91", shade: "#6d6b7d", ink: "#4a3f3c",
      fur: { regions: ["cheeks", "crown"], clumps: { perSide: 3 }, strokes: { perSide: 3 }, lift: 0.2 } },
    { x: 0, yaw: Math.PI - 0.7, r: [0.29, 0.24, 0.27], col: "#3a3436", shade: "#1f1a22", ink: "#0e0c16", gust: true,
      fur: { regions: ["back", "sides"], clumps: { count: 7, jag: 0.6, teeth: 3, spike: 0.8, length: [0.14, 0.24], out: 0.5 }, strokes: { count: 20, col: "#8a8090", length: 0.18 } } },
    { x: 0.68, yaw: -0.3, r: [0.26, 0.25, 0.25], col: "#d3e2f1", shade: "#86aad6", ink: "#1c1816",
      fur: { regions: ["chest", "cheeks"], clumps: { perSide: 2, jag: 0.2 }, strokes: { perSide: 4, angle: 172.5, side: "shade", col: "#1c1816", length: 0.3, width: 0.014, broken: 0.1, spread: 4 }, lift: 0.35 } },
  ].map((it, i) => {
    const h = host(engine, it.r, it.col, it.shade, it.ink);
    const fur = makeFur(engine, { surface: { c: [0, 0, 0], r: it.r }, col: it.col, shade: it.shade, ink: it.ink, seed: i + 1, ...it.fur });
    h.position.set(it.x, 1, 0); h.add(fur.group); group.add(h);
    return { ...it, h, fur };
  });
  return {
    group,
    update(ts) {
      const u = ((ts % 4) + 4) % 4, a = (2 * Math.PI * u) / 4;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        it.h.rotation.y = it.yaw + 0.5 * Math.sin(a);
        if (it.gust) { patch.lift = 0.05 + 0.95 * (0.5 - 0.5 * Math.cos(a)); it.fur.set(patch); }
        it.fur.update(u);
      }
    },
    dispose() {
      for (const it of items) { it.fur.dispose(); it.h.userData.mesh.geometry.dispose(); it.h.userData.mat.dispose(); it.h.userData.hull.dispose(); }
      group.removeFromParent();
    },
  };
}
