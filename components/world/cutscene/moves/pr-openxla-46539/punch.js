import { IcosahedronGeometry, SphereGeometry } from "three";
import { PAL } from "./print";
import { box, build, tag } from "./mesh";

// the glove on the fist: a red knuckled ball and a gold cuff, in ink
export function gloveGeo() {
  return build([tag(new IcosahedronGeometry(0.46, 1), PAL.red), tag(new SphereGeometry(0.2, 6, 4).translate(0.3, 0.32, 0.12), PAL.red), tag(box(0.5, 0.28, 0.5, 0, -0.5, 0), PAL.gold)], 0.01);
}

// THE RAISED FIST: the right flipper, stood up beside the head and stretched, so the fist rides clear above the
// head line (the default hooks keep a flipper below it, behind the cheek). k 0..1 blends from whatever pose the
// hooks left. Shared by the move and the stand-alone preview.
export function applyPunch(f, k) {
  if (k <= 0) return;
  const e = f.rotation;
  f.rotation.set(e.x * (1 - k), e.y + (-0.35 - e.y) * k, e.z + (1.3 - e.z) * k, "YZX");
  f.position.x += 0.38 * k;
  f.position.y += 0.45 * k;
  f.scale.set(1 + 1.8 * k, 1 + 0.9 * k, 1 + 0.9 * k);
}
