// THE SCENE'S KIT: every mesh and material of the charcoal dimension, built
// once. It is built BEFORE the scene starts: a watcher (prebuild, below)
// builds it and compiles its shaders while the seal walks up to any of the
// mountain's three docks, so the first frames never stall. The move takes it
// on mount (or builds it then, if the seal arrived too fast) and disposes it
// on unmount: nothing stays allocated after the scene, and nothing is
// allocated per frame.

import { Color, DoubleSide, Group, InstancedBufferAttribute, InstancedMesh, Mesh, MeshBasicMaterial, PlaneGeometry } from "three";
import { live } from "../../../../../lib/world/store";
import { PLACE_BY_ID, dockPoint } from "../../../../../lib/world/places";
import { charcoal, pupCharcoal, smudgeMaterial } from "./charcoal";
import { ground, sky } from "./env";
import {
  BLOCK,
  CELLS,
  FACES,
  FACE_Y,
  FISH,
  HOUSES,
  PLATES,
  WALL_TITANS,
  bellGeometry,
  bellTower,
  boltGeometry,
  carvedFace,
  coatGeometry,
  crownGeometry,
  crownedTitanHead,
  erenGeometry,
  footprintGeometry,
  foundingSkeleton,
  gateGeometry,
  gullGeometry,
  hash,
  penguinGeometry,
  roofGeometry,
  rubbleGeometry,
  sealTitan,
  tinyPup,
  unitBox,
  unitCube,
  wallCore,
  zF,
} from "./world";

export const N = { near: 26, far: 1560, penguins: 240, gulls: 14, colony: 24, steam: 260, ash: 320, prints: 9 };
export const IDS = ["pr-mujoco-3396", "pr-mujoco-warp-1541", "pr-mujoco-3450"];
export const FOUNDING = { x: -210, y: 150, z: -720, s: 300 };
export const EREN = { x: 3, y: 20, s: 4.2 };
export const TOWER = { x: 10.5, z: -8.5 };

const inst = (g, m, n) => {
  const x = new InstancedMesh(g, m, n);
  x.frustumCulled = false;
  return x;
};
const mesh = (g, m) => {
  const x = new Mesh(g, m);
  x.frustumCulled = false;
  return x;
};
const D = new Group(); // a scratch transform for placing instances (never added to a scene)
function put(m, i, x, y, z, sx, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) {
  D.position.set(x, y, z);
  D.rotation.set(rx, ry, rz);
  D.scale.set(sx, sy, sz);
  D.updateMatrix();
  m.setMatrixAt(i, D.matrix);
}
export { put };

function build() {
  const k = { group: new Group() };
  k.group.visible = false;
  const add = (name, o, order = 1002) => {
    o.renderOrder = order;
    o.name = name;
    k[name] = o;
    k.group.add(o);
    return o;
  };

  const s = sky();
  add("sky", mesh(s.g, s.m), 1000).scale.setScalar(860);
  const gr = ground();
  add("ground", mesh(gr.g, gr.m), 1001);

  // THE WALL
  add("core", mesh(wallCore(), charcoal({ tone: 0.82, wash: 0.1, vertexColors: true, rim: 0.4 })));
  const plates = add("plates", inst(unitCube(), charcoal({ tone: 0.86, wash: 0.08, vertexColors: true }), PLATES.length));
  PLATES.forEach((p, i) => put(plates, i, p.x, p.y, p.z, 2.96, 2.46, 0.8, 0, p.yaw, 0));
  const rubble = add("rubble", inst(rubbleGeometry(), charcoal({ tone: 0.82, vertexColors: true }), PLATES.length * 2));
  for (let i = 0; i < PLATES.length * 2; i++) put(rubble, i, 0, -60, 0, 0.001);
  k.faces = FACES.map((f, i) => add(`face${i}`, mesh(carvedFace(f), charcoal({ tone: 0.9, wash: 0.08, vertexColors: true, shard: true, rim: 0.5 }))));
  // the wall-titans behind the skin, shoulder to shoulder, and the crowned head over the block
  const titanMat = charcoal({ tone: 0.72, wash: 0.16, vertexColors: true, skin: 1, rib: 0 });
  const wt = add("wallTitans", inst(sealTitan(false), titanMat, WALL_TITANS.length));
  WALL_TITANS.forEach((x, i) => put(wt, i, x, -0.2, zF(x) - 2.6, 17, 19, 8, 0, Math.atan(x / 450), 0));
  // the crowned one is a head alone, over the block (its body would stand in the gap), still crowned
  const ch = add("crownHead", mesh(crownedTitanHead(), titanMat));
  ch.position.set(0, FACE_Y - 0.78 * 19 + 0.6, zF(0) - 2.6);
  ch.scale.set(17, 19, 8);
  k.titanMat = titanMat;
  const eyes = add("eyes", inst(unitCube(), new MeshBasicMaterial({ color: new Color(3, 1.3, 0.3), toneMapped: false, fog: false }), FACES.length * 2));
  for (let i = 0; i < FACES.length * 2; i++) put(eyes, i, 0, -60, 0, 0.001);

  // THE BLOCK: 1,282 coral fish-cubes, one instanced mesh; and the one blue cube
  const block = add("block", inst(unitCube(), charcoal({ tone: 0.95, wash: 0, keep: "#ff5a4a", keepK: 1.0, vertexColors: true, edge: 1.2 }), FISH));
  const coral = ["#ff8f7a", "#f6a08a", "#ff7d6b", "#ffa48e"].map((c) => new Color(c));
  CELLS.forEach(([x, y, z], i) => {
    put(block, i, x, y, z, 0.7);
    block.setColorAt(i, coral[Math.floor(hash(i, 3) * 4)]);
  });
  add("blue", mesh(unitCube(), charcoal({ tone: 0.95, keep: "#3f86e8", keepK: 0.95, vertexColors: true, edge: 1.4 })));

  // THE DISTRICT
  const houses = add("houses", inst(unitBox(), charcoal({ tone: 0.88, wash: 0.1, vertexColors: true }), HOUSES.length));
  const roofs = add("roofs", inst(roofGeometry(), charcoal({ tone: 0.72, wash: 0.62, vertexColors: true }), HOUSES.length));
  const chimneys = add("chimneys", inst(unitBox(), charcoal({ tone: 0.6, vertexColors: true }), HOUSES.length));
  HOUSES.forEach((h, i) => {
    const [w, d] = h.yaw ? [h.d, h.w] : [h.w, h.d];
    put(houses, i, h.x, 0, h.z, w, h.h, d);
    // the roof's ridge runs along its local z; turned with the house, its local x is the house's own width
    put(roofs, i, h.x, h.h, h.z, h.w + 0.5, Math.min(h.w, h.d) * 0.55, h.d + 0.5, 0, h.yaw, 0);
    if (h.chimney) put(chimneys, i, h.x + w * 0.25, h.h, h.z + d * 0.2, 0.6, Math.min(h.w, h.d) * 0.55 + 1.2, 0.6);
    else put(chimneys, i, 0, -60, 0, 0.001);
  });
  const tower = add("tower", mesh(bellTower(), charcoal({ tone: 0.84, wash: 0.1, vertexColors: true })));
  tower.position.set(TOWER.x, 0, TOWER.z);
  const bell = add("bell", mesh(bellGeometry(), charcoal({ tone: 0.7, wash: 0.3, vertexColors: true })));
  bell.position.set(TOWER.x, 16.6, TOWER.z);
  add("gate", mesh(gateGeometry(), charcoal({ tone: 0.84, wash: 0.1, vertexColors: true })));
  const colony = add("colony", inst(tinyPup(), charcoal({ tone: 0.8, vertexColors: true }), N.colony));
  k.colonyAt = HOUSES.filter((h) => Math.abs(h.x) < 30 && h.z < -3)
    .slice(0, N.colony)
    .map((h, i) => ({ x: h.x + (hash(i, 2) - 0.5) * h.w * 0.4, y: h.h + Math.min(h.w, h.d) * 0.55 * 0.75, z: h.z, yaw: (hash(i, 4) - 0.5) * 1.2 + (h.x > 0 ? -0.4 : 0.4), seed: hash(i, 9) }));
  k.colonyAt.forEach((c, i) => put(colony, i, c.x, c.y, c.z, 0.8));

  // OUTSIDE: footprints across the plain out to the sea; the march; the Founding Titan on its ridge
  const prints = add("prints", inst(footprintGeometry(), charcoal({ tone: 0.7, wash: 0.25, vertexColors: true }), N.prints));
  for (let i = 0; i < N.prints; i++) {
    const z = -41 - i * 3.3; // across the strip of plain, out to the sea
    put(prints, i, (i % 2 ? 2.2 : -2.2) + 3 * Math.sin(i * 0.4), 0.05, z, 1.9, 1, 1.9, 0, (hash(i, 3) - 0.5) * 0.4, 0);
  }
  const marchMat = (lo) => charcoal({ tone: 0.36, wash: 0.2, keep: "#e2876b", keepK: 0.8, vertexColors: true, rib: 0, skin: 0, march: true, haze: 0.55, rim: 0.9, edge: lo ? 0.4 : 1 });
  const quad0 = new PlaneGeometry(1, 1);
  const near = add("marchNear", inst(penguinGeometry().scale(2, 2, 2), marchMat(false), N.near));
  const far = add("marchFar", inst(penguinGeometry().scale(2, 2, 2), marchMat(true), N.far));
  k.marchMats = [near.material, far.material];
  const layout = (m, n, d0, d1, rows) => {
    const phase = new Float32Array(n * 2);
    const per = Math.ceil(n / rows);
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / per);
      const c = i % per;
      const d = d0 + ((d1 - d0) * r) / Math.max(1, rows - 1) + 6 * hash(i, 1);
      const a = -1.15 + (2.3 * (c + 0.5 * (r % 2) + 0.3 * hash(i, 2))) / per;
      const h = d * (0.42 + 0.06 * hash(i, 3)); // forced perspective: 160 to 400 m, over the Wall's crest
      put(m, i, d * Math.sin(a), 0, -d * Math.cos(a), h * 0.92, h, h * 0.8, 0, -a, 0);
      phase[i * 2] = hash(i, 5) * 2;
      phase[i * 2 + 1] = h;
    }
    m.geometry.setAttribute("aPhase", new InstancedBufferAttribute(phase, 2));
  };
  layout(near, N.near, 380, 380, 1);
  // a pale steam column over every near titan, riding the march (child of the instanced mesh)
  const colSrc = new Float32Array(N.near * 3 * 3);
  const colLife = new Float32Array(N.near * 3 * 4);
  for (let i = 0; i < N.near; i++) {
    const a = -1.15 + (2.3 * (i + 0.3 * hash(i, 2))) / N.near;
    const h = 380 * (0.42 + 0.06 * hash(i, 3));
    for (let j = 0; j < 3; j++) {
      const n = i * 3 + j;
      colSrc.set([380 * Math.sin(a), h * (0.95 + 0.3 * j), -380 * Math.cos(a)], n * 3);
      colLife.set([0, 3 + hash(n, 4), hash(n, 6), 0], n * 4);
    }
  }
  const cols = inst(quad0, smudgeMaterial({ size: 14, tint: "#fff4ea", opacity: 0.6 }), N.near * 3);
  cols.geometry.setAttribute("aSrc", new InstancedBufferAttribute(colSrc, 3));
  cols.geometry.setAttribute("aLife", new InstancedBufferAttribute(colLife, 4));
  cols.renderOrder = 1010;
  near.add(cols);
  k.cols = cols;
  layout(far, N.far, 420, 840, 39);
  const fo = add("founding", mesh(foundingSkeleton(), charcoal({ tone: 0.3, wash: 0.25, vertexColors: true, rim: 1.0, haze: 0.45 })));
  fo.position.set(FOUNDING.x, FOUNDING.y, FOUNDING.z);
  fo.scale.setScalar(FOUNDING.s);
  fo.rotation.y = 0.5;

  // EREN on the crest, back to the lens; his coat
  const eren = add("eren", mesh(erenGeometry(), charcoal({ tone: 0.55, keep: "#2f6b3a", keepK: 0.9, vertexColors: true, rim: 1.6 })));
  eren.position.set(EREN.x, EREN.y, zF(EREN.x) - 1.6);
  eren.scale.setScalar(EREN.s);
  const coat = add("coat", mesh(coatGeometry(), charcoal({ tone: 0.55, keep: "#2f6b3a", keepK: 0.9, vertexColors: true, rim: 1.6, side: DoubleSide })));
  coat.position.set(EREN.x, EREN.y + 1.42 * EREN.s, zF(EREN.x) - 1.6);
  coat.scale.setScalar(EREN.s);

  // THE CAST in the square
  add("penguins", inst(penguinGeometry(), charcoal({ tone: 0.95, wash: 0.05, vertexColors: true }), N.penguins));
  k.penguin = Array.from({ length: N.penguins }, (_, i) => ({
    lane: -3 - 19 * hash(i, 1), // across the square, between the pup and the Wall
    x0: 26 + 46 * hash(i, 2),
    v: 13 + 6 * hash(i, 3),
    t0: 4.4 + 2.4 * hash(i, 4),
    slide: hash(i, 5) < 0.3,
    toss: hash(i, 6) < 0.06,
    seed: hash(i, 7),
  }));
  add("gulls", inst(gullGeometry(), charcoal({ tone: 1.0, wash: 0.05, vertexColors: true, side: DoubleSide }), N.gulls));
  add("crown", mesh(crownGeometry(), charcoal({ tone: 0.95, wash: 0.15, vertexColors: true, rim: 0.6 })), 1006);

  // STEAM (static seams, the faces, the pup's shoulders, footprint dust) and ASH, pooled
  const quad = new PlaneGeometry(1, 1);
  const steam = add("steam", inst(quad, smudgeMaterial({ size: 1.2 }), N.steam), 1010);
  const src = new Float32Array(N.steam * 3);
  const life = new Float32Array(N.steam * 4);
  for (let i = 0; i < N.steam; i++) {
    let x;
    let y;
    let z;
    let t0;
    let per = 2.4 + 2 * hash(i, 4);
    let kind = 0;
    if (i < 90) {
      // the seams, opened as the skin falls from the crowned face outward
      const p = PLATES[Math.floor(hash(i, 1) * PLATES.length)];
      [x, y, z, t0] = [p.x, p.y, p.z + 0.6, 4.1 + p.delay + 0.4];
    } else if (i < 130) {
      const f = FACES[i % 3];
      [x, y, z, t0] = [f.x + (hash(i, 2) - 0.5) * 7, FACE_Y + (hash(i, 3) - 0.5) * 6, zF(f.x) + 1.5, f.x === 0 ? 3.7 : 4.3];
    } else if (i < 180) {
      // off the pup's shoulders (relative to the pup, in its own metres, scaled with it)
      [x, y, z, t0] = [(hash(i, 2) - 0.5) * 0.9, 0.9 + 0.3 * hash(i, 3), (hash(i, 5) - 0.5) * 0.8, 6.9];
      kind = 1;
      per = 1.6 + hash(i, 4);
    } else if (i < 220) {
      // footfall dust rolling along the plain and the square
      [x, y, z, t0] = [(hash(i, 2) - 0.5) * 60, 0.5, -37 - 32 * hash(i, 3), 4.6];
    } else {
      // the block's seams, once it shows
      [x, y, z, t0] = [(hash(i, 2) - 0.5) * 12, 9 * hash(i, 3), BLOCK.z0 + 0.4, 4.4];
    }
    src.set([x, y, z], i * 3);
    life.set([t0, per, hash(i, 6), kind], i * 4);
  }
  steam.geometry.setAttribute("aSrc", new InstancedBufferAttribute(src, 3));
  steam.geometry.setAttribute("aLife", new InstancedBufferAttribute(life, 4));
  const ash = add("ash", inst(new PlaneGeometry(1, 1), smudgeMaterial({ size: 1 }), N.ash), 1011);
  const asrc = new Float32Array(N.ash * 3);
  const alife = new Float32Array(N.ash * 4);
  for (let i = 0; i < N.ash; i++) {
    asrc.set([hash(i, 1) * 60, hash(i, 2) * 26, hash(i, 3) * 50], i * 3);
    alife.set([0, 0.7 + 0.6 * hash(i, 4), hash(i, 5), 2], i * 4);
  }
  ash.geometry.setAttribute("aSrc", new InstancedBufferAttribute(asrc, 3));
  ash.geometry.setAttribute("aLife", new InstancedBufferAttribute(alife, 4));

  // THE BOLT: cream core, an ember halo
  const bg = boltGeometry();
  add("bolt", mesh(bg, new MeshBasicMaterial({ color: new Color("#fff4dc"), toneMapped: false, fog: false, side: DoubleSide, depthWrite: false })), 1012);
  add("boltGlow", mesh(bg, new MeshBasicMaterial({ color: new Color("#ff8a3a"), toneMapped: false, fog: false, side: DoubleSide, transparent: true, opacity: 0.3, depthWrite: false })), 1011);
  return k;
}


let KIT = null;
let COMPILED = false;
export function takeKit() {
  KIT ??= build();
  return KIT;
}
export function dropKit() {
  if (!KIT) return;
  KIT.group.traverse((o) => {
    if (o.isMesh) {
      o.geometry.dispose();
      o.material.dispose();
      if (o.isInstancedMesh) o.dispose();
    }
  });
  KIT.group.clear();
  KIT.warm?.dispose();
  KIT = null;
  COMPILED = false;
}

// THE PREBUILD: while the seal walks up to any of the mountain's docks (and the scene has not played), build
// the kit and compile its shaders off the critical path; walk away and it is dropped again.
const DOCKS = IDS.map((id) => dockPoint(PLACE_BY_ID[id]));
let watching = false;
export function watch() {
  if (watching || typeof window === "undefined") return;
  watching = true;
  setInterval(() => {
    if (live.arrival.id || live.seen.has(IDS[0])) return;
    const s = live.seal;
    const d = Math.min(...DOCKS.map((p) => Math.hypot(s.x - p.x, s.z - p.z)));
    const w = window.__world;
    if (d < 30 && !COMPILED && w?.gl && w.camera && w.scene) {
      COMPILED = true;
      const k = takeKit();
      // the pup's charcoal twins too: kept alive until the scene's own are made, so their programs stay cached
      const root = w.scene.getObjectByName("seal");
      const tmp = new Group();
      if (root) {
        k.warm = pupCharcoal(root);
        for (const [g, m] of k.warm.meshes) tmp.add(new Mesh(g, m));
      }
      tmp.add(k.group);
      k.group.visible = true;
      // the island draws through its composer (Look.jsx), into a render target with no tone map: compile for
      // that target, as the frames will use it, or every program is built again on the scene's first frame
      const prev = w.gl.getRenderTarget();
      w.gl.setRenderTarget(w.composer?.inputBuffer ?? null);
      const job = w.gl.compileAsync?.(tmp, w.camera, w.scene);
      w.gl.setRenderTarget(prev);
      job?.then?.(() => {
        tmp.clear();
        if (KIT === k) k.group.visible = false;
      }, () => {});
    } else if (d > 70 && KIT && !live.arrival.id) dropKit();
  }, 400);
}
