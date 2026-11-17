// FIVE-FINGER HAND (right hand, hand-local metres: origin at the wrist, +y toward the fingertips, the palm faces -x, the thumb
// points back toward -z). Palm block, four three-joint fingers with knuckles and nails, a two-joint thumb. The left hand is this
// mesh mirrored. Hands are large against the head on purpose (the drawing's hands are as long as the face is tall).
import { cone, ell, paint, polygonize } from "../../../sdf.js";
import { recolor } from "./sculpt.js";

const FINGERS = [ // z of the base, total length, base radius, splay (z drift of the tip), curl toward the palm (x drift)
  { z: -0.04, len: 0.15, r: 0.0158, splay: -0.014, curl: -0.006 },
  { z: -0.0135, len: 0.166, r: 0.0165, splay: -0.005, curl: -0.008 },
  { z: 0.0135, len: 0.152, r: 0.0158, splay: 0.012, curl: -0.007 },
  { z: 0.038, len: 0.118, r: 0.014, splay: 0.03, curl: -0.004 },
];

export function handGeometry(look) {
  const sk = paint(look.hands.skin, look.hands.shade), nail = paint("#e4cdbd", "#9c8590"), prims = [];
  prims.push(cone([0, -0.03, 0], [0, 0.03, 0], 0.036, 0.04, sk, 0.04), ell([0.002, 0.058, 0], [0.021, 0.056, 0.047], sk, 0.05), ell([0.01, 0.09, 0], [0.016, 0.02, 0.047], sk, 0.03));
  const Y0 = 0.1;
  for (const f of FINGERS) {
    const cuts = [0, 0.46, 0.78, 1], pts = cuts.map((t, i) => [f.curl * (i / 3) ** 2 * 3 + (i === 3 ? 0.002 : 0), Y0 + f.len * t, f.z + f.splay * t]);
    for (let i = 0; i < 3; i++) {
      const r1 = f.r * (1 - 0.18 * i), r2 = f.r * (1 - 0.18 * (i + 1)) * (i === 2 ? 0.86 : 1);
      prims.push(cone(pts[i], pts[i + 1], r1, r2, sk, 0.0));
      if (i < 2) prims.push(ell(pts[i + 1], [r2 * 1.04, r2 * 1.04, r2 * 1.04], sk, 0.004));
    }
    const tip = pts[3], b = pts[2];
    prims.push(ell([tip[0] + f.r * 0.5, tip[1] - f.r * 0.7, tip[2]], [f.r * 0.2, f.r * 1.15, f.r * 0.66], nail, 0.0));
    void b;
  }
  prims.push(cone([0.0, 0.026, -0.05], [-0.008, 0.066, -0.084], 0.024, 0.02, sk, 0.03), ell([-0.008, 0.066, -0.084], [0.021, 0.021, 0.021], sk, 0.006), cone([-0.008, 0.066, -0.084], [-0.016, 0.11, -0.09], 0.02, 0.0155, sk, 0.0),
    ell([-0.012, 0.104, -0.09], [0.004, 0.011, 0.013], nail, 0.0));
  const geo = polygonize(prims, 0.0036);
  return recolor(geo, () => {});
}
