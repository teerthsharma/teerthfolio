// WORLD for p-caustic: the island the cutscene opens on and returns to (island.js), and the war that replaces it on the clock (live/war.js):
// the sky shell, the battlefield and the red moon, in the rig frame (the dock at the origin, the rig turned by TURN, as the site's lens is).
// The island is hidden while the war shows and comes back at the break.
import { Group, Mesh, Vector3 } from "three";
import { buildIsland } from "./island.js";
import { battlefield, HIT2, MOON_R, MOON_WIDE, moon, skyShell } from "../live/war.js";
import { smooth, T, TURN, warp } from "../clock.js";
import { buildTitan } from "./titan.js";
import { buildCrowd } from "./crowd.js";
import { buildDebris } from "./debris.js";
import { buildMeteors } from "./meteors.js";

const SPLIT_DIR = new Vector3(0, 0.25, -0.97), CRACK_DIR = new Vector3(HIT2[0], 4, HIT2[1]).normalize();

export default function build(ctx) {
  const group = new Group(), island = buildIsland(), rig = new Group();
  const sky = skyShell(), ground = battlefield(), mo = moon();
  const skyMesh = new Mesh(sky.g, sky.m), groundMesh = new Mesh(ground.g, ground.m), moonMesh = new Mesh(mo.g, mo.m);
  for (const m of [skyMesh, groundMesh, moonMesh]) m.frustumCulled = false;
  skyMesh.renderOrder = -3; groundMesh.renderOrder = -1; moonMesh.renderOrder = -2;
  skyMesh.position.set(0, 0.9, 0); skyMesh.scale.setScalar(140);
  moonMesh.position.copy(MOON_WIDE); moonMesh.scale.setScalar(MOON_R);
  rig.rotation.y = TURN;
  const titan = buildTitan(), crowd = buildCrowd(), debris = buildDebris(), meteors = buildMeteors();
  rig.add(skyMesh, groundMesh, moonMesh, titan.group, crowd.group, debris.group, meteors.group);
  rig.visible = false;
  group.add(island.group, rig);
  const camLocal = new Vector3(), pr = () => ctx.engine.renderer.getPixelRatio();
  const set = (m, k, v) => { if (m.uniforms[k]) m.uniforms[k].value = v; };
  return {
    group,
    update(t) {
      const tt = warp(t), brk = tt - T.brk, cell = 6 * pr();
      rig.visible = tt > T.bloom[0] && brk < 1.25;
      island.page(rig.visible && brk < 0.05, !(rig.visible && brk < 0.05));
      for (const m of [sky.m, ground.m]) { set(m, "uCell", cell); set(m, "uTime", t); set(m, "uBreak", brk); set(m, "uMoon", MOON_WIDE); set(m, "uPulse", 0.5 + 0.5 * Math.sin(2.4 * t)); }
      set(sky.m, "uSplit", smooth(T.split[0], T.split[1], tt) * (1 - smooth(T.hit2, T.hit2 + 0.1, tt)));
      set(sky.m, "uSplitDir", SPLIT_DIR);
      set(sky.m, "uCrack", smooth(T.web[0], T.web[1], tt));
      set(sky.m, "uCrackDir", CRACK_DIR);
      set(ground.m, "uCrack", smooth(T.web[0], T.web[1], tt));
      set(ground.m, "uCrackDir", CRACK_DIR);
      set(ground.m, "uK2", smooth(T.hit2, T.hit2 + 0.15, tt));
      set(ground.m, "uHot2", smooth(T.hit2, T.hit2 + 0.15, tt));
      set(ground.m, "uK1", smooth(T.m1[1], T.m1[1] + 0.25, tt));
      set(ground.m, "uHot1", smooth(T.m1[1], T.m1[1] + 0.25, tt) * (1 - smooth(T.m1[1] + 0.3, T.m1[1] + 2.5, tt)));
      set(mo.m, "uTime", t); set(mo.m, "uBreak", brk); set(mo.m, "uSpin", t * 0.12); set(mo.m, "uPulse", 0.5 + 0.5 * Math.sin(2.4 * t));
      set(mo.m, "uMoonCrack", smooth(T.moonCrack[0], T.moonCrack[1], tt));
      rig.worldToLocal(camLocal.copy(ctx.player.camera.position));
      moonMesh.lookAt(camLocal);
      titan.update(t, tt, brk, cell, 0);
      crowd.update(tt, brk, camLocal);
      debris.update(tt, brk, t);
      meteors.update(tt, brk, t);
    },
    dispose() { island.dispose(); for (const m of [sky, ground, mo]) { m.g.dispose(); m.m.dispose(); } },
  };
}
