// The district lived in: windows, doors and lamplight on the houses, chimney smoke, and the square's barrels, crates, well, cart, lamps and stalls.
import { BoxGeometry, CylinderGeometry, Group, IcosahedronGeometry, InstancedBufferAttribute, InstancedMesh, Mesh, PlaneGeometry } from "three";
import { PAL } from "../ink.js";
import { charcoal, smudgeMaterial } from "../live/charcoal.js";
import { put } from "../live/kit.js";
import { HOUSES, hash, unitBox } from "../live/world.js";
import { T } from "../clock.js";
import { ORDER, merge, part, place } from "./spec.js";

const dims = (h) => (h.yaw ? [h.d, h.w] : [h.w, h.d]);
const DARK = [], LIT = [];
let pane = 0;
const addPane = (x, y, z, sx, sy, sz) => (hash(pane++, 11) < 0.35 ? LIT : DARK).push({ x, y, z, sx, sy, sz, kind: "pane" });

HOUSES.forEach((h, i) => {
  const [W, D] = dims(h);
  const tiers = h.h > 5.5 ? [1.9, 4.2] : [1.9];
  const zf = h.z + D / 2 + 0.05;
  const xf = h.x + (h.x > 0 ? -1 : 1) * (W / 2 + 0.05);
  for (const y of tiers) for (const x of [h.x - 0.3 * W, h.x + 0.3 * W]) addPane(x, y, zf, 0.85, 1.15, 0.12);
  for (const y of tiers) for (const z of [h.z - 0.3 * D, h.z + 0.3 * D]) addPane(xf, y, z, 0.12, 1.15, 0.85);
  if (hash(i, 9) > 0.5) DARK.push({ x: h.x, y: 0, z: zf, sx: 1.05, sy: 2.0, sz: 0.12, kind: "door" });
});
for (const s of [-1, 1]) for (let k = 0; k < 4; k++) LIT.push({ x: s * 7.4, y: 3.2, z: -5 - 3.6 * k, sx: 0.35, sy: 0.4, sz: 0.35, kind: "lantern" });

const chimneyHouses = HOUSES.filter((h) => h.chimney);
const SMOKE = 60;
const sSrc = new Float32Array(SMOKE * 3), sLife = new Float32Array(SMOKE * 4);
for (let j = 0; j < SMOKE; j++) {
  const h = chimneyHouses[j % chimneyHouses.length];
  const [W, D] = dims(h);
  sSrc.set([h.x + W * 0.25, h.h + Math.min(h.w, h.d) * 0.55 + 1.2, h.z + D * 0.2], j * 3);
  sLife.set([0, 3.2 + 2 * hash(j, 4), hash(j, 6), 0], j * 4);
}

const furn = [];
const drop = (g, x, z) => furn.push(place(g, x, 0, z));
for (let i = 0; i < 7; i++) for (const s of [-1, 1]) drop(part(new CylinderGeometry(0.45, 0.45, 0.9, 8).translate(0, 0.45, 0), 0.55), s * (5.2 + 0.8 * (i % 2)), -4 - 2.6 * i);
for (let i = 0; i < 5; i++) for (const s of [-1, 1]) drop(part(new BoxGeometry(0.9, 0.7, 0.9).translate(0, 0.35, 0), 0.5), s * 6.2, -9 - 1.9 * i);
drop(part(new CylinderGeometry(1.2, 1.2, 0.9, 12).translate(0, 0.45, 0), 0.7), -3.2, -14);
for (const s of [-1, 1]) drop(part(new BoxGeometry(0.2, 2.6, 0.2).translate(s * 1.0, 1.3, 0), 0.3), -3.2, -14);
drop(part(new BoxGeometry(2.2, 0.25, 0.3).translate(0, 2.6, 0), 0.3), -3.2, -14);
drop(part(new BoxGeometry(2.2, 0.5, 1.2).translate(0, 0.85, 0), 0.5), 4.2, -18);
for (const s of [-1, 1]) drop(part(new CylinderGeometry(0.5, 0.5, 0.12, 10).rotateX(Math.PI / 2).translate(0, 0.5, s * 0.66), 0.4), 4.2, -18);
for (const s of [-1, 1]) for (let k = 0; k < 4; k++) drop(part(new BoxGeometry(0.12, 3.2, 0.12).translate(0, 1.6, 0), 0.3), s * 7.4, -5 - 3.6 * k);
const stalls = [-9.5, 9.5].flatMap((x) => [-8, -15].map((z) => ({ x, z })));
for (const { x, z } of stalls) for (const a of [-1, 1]) for (const b of [-1, 1]) drop(part(new BoxGeometry(0.1, 2.3, 0.1).translate(0, 1.15, 0), 0.3), x + a * 1.2, z + b * 0.8);
const awnings = merge(stalls.map(({ x, z }) => part(new BoxGeometry(2.8, 0.12, 2.0).rotateX(-0.25).translate(x, 2.3, z), 1.0)));
// fallen rubble and skin at the lower corners, kept off the seal's lane (|x| >= 3.2); shown only once the skin falls (T.skin)
const fallen = [];
for (let i = 0; i < 18; i++) {
  const r = 0.18 + 0.4 * hash(i, 7);
  const g = part(new IcosahedronGeometry(r, 0).rotateX(hash(i, 16) * Math.PI).rotateZ(hash(i, 17) * Math.PI), 0.2);
  fallen.push(place(g, (i % 2 ? 1 : -1) * (3.2 + 3 * hash(i, 5)), r, 1.0 + 4 * hash(i, 6), hash(i, 18) * 2 * Math.PI));
}
for (let j = 0; j < 6; j++) fallen.push(place(part(new BoxGeometry(1.6, 0.35, 0.9), 0.35), (j % 2 ? 1 : -1) * (4 + 3 * hash(j, 19)), 0.175, 2 + 3 * hash(j, 20), hash(j, 21) * Math.PI));

export function buildDress() {
  const group = new Group();
  const meshes = [];
  const add = (geometry, material, n) => {
    const m = new InstancedMesh(geometry, material, n);
    m.frustumCulled = false;
    m.renderOrder = ORDER.dress;
    group.add(m);
    meshes.push(m);
    return m;
  };
  const dark = add(unitBox(), charcoal({ tone: 0.06, vertexColors: true }), DARK.length);
  DARK.forEach((r, j) => put(dark, j, r.x, r.y, r.z, r.sx, r.sy, r.sz));
  const lit = add(unitBox(), charcoal({ tone: 0.97, wash: 0.9, keep: PAL.gold, keepK: 0.9, vertexColors: true }), LIT.length);
  const flicker = (f) => LIT.forEach((r, j) => {
    const k = 0.92 + 0.08 * hash(f + j, 3);
    if (r.kind === "lantern") put(lit, j, r.x, r.y, r.z, r.sx * k, r.sy * k, r.sz * k);
    else put(lit, j, r.x, r.y, r.z, r.sx, r.sy * k, r.sz);
  });
  flicker(0);
  const smoke = add(new PlaneGeometry(1, 1), smudgeMaterial({ size: 1.1, tint: "#fff0e0", opacity: 0.4 }), SMOKE);
  smoke.geometry.setAttribute("aSrc", new InstancedBufferAttribute(sSrc, 3));
  smoke.geometry.setAttribute("aLife", new InstancedBufferAttribute(sLife, 4));
  smoke.renderOrder = ORDER.smoke;
  const furnMesh = new Mesh(merge(furn), charcoal({ tone: 1.0, wash: 0.1, vertexColors: true }));
  furnMesh.renderOrder = ORDER.dress;
  furnMesh.frustumCulled = false;
  group.add(furnMesh);
  const fallenMesh = new Mesh(merge(fallen), charcoal({ tone: 1.0, wash: 0.1, vertexColors: true }));
  fallenMesh.renderOrder = ORDER.dress;
  fallenMesh.frustumCulled = false;
  group.add(fallenMesh);
  const awnMesh = new Mesh(awnings, charcoal({ tone: 0.7, wash: 0.8, keep: PAL.vermilion, keepK: 0.8, vertexColors: true }));
  awnMesh.renderOrder = ORDER.dress;
  awnMesh.frustumCulled = false;
  group.add(awnMesh);

  let tick = 0;
  return {
    group,
    tier: 2,
    update(t, s) {
      const f = Math.floor(t * 12);
      if (f !== tick) {
        tick = f;
        flicker(f);
        lit.instanceMatrix.needsUpdate = true;
      }
      smoke.material.uniforms.uClock.value = s;
      fallenMesh.visible = s >= T.skin;
    },
    dispose() {
      for (const m of meshes) {
        m.geometry.dispose();
        m.material.dispose();
      }
      furnMesh.geometry.dispose();
      furnMesh.material.dispose();
      fallenMesh.geometry.dispose();
      fallenMesh.material.dispose();
      awnMesh.geometry.dispose();
      awnMesh.material.dispose();
      group.removeFromParent();
    },
  };
}
