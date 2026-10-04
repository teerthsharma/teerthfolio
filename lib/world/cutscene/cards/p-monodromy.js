// monodromy: Magi, Sinbad and Baal's Baararaq Saiqa in Sindria, Arabian Nights. Ja'far panics, the seal fires the
// strongest lightning, it breaks the fourth wall, and the crack is the loop: the seal steps through, the scene folds
// shut along it and the island is exactly where we left it (monodromy: the loop closed below, not above).
// The dock builder owns this file and moves/p-monodromy.jsx (parts in moves/p-monodromy/); the fields are in cards/index.js.
// Ja'far's panic ("My king, you can't fire that inside a portfolio!") is the move's own bubble, up before line A:
// the shared bubbles hold three lines, and the scene needs four. Round head, no ears.
export default {
  id: "p-monodromy",
  homage: "Magi: Sinbad, the djinn Baal and Baararaq Saiqa",
  why: "Can a loop be undone? It closed below, not above.",
  stage: { color: "#1fbdb4", stars: "none", halftone: 6, sfx: "ZZAAP" },
  length: 14.0,
  beats: { lineA: 4.6, move: [6.4, 7.0], lineB: 7.0, lineC: 9.6, credit: 12.0, collapse: [13.2, 13.6] },
  speaker: "land",
  // a level lens a little above the terrace: the palace and the vortex over the pup, the pup above the bubbles
  view: { wide: [[0.4, 1.15, -1.0], [-0.1, 0.95, 10.6]], tall: [[0.3, 1.45, -1.0], [-0.1, 1.0, 13.5]] },
  a: { who: "seal", text: "Relax. The loop closes. It always closes below." },
  b: { who: "seal", text: "…Oops. Wrong dimension. Hold on.", kind: "burst" },
  c: { who: "seal", text: "Can it be undone? Topology answers: it closed below, not above. 5 dependencies, torch not required.", kind: "burst" },
  credit: { title: "teerthsharma/monodromy · 5 dependencies · torch not required", sub: "No Jacobian required: the loop closes below, not above." },
  move: { pose: "sign", then: "raise", note: "The pup becomes Sinbad and equips Baal while Ja'far panics; Baararaq Saiqa cracks the lens, the pup steps into the crack and the scene folds shut along it, home exactly where it left." },
  bold: ["always closes below", "Wrong dimension", "closed below, not above", "5 dependencies"],
};
