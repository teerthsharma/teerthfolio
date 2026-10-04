// THE ISLAND'S SMALL MOVERS: the island's own animated props (the highway's cars, the geyser's drifting flakes) are
// instanced meshes of a few dozen pieces. Once the page tears they would drive and drift in front of the lens, over the
// pup's flex line and the credit card, so the move holds the near ones out of sight until the scene ends.
import { Matrix4, Vector3 } from "three";

const M = new Matrix4();
const P = new Vector3();

// the instanced meshes (at most `max` pieces) with a piece within r metres of (x, z), found once
export function nearMovers(objs, x, z, r = 60, max = 200) {
  const out = [];
  for (const o of objs) {
    o.traverse((c) => {
      if (!c.isInstancedMesh || c.count > max) return;
      c.updateWorldMatrix(true, false);
      for (let i = 0; i < c.count; i++) {
        c.getMatrixAt(i, M);
        P.setFromMatrixPosition(M).applyMatrix4(c.matrixWorld);
        if (Math.hypot(P.x - x, P.z - z) < r) {
          out.push(c);
          return;
        }
      }
    });
  }
  return out;
}
