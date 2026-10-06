// PALMS (bible 3.6, frames 04 / 06): dark-green poster blobs. Each frond is a FLAT ribbon, 3 tones by the foliage class (lit #8fd04a on the
// light-facing side, body #2c9a5b, shadow #14603c) with the set-line pass giving the 2 px dark edge. 12 on the quay rim and 8 on the island shore.
// Layer 1: the gust whip is a vertex sway weighted by the frond height fraction (uv.y = s along the frond).
// Maths:
//   frond centre c(s) = top + dir (0.9 L s) + up L (0.45 s - 0.7 s^2), s in [0, 1] (rises, then droops to -0.25 L).
//   half-width w(s) = 0.14 L sqrt(s) (1 - s)^0.6 ; ribbon verts c(s) +- perp w(s), perp = (-dir.z, 0, dir.x); 7 segments, a tip vertex.
//   trunk: a Catmull-Rom tube with a 0.45 m lean, radius 0.2 m, class 8 (wood #6a4a2a).
//   sway (vertex): p.x += sin(1.9 tw + 0.4 p.x + 0.3 p.z) 0.35 uv.y ; p.z += cos(1.5 tw + 0.3 p.x) 0.2 uv.y. tw is the stepped, freeze-aware time.
// Palms keep clear of the lens corner (x > 5, z > 5): the wide camera sits there.
import { BufferGeometry, CatmullRomCurve3, DoubleSide, Float32BufferAttribute, Mesh, TubeGeometry, Vector3 } from "three";
import { ARCH, C, PALACE_Z, joinParts, mat, part } from "./common.js";

function frond(x, y, z, a, L) {
  const dir = [Math.cos(a), Math.sin(a)], perp = [-dir[1], dir[0]], pos = [], uv = [], idx = [], N = 7;
  for (let k = 0; k <= N; k++) {
    const s = k / N, w = 0.14 * L * Math.sqrt(s) * Math.pow(1 - s, 0.6), c = [x + dir[0] * 0.9 * L * s, y + L * (0.45 * s - 0.7 * s * s), z + dir[1] * 0.9 * L * s];
    pos.push(c[0] - perp[0] * w, c[1], c[2] - perp[1] * w, c[0] + perp[0] * w, c[1], c[2] + perp[1] * w);
    uv.push(0, s, 0, s);
    if (k > 0) { const i = k * 2; idx.push(i - 2, i - 1, i, i - 1, i + 1, i); }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function buildPalms(ctx, U) {
  const rng = ctx.rng(31), parts = [];
  const spots = []; // { x, y (root height), z, h }
  for (const x of [-10, -6, -2, 2, 6, 10]) spots.push({ x, y: 0, z: -11.4, h: 4.6 + rng() * 1.6 });  // back row
  for (const z of [-6, 0, 4]) spots.push({ x: -10.4, y: 0, z, h: 4.4 + rng() * 1.4 });               // right side (from the lens)
  for (const z of [-6, -1]) spots.push({ x: 10.4, y: 0, z, h: 4.4 + rng() * 1.4 });                  // left side, clear of the lens corner
  spots.push({ x: -10.2, y: 0, z: 8.4, h: 4.6 });
  for (let i = 0; i < 8; i++) spots.push({ x: (i < 4 ? -1 : 1) * (14 + (i % 4) * 11), y: 6.0, z: PALACE_Z + 22 + (i % 3) * 2, h: 6.5 }); // island shore
  for (const { x: rx, y: ry, z: rz, h: H } of spots) {
    const lean = (rng() - 0.5) * 0.9, az = rng() * Math.PI * 2;
    const top = new Vector3(rx + Math.cos(az) * lean, ry + H, rz + Math.sin(az) * lean);
    const curve = new CatmullRomCurve3([new Vector3(rx, ry, rz), new Vector3(rx + Math.cos(az) * lean * 0.3, ry + H * 0.5, rz + Math.sin(az) * lean * 0.3), top]);
    parts.push(part(new TubeGeometry(curve, 8, 0.2, 6), C.trunk, 8));
    const n = 9, L = 2.2 + H * 0.12;
    for (let k = 0; k < n; k++) parts.push(part(frond(top.x, top.y, top.z, (k / n) * Math.PI * 2 + rng() * 0.3, L * (0.85 + rng() * 0.3)), k % 3 === 0 ? C.foliageLit : C.foliageMid, 4));
  }
  const geo = joinParts(parts);
  const material = mat(ctx, U, ARCH, { side: DoubleSide, id: 0.5, vert: "p.x += sin(1.9 * uTw + 0.4 * p.x + 0.3 * p.z) * 0.35 * uv.y; p.z += cos(1.5 * uTw + 0.3 * p.x) * 0.2 * uv.y;" });
  const mesh = new Mesh(geo, material); mesh.frustumCulled = false; mesh.userData.layer = 1;
  return { mesh, dispose() { geo.dispose(); material.dispose(); } };
}
