// Pure layout for the "caustic" building (p-caustic): where the 20 entities'
// threads land, stage by stage.
//
// Mirrors the figure's own measured table (data/showcase.json's p-caustic
// figure; teerthsharma.github.io/fig.js, "caustic —"): accuracy, distinct
// answers and the largest shared class, exactly, for the same four
// conditions ("coherent prose" -> "no prefix" -> "random token ids" ->
// " the" x128). Which entity lands where inside a stage is illustrative —
// the figure says so itself ("Which entity lands where within a row is
// illustrative; the counts are the measured ones.") — so this file is free
// to pick a tidy, deterministic grouping as long as the counts land exactly
// on the figure's own numbers.
//
// Role per entity, each frame: "ok" (still its own point, correct), "coral"
// (collapsed into a shared point with at least one other entity — provably
// wrong, per the figure's own certificate: in a class of s, at least s - 1
// are wrong), "amber" (wrong alone, a point the certificate cannot see).

const TAU = Math.PI * 2;
export const NE = 20;

// Entity i's own point, evenly spaced around a ring of radius r, i = 0
// nearest the camera (+z), so a visitor arriving at the dock faces it.
export function homePoint(i, r) {
  const a = (i / NE) * TAU;
  return [Math.sin(a) * r, Math.cos(a) * r];
}

function centroid(idxs, r) {
  let x = 0, z = 0;
  idxs.forEach((i) => {
    const [px, pz] = homePoint(i, r);
    x += px; z += pz;
  });
  return [x / idxs.length, z / idxs.length];
}

// "no prefix": accuracy 0.550 (11/20 correct), 15 distinct answers, largest
// shared class 4. 11 correct + three collapsed groups (4, 2, 2 -> 3 distinct
// wrong points) + one lone wrong (1 distinct) = 15 distinct, largest 4.
const GROUPS_NOPREFIX = [[2, 3, 4, 5], [9, 10], [14, 15]];
const LONE_NOPREFIX = [16];
const CORRECT_NOPREFIX = new Set([0, 1, 6, 7, 8, 11, 12, 13, 17, 18, 19]);

// "random token ids": accuracy 0.100 (2/20 correct), 3 distinct answers,
// largest shared class 18. 2 correct + everyone else on one shared point.
const CORRECT_RANDOM = new Set([4, 15]);

// The number of entities sharing the pile point, per stage — used to scale
// how brightly the pile glows.
export const PILE_LOAD = [0, 0, 18, 20];

// Builds the four stages once for a given ring radius and pile point. Each
// stage is an array of 20 { p: [x, z], role }.
export function buildStages(ringR, pile) {
  const prose = [];
  for (let i = 0; i < NE; i++) prose.push({ p: homePoint(i, ringR), role: "ok" });

  const noPrefix = new Array(NE);
  CORRECT_NOPREFIX.forEach((i) => { noPrefix[i] = { p: homePoint(i, ringR), role: "ok" }; });
  GROUPS_NOPREFIX.forEach((g) => {
    const p = centroid(g, ringR);
    g.forEach((i) => { noPrefix[i] = { p, role: "coral" }; });
  });
  LONE_NOPREFIX.forEach((i) => { noPrefix[i] = { p: homePoint(i, ringR * 0.72), role: "amber" }; });

  const random = [];
  for (let i = 0; i < NE; i++) random.push(CORRECT_RANDOM.has(i) ? { p: homePoint(i, ringR), role: "ok" } : { p: pile, role: "coral" });

  const collapse = [];
  for (let i = 0; i < NE; i++) collapse.push({ p: pile, role: "coral" });

  return [prose, noPrefix, random, collapse];
}
