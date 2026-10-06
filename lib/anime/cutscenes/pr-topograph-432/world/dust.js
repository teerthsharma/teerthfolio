// DUST MOTES (layer 1, redrawn each step): 120 tiny pale-gold tetrahedra drifting in the hall volume, FX-on-twos.
// One merged mesh whose vertex positions are rewritten from the stepped clock, so scrubbing equals playing:
//   centre_i(t) = base_i + ( 0.45 sin(0.7 t + a_i),  rise_i * t mod 11 wrapped,  0.45 cos(0.6 t + b_i) )
//   vertex      = centre_i + local offset (a 4-vertex tetrahedron of radius 0.045 m, 0.07 m for every 6th mote)
// Motes keep out of the seal's bubble (a 1.6 m cylinder about the origin) so nothing ever crosses the lens-seal line.
import { TetrahedronGeometry } from "three";
import { C, part, joined } from "./helpers.js";

export function buildDust(engine, ctx) {
  const R = ctx.rng(7), N = 120, geos = [], base = [], rise = [], ph = [];
  for (let i = 0; i < N; i++) {
    const r = i % 6 === 0 ? 0.07 : 0.045;
    geos.push(part(new TetrahedronGeometry(r, 0), i % 3 ? C.goldHi : C.goldLit, C.goldMid));
    base.push([(R() - 0.5) * 15, R() * 11, -19 + R() * 37]);
    rise.push(0.12 + R() * 0.2); ph.push([R() * 6.28, R() * 6.28]);
  }
  const geo = joined(geos, "dust");
  const pos = geo.attributes.position, local = Float32Array.from(pos.array), per = pos.count / N;
  const mesh = engine.prop(geo, 0.5);
  mesh.frustumCulled = false;
  mesh.userData.layer = 1;
  const place = (t) => {
    for (let i = 0; i < N; i++) {
      const b = base[i];
      const y = ((b[1] + rise[i] * t) % 11) + 0.4;
      let x = b[0] + 0.45 * Math.sin(0.7 * t + ph[i][0]), z = b[2] + 0.45 * Math.cos(0.6 * t + ph[i][1]);
      if (Math.hypot(x, z) < 1.6) { x += Math.sign(x || 1) * 1.7; }
      for (let v = 0; v < per; v++) { const k = (i * per + v) * 3; pos.array[k] = local[k] + x; pos.array[k + 1] = local[k + 1] + y; pos.array[k + 2] = local[k + 2] + z; }
    }
    pos.needsUpdate = true;
  };
  place(0);
  return { mesh, update: place, dispose() { geo.dispose(); mesh.material.dispose(); } };
}
