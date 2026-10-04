// THE CAMERA DIRECTOR: the kit's two-shot is the opening and the close; between them the lens glides (never
// cuts) through the places the brief names: down to the water for the orca, out along the fjord to Vinland,
// then a high diagonal over the farmstead and the eleven rim beacons. Positions are in the move's rig frame
// (the pup at the origin, the jetty along +x, the fjord's mouth toward -z). Allocates nothing per frame.

import { Vector3 } from "three";
import { smooth } from "../../../../../lib/world/cutscene/timeline";

// [time s, eye, look]: a shot holds until the next key's glide starts (each glide is the key's own time minus GLIDE)
const GLIDE = 0.9;
const A_WIDE = [[1.5, 1.25, 4.6], [-1.1, 0.95, -0.6]]; // the card's two-shot
const A_TALL = [[1.0, 1.4, 6.4], [-0.9, 0.95, -0.6]];
const B = [[4.8, 1.5, 13.0], [0.5, 0.5, -0.3]]; // the orca's circle, whole, from low on the water
const C = [[2.2, 1.7, 9], [-1, 3.4, -100]]; // out past the pup to the horizon: Vinland
const E_ = [[-2.5, 3.0, 6.5], [-12.6, 3.6, -7]]; // the igloo at the head of the farm, the longship beside it
const D = [[7, 3.6, 17], [-5, 1.6, -7]]; // the high diagonal: ship, longhouses, igloo, the rim beacons
const SHOTS = [
  [0, null],
  [4.6, null],
  [5.6, B],
  [13.4, C],
  [16.4, E_],
  [19.0, D],
  [29.8, D],
  [30.2, null],
];
const E = new Vector3();
const L = new Vector3();
const FWD = new Vector3();

// writes camera.position and orientation for the rig frame at (ox, oz); returns the weight (0..1)
export function directCamera(t, camera, ox, oz, tl) {
  const A = camera.aspect < 1 ? A_TALL : A_WIDE;
  let i = SHOTS.length - 1;
  while (i > 0 && t < SHOTS[i][0] - GLIDE) i--;
  const a = SHOTS[Math.max(0, i - 1)][1] ?? A;
  const b = SHOTS[i][1] ?? A;
  const k = i === 0 ? 1 : smooth(SHOTS[i][0] - GLIDE, SHOTS[i][0], t);
  E.set(a[0][0] + (b[0][0] - a[0][0]) * k, a[0][1] + (b[0][1] - a[0][1]) * k, a[0][2] + (b[0][2] - a[0][2]) * k);
  L.set(a[1][0] + (b[1][0] - a[1][0]) * k, a[1][1] + (b[1][1] - a[1][1]) * k, a[1][2] + (b[1][2] - a[1][2]) * k);
  // a slow drift so no frame is dead still
  E.x += 0.12 * Math.sin(t * 0.37);
  E.y += 0.05 * Math.sin(t * 0.51);
  E.x += ox;
  E.z += oz;
  L.x += ox;
  L.z += oz;
  const w = smooth(0.8, 1.3, t) * (1 - smooth(tl.collapse[0] + 0.2, tl.collapse[1] + 0.2, t));
  // the rig's own aim point (10 m ahead), blended onto ours by the weight
  FWD.set(0, 0, 0);
  camera.getWorldDirection(FWD).multiplyScalar(10).add(camera.position);
  camera.position.lerp(E, w);
  camera.lookAt(FWD.lerp(L, w));
  return w;
}
