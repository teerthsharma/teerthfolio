// Separatrix: Fist of the North Star. Decided by the data, or nothing is returned.
// The pup is Kenshiro; the thug (mohawk, one spiked pad, a coin) is the one who says a coin flip
// decides your side. Three voices on two slots: the move swaps in the pup's pun (PUN, below) when the
// move beat begins. The dock builder owns this file and moves/p-separatrix.jsx; the fields are in cards/index.js.
const phone = () => typeof innerWidth === "number" && innerWidth <= 600;
export const PUN = { who: "seal", kind: "oval", text: "You're already decided." };
export default {
  id: "p-separatrix",
  homage: "Fist of the North Star",
  why: "Decided by the data, or nothing is returned.",
  stage: { stars: "motes", halftone: 6, sfx: "ATATA" },
  // the thug: the kit's broad figure; his mohawk, spiked pad and coin are the move's
  speaker: { build: "broad", hair: "none", prop: "none", pose: "handout" },
  a: {
    who: "sil",
    get text() {
      return phone() ? "A coin flip decides your side!" : "Heh. A coin flip decides your side!";
    },
  },
  b: {
    who: "seal",
    kind: "burst",
    get text() {
      return phone() ? "Certified or refused. Not by rounding." : "Top-k, argmin and threshold: certified or refused. Decided by the data, not by rounding.";
    },
  },
  bold: ["already decided.", "certified or refused.", "Certified or refused."],
  length: 10.4,
  beats: { lineB: 5.6, move: [4.2, 5.6] },
  move: { pose: "fist", then: "point", note: "The pup is Kenshiro: a flurry of jabs at the parcels, then it turns its back. Clear parcels roll to their pools and ring; the thug's coin lands in the coral band and tears in two." },
};
