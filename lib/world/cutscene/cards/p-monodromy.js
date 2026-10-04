// Monodromy: Steins;Gate. Can the loop be undone: the upper sheet answers.
// The dock builder owns this file and moves/p-monodromy.jsx; the fields are in cards/index.js.
// Treatment: treatments/g4.md. Line C is the seal's flex; the credit card closes the scene.
export default {
  id: "p-monodromy",
  homage: "Steins;Gate",
  why: "Can the loop be undone: the upper sheet answers.",
  stage: { stars: "sparkle", halftone: 6, sfx: "DOKUN" },
  speaker: "land",
  a: { who: "seal", text: "El Psy Kongroo." },
  b: { who: "land", text: "The loop closed below. Not above." },
  c: { who: "seal", text: "Can it be undone? Topology answers. No Jacobian required. 5 dependencies." },
  mobile: { a: "El Psy Kongroo.", b: "The loop closed below. Not above.", c: "No Jacobian required. 5 dependencies." },
  credit: { title: "teerthsharma/monodromy", sub: "no Jacobian required · 5 dependencies · torch not required" },
  move: { pose: "sign", note: "Flipper at the head like a phone, held through line A; the real pup runs the floor loop and lands home; the upper copy stands on the coral sheet, then rides home on the second lap." },
  length: 10.0,
  // the treatment's clock: the run is the move, the shift lands on line B, the second lap rides line B
  beats: { move: [4.4, 5.4], lineB: 5.4, lineC: 6.9, credit: 8.4, collapse: [9.6, 9.95] },
};
