// ACCESSORIES: everything worn on the head, head-local (origin at the neck joint). Each builder takes colours and
// sizes and returns geometries painted with piece(); headwearGeometry merges them with the hair. Bands ride the
// head field raised by RAISE so they sit proud of the hair cap rather than inside it.
import { CatmullRomCurve3, ExtrudeGeometry, Matrix4, Quaternion, Shape, SphereGeometry, TorusGeometry, TubeGeometry, Vector3 } from "three";
import { ell, paint, polygonize, cone } from "../../../sdf.js";
import { horn } from "../../../kit3d.js";
import { DOME, darker, fieldOf, piece } from "../body.js";
import { HF, TAU, band, normalAt, onF, taper, tube } from "./geo.js";

const RAISE = 0.013;
const HR = (x, y, z) => HF(x, y, z) - RAISE;
const HC = [0, 0.17, 0];

export function mirrorN(g) {
  const m = g.clone();
  for (const a of Object.values(m.attributes)) { const n = a.itemSize, arr = a.array; for (let t = 0; t < a.count; t += 3) for (let k = 0; k < n; k++) { const i1 = (t + 1) * n + k, i2 = (t + 2) * n + k; [arr[i1], arr[i2]] = [arr[i2], arr[i1]]; } }
  const p = m.attributes.position.array, nr = m.attributes.normal.array;
  for (let i = 0; i < p.length; i += 3) { p[i] = -p[i]; nr[i] = -nr[i]; }
  return m;
}
const gold = (o, c = "#e3bf55") => [o.col ?? c, o.shade ?? darker(o.col ?? c, 0.5)];
const at = (F, th, y, lift = 0, c = HC) => onF(F, c, th, y, lift);
// orient a geometry built facing +z onto the surface at p
function onSurface(g, F, p, lift = 0, roll = 0) {
  const n = normalAt(F, p), q = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), n).multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), roll));
  return g.applyMatrix4(new Matrix4().compose(p.clone().addScaledVector(n, lift), q, new Vector3(1, 1, 1)));
}
const rounded = (w, h, r) => { const s = new Shape(), x = -w / 2, y = -h / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; };
const flatPlate = (w, h, d, r = 0.006) => new ExtrudeGeometry(rounded(w, h, r), { depth: d, bevelEnabled: true, bevelThickness: d * 0.35, bevelSize: d * 0.35, bevelSegments: 2, curveSegments: 5 }).translate(0, 0, -d / 2);
// plate bent round the head: z falls away with x squared
const bentPlate = (w, h, d, bend) => { const g = flatPlate(w, h, d); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) - bend * p.getX(i) ** 2); g.computeVertexNormals(); return g; };

function knot(F, th, y, col, shade) {
  const p = at(F, th, y, 0.016), out = [piece(new SphereGeometry(0.017, 12, 8).scale(1, 0.9, 0.8).translate(p.x, p.y, p.z), col, shade)];
  for (const k of [-1, 1]) out.push(piece(taper([p, p.clone().add(new Vector3(k * 0.04, -0.05, -0.025)), p.clone().add(new Vector3(k * 0.075, -0.13, -0.03))], 0.011, 0.004, 14, 6), col, shade));
  return out;
}

export const ACC = {
  horns(o) {
    // a crescent from the side of the head: it leaves outward and curls up toward the tip
    const r = horn(o.r ?? 0.03, o.h ?? 0.22, o.bend ?? -0.75, 14, 0).applyMatrix4(new Matrix4().makeRotationFromQuaternion(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), o.lean ?? -1.05).premultiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -0.15)))).translate(0.15, 0.25, 0.02);
    const g = piece(r, ...gold(o));
    return [g, mirrorN(g)];
  },
  // `up`: pushed up over the brow and hair, with a knot at the back; worn: across the eyes
  blindfold(o) {
    const [c, s] = gold(o, "#1d1a22"), up = o.up;
    const out = [piece(band(HR, [0, 0, 0], up ? 0.262 : 0.18, up ? 0.308 : 0.248, 0.012, { tilt: up ? 0.02 : 0 }), c, s)];
    if (up) out.push(piece(band(HR, [0, 0, 0], 0.258, 0.264, 0.014, { tilt: 0.02 }), darker(c, 1.5), s), ...knot(HR, Math.PI, 0.285, c, s).map((g) => g));
    else out.push(...knot(HR, Math.PI, 0.215, c, s));
    return out;
  },
  headband(o) {
    const [c, s] = gold(o, "#30303a"), out = [piece(band(HR, [0, 0, 0], 0.25, 0.285, 0.012, { tilt: 0.022 }), c, s)];
    out.push(piece(band(HR, [0, 0, 0], 0.248, 0.254, 0.014, { tilt: 0.022 }), darker(c, 1.35), s), ...knot(HR, Math.PI + 0.2, 0.262, c, s));
    if (o.heart) out.push(piece(onSurface(new SphereGeometry(0.014, 12, 8).scale(1.2, 1.1, 0.35), HR, at(HR, 0, 0.253), 0.012), o.heart, darker(o.heart, 0.5)));
    return out;
  },
  // a forehead protector: cloth band, a bent metal plate with a rim and an engraved spiral-and-line mark
  protector(o) {
    const [c, s] = gold(o, "#1b2438"), metal = o.metal ?? "#b9c2cf", p = at(HR, 0, 0.255, 0.004), out = [piece(band(HR, [0, 0, 0], 0.245, 0.275, 0.011, { tilt: 0.022 }), c, s)];
    out.push(...knot(HR, Math.PI + 0.1, 0.26, c, s));
    const plate = onSurface(bentPlate(0.108, 0.034, 0.008, 3.6), HR, p, 0.008);
    out.push(piece(plate, metal, darker(metal, 0.55), { line: 1 }));
    const mark = (g) => piece(onSurface(g, HR, p, 0.0165), o.mark ?? "#4a5468", "#2a3040", { line: 0.4 });
    const sp = new TorusGeometry(0.0095, 0.0017, 6, 24, TAU * 0.8);
    out.push(mark(sp.translate(0, 0, 0)), mark(new TorusGeometry(0.005, 0.0016, 6, 16, TAU * 0.8).translate(0.002, 0, 0)), mark(new SphereGeometry(0.0019, 6, 4).translate(-0.0045, 0.0014, 0)));
    return out;
  },
  circlet(o) {
    const [c, s] = gold(o), out = [piece(band(HR, [0, 0, 0], 0.278, 0.302, 0.009), c, s), piece(band(HR, [0, 0, 0], 0.276, 0.281, 0.011), darker(c, 1.2), s)];
    const p = at(HR, 0, 0.29, 0.007);
    out.push(piece(onSurface(new SphereGeometry(0.0125, 14, 10).scale(1, 1.15, 0.75), HR, p, 0.004), o.gem ?? "#d83a4a", darker(o.gem ?? "#d83a4a", 0.5), { line: 0.8 }));
    return out;
  },
  crown(o) {
    const [c, s] = gold(o), out = [piece(band(HR, [0, 0, 0], 0.283, 0.318, 0.011), c, s), piece(band(HR, [0, 0, 0], 0.28, 0.287, 0.013), darker(c, 1.2), s)];
    for (let i = -2; i <= 2; i++) { const p = at(HR, i * 0.42, 0.315, 0.006); out.push(piece(horn(0.016, 0.06 - Math.abs(i) * 0.008, 0, 4).translate(p.x, p.y, p.z), c, s)); }
    return out;
  },
  // `r` hoop radius; `drop` hangs a bead on a short chain; `stud` a flat disc
  earrings(o) {
    const [c, s] = gold(o), out = [];
    if (o.stud) out.push(piece(new SphereGeometry(o.r ?? 0.014, 12, 8).scale(1, 1, 0.45).rotateY(Math.PI / 2).translate(0.196, 0.012, 0.07), c, s, { line: 0.9 }));
    else out.push(piece(new TorusGeometry(o.r ?? 0.03, 0.0055, 8, 28).rotateY(Math.PI / 2).translate(0.188, 0.012, 0.07), c, s));
    if (o.drop) out.push(piece(new SphereGeometry(0.011, 10, 8).translate(0.195, -0.034, 0.07), o.dropCol ?? "#c8283a", darker(o.dropCol ?? "#c8283a", 0.5), { line: 0.9 }), piece(tube([new Vector3(0.195, -0.004, 0.07), new Vector3(0.196, -0.022, 0.07)], 0.0025, 4), c, s));
    return out.flatMap((g) => [g.toNonIndexed(), mirrorN(g.toNonIndexed())]);
  },
  studs: (o) => ACC.earrings({ ...o, stud: true }),
  // a flower hair clip pinned to the side of the head
  clip(o) {
    const F = HR, p = at(F, o.th ?? 1.0, o.y ?? 0.27, 0.004), petal = (a) => new SphereGeometry(0.012, 10, 7).scale(1, 1.25, 0.5).translate(Math.sin(a) * 0.017, Math.cos(a) * 0.017, 0);
    const pet = Array.from({ length: 5 }, (_, i) => petal((i / 5) * TAU));
    const out = pet.map((g) => piece(onSurface(g, F, p, 0.006), o.col ?? "#f3a6c2", darker(o.col ?? "#f3a6c2", 0.6), { line: 0.8 }));
    out.push(piece(onSurface(new SphereGeometry(0.0085, 10, 8).scale(1, 1, 0.7), F, p, 0.012), o.centre ?? "#f6d36a", "#a8832a", { line: 0.8 }));
    return out;
  },
  glasses(o) {
    const c = o.col ?? "#241d28", s = darker(c, 0.5), R = o.r ?? 0.047, out = [];
    for (const k of [1, -1]) {
      out.push(piece(new TorusGeometry(R, 0.0032, 6, 36).rotateY(-k * 0.28).translate(k * 0.083, 0.203, 0.216), c, s, { line: 0.8 }));
      out.push(piece(tube([new Vector3(k * 0.13, 0.205, 0.206), new Vector3(k * 0.19, 0.205, 0.16), new Vector3(k * 0.197, 0.2, 0.06)], 0.0028, 14), c, s, { line: 0.7 }));
    }
    out.push(piece(tube([new Vector3(-0.036, 0.212, 0.222), new Vector3(0, 0.222, 0.228), new Vector3(0.036, 0.212, 0.222)], 0.0028, 10), c, s, { line: 0.7 }));
    return out.map((g) => g.toNonIndexed());
  },
  // `point` > 0 draws the hood to a pointed tip that lies back; the opening edge is a rolled trim
  hood(o) {
    const c = o.col ?? "#e8e4dc", pt = o.point ?? 0, m = paint(c, o.shade ?? darker(c, 0.62)), R = DOME.r, K = 0.05;
    const mk = (g, inner) => { const pr = [ell(DOME.c, R.map((v) => v + g), m, 0)]; if (pt) pr.push(cone([0, DOME.c[1] + R[1] * 0.6, -0.02], [0, DOME.c[1] + R[1] + pt * (inner ? 0.55 : 1), -0.08 - pt * 0.5 * (inner ? 0.55 : 1)], 0.09 + g * 0.6, inner ? 0.02 : 0.03, m, K)); return fieldOf(pt ? [{ ...pr[0], k: K }, pr[1]] : pr); };
    const outer = mk(0.032), inner = mk(0.014, true);
    const lo = [-0.3, -0.05, -0.4], hi = [0.3, DOME.c[1] + R[1] + pt + 0.1, 0.3];
    const sheet = { f: (x, y, z) => Math.max(outer(x, y, z), -inner(x, y, z), z - 0.07, -0.03 - y), m, k: 0, lo, hi };
    const out = [polygonize([sheet], 0.008)], pts = [], rz = 0.07 - DOME.c[2], zz = R[2] + 0.023, sc = Math.sqrt(Math.max(0, 1 - (rz / zz) ** 2));
    for (let i = 0; i <= 64; i++) { const a = -0.2 + (i / 64) * (Math.PI + 0.4), x = (R[0] + 0.023) * sc * Math.cos(a), y = DOME.c[1] + (R[1] + 0.023) * sc * Math.sin(a); if (y > -0.025) pts.push(new Vector3(x, y, 0.07)); }
    if (pts.length > 3) out.push(piece(new TubeGeometry(new CatmullRomCurve3(pts), 80, 0.008, 6, false), o.trim ?? darker(c, 1.1), darker(c, 0.5), { line: 1 }));
    return out;
  },
};
