// THE DWARROWDELF as a miniature set: the hall of pillars, the vault, the chasm with its stepped rock,
// the broken stair and the doorway, the railless voussoir bridge. Rig frame: the pup stands at the
// origin on the bridge's crown (y = 0), the bridge runs along x, the chasm along z, the lens looks
// down -z. Hall pieces are static meshes; pillars, lanterns, knobs and voussoirs are instanced.

import { BoxGeometry, Color, CylinderGeometry, IcosahedronGeometry, InstancedMesh, Object3D } from "three";
import { clay, hash, lump, merge, piece, varied } from "./clay";
import { boxP, taper } from "./shapes";

export const HALF = 3.6; // m: the bridge's half span
export const R_ARCH = 8.5;
export const FLOOR_Y = -0.8;
export const deckY = (x) => -(R_ARCH - Math.sqrt(R_ARCH * R_ARCH - x * x));
export const ROWS = Array.from({ length: 9 }, (_, k) => -4.5 - 6.5 * k);
export const PILLAR_X = [-14, -6.8, 6.8, 14];
export const PILLAR_H = 10;
export const PILLARS = ROWS.flatMap((z, k) => PILLAR_X.map((x, c) => ({ x, z, k, c, depth: k / (ROWS.length - 1) })));
export const BLOCKS = 18; // voussoirs
const BR_W = 1.25;
const D = new Object3D();

const STONE = "#3a2a5a";
const DARK = "#241638";

function pillarGeo() {
  const p = [];
  const ring = (hex) => (x, y) => new Color(hex).multiplyScalar(0.92 + 0.12 * Math.sin(y * 2.3 + x));
  p.push(piece(lump(new BoxGeometry(2.7, 0.7, 2.7, 3, 1, 3).translate(0, 0.35, 0), 0.03, 1.6), "#33224f"));
  p.push(piece(lump(new CylinderGeometry(1.15, 1.28, 7.6, 4, 8).rotateY(Math.PI / 4).translate(0, 0.7 + 3.8, 0), 0.035, 1.3), ring(STONE)));
  p.push(piece(lump(new BoxGeometry(2.25, 0.32, 2.25, 2, 1, 2).translate(0, 8.46, 0), 0.025, 1.6), "#2d1e48"));
  p.push(piece(lump(new CylinderGeometry(1.98, 1.22, 1.0, 4, 3).rotateY(Math.PI / 4).translate(0, 9.12, 0), 0.04, 1.3), "#3c2c60"));
  p.push(piece(lump(new BoxGeometry(3.05, 0.4, 3.05, 3, 1, 3).translate(0, 9.8, 0), 0.03, 1.5), "#35254f"));
  return merge(p);
}

function chasmWalls() {
  const parts = [];
  let n = 0;
  for (const side of [-1, 1]) {
    for (let layer = 0; layer < 18; layer++) {
      const y1 = FLOOR_Y - 0.04 - layer * 2.3;
      const y0 = y1 - 2.3;
      for (let seg = 0; seg < 9; seg++) {
        const z0 = -76 + seg * 11;
        const off = (hash(layer * 9 + seg + (side > 0 ? 40 : 0), 1) - 0.35) * 0.62;
        const xa = side * (HALF + off);
        const xb = side * (HALF + 6);
        const t = Math.min(1, layer / 14);
        const c = new Color("#4a3270").lerp(new Color("#12081f"), t).multiplyScalar(0.88 + 0.24 * hash(n++, 6));
        parts.push(boxP(Math.min(xa, xb), Math.max(xa, xb), y0, y1, z0, z0 + 11.4, c));
      }
    }
  }
  return merge(parts);
}

function floors() {
  return merge([
    boxP(HALF + 0.4, 62, -4, FLOOR_Y, -80, 8, "#2a1a44"),
    boxP(-62, -HALF - 0.4, -4, FLOOR_Y, -80, 8, "#2a1a44"),
  ]);
}

// the broken stair on the guardians' bank, the doorway wall, a few fallen blocks
function stairAndDoor() {
  const p = [];
  const step = (z0, z1, top) => p.push(boxP(-9.6, -HALF - 0.3, FLOOR_Y - 0.05, top, z0, z1, varied(DARK, Math.round(top * 10 + z0), 0.1)));
  step(-1.45, -0.85, -0.52);
  step(-2.05, -1.45, -0.24);
  step(-2.65, -2.05, 0.06);
  // the wall, with the doorway gap x in [-5.8, -4.4]
  const wall = (x0, x1, y0, y1) => p.push(boxP(x0, x1, y0, y1, -3.3, -2.65, "#2a1a44"));
  wall(-9.8, -5.8, FLOOR_Y, 5.2);
  wall(-4.4, -3.1, FLOOR_Y, 5.2);
  wall(-5.8, -4.4, 2.55, 5.2);
  // the jamb trim and the lintel: lighter, dry-brushed plaster
  p.push(boxP(-5.95, -5.8, 0.06, 2.7, -2.7, -2.5, "#e0b040"));
  p.push(boxP(-4.4, -4.25, 0.06, 2.7, -2.7, -2.5, "#e0b040"));
  p.push(boxP(-5.95, -4.25, 2.55, 2.78, -2.7, -2.5, "#e0b040"));
  // broken edge of the stair at the chasm lip, and fallen stones
  p.push(boxP(-4.15, -3.6, FLOOR_Y - 0.05, -0.55, -0.9, 0.2, "#2a1a44"));
  for (let i = 0; i < 7; i++) {
    const g = piece(lump(new BoxGeometry(0.3 + 0.3 * hash(i, 1), 0.22 + 0.2 * hash(i, 2), 0.3 + 0.25 * hash(i, 3), 2, 2, 2), 0.03, 2), varied(DARK, i, 0.2));
    g.rotateY(hash(i, 4) * 3).translate(-9.0 + 5 * hash(i, 5), FLOOR_Y + 0.15, -1.9 + 2.6 * hash(i, 6));
    p.push(g);
  }
  return merge(p);
}

// the vault: arches over the chasm between the inner pillars, beams over the aisles, a lost ceiling
function vault() {
  const p = [];
  const top = FLOOR_Y + PILLAR_H;
  const col = (i) => varied("#2e2050", i, 0.1);
  ROWS.forEach((z, k) => {
    const rr = 6.8;
    for (let s = 0; s < 12; s++) {
      const a0 = (Math.PI * s) / 12;
      const a1 = (Math.PI * (s + 1)) / 12;
      p.push(taper([Math.cos(a0) * rr, top + Math.sin(a0) * rr, z], [Math.cos(a1) * rr, top + Math.sin(a1) * rr, z], 0.36, 0.36, col(k * 12 + s), { seg: 4, rows: 1 }));
    }
    p.push(taper([-14, top + 0.2, z], [-6.8, top + 0.2, z], 0.4, 0.4, col(k), { seg: 4, rows: 1 }));
    p.push(taper([6.8, top + 0.2, z], [14, top + 0.2, z], 0.4, 0.4, col(k + 3), { seg: 4, rows: 1 }));
    if (k < ROWS.length - 1) for (const x of PILLAR_X) p.push(taper([x, top + 0.2, z], [x, top + 0.2, ROWS[k + 1]], 0.34, 0.34, col(k + x), { seg: 4, rows: 1 }));
  });
  p.push(boxP(-26, 26, FLOOR_Y + 19, FLOOR_Y + 19.8, -80, 8, "#3b2c3a"));
  return merge(p);
}

// the voussoirs: wedge-ish blocks on the arch, crown block at x = 0
export function blockLayout() {
  const th = Math.asin(HALF / R_ARCH);
  return Array.from({ length: BLOCKS }, (_, i) => {
    const a = -th + ((i + 0.5) * 2 * th) / BLOCKS;
    return { i, x: Math.sin(a) * (R_ARCH - 0.23), y: -R_ARCH + Math.cos(a) * (R_ARCH - 0.23), rot: -a, topX: Math.sin(a) * R_ARCH };
  });
}

export function buildSet() {
  const blocks = blockLayout();
  const stoneClay = (o = {}) => clay({ boil: 0.02, tex: 0.8, edge: 0.85, ...o });

  const pillarMat = stoneClay({ coral: true, bump: 0.4 });
  const pillars = new InstancedMesh(pillarGeo(), pillarMat, PILLARS.length);
  PILLARS.forEach((p, i) => {
    D.position.set(p.x, FLOOR_Y, p.z);
    D.rotation.set(0, 0, 0);
    D.scale.setScalar(1);
    D.updateMatrix();
    pillars.setMatrixAt(i, D.matrix);
    pillars.setColorAt(i, new Color(0, 0, 0)); // r: the coral amount
  });
  pillars.frustumCulled = false;

  // lanterns: the pods (3 on each pillar's lens face, 1 on its inner face)
  const lanternG = piece(lump(new BoxGeometry(0.42, 0.42, 0.3, 2, 2, 2), 0.012, 3), "#ffffff");
  const lanternMat = clay({ boil: 0.008, emit: 1.7, edge: 0, bump: 0.2, tex: 2.2 });
  const LANT = [];
  PILLARS.forEach((p, pi) => {
    [[-0.32, 1.7], [0.28, 2.45], [-0.06, 3.2]].forEach(([dx, dy]) => LANT.push({ pi, x: p.x + dx, y: FLOOR_Y + dy, z: p.z + 0.9, ry: 0 }));
    const inward = p.x > 0 ? -1 : 1;
    LANT.push({ pi, x: p.x + inward * 0.92, y: FLOOR_Y + 2.1, z: p.z + 0.1, ry: (inward * Math.PI) / 2 });
  });
  const lanterns = new InstancedMesh(lanternG, lanternMat, LANT.length);
  LANT.forEach((l, i) => {
    D.position.set(l.x, l.y, l.z);
    D.rotation.set(0, l.ry, 0);
    D.scale.setScalar(1);
    D.updateMatrix();
    lanterns.setMatrixAt(i, D.matrix);
    lanterns.setColorAt(i, new Color(1, 0.6, 0.27));
  });
  lanterns.frustumCulled = false;

  // knobs: the daemonset agent carved on each capital
  const knobG = merge([piece(lump(new IcosahedronGeometry(0.4, 2).scale(1, 0.85, 1), 0.04, 2.5), "#ffffff"), piece(new CylinderGeometry(0.22, 0.3, 0.2, 8).translate(0, -0.38, 0), "#d8a93a")]);
  const knobMat = clay({ boil: 0.01, emit: 1.35, edge: 0.3, bump: 0.3, tex: 1.6 });
  const knobs = new InstancedMesh(knobG, knobMat, PILLARS.length);
  PILLARS.forEach((p, i) => {
    D.position.set(p.x, FLOOR_Y + PILLAR_H + 0.55, p.z);
    D.rotation.set(0, hash(i, 2) * 3, 0);
    D.updateMatrix();
    knobs.setMatrixAt(i, D.matrix);
    knobs.setColorAt(i, new Color(0.9, 0.55, 0.3));
  });
  knobs.frustumCulled = false;

  // the bridge: individual voussoirs so it can break block by block
  const blockG = piece(lump(new BoxGeometry(0.44, 0.46, BR_W, 2, 2, 3), 0.012, 3), "#ffffff");
  const blockMat = stoneClay({ boil: 0.012, edge: 0.95, bump: 0.45, tex: 1.4 });
  const bridge = new InstancedMesh(blockG, blockMat, BLOCKS);
  blocks.forEach((b) => bridge.setColorAt(b.i, varied("#5a3a8a", b.i * 3, 0.1)));
  bridge.frustumCulled = false;

  const meshes = {
    walls: [chasmWalls(), stoneClay({ boil: 0.03, tex: 0.5, edge: 0.55, bump: 0.5 })],
    floors: [floors(), stoneClay({ boil: 0.02, tex: 0.5, flags: true, edge: 0.5, bump: 0.3 })],
    stair: [stairAndDoor(), stoneClay({ boil: 0.012 })],
    vault: [vault(), stoneClay({ boil: 0.03, tex: 0.5, edge: 0.4 })],
  };
  return { pillars, lanterns, knobs, bridge, blocks, lanterns_at: LANT, statics: meshes };
}
