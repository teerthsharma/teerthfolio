// HAIR CLUMP KIT (shared kit, canonical name from scripts/INDEX.md: `hair-clump-kit`, which also covers
// hair-clump-cards, hair-clump-instancer, anime-hair-clumps and hair-clump-ribbon).
// Anime hair is not strands: it is a few big, tapered, hard-edged CLUMPS, each with one cut-out highlight.
// This kit builds exactly that, as real 3D geometry the anime material shades (id 1 = hair, which also gets
// the Kajiya-Kay angel ring), with an ink hull from engine.figure().
//
//   hairClumps(spec)              -> BufferGeometry (non-indexed; aCol, aShade, aXrd, aBlob, aBlobN baked per vertex)
//   hairMesh(engine, spec, head)  -> the figure Group (surface + ink hull); `head` = { pos, fwd, right, r } for the ring
//   HAIR_PRESETS                  spiky, swept, long, bob, ponytail, twintail, forelock, slick, mohawk, bald
//   defineHair(base, overrides)   -> spec: a preset with overrides merged
//
// spec (all lengths in metres, for the locked pup's 0.27 m head; scale with `s`):
//   scalp: { c:[x,y,z], r:[rx,ry,rz] }          the head ellipsoid the roots sit on (default: the pup's HEAD2)
//   band:  [phi0, phi1]                          polar angle band of roots, from the crown (0) to the brow (about 1.3 rad)
//   sector: [th0, th1]                           azimuth range of roots (0 = front +z, + toward +x): [-pi, pi] all round,
//                                                a fringe is [-0.9, 0.9] on a narrow band near the brow
//   count, layers                                clumps per layer and how many nested layers (inner shorter)
//   length: [min, max]                           clump length; width: root width; thick: depth / width (default 0.42)
//   lift                                         0..1 how far the clump leaves the scalp along its normal before it bends
//   sweep: [x, y, z]                             a global direction the clumps lean toward (a swept style)
//   droop                                        gravity pulled onto the tip (m per m^2 of length): long hair droops
//   spike                                        0 = blunt locks, 1 = needle tips (width profile exponent)
//   curl                                         the tip curls sideways by this many metres at u = 1
//   seed                                         integer, makes a style repeatable
//   color: { base, shade, hi }                   albedo, authored shadow, highlight colour
//   cut: { at:[u0, u1], slant, rate }            THE HIGHLIGHT CUT: the band along each clump (u in 0..1 from root to
//                                                tip) that takes `hi`; `slant` shifts it across the three front lanes so
//                                                the edge runs on a diagonal; `rate` = the share of clumps that carry one
//   segs                                         segments along a clump (default 9; the cut resolves to one segment)
//
// Clump geometry: a flattened 6-gon tube along a curve. Root p0 on the scalp, direction
//   d0 = normalize( (1 - lift) * tangent + lift * normal + sweep )   then, for s in [0, 1]:
//   P(s) = p0 + d0 L s + g L^2 s^2 (0, -droop, 0) + c L s^3 (side)      (side = d0 x up, curl)
// width w(s) = W (1 - s)^(0.4 + 1.6 spike) + W 0.06  (a needle for spike 1, a blunt lock for 0).
// The cross-section is the ellipse (w/2, w thick/2) in the plane spanned by `side` and the outward normal; faces
// whose outward normal faces the viewer side (dot with the scalp normal > 0.1) are the "front" quads; only they
// take the highlight, by lane: lane j (0 left, 1 mid, 2 right) cuts at [u0 + slant (j - 1), u1 + slant (j - 1)],
// so the hard edge of the cut is a stepped diagonal across the clump. Per-quad colour on non-indexed triangles
// keeps the cut crisp (no interpolation across segments).
import { BufferAttribute, BufferGeometry, Color, Vector3 } from "three";
import { rng } from "../kit3d.js";

const HEAD2 = { c: [0, 0.555, 0.03], r: [0.27, 0.245, 0.255] }; // the locked pup's head (pup.js HEAD2)
const HEAD_FRAME = { pos: HEAD2.c, fwd: [0, 0, 1], right: [1, 0, 0], r: 0.27 };

export const HAIR_PRESETS = {
  // Goku / Naruto: big blunt spikes radiating up and out
  spiky: { band: [0.05, 1.15], sector: [-Math.PI, Math.PI], count: 16, layers: 2, length: [0.12, 0.26], width: 0.07, lift: 0.8, sweep: [0, 0.05, 0], droop: 0.0, spike: 0.8, curl: 0.02 },
  // swept-back: the Aizen slick with one fringe lock, Rimuru's side-swept bangs
  swept: { band: [0.1, 1.2], sector: [-Math.PI, Math.PI], count: 20, layers: 2, length: [0.14, 0.24], width: 0.06, lift: 0.35, sweep: [0, 0.05, -0.55], droop: 0.1, spike: 0.35, curl: 0.0 },
  long: { band: [0.1, 1.35], sector: [-Math.PI, Math.PI], count: 22, layers: 2, length: [0.34, 0.62], width: 0.075, lift: 0.25, sweep: [0, -0.1, -0.1], droop: 0.55, spike: 0.25, curl: 0.04 },
  bob: { band: [0.1, 1.3], sector: [-Math.PI, Math.PI], count: 22, layers: 2, length: [0.16, 0.26], width: 0.075, lift: 0.3, sweep: [0, -0.2, 0], droop: 0.3, spike: 0.1, curl: 0.0 },
  ponytail: { band: [0.1, 1.2], sector: [-Math.PI, Math.PI], count: 18, layers: 2, length: [0.12, 0.2], width: 0.07, lift: 0.3, sweep: [0, 0, -0.6], droop: 0.15, spike: 0.2, curl: 0.0, tail: { n: 7, length: 0.52, width: 0.07, at: [0, 0.74, -0.2] } },
  twintail: { band: [0.1, 1.2], sector: [-Math.PI, Math.PI], count: 16, layers: 2, length: [0.1, 0.18], width: 0.07, lift: 0.3, sweep: [0, 0, 0], droop: 0.1, spike: 0.2, curl: 0, tail: { n: 6, length: 0.6, width: 0.075, at: [0.2, 0.7, -0.05], mirror: true } },
  // Aizen: the slicked hair with the single forelock falling over the brow
  forelock: { band: [0.1, 1.2], sector: [-Math.PI, Math.PI], count: 18, layers: 2, length: [0.14, 0.22], width: 0.06, lift: 0.3, sweep: [0, 0.05, -0.5], droop: 0.1, spike: 0.3, curl: 0.0, fringe: { n: 2, length: 0.2, at: [0.04, 0.78, 0.2], sweep: [0.2, -0.9, 0.5] } },
  slick: { band: [0.1, 1.2], sector: [-Math.PI, Math.PI], count: 18, layers: 1, length: [0.12, 0.2], width: 0.07, lift: 0.1, sweep: [0, 0, -0.9], droop: 0.0, spike: 0.2, curl: 0 },
  mohawk: { band: [0.05, 0.6], sector: [-0.5, 0.5], count: 0, layers: 1, length: [0.12, 0.2], width: 0.05, lift: 1, sweep: [0, 0.1, 0], droop: 0, spike: 0.6, curl: 0, ridge: { n: 9, length: 0.2, width: 0.05 } },
  bald: { count: 0 },
};
export const defineHair = (base, o = {}) => ({ ...(HAIR_PRESETS[base] ?? base), ...o, color: { ...(HAIR_PRESETS[base]?.color ?? {}), ...(o.color ?? {}) } });

// the 6-gon cross-section ring: angle a_k = k pi / 3; the outward (front) side is k = 5, 0, 1
const NS = 6;
const FRONT = [true, true, false, false, false, true]; // face k joins ring vertices k and k+1; faces 5, 0, 1 are the viewer's side

function clumpCurve(p0, d0, L, droop, curl, side, segs) {
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const s = i / segs;
    pts.push(new Vector3().copy(p0).addScaledVector(d0, L * s).add(new Vector3(0, -droop * L * L * s * s, 0)).addScaledVector(side, curl * s * s * s * L));
  }
  return pts;
}

export function hairClumps(spec = {}) {
  const sc = spec.scalp ?? HEAD2, s = spec.s ?? 1;
  const R = rng(spec.seed ?? 11);
  const col = { base: new Color(spec.color?.base ?? "#3a2a22"), shade: new Color(spec.color?.shade ?? "#1c1218"), hi: new Color(spec.color?.hi ?? "#8a6a58") };
  const cut = { at: [0.45, 0.7], slant: 0.08, rate: 0.7, ...(spec.cut ?? {}) };
  const segs = spec.segs ?? 9, thick = spec.thick ?? 0.42;
  const pos = [], aCol = [], aShade = [];
  const clumps = [];
  const C = new Vector3(...sc.c), up = new Vector3(0, 1, 0);

  const addClump = (p0, n, d0, L, W, spike, droop, curl, carries) => {
    // the face normal: the scalp normal made perpendicular to the growth direction (the viewer's side of the clump)
    const out = n.clone().addScaledVector(d0, -n.dot(d0));
    if (out.lengthSq() < 1e-4) out.crossVectors(d0, up);
    if (out.lengthSq() < 1e-4) out.set(0, 0, 1);
    out.normalize();
    const side = new Vector3().crossVectors(d0, out).normalize(); // lateral: the curl direction
    const P = clumpCurve(p0, d0, L, droop, curl, side, segs);
    const T = P.map((_, i) => new Vector3().subVectors(P[Math.min(segs, i + 1)], P[Math.max(0, i - 1)]).normalize());
    const ring = (i) => {
      const u = i / segs, w = W * s * ((1 - u) ** (0.4 + 1.6 * (spike ?? 0.3)) + 0.06), th = w * thick;
      const sd = new Vector3().crossVectors(T[i], out).normalize(); // lateral in the cross-section plane
      const ou = new Vector3().crossVectors(sd, T[i]).normalize();
      if (ou.dot(out) < 0) ou.negate();
      return Array.from({ length: NS }, (_, k) => { const a = (k * Math.PI * 2) / NS; return new Vector3().copy(P[i]).addScaledVector(sd, Math.sin(a) * w * 0.5).addScaledVector(ou, Math.cos(a) * th * 0.5); });
    };
    const rings = Array.from({ length: segs + 1 }, (_, i) => ring(i));
    const cutOn = carries && R() < cut.rate;
    const jit = (R() - 0.5) * 0.1;
    for (let i = 0; i < segs; i++) {
      const u = (i + 0.5) / segs;
      for (let k = 0; k < NS; k++) {
        const k2 = (k + 1) % NS;
        // the three front faces are lanes 0, 1, 2 (k = 5, 0, 1); each lane's cut is shifted by the slant
        let hi = false;
        if (cutOn && FRONT[k]) { const lane = k === 5 ? 0 : k === 0 ? 1 : 2; const a = cut.at[0] + jit + cut.slant * (lane - 1), b = cut.at[1] + jit + cut.slant * (lane - 1); hi = u >= a && u <= b; }
        // a darker tone on the far side so the clump reads as a solid
        const back = !FRONT[k] ? 0.82 : 1;
        const c = hi ? col.hi : col.base.clone().multiplyScalar(back), sh = col.shade;
        const A = rings[i][k], B = rings[i][k2], Cc = rings[i + 1][k], D = rings[i + 1][k2];
        for (const v of [A, B, Cc, B, D, Cc]) { pos.push(v.x, v.y, v.z); aCol.push(c.r, c.g, c.b); aShade.push(sh.r, sh.g, sh.b); }
      }
    }
    clumps.push({ p0, L });
  };

  const placeRoot = (phi, th) => { // a point and normal on the scalp ellipsoid at polar phi (from +y) and azimuth th (from +z toward +x)
    const x = Math.sin(phi) * Math.sin(th), y = Math.cos(phi), z = Math.sin(phi) * Math.cos(th);
    const p = new Vector3(C.x + x * sc.r[0], C.y + y * sc.r[1], C.z + z * sc.r[2]);
    const n = new Vector3(x / sc.r[0], y / sc.r[1], z / sc.r[2]).normalize();
    return [p, n];
  };
  const sweepV = new Vector3(...(spec.sweep ?? [0, 0, 0]));
  const count = spec.count ?? 16, layers = spec.layers ?? 2;
  for (let l = 0; l < layers; l++) {
    const inner = 1 - l * 0.28;
    for (let i = 0; i < count; i++) {
      const [p0a, p1a] = spec.band ?? [0.1, 1.2], [th0, th1] = spec.sector ?? [-Math.PI, Math.PI];
      // low-discrepancy roots (golden angle) so clumps do not bunch
      const phi = p0a + (p1a - p0a) * ((i * 0.618 + l * 0.31 + R() * 0.15) % 1);
      const th = th0 + (th1 - th0) * ((i * 0.7548 + l * 0.17 + R() * 0.12) % 1);
      const [p0, n] = placeRoot(phi, th);
      const tangent = new Vector3(Math.cos(phi) * Math.sin(th), -Math.sin(phi), Math.cos(phi) * Math.cos(th)).normalize(); // down the scalp
      const lift = spec.lift ?? 0.4;
      const d0 = tangent.clone().multiplyScalar(1 - lift).addScaledVector(n, lift).add(sweepV.clone().multiplyScalar(0.6)).normalize();
      const L = ((spec.length?.[0] ?? 0.14) + R() * ((spec.length?.[1] ?? 0.24) - (spec.length?.[0] ?? 0.14))) * s * inner;
      addClump(p0, n, d0, L, spec.width ?? 0.07, spec.spike, spec.droop ?? 0.2, (spec.curl ?? 0) * (R() < 0.5 ? -1 : 1), l === 0);
    }
  }
  // special lock groups: a ponytail or twin tails (a fan of long clumps from one anchor), a fringe, a mohawk ridge
  const fan = (cfg, mirror) => {
    for (const sx of mirror ? [1, -1] : [1]) {
      const at = new Vector3(cfg.at[0] * sx, cfg.at[1], cfg.at[2]);
      for (let i = 0; i < (cfg.n ?? 6); i++) {
        const a = (i / Math.max(1, (cfg.n ?? 6) - 1) - 0.5) * 0.9;
        const d0 = new Vector3(0.55 * sx + Math.sin(a) * 0.4, -0.55, -0.35 + Math.cos(a) * 0.2).add(new Vector3(...(cfg.sweep ?? [0, 0, 0])).multiplyScalar(0.5)).normalize();
        addClump(at.clone().add(new Vector3(Math.sin(a) * 0.03, R() * 0.02, 0)), new Vector3(0, 0.3, -1).normalize(), d0, (cfg.length ?? 0.5) * s * (0.85 + R() * 0.3), cfg.width ?? 0.07, 0.25, 0.4, 0.05 * (R() < 0.5 ? -1 : 1), i % 2 === 0);
      }
    }
  };
  if (spec.tail) fan(spec.tail, !!spec.tail.mirror);
  if (spec.fringe) for (let i = 0; i < spec.fringe.n; i++) {
    const at = new Vector3(spec.fringe.at[0] + (i - 0.5) * 0.05, spec.fringe.at[1], spec.fringe.at[2]);
    const d0 = new Vector3(...spec.fringe.sweep).add(new Vector3((R() - 0.5) * 0.3, 0, 0)).normalize();
    addClump(at, new Vector3(0, 0.6, 0.8).normalize(), d0, spec.fringe.length * s, 0.05, 0.5, 0.35, 0.02, true);
  }
  if (spec.ridge) for (let i = 0; i < spec.ridge.n; i++) {
    const th = Math.PI * (i / (spec.ridge.n - 1)), [p0, n] = placeRoot(0.5 + 0.4 * Math.cos(th), 0.0 + (i / spec.ridge.n - 0.5) * 0.3);
    addClump(p0, n, new Vector3(0, 1, -0.3 + i * 0.07).normalize(), spec.ridge.length * s, spec.ridge.width, 0.7, 0, 0, true);
  }

  const g = new BufferGeometry();
  const N = pos.length / 3;
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.computeVertexNormals(); // per-triangle (non-indexed): flat faces, which is what hard cel cuts want
  g.setAttribute("aCol", new BufferAttribute(new Float32Array(aCol), 3));
  g.setAttribute("aShade", new BufferAttribute(new Float32Array(aShade), 3));
  const xrd = new Float32Array(N * 3); for (let i = 0; i < N; i++) { xrd[3 * i] = 0.5; xrd[3 * i + 1] = 0.8; xrd[3 * i + 2] = 1; } // id 1: hair (angel ring)
  g.setAttribute("aXrd", new BufferAttribute(xrd, 3));
  g.setAttribute("aBlob", new BufferAttribute(new Float32Array(N * 4), 4));
  const bn = new Float32Array(N * 3); for (let i = 0; i < N; i++) bn[3 * i + 1] = 1;
  g.setAttribute("aBlobN", new BufferAttribute(bn, 3));
  g.userData.clumps = clumps;
  return g;
}

// a hair figure ready to parent to a head: surface + ink hull, the ring following `head` (call engine.syncFaces after moving)
export function hairMesh(engine, spec, head = HEAD_FRAME, o = {}) {
  const geo = hairClumps(spec);
  const fig = engine.figure(geo, { head, lineMul: o.lineMul ?? 0.7, ink: o.ink, constant: true });
  fig.userData.geo = geo;
  fig.name = "hair";
  return fig;
}
