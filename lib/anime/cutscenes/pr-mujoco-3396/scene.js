// SCENE DATA for pr-mujoco-3396 (Attack on Titan, the Rumbling (Renaissance)). Written by the DIRECTION agent. Pure data: no imports, no code.
// Schema and cue names: ../CONTRACT.md. The bible: scripts/pr-mujoco-3396.md and .json (the teerthfolio-wt scripts folder).
// This stub is VALID as shipped: it plays the camera law over the locked seal so the lab route works at once.
export default {
  id: "pr-mujoco-3396",
  title: "Attack on Titan, the Rumbling (Renaissance)",
  anime: "Attack on Titan, the Rumbling (Renaissance)",
  style: "modern-anime", // lib/anime/styles.js id; `look` below merges over it
  look: {},              // partial style: { post:{...}, lines:{...}, fill:{...} }
  fps: 12,               // character timing: 12 = twos, 8 = threes
  duration: 17,          // s
  seed: 1,
  palette: { sky: "#1b2548", ground: "#3a4a6a", key: "#fff1d8", accent: "#ffcf5a", ink: "#17141f" },
  seal: { at: [0, 0, 0], yaw: 0, scale: 1, moves: [], track: [] },
  // the camera law (L3): wide -> arc -> kill -> home, a cut at least every 5 s. Fields: CONTRACT.md "Shots".
  shots: [
    { n: 1, t: [0, 4], law: "wide" },
    { n: 2, t: [4, 9], law: "arc" },
    { n: 3, t: [9, 13], law: "kill" },
    { n: 4, t: [13, 17], law: "home" },
  ],
  beats: [],   // { t, name, dur?, ...args }: reserved names impact, speedlines, shock, trauma, pose; any other name goes to the layers
  bubbles: [], // { t:[a,b], text | pool:"lines", who, side }  lower half, one at a time
  lines: [],   // the 15-line character-voiced pool (L12)
  sfx: [],     // { t:[a,b], text, at:[u,v], size, rot, col }
  credit: null, // { t:[a,b], text }
};
