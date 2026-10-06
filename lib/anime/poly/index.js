// Poly mesh kits. Parent wires:
//   import { POLY_KITS } from "./poly/index.js";
// Extra loops only where the lens lands. Far set stays cards.
// Do not edit engine/catalog/cutscenes from this folder.
import { FACE } from "./face.js";
import { COSTUME } from "./costume.js";
import { HAIR } from "./hair.js";
import { HAND } from "./hand.js";
import { SET_EDGE } from "./set-edge.js";

export { defineKit } from "./define.js";
export {
  builder,
  toMesh,
  computeNormals,
  mergeMesh,
  mirrorX,
  bothSides,
  addBox,
  addPlate,
  addTaper,
  addDisc,
  addRibbon,
  addLidBand,
  addSweepX,
  addBowl,
} from "./mesh.js";

export { FACE } from "./face.js";
export { COSTUME } from "./costume.js";
export { HAIR } from "./hair.js";
export { HAND } from "./hand.js";
export { SET_EDGE } from "./set-edge.js";

export const POLY_KITS = [
  ...FACE,
  ...COSTUME,
  ...HAIR,
  ...HAND,
  ...SET_EDGE,
];

export const POLY_KIT_COUNT = 25;
if (POLY_KITS.length !== POLY_KIT_COUNT) {
  throw new Error(`poly kit count ${POLY_KITS.length} != ${POLY_KIT_COUNT}`);
}

export const POLY_FAMILY_COUNTS = {
  face: 8,
  costume: 8,
  hair: 4,
  flipper: 2,
  "set-edge": 3,
};

const familySeen = POLY_KITS.reduce((m, k) => {
  m[k.family] = (m[k.family] ?? 0) + 1;
  return m;
}, {});
for (const [family, n] of Object.entries(POLY_FAMILY_COUNTS)) {
  if (familySeen[family] !== n) {
    throw new Error(`poly family ${family} count ${familySeen[family]} != ${n}`);
  }
}

export const kit = (name) => {
  const t = POLY_KITS.find((x) => x.name === name);
  if (!t) throw new Error(`anime poly kit not found: ${name}`);
  return t;
};

export default POLY_KITS;
