// THE SET PIECES of home, 3D, one toon program (engine.prop) with per-vertex lit / shadow colours (bible 3.6 - 3.10).
//   jetty (8.0 x 1.55 m, planks .286 with 1 cm gaps on a dark stringer) + the EMPTY second pier 3.2 m away (+z, ref 04 twin, egg 5)
//   five turf longhouses with a lavender-underlit snow cap on the ridge, hearth-glow door, smoke hole (ref 04 / ref 05)
//   the igloo (4.6 m dome x1.75) with seam lines (#5a5470, ~0.8 px) on block courses only, cobalt arch ring, hearth glow, portholes,
//     and the telescope turret (layer 1): it pans to each beacon as it lights and holds on the nearest cairn at 24.4 s (egg 6)
//   the longship (ref 01): clinker strakes with Jomsviking red, shields red #d9533a / cream #f2e8d0 / teal / gold with #3a2f2a bosses (egg 1),
//     a furled red-cream sail on the yard, gold carved prow #c89a4a with #e0b858 relief
//   eleven cairns on the fjord rim, and the warm key the lit beacons throw on the ground within 3 m (+10% #ffb070, two hard rings, on twos)
// Static art is layer 0. Layer 1: the turret, the lens catch and the warm pools.
// Cue names (all optional, default to the bible's seconds): "beacons" (start 19.0, arg every = 0.5), "scopehold" (24.4).
// Lens catch maths: astroid cutout |x|^.5 + |y|^.5 < .9 sqrt(a), a = exp(-(t - t_j - .1)/.18), cream #ffe2a0 (luma < 1: no bloom).
// Warm pool maths: alpha = a_j * (r < 1.6 ? .10 : r < 3.0 ? .05 : 0) * (.85 + .15 hash(floor(12 t) + j)), colour #ffb070, over the ground.
import {
  BoxGeometry, BufferGeometry, CatmullRomCurve3, CircleGeometry, CylinderGeometry, DoubleSide, Float32BufferAttribute, Group,
  IcosahedronGeometry, LatheGeometry, Mesh, PlaneGeometry, ShaderMaterial, SphereGeometry, TorusGeometry, TubeGeometry, Vector2, Vector3,
} from "three";
import { C, g } from "./palette.js";
import { P, mergePainted, at, sm } from "./lib.js";
import { H, HOUSES, IGLOO, shoreL, shoreR } from "./terrain.js";

const V = (a, b, c) => new Vector3(a, b, c);
const solid = (engine, geo) => { const m = engine.prop(geo, 0.5); m.material.side = DoubleSide; return m; };

// ---- jetty -----------------------------------------------------------------------------------------
export const JETTY = { x0: -6.6, x1: 1.4, w: 1.55, z: 0 };
export const PIER2 = { x0: -6.0, x1: -0.9, w: 1.3, z: 3.2 };
function pier({ x0, x1, w, z }, seed, full) {
  const parts = [], n = Math.round((x1 - x0) / 0.296), pw = (x1 - x0) / n;
  // the dark gap colour is the stringer slab seen between planks
  parts.push(P(new BoxGeometry(x1 - x0, 0.06, w - 0.1).translate((x0 + x1) / 2, -0.115, 0), C.gap, C.gap));
  for (let i = 0; i < n; i++) {
    const gg = new BoxGeometry(pw - 0.01, 0.1, w + 0.08 * Math.sin(i * 2.3 + seed)).translate(x0 + pw * (i + 0.5), -0.05, 0);
    parts.push(P(gg, i % 3 ? C.plank : "#7a4c2c", C.plankShade));
  }
  for (const s of [-1, 1]) parts.push(P(new BoxGeometry(x1 - x0, 0.02, 0.05).translate((x0 + x1) / 2, 0.005, s * (w / 2 - 0.02)), "#5a3a24", "#3a2434")); // wet band on the water side
  for (const s of [-0.5, 0.5]) parts.push(P(new BoxGeometry(x1 - x0, 0.14, 0.12).translate((x0 + x1) / 2, -0.19, s * w), "#6b5645", "#4a3a48"));
  const np = Math.max(3, Math.round((x1 - x0) / 1.5));
  for (let i = 0; i < np; i++) for (const s of [-1, 1]) {
    const x = x0 + 0.6 + (i * (x1 - x0 - 1.2)) / (np - 1);
    parts.push(at(P(new CylinderGeometry(0.1, 0.12, 2.3, 6).translate(0, -0.8, 0), C.pile, "#241c26"), x, 0, s * (w / 2 - 0.1), 0, 1, 0.03 * s));
  }
  if (full) {
    for (const s of [-1, 1]) parts.push(P(new CylinderGeometry(0.1, 0.12, 0.7, 6).translate(x1 - 0.1, 0.3, s * 0.62), "#66503f", "#40303e"));
    parts.push(P(new TorusGeometry(0.2, 0.06, 5, 10).rotateX(Math.PI / 2).translate(x1 - 0.55, 0.04, -0.45), C.rope, "#8a7a8a"));
  }
  return at(mergePainted(parts, "pier"), 0, 0, z);
}

// ---- longhouses ------------------------------------------------------------------------------------
function roofSlice(L, W, wh, rh, seed, t0, t1, grow) {
  const geo = new CylinderGeometry(1, 1, L + 0.5, 14, 7, true, t0, t1 - t0).rotateZ(Math.PI / 2), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), lump = 1 + 0.07 * Math.sin(x * 2.1 + p.getZ(i) * 3.7 + seed) + 0.04 * Math.sin(x * 5.3 - p.getZ(i) * 2.9);
    p.setXYZ(i, x, p.getY(i) * rh * lump * grow, p.getZ(i) * (W / 2 + 0.55) * lump * grow);
  }
  geo.translate(0, 0.4 + wh, 0); geo.computeVertexNormals();
  return geo;
}
function longhouse(L, W, wh, rh, seed) {
  const parts = [];
  parts.push(P(new BoxGeometry(L + 0.4, 0.4, W + 0.4).translate(0, 0.2, 0), "#8d89a4", "#575a78"));
  parts.push(P(new BoxGeometry(L, wh, W).translate(0, 0.4 + wh / 2, 0), C.timber, C.timberShade));
  parts.push(P(roofSlice(L, W, wh, rh, seed, 0, Math.PI, 1), seed % 2 ? C.turfRoof : C.turfRoof2, "#4a6a58"));
  parts.push(P(roofSlice(L, W, wh, rh, seed, 0.12 * Math.PI, 0.83 * Math.PI, 1.03), C.snowShade, C.snowDeep));       // the lavender underside
  parts.push(P(roofSlice(L, W, wh, rh, seed, 0.17 * Math.PI, 0.78 * Math.PI, 1.045), C.shelf, C.snowShade));          // the cap (north slope heavier)
  for (const s of [-1, 1]) parts.push(P(new CircleGeometry(1, 12, 0, Math.PI).scale(W / 2 + 0.45, rh * 0.98, 1).rotateY((Math.PI / 2) * -s).translate(s * (L / 2 + 0.26), 0.4 + wh, 0), "#7a5c43", "#4e3a48"));
  parts.push(P(new BoxGeometry(0.1, wh * 0.8, 1.0).translate(L / 2 + 0.28, 0.4 + wh * 0.4, 0), C.door, "#1f1c34"));
  parts.push(P(new PlaneGeometry(0.62, wh * 0.62).rotateY(Math.PI / 2).translate(L / 2 + 0.34, 0.4 + wh * 0.38, 0), C.hearth, C.hearth)); // the hearth glow (ref 05)
  parts.push(P(new BoxGeometry(1.1, 0.25, 0.7).translate(0.4, 0.4 + wh + rh * 0.98, 0), "#4b3a30", "#2c2434"));
  parts.push(P(new BoxGeometry(0.8, 0.06, 0.45).translate(0.4, 0.4 + wh + rh * 0.98 + 0.15, 0), "#2c2840", "#1c1830"));
  return mergePainted(parts, "longhouse");
}
export const SMOKE_AT = HOUSES.map(([, , wh, rh, x, z, ry]) => [x + Math.cos(ry) * 0.4, H(x, z) + 0.4 + wh + rh * 0.98 + 0.5, z - Math.sin(ry) * 0.4]);

// ---- the igloo -------------------------------------------------------------------------------------
const PROFILE = [[2.7, 0], [2.68, 0.75], [2.58, 1.5], [2.38, 2.25], [2.06, 2.95], [1.62, 3.6], [1.05, 4.15], [0.45, 4.5], [0, 4.6]];
const SEG = 16;
const course = ([r0, y0], [r1, y1], ...tail) => new LatheGeometry([[r0, y0], [r0 + 0.07, y0 + 0.02], [r0 + 0.035, y0 + 0.07], [r1, y1], ...tail].map(([r, y]) => new Vector2(r, y)), SEG);
const arch = (r, len) => new CylinderGeometry(r, r, len, SEG, 1, true, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2);
function iglooGeometry() {
  const parts = [], blocks = [C.block, C.block2, "#f8f3ea", "#eee9e2", C.block, C.block2, "#f8f3ea"];
  for (let i = 0; i < 6; i++) { const gg = course(PROFILE[i], PROFILE[i + 1]); if (i % 2) gg.rotateY(Math.PI / SEG); parts.push(P(gg, blocks[i], C.snowShade)); }
  parts.push(P(course(PROFILE[6], PROFILE[7], PROFILE[8]), blocks[6], C.snowShade));
  // seam lines, block courses only: a thin ring at every course boundary and staggered vertical joints (none on the silhouette outline)
  for (let i = 1; i < 8; i++) parts.push(P(new TorusGeometry(PROFILE[i][0] + 0.02, 0.006, 4, 40).rotateX(Math.PI / 2).translate(0, PROFILE[i][1] + 0.02, 0), C.seam, C.seam));
  for (let i = 0; i < 6; i++) {
    const [r0, y0] = PROFILE[i], [r1, y1] = PROFILE[i + 1], rm = (r0 + r1) / 2 + 0.02, n = 14;
    for (let k = 0; k < n; k++) {
      const a = ((k + (i % 2) * 0.5) / n) * Math.PI * 2, da = Math.min(a, Math.PI * 2 - a);
      if (da < 0.45 && y0 < 2.6) continue; // the entrance
      parts.push(P(new BoxGeometry(0.012, y1 - y0 - 0.06, 0.012).translate(Math.sin(a) * rm, (y0 + y1) / 2 + 0.03, Math.cos(a) * rm).rotateY(0), C.seam, C.seam));
    }
  }
  // the entrance arch with its lips, the cobalt ring and the hearth glow (ref 05)
  parts.push(P(arch(1, 1.7).translate(0, 0, 3.05), "#f3eee5", C.snowShade));
  for (const f of [0.25, 0.5, 0.75]) parts.push(P(arch(1.05, 0.08).translate(0, 0, 2.2 + 1.7 * f), "#e8e3dc", C.snowShade));
  parts.push(P(new TorusGeometry(0.88, 0.15, 6, SEG, Math.PI).translate(0, 0, 3.95), C.cobalt, C.cobaltShade));
  parts.push(P(new CircleGeometry(0.72, SEG, 0, Math.PI).translate(0, 0, 3.93), C.drum, "#1c2038"));
  parts.push(P(new PlaneGeometry(1.1, 0.9).translate(0, 0.45, 3.99), C.hearth, C.hearth));
  for (const th of [-0.7, 0.7, 1.57]) {
    parts.push(P(new CylinderGeometry(0.32, 0.32, 0.12, 12).rotateX(Math.PI / 2).translate(0, 0, 2.5).rotateY(th).translate(0, 1.88, 0), C.drum, "#1c2038"));
    parts.push(P(new CircleGeometry(0.22, 12).translate(0, 0, 2.61).rotateY(th).translate(0, 1.88, 0), C.hearth, C.hearth));
  }
  parts.push(P(new CylinderGeometry(0.7, 0.95, 0.3, SEG).translate(0, 4.3, 0), C.cobalt, C.cobaltShade));
  parts.push(P(new CylinderGeometry(0.55, 0.55, 0.35, SEG).translate(0, 4.55, 0), C.drum, "#1c2038")); // the turret drum
  return mergePainted(parts, "igloo");
}
function scopeGeometry() {
  return mergePainted([
    P(new CylinderGeometry(0.3, 0.24, 1.6, 10).rotateX(Math.PI / 2).translate(0, 0, 0.8), C.cobalt, C.cobaltShade),
    P(new CylinderGeometry(0.34, 0.34, 0.14, 10).rotateX(Math.PI / 2).translate(0, 0, 1.6), C.drum, "#1c2038"),
    P(new CircleGeometry(0.28, 10).translate(0, 0, 1.68), C.lens, C.lens),
  ], "scope");
}

// ---- the longship ----------------------------------------------------------------------------------
export const SHIP = { x: -9.0, z: 5.9, ry: 0.1, L: 9.0 };
const edgeK = (u) => Math.abs(2 * u - 1);
function shipGeometry() {
  const L = SHIP.L, N = 30, S = 8;
  const yk = (u) => 1.5 * edgeK(u) ** 4.5, yg = (u) => yk(u) + 0.95 + 0.95 * edgeK(u) ** 2.2, bw = (u) => 1.2 * (1 - edgeK(u) ** 2.4) ** 0.55;
  const hw = (u, s) => bw(u) * (0.1 + 0.9 * s ** 0.72);
  const strake = ["#8d6c4e", "#6a4d3a", "#8d6c4e", C.sailRed, "#6a4d3a", "#8d6c4e", C.sailRed, "#6a4d3a"], parts = [];
  for (const side of [-1, 1]) for (let s = 0; s < S; s++) {
    const pos = [];
    for (let i = 0; i <= N; i++) { const u = i / N; for (const ss of [s / S, (s + 1) / S]) pos.push((u - 0.5) * L, yk(u) + (yg(u) - yk(u)) * ss, side * hw(u, ss)); }
    const gg = new BufferGeometry(); gg.setAttribute("position", new Float32BufferAttribute(pos, 3));
    const idx = []; for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    gg.setIndex(idx); gg.computeVertexNormals();
    parts.push(P(gg, strake[s], "#4e3a4a"));
  }
  parts.push(P(new BoxGeometry(L * 0.8, 0.06, 1.1).translate(0, 0.42, 0), "#6e5642", "#46384a"));
  for (let i = 0; i < 9; i++) { const u = 0.14 + i * 0.09; parts.push(P(new BoxGeometry(0.34, 0.1, bw(u) * 1.75).translate((u - 0.5) * L, yk(u) + 0.88, 0), "#8f6f50", "#54424e")); }
  for (let i = 0; i < 8; i++) {
    const side = i % 2 ? 1 : -1, zz = side * (0.25 + 0.075 * ((i / 2) | 0)), yy = 1.02 + 0.015 * ((i / 2) | 0);
    parts.push(at(P(new BoxGeometry(5.2, 0.07, 0.07), "#cdb184", "#7a6a7a"), -0.4 + 0.03 * i, yy, zz, side * 0.025));
    parts.push(at(P(new BoxGeometry(0.9, 0.04, 0.2), "#cdb184", "#7a6a7a"), -3.05 + 0.03 * i, yy, zz, side * 0.025));
  }
  // the carved gold prow (ref 01): dark neck, gold head with the lighter relief, frill; the stern post
  const prow = new CatmullRomCurve3([[4.5, 2.4, 0], [4.7, 3.2, 0], [5.0, 3.9, 0], [5.45, 4.25, 0], [5.8, 4.0, 0]].map((p) => V(...p)));
  parts.push(P(new TubeGeometry(prow, 14, 0.15, 6), "#6a4d3a", "#3e2c3c"));
  parts.push(at(P(new IcosahedronGeometry(0.3, 1).scale(1.7, 0.75, 0.72), C.prow, "#7a5a4a"), 6.05, 3.95, 0, 0, 1, -0.5));
  parts.push(at(P(new BoxGeometry(0.5, 0.12, 0.3), C.prowHi, C.prow), 6.1, 3.72, 0, 0, 1, -0.35));
  for (let i = 0; i < 3; i++) parts.push(P(new IcosahedronGeometry(0.1, 0).scale(0.7, 1.3, 0.7).translate(4.75 + i * 0.28, 3.5 + i * 0.28, 0), C.prowHi, C.prow));
  const stern = new CatmullRomCurve3([[-4.5, 2.4, 0], [-4.62, 3.0, 0], [-4.9, 3.5, 0], [-5.3, 3.55, 0], [-5.45, 3.15, 0]].map((p) => V(...p)));
  parts.push(P(new TubeGeometry(stern, 12, 0.13, 6), "#6a4d3a", "#3e2c3c"));
  // mast, yard and the furled red-cream sail (vertical bands become runs along the yard)
  parts.push(P(new CylinderGeometry(0.11, 0.14, 5.9, 8).translate(-0.4, 3.35, 0), "#7a5c43", "#4a3a4a"));
  parts.push(P(new CylinderGeometry(0.08, 0.08, 6.4, 8).rotateZ(Math.PI / 2).translate(-0.4, 5.9, 0), "#7a5c43", "#4a3a4a"));
  for (let i = 0; i < 8; i++) parts.push(P(new CylinderGeometry(0.21, 0.21, 0.78, 10).rotateZ(Math.PI / 2).translate(-0.4 - 2.8 + 0.78 * (i + 0.5), 5.68, 0.02), i % 2 ? C.sailCream : C.sailRed, i % 2 ? "#b3adb4" : "#8f2f3a"));
  for (const [a, b] of [[[-0.4, 6.1, 0], [5.5, 3.9, 0]], [[-0.4, 6.1, 0], [-5.2, 3.3, 0]]]) {
    parts.push(P(new TubeGeometry(new CatmullRomCurve3([V(...a), V((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 0.12, 0), V(...b)]), 8, 0.02, 4), "#6b5c4a", "#3e3444"));
  }
  // the shield row (egg 1): red, cream, teal, gold; bosses #3a2f2a
  const cols = [[C.sailRed, "#8f2f3a"], [C.sailCream, "#b3adb4"], [C.shieldTeal, "#2e4a5c"], [C.shieldGold, "#8a6a2a"]];
  for (const side of [-1, 1]) for (let i = 0; i < 10; i++) {
    const u = 0.17 + i * 0.07, x = (u - 0.5) * L, y = yg(u) - 0.18, zz = side * (bw(u) + 0.05), c = cols[(i + (side > 0 ? 2 : 0)) % 4];
    parts.push(P(new CylinderGeometry(0.4, 0.4, 0.06, 14).rotateX(Math.PI / 2).translate(x, y, zz), c[0], c[1]));
    parts.push(P(new SphereGeometry(0.1, 8, 6).translate(x, y, zz + side * 0.04), C.boss, "#1c1620"));
  }
  return mergePainted(parts, "longship");
}

// ---- cairns ----------------------------------------------------------------------------------------
// eleven cairns on the fjord rim, alternating right bank / left bank, climbing from the shore to y >= 9
export function beaconSpots() {
  const out = [];
  for (let j = 0; j < 11; j++) {
    const z = -32 - 8.6 * j, right = j % 2 === 0;
    let x = right ? shoreR(z) + 3 : shoreL(z) - 3;
    for (let k = 0; k < 140 && H(x, z) < 9; k++) x += right ? 0.6 : -0.6;
    out.push([x, H(x, z), z]);
  }
  return out;
}
function cairnGeometry(spots) {
  const parts = [];
  spots.forEach(([x, y, z]) => {
    parts.push(P(new IcosahedronGeometry(0.7, 0).scale(1.1, 0.7, 1).translate(x, y + 0.2, z), C.cairn, C.cairnShade));
    parts.push(P(new IcosahedronGeometry(0.45, 0).scale(1, 0.8, 1).translate(x + 0.15, y + 0.75, z - 0.05), C.cairn2, C.cairnShade));
    parts.push(P(new IcosahedronGeometry(0.25, 0).translate(x - 0.1, y + 1.1, z + 0.05), C.cairn3, C.cairnShade));
  });
  return mergePainted(parts, "cairns");
}

// ---- warm pools: ground-conforming discs under each cairn, layer 1 --------------------------------
function poolMesh(spots) {
  const pos = [], rad = [], idx = [], ii = [], ring = [0, 0.8, 1.8, 3.0], NS = 24;
  spots.forEach(([x, , z], j) => {
    const base = pos.length / 3;
    for (let r = 0; r < ring.length; r++) for (let s = 0; s < (r === 0 ? 1 : NS); s++) {
      const a = (s / NS) * Math.PI * 2, px = x + Math.cos(a) * ring[r], pz = z + Math.sin(a) * ring[r];
      pos.push(px, H(px, pz) + 0.12, pz); rad.push(ring[r]); ii.push(j);
    }
    const o = (r, s) => base + (r === 0 ? 0 : 1 + (r - 1) * NS + (s % NS));
    for (let s = 0; s < NS; s++) idx.push(o(0, 0), o(1, s), o(1, s + 1));
    for (let r = 1; r < ring.length - 1; r++) for (let s = 0; s < NS; s++) idx.push(o(r, s), o(r + 1, s), o(r, s + 1), o(r, s + 1), o(r + 1, s), o(r + 1, s + 1));
  });
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(pos, 3));
  geo.setAttribute("aR", new Float32BufferAttribute(rad, 1));
  geo.setAttribute("aI", new Float32BufferAttribute(ii, 1));
  geo.setIndex(idx);
  const mat = new ShaderMaterial({
    transparent: true, depthWrite: false, side: DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
    blending: 5, blendSrc: 204, blendDst: 205, blendSrcAlpha: 200, blendDstAlpha: 201, // over, keeping the target alpha (set id)
    uniforms: { uAmt: { value: new Float32Array(11) }, uT: { value: 0 } },
    vertexShader: "attribute float aR; attribute float aI; varying float vR; varying float vI; void main() { vR = aR; vI = aI; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform float uAmt[11]; uniform float uT; varying float vR; varying float vI;
      float hh(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
      void main() { int j = int(vI + 0.5); float r = vR; float ring = r < 1.7 ? 0.10 : 0.05;
        float a = uAmt[j] * ring * (0.85 + 0.15 * hh(floor(uT * 12.0) + vI));
        if (a < 0.002) discard; gl_FragColor = vec4(${g("warm")}, a); }`,
  });
  const m = new Mesh(geo, mat); m.frustumCulled = false;
  return m;
}

// ---- the telescope's lens catch ---------------------------------------------------------------------
function lensStar() {
  const mat = new ShaderMaterial({
    uniforms: { uAmt: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0); mv.xy += position.xy * 0.9; gl_Position = projectionMatrix * mv; }",
    fragmentShader: `uniform float uAmt; varying vec2 vUv;
      void main() { vec2 q = vUv * 2.0 - 1.0; float s = sqrt(abs(q.x)) + sqrt(abs(q.y));
        if (uAmt < 0.02 || s > 0.9 * sqrt(uAmt)) discard;
        gl_FragColor = vec4(mix(${g("lens")}, ${g("sun")}, step(s, 0.25 * sqrt(uAmt))), 0.5); }`,
  });
  const m = new Mesh(new PlaneGeometry(1, 1), mat); m.frustumCulled = false;
  return m;
}

// ---- assemble --------------------------------------------------------------------------------------
export function buildStructures(ctx) {
  const { engine } = ctx, group = new Group(), disposables = [];
  const keep = (geo, mat) => { disposables.push(() => { geo.dispose(); mat.dispose(); }); };
  const add = (geo, layer = 0) => { const m = solid(engine, geo); m.userData.layer = layer; group.add(m); keep(geo, m.material); return m; };

  // jetty and the empty twin
  add(mergePainted([pier(JETTY, 1, true), pier(PIER2, 7, false)], "piers"));
  // longhouses
  add(mergePainted(HOUSES.map(([L, W, wh, rh, x, z, ry], i) => at(longhouse(L, W, wh, rh, 30 + i * 9), x, H(x, z) - 0.05, z, ry)), "houses"));
  // igloo, then the telescope (layer 1) as a child so it turns about the drum
  const iy = H(IGLOO.x, IGLOO.z) - 0.05;
  const ig = new Group(); ig.position.set(IGLOO.x, iy, IGLOO.z); ig.rotation.y = IGLOO.ry; ig.scale.setScalar(IGLOO.s); group.add(ig);
  const igMesh = solid(engine, iglooGeometry()); igMesh.userData.layer = 0; ig.add(igMesh); keep(igMesh.geometry, igMesh.material);
  const scope = new Group(); scope.position.set(0, 4.55, 0); scope.rotation.order = "YXZ"; ig.add(scope);
  const scopeMesh = solid(engine, scopeGeometry()); scopeMesh.userData.layer = 1; scope.add(scopeMesh); keep(scopeMesh.geometry, scopeMesh.material);
  const star = lensStar(); star.position.set(0, 0, 1.78); star.userData.layer = 1; scope.add(star); keep(star.geometry, star.material);
  // longship, beached on the shingle
  const sy = H(SHIP.x, SHIP.z) + 0.1;
  add(at(shipGeometry(), SHIP.x, sy, SHIP.z, SHIP.ry));
  // cairns and their warm pools
  const spots = beaconSpots();
  add(cairnGeometry(spots));
  const pools = poolMesh(spots); pools.userData.layer = 1; group.add(pools); keep(pools.geometry, pools.material);

  // the telescope's script: [time, yaw (world), pitch]; rest toward the fjord mouth, then each cairn as it lights, then the nearest again
  const pivot = V(IGLOO.x, iy + 4.55 * IGLOO.s, IGLOO.z);
  const aimAt = ([x, y, z]) => { const dx = x - pivot.x, dz = z - pivot.z; return { yaw: Math.atan2(dx, dz), pitch: Math.atan2(y + 1.1 - pivot.y, Math.hypot(dx, dz)) }; };
  const aims = spots.map(aimAt), rest = { yaw: Math.PI, pitch: 0.05 };
  const wrap = (a) => ((a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  function pose(t, t0, every, tHold) {
    const ev = [{ t: -1e9, a: rest }, ...aims.map((a, j) => ({ t: t0 + j * every, a })), { t: tHold, a: aims[0] }];
    let k = 0; for (let i = 0; i < ev.length; i++) if (t >= ev[i].t) k = i;
    const from = ev[Math.max(0, k - 1)].a, to = ev[k].a, s = k === 0 ? 1 : sm(0, 1, (t - ev[k].t) / 0.28);
    return { yaw: from.yaw + wrap(to.yaw - from.yaw) * s, pitch: from.pitch + (to.pitch - from.pitch) * s, ev };
  }
  const beats = { start: 19.0, every: 0.5, hold: 24.4 };
  function update(t, cue) {
    const sB = cue.since("beacons"), sH = cue.since("scopehold");
    beats.start = Number.isFinite(sB) ? cue.t - sB : 19.0;
    beats.every = Number.isFinite(sB) ? cue.arg("beacons", "every", 0.5) : 0.5;
    beats.hold = Number.isFinite(sH) ? cue.t - sH : 24.4;
    const p = pose(t, beats.start, beats.every, beats.hold);
    scope.rotation.set(-p.pitch, p.yaw - IGLOO.ry, 0);
    // lens catch: a flash when the aim settles on a lit cairn (and on the held one)
    let flash = 0;
    for (const e of p.ev.slice(1)) if (t > e.t + 0.1) flash = Math.max(flash, Math.exp(-(t - e.t - 0.1) / 0.18));
    star.material.uniforms.uAmt.value = t > beats.start ? flash : 0;
    // warm pools: grow over 0.4 s once lit
    const amt = pools.material.uniforms.uAmt.value;
    for (let j = 0; j < 11; j++) amt[j] = sm(0, 0.4, t - (beats.start + j * beats.every));
    pools.material.uniforms.uT.value = t;
  }
  function dispose() { for (const f of disposables) f(); }
  return { group, update, dispose, spots, beats, iglooTop: [IGLOO.x, iy + 4.6 * IGLOO.s, IGLOO.z], smokeAt: SMOKE_AT };
}
