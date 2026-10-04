// THE BELL TOWER across the rooftops: the scene's only church. A tall gothic spire with an open belfry and one big
// bronze bell hung on a yoke, L's bell. It tolls once for each hypothesis the control kills: the yoke swings and
// keeps swinging, slowing; a few pigeons burst from the belfry on the first toll. Lit by the city from beneath
// (warm underlight) and the glaze on the bronze. Rig frame.

import { ConeGeometry, Group, InstancedMesh, LatheGeometry, Mesh, MeshBasicMaterial, Object3D, TorusGeometry, Vector2 } from "three";
import { ball, box, cyl, hash, limb, merge, prep, sm, tene } from "./look";
import { T, bellAngle } from "./timeline";

export const TOWER = { drop: -2.0, x: -9.6, z: -16, belfry: 4.7, bell: 7.15 };
const D = new Object3D();

function stone() {
  const p = [];
  const { belfry: B } = TOWER;
  // the shaft with its buttresses, string courses and a stepped plinth
  p.push(box(3.4, B + 40, 3.4, 0, (B - 40) / 2, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.push(box(0.55, B + 40, 0.55, sx * 1.8, (B - 40) / 2, sz * 1.8));
  for (const y of [-4, 0, 2.6]) p.push(box(3.9, 0.22, 3.9, 0, y, 0));
  // the belfry: its floor, four corner piers, the lintels, and a pointed gable over every face
  p.push(box(3.9, 0.4, 3.9, 0, B + 0.2, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.push(box(0.55, 4.7, 0.55, sx * 1.6, B + 2.55, sz * 1.6));
  for (const y of [9.1]) {
    p.push(box(3.9, 0.5, 0.5, 0, y, 1.6), box(3.9, 0.5, 0.5, 0, y, -1.6), box(0.5, 0.5, 3.9, 1.6, y, 0), box(0.5, 0.5, 3.9, -1.6, y, 0));
  }
  for (const [ax, az, yaw] of [[0, 1.6, 0], [0, -1.6, 0], [1.6, 0, Math.PI / 2], [-1.6, 0, Math.PI / 2]]) {
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    const pt = (x, y) => [ax + x * c, y, az - x * s];
    p.push(limb(pt(-1.5, 9.35), pt(0, 10.7), 0.16, 0.12, 5), limb(pt(1.5, 9.35), pt(0, 10.7), 0.16, 0.12, 5));
    p.push(limb(pt(0, 9.35), pt(0, 10.4), 0.07, 0.07, 4)); // a mullion
  }
  // the slender octagonal spire, four little gable-pinnacles at the corners, a finial cross
  p.push(new ConeGeometry(2.55, 12, 8).translate(0, 10.0 + 6, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.push(new ConeGeometry(0.36, 2.6, 5).translate(sx * 1.85, 9.5 + 1.3, sz * 1.85));
  p.push(cyl(0.05, 0.05, 1.5, 0, 22.8, 0, 5), box(0.7, 0.07, 0.07, 0, 23.1, 0));
  // the belfry floor's window slits on the shaft (dark recesses read as lit by tene's umber)
  return merge(p);
}

// the bronze bell on its yoke, hanging from the swing axis (z): a lathe profile, a clapper, the yoke beam and wheel
function bell() {
  const prof = [[0.0, 0.95], [0.2, 0.92], [0.28, 0.7], [0.36, 0.2], [0.55, -0.45], [0.7, -0.82], [0.76, -0.9], [0.66, -0.92], [0.6, -0.78], [0.34, -0.2], [0.22, 0.55], [0.0, 0.6]].map(([x, y]) => new Vector2(x, y));
  const lathe = new LatheGeometry(prof, 20);
  const g = merge([lathe, ball(0.13, 0, -0.78, 0, 1, 1, 1, 8, 6), box(1.7, 0.2, 0.2, 0, 1.05, 0), cyl(0.07, 0.07, 0.5, 0, 1.2, 0, 6), new TorusGeometry(0.62, 0.05, 5, 16).translate(0, 1.05, 0.26)], true);
  return g;
}

export function buildTower() {
  const g = new Group();
  const mats = {
    stone: tene({ albedo: "#8a8070", wet: 0.45, under: 1.0 }),
    bronze: tene({ albedo: "#a8742f", wet: 1, under: 1.1 }),
    bird: new MeshBasicMaterial({ color: "#100d0c", toneMapped: false, fog: false }),
    window: new MeshBasicMaterial({ color: "#d99a45", toneMapped: false, fog: false }),
  };
  const geos = [];
  const own = (x) => (geos.push(x), x);
  const at = new Group();
  at.position.set(TOWER.x, TOWER.drop, TOWER.z);
  g.add(at);
  const mk = (geo, mat, parent = at) => {
    const m = new Mesh(own(geo), mat);
    m.frustumCulled = false;
    parent.add(m);
    return m;
  };
  mk(stone(), mats.stone);
  // two lit lancets low on the shaft's face
  for (const x of [-0.7, 0.7]) mk(box(0.22, 1.3, 0.05, x, 1.1, 1.72), mats.window);
  // the bell swings about the z axis (side to side across the lens)
  const yoke = new Group();
  yoke.position.set(0, TOWER.bell + 1.05, 0);
  at.add(yoke);
  const bellM = mk(bell(), mats.bronze, yoke);
  bellM.position.y = -1.05;
  // pigeons: a flock out of the belfry on the first toll
  const flock = new InstancedMesh(own(prep(merge([ball(0.12, 0, 0, 0, 1.6, 0.9, 0.9, 6, 4), box(0.05, 0.02, 0.6, 0, 0.04, 0, 0, 0, 0.5)]))), mats.bird, 10);
  flock.frustumCulled = false;
  at.add(flock);
  return {
    group: g,
    tick(t) {
      yoke.rotation.z = bellAngle(t);
      const d0 = t - T.toll[0];
      for (let i = 0; i < 10; i++) {
        if (d0 < 0.05 || d0 > 4.5) {
          D.position.set(0, -60, 0);
          D.scale.setScalar(0.0001);
        } else {
          const d = d0 - 0.05 - 0.07 * i;
          const k = Math.max(d, 0);
          const vx = -(2.6 + 2.8 * hash(i, 1));
          const vy = 1.8 + 2.2 * hash(i, 2);
          const vz = 1.5 + 2.5 * hash(i, 3);
          D.position.set((hash(i, 4) - 0.5) * 1.2 + vx * k, TOWER.bell + 0.2 + vy * k - 0.25 * k * k, (hash(i, 5) - 0.5) * 1.2 + vz * k);
          D.rotation.set(0, Math.atan2(-vx, 0.001) * 0 + (hash(i, 6) - 0.5) * 0.5, Math.sin(t * 22 + i * 1.3) * 0.7);
          D.scale.setScalar(d < 0 ? 0.0001 : 1 + 0.4 * k * 0.3);
        }
        D.updateMatrix();
        flock.setMatrixAt(i, D.matrix);
      }
      flock.instanceMatrix.needsUpdate = true;
    },
    // where the bell hangs, in the rig frame, for the "DONG"
    bellAt: [TOWER.x, TOWER.bell + TOWER.drop, TOWER.z],
    // a portrait lens is narrow: the spire stands nearer the middle so the bell stays in frame
    place(x) {
      at.position.x = x;
      this.bellAt[0] = x;
    },
    dispose() {
      for (const x of geos) x.dispose();
      for (const m of Object.values(mats)) m.dispose();
      flock.dispose();
    },
  };
}
void sm;
