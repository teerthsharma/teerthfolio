// RUBBLE RISING WITH THE AURA (layer 1, animated). 23 tile chunks (easter egg 3's number) lift off the stage at "ignite", hover and
// bob, then drop at "crumble".
//
// MATHS (s = seconds since ignite, tau = seconds since crumble)
//   rise   h = H * smooth(s / 1.4)                      (H in [1.2, 5.5] per chunk, so it follows the aura surge)
//   bob    y = h + 0.12 sin(1.7 s + phi)
//   spin   rot = (a, b, c) * s * 0.35
//   drop   y -= 2 tau^2   (slow-motion gravity)
// Chunks stand at least 6 m from the seal so they never cover it.
import { DoubleSide, Group, IcosahedronGeometry, Mesh } from "three";
import { paint, painted } from "../../../sdf.js";
import { COL } from "./mosaic.js";

export function buildRubble(ctx) {
  const { engine } = ctx, rand = ctx.rng(77), group = new Group(), bits = [];
  const cols = [[COL.cream, "#6a7a8a"], [COL.terra, "#5a2a1e"], [COL.blue, "#2a2a3e"]];
  let proto = null;
  for (let i = 0; i < 23; i++) {
    const [c, s] = cols[i % 3], sz = 0.18 + rand() * 0.32;
    const g = new IcosahedronGeometry(sz, 0); g.scale(1, 0.45 + rand() * 0.3, 0.8 + rand() * 0.4);
    painted(g, paint(c, s, { id: 0.62 }));
    let m;
    if (!proto) { m = proto = engine.prop(g, 0.62); m.material.side = DoubleSide; } else m = new Mesh(g, proto.material);
    const a = rand() * Math.PI * 2, d = 6 + rand() * 14;
    const b = { m, x: Math.cos(a) * d, z: Math.sin(a) * d, H: 1.2 + rand() * 4.3, phi: rand() * 6.28, ax: rand() - 0.5, ay: rand() - 0.5, az: rand() - 0.5 };
    m.visible = false; m.frustumCulled = false; m.userData.layer = 1;
    group.add(m); bits.push(b);
  }
  const smooth = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
  return {
    group,
    update(ts, I0, T0) {
      const s = ts - I0, tau = ts - T0;
      for (const b of bits) {
        b.m.visible = s > 0 && tau < 6;
        if (!b.m.visible) continue;
        let y = b.H * smooth(s / 1.4) + 0.12 * Math.sin(1.7 * s + b.phi);
        if (tau > 0) y -= 2 * tau * tau;
        b.m.position.set(b.x, y, b.z);
        b.m.rotation.set(b.ax * s * 0.35 * 2, b.ay * s * 0.35 * 2, b.az * s * 0.35 * 2);
      }
    },
    dispose() { for (const b of bits) b.m.geometry.dispose(); proto?.material.dispose(); },
  };
}
