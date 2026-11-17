// PARTS for the Eren (Rumbling) look: the cream tunic band with a notched hem and fold creases, the brown belt
// with its buckle, the spiral cloth wraps on both fore flippers, and the half-bun with its tie. Small exact meshes
// laid on the torso field by bisection; each is a figure the hero attaches to a pivot.
import { CatmullRomCurve3, SphereGeometry, TorusGeometry, TubeGeometry, Vector3, BoxGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { paint, polygonize } from "../../../sdf.js";
import { TORSO, DOME, cached, darker, fieldOf, piece, torsoRow } from "../body.js";

export const TUNIC = "#d6c39b", TUNIC_SH = "#9a7f58", LEATHER = "#4a2f1c", WRAP = "#6a4a30", HAIR = "#3a2616", HAIR_SH = "#1f1209", HAIR_HI = "#8a5e36";
const G = 0.016, GB = 0.024, Y0 = 0.085, Y1 = 0.29, BY0 = 0.158, BY1 = 0.205;
const TF = (g) => fieldOf(Object.keys(TORSO).map((n) => torsoRow(n, null, g)));
const FT = TF(G), FB = TF(GB);
const tube = (pts, r, seg = 32) => new TubeGeometry(new CatmullRomCurve3(pts), seg, r, 6, false);
const ni = (g) => (g.index ? g.toNonIndexed() : g);
const merge = (parts) => mergeGeometries(parts.map(ni));

function along(F, o, d, far = 0.7) {
  let a = 0, b = far;
  for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (F(o.x + d.x * m, o.y + d.y * m, o.z + d.z * m) < 0) a = m; else b = m; }
  return (a + b) / 2;
}
const onTorso = (F, th, y, lift = 0) => { const d = new Vector3(Math.sin(th), 0, Math.cos(th)), o = new Vector3(0, y, -0.02); return o.addScaledVector(d, along(F, o, d) + lift); };

function build(engine, geo, ink, lineMul = 1.3, head = null) {
  const fig = engine.figure(geo, head ? { ink, lineMul, head } : { ink, lineMul });
  fig.userData.hull.uniforms.uConst.value = 1;
  return fig;
}

// hem height wobbles round the body so the cut edge reads as cloth, not a ruler line
const hem = (x, z) => Y0 + 0.014 * Math.abs(Math.sin(Math.atan2(x, z) * 4.5));

export function tunic(engine) {
  const geo = cached("eren|tunic", () => {
    const m = paint(TUNIC, TUNIC_SH), F = fieldOf(Object.keys(TORSO).map((n) => torsoRow(n, m, G)));
    const body = polygonize([{ f: (x, y, z) => Math.max(F(x, y, z) + G * 0.85 * Math.min(1, Math.max(0, (y - 0.19) / 0.1)), hem(x, z) - y, y - Y1), m, k: 0, lo: [-0.45, 0, -0.4], hi: [0.45, 0.6, 0.4] }], 0.007);
    const parts = [body], shade = darker(TUNIC_SH, 0.85);
    // fold creases: long curves leaving the belt, three per side, drawn dark
    for (const s of [1, -1]) for (let i = 0; i < 3; i++) {
      const th = s * (0.35 + 0.5 * i), pts = [];
      for (let k = 0; k <= 5; k++) pts.push(onTorso(FT, th + s * 0.08 * Math.sin(k * 0.9 + i), 0.16 - k * 0.014, 0.0025));
      parts.push(piece(tube(pts, 0.0028, 20), shade, darker(shade, 0.6)));
    }
    // the neck edge: a rolled hem along the top
    const top = []; for (let i = 0; i <= 48; i++) top.push(onTorso(FT, -Math.PI + (i / 48) * Math.PI * 2, Y1 - 0.003, 0.004));
    parts.push(piece(new TubeGeometry(new CatmullRomCurve3(top, true), 96, 0.0075, 6, true), darker(TUNIC, 0.94), TUNIC_SH));
    return merge(parts);
  });
  return build(engine, geo, "#3a2616");
}

// two chest straps crossing from the shoulders to the opposite ribs, each with a buckle card, over the jacket
export function harness(engine) {
  const geo = cached("eren|harness", () => {
    const parts = [];
    for (const s of [1, -1]) {
      const pts = [0, 1, 2, 3, 4].map((i) => onTorso(FB, s * (0.62 - 0.31 * i), 0.4 - 0.05 * i, 0.034));
      parts.push(piece(tube(pts, 0.0105, 24), LEATHER, darker(LEATHER, 0.5)));
      const b = pts[3];
      parts.push(piece(new BoxGeometry(0.03, 0.034, 0.008).translate(b.x, b.y, b.z + 0.006), "#b78764", "#6e4a30"));
    }
    return merge(parts);
  });
  return build(engine, geo, "#241408");
}

export function belt(engine) {
  const geo = cached("eren|belt", () => {
    const m = paint(LEATHER, darker(LEATHER, 0.5)), F = fieldOf(Object.keys(TORSO).map((n) => torsoRow(n, m, GB)));
    const strap = polygonize([{ f: (x, y, z) => Math.max(F(x, y, z), BY0 - y, y - BY1), m, k: 0, lo: [-0.45, 0, -0.4], hi: [0.45, 0.6, 0.4] }], 0.006);
    const p = onTorso(FB, 0, (BY0 + BY1) / 2, 0.0), parts = [strap];
    const buckle = new BoxGeometry(0.05, 0.05, 0.01).translate(p.x, p.y, p.z + 0.004);
    const hole = new BoxGeometry(0.03, 0.028, 0.012).translate(p.x, p.y, p.z + 0.006);
    parts.push(piece(buckle, "#b78764", "#6e4a30"), piece(hole, LEATHER, darker(LEATHER, 0.5)));
    const t = [onTorso(FB, 0.12, 0.18, 0.004), onTorso(FB, 0.16, 0.13, 0.014), onTorso(FB, 0.2, 0.085, 0.01)];
    parts.push(piece(tube(t, 0.011, 12), LEATHER, darker(LEATHER, 0.5)));
    return merge(parts);
  });
  return build(engine, geo, "#241408");
}

// a spiral cloth wrap round the fore flipper (pivot-local: elbow at the origin, wrist 0.14 below), cuff at the wrist
export function wrap(engine) {
  const geo = cached("eren|wrap", () => {
    const parts = [], pts = [], turns = 2.4, N = 40, rad = (y) => 0.0525 - 0.0145 * (-y / 0.14);
    for (let i = 0; i <= N; i++) { const u = i / N, a = u * turns * Math.PI * 2, y = -0.045 - u * 0.075, r = rad(y) + 0.003; pts.push(new Vector3(Math.sin(a) * r, y, Math.cos(a) * r)); }
    parts.push(piece(tube(pts, 0.0072, 80), WRAP, darker(WRAP, 0.55)));
    parts.push(piece(new TorusGeometry(rad(-0.13) + 0.002, 0.0062, 6, 32).rotateX(Math.PI / 2).translate(0, -0.13, 0), darker(WRAP, 0.8), darker(WRAP, 0.45)));
    parts.push(piece(new TorusGeometry(rad(-0.035) + 0.002, 0.0055, 6, 32).rotateX(Math.PI / 2).translate(0, -0.035, 0), darker(WRAP, 0.85), darker(WRAP, 0.45)));
    return merge(parts);
  });
  return build(engine, geo, "#2a1a0e", 1.1);
}

// the half bun on the crown rear: a knot of wound locks, its tie, and two loose tail ends
export function bun(engine) {
  const geo = cached("eren|bun", () => {
    const c = new Vector3(0, 0.352, -0.105), parts = [];
    parts.push(piece(new SphereGeometry(0.07, 20, 14).scale(1, 0.92, 1).translate(c.x, c.y, c.z), HAIR, HAIR_SH, { id: 1 }));
    // wound locks: tilted great-circle arcs over the knot, in the highlight tone
    for (let i = 0; i < 4; i++) {
      const tilt = 0.5 + i * 0.55, pts = [];
      for (let k = 0; k <= 12; k++) { const a = -1.15 + (k / 12) * 2.3; pts.push(new Vector3(Math.sin(a) * 0.073, Math.cos(a) * 0.073 * Math.cos(tilt) * 0.92, Math.cos(a) * 0.073 * Math.sin(tilt) + 0).add(c)); }
      parts.push(piece(tube(pts, 0.0052, 14), i % 2 ? HAIR_HI : darker(HAIR, 1.5), HAIR_SH, { id: 1 }));
    }
    parts.push(piece(new TorusGeometry(0.066, 0.0085, 6, 28).rotateX(Math.PI / 2).translate(c.x, c.y - 0.045, c.z), "#1a120c", "#0c0804"));
    return merge(parts);
  });
  return build(engine, geo, "#1a120c", 0.8, { pos: DOME.c, fwd: [0, 0, 1], right: [1, 0, 0], r: DOME.r[0] + 0.03 });
}
