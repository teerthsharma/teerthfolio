// PROPS: things held in a hand or floating near it, built in the WRIST frame (origin at the wrist, fingers along -y,
// palm toward -x, thumb toward +z; the grip point is about [-0.012, -0.05, 0]). Pure geometry, painted like the
// outfit. `propFigure(engine, kind, o)` gives a mesh to `hero.attach(mesh, "handR" | "handL")`; mirror it for the left.
import { CatmullRomCurve3, CylinderGeometry, ExtrudeGeometry, Shape, SphereGeometry, TorusGeometry, TubeGeometry, Vector3 } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { darker, piece } from "../body.js";
import { TAU, taper } from "./geo.js";

export const PROPS = ["coin", "notebook", "pencil", "kunai", "kunai3", "staff", "cord"];
const GRIP = [-0.012, -0.05, 0];
const ex = (shape, depth, bev = 0.0012) => new ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 1, curveSegments: 6 }).translate(0, 0, -depth / 2);
const P_ = (o, c, k = "col") => o[k] ?? c;

const BUILD = {
  // a coin floating palm-up over the hand: rim, a raised inner ring and a centre mark
  coin(o) {
    const c = P_(o, "#e6c24e"), r = o.r ?? 0.02, d = 0.0042, up = [GRIP[0] - 0.03, GRIP[1] + 0.01, 0];
    const face = (z) => [piece(new TorusGeometry(r * 0.72, 0.0012, 6, 28).translate(0, 0, z), darker(c, 0.75), darker(c, 0.45), { line: 0.3 }), piece(new TorusGeometry(r * 0.2, 0.0015, 6, 14).translate(0, 0, z), darker(c, 0.75), darker(c, 0.45), { line: 0.3 })];
    const parts = [piece(new CylinderGeometry(r, r, d, 28).rotateX(Math.PI / 2), c, darker(c, 0.5), { line: 1 }), piece(new TorusGeometry(r, d * 0.55, 6, 28), darker(c, 1.12), darker(c, 0.5), { line: 1 }), ...face(d * 0.52), ...face(-d * 0.52)];
    return parts.map((g) => g.toNonIndexed().rotateY(Math.PI / 2).translate(...up));
  },
  // a hardback notebook held at the fingers: cover, page block, spine, elastic band
  notebook(o) {
    const c = P_(o, "#a8121c"), w = o.w ?? 0.06, h = o.h ?? 0.086, t = o.t ?? 0.014, parts = [];
    parts.push(piece(new RoundedBoxGeometry(w, h, t, 3, 0.0035), c, darker(c, 0.5), { line: 1 }));
    parts.push(piece(new RoundedBoxGeometry(w - 0.004, h - 0.006, t * 0.62, 2, 0.002).translate(0.004, 0, 0), o.page ?? "#efe6cf", "#b9ad90", { line: 0.6 }));
    parts.push(piece(new RoundedBoxGeometry(0.006, h + 0.001, t + 0.002, 2, 0.002).translate(-w / 2 + 0.002, 0, 0), darker(c, 0.7), darker(c, 0.4), { line: 0.8 }));
    parts.push(piece(new RoundedBoxGeometry(0.006, h + 0.002, t + 0.003, 2, 0.0015).translate(w * 0.3, 0, 0), "#1b1316", "#0b0809", { line: 0.8 }));
    return parts.map((g) => g.toNonIndexed().rotateZ(Math.PI / 2).rotateX(0.2).translate(GRIP[0] - 0.01, GRIP[1] - 0.005, 0.01));
  },
  // a pencil held along z: hex body with a stripe, a ferrule and eraser, a wood cone and a graphite tip
  pencil(o) {
    const c = P_(o, "#e8b82a"), L = o.len ?? 0.1, r = 0.0045, parts = [];
    parts.push(piece(new CylinderGeometry(r, r, L, 6).rotateX(Math.PI / 2), c, darker(c, 0.55), { line: 0.9 }));
    parts.push(piece(new CylinderGeometry(r * 1.02, r * 1.02, L * 0.1, 6).rotateX(Math.PI / 2).translate(0, 0, -L * 0.3), darker(c, 0.6), darker(c, 0.35), { line: 0.5 }));
    parts.push(piece(new CylinderGeometry(r * 1.05, r * 1.05, 0.009, 10).rotateX(Math.PI / 2).translate(0, 0, -L / 2 - 0.0045), "#b9c0c8", "#6a7078", { line: 0.9 }));
    parts.push(piece(new CylinderGeometry(r * 0.98, r * 0.98, 0.008, 10).rotateX(Math.PI / 2).translate(0, 0, -L / 2 - 0.013), "#e48a96", "#a04a58", { line: 0.9 }));
    parts.push(piece(new CylinderGeometry(0.0006, r, 0.014, 6).rotateX(-Math.PI / 2).translate(0, 0, L / 2 + 0.007), "#e8cfa0", "#a88a5a", { line: 0.9 }));
    parts.push(piece(new CylinderGeometry(0.0002, 0.0017, 0.005, 6).rotateX(-Math.PI / 2).translate(0, 0, L / 2 + 0.0165), "#2a2a30", "#101014", { line: 0.5 }));
    return parts.map((g) => g.toNonIndexed().rotateX(o.tilt ?? 0.35).translate(GRIP[0] - 0.012, GRIP[1] + 0.005, 0.012));
  },
  // a kunai: leaf blade with a fuller line, a wrapped grip and a ring; blade points along +z, ring at -z
  kunai(o) {
    const s = new Shape(); s.moveTo(0, 0.07); s.quadraticCurveTo(0.016, 0.03, 0.012, 0); s.lineTo(0, -0.004); s.lineTo(-0.012, 0); s.quadraticCurveTo(-0.016, 0.03, 0, 0.07);
    const c = P_(o, "#b8c4d2"), wrap = o.wrap ?? "#2a2430", parts = [piece(ex(s, 0.0034), c, darker(c, 0.5), { line: 1 }), piece(ex(new Shape().moveTo(-0.0015, 0.062).lineTo(0.0015, 0.062).lineTo(0.0018, 0.01).lineTo(-0.0018, 0.01).closePath(), 0.0046, 0.0004), darker(c, 1.15), darker(c, 0.6), { line: 0.4 })];
    parts.push(piece(new CylinderGeometry(0.0062, 0.0062, 0.05, 10).translate(0, -0.027, 0), wrap, darker(wrap, 0.5), { line: 1 }));
    for (let i = 0; i < 5; i++) parts.push(piece(new TorusGeometry(0.0066, 0.0011, 5, 12).rotateX(Math.PI / 2).translate(0, -0.012 - i * 0.0085, 0), darker(wrap, 2), darker(wrap, 0.5), { line: 0.5 }));
    parts.push(piece(new TorusGeometry(0.0125, 0.0026, 6, 20).translate(0, -0.063, 0), c, darker(c, 0.5), { line: 1 }));
    return parts.map((g) => g.toNonIndexed().rotateX(-Math.PI / 2).rotateX(o.tilt ?? 0).translate(GRIP[0] - 0.006, GRIP[1] - 0.01 + 0.05, 0.004));
  },
  // the three-pronged kunai: one long blade between two shorter barbs, one shared grip
  kunai3(o) {
    const s = new Shape(); s.moveTo(0, 0.085); s.quadraticCurveTo(0.008, 0.05, 0.006, 0.014); s.lineTo(0.026, 0.05); s.lineTo(0.02, 0.0); s.lineTo(0.004, 0); s.lineTo(-0.004, 0); s.lineTo(-0.02, 0.0); s.lineTo(-0.026, 0.05); s.lineTo(-0.006, 0.014); s.quadraticCurveTo(-0.008, 0.05, 0, 0.085);
    const c = P_(o, "#b8c4d2"), wrap = o.wrap ?? "#2a2430", parts = [piece(ex(s, 0.0034), c, darker(c, 0.5), { line: 1 })];
    parts.push(piece(new CylinderGeometry(0.0062, 0.0062, 0.05, 10).translate(0, -0.027, 0), wrap, darker(wrap, 0.5), { line: 1 }), piece(new TorusGeometry(0.0125, 0.0026, 6, 20).translate(0, -0.063, 0), c, darker(c, 0.5), { line: 1 }));
    return parts.map((g) => g.toNonIndexed().rotateX(-Math.PI / 2).translate(GRIP[0] - 0.006, GRIP[1] + 0.04, 0.004));
  },
  // a staff on the hand's up axis: shaft, gold collars, and a head ring set with `gems` jewels
  staff(o) {
    const c = P_(o, "#26202c"), gold = o.gold ?? "#d9b34a", L = o.len ?? 0.9, n = o.gems ?? 7, gem = o.gem ?? "#d04858", parts = [];
    parts.push(piece(new CylinderGeometry(0.0095, 0.011, L, 12).translate(0, L / 2 - 0.3, 0), c, darker(c, 0.5), { line: 1 }));
    for (const y of [0.1, -0.05, L - 0.3 - 0.02]) parts.push(piece(new TorusGeometry(0.0125, 0.0036, 6, 16).rotateX(Math.PI / 2).translate(0, y, 0), gold, darker(gold, 0.5), { line: 0.9 }));
    const top = L - 0.3, R = 0.05;
    parts.push(piece(new TorusGeometry(R, 0.0055, 8, 36).rotateY(Math.PI / 2).translate(0, top + R, 0), gold, darker(gold, 0.5), { line: 1 }));
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU + Math.PI / 2; parts.push(piece(new SphereGeometry(0.0095, 10, 8).scale(1, 1.25, 1).translate(0, top + R + Math.sin(a) * (R + 0.002), Math.cos(a) * (R + 0.002)), gem, darker(gem, 0.5), { line: 0.9 })); }
    parts.push(piece(new SphereGeometry(0.018, 12, 8).translate(0, top + R, 0), gem, darker(gem, 0.5), { line: 1 }));
    for (const s of [1, -1]) parts.push(piece(taper([new Vector3(0, top, 0), new Vector3(0, top + 0.02, s * 0.025), new Vector3(0, top + R * 0.9, s * R * 0.9)], 0.006, 0.004, 8, 6), gold, darker(gold, 0.5), { line: 0.9 }));
    return parts.map((g) => g.toNonIndexed().translate(GRIP[0] - 0.012, GRIP[1] + 0.05, 0));
  },
  // a braided cord: two strands twisted round one path, tied off with a bead at the free end
  cord(o) {
    const c = P_(o, "#b0121c"), len = o.len ?? 0.3, parts = [], N = 70, pts = [], base = [GRIP[0] - 0.01, GRIP[1] - 0.01, 0];
    for (let i = 0; i <= 14; i++) { const t = i / 14; pts.push(new Vector3(base[0] - 0.02 * Math.sin(t * 3), base[1] - len * t, base[2] + 0.05 * Math.sin(t * 5) * t)); }
    const curve = new CatmullRomCurve3(pts), fr = curve.computeFrenetFrames(N, false), cp = curve.getPoints(N);
    for (const ph of [0, Math.PI]) {
      const sp = cp.map((p, i) => { const a = ph + i * 0.62; return p.clone().addScaledVector(fr.normals[i], Math.cos(a) * 0.0045).addScaledVector(fr.binormals[i], Math.sin(a) * 0.0045); });
      parts.push(piece(new TubeGeometry(new CatmullRomCurve3(sp), N * 2, 0.0034, 6, false), c, darker(c, 0.5), { line: 0.8 }));
    }
    const e = cp[N];
    parts.push(piece(new SphereGeometry(0.0085, 10, 8).translate(e.x, e.y - 0.006, e.z), darker(c, 1.3), darker(c, 0.5), { line: 0.9 }));
    parts.push(piece(taper([e, e.clone().add(new Vector3(0, -0.02, 0.004)), e.clone().add(new Vector3(0.002, -0.05, 0.008))], 0.004, 0.0015, 8, 5), c, darker(c, 0.5), { line: 0.7 }));
    return parts.map((g) => g.toNonIndexed());
  },
};

export function propGeometry(kind, o = {}) {
  const make = BUILD[kind];
  return make ? mergeGeometries(make(o).map((g) => (g.index ? g.toNonIndexed() : g))) : null;
}

// a figure the engine draws like the outfit, in the wrist frame, ready for hero.attach(mesh, "handR")
export function propFigure(engine, kind, o = {}) {
  const geo = propGeometry(kind, o);
  if (!geo) return null;
  const fig = engine.figure(geo, { ink: o.ink, lineMul: 1 });
  fig.userData.hull.uniforms.uConst.value = 1;
  return fig;
}
