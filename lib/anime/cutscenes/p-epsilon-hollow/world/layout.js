// LAYOUT: where everything stands, in the SEAL'S FRAME (x right, z forward, the pup on the pole), deterministic (ctx.rng).
//   * 3 m radius around the pup stays clear (L2), except the sleeper (bible: god-form instance 0 at x 2.3, z -1.4, scale 0.55).
//   * The chorus (cast layer: the four costumed seals) stands 3.5..6 m in FRONT (+z); no statue enters x +-7, z 2..8.
//   * The 31 plinths arc BEHIND the pup (-z), 3 staggered rows at 5.0, 6.9, 8.8 m, faces turned to the pup.
//   * Near titans: 3 per type, each type's first one carries its name plinth; the rest of the world is spires (1,400).
import { Vector3 } from "three";
import { PLANET_R } from "./planet.js";
import { DEAD_PRS, NAME } from "./data.js";
import { orient } from "./plinths.js";

const R = PLANET_R;
const SAG = 0.03; // the planet sits 3 cm under the pup's feet (facet sag), see planet.js

// a point (x, z) metres from the pole, projected onto the sphere: frame-local position and the surface normal
export function onSphere(x, z) {
  const up = new Vector3(x, R, z).normalize();
  return { p: up.clone().multiplyScalar(R).sub(new Vector3(0, R - SAG, 0)), up };
}
const facePup = (x, z) => Math.atan2(-x, -z); // yaw that turns +z toward the pole

export function layout(rng) {
  const out = { statues: { hand: [], skull: [], god: [], maw: [] }, spires: [], plinths: [], names: [], sparks: [] };
  const near = {
    hand: [[-9.5, 12], [15, 2.5], [-17, -8]],
    skull: [[9, 14.5], [-14, 0], [18, -6]],
    god: [[0, 19], [-6.5, 17], [-20, -15]],
    maw: [[14, 9.5], [-19, 7], [21, -12]],
  };
  const taken = [];
  const clearOfSet = (x, z) => {
    const r = Math.hypot(x, z);
    if (r < 3.5) return false;
    if (Math.abs(x) < 7.5 && z > 1.5 && z < 8.5) return false;                       // the chorus
    if (z < 2 && r > 3.5 && r < 11.5) return false;                                  // the plinth arcs
    return true;
  };
  const scaleAt = (d, lo, hi) => (lo + (hi - lo) * rng()) * (1 + d / 28);
  const placeStatue = (kind, x, z, s, jitter = 0.35) => {
    const { p, up } = onSphere(x, z);
    out.statues[kind].push({ p, up, yaw: facePup(x, z) + (rng() - 0.5) * 2 * jitter, s });
    taken.push([x, z]);
  };

  // near titans (named first)
  for (const kind of Object.keys(near)) {
    near[kind].forEach(([x, z], i) => {
      const d = Math.hypot(x, z);
      placeStatue(kind, x, z, (1.0 + 0.2 * rng()) * (1 + d / 60));
      if (i === 0) {
        const k = Math.hypot(x, z), ux = -x / k, uz = -z / k;     // toward the pup
        const px = x + ux * 3.2, pz = z + uz * 3.2;
        const { p, up } = onSphere(px, pz);
        out.names.push({ p, up, yaw: facePup(px, pz), s: 1.95, row: NAME[kind] });
      }
    });
  }
  // the sleeper: god-form instance at x 2.3, z -1.4, scale 0.55; its name plinth beside it (3.1 m from the pup)
  {
    const { p, up } = onSphere(2.3, -1.4);
    out.statues.god.push({ p, up, yaw: facePup(2.3, -1.4), s: 0.55, sleeper: true });
    const px = 3.13, pz = -0.03, q = onSphere(px, pz);
    out.names.push({ p: q.p, up: q.up, yaw: facePup(px, pz), s: 0.62, row: NAME.god });
  }
  // the rest of the near world: 11 more of each type, radius 22..90, size (0.7..1.4)(1 + d/28)
  for (const kind of Object.keys(near)) {
    let n = 0, guard = 0;
    while (n < 11 && guard++ < 400) {
      const a = rng() * Math.PI * 2, d = 22 + 68 * rng(), x = Math.sin(a) * d, z = Math.cos(a) * d;
      if (!clearOfSet(x, z) || taken.some(([tx, tz]) => Math.hypot(tx - x, tz - z) < 7)) continue;
      placeStatue(kind, x, z, scaleAt(d, 0.7, 1.4), 0.9);
      n++;
    }
  }
  // the three carved spires: the statements whose Lean body is True (egg: "literally the unproved"); name plinths before them
  [[-11.5, 6.5, NAME.spireA], [11.5, 5.5, NAME.spireB], [0, -14, NAME.spireC]].forEach(([x, z, row]) => {
    const { p, up } = onSphere(x, z);
    out.spires.push({ p, up, yaw: facePup(x, z), s: 1.2 });
    const k = Math.hypot(x, z), px = x - (x / k) * 2.8, pz = z - (z / k) * 2.8, q = onSphere(px, pz);
    out.names.push({ p: q.p, up: q.up, yaw: facePup(px, pz), s: 1.0, row });
  });
  // spires: 420 in the near cap (14..140 m) and 980 over the whole sphere (Fibonacci), sized (0.6..1.4)(1 + d/28), capped at x7
  for (let i = 0; i < 420; i++) {
    const a = rng() * Math.PI * 2, d = 14 + 126 * Math.sqrt(rng()), x = Math.sin(a) * d, z = Math.cos(a) * d;
    const { p, up } = onSphere(x, z);
    out.spires.push({ p, up, yaw: rng() * 6.283, s: (0.6 + 0.8 * rng()) * Math.min(1 + d / 28, 7) });
  }
  const N = 980, GA = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (2 * (i + 0.5)) / N, rr = Math.sqrt(Math.max(0, 1 - y * y)), th = i * GA + rng() * 0.3;
    const up = new Vector3(Math.cos(th) * rr, y, Math.sin(th) * rr);
    const d = R * Math.acos(Math.min(1, Math.max(-1, up.y)));
    if (d < 140) continue;                                                            // the near cap is covered above
    const p = up.clone().multiplyScalar(R).sub(new Vector3(0, R - SAG, 0));
    out.spires.push({ p, up, yaw: rng() * 6.283, s: (0.6 + 0.8 * rng()) * Math.min(1 + d / 28, 7) });
  }
  // the plinth arc: 31 dead PRs in 3 staggered rows, in order, left to right
  const rows = [5.0, 6.9, 8.8], cnt = [0, 0, 0];
  DEAD_PRS.forEach((_, i) => { cnt[i % 3]++; });
  const seen = [0, 0, 0];
  DEAD_PRS.forEach((_, i) => {
    const row = i % 3, slot = seen[row]++, n = cnt[row];
    const th = -1.3 + 2.6 * ((slot + (row === 1 ? 0.5 : 0)) / Math.max(1, n - (row === 1 ? 0.0 : 1)));   // angle from -z, radians
    const x = Math.sin(th) * rows[row], z = -Math.cos(th) * rows[row];
    const { p, up } = onSphere(x, z), yaw = facePup(x, z);
    out.plinths.push({ p, up, yaw, s: 1, row: i });
    const side = new Vector3(1, 0, 0).applyQuaternion(orient(up, yaw));
    out.sparks.push({ base: p.clone().addScaledVector(up, 0.42), up, side, row: i });
  });
  return out;
}
