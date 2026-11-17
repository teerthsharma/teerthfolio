// HERO PROPS: held objects as one small figure each, parented to a wrist. Local frame: the grip is at the
// origin and the grip axis is +z (the line the curled fingers wrap, so a blade or staff reads as held);
// `rot` [x, y, z] turns it, `at` [x, y, z] slides it, `len` scales its length. kinds: staff sword scroll orb fan cup.
import { CylinderGeometry, ExtrudeGeometry, LatheGeometry, Shape, SphereGeometry, TorusGeometry, Vector2 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { darker, piece } from "./body.js";

const alongZ = (g, z0 = 0) => g.rotateX(Math.PI / 2).translate(0, 0, z0);
const rod = (r, a, b, seg = 10) => alongZ(new CylinderGeometry(r, r, b - a, seg), (a + b) / 2);
const merge = (gs) => mergeGeometries(gs.map((g) => (g.index ? g.toNonIndexed() : g)));

const KINDS = {
  staff: (o) => { const L = 0.62 * (o.len ?? 1), c = o.col ?? "#6b4a2e", t = o.trim ?? "#d9b34a";
    return [piece(merge([rod(0.0095, -L * 0.3, L * 0.7), new TorusGeometry(0.03, 0.006, 8, 24).translate(0, 0, L * 0.72)]), c, o.shade), piece(merge([new SphereGeometry(0.014, 10, 8).translate(0, 0, L * 0.72 + 0.036)]), t, darker(t, 0.55))]; },
  sword: (o) => { const L = 0.5 * (o.len ?? 1), c = o.col ?? "#d8dce6", g = o.trim ?? "#c9a44a";
    const s = new Shape(); s.moveTo(-0.013, 0); s.lineTo(0.013, 0); s.lineTo(0.011, L); s.lineTo(0, L + 0.04); s.lineTo(-0.011, L); s.closePath();
    const blade = new ExtrudeGeometry(s, { depth: 0.006, bevelEnabled: false }).translate(0, 0, -0.003).rotateX(Math.PI / 2).translate(0, 0, 0.06);
    return [piece(blade, c, o.shade ?? darker(c, 0.6)), piece(merge([rod(0.011, -0.07, 0.05), new CylinderGeometry(0.011, 0.011, 0.07, 8).rotateZ(Math.PI / 2).translate(0, 0, 0.055), new SphereGeometry(0.016, 8, 6).translate(0, 0, -0.075)]), g, darker(g, 0.5))]; },
  scroll: (o) => [piece(merge([rod(0.021, -0.07, 0.07, 14), rod(0.027, -0.075, -0.06, 14), rod(0.027, 0.06, 0.075, 14)]), o.col ?? "#eadfc4", o.shade ?? "#b8a47e")],
  orb: (o) => [piece(new SphereGeometry(0.04 * (o.len ?? 1), 22, 16).translate(-0.045, -0.02, 0), o.col ?? "#7fd0ff", o.shade ?? "#2f78b8")],
  fan: (o) => { const s = new Shape(); s.moveTo(0, 0); for (let i = 0; i <= 12; i++) { const a = -1.0 + (2.0 * i) / 12; s.lineTo(Math.sin(a) * 0.17, Math.cos(a) * 0.17); } s.closePath();
    return [piece(new ExtrudeGeometry(s, { depth: 0.005, bevelEnabled: false }).translate(0, 0, -0.0025).rotateX(Math.PI / 2).translate(0, 0, 0.03), o.col ?? "#f1ede0", o.shade ?? "#b8aa8a"), piece(rod(0.006, -0.06, 0.03), o.trim ?? "#6b4a2e", o.shade)]; },
  cup: (o) => { const pts = [[0, 0], [0.026, 0], [0.034, 0.05], [0.036, 0.06], [0.03, 0.06], [0.022, 0.012], [0, 0.012]].map(([r, y]) => new Vector2(r, y)); return [piece(new LatheGeometry(pts, 18).rotateX(Math.PI / 2).translate(0, 0, -0.03), o.col ?? "#e9e2d0", o.shade ?? "#a89f8a")]; },
};

// every figure of one prop spec, placed in wrist-local space for the hand on `side` (+1 right, -1 left)
export function propGeometries(o, side) {
  const g = (KINDS[o.kind] ?? KINDS.staff)(o), [rx, ry, rz] = o.rot ?? [0, 0, 0], at = o.at ?? [0, 0, 0];
  return g.map((m) => m.rotateX(rx).rotateY(ry * side).rotateZ(rz * side).translate(side * (-0.012 + at[0]), -0.05 + at[1], at[2]));
}
