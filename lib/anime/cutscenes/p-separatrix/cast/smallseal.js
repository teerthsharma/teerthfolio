// smallSeal(): a costumed seal (costumed-seal-kit) plus this dock's rigid extras (spots, lattice, scallops, turtle shell, key, beret...).
// Law L6b: every victim and extra is built here, on the locked pup body, never a silhouette.
import { SphereGeometry, TorusGeometry, CylinderGeometry, BoxGeometry, Group } from "three";
import { figProp, pivoted } from "./util.js";

const HEADC = [0, 0.555, 0.03]; // the locked pup's head centre (pup.js HEAD2)

export function smallSeal(ctx, spec) {
  const h = ctx.kit.costumedSeal(ctx.engine, spec);
  const x = spec.extras ?? {};
  const P = (geo, col, shade, o) => figProp(ctx, geo, col, shade, { lineMul: 0.7, ...o });
  const E = (r, sx, sy, sz) => new SphereGeometry(r, 14, 10).scale(sx, sy, sz);
  h.x = {};
  // hair on a pivot at the head so it can whip (hair.rotation about the head, not about the feet)
  if (h.hair) {
    const pv = pivoted(h.hair, HEADC);
    h.body.add(pv);
    h.x.hairPivot = pv;
    // Diavolo's black spots: a dot on the outer side of the first N clumps (root p0 pushed out along the scalp normal by half a clump)
    if (x.spots) {
      const cl = h.hair.userData.geo.userData.clumps ?? [];
      for (let i = 0; i < Math.min(x.spots, cl.length); i++) {
        const { p0, L } = cl[(i * 5) % cl.length];
        const v = [p0.x - HEADC[0], p0.y - HEADC[1], p0.z - HEADC[2]], n = Math.hypot(...v) || 1, k = (n + L * 0.55) / n;
        const d = P(E(0.02, 1, 1, 0.6), x.spotCol, x.spotCol, { line: 0, lineMul: 0.3, pos: [v[0] * k, v[1] * k, v[2] * k] });
        d.lookAt(v[0] * 2, v[1] * 2, v[2] * 2);
        h.hair.add(d);
      }
    }
  }
  if (x.lips) h.body.add(P(E(0.03, 1.7, 0.45, 0.5), x.lips, "#7a3a8a", { pos: [0, 0.478, 0.268], lineMul: 0.4 }));
  if (x.bracelet) h.body.add(P(new TorusGeometry(0.045, 0.013, 8, 18), x.bracelet, "#1f6a3a", { pos: [0.28, 0.21, 0.21], rot: [0.3, 0.6, 0.5], lineMul: 0.4 }));
  if (x.lattice) { // black lattice over the mesh top: 5 diagonals each way, flat boxes on the chest
    const g = new Group();
    for (let i = -2; i <= 2; i++) for (const s of [1, -1]) g.add(P(new BoxGeometry(0.011, 0.2, 0.006), x.lattice, x.lattice, { pos: [i * 0.055, 0.29, 0.318 - Math.abs(i) * 0.008], rot: [0, 0, s * 0.8], lineMul: 0.2, line: 0 }));
    h.body.add(g);
  }
  if (x.scallops) { // the scalloped black collar: a row of beads about the neck
    for (let i = 0; i < 11; i++) { const a = -1.4 + i * 0.28; h.body.add(P(E(0.032, 1, 1, 1), x.scallops, x.scallops, { pos: [Math.sin(a) * 0.215, 0.452, Math.cos(a) * 0.2 + 0.015], lineMul: 0.3 })); }
  }
  if (x.turtle) { // Polnareff in turtle form: a shell on the back, and the key in the right flipper
    h.body.add(P(E(0.27, 1, 0.9, 0.62), x.turtle, x.turtleShade, { pos: [0, 0.3, -0.2], lineMul: 0.9 }));
    for (let i = 0; i < 3; i++) h.body.add(P(E(0.07, 1, 1, 0.4), x.turtleShade, x.turtleShade, { pos: [(i - 1) * 0.12, 0.38 - Math.abs(i - 1) * 0.04, -0.37], lineMul: 0.3, line: 0 }));
    const key = new Group();
    key.add(P(new TorusGeometry(0.03, 0.009, 6, 14), x.key, "#b9803a", { pos: [0, 0.07, 0] }), P(new CylinderGeometry(0.006, 0.006, 0.09, 6), x.key, "#b9803a", { pos: [0, 0.01, 0] }), P(new BoxGeometry(0.03, 0.012, 0.006), x.key, "#b9803a", { pos: [0.014, -0.03, 0] }));
    key.position.set(0.27, 0.3, 0.27); key.rotation.z = -0.3;
    const glint = P(E(0.022, 1, 1, 0.4), "#fff0a0", "#fff0a0", { line: 0, lineMul: 0.2, pos: [0.27, 0.4, 0.3] }); // star glint on the key (twos)
    h.body.add(key, glint);
    h.x.key = key; h.x.glint = glint;
  }
  if (x.hand) { const hand = P(E(0.06, 1, 0.85, 1), "#8e8c91", "#6d6b7d", { pos: [-0.1, 0.44, 0.275] }); hand.visible = false; h.body.add(hand); h.x.hand = hand; } // Trish: hand to mouth
  if (x.beret) h.body.add(P(E(0.2, 1, 0.36, 1), x.beret, x.beretShade, { pos: [0.04, 0.79, 0.03], rot: [0, 0, 0.15] }));
  return h;
}
