// The clock in the sky, the spray hanging over the reservoir, the concrete chips that break off the crest, and the cream flecks that fly off the edge at each fist cluster.
import { Group, IcosahedronGeometry, InstancedMesh, Mesh, Object3D, OctahedronGeometry } from "three";
import { CLOCK, clockGeometry, handGeometry, ticker } from "../live/extras.js";
import { hash, merge, part, R, solidMaterial } from "../live/ink.js";
import { WY } from "../live/world.js";
import { HIT, K, MINUTE, P, smooth, T, tearK } from "../clock.js";
import { tone } from "../tone.js";

const SPRAY = 130, BURST = 40, CHIPS = 60, FLECKS = 8 * HIT.barrage.length, GZ = -8.6, CORAL_Z = GZ + 1.1, CORAL = { y: 7.75 }, PX = 6.4, CREST_Z = -3.3;
const O = new Object3D();

function put(m, i, x, y, z, sx, sy = sx, sz = sx) {
  O.position.set(x, y, z);
  O.rotation.set(0, 0, 0);
  O.scale.set(sx, sy, sz);
  O.updateMatrix();
  m.setMatrixAt(i, O.matrix);
}

export function buildProps(ctx, U) {
  const group = new Group();
  const geos = [], mats = [];
  const solid = (geo, opts, parent = group) => {
    const m = new Mesh(geo, tone(solidMaterial(U, opts)));
    m.frustumCulled = false;
    parent.add(m);
    mats.push(m.material);
    return m;
  };
  // the audio context is made on the first tick, inside the try, so a blocked context never fails the build
  let snd = null;
  const tick = (low) => { try { snd ??= ticker(); snd.tick(low); } catch { /* a missing sound is not a frame error */ } };

  const clock = new Group();
  clock.position.set(CLOCK.x, CLOCK.y, CLOCK.z);
  group.add(clock);
  const clockG = clockGeometry();
  geos.push(clockG);
  solid(clockG, { haze: 0 }, clock);
  solid(clockG, { hull: true }, clock);
  const minG = handGeometry(5.6, 0.34, R.ink), hourG = handGeometry(3.5, 0.5, R.ink);
  geos.push(minG, hourG);
  const minute = new Group(), hour = new Group();
  clock.add(minute, hour);
  solid(minG, { haze: 0 }, minute);
  solid(hourG, { haze: 0 }, hour);

  // the live drop is an icosahedron at detail 1 (80 faces x 130 drops); detail 0 reads the same at this size and costs a quarter of it
  const dropG = part(new IcosahedronGeometry(0.11, 0), R.cream, { sy: 1.5 });
  geos.push(dropG);
  const spray = new InstancedMesh(dropG, tone(solidMaterial(U, { glow: 0.3, haze: 0, rim: 0 })), SPRAY);
  spray.frustumCulled = false;
  group.add(spray);
  mats.push(spray.material);

  const chipA = merge([part(new OctahedronGeometry(1, 0), R.concreteDk)]);
  const chipB = merge([part(new OctahedronGeometry(1, 0), R.cream)]);
  geos.push(chipA, chipB);
  const chipsA = new InstancedMesh(chipA, tone(solidMaterial(U, { haze: 0, rim: 0 })), CHIPS / 2);
  const chipsB = new InstancedMesh(chipB, tone(solidMaterial(U, { haze: 0, rim: 0 })), CHIPS / 2);
  const flecks = new InstancedMesh(chipB, tone(solidMaterial(U, { haze: 0, rim: 0 })), FLECKS);
  for (const m of [chipsA, chipsB, flecks]) {
    m.frustumCulled = false;
    group.add(m);
    mats.push(m.material);
  }

  const fired = {};
  return {
    group,
    update(tt, wt, aux) {
      if (tt < 0.5) for (const k of Object.keys(fired)) delete fired[k];
      if (tt >= T.stop && !fired.t1) { fired.t1 = true; tick(false); }
      if (tt >= T.stop + 0.6 && !fired.t2) { fired.t2 = true; tick(true); }
      if (tt >= T.tick && !fired.t3) { fired.t3 = true; tick(false); }

      const clk = smooth(T.stop, T.stop + 0.25, tt) * (aux.torn ? 1 - tearK(tt) : 1);
      clock.visible = clk > 0.01;
      clock.scale.setScalar(Math.max(clk, 0.001));
      minute.rotation.z = MINUTE(tt);
      hour.rotation.z = -0.27;

      const sprayRate = 0.25 + 0.6 * smooth(T.barrage[0], T.barrage[1], wt);
      spray.visible = wt > T.glyph;
      // the drown burst: 20 drops straight up at 6 m/s and 20 flung outward at 3 m/s, from the edge's centre, 0.9 s each
      const DROWN_X = P.drown[0] / K;
      for (let i = 0; i < SPRAY; i++) {
        const burst = i >= SPRAY - BURST;
        const up = burst && i - (SPRAY - BURST) < BURST / 2;
        const life = burst ? 0.9 : 1.7;
        const clk2 = burst ? tt - (T.drown - 0.05) : wt + hash(i, 1) * life * 3;
        const cyc = burst ? 0 : Math.floor(clk2 / life);
        const age = clk2 - cyc * life;
        const on = burst ? clk2 > 0 && clk2 < life : hash(i, 2 + cyc * 0.37) < sprayRate && wt > T.glyph;
        const x0 = burst ? DROWN_X : (hash(i, 3 + cyc) - 0.5) * 2 * (PX + 2.5);
        const z0 = burst ? CORAL_Z : GZ + 2 - hash(i, 4 + cyc) * 7;
        const vy = burst ? (up ? 6 : 2) : 3.5 + 4 * hash(i, 5 + cyc * 0.3);
        const vH = burst && !up ? 3 : 0, ang = hash(i, 8) * Math.PI * 2;
        const yy = WY + vy * age - 0.5 * 9.8 * age * age;
        const sc = on && yy > WY ? 0.75 + 0.8 * hash(i, 6) : 0.0001;
        const px = x0 + (burst ? Math.cos(ang) * vH * age : (hash(i, 9) - 0.5) * age);
        const pz = z0 + (burst ? Math.sin(ang) * vH * age : 0);
        put(spray, i, px, Math.max(yy, WY), pz, sc);
      }
      spray.instanceMatrix.needsUpdate = true;

      for (let i = 0; i < CHIPS; i++) {
        const c = Math.floor(i / 10);
        const t0 = c < 5 ? 3.5 + 0.35 * c : 5.65;
        const age = wt - t0;
        const vx = (hash(i, 1) - 0.5) * 3, vy = 1.5 + 2 * hash(i, 2), vz = 1 + 2.5 * hash(i, 3);
        const x = (hash(i, 4) - 0.5) * 2 * PX * 0.8 + vx * age;
        const y = 1.4 + vy * age - 4.9 * age * age;
        const z = CREST_Z + vz * age;
        const sc = age > 0 && age < 2.4 && y > WY ? 0.2 + 0.3 * hash(i, 5) : 0.0001;
        const mesh = i % 2 ? chipsB : chipsA;
        put(mesh, Math.floor(i / 2), x, y, z, sc);
      }
      chipsA.instanceMatrix.needsUpdate = true;
      chipsB.instanceMatrix.needsUpdate = true;
      chipsA.visible = chipsB.visible = wt >= 3.5;

      // eight cream chips off the edge at each fist cluster (HIT.barrage), thrown out of the coral edge's own span
      for (let i = 0; i < FLECKS; i++) {
        const age = wt - HIT.barrage[Math.floor(i / 8)];
        const vx = (hash(i, 11) - 0.5) * 5, vy = 2 + 3 * hash(i, 12), vz = 1.5 + 2.5 * hash(i, 13);
        const x = (hash(i, 14) - 0.5) * 2 * PX * 0.5 + vx * age;
        const y = CORAL.y + (hash(i, 15) - 0.5) * 1.2 + vy * age - 4.9 * age * age;
        const z = CORAL_Z + vz * age;
        const sc = age > 0 && age < 1.2 && y > WY ? 0.25 + 0.25 * hash(i, 16) : 0.0001;
        put(flecks, i, x, y, z, sc);
      }
      flecks.instanceMatrix.needsUpdate = true;
      flecks.visible = wt >= HIT.barrage[0];
    },
    clockAt: () => [CLOCK.x, CLOCK.y, CLOCK.z],
    dispose() {
      snd?.dispose();
      for (const g of geos) g.dispose();
      for (const m of mats) m.dispose();
    },
  };
}
