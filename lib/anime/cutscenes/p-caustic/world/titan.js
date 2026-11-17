// THE PERFECT SUSANOO: the blue giant rises out of the field behind the pup on the clock, flares at the cast and at the impact, and is gone at the break.
// Two overlay passes of live/susanoo.js; the rig holds it, so the rig's own hide takes it with the war.
import { Group, Mesh } from "three";
import { susanooGeometry, susanooMaterials } from "../live/susanoo.js";
import { smooth, T } from "../clock.js";

const SUS_AT = [0.9, 0, -17], SUS_S = 2.5; // about 32 m to the crest

export function buildTitan() {
  const group = new Group(), geo = susanooGeometry(), mats = susanooMaterials();
  const body = new Mesh(geo, mats.body), rim = new Mesh(geo, mats.rim);
  body.userData.layer = 1; rim.userData.layer = 1;
  body.frustumCulled = rim.frustumCulled = false;
  group.add(body, rim);
  group.scale.setScalar(SUS_S); group.position.set(SUS_AT[0], 0, SUS_AT[2]);
  const sh = mats.shared;
  return {
    group,
    // tt: scene seconds, t: real seconds, brk: scene seconds since the break, cell: the cell size, shake: the frame's shake
    update(t, tt, brk, cell, shake) {
      const rise = smooth(T.rise[0], T.rise[1], tt);
      sh.uTime.value = t;
      sh.uFade.value = Math.min(1, rise * 1.4);
      sh.uFlare.value = Math.max(0, 1 - Math.abs(tt - T.cast - 0.15) / 0.35) * 0.6 + Math.max(0, 1 - Math.abs(tt - T.hit2) / 0.25) * 0.5;
      sh.uCell.value = cell; sh.uShake.value = shake;
      group.position.y = -13 * SUS_S * (1 - rise) + 0.25 * Math.sin(rise * Math.PI);
      group.visible = rise > 0 && brk < 0;
    },
  };
}
