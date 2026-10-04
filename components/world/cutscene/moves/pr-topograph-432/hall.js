// THE THRONE ROOM OF NAZARICK in comic ink: a stair, a towering throne, rows of gothic pillars, 41 guild banners.
// Pup at the origin, the hall runs toward -z. One fused flat-colour mesh with an ink hull; the circle is a flat gold decal.
import { AdditiveBlending, BackSide, BoxGeometry, ConeGeometry, CylinderGeometry, DoubleSide, Euler, Matrix4, Mesh, MeshBasicMaterial, PlaneGeometry, Quaternion, Vector3 } from "three";
import { fuse, inked, paint } from "./comic";
import { circleTexture } from "./fx";

export const STEPS = 7;
export const TOP_Y = 0.4 * STEPS; // the platform
export const THRONE_Z = -11.4;
const M = new Matrix4();
const P = (geo, hex, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) => paint(geo.clone().applyMatrix4(M.compose(new Vector3(...p), new Quaternion().setFromEuler(new Euler(...r)), new Vector3(...s))), hex);
const box = (w, h, d, hex, p, r) => P(new BoxGeometry(w, h, d), hex, p, r);
const BANNERS = ["#b3122b", "#f0b429", "#5a2aa8", "#1f7a6e", "#c8561a", "#2a4fa8", "#8f1d7a", "#e8e0c8"];

export function buildHall() {
  const l = [];
  l.push(box(60, 0.4, 60, "#150b26", [0, -0.2, -10])); // floor
  for (let i = 0; i < STEPS; i++) {
    l.push(box(7, 0.4 * (i + 1), 0.7, i % 2 ? "#2a1450" : "#35195f", [0, 0.2 * (i + 1), -3 - 0.7 * i]));
    l.push(box(2.6, 0.06, 0.7, "#a3112a", [0, 0.4 * (i + 1) + 0.03, -3 - 0.7 * i])); // crimson carpet
    l.push(box(7.1, 0.05, 0.1, "#f0b429", [0, 0.4 * (i + 1), -2.68 - 0.7 * i]));
  }
  l.push(box(12, TOP_Y, 6.4, "#2a1450", [0, TOP_Y / 2, -10.4]), box(2.6, 0.06, 6.4, "#a3112a", [0, TOP_Y + 0.03, -10.4]));
  // the throne: base, seat, tall pointed back with gold fins and spikes, arms
  const tz = THRONE_Z - 0.6;
  l.push(box(3.6, 0.9, 2.2, "#1a0b30", [0, TOP_Y + 0.45, THRONE_Z]), box(3.7, 0.12, 2.3, "#f0b429", [0, TOP_Y + 0.92, THRONE_Z]));
  l.push(box(3.0, 6.4, 0.6, "#12081f", [0, TOP_Y + 4.0, tz - 0.4]), box(3.2, 0.1, 0.7, "#f0b429", [0, TOP_Y + 1.2, tz - 0.4]));
  l.push(P(new ConeGeometry(1.7, 3.2, 4), "#12081f", [0, TOP_Y + 8.9, tz - 0.4], [0, Math.PI / 4, 0], [1, 1, 0.35]));
  for (const s of [-1, 1]) {
    l.push(box(0.5, 1.2, 1.9, "#1a0b30", [s * 1.75, TOP_Y + 1.5, THRONE_Z - 0.1]), box(0.55, 0.1, 2.0, "#f0b429", [s * 1.75, TOP_Y + 2.15, THRONE_Z - 0.1]));
    for (let k = 0; k < 4; k++) l.push(P(new ConeGeometry(0.28, 3.4 + k * 0.6, 4), k % 2 ? "#12081f" : "#f0b429", [s * (2.2 + k * 0.55), TOP_Y + 4.5 + k * 0.45, tz - 0.5], [0, 0, -s * (0.1 + k * 0.1)], [1, 1, 0.3]));
  }
  // pillars: gothic, in rows, gold bases and capitals, a pointed top
  for (const s of [-1, 1])
    for (let z = 5; z > -16; z -= 4.5) {
      const x = s * 8;
      l.push(box(1.7, 0.5, 1.7, "#f0b429", [x, 0.25, z]), box(1.2, 15, 1.2, "#1f0f3a", [x, 7.9, z]), box(1.6, 0.4, 1.6, "#f0b429", [x, 15.2, z]), P(new ConeGeometry(0.9, 2.0, 4), "#12081f", [x, 16.4, z], [0, Math.PI / 4, 0]));
      l.push(box(0.2, 15, 0.2, "#6a2ab0", [x - s * 0.62, 7.9, z + 0.62]));
    }
  l.push(box(40, 40, 0.6, "#0e0618", [0, 17, -17.6]), box(0.6, 40, 60, "#0e0618", [-12.6, 17, -8]), box(0.6, 40, 60, "#0e0618", [12.6, 17, -8]), box(60, 0.6, 60, "#07030d", [0, 21, -8]));
  // the 41 banners: 13 on the back wall, 14 on each side wall; a gold bar, cloth, a swallowtail
  const flag = (x, y, z, ry, k, h) => {
    const c = BANNERS[k % BANNERS.length];
    const R = [0, ry, 0];
    const at = (dx, dy, dz) => {
      const c0 = Math.cos(ry);
      const s0 = Math.sin(ry);
      return [x + dx * c0 + dz * s0, y + dy, z - dx * s0 + dz * c0];
    };
    l.push(box(0.95, 0.12, 0.14, "#f0b429", at(0, 0, 0), R), box(0.8, h, 0.05, c, at(0, -h / 2, 0), R), P(new ConeGeometry(0.4, 0.8, 3), c, at(0, -h - 0.35, 0), [Math.PI, ry, Math.PI / 2], [1, 1, 0.1]), box(0.18, h * 0.5, 0.06, k % 3 ? "#05020a" : "#f0b429", at(0, -h * 0.5, 0.03), R));
  };
  let n = 0;
  for (let i = 0; i < 13; i++) flag(-12.6 + i * 2.1, 16, -17.2, 0, n++, 6);
  for (let i = 0; i < 14; i++) {
    flag(-12.2, 14.5, 4 - i * 1.5, Math.PI / 2, n++, 5.5);
    flag(12.2, 14.5, 4 - i * 1.5, -Math.PI / 2, n++, 5.5);
  }
  const root = inked(fuse(l));
  const dome = new Mesh(new CylinderGeometry(90, 90, 120, 8, 1, true), new MeshBasicMaterial({ color: "#07030d", side: BackSide, fog: false }));
  dome.frustumCulled = false;
  root.add(dome);
  const mk = (gold) => {
    const m = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: circleTexture(gold), transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide, toneMapped: false, opacity: 0.9 }));
    m.frustumCulled = false;
    return m;
  };
  const circle = mk(true);
  circle.scale.setScalar(13);
  circle.position.set(0, 10.4, -16.9);
  const small = mk(true);
  small.rotation.x = -Math.PI / 2;
  small.scale.setScalar(3.4);
  small.position.set(0, 0.05, 0);
  root.add(circle, small);
  return { root, circle, small, banners: n, dispose() {
    for (const o of [circle, small]) { o.material.map.dispose(); o.material.dispose(); o.geometry.dispose(); }
    dome.geometry.dispose(); dome.material.dispose();
    root.userData.geos.forEach((g) => g.dispose());
    root.userData.lit.material.dispose(); root.userData.hull.material.dispose();
  } };
}
