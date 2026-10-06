// CITY: the layout of Academy City, straight from bible 3.2-3.6 and the easter eggs of section 7.
// All geometry is merged into ONE attribute-carrying BufferGeometry (geo.js Acc), drawn by one material + one ink hull.
// Rules the layout keeps so the accordion fold (stage.js) can bend it: nothing straddles a hinge (z = 0, -22, -50, -82);
// `fitLeaf` slides a footprint into its leaf.
import { BoxGeometry, Color, PlaneGeometry, RingGeometry } from "three";
import { Acc } from "./geo.js";
import { HINGES, LEAVES } from "./stage.js";

const WALLS = ["#eef3fa", "#dfe8f3", "#cfdcec", "#f5f7fb", "#e4ecf6", "#c4d6ea"];
const GLASS = ["#6f9fd6", "#7fb0dc", "#8db8e2", "#5f8fcb"];
const SHADE_TO = new Color("#8fa3d6");
const shadeOf = (hex, k = 0.55) => new Color(hex).lerp(SHADE_TO, k);

// slide a footprint centred on z (depth `span`) wholly inside the leaf that contains z
export function fitLeaf(z, span) {
  for (const [lo, hi] of LEAVES) {
    const a = Math.min(lo, hi), b = Math.max(lo, hi);
    if (z >= a && z <= b) return b - a > span ? Math.min(b - span / 2, Math.max(a + span / 2, z)) : (a + b) / 2;
  }
  return z;
}

const cornerHN = (g) => { const P = g.attributes.position, hn = new Float32Array(P.count * 3); for (let i = 0; i < P.count; i++) { hn[3 * i] = Math.sign(P.getX(i)); hn[3 * i + 1] = Math.sign(P.getY(i)); hn[3 * i + 2] = Math.sign(P.getZ(i)); } return hn; };

// a rooftop wind generator: mast 3.4 m, three blades 2.6 m (x scale s), tip patches (the shader paints the last 20% blue), a motion-arc ring
export function turbine(acc, x, y, z, s, cen, seed) {
  const mast = 3.4 * s, blade = 2.6 * s, hy = y + mast, hz = z + 0.25 * s;
  acc.cyl(0.09 * s, 0.13 * s, mast, x, y + mast / 2, z, { kind: 4, col: "#e4eaf2", shade: "#9fb0c8", cen, xw: 0.6 }, 8);
  acc.sph(0.2 * s, x, hy, hz, { kind: 4, col: "#ffffff", shade: "#c9d6ee", cen, xw: 0.6 });
  const mul = 1 / Math.sqrt(s), pz = hz + 0.1 * s;
  for (let k = 0; k < 3; k++) {
    const a = (k * Math.PI * 2) / 3, g = new BoxGeometry(0.3 * s, blade, 0.05 * s), hn = cornerHN(g);
    for (let i = 0; i < hn.length; i += 3) { const hx = hn[i], hy2 = hn[i + 1]; hn[i] = hx * Math.cos(a) - hy2 * Math.sin(a); hn[i + 1] = hx * Math.sin(a) + hy2 * Math.cos(a); }
    g.translate(0, blade / 2 + 0.2 * s, 0).rotateZ(a).translate(x, hy, pz);
    acc.add(g, { kind: 8, seed, col: "#f7faff", shade: "#c9d6ee", cen, xw: 0.5, hub: [x, hy, pz, mul], y0: blade * 0.8 + 0.2 * s, y1: 0, hn });
  }
  acc.add(new RingGeometry(blade * 0.96, blade * 1.04, 40).translate(x, hy, pz), { kind: 11, col: "#dfe9f8", shade: "#dfe9f8", cen, hub: [x, hy, pz, 0], xw: 0, y0: 0, y1: 0 });
}

// podium 3.2 m, shaft, roof ledge 0.6 m, stepped crown 12-24% of H, top ledge, rooftop plant, mast (bible 3.3)
export function tower(acc, R, x, z0, w, d, H, o = {}) {
  const z = fitLeaf(z0, d + 1.2), cen = [x, z], xw = o.xw ?? 1.0, glass = !!o.glass, seed = R();
  const pod = 3.2, crown = H * (0.12 + 0.12 * R()), top = H - crown;
  const wall = WALLS[Math.floor(R() * WALLS.length)], gl = GLASS[Math.floor(R() * GLASS.length)];
  const col = glass ? gl : wall, shade = shadeOf(col, glass ? 0.4 : 0.55), kind = glass ? 1 : 0;
  acc.box(w + 1.2, pod, d + 1.2, x, pod / 2, z, { kind: 4, col: "#d3d6da", shade: "#7c838e", cen, xw });
  acc.box(w, top - pod, d, x, (pod + top) / 2, z, { kind, seed, col, shade, cen, xw });
  acc.box(w + 0.5, 0.6, d + 0.5, x, top + 0.3, z, { kind: 4, col: "#e6edf6", shade: "#aab5cc", cen, xw });
  const cw = w * 0.7, cd = d * 0.7, sx = (R() - 0.5) * w * 0.12;
  acc.box(cw, crown - 0.6, cd, x + sx, top + 0.6 + (crown - 0.6) / 2, z, { kind, seed, col, shade, cen, xw });
  acc.box(cw + 0.4, 0.5, cd + 0.4, x + sx, H - 0.25, z, { kind: 4, col: "#e6edf6", shade: "#aab5cc", cen, xw });
  acc.box(cw * 0.4, 1.4, cd * 0.4, x + sx - cw * 0.15, H + 0.7, z, { kind: 4, col: "#aab0b8", shade: "#7c838e", cen, xw: xw * 0.7 });
  acc.cyl(0.07, 0.12, 4 + R() * 3, x + sx + cw * 0.25, H + 2.5, z + cd * 0.1, { kind: 4, col: "#8a99ae", shade: "#5a6b86", cen, xw: 0.5 }, 6);
  if (o.turbine) turbine(acc, x + sx - cw * 0.25, H + 0.5, z + cd * 0.15, o.turbine, cen, seed);
  return { x, z, H, w, d, cen };
}

function signal(acc, x, z) {
  const cen = [x, z];
  acc.cyl(0.09, 0.11, 5.2, x, 2.6, z, { kind: 4, col: "#cdd8e6", shade: "#8a99ae", cen, xw: 0.5 }, 8);
  acc.box(0.42, 1.3, 0.42, x, 5.6, z, { kind: 4, col: "#46526a", shade: "#2a3450", cen, xw: 0.6 });
  [["#ff5a4f", 0.0, 5.95], ["#ffc23d", 0.33, 5.6], ["#3fd0b0", 0.66, 5.25]].forEach(([c, ph, y]) => acc.sph(0.14, x, y, z + 0.23, { kind: 6, seed: ph, col: c, shade: c, cen, xw: 0 }, 8, 6));
}
function tree(acc, x, z) {
  const cen = [x, z];
  acc.box(1.1, 0.45, 1.1, x, 0.225, z, { kind: 4, col: "#d3d6da", shade: "#7c838e", cen, xw: 0.6 });
  acc.cyl(0.09, 0.14, 2.6, x, 1.6, z, { kind: 4, col: "#6d7b92", shade: "#46526a", cen, xw: 0.5 }, 7);
  acc.sph(1.15, x, 3.4, z, { kind: 5, col: "#5fa384", shade: "#3c7a68", cen, xw: 0.8 }, 12, 9);
  acc.sph(0.8, x + 0.6, 4.1, z - 0.2, { kind: 5, col: "#5fa384", shade: "#3c7a68", cen, xw: 0.7 }, 10, 8);
}
function bollard(acc, x, z) {
  const cen = [x, z];
  acc.cyl(0.1, 0.1, 0.9, x, 0.45, z, { kind: 4, col: "#f4f7fb", shade: "#b9c8e0", cen, xw: 0.4 }, 8);
  acc.sph(0.11, x, 0.95, z, { kind: 12, col: "#9fe0ff", shade: "#9fe0ff", cen, xw: 0 }, 8, 6);
}

// EASTER EGG 2: the green frog signal lamp (Gekota) and the vending machine on the plaza's left edge
function frogAndVending(acc) {
  const cen = [-15.8, 2];
  acc.cyl(0.07, 0.09, 2.4, -15.8, 1.2, 2, { kind: 4, col: "#cdd8e6", shade: "#8a99ae", cen, xw: 0.5 }, 8);
  acc.sph(0.5, -15.8, 2.7, 2, { kind: 12, col: "#5fd27a", shade: "#3fa65a", cen, xw: 0.8 }, 12, 9);
  for (const sx of [-0.28, 0.28]) {
    acc.sph(0.19, -15.8 + sx, 3.08, 2.12, { kind: 4, col: "#ffffff", shade: "#c9d6ee", cen, xw: 0.5 }, 8, 6);
    acc.sph(0.08, -15.8 + sx, 3.08, 2.29, { kind: 4, col: "#10162a", shade: "#10162a", cen, xw: 0 }, 6, 5);
  }
  const vc = [-16.4, 6.2];
  acc.box(0.9, 1.9, 0.85, -16.4, 0.95, 6.2, { kind: 4, col: "#d9453c", shade: "#8a2a2e", cen: vc, xw: 0.8 });
  acc.box(0.05, 1.15, 0.68, -15.93, 1.25, 6.2, { kind: 12, col: "#cfeaff", shade: "#cfeaff", cen: vc, xw: 0 });
  acc.box(0.06, 0.4, 0.5, -15.93, 0.45, 6.2, { kind: 4, col: "#ffffff", shade: "#b9c8e0", cen: vc, xw: 0 });
}

export function buildCity(ctx) {
  const R = ctx.rng(101), acc = new Acc();

  // ---- ground: strips that END on the hinges so every leaf bends rigidly (kind 3 paints slab, avenues, cross street) ----
  const edges = [420, 0, -22, -50, -82, -420];
  for (let i = 0; i < edges.length - 1; i++) {
    const z0 = edges[i], z1 = edges[i + 1];
    acc.add(new PlaneGeometry(840, Math.abs(z0 - z1)).rotateX(-Math.PI / 2).translate(0, 0, (z0 + z1) / 2), { kind: 3, col: "#c3d1e3", shade: "#9fb2d0", cen: [0, 0], xw: 0, y0: 0, y1: 0 });
  }
  // plaza 34 x 30 m centred (0,1): split on the first hinge; paving, rings and joints are in the shader
  acc.box(34, 0.14, 16, 0, 0.07, 8, { kind: 2, col: "#e3eaf3", shade: "#b5c3dc", cen: [0, 1], xw: 0.9 });
  acc.box(34, 0.14, 14, 0, 0.07, -7, { kind: 2, col: "#e3eaf3", shade: "#b5c3dc", cen: [0, -1], xw: 0.9 });

  // ---- the ten near towers (the first six, nearest the lens, carry the heavier ink) ----
  const near = [
    [-37, 8, 11, 10, 34, 0, 1], [-39, -8, 12, 10, 52, 1, 1], [37, 10, 11, 9, 28, 0, 1], [39, -7, 12, 10, 46, 1, 1],
    [-14, -31, 11, 9, 58, 1, 1], [14, -31, 12, 10, 40, 0, 1], [-34, -34, 10, 9, 24, 0, 0.8], [35, -36, 11, 10, 36, 1, 0.8],
    [-4, -43, 12, 10, 54, 0, 0.8], [-8, 34, 12, 10, 22, 0, 0.8],
  ];
  near.forEach(([x, z, w, d, H, glass, xw], i) => tower(acc, R, x, z, w, d, H, { glass: !!glass, xw: xw === 1 ? 1.6 : 1.0, turbine: H >= 34 || i % 3 === 0 ? 0.8 + R() * 0.5 : 0 }));

  // ---- rows on the far leaves B-D (14-74 m), a canyon left open down the middle, plus flank rows on the near leaves ----
  const rows = [[-58, 13, 150], [-72, 13, 150], [-92, 13, 150], [-106, 13, 150], [-31, 55, 150], [10, 52, 150], [-8, 55, 150]];
  for (const [z, xmin, xmax] of rows) {
    for (let side = -1; side <= 1; side += 2) {
      for (let x = xmin + R() * 6; x < xmax; x += 15 + R() * 7) {
        const H = 14 + 60 * Math.pow(R(), 1.5), w = 9 + R() * 3, d = 8 + R() * 2;
        tower(acc, R, side * x, z + (R() - 0.5) * 4, w, d, H, { glass: R() < 0.4, xw: 0.8, turbine: H > 40 && R() < 0.35 ? 0.8 + R() * 0.6 : 0 });
      }
    }
  }
  // the landmark: 96 x 15 m, crowned by a 6.5x rotor at z = -122
  const lm = tower(acc, R, 0, -122, 96, 15, 84, { glass: true, xw: 1.0 });
  turbine(acc, 0, 84.6, -122 + 3, 6.5, lm.cen, 0.5);

  // ---- rail viaduct at z = -17.8, y = 6.0 (bible 3.4): deck, parapets, rails, pylons, catenary masts, wire; in 20 m runs so it blooms outward ----
  const vz = -17.8;
  for (let i = 0; i < 11; i++) {
    const x = -100 + i * 20, cen = [x, vz];
    acc.box(20.1, 0.7, 3.2, x, 5.65, vz, { kind: 4, col: "#cbd8e8", shade: "#9fb0c8", cen, xw: 1.0 });
    for (const s of [-1, 1]) {
      acc.box(20.1, 0.55, 0.18, x, 6.28, vz + s * 1.45, { kind: 4, col: "#e8eff8", shade: "#aab5cc", cen, xw: 0.7 });
      acc.box(20.1, 0.08, 0.1, x, 6.05, vz + s * 0.6, { kind: 4, col: "#6f7f97", shade: "#4a5668", cen, xw: 0 });
    }
    acc.box(20.1, 0.05, 0.05, x, 10.2, vz, { kind: 4, col: "#6f7f97", shade: "#4a5668", cen, xw: 0 });
  }
  for (let x = -108; x <= 108; x += 12) acc.box(1.5, 5.3, 1.8, x, 2.65, vz, { kind: 4, col: "#cbd8e8", shade: "#8fa3c4", cen: [x, vz], xw: 1.0 });
  for (let x = -108; x <= 108; x += 24) {
    const cen = [x, vz];
    acc.cyl(0.07, 0.1, 4.2, x, 8.1, vz + 1.45, { kind: 4, col: "#8a99ae", shade: "#5a6b86", cen, xw: 0.5 }, 6);
    acc.box(0.06, 0.06, 1.5, x, 10.2, vz + 0.75, { kind: 4, col: "#8a99ae", shade: "#5a6b86", cen, xw: 0 });
  }

  // ---- street furniture around the plaza ----
  for (const sx of [-1, 1]) for (const z of [-12.5, 7]) signal(acc, sx * 22.3, z);
  for (const z of [-11, -5, 13]) tree(acc, -15.6, z);
  for (const z of [-11, -5, 1, 7, 13]) tree(acc, 15.6, z);
  for (const sx of [-1, 1]) tree(acc, sx * 6, 15.2);
  for (let z = -13.5; z <= 15.5; z += 3) { bollard(acc, -17.4, z); bollard(acc, 17.4, z); }
  for (let x = -16; x <= 16; x += 3) { bollard(acc, x, -14.4); bollard(acc, x, 16.4); }
  frogAndVending(acc);
  return acc.build();
}

// the train car, 6 x 1.5 x 1.7 m: body #f3f7fb, stripe #2f6fe0, windows #4f86d8, lamps #ffd96b (local origin = car centre)
export function buildTrain() {
  const a = new Acc(), cen = [0, 0];
  a.box(6, 1.5, 1.7, 0, 0, 0, { kind: 4, col: "#f3f7fb", shade: "#b9c8e0", cen, xw: 1.0 });
  a.box(6.04, 0.3, 1.74, 0, -0.25, 0, { kind: 4, col: "#2f6fe0", shade: "#1d3f9a", cen, xw: 0 });
  a.box(5.2, 0.5, 1.76, 0, 0.3, 0, { kind: 4, col: "#4f86d8", shade: "#2f5fb0", cen, xw: 0 });
  for (const s of [-1, 1]) a.sph(0.14, s * 3.02, -0.1, 0.55, { kind: 12, col: "#ffd96b", shade: "#ffd96b", cen, xw: 0 }, 8, 6);
  return a.build();
}
export { HINGES };
