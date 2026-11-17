// PARTS for the p-asmodeus look: the crew visor cap (band and curved brim), the yellow name tag, and the dark-gold
// pauldrons of the Demon Lord form. Each is a figure the hero attaches to its head or body pivot.
import { ExtrudeGeometry, Matrix4, Quaternion, Shape, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { cached, darker, piece } from "../body.js";
import { HF, TF, band, normalAt, onF } from "../wear/geo.js";

const RED = "#c8262c", WHITE = "#f2f0ea", INK = "#1c1014";
const HR = (x, y, z) => HF(x, y, z) - 0.013;

function build(engine, geo, lineMul = 1.1) {
  const fig = engine.figure(geo, { ink: INK, lineMul });
  fig.userData.hull.uniforms.uConst.value = 1;
  return fig;
}

// a flat curved plate: half-ellipse outline, bowed down at the sides, extruded thin
function brimGeo(w, d, thick, bow) {
  const s = new Shape();
  s.moveTo(-w, 0);
  for (let i = 0; i <= 24; i++) { const a = Math.PI * (1 - i / 24); s.lineTo(w * Math.cos(a), d * Math.sin(a)); }
  const g = new ExtrudeGeometry(s, { depth: thick, bevelEnabled: true, bevelThickness: thick * 0.4, bevelSize: thick * 0.4, bevelSegments: 2, curveSegments: 8 }).translate(0, 0, -thick / 2).rotateX(Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) - bow * p.getX(i) ** 2 - 0.1 * Math.max(0, p.getZ(i)));
  g.computeVertexNormals();
  return g;
}

// the crew cap: a red band round the head with a stiff brim at the front
export function visor(engine) {
  const geo = cached("asmodeus|visor", () => {
    const parts = [piece(band(HR, [0, -0.02, 0], 0.245, 0.285, 0.013, { tilt: 0.06 }), RED, darker(RED, 0.55), { line: 1 })];
    parts.push(piece(band(HR, [0, -0.02, 0], 0.243, 0.25, 0.0145, { tilt: 0.06 }), WHITE, darker(WHITE, 0.7), { line: 0.7 }));
    parts.push(piece(brimGeo(0.105, 0.115, 0.011, 2.4).translate(0, 0.252, 0.172).rotateX(0.06), RED, darker(RED, 0.55), { line: 1 }));
    return mergeGeometries(parts.map((g) => g.toNonIndexed()));
  });
  return build(engine, geo);
}

// a small plate lying on the chest at azimuth th, height y
const lying = (g, th, y, lift) => {
  const p = onF(TF, [0, 0, -0.02], th, y, lift), n = normalAt(TF, p), q = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), n);
  return g.applyMatrix4(new Matrix4().compose(p, q, new Vector3(1, 1, 1)));
};
// the name tag on the wearer's left chest: a yellow plate with a dark pin line
export function nameTag(engine) {
  const geo = cached("asmodeus|tag", () => {
    const plate = new ExtrudeGeometry(new Shape().moveTo(-0.034, -0.016).lineTo(0.034, -0.016).lineTo(0.034, 0.016).lineTo(-0.034, 0.016).closePath(), { depth: 0.004, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0015, bevelSegments: 1 });
    const mark = new ExtrudeGeometry(new Shape().moveTo(-0.024, -0.002).lineTo(0.024, -0.002).lineTo(0.024, 0.003).lineTo(-0.024, 0.003).closePath(), { depth: 0.002, bevelEnabled: false }).translate(0, 0.003, 0.006);
    return mergeGeometries([piece(lying(plate, 0.5, 0.31, 0.012), "#f4d24a", "#b8932a", { line: 1 }), piece(lying(mark, 0.5, 0.31, 0.012), "#6a4a14", "#3a2a0a", { line: 0.2 })].map((g) => g.toNonIndexed()));
  });
  return build(engine, geo, 0.9);
}

// two domed shoulder plates edged in dark gold
export function pauldrons(engine) {
  const geo = cached("asmodeus|pauldrons", () => {
    const parts = [];
    for (const s of [1, -1]) {
      const c = [0.25 * s, 0.46, 0.03], rot = new Matrix4().makeRotationZ(-0.5 * s);
      const dome = new SphereGeometry(0.125, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.55, 1).applyMatrix4(rot).translate(...c);
      const rim = new TorusGeometry(0.115, 0.0095, 8, 36).rotateX(Math.PI / 2).scale(1, 1, 1).applyMatrix4(rot).translate(...c);
      const ridge = new TorusGeometry(0.09, 0.0065, 6, 30).rotateX(Math.PI / 2).translate(0, 0.036, 0).applyMatrix4(rot).translate(...c);
      parts.push(piece(dome, "#2c2430", "#120c18", { line: 1 }), piece(rim, "#b8913c", "#6a5018", { line: 0.9 }), piece(ridge, "#b8913c", "#6a5018", { line: 0.6 }));
    }
    return mergeGeometries(parts.map((g) => g.toNonIndexed()));
  });
  return build(engine, geo, 1.2);
}
