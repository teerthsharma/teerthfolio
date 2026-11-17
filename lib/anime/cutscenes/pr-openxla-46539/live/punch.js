// Ported from moves/pr-openxla-46539/punch.js (the site's live move, read only). Imports point at this folder.
// The page's surfaces write alpha 0.99 (its line id); translucent materials pass through idSafe (support.js).
// The notes live with the original.
import { IcosahedronGeometry, SphereGeometry } from "three";
import { PAL } from "./print.js";
import { box, build, tag } from "./mesh.js";

export function gloveGeo() {
  return build([tag(new IcosahedronGeometry(0.46, 1), PAL.red), tag(new SphereGeometry(0.2, 6, 4).translate(0.3, 0.32, 0.12), PAL.red), tag(box(0.5, 0.28, 0.5, 0, -0.5, 0), PAL.gold)], 0.01);
}

export function applyPunch(f, k) {
  if (k <= 0) return;
  const e = f.rotation;
  f.rotation.set(e.x * (1 - k), e.y + (-0.35 - e.y) * k, e.z + (1.3 - e.z) * k, "YZX");
  f.position.x += 0.38 * k;
  f.position.y += 0.45 * k;
  f.scale.set(1 + 1.8 * k, 1 + 0.9 * k, 1 + 0.9 * k);
}

