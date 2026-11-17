// The Stand and its aura, the fist barrage on twos with ink speed streaks on each landing jab, the cream sparks on the coral edge, and the rival on the tower.
import { AdditiveBlending, BackSide, BoxGeometry, Group, InstancedMesh, Mesh, MeshBasicMaterial, Object3D, OctahedronGeometry, Quaternion, Vector3 } from "three";
import { hash, merge, part, R, solidMaterial } from "../live/ink.js";
import { fistGeometry, standGeometry } from "../live/stand.js";
import { rivalGeometry } from "../live/rival.js";
import { TOWER } from "../live/world.js";
import { palAt, smooth, T } from "../clock.js";
import { tone } from "../tone.js";

const STAND_AT = [-0.3, 0, -5.2], SK = 0.8, PX = 6.4, CORAL = { y: 7.75, z: -8.6 + 1.1 };
const JABS = 72, SPARKS = 18, AURA = ["#22d3ee", "#fde047", "#f0abfc", "#fb923c"];
const O = new Object3D(), Qa = new Quaternion(), V = new Vector3(), D = new Vector3(), X1 = new Vector3(1, 0, 0);

function put(m, i, x, y, z, sx, sy = sx, sz = sx, q) {
  O.position.set(x, y, z);
  if (q) O.quaternion.copy(q);
  else O.rotation.set(0, 0, 0);
  O.scale.set(sx, sy, sz);
  O.updateMatrix();
  m.setMatrixAt(i, O.matrix);
}
const standAt = (tt) => {
  // the base starts 6 m under the crest and climbs out of the dam from 1.9 s (a quarter up at 2.15 s), so the rise reads from the live lens
  const rise = Math.min(1, Math.max(0, (tt - T.rise[0]) / (T.rise[1] - T.rise[0])));
  // the side step (rig metres) clears the crack's middle piece and the gap from 3.8 s to 5.4 s
  const step = smooth(3.8, 4.2, tt) * (1 - smooth(5.0, 5.4, tt));
  return { x: STAND_AT[0] - 2.6 * step + Math.sin(tt * 2.2) * 0.04, y: -6 * (1 - rise) + 0.12 * Math.sin(rise * Math.PI), z: STAND_AT[2], rise };
};

export function buildFigures(ctx, U) {
  const group = new Group(), root = new Group();
  group.add(root);
  const geos = [], mats = [];
  const solid = (geo, opts) => {
    const m = new Mesh(geo, tone(solidMaterial(U, opts)));
    m.frustumCulled = false;
    mats.push(m.material);
    return m;
  };
  const instanced = (geo, opts, n) => {
    const fill = new InstancedMesh(geo, tone(solidMaterial(U, opts)), n);
    const hull = new InstancedMesh(geo, tone(solidMaterial(U, { hull: true })), n);
    hull.instanceMatrix = fill.instanceMatrix;
    fill.frustumCulled = hull.frustumCulled = false;
    mats.push(fill.material, hull.material);
    return { fill, hull };
  };

  const standG = standGeometry();
  geos.push(standG);
  const standFill = solid(standG, {}), standHull = solid(standG, { hull: true });
  const aura = new Mesh(standG, new MeshBasicMaterial({ color: AURA[0], side: BackSide, transparent: true, opacity: 0, blending: AdditiveBlending, premultipliedAlpha: true, depthWrite: false, toneMapped: false, fog: false }));
  aura.frustumCulled = false;
  aura.userData.layer = 1;
  mats.push(aura.material);
  root.add(standFill, standHull, aura);

  const fistG = fistGeometry();
  const streakG = merge([part(new BoxGeometry(1, 0.12, 0.12), R.ink)]);
  const sparkG = merge([part(new OctahedronGeometry(1, 0), R.cream, { sx: 0.4, sz: 0.4 })]);
  geos.push(fistG, streakG, sparkG);
  const fists = instanced(fistG, { glow: 0.45, haze: 0, rim: 0 }, JABS);
  const streaks = new InstancedMesh(streakG, tone(solidMaterial(U, { glow: 0, haze: 0, rim: 1 })), JABS);
  streaks.frustumCulled = false;
  mats.push(streaks.material);
  const sparks = new InstancedMesh(sparkG, tone(solidMaterial(U, { glow: 1, haze: 0, rim: 0 })), SPARKS);
  sparks.frustumCulled = false;
  mats.push(sparks.material);
  group.add(fists.fill, fists.hull, streaks, sparks);

  const rivalG = rivalGeometry();
  geos.push(rivalG);
  const rival = solid(rivalG, { rim: 1 });
  group.add(rival);

  let at = standAt(0);
  return {
    group,
    update(tt, wt, aux) {
      const barr = aux.barr, hitting = barr > 0.01;
      at = standAt(tt);
      // the fist barrage is hidden outside its window: nothing in these sets is alive, so their draw calls are skipped
      fists.fill.visible = fists.hull.visible = streaks.visible = sparks.visible = hitting;
      root.visible = at.rise > 0;
      root.position.set(at.x, at.y, at.z);
      root.rotation.y = 0.12 * Math.sin((Math.floor(tt * 6) / 6) * 1.3);
      root.scale.setScalar(SK);
      const op = (0.4 + 0.3 * (Math.floor(tt * 14) % 2) + 0.3 * barr) * at.rise;
      aura.material.color.set(AURA[palAt(tt)]).multiplyScalar(op);
      aura.scale.setScalar(1.1 + 0.05 * (Math.floor(tt * 10) % 2) + 0.04 * barr);

      const sh = at;
      for (let j = 0; j < JABS; j++) {
        const arm = j % 2 ? 1 : -1;
        const slot = j >> 1;
        const ph = (((wt * 6.5 + slot * 0.377 + arm * 0.19) % 1) + 1) % 1;
        const reach = 1 - Math.pow(1 - Math.min(1, ph * 1.6), 3);
        const shown = barr > 0.01 && ph < 0.78;
        const shx = sh.x + arm * 2.1 * SK;
        const shy = sh.y + SK * 6.4;
        const aim = (slot / (JABS / 2 - 1) - 0.5) * 2 * (PX + 0.6) * (0.5 + 0.5 * hash(slot, 3 + arm));
        D.set(aim - shx, CORAL.y - shy + (hash(slot, 5) - 0.5) * 1.2, CORAL.z - sh.z);
        const dist = D.length();
        D.normalize();
        Qa.setFromUnitVectors(X1, D);
        const size = (shown ? (0.75 + 0.45 * reach) * (1 - 0.35 * ph) : 0.0001) * SK;
        V.set(shx, shy, sh.z).addScaledVector(D, 1.6 + reach * (dist - 1.2));
        put(fists.fill, j, V.x, V.y, V.z, size, size, size, Qa);
        const streak = shown && ph < 0.54 ? 0.4 + 1.2 * reach : 0.0001;
        V.addScaledVector(D, -streak * 0.5);
        put(streaks, j, V.x, V.y, V.z, streak, 1, 1, Qa);
      }
      fists.fill.instanceMatrix.needsUpdate = true;
      streaks.instanceMatrix.needsUpdate = true;

      for (let j = 0; j < SPARKS; j++) {
        const ph = (((wt * 6.5 + j * 0.31) % 1) + 1) % 1;
        const on = barr > 0.01 && ph > 0.3 && ph < 0.5 ? 0.55 : 0.0001;
        const cyc = Math.floor(wt * 6.5 + j * 0.31);
        put(sparks, j, (hash(j, cyc) - 0.5) * 2 * PX * 0.9, CORAL.y + (hash(j, cyc + 7) - 0.5) * 0.4, CORAL.z + 0.4, on);
      }
      sparks.instanceMatrix.needsUpdate = true;

      const rv = Math.min(1, Math.max(0, (tt - T.rival) / 0.25));
      rival.visible = rv > 0;
      rival.position.set(TOWER.x, TOWER.top + 0.5, TOWER.z);
      rival.rotation.set(0, -0.35 + 0.03 * Math.sin(wt * 3), 0);
      rival.scale.set(1.2 * rv, 1.2 * (0.3 + 0.7 * rv), 1.2 * rv);
    },
    standChest: () => [at.x, at.y + SK * 6.05, at.z + SK * 0.6],
    dispose() {
      for (const g of geos) g.dispose();
      for (const m of mats) m.dispose();
    },
  };
}
