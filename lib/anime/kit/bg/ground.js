// GROUND, WATER, STONE and WOOD as ready meshes.
//   bgGround(ctx, look, { kind: "asphalt"|"grass"|"sand"|"snow"|"paving", size: 400, y: 0, at: [0, 0], scale: 1, puddles: 0.6, road: { half: 10.5, zebra: [z0, z1], stripe: 1 }, palette: { g0, g1, g2, g3, refl }, seed })
//   bgWater(ctx, look, { size, y, colors: { w0, w1, sky0, sky1, foam }, scale, height, speed, glint })
//   bgStone(ctx, look, geo, { block: [w, h], chip, crack, moss, gloss, colors: { st0, st1, mortar, moss }, seed })   masonry or flagstone on ANY geometry
//   bgWood(ctx, look, geo, { plank, grain, gloss, colors: { wd0, wd1 }, seed })
// Each is a mesh with the kit material (the look's light, haze, pools); stone and wood take your geometry, so a hall you already built is repainted.
import { Color, Mesh, PlaneGeometry, Vector4 } from "three";
import { bgMaterial, inkable } from "./material.js";
import { GROUND, STONE, WATER, WOOD } from "./surfaces.js";

const C = (h) => new Color(h);
const KINDS = { asphalt: 0, grass: 1, sand: 2, snow: 3, paving: 4 };
const GROUND_PAL = {
  asphalt: { g0: "#2a2e3c", g1: "#3c4256", g2: "#6a6e80", g3: "#d8dcea", refl: "#6a7aa8" },
  grass: { g0: "#5a9a3a", g1: "#3a7a44", g2: "#1f4a3a", g3: "#fff2a0", refl: "#9ac8e8" },
  sand: { g0: "#d8b888", g1: "#bf9a6a", g2: "#f2dcb0", g3: "#fff", refl: "#c0d8e8" },
  snow: { g0: "#e8f0fa", g1: "#b0c4e0", g2: "#8aa0c8", g3: "#ffffff", refl: "#c0d8f0" },
  paving: { g0: "#8a8a98", g1: "#6a6a7e", g2: "#2a2a38", g3: "#cfd0dc", refl: "#8a9ac0" },
};

export function groundMaterial(look, o = {}) {
  const kind = o.kind ?? "asphalt", p = { ...GROUND_PAL[kind], ...(o.palette ?? {}) }, rd = o.road;
  return bgMaterial(look, {
    id: o.id ?? 0.5, frag: GROUND,
    uniforms: {
      uG0: { value: C(p.g0) }, uG1: { value: C(p.g1) }, uG2: { value: C(p.g2) }, uG3: { value: C(p.g3) }, uRefl: { value: C(p.refl) },
      uGr: { value: new Vector4(KINDS[kind], o.scale ?? 1, o.puddles ?? 0, o.seed ?? 5) },
      uMk: { value: new Vector4(rd?.zebra?.[0] ?? 0, rd?.zebra?.[1] ?? 0, rd?.half ?? 0, rd?.stripe ?? 1) },
    },
  });
}

export function bgGround(ctx, look, o = {}) {
  const size = o.size ?? 400, g = new PlaneGeometry(size, size, 1, 1).rotateX(-Math.PI / 2);
  const mesh = new Mesh(g, groundMaterial(look, o));
  mesh.position.set(o.at?.[0] ?? 0, o.y ?? 0, o.at?.[1] ?? 0); mesh.frustumCulled = false;
  return mesh;
}

export function bgWater(ctx, look, o = {}) {
  const c = { w0: "#0c3a5a", w1: "#1c7a9a", sky0: "#a8c8e0", sky1: "#3a6ab0", foam: "#f4fbff", ...(o.colors ?? {}) };
  const m = bgMaterial(look, {
    id: o.id ?? 0.45, frag: WATER,
    uniforms: { uW0: { value: C(c.w0) }, uW1: { value: C(c.w1) }, uSky0: { value: C(c.sky0) }, uSky1: { value: C(c.sky1) }, uFoam: { value: C(c.foam) }, uWv: { value: new Vector4(o.scale ?? 0.35, o.height ?? 0.5, o.speed ?? 0.25, o.glint ?? 1) } },
  });
  const mesh = new Mesh(new PlaneGeometry(o.size ?? 600, o.size ?? 600, 1, 1).rotateX(-Math.PI / 2), m);
  mesh.position.y = o.y ?? 0; mesh.frustumCulled = false;
  return mesh;
}

export function stoneMaterial(look, o = {}) {
  const c = { st0: "#6a6a86", st1: "#4a4a68", mortar: "#14141e", moss: "#4a7a3a", ...(o.colors ?? {}) }, b = o.block ?? [1.6, 0.7];
  return bgMaterial(look, {
    id: o.id ?? 0.5, frag: STONE,
    uniforms: {
      uSt0: { value: C(c.st0) }, uSt1: { value: C(c.st1) }, uMortar: { value: C(c.mortar) }, uMoss: { value: C(c.moss) },
      uBlk: { value: new Vector4(b[0], b[1], o.chip ?? 0.05, o.crack ?? 0.5) }, uSt: { value: new Vector4(o.moss ?? 0.4, o.gloss ?? 0.3, o.seed ?? 4, o.mottle ?? 0.6) },
    },
  });
}

export function bgStone(ctx, look, geo, o = {}) {
  const mesh = new Mesh(geo, stoneMaterial(look, o));
  if (o.ink) { inkable(geo); ctx.engine.ink(mesh, o.ink); }
  return mesh;
}

export function bgWood(ctx, look, geo, o = {}) {
  const c = { wd0: "#8a5a34", wd1: "#5a3820", ...(o.colors ?? {}) };
  const m = bgMaterial(look, { id: o.id ?? 0.5, frag: WOOD, uniforms: { uWd0: { value: C(c.wd0) }, uWd1: { value: C(c.wd1) }, uWd: { value: new Vector4(o.plank ?? 0.18, o.grain ?? 6, o.gloss ?? 0.35, o.seed ?? 2) } } });
  return new Mesh(geo, m);
}
