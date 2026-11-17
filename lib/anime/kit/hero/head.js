// HERO HEAD SCULPT: the seal's head as SDF parts, head-local metres, origin at the neck joint, faces +z.
// Dome, a brow ridge bar that can carry a furrow, a broad flat muzzle with whisker pads that blend into the
// cheeks (no depth step between them, the line pass would draw one), a broad flat nose pad, jowls and a chin.
// Self-contained on purpose: body.js re-exports headPrims from here.
import { cone, ell, paint } from "../../sdf.js";

const DOME_C = [0, 0.17, 0], DOME_R = [0.2, 0.18, 0.19];

export function headPrims(f) {
  const C = paint(f.coat, f.shade, { id: 2 });
  return [
    ell(DOME_C, DOME_R, C, 0.06),
    ell([0, 0.095, 0.012], [0.205, 0.125, 0.172], C, 0.09), // full cheeks
    ell([0, 0.025, 0.0], [0.19, 0.085, 0.17], C, 0.1), // jowl: the join as wide as the neck, the underside curving
    ell([0, 0.248, 0.13], [0.17, 0.024, 0.062], C, 0.05), // brow ridge bar
    ell([0.074, 0.246, 0.14], [0.07, 0.024, 0.052], C, 0.04, [0, 0, -0.12]),
    ell([-0.074, 0.246, 0.14], [0.07, 0.024, 0.052], C, 0.04, [0, 0, 0.12]),
    ell([0, 0.236, 0.15], [0.03, 0.03, 0.045], C, 0.04), // glabella, where the brows can furrow
    cone([0, 0.215, 0.166], [0, 0.17, 0.208], 0.034, 0.034, C, 0.05), // muzzle bridge
    ell([0.05, 0.106, 0.172], [0.066, 0.052, 0.05], C, 0.06), // whisker pads, sunk into the cheek
    ell([-0.05, 0.106, 0.172], [0.066, 0.052, 0.05], C, 0.06),
    ell([0, 0.154, 0.214], [0.054, 0.03, 0.02], C, 0.03), // nose pad: broad, flat
    ell([0, 0.05, 0.133], [0.062, 0.042, 0.05], C, 0.04), // chin
  ];
}
