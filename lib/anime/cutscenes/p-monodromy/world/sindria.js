// SINDRIA, the live Magi set, ported from components/world/cutscene/moves/p-monodromy.jsx (buildWorld and the Sindria part of
// useCutFrame) with the live look and geometry. Layer 1 because every mesh moves each step; the plate is the island.
import { Color, Group, InstancedMesh, Mesh, Object3D, OctahedronGeometry, Vector3 } from "three";
import { U, celMat, hash, part } from "../live/look.js";
import { FLEET, LANTERN_COLORS, PALM_AT, ROBES, SEA_Y, landscape, lanternGeometry, palmGeometry, personGeometry, sea, shipGeometry, skyShell, strings } from "../live/world.js";
import { FLASHES, R, T, smooth, warp } from "../clock.js";

const CROWD_LIVE = 72, CROWD_FRONT = 12, CROWD = CROWD_LIVE + CROWD_FRONT;
const ROPE_LAMPS = 72, FALLEN = 14, SPRAY = 24;
const NEAR_LAMPS = [[-2.6, 2.4, 3.2], [2.8, 2.6, 2.6], [-0.8, 3.0, 4.2], [1.2, 3.2, 3.6]];
const NEAR_PALMS = [[-3.4, 3.6, 1.2], [3.6, 2.9, 1.15]]; // x, z, scale
const FOUNTAINS = [-6.6, 6.6];
const BOLT_FOOT = new Vector3(0.4, 0, 1.5);
const SAILS = ["#fff3d6", "#1fbdb4", "#e4566a", "#f2b52e", "#ffffff", "#7d4fc4"];
const O = new Object3D();
const COL = new Color();

const put = (mesh, i, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) => {
  O.position.set(x, y, z); O.rotation.set(rx, ry, rz); O.scale.set(sx, sy, sz); O.updateMatrix(); mesh.setMatrixAt(i, O.matrix);
};

function folk() {
  const list = Array.from({ length: CROWD_LIVE }, (_, i) => {
    const side = i % 2 ? 1 : -1, z = -9.4 + 6.4 * hash(i, 1), x = side * (2.5 + hash(i, 2) ** 1.3 * 6.8);
    return { x, z, yaw: Math.atan2(-x, 9 - z) * 0.8 + (hash(i, 4) - 0.5) * 0.4, s: 0.9 + 0.22 * hash(i, 5), lag: hash(i, 6) * 0.35, ph: hash(i, 7) * 6.28, robe: ROBES[Math.floor(hash(i, 3) * ROBES.length)] };
  });
  for (let j = 0, i = CROWD_LIVE; j < 6; j++) for (const side of [-1, 1]) {
    list.push({ x: side * (1.6 + 0.7 * j), z: -1.8 - 1.2 * hash(i, 1), yaw: 0, s: 0.9 + 0.22 * hash(i, 5), lag: hash(i, 6) * 0.35, ph: hash(i, 7) * 6.28, robe: ROBES[Math.floor(hash(i, 3) * ROBES.length)] });
    i++;
  }
  return list;
}

export default function build() {
  const cel = celMat(), palmMat = celMat({ wind: true });
  const shell = skyShell(), seaM = sea(), land = landscape(), palmG = palmGeometry(), shipG = shipGeometry(), personG = personGeometry(), str = strings(), lampG = lanternGeometry();
  const sprayG = part(new OctahedronGeometry(0.04, 0), "#ffffff", 9);
  shell.m.uniforms.uInside.value = 1;

  const sky = new Mesh(shell.g, shell.m);
  sky.position.set(0, 0.9, 0); sky.scale.setScalar(140); sky.renderOrder = -3;
  const sea3 = new Mesh(seaM.g, seaM.m);
  sea3.position.set(0, SEA_Y, -80); sea3.renderOrder = -2;
  const landMesh = new Mesh(land, cel), ropes = new Mesh(str.rope, cel);

  const palms = new InstancedMesh(palmG, palmMat, PALM_AT.length + NEAR_PALMS.length);
  PALM_AT.forEach(([x, z, y], i) => put(palms, i, x, y, z, 0, hash(i, 1) * 6.28, 0, 0.85 + 0.45 * hash(i, 2)));
  NEAR_PALMS.forEach(([x, z, s], k) => { const i = PALM_AT.length + k; put(palms, i, x, 0, z, 0, hash(i, 1) * 6.28, 0, s); });

  const ships = new InstancedMesh(shipG, cel, FLEET.length);
  FLEET.forEach((_, i) => ships.setColorAt(i, COL.set(SAILS[i % SAILS.length])));

  const people = folk();
  const crowd = new InstancedMesh(personG, cel, CROWD);
  people.forEach((f, i) => crowd.setColorAt(i, COL.set(f.robe)));

  const lamps = [
    ...str.lamps.slice(0, ROPE_LAMPS).map((l) => ({ p: l.p, ph: l.ph, hue: l.hue, scale: 1, fall: -1 })),
    ...NEAR_LAMPS.map(([x, y, z], k) => ({ p: new Vector3(x, y, z), ph: hash(k, 9) * 6, hue: k % 3, scale: 1.4, fall: -1 })),
  ];
  lamps.slice(0, ROPE_LAMPS).map((l, i) => ({ i, d: l.p.distanceToSquared(BOLT_FOOT) })).sort((a, b) => a.d - b.d).slice(0, FALLEN).forEach((e, k) => { lamps[e.i].fall = k; });
  const lampMesh = new InstancedMesh(lampG, cel, lamps.length);
  lamps.forEach((l, i) => lampMesh.setColorAt(i, COL.set(LANTERN_COLORS[l.hue])));

  const spray = new InstancedMesh(sprayG, cel, FOUNTAINS.length * SPRAY);
  for (let i = 0; i < FOUNTAINS.length * SPRAY; i++) spray.setColorAt(i, COL.set("#fff3d6"));

  const all = [palms, ships, crowd, lampMesh, spray, landMesh, ropes, sky, sea3];
  for (const o of all) o.frustumCulled = false;
  const group = new Group();
  group.userData.layer = 1;
  group.add(sky, sea3, landMesh, palms, ships, crowd, ropes, lampMesh, spray);

  return {
    group,
    update(t) {
      const tt = warp(t), struck = tt - T.strike, rt = t - R.strike;
      const storm = tt >= T.strike ? 1 : smooth(T.charge[0], T.charge[1], tt);
      let flash = struck >= 0 ? Math.max(0, 1 - struck / 0.1) * 0.5 : 0;
      for (const f of FLASHES) if (tt >= f && tt < f + 0.17) flash = Math.max(flash, 0.22);
      flash = Math.max(flash, Math.max(0, 1 - Math.abs(tt - T.equip[0]) / 0.18) * 0.3);
      U.uTime.value = t;
      U.uStorm.value = storm;
      U.uFlash.value = t >= R.back ? 0 : Math.min(flash, 0.5);
      U.uGust.value = 0.14 + 0.35 * storm + Math.max(0, 1 - Math.abs(struck) / 0.8) * 0.5;
      U.uFold.value = 0;
      seaM.m.uniforms.uSurge.value = 0.1 + 0.9 * storm;

      const sw = 0.12 + 0.5 * storm;
      let fallen = 0;
      lamps.forEach((l, i) => {
        const s = Math.sin(t * 2.2 + l.ph) * sw;
        let y = l.p.y - 0.42, rz = s * 0.6;
        if (l.fall >= 0 && rt > 0.05 * l.fall) {
          const tau = rt - 0.05 * l.fall;
          y = Math.max(0.2, y - 4.9 * tau * tau);
          rz = Math.min(3 * tau, Math.PI / 2);
          fallen++;
        }
        put(lampMesh, i, l.p.x + s * 0.5, y, l.p.z + Math.cos(t * 1.7 + l.ph) * sw * 0.2, 0, 0, rz, l.scale);
      });
      lampMesh.instanceMatrix.needsUpdate = true;

      const ro = 0.04 + 0.16 * storm;
      FLEET.forEach(([x, z, yaw], i) => put(ships, i, x, SEA_Y + 0.4 + Math.sin(t * 1.3 + i * 1.9) * (0.15 + 0.5 * storm), z, Math.sin(t * 1.1 + i) * ro, yaw, Math.sin(t * 0.9 + i * 2.3) * ro));
      ships.instanceMatrix.needsUpdate = true;

      people.forEach((f, i) => {
        const d = struck - f.lag;
        const duck = d > 0 ? Math.min(1, d / 0.18) * (1 - smooth(1.0, 1.6, d)) : 0;
        const jump = Math.max(0, Math.sin(t * 5 + f.ph)) * (tt > 2.2 && tt < T.strike ? 0.12 : 0.05) * (1 - duck);
        put(crowd, i, f.x, jump, f.z, 0.4 * duck, f.yaw, 0.05 * Math.sin(t * 2 + f.ph), f.s, f.s * (1 - 0.3 * duck), f.s);
      });
      crowd.instanceMatrix.needsUpdate = true;

      for (let s = 0; s < FOUNTAINS.length; s++) for (let j = 0; j < SPRAY; j++) {
        const u = (t * 0.9 + j / SPRAY + s * 0.5) % 1, h = 1.2 * 4 * u * (1 - u), a = j * 2.4, r = 0.3 * u;
        put(spray, s * SPRAY + j, FOUNTAINS[s] + Math.cos(a) * r, 0.5 + h, -4.6 + Math.sin(a) * r);
      }
      spray.instanceMatrix.needsUpdate = true;
      return { struckLamps: fallen };
    },
    dispose() {
      for (const g of [shell.g, seaM.g, land, palmG, shipG, personG, str.rope, lampG, sprayG]) g.dispose();
      for (const x of [shell.m, seaM.m, cel, palmMat]) x.dispose();
      for (const x of [palms, ships, crowd, lampMesh, spray]) x.dispose();
    },
  };
}
