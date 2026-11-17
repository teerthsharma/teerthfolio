// THE CITY GENERATOR. bgCity(ctx, look, o) lays blocks along an avenue (or takes your own list) and paints every face with the facade shader.
//   o.avenue  { half: 10.5, z0: -70, z1: 50, rows: 2, gap: 1.4, hMin: 24, hMax: 70, wMin: 16, wMax: 28 }   blocks both sides, row 2 behind row 1 and taller
//   o.blocks  [{ x, z, w, d, h }]   explicit blocks instead (metres, centre x z, standing on y 0)
//   o.paint   { wall0, wall1, trim, litA, litB, litC, sign0, sign1, sign2, sky0, sky1, night 0..1, lit 0..1, signs 0..1, bay }
//   o.seed    ctx.rng salt        o.ink  line weight multiplier on the near row (0 = no outline)
// Returns { group, specs, material, dispose }. Tall blocks get a setback crown, water tanks and an antenna; the near row is inked.
import { BoxGeometry, Color, Float32BufferAttribute, Group, Mesh, Vector4 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { bgMaterial, inkable } from "./material.js";
import { FACADE } from "./surfaces.js";

const C = (h) => new Color(h);

export const CITY_PAINT = {
  wall0: "#3a4054", wall1: "#5a5470", trim: "#8a8aa0", litA: "#ffd890", litB: "#cfe8ff", litC: "#9affd8",
  sign0: "#ff2a4a", sign1: "#ffe8a0", sign2: "#40d0ff", sky0: "#2a3050", sky1: "#6a7aa8", night: 1, lit: 0.55, signs: 0.3, bay: 1,
};

export function facadeMaterial(look, paint = {}, id = 0.5, extra = {}) {
  const p = { ...CITY_PAINT, ...paint };
  return bgMaterial(look, {
    id, frag: FACADE, attrs: "attribute vec4 aB; attribute vec4 aS; varying vec4 vB; varying vec4 vS;", varyings: "", vert: "vB = aB; vS = aS;", ...extra,
    uniforms: {
      uWall0: { value: C(p.wall0) }, uWall1: { value: C(p.wall1) }, uTrim: { value: C(p.trim) }, uLitA: { value: C(p.litA) }, uLitB: { value: C(p.litB) }, uLitC: { value: C(p.litC) },
      uSign0: { value: C(p.sign0) }, uSign1: { value: C(p.sign1) }, uSign2: { value: C(p.sign2) }, uSky0: { value: C(p.sky0) }, uSky1: { value: C(p.sky1) },
      uFac: { value: new Vector4(p.night, p.lit, p.signs, p.bay) }, uFac2: { value: new Vector4(0, 0, 0, 0) },
    },
  });
}

function box(spec, seed) {
  const g = new BoxGeometry(spec.w, spec.h, spec.d).translate(spec.x, spec.y0 + spec.h / 2, spec.z).toNonIndexed();
  const n = g.attributes.position.count, B = new Float32Array(n * 4), S = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { B.set([spec.x, spec.y0, spec.z, seed], i * 4); S.set([spec.w, spec.y0 + spec.h, spec.d, 0], i * 4); }
  g.setAttribute("aB", new Float32BufferAttribute(B, 4)); g.setAttribute("aS", new Float32BufferAttribute(S, 4));
  return g;
}

export function layout(R, a = {}) {
  const A = { half: 10.5, z0: -70, z1: 50, rows: 2, gap: 1.4, hMin: 24, hMax: 70, wMin: 16, wMax: 28, ...a }, out = [];
  for (const side of [-1, 1]) for (let row = 0; row < A.rows; row++) {
    let z = A.z0 + R() * 6;
    while (z < A.z1) {
      const d = 12 + R() * 9, w = A.wMin + R() * (A.wMax - A.wMin), h = (A.hMin + R() * (A.hMax - A.hMin)) * (1 + 0.45 * row);
      out.push({ x: side * (A.half + 0.7 + w / 2 + row * (A.wMax + 6)), z: z + d / 2, w, d, h, y0: 0, row });
      z += d + A.gap;
    }
  }
  return out;
}

export function bgCity(ctx, look, o = {}) {
  const R = ctx.rng(o.seed ?? 11), group = new Group();
  const specs = o.blocks ? o.blocks.map((b) => ({ y0: 0, row: 0, ...b })) : layout(R, o.avenue);
  const rows = [[], [], []];
  specs.forEach((s, i) => {
    const seed = Math.floor(R() * 1000) + i * 0.37, r = Math.min(2, s.row ?? 0);
    rows[r].push(box(s, seed));
    if (s.h > 30) {
      const cw = s.w * (0.55 + 0.2 * R()), cd = s.d * (0.55 + 0.2 * R()), ch = 3 + R() * 7;
      rows[r].push(box({ x: s.x + (R() - 0.5) * 3, z: s.z + (R() - 0.5) * 3, w: cw, d: cd, h: ch, y0: s.h }, seed + 0.11));
      rows[r].push(box({ x: s.x + (R() - 0.5) * s.w * 0.4, z: s.z + (R() - 0.5) * s.d * 0.4, w: 1.4, d: 1.4, h: 2.4, y0: s.h + ch }, seed + 0.23));
      rows[r].push(box({ x: s.x + (R() - 0.5) * s.w * 0.3, z: s.z + (R() - 0.5) * s.d * 0.3, w: 0.35, d: 0.35, h: 6 + R() * 9, y0: s.h + ch }, seed + 0.31));
    }
  });
  const mats = [], meshes = [];
  rows.forEach((list, r) => {
    if (!list.length) return;
    const g = mergeGeometries(list);
    const m = facadeMaterial(look, o.paint, 0.5 + 0.004 * r), mesh = new Mesh(g, m);
    mesh.frustumCulled = false; group.add(mesh); mats.push(m); meshes.push(mesh);
    if (r === 0 && (o.ink ?? 0.8) > 0) { inkable(g); ctx.engine.ink(mesh, o.ink ?? 0.8); }
  });
  return {
    group, specs, material: mats[0], materials: mats,
    dispose() { for (const m of meshes) { m.geometry.dispose(); m.material.dispose(); } },
  };
}
