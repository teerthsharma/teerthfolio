// Planimeter: The Empire Strikes Back. Exact or refused. The pup is the small master (hunched, a tiny
// cane, no ears) in a misty amber bog; the silhouette is Luke, witness, with an unlit hilt. Three voices
// on two slots: the move swaps in Luke's line (LUKE, below) when the move beat begins.
// The dock builder owns this file and moves/p-planimeter.jsx; the fields are in cards/index.js.
const phone = () => typeof innerWidth === "number" && innerWidth <= 600;
export const LUKE = { who: "sil", kind: "oval", text: "I don't believe it." };
export default {
  id: "p-planimeter",
  homage: "Yoda",
  why: "Exact or refused.",
  stage: { stars: "motes", halftone: 6, sfx: "VWOOM" },
  // Luke: the kit's tall figure, hands at his sides; the hilt on his belt is the move's
  speaker: { build: "tall", hair: "short", prop: "none", pose: "side" },
  a: { who: "seal", kind: "oval", text: "Do, or do not. There is no guess." },
  b: {
    who: "seal",
    kind: "burst",
    get text() {
      return phone() ? "495 exact. 33 refused. 0 wrong." : "That is why you fail. 495 exact. 33 refused. 0 wrong.";
    },
  },
  sub: "shapely.polygonize_full: 336 wrong, 0 refused",
  bold: ["There is no guess.", "495 exact. 33 refused. 0 wrong."],
  num: "495",
  length: 10.4,
  beats: { lineB: 5.6, move: [4.1, 5.6] },
  move: { pose: "sit", then: "fist", note: "The pup sits hunched with its cane, raises a flipper and the bog lifts 495 closed polygons; it hovers over an open one, sweats, pulls back; 33 stay open." },
};
