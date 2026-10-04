// epsilon-hollow: Fullmetal Alchemist. The pup in Edward's red coat (steel automail flipper) claps, slaps its palms to the
// sunset plaza, and a blue transmutation circle races out while the ground rises into stone; Alphonse stands beside it; then
// the Gate of Truth opens (tendrils, eyes, Truth's grin). The Gate is the hollow metaphor: no Philosopher's Stone, no libc.
// The circle reverses and transmutes the pup home ("Return trip: paid in full."). The dock builder owns this file and
// moves/p-epsilon-hollow.jsx (parts in moves/p-epsilon-hollow/); the fields are in cards/index.js.
export default {
  id: "p-epsilon-hollow",
  homage: "Fullmetal Alchemist: Brotherhood (the clap, the transmutation circle, Alphonse, the Gate of Truth)",
  why: "Equivalent exchange: the pup pays in bare metal and needs no Philosopher's Stone, no POSIX and no libc.",
  stage: { color: "#e0262b", stars: "none", halftone: 0, sfx: "CLAP" },
  length: 27.0,
  beats: {
    sign: [0.2, 0.9],
    impact: 1.0,
    bloom: [1.0, 1.5],
    enter: 2.8,
    lineA: 3.4,
    move: [4.4, 8.6],
    lineB: 8.6,
    lineC: 13.8,
    credit: 20.2,
    collapse: [24.4, 25.6],
    frame: 0.4,
    radius: 45, // the stage hides the island from the first frame
  },
  speaker: "land",
  view: { wide: [[-0.3, 1.5, 1.5], [0.0, 2.4, 11.0]], tall: [[-0.3, 1.7, 1.5], [0.0, 3.0, 15.0]] },
  a: { who: "seal", text: "Equivalent exchange." },
  b: { who: "seal", text: "Bare metal x86_64. No POSIX. No libc.", kind: "burst" },
  c: { who: "seal", text: "I never ran on your stone. Memory, files and scheduler, on one sphere.", kind: "burst" },
  credit: { title: "Epsilon-Hollow · lab", sub: "Memory, files and scheduler, on one sphere. · Rust · bare metal x86_64 · no POSIX · no libc" },
  move: { pose: "sign", then: "crouch", note: "Fullmetal Alchemist: the pup claps in slow motion, slaps its palms to the ground, a blue transmutation circle races out and the stone rises; Alphonse stands by; the Gate of Truth opens on the hollow. The circle reverses and sends the pup home." },
  bold: ["Equivalent exchange.", "your stone", "Bare metal x86_64. No POSIX. No libc."],
};
