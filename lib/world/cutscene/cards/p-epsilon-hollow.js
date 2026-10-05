// epsilon-hollow: the Akatsuki hideout on the south-east rim (issue 10 W3/W5). Not a normal dock play: Itachi's Mangekyo,
// abstract. No dock pull: an eye opens over the mouth and its iris fills the lens, the tomoe turn and close into the
// Mangekyo, the lens falls through the pupil into Tsukuyomi (a red-moon field in paint, crows as flecks), and Amaterasu
// burns the field down in black fire-paint. Home is the hideout's mouth. The Tensura play (Rimuru, Veldora, Predator,
// "Kwahaha", into.from 0.611) left with the seal for the spawn statue; none of it is here. No face: the eye is the picture.
// Move: components/world/cutscene/moves/p-epsilon-hollow.jsx (the shaders in moves/p-epsilon-hollow/iris.js).
export default {
  id: "p-epsilon-hollow",
  homage: "Itachi Uchiha's Mangekyo Sharingan, abstract: the iris, Tsukuyomi's red moon, Amaterasu as black fire-paint, crows",
  why: "Bare metal is an illusion only the kernel sees: memory, files and scheduler on one sphere, with no POSIX and no libc under it.",
  stage: { color: "#b3122a", stars: "none", halftone: 0, sfx: "KA" },
  length: 29.2,
  beats: {
    sign: [0.2, 0.9],
    impact: 1.0,
    bloom: [1.0, 1.6],
    enter: 2.8,
    lineA: 3.2,
    move: [6.0, 8.6],
    lineB: 8.6,
    lineC: 14.0,
    credit: 22.7,
    collapse: [26.7, 28.2],
    radius: 30,
  },
  // no pull off the dock (the eye opens over the mouth instead), a low flank into the pupil, the kill on Amaterasu
  pull: { far: 0, fov0: 46, fov1: 40 },
  into: { from: -0.35, elev: 0.9, fov: 40 },
  kill: { what: "Amaterasu: black fire-paint burns Tsukuyomi down; crows scatter", at: "collapse" },
  fog: { near: 80, far: 400 }, camFar: 600,
  speaker: "land",
  landAt: { x: 44, y: 2.4, z: 66 }, // the hideout's mouth
  a: { who: "land", text: "You are inside the eye. Here, I decide what runs." },
  b: { who: "seal", text: "...the moon went red.", kind: "whisper" },
  c: { who: "seal", text: "Bare metal x86_64. No POSIX. No libc. I never ran on your stone. Memory, files and scheduler, on one sphere.", kind: "burst" },
  credit: { title: "Epsilon-Hollow · lab", sub: "Memory, files and scheduler, on one sphere. · Rust · bare metal x86_64 · no POSIX · no libc" },
  move: { pose: "sign", then: "eyes", note: "Itachi, abstract: the iris fills the lens over the mouth, tomoe into Mangekyo, through the pupil into Tsukuyomi (red moon, paint, crows), Amaterasu as black fire-paint, home at the mouth." },
  bold: ["inside the eye", "red.", "Bare metal x86_64. No POSIX. No libc."],
};
