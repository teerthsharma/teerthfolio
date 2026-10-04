// KAMINO WARD AT NIGHT, as geometry: a ruined avenue running away from the lens.
// Ground in two grids (fine round the action, coarse to the horizon) lifted by
// one height function (the crater is its bowl), a street of lit and unlit
// towers down both sides (some stumps, some leaning, some fallen across the
// road), street lamps (some bent, some dead), roof tanks, and the data the
// rest of the scene hangs off: the roofs the crowd stands on, the stumps that
// smoke, the lamps that glow. Everything is one of two shard meshes, ground
// and props; props get the ink hull. Deterministic: a hash, no random.

import { DodecahedronGeometry, PlaneGeometry } from "three";
import { hash } from "./../p-caustic/parts";
import { PAL, SH } from "./print";
import { box, build, limb, tag } from "./mesh";

// the ground's height: the crater's bowl and sinter lip, a few shallow pits, nothing else
const PITS = [[5, -16, 1.8], [-7, -24, 2.2], [2, -31, 2.6]];
export function groundY(x, z) {
  const [cx, cz, R] = SH.uCrater.value.toArray();
  let y = 0;
  const q = Math.hypot(x - cx, z - cz) / R;
  if (q < 1) y -= 2.0 * (1 - q * q);
  y += 1.5 * Math.exp(-(((q - 1.1) / 0.5) ** 2));
  for (const [px, pz, pr] of PITS) {
    const r = Math.hypot(x - px, z - pz) / pr;
    if (r < 1) y -= 0.35 * (1 - r * r);
  }
  return y;
}

function grid(w, d, nx, nz, cx, cz, skip) {
  const g = new PlaneGeometry(w, d, nx, nz).rotateX(-Math.PI / 2).translate(cx, 0, cz);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, groundY(p.getX(i), p.getZ(i)));
  g.computeVertexNormals();
  if (!skip) return tag(g, PAL.road);
  // drop the coarse cells that lie under the fine grid
  const f = g.toNonIndexed();
  const fp = f.attributes.position;
  const keep = [];
  for (let t = 0; t < fp.count; t += 3) {
    const mx = (fp.getX(t) + fp.getX(t + 1) + fp.getX(t + 2)) / 3;
    const mz = (fp.getZ(t) + fp.getZ(t + 1) + fp.getZ(t + 2)) / 3;
    if (!(mx > skip[0] && mx < skip[1] && mz > skip[2] && mz < skip[3])) keep.push(t);
  }
  const out = new Float32Array(keep.length * 9);
  keep.forEach((t, k) => {
    for (let a = 0; a < 9; a++) out[k * 9 + a] = fp.array[t * 3 + a];
  });
  f.setAttribute("position", new fp.constructor(out, 3));
  f.deleteAttribute("normal");
  f.deleteAttribute("uv");
  return tag(f, PAL.road);
}

// k: how much the avenue is narrowed for a portrait screen (1 on a wide one)
// the blocks inside the dome's reach are built as 6-10 loose pieces (info.chunks) instead of one merged box
export const WRECK_AT = [1.4, -7.2];
const WRECK_R = 44;
export function buildCity(k) {
  const HW = 4.4 * k;
  SH.uStreet.value = HW;
  const parts = [];
  const info = { roofs: [], smoke: [], lamps: [], flags: [], chunks: [], HW };
  const walls = [PAL.wallA, PAL.wallB, PAL.wallC, PAL.wallD];

  let n = 0;
  for (const side of [-1, 1]) {
    let z = -9 - 3 * hash(side + 5, 1); // the first block stands well back: the sky shows over a low foreground
    while (z > -95) {
      const i = n++;
      const w = 7 + 5 * hash(i, 1);
      const depth = 9 + 6 * hash(i, 2);
      const inner = HW + 1.3 + (hash(i, 3) < 0.2 ? 1.2 : 0);
      // the near blocks are low and broken so the sky shows over them; the intact towers stand back
      const h = 2.5 + 0.34 * -z + 3 * hash(i, 4);
      const pal = walls[(i * 3 + (side > 0 ? 1 : 0)) % 4];
      const cx = side * (inner + depth / 2);
      const cz = z - w / 2;
      const r = hash(i, 5);
      if (r < 0.3) {
        // collapsed: a stump, jagged broken storeys, one slab leaning on it, a heap spilling into the street
        const hs = h * (0.35 + 0.2 * hash(i, 6));
        parts.push(tag(box(depth, hs, w, cx, hs / 2, cz), pal));
        for (let b = 0; b < 4; b++) {
          const bh = hs * (0.3 + 0.9 * hash(i * 7 + b, 7));
          const bw = w * (0.18 + 0.2 * hash(i * 7 + b, 8));
          parts.push(tag(box(depth * (0.5 + 0.4 * hash(i * 5 + b, 3)), bh, bw, cx + side * (hash(i + b, 2) - 0.2) * depth * 0.2, hs + bh / 2 - 0.2, cz - w / 2 + bw / 2 + (w - bw) * (b / 3), 0, 0, (hash(i + b, 4) - 0.5) * 0.12), pal));
        }
        const lean = side * (0.45 + 0.35 * hash(i, 9));
        parts.push(tag(box(depth * 0.9, 0.55, w * 0.7, cx - side * (depth * 0.15), hs * 1.1 + 1.0, cz, 0, 0, lean), PAL.roof));
        for (let b = 0; b < 3; b++) parts.push(tag(new DodecahedronGeometry(1.2 + 1.2 * hash(i * 3 + b, 1), 0).scale(1, 0.55, 1).translate(side * (inner - 0.6 - 1.6 * b * hash(i + b, 3)), 0.5, cz + (hash(i + b, 2) - 0.5) * w), PAL.rubble));
        info.smoke.push({ x: cx, y: hs + 1.5, z: cz, s: 1 + hash(i, 2) });
      } else {
        const wreck = Math.hypot(cx - WRECK_AT[0], cz - WRECK_AT[1]) < WRECK_R;
        if (wreck) {
          // 3 or 4 storeys x 2 halves, the cornice, the roof tank: 7 to 10 pieces
          const ny = 3 + (hash(i, 13) < 0.5 ? 1 : 0);
          for (let j = 0; j < ny; j++) for (let q = 0; q < 2; q++) info.chunks.push({ x: cx, y: ((j + 0.5) * h) / ny, z: cz - w / 4 + (q * w) / 2, sx: depth, sy: h / ny, sz: w / 2, pal });
          info.chunks.push({ x: cx, y: h + 0.1, z: cz, sx: depth + 0.5, sy: 0.4, sz: w + 0.5, pal: PAL.roof });
          if (hash(i, 6) < 0.6) info.chunks.push({ x: cx + (hash(i, 7) - 0.5) * depth * 0.5, y: h + 1.4, z: cz + (hash(i, 8) - 0.5) * w * 0.4, sx: 2, sy: 2.4, sz: 2, pal: PAL.steel });
        } else {
        parts.push(tag(box(depth, h, w, cx, h / 2, cz), pal));
        // a cornice and a roof tank
        parts.push(tag(box(depth + 0.5, 0.4, w + 0.5, cx, h + 0.1, cz), PAL.roof));
        if (hash(i, 6) < 0.6) parts.push(tag(box(2, 2.4, 2, cx + (hash(i, 7) - 0.5) * depth * 0.5, h + 1.4, cz + (hash(i, 8) - 0.5) * w * 0.4), PAL.steel));
        }
        if (!wreck && hash(i, 10) < 0.35) {
          // a broken storey: a corner torn off the top
          parts.push(tag(box(depth * 0.45, 2.4, w * 0.45, cx - side * depth * 0.25, h - 1.0, cz + w * 0.28, 0.12, 0.2, 0), PAL.rubble));
        }
        if (-z > 8 && -z < 34) info.roofs.push({ x: side * (inner + 0.6), y: h + 0.3, z: cz, w, side, i }); // the roof's street lip: the crowd stands at the front of it
        if (!wreck && hash(i, 11) < 0.3 && -z < 60) {
          const fx = cx - side * depth * 0.35;
          const fz = cz + w * 0.3;
          parts.push(tag(limb([fx, h + 0.3, fz], [fx, h + 4.6, fz], 0.08, 0.05, 4), PAL.pole));
          info.flags.push({ x: fx, y: h + 3.7, z: fz, i, side });
        }
      }
      z -= w + 0.6 + 1.5 * hash(i, 12);
    }
  }
  // slabs of road and floor thrown about
  for (let i = 0; i < 16; i++) {
    const x = (hash(i, 21) - 0.5) * 2 * HW * 0.95;
    const z = -3 - 40 * hash(i, 22) ** 1.2;
    const s = 1 + 1.6 * hash(i, 23);
    parts.push(tag(box(s * 1.6, 0.3, s, x, groundY(x, z) + 0.3 + s * 0.18, z, (hash(i, 24) - 0.5) * 0.7, hash(i, 25) * 3, (hash(i, 26) - 0.5) * 0.7), i % 3 ? PAL.road : PAL.rubble));
  }
  // street lamps down both sides: some lit, some bent, some dead
  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const x = side * (HW + 0.7);
      const z = -2 - 9 * i - 3 * hash(i + side, 31);
      const h = 6.2;
      const bent = hash(i + side * 9, 32) < 0.28;
      const dx = bent ? -side * h * (0.25 + 0.3 * hash(i, 33)) : 0; // a bent pole leans into the street
      const tx = x + dx;
      const ty = Math.sqrt(h * h - dx * dx);
      parts.push(tag(limb([x, 0, z], [tx, ty, z], 0.14, 0.09, 5), PAL.pole));
      parts.push(tag(limb([tx, ty, z], [tx - side * 1.5, ty + (bent ? -0.5 : 0.25), z], 0.09, 0.07, 5), PAL.pole));
      const live = !bent && hash(i + side * 5, 34) < 0.78;
      parts.push(tag(box(0.7, 0.28, 0.45, tx - side * 1.55, ty + (bent ? -0.55 : 0.2), z), live ? PAL.lamp : PAL.roof));
      if (live) info.lamps.push({ x: tx - side * 1.55, y: ty + 0.1, z });
    }
  }
  // a rubble heap or two against the lamps
  for (let i = 0; i < 14; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * (HW - 0.2 + 1.6 * hash(i, 41));
    const z = -3 - 38 * hash(i, 42);
    parts.push(tag(new DodecahedronGeometry(0.7 + 0.9 * hash(i, 43), 0).scale(1.2, 0.6, 1).rotateY(hash(i, 44) * 3).translate(x, 0.2, z), PAL.rubble));
  }
  const props = build(parts, 0.02);
  const fine = grid(17.6, 44, 22, 54, 0, -16, null);
  const coarse = grid(220, 240, 28, 30, 0, -70, [-8.8, 8.8, -38, 6]);
  const ground = build([fine, coarse], 0.0);
  return { ground, props, info, groundY };
}
