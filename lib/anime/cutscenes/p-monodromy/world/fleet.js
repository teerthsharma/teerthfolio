// DHOWS (bible 3.7): lateen sail cream (or a ROBES tint) with a violet shadow strip and one rib seam, hull #6a3a2a with a gold sheer
// stripe, a white bow wake. Seven boats at anchor out on the water; they bob on world time (layer 1; the freeze stops them) and are hidden
// while the island is folded (their object-space is not the world's, so the book fold would tear them).
// Maths:
//   hull surface (x in [-1, 1] along the keel, th in [0, pi] round the section):
//     width w(x) = 0.9 (1 - x^2)^0.55 + 0.05, draught d(x) = 0.55 (1 - x^2)^0.7, sheer y0(x) = 0.35 x^2 (bow and stern rise),
//     P(x, th) = (1 length x, y0 - d sin th, w cos th). th in [0, 0.16] is the gold sheer stripe, the rest is hull.
//   lateen sail: a triangle (-0.55, 1.0), (0.45, 1.0), (0.05, 3.3) in the (x, y) plane scaled by the boat length, uv = (u along the foot, v up).
//   bob: y = 0.1 sin(1.1 tw + phase), roll = 0.04 sin(0.9 tw + phase), pitch = 0.03 sin(1.3 tw + phase).
//   wake: two flat foam wedges from the bow, class 0 white, 0.04 m above the water.
import { BufferGeometry, DoubleSide, Float32BufferAttribute, Group, Mesh } from "three";
import { ARCH, C, ROBES, joinParts, mat, part } from "./common.js";

function hullPatch(th0, th1, L, nx = 14, nt = 6) {
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= nt; j++) {
    const x = -1 + (2 * i) / nx, th = th0 + ((th1 - th0) * j) / nt, e = Math.max(0, 1 - x * x);
    const w = 0.9 * Math.pow(e, 0.55) + 0.05, d = 0.55 * Math.pow(e, 0.7), y0 = 0.35 * x * x;
    pos.push(x * L * 0.5, (y0 - d * Math.sin(th)) * L * 0.18 + 0.0, w * Math.cos(th) * L * 0.16); uv.push(i / nx, j / nt);
  }
  for (let i = 0; i < nx; i++) for (let j = 0; j < nt; j++) { const a = i * (nt + 1) + j, b = a + 1, c = a + nt + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
function sail(L, tint) {
  const v = [[-0.55 * L * 0.5 * 2 * 0.5, 1.0], [0.45 * L * 0.5 * 2 * 0.5, 1.0], [0.05 * L * 0.5 * 2 * 0.5, 3.3]];
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute([v[0][0], v[0][1] * L * 0.16, 0, v[1][0], v[1][1] * L * 0.16, 0, v[2][0], v[2][1] * L * 0.16, 0], 3));
  g.setAttribute("uv", new Float32BufferAttribute([0, 0, 1, 0, 0.45, 1], 2));
  g.computeVertexNormals();
  return part(g, tint, 10);
}
function wake(L) {
  const g = new BufferGeometry(), a = L * 0.5, w = 0.3 * L * 0.5;
  const tri = (sx) => [a, 0.05, 0, a - L * 0.46, 0.05, sx * w * 1.6, a - L * 0.34, 0.05, sx * w * 0.5];
  g.setAttribute("position", new Float32BufferAttribute([...tri(1), ...tri(-1)], 3));
  g.setAttribute("uv", new Float32BufferAttribute(new Array(12).fill(0), 2));
  g.computeVertexNormals();
  return part(g, "#e8f6ff", 0);
}

export function buildFleet(ctx, U) {
  const rng = ctx.rng(17);
  const spots = [[-26, -20, 0.6, 9], [30, -34, 2.4, 11], [-52, -52, 1.2, 13], [46, -60, 3.9, 10], [-14, -44, 5.1, 8], [-34, 16, 0.2, 9], [56, -20, 4.4, 10]];
  const root = new Group(), boats = [], geos = [];
  const material = mat(ctx, U, ARCH, { side: DoubleSide, id: 0.5 });
  spots.forEach(([x, z, ry, L], i) => {
    const parts = [part(hullPatch(0.16, Math.PI, L), C.hull, 0), part(hullPatch(0, 0.16, L, 14, 1), C.goldLit, 6), sail(L, ROBES[i % ROBES.length]), wake(L)];
    // mast and yard
    parts.push(part(new ctx.THREE.CylinderGeometry(0.07, 0.1, 3.4 * L * 0.16, 6).translate(0, 1.7 * L * 0.16, 0), "#4a2a1a", 8));
    const geo = joinParts(parts); geos.push(geo);
    const m = new Mesh(geo, material); m.frustumCulled = false;
    m.position.set(x, -1.2, z); m.rotation.y = ry; m.userData.phase = rng() * 6.28;
    boats.push(m); root.add(m);
  });
  root.userData.layer = 1;
  return {
    group: root,
    update(tw, folded) {
      root.visible = !folded;
      for (const m of boats) { const p = m.userData.phase; m.position.y = -1.2 + 0.1 * Math.sin(1.1 * tw + p); m.rotation.z = 0.04 * Math.sin(0.9 * tw + p); m.rotation.x = 0.03 * Math.sin(1.3 * tw + p); }
    },
    dispose() { for (const g of geos) g.dispose(); material.dispose(); },
  };
}
