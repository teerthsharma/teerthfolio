// Tangle: JoJo approaching. A certificate exists only if the loops stay linked. The pup is Jotaro; Dio
// (a tall swept head, the hip-out hold, a coat hem and a swinging pocket watch) is the rival who says
// "Oh? You're approaching me?" Three voices on two slots: the move swaps in the pup's walking line
// (WALK, below) when the move beat begins, and slides Dio's `at` toward the pup, one step a syllable.
// The dock builder owns this file and moves/p-tangle.jsx; the fields are in cards/index.js.
const phone = () => typeof innerWidth === "number" && innerWidth <= 600;
export const START = [3.7, 0, -2.5]; // where Dio drops in; the move walks `at` in from here
export const WALK = { who: "seal", kind: "oval", text: "I can't certify you without getting closer." };
export default {
  id: "p-tangle",
  homage: "JoJo approaching",
  why: "A certificate exists only if the loops stay linked.",
  stage: { stars: "streaks", halftone: 6, sfx: "GOGOGO" },
  // Dio: the kit's tall figure, swept head, hip out and an arm up; his hem and watch are the move's
  speaker: { build: "tall", hair: "swept", prop: "none", pose: "hip", at: [...START], scale: 0.86 },
  a: { who: "sil", text: "Oh? You're approaching me?" },
  b: {
    who: "seal",
    kind: "burst",
    get text() {
      return phone() ? "Linking number 1. 0 wrong certificates." : "Linking number 1. 0 wrong certificates in 2,000 diagrams and 80 scenes.";
    },
  },
  bold: ["approaching", "certify", "Linking number 1. 0 wrong certificates in 2,000 diagrams and 80 scenes.", "Linking number 1. 0 wrong certificates."],
  length: 10.4,
  beats: { lineB: 5.6, move: [3.4, 5.6] },
  move: { pose: "fist", then: "point", note: "Dio holds his pose; the pup walks at him one step a syllable until they stand nose to nose, two rings link between them and the clamp pulls: they hold." },
};
