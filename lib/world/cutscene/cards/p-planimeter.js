// planimeter: Classroom of the Elite, Ayanokoji's exact fifty, in Class 1-D of the Advanced Nurturing High School at sunset.
// The pup is Ayanokoji at its desk; the test paper reads 50 in red; Chabashira (a dark silhouette, long purple hair) says the
// line, the lens pushes in on the calm face, the eye catches the light, a chessboard is laid over the shot: CHECKMATE. Every
// mark it writes is exactly the one it meant, and everything else is left blank, never guessed: exact, or refused.
// Voices: Chabashira (A), the seal's flex (B), the bell (C, Chabashira again), then the credit and the return to the island.
// The dock builder owns this file and moves/p-planimeter.jsx (parts in moves/p-planimeter/).
import { BEATS, LENGTH, TAILS, lensAt } from "../../../../components/world/cutscene/moves/p-planimeter/layout.js";
import { Sx, Sz } from "../../scale.js"; // the lab moved with WORLD_SCALE

const now = () => (typeof window !== "undefined" ? window.__g5T ?? -1 : -1);
const phone = () => typeof innerWidth === "number" && innerWidth <= 600;
export default {
  id: "p-planimeter",
  homage: "Classroom of the Elite: Ayanokoji's exact fifty",
  why: "Exact, or refused.",
  stage: { color: "#f3b36b", stars: "none", halftone: 0, sfx: "CHECK" },
  // dossier (#9): zoom out from the real dock, switch at the wide, push onto the seal from a bent azimuth, then the kill
  pull: { far: 22, fov0: 42, fov1: 56 },
  into: { from: 0.17, elev: 1.1, fov: 36 },
  kill: { what: "the chessboard: CHECKMATE", at: "move" },
  fog: { near: 120, far: 420 },
  camFar: 700,
  length: LENGTH,
  beats: { ...BEATS, impact: 2.35, bloom: [2.35, 2.8] }, // the sunset swells out of the pup behind the banner (T.banner[2])
  speaker: "land",
  landAt: { x: Sx(52), y: 3.5, z: Sz(11) },
  get view() {
    return lensAt(now());
  },
  a: { who: "land", kind: "oval", text: "Fifty. Again. Nobody does that by accident." },
  b: {
    who: "seal",
    kind: "burst",
    get text() {
      return phone() ? "495 exact. 33 refused. 0 wrong." : "Exact, or refused. 495 exact. 33 refused. 0 wrong.";
    },
  },
  c: { who: "land", kind: "oval", text: "Class dismissed. Back to the island." },
  sub: "shapely.polygonize_full: 336 wrong, 0 refused",
  tail: { a: TAILS.chab, b: "pup", c: TAILS.chab },
  credit: { title: "teerthsharma/planimeter · 495 exact · 33 refused · 0 wrong", sub: "the same 528 files", ret: "The bell rings, Class 1-D empties, and the pup is back on the island." },
  num: "495",
  bold: ["Fifty", "by accident", "495 exact. 33 refused. 0 wrong.", "Class dismissed"],
  move: { pose: "sit", note: "The pup is Ayanokoji at his desk in Class 1-D at sunset, the test paper reading 50 in red; Chabashira's line, a slow push-in on the calm face, the eye-glint and a chessboard over the shot, CHECKMATE.; the flex; the bell." },
};
