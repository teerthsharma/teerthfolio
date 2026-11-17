// LAYOUT for pr-anyps5-12609: where every actor stands on the painted band, per drawing (u across, v DOWN the band, hh = share of band height a 0.85 m seal would fill there).
// world/ reads it for the wake and the siren mirror, cast/ for the placement; the skyline shots zoom the plate (zoomOf), so pins are converted to screen with the same law.
import { floodY, water } from "./clock.js";

const sm = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
export const msY = (v) => 0.8 - ((v - 16) / 25.5) * 0.6; // ms -> band v (down), the skyline's height map
export const ROOF16 = msY(24.0); // the guest perch: the roof of frame 16 (24.0 ms), the block the cruiser grounds on
export const ROOF16_U = 0.705; // frame 16's column centre

// plate zoom about the ground line (u 0.5, v 0.8): shot 5 holds 1.04, the 2% push, then the cut to 1.12 stepping down on twos, the drive settles 1.05 to 1.0
export function zoomOf(t) {
  const tw = Math.floor(t * 12 + 0.02) / 12;
  if (t < 5.5) return 1;
  if (t < 8) return 1.04;
  if (t < 8.5) return 1.04 + 0.02 * Math.min(1, Math.floor((t - 8) * 24 + 0.02) / 7);
  if (t < 10.5) return 1.12 - 0.08 * sm(8.5, 10.5, tw);
  return 1.05 - 0.05 * sm(10.5, 12, tw);
}
const zp = (o, z) => ({ ...o, u: (o.u - 0.5) * z + 0.5, v: (o.v - 0.8) * z + 0.8, hh: o.hh * z });

export function layout(t) {
  const fy = 1 - floodY(t), wd = msY(water(t));
  if (t < 1) return { shot: 1, hero: { u: 0.47, v: 0.70, hh: 0.36 }, partner: { u: 0.575, v: 0.69, hh: 0.33 } };
  if (t < 2) return { shot: 2, hero: { u: 0.32, v: 0.715, hh: 0.26 } };
  if (t < 3.5) return { shot: 3, hero: { u: 0.25, v: 0.93, hh: 0.46 }, cruiser: { u: 0.7, v: fy + 0.08, hh: 0.19 } };
  if (t < 5.5) {
    if (t >= 4.2) return { shot: 4, hold: true, hero: { u: 0.40, v: 0.985, hh: 0.62 }, ski: { u: 0.40, v: 0.985, hh: 0.62 }, partner: { u: 0.62, v: 0.93, hh: 0.30 }, cruiser: { u: 0.84, v: fy + 0.07, hh: 0.16 }, wake: { x: 0.12, y: 0.03 }, wake2: { x: 0.9, y: 1 - (fy + 0.075) } };
    const ski = { u: 0.4, v: 0.86, hh: 0.34 };
    return { shot: 4, hero: ski, ski, partner: ski, cruiser: { u: 0.74, v: fy + 0.07, hh: 0.24 }, wake: { x: ski.u - 0.15, y: 1 - ski.v + 0.015 }, wake2: { x: 0.86, y: 1 - (fy + 0.075) } };
  }
  const z = zoomOf(t);
  const boat = zp({ u: 0.51, v: wd + 0.045, hh: 0.31 }, z);
  const cu = t < 7 ? 1.2 : 1.12 + (ROOF16_U - 1.12) * sm(7, 7.8333, t);
  const cruiser = zp({ u: cu, v: Math.min(wd + 0.03, ROOF16), hh: 0.22 }, z);
  if (t < 10.5) return { shot: t < 8 ? 5 : t < 8.5 ? 6 : 7, hero: boat, boat, partner: boat, cruiser, guest: cruiser };
  return { shot: 8, hero: { u: 0.5, v: 0.8, hh: 0.24 }, car: zp({ u: 0.5, v: 0.8, hh: 0.24 }, z) };
}
