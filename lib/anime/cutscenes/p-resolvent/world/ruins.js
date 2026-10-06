// RUINS: curtain wall with the arched gate (Graz lintel egg), end bastions, keep, tower, Aura's dais, Fern and Stark walls, the fallen
// column, a broken colonnade, rubble. ONE merged geometry, ONE masonry material (no outline: the lines are value drops in the shader).
// Masonry shader maths (world space, so merged pieces tile seamlessly):
//   face plane: vertical faces use (x, y) when |Nz| > |Nx| else (z, y); top faces use (x, z) with 0.9 m courses.
//   course row = floor(y / 0.42); block width bw = 0.9 + 0.5 h21(row); block id from x / bw + a per-row offset; f = fract position in block.
//   stone tone from the 4-colour STONE ramp; lit = smoothstep(0.1, 0.14, N.L): 2 tone, HARD edge. shadow = tone x 0.55 mixed 50% to #5a3c8a.
//   dark violet line only at block BOTTOMS (f.y < 0.03, AA by fwidth); chips = corner cuts on 1 block in 5; cracks = Voronoi borders.
//   orange rim strips #ffb040: the top 10% of a course on 45% of blocks, only on sun-lit faces (ref 02).
//   autumn ivy: red-orange hard patches on the lowest 1.4 m of vertical faces.
import { BoxGeometry, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Group, Mesh, PlaneGeometry, Shape } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { stones } from "../../../kit/stones.js";
import { C, V, mat, flat, box, decal, AURA } from "./common.js";

// merge-safe: non-indexed, position + normal only
const bare = (g) => { if (g.index) g = g.toNonIndexed(); for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal") g.deleteAttribute(k); return g; };

function archBand(depth) { // the voussoir ring round the gate mouth: outer r 4.5, inner r 3.6, springing at y 2.8
  const s = new Shape();
  s.moveTo(-4.5, -5); s.lineTo(-4.5, 2.8); s.absarc(0, 2.8, 4.5, Math.PI, 0, true); s.lineTo(4.5, -5); s.lineTo(3.6, -5); s.lineTo(3.6, 2.8);
  s.absarc(0, 2.8, 3.6, 0, Math.PI, false); s.lineTo(-3.6, -5); s.closePath();
  return new ExtrudeGeometry(s, { depth, bevelEnabled: false, steps: 1, curveSegments: 20 });
}
function gateWall(depth) { // curtain wall 60 m long, top 8.6 m, gate mouth 7.2 wide and 6.4 high (3.6 radius arch on a 2.8 m jamb)
  const s = new Shape();
  s.moveTo(-30, -5); s.lineTo(30, -5); s.lineTo(30, 8.6); s.lineTo(-30, 8.6); s.closePath();
  const h = new Shape();
  h.moveTo(-3.6, -4.9); h.lineTo(-3.6, 2.8); h.absarc(0, 2.8, 3.6, Math.PI, 0, true); h.lineTo(3.6, -4.9); h.closePath();
  s.holes.push(h);
  return new ExtrudeGeometry(s, { depth, bevelEnabled: false, steps: 1, curveSegments: 20 });
}

export function buildRuins(ctx, U) {
  const R = ctx.rng(11), parts = [], roofParts = [], slits = [], casters = [];
  const addCaster = (x, z, w, d, yaw, h) => casters.push({ x, z, w, d, yaw, h });

  // --- curtain wall + gate + merlons + bastions (wall spans z -35.8 .. -33.4)
  parts.push(gateWall(2.4).translate(0, 0, -35.8));
  parts.push(archBand(2.9).translate(0, 0, -36.05));
  for (let x = -29; x <= 29; x += 3) if (Math.abs(x) > 6) parts.push(box(1.5, 1.1, 2.4, [x, 9.15, -34.6]));
  for (const sx of [-1, 1]) {
    parts.push(box(6, 16, 6, [sx * 32.5, 3, -34.6]), box(6.8, 1.2, 6.8, [sx * 32.5, 11.6, -34.6]));
    addCaster(sx * 32.5, -34.6, 6, 6, 0, 11);
  }
  addCaster(0, -34.6, 60, 2.4, 0, 8.6);
  // --- keep and tower behind the wall (seen through the gate and over the wall)
  parts.push(box(13, 24, 10, [12, 7, -44]), box(14.4, 1.2, 11.4, [12, 19.6, -44]));
  addCaster(12, -44, 13, 10, 0, 20);
  parts.push(new CylinderGeometry(3.4, 3.8, 26, 16, 1).translate(-20, 8, -42));
  addCaster(-20, -42, 7, 7, 0, 21);
  roofParts.push(new ConeGeometry(4.4, 7, 16).translate(-20, 24.5, -42));                          // tower roof
  roofParts.push(new ConeGeometry(10.5, 6.5, 4).rotateY(Math.PI / 4).translate(12, 23.4, -44));   // keep roof (pyramid)
  for (const s of [[12, 12, -38.95, 0.5], [9, 16, -38.95, 0.5], [15, 16, -38.95, 0.5], [-20, 13, -38.7, 0.45], [-20, 18, -38.65, 0.45]]) slits.push(s);
  // --- Aura's dais: 7.0 x 4.4 slab and a 6.0 x 3.6 upper step, 0.45 m each, front toward the seal
  const yaw = Math.atan2(-AURA[0], -AURA[1]);
  const slab = (w, h, d, y) => { const g = new BoxGeometry(w, h, d); g.translate(0, y, 0); g.rotateY(yaw); g.translate(AURA[0], 0, AURA[1]); return g; };
  parts.push(slab(7.0, 0.45, 4.4, 0.225), slab(6.0, 0.45, 3.6, 0.675));
  addCaster(AURA[0], AURA[1], 7.0, 4.4, yaw, 0.9);
  // --- Fern and Stark walls (low; the bystanders stand on top: tops 2.3 and 1.9 m)
  parts.push(box(3.6, 7.3, 1.8, [-0.2, -1.35, -13.4], 0.08)); addCaster(-0.2, -13.4, 3.6, 1.8, 0.08, 2.3);
  parts.push(box(3.4, 6.9, 1.8, [5.6, -1.55, -14.2], -0.1)); addCaster(5.6, -14.2, 3.4, 1.8, -0.1, 1.9);
  // --- the fallen column, a capital block beside it
  const cx = -9, cz = -9, cy = 0.5;
  parts.push(new CylinderGeometry(0.7, 0.78, 6, 14).rotateZ(Math.PI / 2).rotateY(cy).translate(cx, 0.7, cz));
  parts.push(box(1.7, 0.5, 1.7, [cx + 2.6 * Math.cos(cy), 0.25, cz - 2.6 * Math.sin(cy)], cy + 0.3));
  addCaster(cx, cz, 6, 1.5, cy, 1.4);
  // --- a broken colonnade on the back arc (r 29), skipping the gate bearing
  for (let i = 0; i < 9; i++) {
    const ang = -2.55 + i * 0.26;
    if (Math.abs(ang + Math.PI / 2) < 0.2) continue;
    const x = 29 * Math.cos(ang), z = 29 * Math.sin(ang), h = 2 + R() * 4.2;
    parts.push(new CylinderGeometry(0.62, 0.72, h, 10).translate(x, h / 2, z), box(1.7, 0.5, 1.7, [x, 0.25, z]));
    addCaster(x, z, 1.4, 1.4, 0, h + 0.5);
  }
  // --- rubble (kit stones), clear of the seal (r > 4.8), the dais and the fountain
  const list = [];
  for (let i = 0, tries = 0; i < 26 && tries < 300; tries++) {
    const x = (R() - 0.5) * 56, z = 2 - R() * 32;
    if (Math.hypot(x, z) < 4.8 || Math.hypot(x, z) > 33 || Math.hypot(x - AURA[0], z - AURA[1]) < 4.6 || Math.hypot(x + 4.4, z + 4.6) < 3.2) continue;
    list.push({ size: [0.5 + R(), 0.35 + R() * 0.7, 0.5 + R() * 0.9], at: [x, 0, z], seed: 3 + i, flat: 0.55, sink: 0.3 });
    i++;
  }
  parts.push(stones(list, 0.7));

  const geo = mergeGeometries(parts.map(bare));
  const stoneMat = mat(ctx, U, /* glsl */ `
    vec3 shade(vec3 P, vec3 N, vec3 Vw) {
      float edge = unmakeEdge(P);
      vec3 L = normalize(uLightDir);
      float lam = dot(N, L);
      bool top = N.y > 0.7;
      float tf = top ? 0.0 : 1.0;
      vec2 uvp = abs(N.z) > abs(N.x) ? vec2(P.x, P.y) : vec2(P.z, P.y);
      float ch = 0.42;
      if (top) { uvp = P.xz; ch = 0.9; }
      float row = floor(uvp.y / ch), bw = 0.9 + 0.5 * h21(vec2(row, 2.0));
      float x = uvp.x / bw + h21(vec2(row, 7.0)) * 5.0, bid = floor(x);
      vec2 f = vec2(fract(x), fract(uvp.y / ch));
      float t = h21(vec2(bid, row));
      vec3 sc = t < 0.25 ? ${V(C.stone[0])} : (t < 0.55 ? ${V(C.stone[1])} : (t < 0.8 ? ${V(C.stone[2])} : ${V(C.stone[3])}));
      sc *= 0.94 + 0.12 * fbm(P.xz * 3.0 + P.y * 2.0);
      float lit = smoothstep(0.10, 0.14, lam);
      vec3 c = mix(mix(sc * 0.55, ${V(C.cast)}, 0.5), sc, lit);
      if (top) c = mix(c, ${V(C.stoneTop)}, lit * 0.7);                                           // the chipped sun-lit top plane
      float chip = step(0.8, h21(vec2(bid, row) + 3.0)) * step(0.78, f.x) * step(0.7, f.y);
      c = mix(c, c * vec3(0.62, 0.52, 0.72), chip);
      vec2 vv = vor(uvp * 1.7 + bid * 3.1);
      c = mix(c, ${V(C.deep)}, (1.0 - smoothstep(0.0, 0.03, vv.y)) * 0.4 * step(0.82, h21(vec2(bid, row) + 6.0)));
      float w = fwidth(uvp.y / ch) + 1e-4;
      c = mix(c, ${V(C.line)}, (1.0 - smoothstep(0.03, 0.03 + w, f.y)) * 0.6 * tf);                // line at block bottoms only
      c = mix(c, c * 0.72, (1.0 - smoothstep(0.012, 0.012 + fwidth(x) + 1e-4, f.x)) * 0.5 * tf);   // joints: a value drop
      float rim = smoothstep(0.88, 0.9, f.y) * step(0.55, h21(vec2(bid, row) + 9.0)) * lit * tf;
      c = mix(c, ${V(C.rim)} * 1.1, rim);                                                          // golden rim strip (ref 02)
      float iv = step(P.y, 1.4) * tf * step(0.58, fbm(uvp * 2.0 + 13.0));
      vec3 ic = h21(floor(uvp * 6.0)) < 0.5 ? ${V("#b84a22")} : ${V("#9e2f26")};                  // autumn ivy
      c = mix(c, ic * (0.6 + 0.6 * lit), iv * 0.9);
      return finish(c, P, edge);
    }`);
  const mesh = new Mesh(geo, stoneMat); mesh.frustumCulled = false;

  const roofGeo = mergeGeometries(roofParts.map(bare));
  const roofMat = mat(ctx, U, /* glsl */ `
    vec3 shade(vec3 P, vec3 N, vec3 Vw) {
      float edge = unmakeEdge(P);
      float lam = dot(N, normalize(uLightDir));
      float row = floor(P.y / 0.45), f = fract(P.y / 0.45);
      vec3 base = ${V(C.roof)} * (0.9 + 0.2 * h21(vec2(row, floor(atan(P.x + 30.0, P.z) * 6.0))));
      vec3 c = mix(mix(base * 0.5, ${V(C.cast)}, 0.4), base, smoothstep(0.1, 0.14, lam));
      c = mix(c, ${V(C.line)}, (1.0 - smoothstep(0.05, 0.08, f)) * 0.5);
      c = mix(c, ${V(C.rim)}, step(0.9, f) * smoothstep(0.3, 0.34, lam) * 0.8);
      return finish(c, P, edge);
    }`);
  const roof = new Mesh(roofGeo, roofMat); roof.frustumCulled = false;

  const group = new Group();
  group.add(mesh, roof);
  // lit slits (emissive #ffd488, they bloom) and the dark gate mouth behind the opening
  const slitMat = mat(ctx, U, `vec3 shade(vec3 P, vec3 N, vec3 Vw) { float e = unmakeEdge(P); return finish(${V(C.slit)} * 2.4, P, e); }`, { side: 2 });
  for (const [x, y, z, w] of slits) { const m = new Mesh(new PlaneGeometry(w, 1.6), slitMat); m.position.set(x, y, z); group.add(m); }
  const mouthMat = flat(ctx, U, C.gateMouth, { side: 2 });
  const mouth = new Mesh(new PlaneGeometry(7.4, 8), mouthMat); mouth.position.set(0, 3.2, -37.2); group.add(mouth);
  // Easter egg 1: a faint painted "Graz" on the gate lintel (wall front face z -33.4, above the arch crown at y 7.3)
  const graz = decal("Graz", { w: 3.4, h: 0.9, col: "#5a3c8a", alpha: 0.38 }); graz.position.set(0, 7.95, -33.36); group.add(graz);
  return { group, casters, graz, dispose() { geo.dispose(); roofGeo.dispose(); stoneMat.dispose(); roofMat.dispose(); slitMat.dispose(); mouthMat.dispose(); graz.userData.dispose?.(); } };
}
