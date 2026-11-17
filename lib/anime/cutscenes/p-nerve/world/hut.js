// The station on the island (the Witness building, components/world/monuments/Witness.jsx, read only): an octagonal glass-and-timber field
// hut with a red lamp roof, eight charcoal posts, a spinning anemometer, a three-plank boardwalk and four rain gauges on one 10 s cycle.
import { BoxGeometry, ConeGeometry, CylinderGeometry, DoubleSide, FrontSide, Group, InstancedMesh, Mesh, Object3D, SphereGeometry, TorusGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { glass, glow, solid, tint, paint } from "./island.js";

// T11: solved by .oneshot/p-nerve/tools/T11-hut.mjs so the station is 0.54 of the frame width and 15.8 m from the ISL lens (live island)
export const HUT_AT = [0.433, 0, -6.435];
const HUT_R = 1.3, HUT_SIDES = 8, WALL_H = 1.6, ROOF_H = 1.0, RAISE = 1.2, ROOF_Y = WALL_H + RAISE + ROOF_H, HUT_CZ = -0.7, MAST_LEN = 1.55;
const DECK_W = 2.4, DECK_T = 0.15, DECK_Y = DECK_T / 2, DECK_STRIP_D = 0.8, PLANK_GAP = 0.04, PLANK_COUNT = 3;
const PLANK_D = (DECK_STRIP_D - (PLANK_COUNT - 1) * PLANK_GAP) / PLANK_COUNT;
const BASE_Y = DECK_T;
const TUBE_X = [-0.72, -0.24, 0.24, 0.72], TUBE_Z = 1.85, TUBE_R = 0.15, TUBE_H = 1.25, RAIN_H = TUBE_H * 0.72;
const FUNNEL_Y = BASE_Y + TUBE_H + 0.13, DROPS = 6, RISER_Z0 = HUT_CZ + HUT_R * 0.6;
const CYCLE = 10, RAIN_START = 0.6, RAIN_END = 5.6, HOLD_END = 8.3, DRAIN_END = 9.6;
const ANEM_ARM = 0.85, ANEM_Y = ROOF_Y + MAST_LEN;
const CHARCOAL = "#43434c", ICE = "#dbeaf5", BLUE = "#2456dc", MINT = "#0b93ab", RED = "#ef4444";

const smooth = (a, b, x) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};
function raiseFrac(t) {
  if (t < RAIN_START) return 0;
  if (t < RAIN_END) return smooth(RAIN_START, RAIN_END, t);
  if (t < HOLD_END) return 1;
  if (t < DRAIN_END) return 1 - smooth(HOLD_END, DRAIN_END, t);
  return 0;
}
const postAt = (i) => {
  const a = (i / HUT_SIDES) * Math.PI * 2 + Math.PI / HUT_SIDES;
  return new BoxGeometry(0.13, WALL_H + RAISE, 0.13).translate(0, (WALL_H + RAISE) / 2, 0).translate(Math.cos(a) * HUT_R, 0, HUT_CZ + Math.sin(a) * HUT_R);
};
const plankAt = (i) => new BoxGeometry(DECK_W, DECK_T, PLANK_D).translate(0, DECK_Y, TUBE_Z - DECK_STRIP_D / 2 + PLANK_D / 2 + i * (PLANK_D + PLANK_GAP));
const armAt = (a) => new BoxGeometry(ANEM_ARM, 0.12, 0.12).translate(ANEM_ARM / 2, 0, 0).rotateY(a);

export function buildHut() {
  const made = [], group = new Group();
  group.position.set(...HUT_AT);
  const own = (x) => (made.push(x), x);
  const charcoalMat = solid(), iceMat = solid();
  const charcoal = tint(own(mergeGeometries([
    new ConeGeometry(HUT_R * 1.1, ROOF_H, HUT_SIDES).translate(0, ROOF_Y - ROOF_H / 2, HUT_CZ),
    new SphereGeometry(0.08, 8, 6).translate(0, ROOF_Y, HUT_CZ),
    new TorusGeometry(HUT_R * 1.02, 0.05, 6, HUT_SIDES).rotateX(Math.PI / 2).translate(0, 0.03, HUT_CZ),
    new CylinderGeometry(0.1, 0.13, MAST_LEN, 6).translate(0, ROOF_Y + MAST_LEN / 2, HUT_CZ),
    new BoxGeometry(TUBE_X[3] - TUBE_X[0] + 0.3, 0.12, 0.12).translate(0, FUNNEL_Y + 0.18, TUBE_Z),
    new BoxGeometry(0.12, 0.12, TUBE_Z - RISER_Z0).translate(0, FUNNEL_Y + 0.18, RISER_Z0 + (TUBE_Z - RISER_Z0) / 2),
    ...Array.from({ length: HUT_SIDES }, (_, i) => postAt(i)),
    ...Array.from({ length: PLANK_COUNT }, (_, i) => plankAt(i)),
  ], false)), paint(CHARCOAL));
  const wall = new Mesh(own(new CylinderGeometry(HUT_R * 0.94, HUT_R, WALL_H, HUT_SIDES, 1, true).translate(0, WALL_H / 2, HUT_CZ)), glass(RED, 0.8, { level: 1.2, side: FrontSide }));
  const lamp = new Mesh(own(new TorusGeometry(HUT_R, 0.045, 6, HUT_SIDES).rotateX(Math.PI / 2).translate(0, WALL_H, HUT_CZ)), glow(RED, 1.2));
  wall.userData.layer = 1;
  group.add(new Mesh(charcoal, charcoalMat), wall, lamp);

  const anem = new Group();
  anem.position.set(0, ANEM_Y, HUT_CZ);
  const hub = tint(own(mergeGeometries([new SphereGeometry(0.07, 8, 6), armAt(0), armAt((2 * Math.PI) / 3), armAt((4 * Math.PI) / 3)], false)), paint(CHARCOAL));
  const cups = new InstancedMesh(own(new SphereGeometry(0.19, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2)), iceMat, 3);
  tint(cups.geometry, paint(ICE));
  const dummy = new Object3D();
  [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].forEach((a, i) => {
    dummy.position.set(Math.cos(a) * ANEM_ARM, 0, Math.sin(a) * ANEM_ARM);
    dummy.rotation.set(0, a, 0);
    dummy.updateMatrix();
    cups.setMatrixAt(i, dummy.matrix);
  });
  anem.add(new Mesh(hub, charcoalMat), cups);
  group.add(anem);

  const funnels = new InstancedMesh(own(tint(new ConeGeometry(0.22, 0.26, 10).rotateX(Math.PI), paint(ICE))), iceMat, TUBE_X.length);
  const tubes = new InstancedMesh(own(new CylinderGeometry(TUBE_R, TUBE_R, TUBE_H, 12, 1, true).translate(0, TUBE_H / 2, 0)), glass(ICE, 0.35, { side: DoubleSide }), TUBE_X.length);
  const grain = new InstancedMesh(own(new CylinderGeometry(TUBE_R * 0.9, TUBE_R * 0.9, 1, 10).translate(0, 0.5, 0)), glow(MINT, 0.9), TUBE_X.length);
  const marker = new InstancedMesh(own(new SphereGeometry(0.085, 8, 6)), glow(BLUE, 0.45), TUBE_X.length);
  const drops = new InstancedMesh(own(new SphereGeometry(0.07, 6, 6)), glow(MINT, 0.7), TUBE_X.length * DROPS);
  tubes.userData.layer = 1;
  grain.frustumCulled = marker.frustumCulled = drops.frustumCulled = false;
  TUBE_X.forEach((x, i) => {
    dummy.position.set(x, FUNNEL_Y, TUBE_Z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    funnels.setMatrixAt(i, dummy.matrix);
    dummy.position.set(x, BASE_Y, TUBE_Z);
    dummy.updateMatrix();
    tubes.setMatrixAt(i, dummy.matrix);
  });
  group.add(funnels, tubes, grain, marker, drops);

  const wallMat = wall.material, lampMat = lamp.material;
  function update(t) {
    const level = 1.2 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2.1));
    wallMat.uniforms.uLevel.value = level;
    lampMat.uniforms.uLevel.value = level;
    anem.rotation.y = t * 2;
    const cycleT = t % CYCLE, h = Math.max(0.002, raiseFrac(cycleT) * RAIN_H);
    const raining = cycleT > RAIN_START && cycleT < RAIN_END;
    TUBE_X.forEach((x, i) => {
      dummy.position.set(x, BASE_Y, TUBE_Z);
      dummy.scale.set(1, h, 1);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      grain.setMatrixAt(i, dummy.matrix);
      dummy.position.set(x, BASE_Y + h, TUBE_Z);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      marker.setMatrixAt(i, dummy.matrix);
      for (let k = 0; k < DROPS; k++) {
        const phase = raining ? ((cycleT - RAIN_START) * 1.7 + i * 0.31 + k / DROPS) % 1 : -1;
        if (phase < 0) dummy.scale.setScalar(0);
        else {
          dummy.position.set(x, FUNNEL_Y - phase * (FUNNEL_Y - (BASE_Y + h)), TUBE_Z);
          dummy.scale.setScalar(1);
        }
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        drops.setMatrixAt(i * DROPS + k, dummy.matrix);
      }
    });
    grain.instanceMatrix.needsUpdate = marker.instanceMatrix.needsUpdate = drops.instanceMatrix.needsUpdate = true;
  }
  return {
    group,
    update,
    dispose() {
      for (const x of made) x.dispose();
      for (const m of [charcoalMat, iceMat, wallMat, lampMat, tubes.material, grain.material, marker.material, drops.material]) m.dispose();
    },
  };
}
