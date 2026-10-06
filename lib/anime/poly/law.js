// Eye-land density. Far plates stay cards. The locked pear never becomes a human.

export const LAND = Object.freeze({
  FACE: "face",
  COSTUME: "costume",
  HAIR: "hair",
  HAND: "hand",
  SET_EDGE: "set-edge",
});

export const BUDGET = Object.freeze({
  face: { min: 80, max: 240, why: "lids, fringe cards, ear, muzzle crease" },
  costume: { min: 60, max: 180, why: "lapel, cloak folds, buttons, collar stand" },
  hair: { min: 8, max: 16, why: "clumps, not tufts, not strands" },
  hand: { min: 12, max: 36, why: "finger-suggest pads on a flipper" },
  "set-edge": { min: 24, max: 80, why: "window sash, desk lip, cornice — lens-hit only" },
});

export function assertBudget(family, tris) {
  const b = BUDGET[family];
  if (!b) throw new Error(`poly family unknown: ${family}`);
  if (tris < b.min || tris > b.max) throw new Error(`poly ${family}: ${tris} outside ${b.min}..${b.max}`);
  return tris;
}

export const FAR_CARD = Object.freeze({ tris: 2, why: "a plate the lens does not land on" });
