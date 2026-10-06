// THE FACETED VALLEY (layer 0). A jittered grid made of flat triangles, each one a colour: valley green #3a8a5a / #327a50,
// violet rock #4a3a6a, snow-cream summits, a flat cyan river downstream. Height field h(x, z):
//   lake (z < -6):       bed -9 (hidden under the water at -4) + walls 46 * clamp((|x| - 34) / 70)^1.2 + the far ring
//                        120 * clamp((-z - 150) / 120)^1.2
//   downstream (z > 12): floor -14 + walls (same law, |x| - 30), so the dam stands in a V
//   in between:          smoothstep(-6, 12, z) mixes the two (the dam body hides the join)
//   abutments:           max(h, 10 * smoothstep(18, 26, |x|)) inside |z - 2| < 12, so the crest ends are embedded in rock
// Facets are shaded by stoneMaterial (3-step cel, complementary shadows, diagonal hatch), no ink hull (a hull on 10k facets
// would draw every edge); the silhouette is inked by the far ridge cards instead.
import { BufferAttribute, BufferGeometry, Color, Mesh } from "three";
import { stoneMaterial } from "./geo.js";
import { hash1 } from "./layout.js";

const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const cl = (x) => Math.min(1, Math.max(0, x));
export function height(x, z) {
  const ax = Math.abs(x);
  const up = -9 + 46 * Math.pow(cl((ax - 34) / 70), 1.2) + 120 * Math.pow(cl((-z - 150) / 120), 1.2) + Math.max(0, 9 * Math.sin(x * 0.045 + 1.3) * Math.cos(z * 0.031)) * cl((-z - 30) / 60);
  const down = -14 + 50 * Math.pow(cl((ax - 30) / 70), 1.2) + 70 * Math.pow(cl((z - 80) / 120), 1.2);
  let h = up + (down - up) * sm(-6, 12, z);
  const rough = Math.sin(x * 0.21 + z * 0.17) * Math.cos(z * 0.13 - x * 0.09) * 3.2 + Math.sin(x * 0.7 + z * 0.55) * 0.9;
  h += rough * cl((h + 6) / 14);
  h = Math.max(h, 10 * sm(18, 26, ax) * (1 - sm(10, 14, Math.abs(z - 2))));
  return h;
}

export function buildTerrain(U) {
  const NX = 96, NZ = 64, X0 = -230, X1 = 230, Z0 = -260, Z1 = 150;
  const px = [], col = [], nor = [];
  const at = (i, j) => {
    const k = i * 7.13 + j * 3.71;
    const x = X0 + ((X1 - X0) * i) / NX + (hash1(k) - 0.5) * 3.6, z = Z0 + ((Z1 - Z0) * j) / NZ + (hash1(k + 9) - 0.5) * 3.6;
    return [x, height(x, z), z];
  };
  const green = [new Color("#3a8a5a"), new Color("#327a50")], rock = [new Color("#4a3a6a"), new Color("#5a4a7a")], snow = new Color("#e8e0f0"), river = new Color("#19d3ff");
  for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) {
    const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1);
    for (const tri of (hash1(i * 3.3 + j * 5.1) > 0.5 ? [[a, b, c], [a, c, d]] : [[a, b, d], [b, c, d]])) {
      const y = (tri[0][1] + tri[1][1] + tri[2][1]) / 3, cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, cz = (tri[0][2] + tri[1][2] + tri[2][2]) / 3;
      const h = hash1(cx * 0.37 + cz * 1.13);
      const ux = tri[1][0] - tri[0][0], uy = tri[1][1] - tri[0][1], uz = tri[1][2] - tri[0][2], vx = tri[2][0] - tri[0][0], vy = tri[2][1] - tri[0][1], vz = tri[2][2] - tri[0][2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
      const flip = ny < 0; if (flip) { nx = -nx; ny = -ny; nz = -nz; }
      let c0;
      if (cz > 12 && y < -11 && Math.abs(cx - 6 * Math.sin(cz * 0.04)) < 4.5) c0 = river;
      else if (y > 62) c0 = snow;
      else if (y > 18 || ny < 0.72) c0 = rock[h > 0.5 ? 1 : 0];
      else c0 = green[h > 0.55 ? 1 : 0];
      const order = flip ? [0, 2, 1] : [0, 1, 2];
      for (const o of order) { px.push(...tri[o]); nor.push(nx, ny, nz); col.push(c0.r, c0.g, c0.b); }
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(px), 3));
  g.setAttribute("normal", new BufferAttribute(new Float32Array(nor), 3));
  g.setAttribute("aCol", new BufferAttribute(new Float32Array(col), 3));
  g.computeBoundingSphere();
  const m = new Mesh(g, stoneMaterial(U, { tint: 0.18, side: 2 })); // DoubleSide: the winding is not worth trusting at the jittered seams
  m.frustumCulled = false;
  return m;
}
