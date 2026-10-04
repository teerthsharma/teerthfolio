// Separatrix: JoJo's Bizarre Adventure Part 5, Gold Experience Requiem at the Colosseum, in the
// Fresco-and-Gold-Leaf dimension. King Crimson erases time so only the result remains (an answer with its
// cause cut out: an argmin whose side the rounding chose); the Requiem returns every action to zero, so the
// result never arrives, and a clear start rings while a start inside the rounding band is refused.
// The pup is Giorno. Diavolo speaks from the far side of the arena (the figure here only places his
// tail: the move draws him); the seal answers with its back turned, then says the flex line on the break.
// The dock builder owns this file and moves/p-separatrix.jsx (parts in moves/p-separatrix/).
const phone = () => typeof innerWidth === "number" && innerWidth <= 600;
export default {
  id: "p-separatrix",
  homage: "JoJo's Bizarre Adventure Part 5: Gold Experience Requiem",
  why: "Decided by the data, not by rounding: certified or refused.",
  stage: { color: "#d9a441", stars: "none", halftone: 6, sfx: "GOGOGO" },
  length: 17.4,
  // Diavolo: the kit's tall figure marks where his tail points; the move draws him (and King Crimson) there
  speaker: { build: "tall", hair: "none", prop: "none", pose: "side", at: [5.2, 0, -11.4], scale: 1.2 },
  // a level, canted lens, raised just over the arena wall's lip (the lens stands in the gap in the hypogeum, above the skirt)
  view: { wide: [[1.5, 1.0, -3.5], [-1.3, 1.7, 11.2]], tall: [[1.3, 1.0, -3.5], [-1.0, 1.7, 11.2]] },
  beats: { sign: [0.2, 0.7], impact: 0.75, bloom: [0.75, 1.2], enter: 1.3, lineA: 3.0, move: [6.0, 6.4], lineB: 6.4, lineC: 12.3, credit: 15.4, collapse: [16.6, 17.0] },
  a: { who: "sil", text: "King Crimson! Only the result remains!" },
  b: { who: "seal", kind: "oval", text: "You will never arrive at the truth." },
  c: {
    who: "seal",
    kind: "burst",
    get text() {
      return phone() ? "Certified or refused. Decided by the data, not by rounding." : "Top-k, argmin and threshold: certified or refused. Decided by the data, not by rounding.";
    },
  },
  credit: { title: "separatrix", sub: "top-k, argmin and threshold · certified or refused" },
  bold: ["result", "truth", "certified or refused.", "Certified or refused."],
  move: { pose: "sign", then: "fist", note: "The pup is Giorno in the Colosseum fresco: King Crimson erases the plaster to the red sketch, the Requiem gilds it back and returns every action to zero; the barrage drops Diavolo into the saddle for good, and the gold un-paints the picture back to the island." },
};
