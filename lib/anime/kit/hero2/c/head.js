// The neutral seal head as SDF parts: wide skull, full cheeks, a short blunt snout of two whisker pads with the nose at its tip,
// a brow ridge that carries the glare, a heavy jaw. Same for every character; a look only paints it. Chin tip is the origin.
import { cone, ell, paint } from "../../../sdf.js";

export function headPrims(fur, ex = {}) {
  const A = paint(fur.coat, fur.shade), M = paint(fur.muzzle ?? fur.coat, fur.muzzleShade ?? fur.shade, { pri: 0.004 }), N = paint(fur.muzzle ?? fur.coat, fur.muzzleShade ?? fur.shade);
  const bd = ex.browDrop ?? 0, tilt = 0.16 + (ex.slant ?? 0.3) * 0.5;
  return [
    ell([0, 0.148, -0.014], [0.128, 0.126, 0.126], A, 0.06),
    ell([0, 0.075, 0.0], [0.134, 0.083, 0.118], A, 0.08),
    ell([0, 0.04, 0.03], [0.1, 0.05, 0.095], A, 0.07),
    ell([0.058, 0.176 - bd, 0.088], [0.062, 0.017, 0.042], A, 0.04, [0, 0, tilt]),
    ell([-0.058, 0.176 - bd, 0.088], [0.062, 0.017, 0.042], A, 0.04, [0, 0, -tilt]),
    ell([0, 0.17, 0.1], [0.03, 0.02, 0.03], A, 0.04),
    cone([0, 0.138, 0.082], [0, 0.098, 0.138], 0.027, 0.03, A, 0.05),
    ell([0.04, 0.066, 0.1], [0.05, 0.032, 0.048], M, 0.05),
    ell([-0.04, 0.066, 0.1], [0.05, 0.032, 0.048], M, 0.05),
    ell([0, 0.075, 0.112], [0.05, 0.036, 0.04], M, 0.04),
    ell([0, 0.088, 0.152], [0.021, 0.014, 0.016], N, 0.01),
    ell([0, 0.03, 0.06], [0.07, 0.034, 0.07], A, 0.05),
    cone([0, 0.02, 0.0], [0, -0.13, -0.01], 0.098, 0.115, A, 0.06),
  ];
}
