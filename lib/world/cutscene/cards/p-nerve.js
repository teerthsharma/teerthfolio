// Nerve: Lelouch's Geass. The control was built to be able to kill the result.
// The pup is Lelouch; C.C. watches from the left edge; the crowd chants. The
// dock builder owns this file and moves/p-nerve.jsx; the fields are in cards/index.js.
// A phone gets the 8-word cut (the getters read the viewport when a line is drawn).
const phone = () => typeof innerWidth === "number" && innerWidth <= 600;
export default {
  id: "p-nerve",
  homage: "Code Geass",
  why: "The control was built to be able to kill the result.",
  stage: { stars: "sparkle", halftone: 6, sfx: "GEASS" },
  // C.C.: the kit's tall figure with the long mane, mirrored to the left edge by the move; her pizza is the move's
  speaker: { build: "tall", hair: "mane", prop: "none", pose: "handout", at: [2.75, 0, -1.5], scale: 0.72 },
  a: {
    who: "seal",
    get text() {
      return phone() ? "Only those prepared to be killed should kill." : "The only ones who should kill are those prepared to be killed.";
    },
  },
  b: {
    who: "seal",
    get text() {
      return phone() ? "3 of its own 4 hypotheses withdrawn." : "I built the control that could kill my result. 3 of its own 4 hypotheses withdrawn. 224 tests passing.";
    },
  },
  get sub() {
    return phone() ? "224 tests passing" : null;
  },
  bold: ["3 of its own 4 hypotheses withdrawn.", "224 tests passing."],
  length: 9.8,
  beats: { lineB: 5, move: [4.4, 5] },
  move: { pose: "sign", then: "point", note: "The pup is Lelouch: flipper over the eye, then one eye flares and the control rains on four cards; three crack, it holds the live one to the lens." },
};
