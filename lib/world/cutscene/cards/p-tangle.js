// tangle: Your Name, the red braided cord (musubi). The seal stands on the shore of the Itomori crater lake
// at kataware-doki; the red cord in its flipper runs across the water to a schoolgirl against the sun. Two
// glowing loops of cord link and a comet falls: they pull, and they cannot come apart. The certificate is
// the knot that holds. When the twilight ends the dimension thins to light and the cord stays tied round
// the flipper, so the island wakes with it still there.
// The dock builder owns this file and moves/p-tangle.jsx (parts in moves/p-tangle/); the fields are in
// cards/index.js. The Hunter x Hunter decor (a chain-link fence, a Hunter License card, a scarlet glint in
// the lamp) lives on the island, in components/world/monuments/Link.jsx, never in the cutscene.
// The girl speaks from across the lake: the tail is aimed at her in the rig's frame. Round head, no ears.
export default {
  id: "p-tangle",
  homage: "Your Name: kataware-doki and the red cord of musubi",
  why: "A certificate exists only if the loops stay linked: certified, or it refuses.",
  stage: { color: "#e0559b", stars: "none", halftone: 0, sfx: "MUSUBI" },
  length: 28.6,
  beats: { lineA: 3.0, move: [7.7, 8.6], lineB: 8.6, lineC: 16.4, credit: 22.4, collapse: [27.8, 28.4] },
  speaker: "land",
  landAt: { x: -48, y: 3, z: 2 }, // the lab: the rig turns it to the right, so the real gantry is what the dusk gives back
  // a level lens a little below the pup's eye, tilted up into the sky: the pup in the lower half above the bubbles
  view: { wide: [[0.4, 1.5, -1.0], [-0.1, -0.8, 10.6]], tall: [[0.3, 1.6, -1.0], [-0.1, -0.9, 13.5]] },
  a: { who: "land", text: "Is the knot real?" },
  b: { who: "seal", text: "It's linked. I can prove it, or I won't say it." },
  c: { who: "seal", text: "0 wrong certificates in 2,000 diagrams and 80 scenes.", kind: "burst" },
  tail: { a: [4.6, 4.2, -27] },
  credit: { title: "teerthsharma/tangle · 0 wrong certificates", sub: "2,000 diagrams · 80 scenes · 247 photographs · two loops that cannot be pulled apart" },
  move: { pose: "sign", then: "fist", note: "The pup ties the red cord on its flipper; it runs across the Itomori lake to a girl against the sun. Two loops link, a comet falls, the cords pull and cannot part: the knot holds. Kataware-doki ends; the cord stays tied." },
  bold: ["knot", "linked", "prove", "0 wrong certificates", "2,000 diagrams", "80 scenes"],
};
