// SHADOWS (long-shadow-strips, promotable): flat, HARD-edged violet cast plates falling away from the low sun (ref 02, #2f121e/#5a3c8a),
// no tip fade. Each caster (a footprint rectangle and a height) throws the convex hull of its footprint and the footprint translated by
// SHADOW_DIR x height x SHADOW_K (stylised 2.2; the true cot(elevation) is about 3.7). Two plates: the dark hard one (alpha 0.62, the
// shape of the shadow) and a wider, lighter ambient one (alpha 0.18, footprint x 1.35, throw x 0.6). The alpha comes from the material
// id channel (surface writes id as alpha, the over-blend keeps the target's own alpha).
import { BufferAttribute, BufferGeometry, Mesh } from "three";
import { C, V, mat, groundY, SHADOW_DIR, SHADOW_K } from "./common.js";

function hull(pts) { // Andrew monotone chain, counter-clockwise
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  lo.pop(); up.pop(); return lo.concat(up);
}

function plates(casters, grow, throwK) {
  const pos = [];
  for (const c of casters) {
    const cs = Math.cos(c.yaw), sn = Math.sin(c.yaw), hw = (c.w * grow) / 2, hd = (c.d * grow) / 2;
    const corners = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([x, z]) => [c.x + x * cs + z * sn, c.z - x * sn + z * cs]);
    const L = c.h * SHADOW_K * throwK, shifted = corners.map(([x, z]) => [x + SHADOW_DIR[0] * L, z + SHADOW_DIR[1] * L]);
    const H = hull(corners.concat(shifted)), y = groundY(c.x, c.z) + 0.03;
    for (let i = 1; i < H.length - 1; i++) for (const q of [H[0], H[i], H[i + 1]]) pos.push(q[0], y, q[1]);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.computeVertexNormals();
  return g;
}

export function buildShadows(ctx, U, casters) {
  const list = casters.filter((c) => Math.hypot(c.x, c.z) < 36 || Math.abs(c.z + 34.6) < 0.5 || c.h > 10); // flat court only (trees on the slope throw none)
  const make = (id, col, grow, throwK, order) => {
    const m = mat(ctx, U, `vec3 shade(vec3 P, vec3 N, vec3 Vw) { float e = unmakeEdge(P); return ${V(col)}; }`, { id, side: 2 });
    m.transparent = true; m.depthWrite = false; m.blending = 5; m.blendSrc = 204; m.blendDst = 205; m.blendSrcAlpha = 200; m.blendDstAlpha = 201;
    m.polygonOffset = true; m.polygonOffsetFactor = -3; m.polygonOffsetUnits = -3;
    const g = plates(list, grow, throwK), mesh = new Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = order;
    return { mesh, dispose() { g.dispose(); m.dispose(); } };
  };
  const ambient = make(0.18, "#8a6aa8", 1.35, 0.6, -5), hard = make(0.62, C.cast, 1, 1, -4);
  return { meshes: [ambient.mesh, hard.mesh], dispose() { ambient.dispose(); hard.dispose(); } };
}
