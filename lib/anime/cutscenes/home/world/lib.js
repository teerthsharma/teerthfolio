// WORLD helpers (candidates for promotion: painted-merge, makeCap). Painting a mesh = the aCol / aShade / aXrd attributes the
// one anime program reads (sdf.js painted()). Parts are painted one by one, then merged WITH those attributes (kit3d.merge
// would drop them), so one draw call keeps many colours.
import { Color, Euler, Matrix4, Quaternion, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { paint, painted } from "../../../sdf.js";

// paint one geometry: lit colour, shadow colour (a violet-shifted tone, never grey), optional bias (+ brighter shading) and id
export function P(geo, col, shade, o = {}) {
  geo = geo.index ? geo.toNonIndexed() : geo;
  if (geo.attributes.uv) geo.deleteAttribute("uv");
  if (!geo.attributes.normal) geo.computeVertexNormals();
  return painted(geo, paint(col, shade ?? col, { line: 0, id: o.id ?? 0, bias: o.bias ?? 0.5 }));
}
export function mergePainted(parts, name = "parts") {
  const out = mergeGeometries(parts);
  if (!out) throw new Error(`world/lib mergePainted failed: ${name}`);
  return out;
}
// move a geometry to (x, y, z), yawed ry, tilted rz, scaled s
const M = new Matrix4(), Qn = new Quaternion(), E = new Euler(), V3 = new Vector3(), S3 = new Vector3();
export const at = (g, x, y, z, ry = 0, s = 1, rz = 0, rx = 0) => {
  Qn.setFromEuler(E.set(rx, ry, rz, "YXZ"));
  M.compose(V3.set(x, y, z), Qn, S3.set(s, s, s));
  return g.applyMatrix4(M);
};
// sRGB hex -> three Color (linear working space, matches paint.js V())
export const col = (h) => new Color(h);
export const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
// dispose a Group's geometry and materials
export function disposeTree(root) {
  root.traverse((o) => {
    o.userData?.dispose?.();
    if (o.geometry && !o.userData?.sharedGeo) o.geometry.dispose?.();
    if (o.material && !o.userData?.sharedMat) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose?.());
  });
}
