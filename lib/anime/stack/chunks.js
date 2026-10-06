// Feature chunks. Genshin loads keywords, not wallpaper shaders.
// cost = ALU budget units. must = never dropped when a dock asks for it.

import { freezeChunk } from "./law.js";

const C = (id, stash, cost, pri, must, kit, need) =>
  freezeChunk({ id, stash, cost, pri, must, kit, need });

export const CHUNK_LIST = Object.freeze([
  C("outline", "CAST", 6, 9, true, "gsOutline", "sil"),
  C("ramp", "CAST", 8, 9, true, "gsRamp", "cast"),
  C("faceSdf", "CAST", 12, 8, true, "gsFaceSdf", "face"),
  C("rimEdge", "FX", 10, 7, false, "gsRimEdge", "sil"),
  C("hold", "CAST", 4, 8, true, "gsHold", "cast"),
  C("hairRing", "CAST", 8, 6, false, "gsHairRing", "cast"),
  C("paper", "WORLD", 4, 5, false, "gsPaper", "world"),
  C("print", "GRADE", 6, 6, false, "gsPrint", "grade"),
  C("night", "GRADE", 6, 5, false, "gsNight", "grade"),
  C("gold", "GRADE", 6, 5, false, "gsGold", "grade"),
  C("hatch", "CAST", 7, 4, false, "gsHatch", "cast"),
  C("emit", "FX", 8, 6, false, "gsEmit", "fx"),
  C("wash", "WORLD", 5, 4, false, "gsWash", "world"),
  C("fluoro", "WORLD", 6, 4, false, "gsFluoro", "world"),
  C("benday", "GRADE", 6, 4, false, "gsBenday", "grade"),
  C("grey", "GRADE", 5, 4, false, "gsGrey", "grade"),
  C("invert", "OCCLUDE", 5, 3, false, "gsInvert", "fx"),
]);

export const CHUNKS = Object.freeze(
  Object.fromEntries(CHUNK_LIST.map((c) => [c.id, c])),
);

export const CHUNK_IDS = Object.freeze(CHUNK_LIST.map((c) => c.id));

export function chunkById(id) {
  const c = CHUNKS[id];
  if (!c) throw new Error(`stack chunk not found: ${id}`);
  return c;
}
