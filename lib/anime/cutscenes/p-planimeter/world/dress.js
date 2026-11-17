// Dress: the room's remaining students, the chalk tray and notices, the ceiling light frames and a second row of desks, all from
// the live room's own parts (desk, student, slab). One merged mesh; its floor decals are drawn by set.js. No new kind of set piece.
import { Group, Mesh } from "three";
import { BACK_Z, CEIL, classMaterial, desk, K, Mesher, student } from "../live/room.js";
import { paintRoom } from "./paint.js";

export const SECOND_ROW = [[-3.5, 9.4], [3.5, 9.4], [-1.2, 9.4], [1.2, 9.4]].filter(([x, z]) => !(z > 8.0 && x >= -1 && x <= 3));

export function buildDress(ctx, shared) {
  const material = paintRoom(classMaterial(shared));
  const m = new Mesher();

  student(m, -3.5, 1.6, "#2a2020");
  student(m, 3.5, 5.0, "#2b3a68");

  m.slab(-3.4, 0.1, BACK_Z + 0.06, 3.9, 0.18, BACK_Z + 0.22, "#8a5430", K.WOOD);
  m.box(2.9, 0.145, BACK_Z + 0.14, 0.28, 0.09, 0.12, "#2c3347");
  for (let i = 0; i < 3; i++) m.box(1.0 + i * 0.14, 0.13, BACK_Z + 0.14, 0.1, 0.02, 0.02, "#f4f0e0");

  ["#fff", "#fff1c8", "#9cc3e6"].forEach((hex, i) => {
    const x = -5.4 + i * 0.36;
    m.slab(x, 1.5, BACK_Z, x + 0.3, 2.2, BACK_Z + 0.04, hex);
  });

  for (const z of [-3.5, 0.5, 4.5, 8.5]) {
    m.slab(-4.2, CEIL - 0.1, z - 0.22, 4.2, CEIL - 0.04, z - 0.16, "#6b4a38");
    m.slab(-4.2, CEIL - 0.1, z + 0.16, 4.2, CEIL - 0.04, z + 0.22, "#6b4a38");
  }

  for (const [x, z] of SECOND_ROW) desk(m, x, z, 0);

  const group = new Group();
  const room = new Mesh(m.build(), material);
  room.frustumCulled = false;
  group.add(room);

  const dispose = () => {
    group.traverse((o) => o.geometry?.dispose());
    material.dispose();
  };
  return { group, step: () => {}, dispose };
}
