// The set of the Tournament: the sky sphere, the stone arena and the two gods on their ledge, one layer, drawn in the rig frame.
import { Group, Mesh, Vector3 } from "three";
import { skyShell } from "../live/sky.js";
import { buildArena, LEDGE } from "../live/arena.js";
import { beerus, ENTER, whis } from "../live/gods.js";
import { celMaterial, hullMaterial } from "../live/cel.js";
import { LINE, ORB, passAt, PAL, smooth, STAGE_R, T } from "../clock.js";
import { srgb } from "../util.js";

const V = new Vector3(0, 0.9, 0);
const enter = (t) => {
  const u = Math.min(1, Math.max(0, (t - ENTER[0]) / (ENTER[1] - ENTER[0]))) - 1;
  return Math.max(0.001, 1 + 2.5 * u ** 3 + 1.5 * u ** 2); // ease-out-back, peak 1.08
};
const figure = (f, parent) => {
  parent.add(new Mesh(f.hull, hullMaterial({ color: PAL.hull })));
  for (const [geo, hex] of f.parts) parent.add(new Mesh(geo, celMaterial({ tint: srgb(hex) })));
  parent.add(f.face);
  return parent;
};

export default function buildSet(ctx) {
  const group = new Group(), world = new Group();
  const { g: skyG, m: skyM } = skyShell();
  const shell = new Mesh(skyG, skyM);
  shell.frustumCulled = false;
  const u = skyM.uniforms;
  const arena = buildArena(T);
  for (const s of arena.groups) world.add(s.fill, s.hull);
  world.add(arena.lines);

  const W = whis();
  const whisG = figure(W, new Group());
  W.halo.translate(0, -2.45, 0.34);
  const halo = new Mesh(W.halo, celMaterial({ tint: srgb(PAL.whis.halo) }));
  halo.position.set(0, 2.45, -0.34);
  const staff = new Mesh(W.staffOrb, celMaterial({ tint: srgb(PAL.whis.bead) }));
  whisG.add(halo, staff);
  whisG.position.set(LEDGE.x - 1.5, LEDGE.y, LEDGE.z + 0.2);
  whisG.rotation.y = -0.42;
  const beerusG = figure(beerus(), new Group());
  beerusG.position.set(LEDGE.x + 1.6, LEDGE.y, LEDGE.z + 0.6);
  beerusG.rotation.y = -0.55;
  world.add(whisG, beerusG);
  group.add(shell, world);

  const dodging = (tt) => smooth(ORB.launch, ORB.launch + 0.3, tt) * (1 - smooth(passAt(8) + 0.2, passAt(8) + 0.6, tt));
  return {
    group,
    update(t, tt, st) {
      const pr = st.dpr ?? 1;
      const r = STAGE_R * smooth(1.15, 1.6, t) * (1 - smooth(LINE.collapse[0], LINE.collapse[1], t));
      const inside = r > st.camPos.distanceTo(V) + 0.3;
      shell.visible = r > 0.02 && tt < T.out[1];
      shell.scale.setScalar(inside ? 140 : Math.max(r, 0.02));
      world.visible = inside && tt < T.out[1];
      u.uTime.value = t;
      u.uCell.value = 6 * pr;
      u.uOut.value = smooth(T.out[0], T.out[1], tt);
      u.uDrain.value = st.drain;
      u.uDpr.value = pr;
      u.uSpeed.value = 0.15 + 0.85 * Math.max(0, 1 - Math.abs(tt - 3.0) / 0.6) + 0.5 * dodging(tt) + 0.2 * smooth(T.ignite[0], T.ignite[1], tt);
      const crackR = smooth(3.0, 4.6, tt) * 9 + smooth(9.4, 10.3, tt) * 14;
      arena.update(tt, st.lift, st.quake, crackR);
      arena.stone.uniforms.uDrain.value = st.drain;
      for (const s of arena.groups) if (s.fill.userData.tier === 3) s.fill.visible = s.hull.visible = ctx.atTier(3);
      const tap = Math.max(0, 1 - Math.abs(tt - T.tap) / 0.2);
      halo.rotation.z = tt * 0.5;
      halo.scale.setScalar(1 + 0.35 * tap);
      staff.position.y = -0.16 * tap;
      const k = enter(t);
      whisG.scale.setScalar(2.3 * k);
      beerusG.scale.setScalar(2.35 * k);
      beerusG.rotation.y = -0.55 + 0.05 * Math.sin(tt * 0.9);
      whisG.position.y = LEDGE.y + 0.06 * Math.sin(tt * 1.1);
      return { inside };
    },
    dispose() {
      skyG.dispose();
      skyM.dispose();
      arena.dispose();
      group.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
    },
  };
}
