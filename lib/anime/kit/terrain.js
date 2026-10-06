// terrain: a heightfield mesh from any height function (metres).
//   terrain(h(x, z) -> y, [x0, x1], [z0, z1], [nx, nz]) -> BufferGeometry with normals and uv (u = x, v = z, 0..1)
//   onTerrain(h, x, z, sink) -> [x, h(x, z) - sink, z]: place a kit piece on the ground
import { PlaneGeometry } from "three";

export function terrain(h, xr, zr, res = [160, 160]) {
  const g = new PlaneGeometry(xr[1] - xr[0], zr[1] - zr[0], res[0], res[1]).rotateX(-Math.PI / 2)
    .translate((xr[0] + xr[1]) / 2, 0, (zr[0] + zr[1]) / 2);
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) P.setY(i, h(P.getX(i), P.getZ(i)));
  g.computeVertexNormals();
  return g;
}
export const onTerrain = (h, x, z, sink = 0) => [x, h(x, z) - sink, z];

export default { name: "terrain", doc: "heightfield mesh from any h(x, z) in metres, plus onTerrain() placement" };
