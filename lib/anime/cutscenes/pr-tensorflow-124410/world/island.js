// THE ISLAND (layer 0): shots 7 and 8 leave the dam (the poster tear) for the open island ground, in the snow-and-magenta
// palette. The seal's chase pose needs OPEN GROUND: a flat plateau of radius 12 around the origin, then low dunes,
//   h(x, z) = 2.6 * smoothstep(12, 44, r) * (0.55 + 0.45 sin(0.08 x) cos(0.07 z)) + 0.35 * smoothstep(12, 30, r) sin(0.5 x + 0.4 z)
// built as flat facets (snow #f4f4f0 / #e6ecf4), shaded by the Araki set shader (the shadow hue is the palette's cyan-violet).
// Scattered, inked, never inside the plateau: lilac boulders, snowy conifers, ice crystals. A far flat plane under the
// horizon closes the ground out to the ridge ring. Props come from hash1 (deterministic).
import { BufferAttribute, BufferGeometry, Color, Group, Mesh, SphereGeometry } from "three";
import { hash1 } from "./layout.js";
import { Parts, disposeTree, inked, stoneMaterial } from "./geo.js";

const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hgt = (x, z) => { const r = Math.hypot(x, z); return 2.6 * sm(12, 44, r) * (0.55 + 0.45 * Math.sin(0.08 * x) * Math.cos(0.07 * z)) + 0.35 * sm(12, 30, r) * Math.sin(0.5 * x + 0.4 * z); };

function ground() {
  const N = 40, S = 200, px = [], nor = [], col = [];
  const at = (i, j) => { const k = i * 5.3 + j * 9.1, x = -S / 2 + (S * i) / N + (hash1(k) - 0.5) * 2.2, z = -S / 2 + (S * j) / N + (hash1(k + 4) - 0.5) * 2.2; return [x, hgt(x, z), z]; };
  const A = new Color("#f4f4f0"), B = new Color("#e6ecf4");
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1);
    for (const t of [[a, c, b], [a, d, c]]) {
      const ux = t[1][0] - t[0][0], uy = t[1][1] - t[0][1], uz = t[1][2] - t[0][2], vx = t[2][0] - t[0][0], vy = t[2][1] - t[0][1], vz = t[2][2] - t[0][2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      const c0 = hash1(i * 1.7 + j * 3.1) > 0.5 ? A : B;
      for (const v of t) { px.push(...v); nor.push(nx, ny, nz); col.push(c0.r, c0.g, c0.b); }
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(px), 3));
  g.setAttribute("normal", new BufferAttribute(new Float32Array(nor), 3));
  g.setAttribute("aCol", new BufferAttribute(new Float32Array(col), 3));
  g.computeBoundingSphere();
  return g;
}

function props() {
  const p = new Parts();
  for (let i = 0; i < 70; i++) {
    const a = hash1(i * 12.9) * Math.PI * 2, r = 14 + hash1(i * 7.7 + 1) * 70, x = Math.cos(a) * r, z = Math.sin(a) * r, y = hgt(x, z), k = hash1(i * 3.3 + 2);
    if (k < 0.34) p.add(new SphereGeometry(1, 5, 4), "#c8d8e8", { x, y: y + 0.3, z, sx: 0.9 + k * 3, sy: 0.6 + k * 2, sz: 0.9 + k * 2.5, ry: a });             // lilac boulders
    else if (k < 0.7) {                                                                                                                                       // snowy conifers
      const s = 0.8 + hash1(i * 5.1) * 1.2;
      p.cyl(0.18 * s, 0.26 * s, 1.2 * s, 5, "#4a3a6a", { x, y: y + 0.6 * s, z });
      for (let t = 0; t < 3; t++) p.cone((1.5 - t * 0.38) * s, 1.8 * s, 6, t % 2 ? "#e6f0f4" : "#dce8f0", { x, y: y + (1.5 + t * 1.0) * s, z });
    } else for (let t = 0; t < 3; t++) p.cone(0.28 + 0.1 * t, 2.2 + t * 0.9, 4, "#c8e0f0", { x: x + (t - 1) * 0.5, y: y + 1.1 + t * 0.45, z: z + (t % 2) * 0.4, rz: (t - 1) * 0.12 }); // ice crystals
  }
  return p.build();
}

export function buildIsland(U) {
  const g = new Group(); g.name = "island";
  const m = new Mesh(ground(), stoneMaterial(U, { tint: 0.15, side: 2, hatch: 1 })); m.frustumCulled = false; g.add(m);
  const far = new Mesh(new Parts().box(900, 0.4, 900, "#e6ecf4", { y: -0.7 }).build(), stoneMaterial(U, { tint: 0.15, hatch: 0 })); far.frustumCulled = false; g.add(far); // the flat ground out to the ridge ring
  g.add(inked(props(), U, { tint: 0.12 }));
  g.userData.dispose = () => disposeTree(g);
  return g;
}
