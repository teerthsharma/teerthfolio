// xnnpack: Bleach, Aizen on the throne of Las Noches. The dimension is Kyoka Suigetsu's illusion: a stark
// white desert under a black sky, the dome-and-towers palace on the horizon, Aizen's throne, and the Bleach
// cast in ink. The pup reclines on the throne; Ichigo's slash cracks the glass once and the illusion holds;
// "It was there all along" breaks Aizen's sword and the whole picture falls, back to the island.
// The dock builder owns this file and moves/pr-xnnpack-10801.jsx (parts in moves/pr-xnnpack-10801/); the fields are
// in cards/index.js. Every voice is a figure of the land (tails are aimed in the rig frame, below), the pup last.
// The move rewrites the tails and the view in place (they are read every frame) as the pup rides the throne down.
export default {
  id: "pr-xnnpack-10801",
  homage: "Bleach: Aizen's throne in Las Noches, and Kyoka Suigetsu",
  why: "The leading gap was free: it was there all along.",
  stage: { color: "#3d7fc4", stars: "none", halftone: 0, sfx: "SHING" },
  length: 15.2,
  // line A (Aizen) at 3.0; the glass cracks over its last beat (the move); Ichigo's line on the repair; the flex on the break
  beats: { radius: 40, lineA: 3.0, move: [5.2, 6.4], lineB: 6.4, lineC: 9.4, credit: 13.2 },
  speaker: "land",
  // the villain's sound (lib/world/cutscene/cues.js), [scene s, cue, length]: a cold reverse-swell and a deep impact on
  // Aizen's line, the glass cracking, then the swell, the impact and the low choir as Kyoka Suigetsu breaks
  cues: [
    [2.0, "reverse", 1.0], [3.0, "impact"], [4.85, "slash"], [5.35, "slash"], [8.4, "reverse", 1.1], [9.55, "impact"], [9.6, "choir", 4.5], [9.6, "tritone", 2.5],
  ],
  landAt: { x: 61, y: 6, z: -52 }, // XNNPACK's mountain: the rig turns so it stands ahead and right when the island returns
  // a level lens, stood back, the pup on its throne above the bubbles; the move lowers it with the pup (view and tail are rewritten each frame)
  view: { wide: [[0.5, 4.2, -1.0], [0.2, -2.4, 18.5]], tall: [[0.4, 5.0, -1.0], [0.2, -3.0, 34.0]] },
  tail: { a: [4.0, 3.95, 0.6], b: [-4.6, 3.1, 4.2], c: [0, 4.55, 0] },
  a: { who: "land", text: "Since when were you under the impression the gap was not there?" },
  b: { who: "land", text: "Where did that space even come from?" },
  c: { who: "seal", text: "It was there all along. 6.42% lower peak. Workspace 144 MiB to 112 MiB.", kind: "burst" },
  credit: { title: "google/XNNPACK #10801 · 6.42% lower peak", sub: "MobileNet V1 peak 23.862980 to 22.331730 MiB. Workspace 144 MiB to 112 MiB." },
  move: { pose: "sign", then: "raise", note: "Las Noches in ink and white: the throne rises with the pup on it, Ichigo's slash cracks the glass once, it re-forms; the truth snaps Kyoka Suigetsu and the dimension falls back to the island." },
  bold: ["the gap", "space", "all along", "6.42% lower peak", "144 MiB to 112 MiB"],
};
