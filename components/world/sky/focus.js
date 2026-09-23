// Where the camera is looking on the snow, and how far away that is: the
// sky's weather and birds gather there, whatever the camera is doing
// (following, swooping, the overview, a ?zoom capture).

import { Vector3 } from "three";

const dir = new Vector3();

// Fills out.x / out.z with the ground point under the view's centre and
// returns the camera's distance to it.
export function groundFocus(camera, out) {
  camera.getWorldDirection(dir);
  const down = Math.min(dir.y, -0.2); // never a ray that misses the ground
  const k = -camera.position.y / down;
  out.x = camera.position.x + dir.x * k;
  out.z = camera.position.z + dir.z * k;
  return Math.hypot(dir.x * k, camera.position.y, dir.z * k);
}
