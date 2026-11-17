// PARTS for the p-aether-lang look: the torn edge of Gojo's collar (flat shards on the rim, one figure on the body bone)
// and his black band pushed up across the hairline (the shared blindfold also hides the eyes, so this one does not).
import { ConeGeometry, Matrix4, Quaternion, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { DOME, darker, piece } from "../body.js";
import { HF, band, grown, normalAt, onF } from "../wear/geo.js";

const F = grown(0.03);
const INK = "#1a120c";

// [azimuth, height, length, width, lean]: azimuth 0 = front, + toward +x
const SHARDS = [[1.2, 0.465, 0.04, 0.016, 0.4], [1.55, 0.46, 0.032, 0.014, -0.2], [-1.35, 0.465, 0.036, 0.015, -0.3]];

export function tornCollar(engine) {
  const parts = SHARDS.map(([th, y, len, w, lean]) => {
    const p = onF(F, [0, 0, -0.02], th, y, 0.012), n = normalAt(F, p), up = new Vector3(0, 1, 0).addScaledVector(n, 0.4 + lean * 0.5).normalize();
    const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), up);
    return new ConeGeometry(w, len, 3, 1).translate(0, len / 2, 0).applyMatrix4(new Matrix4().compose(p, q, new Vector3(1, 1, 0.3)));
  });
  const fig = engine.figure(piece(mergeGeometries(parts), INK, darker(INK, 0.6)), { ink: INK, lineMul: 1.1 });
  fig.userData.hull.uniforms.uConst.value = 1;
  return fig;
}

// the band across the brow with a lighter edge line, hair springing from above it
export function blindfoldUp(engine, col) {
  const HR = (x, y, z) => HF(x, y, z) - 0.013;
  const g = mergeGeometries([piece(band(HR, [0, 0, 0], 0.272, 0.296, 0.01), col, darker(col, 0.6)), piece(band(HR, [0, 0, 0], 0.26, 0.266, 0.012), darker(col, 1.6), darker(col, 0.6))].map((x) => (x.index ? x.toNonIndexed() : x)));
  const fig = engine.figure(g, { ink: col, lineMul: 0.9, head: { pos: DOME.c, fwd: [0, 0, 1], right: [1, 0, 0], r: DOME.r[0] + 0.03 } });
  fig.userData.hull.uniforms.uConst.value = 1;
  return fig;
}
