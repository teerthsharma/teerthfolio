// The dam set: the banded sky shell, the reservoir with its ripple ring, the faceted valley, the crest with its lamps. Pieces are the live's own (live/*).
import { Group, Mesh } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { reservoir, skyShell } from "../live/sky.js";
import { WY, crestGeometry, lampGeometry, terrain } from "../live/world.js";
import { solidMaterial } from "../live/ink.js";
import { smooth } from "../clock.js";
import { tone } from "../tone.js";

const CORAL_Z = -8.6 + 1.1;

export function buildSet(ctx, U) {
  const group = new Group();
  const meshes = [], parts = [], geos = [];
  const add = (geo, mat) => {
    const m = new Mesh(geo, mat);
    m.frustumCulled = false;
    group.add(m);
    meshes.push(m);
    return m;
  };
  // the sky shell is a child of the set, drawn with the rest of the dimension; it is not shaken with the parts
  const sky = skyShell(U);
  const shell = new Mesh(sky.g, sky.m);
  shell.frustumCulled = false;
  group.add(shell);
  meshes.push(shell);
  const water = reservoir(U);
  parts.push(add(water.g, water.m));

  parts.push(add(terrain(), tone(solidMaterial(U, { rim: 0 }))));

  // the crest, its hull and the lamps: one mesh with three material groups (one draw call, the same order as three meshes)
  const crestG = crestGeometry(), lampG = lampGeometry();
  const topMats = [tone(solidMaterial(U, { rim: 0 })), tone(solidMaterial(U, { hull: true })), tone(solidMaterial(U, { glow: 1, haze: 0, rim: 0 }))];
  const topG = mergeGeometries([crestG, crestG, lampG], true);
  if (topG) parts.push(add(topG, topMats));
  else {
    parts.push(add(crestG, topMats[0]));
    parts.push(add(crestG, topMats[1]));
    parts.push(add(lampG, topMats[2]));
  }
  geos.push(crestG, lampG);
  if (topG) geos.push(topG);

  return {
    group,
    update(tt, wt, aux) {
      const odd = Math.floor(tt * 12) % 2 ? 1 : -1;
      const r = 40 * smooth(1.15, 1.6, tt) * (1 - smooth(16.6, 17.0, tt));
      shell.visible = r > 0.02 && !aux.gone;
      shell.scale.setScalar(aux.inside || aux.torn ? 140 : Math.max(r, 0.02));
      sky.m.uniforms.uAlpha.value = aux.inside ? 1 : 0.9;
      const show = (aux.inside || aux.torn) && !aux.gone, dx = aux.quake * odd, dy = aux.quake * 0.5 * odd;
      for (const m of parts) {
        m.visible = show;
        m.position.set(dx, dy, 0);
      }
      const wu = water.m.uniforms;
      wu.uRipple.value.set(0, WY, CORAL_Z);
      wu.uRingR.value = aux.ringAge * 5.5;
      wu.uRingK.value = aux.ringAge > 0 ? Math.max(0, 1 - aux.ringAge / 1.4) : 0;
    },
    dispose() {
      for (const m of meshes) for (const mat of [].concat(m.material)) mat.dispose();
      for (const g of [...meshes.map((m) => m.geometry), ...geos]) g.dispose();
    },
  };
}
