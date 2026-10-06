// p-tangle WORLD: the shrine on the wooded spit: a stair, 3 vermilion torii, 8 stone lanterns, a hall (bible 3.5).
// Vermilion #e04a30, black #1c1820, stone #8e88a8, lantern glow #ffbe66. Everything is one merged mesh (one draw), vertex-coloured,
// faceted (flat normals from derivatives), lit by paintLit (backlit rim, blue push with distance from the shared haze) and
// scaled by SHRINE_SCALE = 1.6 so a 4 m torii still reads from the seal's wide (the anime exaggerates set pieces the same way).
// The stair climbs from the lake toward the hall; local +z points at the seal, so the gates frame the lake the way 05 frames the rim.
import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, Mesh, SphereGeometry } from "three";
import { SPIT, groundH, LAKE } from "./terrain.js";
import { solidMaterial, mergeParts } from "./materials.js";

const S = 1.6;
const col = (h) => new Color(h);
const VERM = col("#e04a30"), BLACK = col("#1c1820"), STONE = col("#8e88a8"), STONE2 = col("#6c6688"), WALL = col("#5a3a4a"), GLOW = col("#ffbe66");

export function buildShrine(ctx, U, noiseGlsl, add, dispose) {
  const ax = Math.hypot(SPIT.x, SPIT.z), dx = -SPIT.x / ax, dz = -SPIT.z / ax; // toward the seal
  const yaw = Math.atan2(dx, dz);
  const sn = Math.sin(yaw), cs = Math.cos(yaw);
  const parts = [];
  // place an object built at its own base (origin at the foot, +z the front) onto the spit at local (lx, lz)
  const put = (list, lx, lz, scale = S, lift = 0) => {
    const wx = SPIT.x + lx * cs + lz * sn, wz = SPIT.z - lx * sn + lz * cs, gy = Math.max(groundH(wx, wz), LAKE.y) + lift;
    for (const p of list) { p.geo.scale(scale, scale, scale); p.geo.rotateY(yaw); p.geo.translate(wx, gy, wz); parts.push(p); }
  };
  const box = (w, h, d, x, y, z, color, emi = 0) => ({ geo: new BoxGeometry(w, h, d).translate(x, y, z), color, emi });
  const cyl = (r0, r1, h, x, y, z, color, seg = 10) => ({ geo: new CylinderGeometry(r0, r1, h, seg).translate(x, y, z), color, emi: 0 });

  // ---- torii x3: two tapered pillars, kasagi (top beam, black), shimaki, nuki (tie beam), gakuzuka plaque post ----
  const torii = () => [
    cyl(0.16, 0.2, 4.0, -1.6, 2.0, 0, VERM), cyl(0.16, 0.2, 4.0, 1.6, 2.0, 0, VERM),
    box(4.8, 0.24, 0.55, 0, 4.12, 0, BLACK),          // kasagi
    box(4.2, 0.2, 0.42, 0, 3.9, 0, VERM),             // shimaki
    box(3.5, 0.2, 0.3, 0, 3.25, 0, VERM),             // nuki
    box(0.18, 0.4, 0.22, 0, 3.55, 0, VERM),           // gakuzuka
    box(0.5, 0.18, 0.7, -1.6, 0.09, 0, STONE2), box(0.5, 0.18, 0.7, 1.6, 0.09, 0, STONE2),
  ];
  // upturned kasagi ends: two small wedge boxes tilted by scaling a rotated box
  const kasagiEnds = () => [-1, 1].map((s) => {
    const g = new BoxGeometry(0.7, 0.2, 0.55); g.rotateZ(s * 0.22); g.translate(s * 2.55, 4.22, 0); return { geo: g, color: BLACK, emi: 0 };
  });
  for (const lz of [8.8, 6.1, 3.4]) put([...torii(), ...kasagiEnds()], 0, lz);

  // ---- 8 stone lanterns: base, post, fire box (emissive), hip roof, jewel ----
  const lantern = () => [
    box(0.55, 0.18, 0.55, 0, 0.09, 0, STONE2),
    cyl(0.1, 0.12, 0.8, 0, 0.58, 0, STONE, 8),
    box(0.4, 0.1, 0.4, 0, 1.03, 0, STONE),
    box(0.3, 0.34, 0.3, 0, 1.25, 0, GLOW, 1.0),
    { geo: new ConeGeometry(0.42, 0.3, 4).rotateY(Math.PI / 4).translate(0, 1.58, 0), color: STONE, emi: 0 },
    { geo: new SphereGeometry(0.07, 6, 5).translate(0, 1.78, 0), color: STONE, emi: 0 },
  ];
  for (const lz of [7.4, 5.0, 2.6, 0.9]) for (const sx of [-1, 1]) put(lantern(), sx * 2.5, lz, S * 1.0);

  // ---- stair: slabs hugging the slope, a little proud of the ground ----
  for (let lz = 9.6; lz > 2.2; lz -= 0.62) put([box(2.7, 0.22, 0.7, 0, 0.0, 0, STONE2), box(2.7, 0.06, 0.7, 0, 0.14, 0, STONE)], 0, lz, S * 0.9, 0.04);

  // ---- hall: a stone platform, pillars, plastered walls with lit windows, a two-tier hipped roof ----
  const hall = [
    box(8.4, 1.0, 6.0, 0, -0.1, 0, STONE2),
    box(7.4, 0.2, 5.0, 0, 0.5, 0, STONE),
    box(5.8, 2.5, 3.8, 0, 1.85, -0.3, WALL),
    ...[-2.9, 2.9].flatMap((x) => [-1.9, 1.5].map((z) => cyl(0.16, 0.16, 2.6, x, 1.9, z, VERM))),
    { geo: new ConeGeometry(4.6, 1.5, 4).rotateY(Math.PI / 4).scale(1.35, 1, 0.95).translate(0, 4.05, -0.3), color: BLACK, emi: 0 },
    { geo: new ConeGeometry(3.3, 1.1, 4).rotateY(Math.PI / 4).scale(1.3, 1, 0.9).translate(0, 5.2, -0.3), color: BLACK, emi: 0 },
    ...[-1.7, 0, 1.7].map((x) => box(0.7, 0.9, 0.06, x, 1.9, 1.62, GLOW, 1.0)),
    box(1.0, 1.6, 0.08, 0, 1.3, 1.62, col("#3a2030")),
  ];
  put(hall, 0, -1.0, S, 0.0);

  const geo = mergeParts(parts);
  const mat = solidMaterial(U, noiseGlsl,
    `vec3 albedo(vec3 wp, vec3 n) { return vCol * (0.93 + 0.14 * vn(wp.xz * 4.0 + wp.y * 2.0)); }`,
    { facet: true, rim: 1.2, silW: 0.7, emissive: "vEmi * uLant * vec3(1.0, 0.72, 0.36) * 1.4" });
  const mesh = new Mesh(geo, mat); mesh.frustumCulled = false;
  add(mesh, 0); dispose(geo); dispose(mat);
  return { yaw };
}
