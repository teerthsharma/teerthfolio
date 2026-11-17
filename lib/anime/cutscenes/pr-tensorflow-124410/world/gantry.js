// The gantry: two fluted pylons, three mint edges that grow in, and the coral edge that trembles, cracks, falls and drowns (the live's keyed timing).
import { BoxGeometry, Group, InstancedMesh, Mesh, Object3D, OctahedronGeometry, Quaternion, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { merge, part, R, solidMaterial } from "../live/ink.js";
import { WY, pylonGeometry } from "../live/world.js";
import { FREEZE, smooth, T } from "../clock.js";
import { tone } from "../tone.js";

const PX = 6.4, GZ = -8.6, BEAM_Y = [4.3, 5.4, 6.5], CORAL = { y: 7.75, z: GZ + 1.1 }, CORAL_H = 1.0, LEN = 2 * PX + 1.6;
const O = new Object3D(), Qa = new Quaternion(), Z1 = new Vector3(0, 0, 1);

function put(m, i, x, y, z, sx, sy = sx, sz = sx, q) {
  O.position.set(x, y, z);
  if (q) O.quaternion.copy(q);
  else O.rotation.set(0, 0, 0);
  O.scale.set(sx, sy, sz);
  O.updateMatrix();
  m.setMatrixAt(i, O.matrix);
}

export function buildGantry(ctx, U) {
  const group = new Group();
  const geos = [], mats = [];
  const solid = (geo, opts) => {
    const m = new Mesh(geo, tone(solidMaterial(U, opts)));
    m.frustumCulled = false;
    group.add(m);
    mats.push(m.material);
    return m;
  };
  const instanced = (geo, opts, n) => {
    const fill = new InstancedMesh(geo, tone(solidMaterial(U, opts)), n);
    const hull = new InstancedMesh(geo, tone(solidMaterial(U, { hull: true })), n);
    hull.instanceMatrix = fill.instanceMatrix;
    fill.frustumCulled = hull.frustumCulled = false;
    group.add(fill, hull);
    mats.push(fill.material, hull.material);
    return { fill, hull };
  };

  // both pylons in one geometry per material: two meshes (fill and hull) instead of four
  const pylG = pylonGeometry(BEAM_Y.concat([CORAL.y]));
  const pylons = mergeGeometries([-PX, PX].map((x) => pylG.clone().translate(x, 0, GZ)));
  geos.push(pylG, pylons);
  solid(pylons, {});
  solid(pylons, { hull: true });

  const beamG = merge([part(new BoxGeometry(1, 1, 1), R.mint)]);
  const coralG = merge([part(new BoxGeometry(1, 1, 1), R.coral)]);
  const stubG = merge([part(new OctahedronGeometry(1, 0), R.cream, { sx: 0.14, sy: 0.5, sz: 0.14 })]);
  geos.push(beamG, coralG, stubG);
  const mint = instanced(beamG, { glow: 0.2, haze: 0, rim: 0 }, 3);
  const coral = instanced(coralG, { glow: 0.3, haze: 0, rim: 0 }, 4);
  const stubs = new InstancedMesh(stubG, tone(solidMaterial(U, { glow: 1, haze: 0, rim: 0 })), 3);
  stubs.frustumCulled = false;
  group.add(stubs);
  mats.push(stubs.material);

  return {
    group,
    update(tt, wt) {
      const glowK = 0.2 + 0.25 * Math.sin(wt * 5) ** 2 + 0.5 * smooth(7.85, 8.15, tt) * (0.7 + 0.3 * Math.sin(wt * 9));
      mint.fill.material.uniforms.uGlow.value = glowK;
      const bornAt = (i) => smooth(1.6 + i * 0.12, 2.1 + i * 0.12, tt);
      for (let i = 0; i < 3; i++) {
        const b = bornAt(i);
        put(mint.fill, i, 0, BEAM_Y[i], GZ, (2 * PX - 1.6) * b + 0.001, 0.3 * b + 0.001, 0.3 * b + 0.001);
      }
      mint.fill.instanceMatrix.needsUpdate = true;
      mint.fill.visible = mint.hull.visible = tt >= 1.6;

      const born4 = bornAt(3);
      const crack = smooth(T.crack[0], T.crack[1], tt);
      const f6 = Math.floor(tt * 6), twos = Math.floor(tt * 12); // the crack judders on twos (12 drawings a second)
      const judder = tt >= T.crack[0] && tt < T.crack[1];
      const tremble = tt >= 3.0 && tt < 3.3 ? 1 : 0;
      const sx = (((f6 * 3) % 5) - 2) * 0.03 * tremble;
      const sy = (((f6 * 5) % 3) - 1) * 0.03 * tremble;
      const inCrack = tt >= T.crack[0] && tt < T.fall;
      const whole = tt < T.crack[0] + 0.3 ? born4 : 0;
      put(coral.fill, 0, sx, CORAL.y + sy, CORAL.z, LEN * whole + 0.001, CORAL_H * whole + 0.001, CORAL_H * whole + 0.001);
      const piece = LEN / 3, gap = 0.04 + 1.05 * crack, fallen = tt >= T.fall;
      coral.fill.visible = coral.hull.visible = born4 > 0;
      for (let k = 0; k < 3; k++) {
        const delay = k * 0.12;
        const u = Math.max(0, tt - T.fall - delay);
        const y = fallen ? Math.max(WY - 0.2, CORAL.y - 0.5 * 34 * u * u) : CORAL.y + sy;
        const sink = fallen ? smooth(T.drown - 0.05 + delay, T.drown + 0.35 + delay, wt + (FREEZE[1] - FREEZE[0])) : 0;
        const alive = tt >= T.crack[0] + 0.3 ? born4 * (1 - sink) : 0;
        const spread = fallen ? 0.7 * Math.min(u, 1) * (k - 1) : 0;
        const jolt = judder ? (((twos * (3 + 2 * k)) % 5) - 2) * 0.03 : 0;
        Qa.setFromAxisAngle(Z1, (k - 1) * 0.34 * crack + (fallen ? (k - 1.2) * Math.min(u, 0.9) * 1.6 : 0));
        put(coral.fill, 1 + k, (k - 1) * piece + spread + sx * 0.5 + jolt, y + (k === 1 ? 0.05 * crack : -0.07 * crack * (k - 1) ** 2), CORAL.z, (piece - gap) * alive + 0.001, CORAL_H * alive + 0.001, CORAL_H * alive + 0.001, Qa);
        // the cream stub sits at the broken end: the inner end of each outer piece, the centre of the middle one
        const s = inCrack ? (0.35 + 0.25 * crack) * (Math.floor(tt * 12) % 2 ? 1 : 0.6) : 0.0001;
        const inner = k === 1 ? 0 : (1 - k) * (piece - gap) / 2;
        put(stubs, k, (k - 1) * piece + inner, CORAL.y, CORAL.z, s, s, s);
      }
      coral.fill.instanceMatrix.needsUpdate = true;
      stubs.instanceMatrix.needsUpdate = true;
      stubs.visible = inCrack;
      coral.fill.material.uniforms.uGlow.value = 0.3 + 0.5 * crack * (0.5 + 0.5 * Math.sin(tt * 18));
    },
    coralAt: () => [0, CORAL.y, CORAL.z],
    pieceAt: (k) => [(k - 1) * (LEN / 3), CORAL.y, CORAL.z],
    ringAge: (tt) => Math.max(0, tt - 7.8),
    dispose() {
      for (const g of geos) g.dispose();
      for (const m of mats) m.dispose();
    },
  };
}
