// CENTRAL CITY ON THE PROMISED DAY, as a pop-up book. The page is the ground
// (a huge spread with the gutter under the plaza); the plaza is a raised
// disc of cobble cards in a cut-away moat that shows the strata (the page,
// Father's crimson layer, the bedrock with its gold-foil veins); Central
// Command is a folded box with a colonnade; rooftops, side avenues and three
// ridges stand in layers, each on its own fold (the book closes by folding
// them flat); the eclipse sky is an indigo card wall with a black sun and a
// gold-foil corona. Every piece is extruded card with a lighter cut edge.
// Local frame: the pup at the origin, +z toward the lens, the plaza centre
// on it. All geometry here is built once and merged per layer.

import { BoxGeometry, Color, CylinderGeometry, Group, InstancedMesh, Mesh } from "three";
import { BRASS, INK, KIND, brad, circlePts, cutShape, layer, ringShape, slab } from "./paper";

export const hash = (i, k = 0) => (((Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1) + 1) % 1;
export const PLAZA_R = 12.4;
export const MOAT_R = 13.4;
export const MOAT_Y = -1.3;
export const COB_H = 0.16;
export const DOCK_AT = [0, 0, -8];
export const DS = 1.25; // the dock's scale at plaza size
export const HQ_Z = -19;
export const STEP_TOP = 1.2;
export const FATHER_AT = [-5, STEP_TOP, -16.6];

const C = { slate: "#4b5675", slateD: "#2f3752", terra: "#b9583b", terraD: "#8a3e2d", ochre: "#cf9d55", cream: "#e8dcc0", creamD: "#cdbd9a", indigo: "#1a1650", gold: "#e3b04a", crimson: "#7a1020", amber: "#e39b3d", lamp: "#ffc86a", bed: "#2b2440", brown: "#6b5538" };
const HOUSE = [C.terra, C.slate, C.ochre, "#9d8f86", "#7f4c56", "#5a6d82"];
const mix = (a, b, k) => {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * k).toString(16).padStart(2, "0")).join("")}`;
};

// A folded-box house: a printed front card with thickness, a body behind it, chimneys.
function house(Ly, x, z, w, h, style, col, haze, ry = 0, depth = 2.6) {
  const hw = w / 2;
  const pts =
    style === 0
      ? [[-hw, 0], [hw, 0], [hw, h], [-hw, h]]
      : style === 1
        ? [[-hw, 0], [hw, 0], [hw, h], [0, h + w * 0.34], [-hw, h]]
        : style === 2
          ? [[-hw, 0], [hw, 0], [hw, h], [hw * 0.55, h], [hw * 0.55, h + 0.9], [-hw * 0.55, h + 0.9], [-hw * 0.55, h], [-hw, h]]
          : [[-hw, 0], [hw, 0], [hw, h * 0.8], [hw * 0.7, h], [-hw * 0.7, h], [-hw, h * 0.8]];
  const c = mix(col, "#40386a", haze);
  const d = mix(c, "#150f28", 0.3);
  Ly.add(cutShape(pts, 0.14), c, { ink: INK.grid }, x, 0, z, ry);
  Ly.add(cutShape(pts, depth).translate(0, 0, -depth), d, { noEdge: true }, x, 0, z, ry);
  for (let k = 0; k < 1 + (style === 1 ? 1 : 0); k++) Ly.add(slab(0.5, 1.5, 0.5).translate((k ? -1 : 1) * hw * 0.45, h + (style === 1 ? w * 0.12 : 0), -depth * 0.5), mix(C.terraD, "#40386a", haze), { noEdge: true }, x, 0, z, ry);
  return Ly;
}

// a row of rooftops along x at z (local to the layer), heights between lo and hi
function row(Ly, seed, z, x0, x1, lo, hi, haze, gap = 0.3) {
  let x = x0;
  let i = 0;
  while (x < x1) {
    const w = 3 + 4 * hash(seed + i, 1);
    const h = lo + (hi - lo) * hash(seed + i, 2);
    house(Ly, x + w / 2, z, w, h, Math.floor(hash(seed + i, 3) * 4), HOUSE[Math.floor(hash(seed + i, 4) * HOUSE.length)], haze);
    x += w + gap;
    i++;
  }
}

// the profile of a ridge
const ridgeH = (x, k) => 7 + 5 * Math.sin(x * 0.05 + k * 2.1) + 3 * Math.sin(x * 0.13 + k) + 1.5 * Math.sin(x * 0.31 + k * 4);
const STRIPES = [0, 0.07, 0.16, 0.27, 0.4, 0.55, 0.75, 0.95];

export function buildWorld(mat) {
  const group = new Group();
  const meshes = [];
  const geos = [];
  const folds = []; // { g, axis: "x" | "z", sign, order } the layers the book folds flat
  const mesh = (geo, parent = group, order = 0) => {
    geos.push(geo);
    const m = new Mesh(geo, mat);
    m.frustumCulled = false;
    m.renderOrder = order;
    parent.add(m);
    meshes.push(m);
    return m;
  };
  const standing = (z, x = 0, axis = "x", sign = -1, order = 0) => {
    const g = new Group();
    g.position.set(x, 0, z);
    group.add(g);
    folds.push({ g, axis, sign, order });
    return g;
  };

  // ---- THE SKY: an indigo card wall, the black sun, the gold-foil corona, the amber band
  const sky = layer();
  sky.add(new CylinderGeometry(122, 122, 160, 28, 1, true).translate(0, 70, 0), "#ffffff", { kind: KIND.sky, noEdge: true });
  mesh(sky.build(), group, -10);
  const band = layer();
  band.add(new CylinderGeometry(116, 116, 11, 36, 1, true).translate(0, 4, 0), "#e39b3d", { noEdge: true, emit: 0.35, ink: INK.stipple });
  band.add(new CylinderGeometry(114, 114, 4, 36, 1, true).translate(0, 12.5, 0), "#c46a3c", { noEdge: true, emit: 0.1, ink: INK.stipple });
  mesh(band.build(), group, -9);
  const SUN = [9, 36, -104];
  const sun = new Group();
  sun.position.set(...SUN);
  group.add(sun);
  const coronaA = layer();
  const rays = (r0, r1, n) => Array.from({ length: n * 2 }, (_, i) => circlePts(i % 2 ? r0 : r1, 1, 0, 0)[0] && [Math.cos((i / (n * 2)) * Math.PI * 2) * (i % 2 ? r0 : r1), Math.sin((i / (n * 2)) * Math.PI * 2) * (i % 2 ? r0 : r1)]);
  coronaA.add(cutShape(rays(11.5, 17.5, 28), 0.5, [circlePts(8.6, 36).reverse()]), C.gold, { kind: KIND.foil }, 0, 0, 0.6);
  const cA = mesh(coronaA.build(), sun, -8);
  const coronaB = layer();
  coronaB.add(cutShape(rays(10.4, 14.5, 18), 0.5, [circlePts(8.4, 36).reverse()]), "#f3d27a", { kind: KIND.foil }, 0, 0, 1.2);
  const cB = mesh(coronaB.build(), sun, -7);
  const disc = layer();
  disc.add(cutShape(circlePts(8.4, 40), 0.7), "#07050f", { noEdge: false }, 0, 0, 1.8);
  const sunDisc = mesh(disc.build(), sun, -6);

  // ---- THE PAGE: a spread with a circular cut for the plaza's moat, the gutter, stitches, printed rules
  const page = layer();
  const rect = [[-82, -14], [82, -14], [82, 100], [-82, 100]];
  const pg = cutShape(rect, 0.4, [circlePts(MOAT_R, 56).reverse()]).rotateX(-Math.PI / 2).translate(0, -0.4, 0);
  page.add(pg.translate(0, 0, 0), C.cream, { faces: "y", ink: INK.rules });
  const gutter = layer();
  gutter.add(new BoxGeometry(1.7, 0.03, 114).translate(0, 0.015, -43), C.brown, { faces: "y", ink: INK.hatch });
  for (let i = -3; i <= 3; i++) gutter.add(new BoxGeometry(0.12, 0.035, 0.7).translate(0, 0.03, -3 + i * 14), "#2b1d12", { faces: "y", noEdge: true });
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) gutter.add(new BoxGeometry(1.3 - k * 0.3, 0.025, 114).translate(s * (1.9 + k * 1.4), 0.012, -43), mix(C.creamD, C.brown, 0.5 - k * 0.15), { faces: "y", noEdge: true });
  mesh(gutter.build());
  const pageMesh = mesh(page.build());

  // ---- THE MOAT: the cut-away. Strata on the far wall: the page, Father's crimson layer, the bedrock with gold veins
  const moat = layer();
  const wall = (r, y0, y1, color, opts) => moat.add(new CylinderGeometry(r, r, y1 - y0, 56, 1, true).translate(0, (y0 + y1) / 2, 0), color, { noEdge: true, ...opts });
  wall(MOAT_R, -0.4, 0, C.cream, { ink: INK.rules });
  wall(MOAT_R, -0.62, -0.4, "#ffffff", { kind: KIND.crimson });
  wall(MOAT_R, MOAT_Y, -0.62, C.bed, { ink: INK.hatch });
  wall(PLAZA_R + 0.02, MOAT_Y, -0.4, C.bed, { ink: INK.hatch });
  wall(PLAZA_R + 0.02, -0.4, -0.18, "#ffffff", { kind: KIND.crimson });
  moat.add(ringShape(PLAZA_R - 0.01, MOAT_R, 0.12, 56).rotateX(-Math.PI / 2).translate(0, MOAT_Y, 0), C.bed, { faces: "y", ink: INK.hatch });
  moat.add(ringShape(PLAZA_R + 0.5, PLAZA_R + 0.95, 0.06, 56).rotateX(-Math.PI / 2).translate(0, MOAT_Y + 0.14, 0), "#ffffff", { kind: KIND.vein, noEdge: true });
  // the island top: the bedrock card the cobbles lie on, with its veins in the gaps between them
  moat.add(new CylinderGeometry(PLAZA_R, PLAZA_R, 0.1, 56).translate(0, -0.1, 0), C.bed, { faces: "y", ink: INK.hatch });
  mesh(moat.build());
  const veins = layer();
  // gold-foil veins along the gaps between cobbles (the tiles sit on a 1 m grid, gaps at k + 0.5), and the cut-edge slits
  for (let k = -12; k <= 12; k++) {
    const gx = k + 0.5;
    const half = Math.sqrt(Math.max(0, PLAZA_R * PLAZA_R - gx * gx)) - 0.2;
    if (half < 1) continue;
    if (k % 2 === 0) veins.add(new BoxGeometry(0.2, 0.02, half * 2).translate(gx, -0.045, 0), "#ffffff", { kind: KIND.vein, noEdge: true });
    else veins.add(new BoxGeometry(half * 2, 0.02, 0.2).translate(0, -0.045, gx), "#ffffff", { kind: KIND.vein, noEdge: true });
  }
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + hash(i, 5) * 0.2;
    const r = PLAZA_R + 0.04;
    veins.add(new BoxGeometry(0.5, 0.18, 0.1).translate(0, MOAT_Y + 0.35 + hash(i, 6) * 0.55, 0), "#ffffff", { kind: KIND.vein, noEdge: true }, Math.cos(a) * r, 0, Math.sin(a) * r, -a + Math.PI / 2);
  }
  mesh(veins.build());

  // ---- FATHER'S NATIONWIDE CIRCLE: a raised crimson card ring on the page, radial and geometric lines past the plaza
  const crim = layer();
  crim.add(ringShape(14.7, 15.6, 0.16, 64).rotateX(-Math.PI / 2), "#ffffff", { kind: KIND.crimson, noEdge: false });
  crim.add(ringShape(17.0, 17.3, 0.1, 64).rotateX(-Math.PI / 2), "#ffffff", { kind: KIND.crimson });
  crim.add(ringShape(24, 24.4, 0.1, 64).rotateX(-Math.PI / 2), "#ffffff", { kind: KIND.crimson });
  crim.add(ringShape(41, 41.5, 0.1, 64).rotateX(-Math.PI / 2), "#ffffff", { kind: KIND.crimson });
  for (let k = 0; k < 28; k++) {
    const a = (k / 28) * Math.PI * 2 + 0.05;
    crim.add(new BoxGeometry(0.34, 0.1, 110).translate(0, 0.05, -55 - 15.6), "#ffffff", { kind: KIND.crimson, faces: "y" }, 0, 0, 0, a);
  }
  const star = (r, kk, L, w, y, ink) => {
    for (let k = 0; k < 7; k++) {
      const a0 = (k / 7) * Math.PI * 2;
      const a1 = ((k + kk) / 7) * Math.PI * 2;
      const p0 = [Math.sin(a0) * r, Math.cos(a0) * r];
      const p1 = [Math.sin(a1) * r, Math.cos(a1) * r];
      const mx = (p0[0] + p1[0]) / 2;
      const mz = (p0[1] + p1[1]) / 2;
      const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + L;
      crim.add(new BoxGeometry(w, y, len).translate(0, y / 2, 0), "#ffffff", { kind: KIND.crimson, faces: "y" }, mx, ink, mz, Math.atan2(p1[0] - p0[0], p1[1] - p0[1]));
    }
  };
  star(15.15, 3, 90, 0.3, 0.1, 0); // the page's heptagram, its lines running out past the ring
  // the plaza's own inlay: rings and a heptagram laid above the cobbles (printed lines, thin)
  crim.add(ringShape(10.3, 10.66, 0.05, 56).rotateX(-Math.PI / 2).translate(0, COB_H + 0.001, 0), "#ffffff", { kind: KIND.crimson, noEdge: true });
  crim.add(ringShape(6.2, 6.5, 0.05, 56).rotateX(-Math.PI / 2).translate(0, COB_H + 0.001, 0), "#ffffff", { kind: KIND.crimson, noEdge: true });
  for (let k = 0; k < 7; k++) {
    const a0 = (k / 7) * Math.PI * 2;
    const a1 = ((k + 3) / 7) * Math.PI * 2;
    const r = 10.4;
    const p0 = [Math.sin(a0) * r, Math.cos(a0) * r];
    const p1 = [Math.sin(a1) * r, Math.cos(a1) * r];
    crim.add(new BoxGeometry(0.26, 0.05, Math.hypot(p1[0] - p0[0], p1[1] - p0[1])).translate(0, 0.025, 0), "#ffffff", { kind: KIND.crimson, noEdge: true }, (p0[0] + p1[0]) / 2, COB_H, (p0[1] + p1[1]) / 2, Math.atan2(p1[0] - p0[0], p1[1] - p0[1]));
  }
  mesh(crim.build(), group, 1);

  // ---- THE RIDGES: three layered card hills, each on a fold; Father's lines run up their faces
  const ridgeZ = [-58, -72, -90];
  const ridgeCol = ["#3a3560", "#5d4a68", "#9a6558"];
  ridgeZ.forEach((z, k) => {
    const fg = standing(z, 0, "x", -1, 1 + k);
    const Ly = layer();
    const pts = [[-125, -8]];
    for (let x = -125; x <= 125; x += 6) pts.push([x, ridgeH(x, k + 1)]);
    pts.push([125, -8]);
    Ly.shadowed(cutShape(pts, 0.9), ridgeCol[k], { ink: INK.hatch }, 0, 0, 0, 0, 0.35 + k * 0.1);
    for (const s of [-1, 1])
      for (const a of STRIPES) {
        if (s > 0 && a === 0) continue;
        const x = s * Math.abs(z) * Math.tan(a);
        if (Math.abs(x) > 118) continue;
        const h = ridgeH(x, k + 1);
        Ly.add(cutShape([[x - 0.2, 0], [x + 0.2, 0], [x + 0.2, h], [x - 0.2, h]], 0.12), "#ffffff", { kind: KIND.crimson }, 0, 0, 0.92);
      }
    for (let b = -4; b <= 4; b++) Ly.add(brad(0.22), BRASS, { emit: 0.35 }, b * 24, 0.5, 1.0);
    mesh(Ly.build(), fg, 1 + k);
  });

  // ---- THE CITY: four depth layers of folded-box rooftops
  const rowZ = [-27, -33, -40, -47];
  rowZ.forEach((z, k) => {
    const fg = standing(z, 0, "x", -1, 4 + k);
    const Ly = layer();
    row(Ly, 40 + k * 17, 0, -100, -15, 3 + k * 1.2, 7 + k * 2.3, 0.12 + k * 0.14);
    row(Ly, 90 + k * 13, 0, 15, 100, 3 + k * 1.2, 7 + k * 2.3, 0.12 + k * 0.14);
    if (k > 0) row(Ly, 200 + k * 7, 0, -15, 15, 5 + k * 1.2, 9 + k * 2.3, 0.15 + k * 0.14);
    for (let b = -5; b <= 5; b++) Ly.add(brad(0.18), BRASS, { emit: 0.3 }, b * 18, 0.35, 0.2);
    mesh(Ly.build(), fg, 4 + k);
  });
  // side avenues: rows turned to face the plaza, each on a fold toward its side
  [[-15.5, 1], [-22, 1], [15.5, -1], [22, -1]].forEach(([x, s], k) => {
    const fg = standing(0, x, "z", s, 3);
    const Ly = layer();
    let zz = -11 - k * 0.8;
    let i = 0;
    while (zz > -46) {
      const w = 3.2 + 3.4 * hash(k * 30 + i, 7);
      house(Ly, 0, zz - w / 2, w, 4.5 + 5 * hash(k * 30 + i, 8) + (k % 2) * 2, Math.floor(hash(k * 30 + i, 9) * 4), HOUSE[Math.floor(hash(k * 30 + i, 10) * HOUSE.length)], 0.08 + (k % 2) * 0.1, s * Math.PI * 0.5, 2.4);
      zz -= w + 0.3;
      i++;
    }
    mesh(Ly.build(), fg, 3);
  });

  // ---- CENTRAL COMMAND: a folded box with a colonnade, lit tall windows, a clock tower and plain pennants
  const hqg = standing(HQ_Z, 0, "x", -1, 3);
  const hq = layer();
  const W = 30;
  const H = 9;
  const win = (cx) => [[cx - 0.55, 1.3], [cx + 0.55, 1.3], [cx + 0.55, 6.3], [cx, 7.1], [cx - 0.55, 6.3]];
  const holes = [];
  for (let i = 0; i < 8; i++) holes.push(win(-11.2 + i * 3.2).reverse());
  const front = [[-W / 2, 0], [W / 2, 0], [W / 2, H], [4.5, H], [0, H + 3], [-4.5, H], [-W / 2, H]];
  hq.shadowed(cutShape(front, 0.3, holes), C.cream, { ink: INK.brick }, 0, 0, 0, 0, 0.3);
  hq.add(cutShape([[-W / 2, 0], [W / 2, 0], [W / 2, H], [-W / 2, H]], 0.1), "#ffc261", { kind: KIND.lamp }, 0, 0, -0.5); // the light behind the windows
  hq.add(cutShape([[-W / 2 + 0.2, 0], [W / 2 - 0.2, 0], [W / 2 - 0.2, H - 0.2], [-W / 2 + 0.2, H - 0.2]], 8).translate(0, 0, -8.6), mix(C.creamD, "#150f28", 0.35), { noEdge: true });
  hq.add(slab(W + 1, 0.5, 2.2), C.terraD, { faces: "y" }, 0, H, -0.4); // the cornice
  hq.add(slab(W + 1.4, 0.3, 1.2), C.terra, { faces: "y" }, 0, 0.1, 1.1);
  // the colonnade: one card column per arch, the arches cut between them
  for (let i = 0; i < 9; i++) {
    const x = -12.8 + i * 3.2;
    hq.add(slab(0.8, 7.2, 0.5), C.creamD, { ink: INK.rules, faces: "y" }, x, 0.2, 1.3);
    hq.add(slab(1.1, 0.35, 0.7), C.cream, { faces: "y" }, x, 0.2, 1.3);
    hq.add(slab(1.1, 0.35, 0.7), C.cream, { faces: "y" }, x, 7.1, 1.3);
    hq.add(brad(0.12), BRASS, { emit: 0.3 }, x, 0.5, 1.58);
    if (i < 8) {
      const cx = x + 1.6;
      hq.add(cutShape([[cx - 1.25, 0.3], [cx + 1.25, 0.3], [cx + 1.25, 7.5], [cx - 1.25, 7.5]], 0.28, [[[cx - 1.0, 0.3], [cx + 1.0, 0.3], [cx + 1.0, 5.6], [cx + 0.7, 6.4], [cx, 6.9], [cx - 0.7, 6.4], [cx - 1.0, 5.6]].reverse()]).translate(0, 0, 1.3), C.terra, { ink: INK.hatch });
    }
  }
  hq.add(slab(W + 2, 0.6, 1.0), C.creamD, { faces: "y" }, 0, 7.5, 1.5);
  // the steps rise toward the building
  for (let s = 0; s < 4; s++) hq.add(slab(18 - s * 0.7, 0.3, 4.2 - s * 0.9).translate(0, 0, 0), s % 2 ? C.cream : C.creamD, { faces: "y", ink: INK.rules }, 0, s * 0.3, 4.6 - s * 0.9 + 0.6 - 0.3);
  // the clock tower behind, with a gold clock face
  hq.shadowed(cutShape([[-2.4, 0], [2.4, 0], [2.4, 17], [0, 20], [-2.4, 17]], 0.5), C.cream, { ink: INK.brick }, 0, H + 3, -3.2, 0, 0.3);
  hq.add(cutShape(circlePts(1.5, 28), 0.12), C.gold, { kind: KIND.foil }, 0, H + 14.5, -2.6);
  hq.add(ringShape(1.35, 1.6, 0.16, 28), C.terraD, {}, 0, H + 14.5, -2.62);
  hq.add(cutShape([[-0.07, 0], [0.07, 0], [0.07, 1.1], [-0.07, 1.1]], 0.08), "#14101e", { noEdge: true }, 0, H + 14.5, -2.45, 0, 0, 0.5);
  hq.add(cutShape([[-0.06, 0], [0.06, 0], [0.06, 0.8], [-0.06, 0.8]], 0.08), "#14101e", { noEdge: true }, 0, H + 14.5, -2.4, 0, 0, -1.9);
  hq.add(cutShape([[-2.9, 0], [2.9, 0], [0, 3.6]], 0.6), C.terra, { ink: INK.hatch }, 0, H + 3 + 20, -3.2 + 0);
  for (const bx of [-1, 1]) hq.add(brad(0.14), BRASS, { emit: 0.3 }, bx * 2, H + 3.5, -2.65);
  mesh(hq.build(), hqg, 3);
  // the pennants snap: plain triangles on poles along the roof
  const PEN = 9;
  const penPrep = layer();
  penPrep.add(cutShape([[0, 0], [2.2, -0.35], [0, -0.9]], 0.05), "#ffffff", {});
  const pen = new InstancedMesh(penPrep.build(), mat, PEN);
  geos.push(pen.geometry);
  pen.frustumCulled = false;
  const pcol = [C.terra, C.ochre, "#3c4b8a"];
  for (let i = 0; i < PEN; i++) pen.setColorAt(i, colorOf(pcol[i % 3]));
  pen.instanceColor.needsUpdate = true;
  hqg.add(pen);
  const poles = layer();
  for (let i = 0; i < PEN; i++) poles.add(slab(0.07, 1.8, 0.07), C.creamD, { noEdge: true }, -14.4 + i * 3.6, H + 0.5, -0.4);
  mesh(poles.build(), hqg, 3);

  // ---- THE DOCK, promoted: the lab's flared collar, plaza disc, rim lamps, the lift shaft and the lit kiosk
  const dock = new Group();
  dock.position.set(...DOCK_AT);
  dock.scale.setScalar(DS);
  group.add(dock);
  const dk = layer();
  dk.add(new CylinderGeometry(2.65, 3.5, 0.5, 28).translate(0, 0.25, 0), C.terraD, { noEdge: true, ink: INK.hatch });
  dk.add(new CylinderGeometry(2.5, 2.65, 0.2, 28).translate(0, 0.6, 0), C.cream, { faces: "y", ink: INK.rules });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    dk.add(new CylinderGeometry(0.11, 0.13, 0.42, 6).translate(0, 0.21, 0), "#ffc45c", { kind: KIND.lamp, noEdge: true }, Math.sin(a) * 2.35, 0.7, Math.cos(a) * 2.35);
  }
  dk.add(new BoxGeometry(1.2, 1.5, 0.9).translate(0, 0.75, 0), C.cream, { faces: "y", ink: INK.rules }, 0, 0.7, 0.34 + 0.45 + 0.15);
  dk.add(new BoxGeometry(1.38, 0.12, 1.08).translate(0, 0.06, 0), C.terra, { faces: "y" }, 0, 0.7 + 1.5, 0.34 + 0.45 + 0.15);
  dk.add(cutShape([[-0.35, 0], [0.35, 0], [0.35, 1.4], [-0.35, 1.4]], 0.04), "#ffc45c", { kind: KIND.lamp }, 0, 0.7, 0.34 + 0.45 + 0.15 + 0.46);
  mesh(dk.build(), dock, 2);
  const shaft = new Mesh(new CylinderGeometry(0.34, 0.4, 1, 10, 1, true).translate(0, 0.5, 0), mat);
  geos.push(shaft.geometry);
  const sg = layer();
  sg.add(new CylinderGeometry(0.34, 0.4, 1, 10, 1, true).translate(0, 0.5, 0), C.cream, { noEdge: true, ink: INK.rules });
  shaft.geometry = sg.build();
  geos.push(shaft.geometry);
  shaft.frustumCulled = false;
  dock.add(shaft);
  meshes.push(shaft);

  // ---- THE COBBLES: >= 400 instanced card tiles on a 1 m grid, each on its own far-edge hinge
  const cobG = layer();
  cobG.add(new BoxGeometry(0.86, COB_H, 0.86).translate(0, COB_H / 2, 0.43), "#ffffff", { faces: "y", kind: KIND.cobble, ink: INK.stipple });
  const cg = cobG.build();
  geos.push(cg);
  const tiles = [];
  for (let gx = -12; gx <= 12; gx++)
    for (let gz = -12; gz <= 12; gz++) {
      const x = gx;
      const z = gz;
      if (x * x + z * z > PLAZA_R * PLAZA_R - 0.5) continue;
      if ((x - DOCK_AT[0]) ** 2 + (z - DOCK_AT[2]) ** 2 < 4.1 * 4.1) continue;
      tiles.push({ x, z, h: hash(gx * 31 + gz, 3), d: Math.hypot(x, z) });
    }
  const cobbles = new InstancedMesh(cg, mat, tiles.length);
  cobbles.frustumCulled = false;
  const tint = [C.terra, C.slate, mix(C.terra, C.cream, 0.25), mix(C.slate, C.cream, 0.2), C.terraD, C.slateD];
  tiles.forEach((t, i) => cobbles.setColorAt(i, colorOf(tint[Math.abs(Math.floor(t.h * 97) + t.x + t.z) % 6])));
  cobbles.instanceColor.needsUpdate = true;
  group.add(cobbles);

  return {
    group,
    mat,
    sun,
    sunDisc,
    cA,
    cB,
    folds,
    tiles,
    cobbles,
    pen,
    shaft,
    dock,
    pageMesh,
    count: { cobbles: tiles.length },
    dispose() {
      for (const g of geos) g.dispose();
      cobbles.dispose();
      pen.dispose();
    },
  };
}

const CC = new Color();
const colorOf = (hex) => CC.set(hex).clone();
