// p-separatrix WORLD: the Colosseum ring (colosseum-ring-kit, local). Three arch tiers and an attic, instanced on an ellipse, facing
// inward (the camera lives inside the arena: facades, not buildings), with a broken sector toward the sun and Rome.
//
// GEOMETRY (metres): one bay = slab W 3.2 x H 4.4 x depth 1.4 with an arched opening cut through (half-width (W - pier)/2 = 1.175, spring 1.85
// so the crown is at 3.025), a cornice (W + 0.15 x 0.4 x depth + 0.3) at the tier top, a pilaster (0.34 x H - 0.5) on the left pier, and a dark
// void plane inside the slab so the openings read #2a1a24 (aVoid = 1). The attic bay is H 3.2 with a rectangular window. Bays sit at equal
// ARC LENGTH on the ellipse x = A cos th, z = B sin th (cumulative chord sum over 4096 samples), local +z = the inward normal, so yaw = atan2(nx, nz).
// BREAK: u = (|th - PHI| - BREAK) / 0.45 + jitter(-0.125..0.125): u < 0 no bay, < 0.3 one tier, < 0.65 two, else three; the attic only past u 0.85.
//   -> a ragged stair-stepped ruin falling away from the gap, plus rubble blocks (instanced, sunk) on the floor under it.
//
// MATERIAL: stoneCel (common.js): 3 hard tones + 6-step micro-posterise + travertine pitting + craquelure + sun rim + 45 degree hatch on the
// shadow face. Shadow tone = mix(#a8602a, #5a1a8c, 0.55) (hue toward violet). Tier AO darkens the foot of each tier. Fresco (erase, gild, zero)
// and apricot haze run last. The set id 0.5 lets the line pass ink the silhouette and the arch mouths.
import { BoxGeometry, BufferAttribute, DoubleSide, ExtrudeGeometry, Group, InstancedMesh, Object3D, Path, PlaneGeometry, Shape } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { surface } from "../../../kit/surface.js";
import { A, B, BAY_W, BREAK, C, DEPTH, PHI, PIER, SPRING, TIER_H, ATTIC_H, PRELUDE, hex, mixHex, floorY } from "./common.js";

const nonIdx = (g, voidv) => {
  const n = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(n.attributes)) if (!["position", "normal", "uv"].includes(k)) n.deleteAttribute(k);
  if (!n.attributes.uv) n.setAttribute("uv", new BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2));
  n.setAttribute("aVoid", new BufferAttribute(new Float32Array(n.attributes.position.count).fill(voidv), 1));
  return n;
};

export function bayGeometry(attic) {
  const W = BAY_W, H = attic ? ATTIC_H : TIER_H, hw = (W - PIER) / 2;
  const s = new Shape();
  if (!attic) {
    s.moveTo(-W / 2, 0); s.lineTo(-hw, 0); s.lineTo(-hw, SPRING); s.absarc(0, SPRING, hw, Math.PI, 0, true);
    s.lineTo(hw, 0); s.lineTo(W / 2, 0); s.lineTo(W / 2, H); s.lineTo(-W / 2, H); s.closePath();
  } else {
    s.moveTo(-W / 2, 0); s.lineTo(W / 2, 0); s.lineTo(W / 2, H); s.lineTo(-W / 2, H); s.closePath();
    const hole = new Path(); hole.moveTo(-0.45, 0.8); hole.lineTo(0.45, 0.8); hole.lineTo(0.45, 2.3); hole.lineTo(-0.45, 2.3); hole.closePath();
    s.holes.push(hole);
  }
  const slab = new ExtrudeGeometry(s, { depth: DEPTH, bevelEnabled: false, curveSegments: 10 }).translate(0, 0, -DEPTH);
  const parts = [nonIdx(slab, 0)];
  if (!attic) parts.push(nonIdx(new BoxGeometry(W + 0.15, 0.4, DEPTH + 0.3).translate(0, H - 0.2, -DEPTH / 2 + 0.15), 0));
  else parts.push(nonIdx(new BoxGeometry(W + 0.15, 0.3, DEPTH + 0.2).translate(0, H - 0.15, -DEPTH / 2 + 0.1), 0));
  parts.push(nonIdx(new BoxGeometry(0.34, H - 0.5, 0.36).translate(-W / 2, (H - 0.5) / 2, 0), 0));
  parts.push(nonIdx(new PlaneGeometry(W, H).translate(0, H / 2, -DEPTH + 0.05), 1));
  return mergeGeometries(parts);
}

export function buildColosseum(ctx, U) {
  const R = ctx.rng("colosseum");
  const group = new Group();
  // ---- arc-length placement on the ellipse
  const S = 4096, th = [], cum = [0];
  for (let i = 0; i <= S; i++) th.push((i / S) * Math.PI * 2);
  for (let i = 1; i <= S; i++) cum.push(cum[i - 1] + Math.hypot(A * Math.cos(th[i]) - A * Math.cos(th[i - 1]), B * Math.sin(th[i]) - B * Math.sin(th[i - 1])));
  const L = cum[S], N = Math.floor(L / BAY_W), thAt = (s) => { let lo = 0, hi = S; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] < s) lo = m; else hi = m; } return th[hi]; };
  const mArch = [], mAttic = [];
  const o = new Object3D(), place = (list, x, y, z, yaw) => { o.position.set(x, y, z); o.rotation.set(0, yaw, 0); o.updateMatrix(); list.push(o.matrix.clone()); };
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const rubbleAt = [];
  for (let i = 0; i < N; i++) {
    const t = thAt((i + 0.5) * (L / N)), x = A * Math.cos(t), z = B * Math.sin(t);
    const nx = -Math.cos(t) / A, nz = -Math.sin(t) / B, nl = Math.hypot(nx, nz), yaw = Math.atan2(nx / nl, nz / nl);
    const u = (Math.abs(wrap(t - PHI)) - BREAK) / 0.45 + (R() - 0.5) * 0.25;
    const tiers = u < 0 ? 0 : u < 0.3 ? 1 : u < 0.65 ? 2 : 3;
    for (let j = 0; j < tiers; j++) place(mArch, x, j * TIER_H, z, yaw);
    if (tiers === 3 && u > 0.85) place(mAttic, x, 3 * TIER_H, z, yaw);
    if (tiers < 3) rubbleAt.push([x, z, nx / nl, nz / nl, 3 - tiers]);
  }
  const mat = surface(ctx.engine.shared, /* glsl */ `
    ${PRELUDE}
    vec3 shade(vec3 P, vec3 N, vec3 V) {
      if (vVoid > 0.5) return ${hex(C.deep)};
      float ty = mod(P.y, ${TIER_H.toFixed(2)});
      float ao = 0.78 + 0.22 * smoothstep(0.0, 1.3, ty);
      vec3 c = stoneCel(P, N, V, ao, ${mixHex(C.stoneMid, C.stoneShade, 0.55)}, ${hex(C.stone)}, ${hex(C.stoneLit)}, 1.0);
      c = fresco(c, P);
      return apricot(c, P);
    }`, { instanced: true, uniforms: U, side: DoubleSide, id: 0.5, attrs: "attribute float aVoid; varying float vVoid;", varyings: "varying float vVoid;", vert: "vVoid = aVoid;" });
  const inst = (geo, list) => {
    const m = new InstancedMesh(geo, mat, Math.max(1, list.length)); m.count = list.length;
    list.forEach((mx, i) => m.setMatrixAt(i, mx)); m.instanceMatrix.needsUpdate = true; m.frustumCulled = false; group.add(m);
  };
  const gArch = bayGeometry(false), gAttic = bayGeometry(true);
  inst(gArch, mArch); inst(gAttic, mAttic);
  // ---- fallen blocks: sunk, yawed, below the ragged stair of the ruin (more where more tiers are missing)
  const blocks = [], bg = new BoxGeometry(1, 1, 1);
  for (const [x, z, nx, nz, missing] of rubbleAt) {
    const n = Math.min(4, 1 + missing);
    for (let k = 0; k < n; k++) {
      const d = 0.8 + R() * 5.0, bx = x + nx * d + (R() - 0.5) * 2.4, bz = z + nz * d + (R() - 0.5) * 2.4;
      const s = 0.5 + R() * R() * 1.9;
      o.position.set(bx, floorY(bx, bz) + s * 0.18, bz); o.rotation.set((R() - 0.5) * 0.5, R() * 6.28, (R() - 0.5) * 0.5); o.scale.set(s * (1 + R()), s * 0.7, s);
      o.updateMatrix(); blocks.push(o.matrix.clone());
    }
  }
  o.scale.set(1, 1, 1);
  inst(bg, blocks);
  // ---- dark back tube behind the full tiers is unnecessary (aVoid planes); a low plinth ring seats the first tier
  return {
    group,
    update() {},
    dispose() { gArch.dispose(); gAttic.dispose(); bg.dispose(); mat.dispose(); },
  };
}
