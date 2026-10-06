// Frozen stash stack. Engine already: world plate (layer 0) / cast (layer 1) /
// fx (layer 1 energy) / screen compositor. This file names five stashes and
// how they sit. build(ctx) links materials. update(t,dt,cue) holds on
// floor(t*fps)/fps. Polygons = silhouette. Maps = frequency. Shaders = light.

export const LUMA_W = Object.freeze([0.2126, 0.7152, 0.0722]);
export const LUMA_MAX = 0.92;
export const INK = Object.freeze([0.08, 0.09, 0.18]);

export const BLENDS = Object.freeze(["replace", "multiply", "screen", "add-clamped"]);
export const WHENS = Object.freeze(["build", "shot", "frame"]);

export const STASH = Object.freeze({
  WORLD: Object.freeze({
    id: "WORLD",
    order: 0,
    blend: "replace",
    when: "shot",
    // compiled at build(ctx); redrawn only when the shot changes
  }),
  CAST: Object.freeze({
    id: "CAST",
    order: 1,
    blend: "replace",
    when: "frame",
    // low-poly figures; time is stepped (P8), not interpolated
  }),
  FX: Object.freeze({
    id: "FX",
    order: 2,
    blend: "add-clamped",
    when: "frame",
    // energy / particles / lettering; glow only through uEmit
  }),
  OCCLUDE: Object.freeze({
    id: "OCCLUDE",
    order: 3,
    blend: "multiply",
    when: "frame",
    // screen-glued invert / halo / tear; never covers the hero seal
  }),
  GRADE: Object.freeze({
    id: "GRADE",
    order: 4,
    blend: "replace",
    when: "frame",
    // print / night / gold / invert remap; last; luma police after
  }),
});

export const STASHES = Object.freeze([
  STASH.WORLD,
  STASH.CAST,
  STASH.FX,
  STASH.OCCLUDE,
  STASH.GRADE,
]);

function freezeStash(s) {
  if (!s || typeof s.id !== "string") throw new Error("stash missing id");
  if (!Number.isFinite(s.order)) throw new Error(`stash ${s.id}: order`);
  if (!BLENDS.includes(s.blend)) throw new Error(`stash ${s.id}: blend ${s.blend}`);
  if (!WHENS.includes(s.when)) throw new Error(`stash ${s.id}: when ${s.when}`);
  return Object.freeze({ id: s.id, order: s.order, blend: s.blend, when: s.when });
}

/** Sort by order, freeze, reject colliding ids/orders and unknown blend/when. */
export function composeStashes(stashes) {
  const src = stashes == null ? STASHES : stashes;
  const list = Array.from(src, freezeStash).sort((a, b) => a.order - b.order);
  const ids = new Set();
  const orders = new Set();
  for (const s of list) {
    if (ids.has(s.id)) throw new Error(`stash id collision: ${s.id}`);
    if (orders.has(s.order)) throw new Error(`stash order collision: ${s.order}`);
    ids.add(s.id);
    orders.add(s.order);
  }
  return Object.freeze(list);
}

export const COMPOSE = composeStashes(STASHES);

export function lumaOf(rgb) {
  return rgb[0] * LUMA_W[0] + rgb[1] * LUMA_W[1] + rgb[2] * LUMA_W[2];
}

/** Rec.709 cap. Lit luma never above 0.92. */
export function lumaCap(rgb) {
  const L = lumaOf(rgb);
  const s = Math.min(1, LUMA_MAX / Math.max(L, 1e-4));
  return [rgb[0] * s, rgb[1] * s, rgb[2] * s];
}

/** Lift crushed ink off #000 so the print still has air. */
export function inkLift(rgb) {
  return [
    Math.max(rgb[0], INK[0]),
    Math.max(rgb[1], INK[1]),
    Math.max(rgb[2], INK[2]),
  ];
}

/** Glow rides uEmit only. Albedo stays a painted plate. */
export function emitGate(albedo, glow, uEmit) {
  const e = Math.max(0, Number(uEmit) || 0);
  return lumaCap([
    albedo[0] + glow[0] * e,
    albedo[1] + glow[1] * e,
    albedo[2] + glow[2] * e,
  ]);
}

export const protocol = {
  STASH,
  STASHES,
  COMPOSE,
  BLENDS,
  WHENS,
  composeStashes,
  lumaCap,
  inkLift,
  emitGate,
  LUMA_MAX,
  INK,
};
