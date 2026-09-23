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
// Role per entity, each frame, per the figure's own certificate rule: "in a
// class of s entities sharing an answer, at least s - 1 are wrong, so
// exactly n - m threads go coral" (m = number of distinct answers). So for
// every class of entities that share a landing point: the member that is
// actually correct there stays "ok" (green) if one exists; otherwise the
// class's first member is the one wrong answer the certificate cannot see
// ("amber"); every other member of the class is certified wrong ("coral").

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

// Assigns one shared landing point to a class of entities, per the
// certificate rule above: idxs[0] is the class's "first" member, used only
// when correctIdx is not one of the class's own members.
function assignClass(stage, idxs, point, correctIdx) {
  idxs.forEach((i) => {
    const role = i === correctIdx ? "ok" : correctIdx == null && i === idxs[0] ? "amber" : "coral";
    stage[i] = { p: point, role };
  });
}

// "no prefix": accuracy 0.550 (11/20 correct), 15 distinct answers, largest
// shared class 4. [2,3,4,5] share 3's own point (3 stays correct, the other
// three are certified wrong); [9,10] share 9's own point (9 stays correct,
// 10 certified wrong); [14,15] share an off-key point neither of them owns
// (14 is the one wrong answer the certificate can't see, 15 is certified
// wrong); the loners [7],[12],[17] each sit alone at their own off-key
// point (wrong, and alone, so the certificate can't see any of them).
const GROUPS_NOPREFIX = [
  { idxs: [2, 3, 4, 5], correctIdx: 3 },
  { idxs: [9, 10], correctIdx: 9 },
  { idxs: [14, 15] },
];
const LONE_NOPREFIX = [7, 12, 17];

// "random token ids": accuracy 0.100 (2/20 correct), 3 distinct answers,
// largest shared class 18. 2 correct (4, 15) + everyone else piles onto one
// shared point that is nobody's own answer.
const CORRECT_RANDOM = new Set([4, 15]);

// The number of entities sharing the pile point, per stage — used to scale
// how brightly the pile glows.
export const PILE_LOAD = [0, 0, 18, 20];

// Distinct answers per stage, from the figure's own table — coral count per
// stage must equal NE - this (the certificate proves exactly n - m wrong).
const DISTINCT = [20, 15, 3, 1];

// Builds the four stages once for a given ring radius and pile point. Each
// stage is an array of 20 { p: [x, z], role }.
export function buildStages(ringR, pile) {
  const prose = [];
  for (let i = 0; i < NE; i++) prose.push({ p: homePoint(i, ringR), role: "ok" });

  const noPrefix = new Array(NE);
  for (let i = 0; i < NE; i++) noPrefix[i] = { p: homePoint(i, ringR), role: "ok" };
  GROUPS_NOPREFIX.forEach(({ idxs, correctIdx }) => {
    const point = correctIdx != null ? homePoint(correctIdx, ringR) : centroid(idxs, ringR * 0.72);
    assignClass(noPrefix, idxs, point, correctIdx);
  });
  LONE_NOPREFIX.forEach((i) => assignClass(noPrefix, [i], homePoint(i, ringR * 0.72)));

  const random = new Array(NE);
  const pileIdxs = [];
  for (let i = 0; i < NE; i++) {
    if (CORRECT_RANDOM.has(i)) random[i] = { p: homePoint(i, ringR), role: "ok" };
    else pileIdxs.push(i);
  }
  assignClass(random, pileIdxs, pile);

  const collapse = new Array(NE);
  assignClass(collapse, Array.from({ length: NE }, (_, i) => i), pile);

  const stages = [prose, noPrefix, random, collapse];
  stages.forEach((stage, s) => {
    const coral = stage.filter((e) => e.role === "coral").length;
    console.assert(coral === NE - DISTINCT[s], `caustic-layout stage ${s}: expected ${NE - DISTINCT[s]} coral, got ${coral}`);
  });
  return stages;
}
