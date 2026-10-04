// planimeter: Classroom of the Elite, Ayanokoji's exact fifty, on the Advanced Nurturing High School campus, in the
// Swiss-grid dimension. The pup is Ayanokoji in the window seat; every mark it writes is exactly the one it meant, and
// everything else is left blank, never guessed: exact, or refused. Class D's guessers are shapely.
// Three voices on two slots: the move swaps Horikita's line in for Chabashira's at the move beat (HORIKITA, below), and the
// tails follow whoever speaks (the lens never moves; the campus does: moves/p-planimeter/layout.js). The seal's flex is
// line B, so its sub sits under it. The dock builder owns this file and moves/p-planimeter.jsx (parts in moves/p-planimeter/).
import { BEATS, LENGTH, TAILS, T, lensAt } from "../../../../components/world/cutscene/moves/p-planimeter/layout.js";

const phone = () => typeof innerWidth === "number" && innerWidth <= 600;
const now = () => (typeof window !== "undefined" ? window.__g5T ?? -1 : -1);
export const HORIKITA = { who: "land", kind: "oval", text: "Fifty. Again. Nobody does that by accident." };
export default {
  id: "p-planimeter",
  homage: "Classroom of the Elite: Ayanokoji's exact fifty",
  why: "Exact, or refused.",
  stage: { color: "#6b7d90", stars: "none", halftone: 0, sfx: "SWISH" },
  length: LENGTH,
  beats: { ...BEATS, impact: 2.35, bloom: [2.35, 2.8], enter: 2.9 }, // the SWISH stinger waits for the banner to roll up (T.banner[2])
  speaker: "land",
  landAt: { x: 52, y: 3.5, z: 11 },
  get view() {
    return lensAt(now());
  },
  a: { who: "land", kind: "oval", text: "Every box filled in. And every wrong one costs you." },
  b: {
    who: "seal",
    kind: "burst",
    get text() {
      return phone() ? "495 exact. 33 refused. 0 wrong." : "Exact, or refused. 495 exact. 33 refused. 0 wrong.";
    },
  },
  sub: "shapely.polygonize_full: 336 wrong, 0 refused",
  // the tail follows the speaker: Chabashira, then Horikita, then (after the camera drops) Horikita off-panel
  tail: {
    get a() {
      const t = now();
      return t >= T.gateLens[0] ? TAILS.off : t >= BEATS.move[0] - 0.12 ? TAILS.hori : TAILS.chab;
    },
    b: TAILS.flex,
  },
  credit: { title: "teerthsharma/planimeter · 495 exact · 33 refused · 0 wrong", sub: "the same 528 files" },
  num: "495",
  bold: ["costs", "by accident", "495 exact. 33 refused. 0 wrong."],
  move: { pose: "sign", then: "raise", note: "The pup is Ayanokoji in the back-row window seat; the sheets blow out of 1-D, the guess snaps shut and the red pen checks it coral; one tap and the exact ones close amber under EXACT stamps; HMM. over the near-miss; the bridge gate drops; the board is cleared at checkmate and the island is underneath." },
};
