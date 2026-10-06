// CONIFERS (conifer-tuft-kit, promotable): narrow tiered spruce as in ref 06. Five drooping scalloped cones per tree, a hard sun-side tip
// band, red-brown shadow, NO outline (backgrounds carry no line). Frame flanks (|x| 14..31, z 3..-24) plus a ring on the rim slope.
// Geometry: tier i of n sits at height H (0.16 + 0.62 i/(n-1)); radius H 0.20 (1 - 0.8 f); the base ring is scalloped
//   r' = r (1 + 0.2 sin(7 a + phase)) and droops y' = y - 0.06 h (0.5 + 0.5 sin(7 a + phase)): tufts, not a smooth skirt.
// Shader: aT = 0 at a tier's rim .. 1 at its apex; lam = N.L 0.5 + 0.5, cel in 3 groups (<0.42 #5b1e10, <0.60 #9b543c, else #d18e4e); the
//   tip band #f0b840 where lam > 0.62 and aT < 0.28 (the lit drooping tips); the lowest 7% of each tier is shaded (tier layering).
import { BufferAttribute, ConeGeometry, CylinderGeometry, Mesh } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { C, V, mat, groundY, AURA } from "./common.js";

function tree(R, x, z, H) {
  const out = [], y0 = groundY(x, z), s = H / 10, tiers = 5, yaw = R() * 6.28;
  const trunk = new CylinderGeometry(0.18 * s, 0.32 * s, H * 0.3, 6);
  trunk.setAttribute("aT", new BufferAttribute(new Float32Array(trunk.attributes.position.count).fill(-1), 1));
  trunk.translate(x, y0 + H * 0.15, z); out.push(trunk);
  for (let i = 0; i < tiers; i++) {
    const f = i / (tiers - 1), h = H * 0.3 * (1 - 0.25 * f), rad = H * 0.2 * (1 - 0.8 * f) + 0.15, ph = R() * 6.28;
    const g = new ConeGeometry(rad, h, 10, 1, true), P = g.attributes.position, aT = new Float32Array(P.count);
    for (let v = 0; v < P.count; v++) {
      const base = P.getY(v) < 0; aT[v] = base ? 0 : 1;
      if (base) {
        const a = Math.atan2(P.getZ(v), P.getX(v)), sc = Math.sin(a * 7 + ph);
        P.setXYZ(v, P.getX(v) * (1 + 0.2 * sc), P.getY(v) - 0.06 * h * (0.5 + 0.5 * sc), P.getZ(v) * (1 + 0.2 * sc));
      }
    }
    g.setAttribute("aT", new BufferAttribute(aT, 1));
    g.rotateY(yaw + i); g.translate(x, y0 + H * (0.16 + 0.62 * f) + h / 2, z); out.push(g);
  }
  return out;
}

export function buildConifers(ctx, U) {
  const R = ctx.rng(23), geos = [], casters = [];
  const put = (x, z, H, shadow) => { geos.push(...tree(R, x, z, H)); if (shadow) casters.push({ x, z, w: H * 0.4, d: H * 0.4, yaw: 0, h: H }); };
  for (const side of [-1, 1]) for (let i = 0; i < 11; i++) {          // frame flanks
    let x, z, n = 0;
    do { x = side * (14 + R() * 17); z = 3 - R() * 27; } while (++n < 20 && Math.hypot(x - AURA[0], z - AURA[1]) < 7);
    put(x, z, 8 + R() * 3, true);
  }
  for (let i = 0; i < 16; i++) {                                      // rim ring, off the gate bearing
    const a = -3.0 + i * (2.85 / 15);
    if (Math.abs(a + Math.PI / 2) < 0.14) continue;
    const r = 38 + R() * 10;
    put(r * Math.cos(a), r * Math.sin(a), 9 + R() * 3, false);
  }
  const geo = mergeGeometries(geos.map((g) => { if (g.index) g = g.toNonIndexed(); g.deleteAttribute("uv"); return g; }));
  const m = mat(ctx, U, /* glsl */ `
    vec3 shade(vec3 P, vec3 N, vec3 Vw) {
      float edge = unmakeEdge(P);
      float lam = dot(N, normalize(uLightDir)) * 0.5 + 0.5;
      vec3 c;
      if (vT < -0.5) c = mix(${V(C.trunk)} * 0.5, ${V(C.trunk)}, smoothstep(0.5, 0.56, lam));
      else {
        c = lam < 0.42 ? ${V(C.treeShade)} : (lam < 0.60 ? ${V(C.treeMid)} : ${V(C.treeBody)});
        c = mix(c, ${V(C.tipLit)}, step(0.62, lam) * step(vT, 0.28));
        c = mix(c, ${V(C.treeShade)}, step(vT, 0.07) * 0.55);
        c *= 0.92 + 0.16 * h21(floor(P.xz / 2.0));
      }
      return finish(c, P, edge);
    }`, { side: 2, attrs: "attribute float aT; varying float vT;", vert: "vT = aT;", varyings: "varying float vT;" });
  const mesh = new Mesh(geo, m); mesh.frustumCulled = false;
  return { mesh, casters, dispose() { geo.dispose(); m.dispose(); } };
}
