// Calculated permutation loader. Compile only the dock's keywords.
// Drop lowest pri when over ALU_BUDGET. Dedup kits. Same key = same program.

import { ALU_BUDGET, permKey, STASH_IDS } from "./law.js";
import { CHUNKS } from "./chunks.js";

function unique(ids) {
  const seen = new Set();
  const out = [];
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function pickChunks(ids, budget = ALU_BUDGET) {
  const want = unique(ids).map((id) => {
    const c = CHUNKS[id];
    if (!c) throw new Error(`load: unknown chunk ${id}`);
    return c;
  });
  const must = want.filter((c) => c.must);
  const rest = want
    .filter((c) => !c.must)
    .slice()
    .sort((a, b) => b.pri - a.pri || a.cost - b.cost);
  const taken = [];
  const dropped = [];
  let cost = 0;
  const take = (c) => {
    if (taken.some((x) => x.id === c.id)) return;
    taken.push(c);
    cost += c.cost;
  };
  for (const c of must) take(c);
  if (cost > budget) {
    throw new Error(`load: must chunks cost ${cost} > budget ${budget}`);
  }
  for (const c of rest) {
    if (cost + c.cost > budget) dropped.push(c.id);
    else take(c);
  }
  taken.sort((a, b) => STASH_IDS.indexOf(a.stash) - STASH_IDS.indexOf(b.stash) || a.id.localeCompare(b.id));
  return Object.freeze({
    taken: Object.freeze(taken.slice()),
    dropped: Object.freeze(dropped),
    cost,
    budget,
    key: permKey(taken.map((c) => c.id)),
  });
}

export function kitsOf(picked) {
  return unique(picked.taken.map((c) => c.kit));
}

export function byStash(picked) {
  const bag = Object.fromEntries(STASH_IDS.map((s) => [s, []]));
  for (const c of picked.taken) bag[c.stash].push(c.id);
  return Object.freeze(
    Object.fromEntries(STASH_IDS.map((s) => [s, Object.freeze(bag[s])])),
  );
}

/** Inject glslFor from layers/index. Never import it here (cycle). */
export function loadChunks(ids, opts = {}) {
  const budget = opts.budget ?? ALU_BUDGET;
  const picked = pickChunks(ids, budget);
  const names = kitsOf(picked);
  const glsl = typeof opts.glslFor === "function" ? opts.glslFor(names) : "";
  return Object.freeze({
    ...picked,
    names: Object.freeze(names),
    stashes: byStash(picked),
    glsl,
  });
}
