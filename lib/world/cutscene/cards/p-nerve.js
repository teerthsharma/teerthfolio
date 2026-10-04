// nerve: Death Note, the bells on the rooftop, where the pup hands Ryuk the pen, in the Baroque-Tenebrism dimension.
// The Task Force tower's rooftop in the rain, painted as a Caravaggio: the pup gives its notebook to the one creature
// built to kill its result, then holds the page up to the camera. Ryuk (the control) speaks from the parapet, L from the
// roof's edge; the seal says the flex line holding the page to the lens, and the painting cracks along its varnish and
// falls away from the island. The dock builder owns this file and moves/p-nerve.jsx (parts in moves/p-nerve/); the
// fields are in cards/index.js. The two figures are drawn by the move; the card places their mouths for the bubble tails.
// A phone gets the short cut (the getters read the viewport when a line is drawn).
const phone = () => typeof innerWidth === "number" && innerWidth <= 600;
export default {
  id: "p-nerve",
  homage: "Death Note: Ryuk's promise, and the bells on the rooftop in the rain",
  why: "The control was built to be able to kill the result, and what it said was published.",
  stage: { color: "#b3171f", stars: "none", halftone: 6, sfx: "DONG" },
  // Ryuk (the control) crouched on the parapet, L (hunched, face to the rain) at the roof's edge: their mouths, from the pup
  speaker: [
    { build: "tall", hair: "spiky", prop: "none", pose: "hip", at: [1.55, 0.55, -2.35], scale: 1 },
    { build: "tall", hair: "short", prop: "none", pose: "side", at: [-3.55, -0.24, -2.2], scale: 1 },
  ],
  length: 31,
  beats: { lineA: 4.2, move: [11.3, 11.9], lineB: 11.9, lineC: 17.6, credit: 26, collapse: [30.2, 30.6] },
  // a level lens a little above the deck, stood back: the cast on the parapet over the pup, the pup above the bubbles
  view: {
    wide: [[0.7, 0.8, -1.0], [0.0, 0.7, 10.4]],
    tall: [[0.5, 1.3, -1.0], [0.0, 0.7, 15.4]],
  },
  a: { who: "sil", text: "When it ends, I'm the one who writes yours." },
  b: { who: "sil2", text: "The bells are loud today." },
  c: {
    who: "seal",
    kind: "burst",
    get text() {
      return phone() ? "3 of its own 4 hypotheses withdrawn." : "I built the control that could kill my own result, then published what it said. 3 of its own 4 hypotheses withdrawn. 224 tests passing.";
    },
  },
  credit: { title: "nerve", sub: "3 of its own 4 hypotheses withdrawn · 224 tests passing" },
  bold: ["yours", "loud", "3 of its own 4 hypotheses withdrawn.", "224 tests passing."],
  move: { pose: "sign", then: "point", note: "The pup is Light on the rooftop: it hands Ryuk the apple, writes four hypotheses, Ryuk's grains bury three and the bell tolls three times; the survivor stays; the page goes up to the camera and the painting cracks." },
};
