// PROPS (bible: Gold arrow and slit, Coin). Both are rigid cel props through the shared figure program.
// Gold arrow: flies 5.15-5.8 in a straight line into the slit in the floor at GER's own spot (the arrow pierces, GER rises from the slit at 6.05).
// Coin: Diavolo flicks it at 4.2 and it lands HEADS at once (easter egg 1: result without cause); rewound 8.2-9.3 (spins backwards); halves 9.3-10.2.
// The prop never crosses the lens-to-seal ray: the arrow comes in from the far side and ends beside the seal, not at it.
import { BoxGeometry, CylinderGeometry, Group, Quaternion, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { sm, T, figProp, wp } from "./util.js";
import { MARK, CLK } from "./layout.js";

export function buildArrow(ctx, F) {
  const g = new Group(), P = (geo, c, s, o) => figProp(ctx, geo, c, s, { lineMul: 0.8, ...o });
  // arrow along +y, tip at the origin: shaft y in [-1.4, 0], head cone above, the beetle (a gold scarab) at the tail
  g.add(P(new CylinderGeometry(0.018, 0.018, 1.4, 8), "#f2bd45", "#b9803a", { pos: [0, -0.7, 0] }), P(new CylinderGeometry(0.0, 0.07, 0.2, 10).rotateX(Math.PI), "#fff0a0", "#f2bd45", { pos: [0, 0.07, 0] }));
  g.add(P(new SphereGeometry(0.1, 14, 10).scale(1, 1.35, 0.8), "#f2bd45", "#b9803a", { pos: [0, -1.43, 0] }));          // beetle body, 0.2 m
  for (const s of [1, -1]) g.add(P(new SphereGeometry(0.06, 10, 8).scale(0.6, 1.2, 0.5), "#fff0a0", "#b9803a", { pos: [s * 0.07, -1.43, 0.03] })); // wing cases
  for (const i of [0, 1]) g.add(P(new BoxGeometry(0.1, 0.16, 0.006), "#d9a441", "#6a3a10", { pos: [0, -1.22 - i * 0.07, 0], rot: [0, i ? 0.8 : -0.8, 0] })); // fletching
  const end = F.w(MARK.slit[0], -0.12, MARK.slit[2]), start = F.w(MARK.slit[0] + 3.6, 4.4, MARK.slit[2] + 3.4);
  const dir = new Vector3(end[0] - start[0], end[1] - start[1], end[2] - start[2]).normalize(), q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir);
  g.quaternion.copy(q);
  return {
    group: g,
    update(t, cue) {
      const t0 = T(cue, "arrow", CLK.arrow[0]), t1 = T(cue, "pierce", CLK.pierce), u = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
      const e = u * u * (3 - 2 * u) * 0.35 + u * 0.65; // slight acceleration into the floor
      g.position.set(start[0] + (end[0] - start[0]) * e, start[1] + (end[1] - start[1]) * e, start[2] + (end[2] - start[2]) * e);
      const fade = 1 - sm(t1 + 0.55, t1 + 0.9, t); // sunk and gone as GER rises (6.05-6.7)
      g.scale.setScalar(F.s * Math.max(fade, 1e-4));
      g.visible = t >= t0 - 0.02 && fade > 0.01;
    },
    dispose() { g.traverse((o) => { if (o.isMesh) { o.geometry?.dispose?.(); o.material?.dispose?.(); } }); },
  };
}

export function buildCoin(ctx, F, diavolo) {
  const g = new Group(), r = 0.07, P = (geo, c, s, o) => figProp(ctx, geo, c, s, { lineMul: 0.7, ...o });
  const half = (a) => P(new CylinderGeometry(r, r, 0.014, 22, 1, false, a, Math.PI), "#f2bd45", "#b9803a", {});
  const hA = half(0), hB = half(Math.PI);
  g.add(hA, hB);
  g.add(P(new TorusGeometry(r * 0.55, 0.006, 6, 18).rotateX(Math.PI / 2), "#fff0a0", "#b9803a", { pos: [0, 0.009, 0], lineMul: 0.3 })); // the HEADS emblem on the top face
  const v = new Vector3();
  return {
    group: g,
    update(t, cue) {
      const t0 = T(cue, "coin", CLK.coin), tb = T(cue, "rewind", CLK.rewind) + (CLK.coinBack[0] - CLK.rewind); // rewound from 8.2 (the rewind beat is 8.0)
      const th0 = tb + (CLK.coinBack[1] - CLK.coinBack[0]), th1 = th0 + (CLK.coinHalves[1] - CLK.coinHalves[0]);
      wp(diavolo.group, [0.27, 0.34, 0.31], v); // the right flipper
      let x = v.x, y = v.y, z = v.z, rx = 0, vis = t >= 0 && t < th1;
      const rise = 0.9 * F.s;
      if (t < t0) rx = 0.45;                                                            // held, tilted to the lens
      else if (t < t0 + 0.7) { const u = (t - t0) / 0.7; y += rise * Math.sin(Math.PI * u); rx = Math.PI * 4 * u; } // flick: y = h sin(pi u), 2 turns, lands heads (rx = 4 pi = 0)
      else if (t < tb) rx = 0;                                                          // heads, at once
      else if (t < th0) { const u = (t - tb) / (th0 - tb); y += rise * 0.6 * Math.sin(Math.PI * u); rx = -Math.PI * 4 * u; }  // rewound: spins the other way
      let ox = 0, oz = 0;
      if (t >= th0) { const u = Math.min(1, (t - th0) / (th1 - th0)); ox = 0.22 * F.s * u; y -= 0.1 * F.s * u * u; vis = vis && u < 0.98; } // halves part and fall
      g.position.set(x, y, z);
      g.rotation.set(rx, 0, 0);
      g.scale.setScalar(F.s * (t >= th0 ? 1 - sm(th1 - 0.25, th1, t) : 1) + 1e-4);
      const sp = t >= th0 ? ox / F.s : 0;
      hA.position.set(-sp, 0, oz); hB.position.set(sp, 0, oz);
      hA.rotation.z = t >= th0 ? 0.9 * sp * 4 : 0; hB.rotation.z = t >= th0 ? -0.9 * sp * 4 : 0;
      g.visible = vis && diavolo.group.visible;
    },
    dispose() { g.traverse((o) => { if (o.isMesh) { o.geometry?.dispose?.(); o.material?.dispose?.(); } }); },
  };
}
