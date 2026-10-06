// Genshin-style calculated stack. One permutation per dock, not 1000 programs.
// Unity analogue: shader_feature keywords. WebGL analogue: named chunks + budget.
// Engine still compiles once in build(ctx). Time stays floor(t*fps)/fps.

export const STASH_IDS = Object.freeze(["WORLD", "CAST", "FX", "OCCLUDE", "GRADE"]);

export const ALU_BUDGET = 64;
export const PREFETCH_BUDGET = 24;
export const CORE_CHUNKS = Object.freeze([
  "outline",
  "ramp",
  "faceSdf",
  "rimEdge",
  "hold",
  "print",
]);

export const CHUNK_SHAPE = Object.freeze({
  id: "string",
  stash: "WORLD|CAST|FX|OCCLUDE|GRADE",
  cost: "number 1..32 ALU",
  pri: "number 0..9, 0 = drop first",
  must: "boolean, never dropped",
  kit: "defineModule name",
  need: "cast|face|sil|fx|grade|world",
});

export function freezeChunk(c) {
  if (!c?.id || !c.kit) throw new Error(`chunk incomplete: ${c?.id ?? "?"}`);
  if (!STASH_IDS.includes(c.stash)) throw new Error(`chunk ${c.id}: stash ${c.stash}`);
  const cost = Number(c.cost);
  if (!(cost >= 1 && cost <= 32)) throw new Error(`chunk ${c.id}: cost ${c.cost}`);
  return Object.freeze({
    id: c.id,
    stash: c.stash,
    cost,
    pri: c.pri ?? 5,
    must: !!c.must,
    kit: c.kit,
    need: c.need ?? "cast",
  });
}

export function permKey(ids) {
  return [...new Set(ids)].filter(Boolean).sort().join("+");
}

export function holdTime(t, fps = 12) {
  const f = Math.max(1, fps);
  return Math.floor(Number(t) * f + 1e-5) / f;
}
