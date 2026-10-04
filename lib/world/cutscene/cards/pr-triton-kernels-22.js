// Triton kernels: Jujutsu Kaisen, Sukuna's Malevolent Shrine, a barrierless domain drawn on air in a
// manga-ink dimension (black ink, screentone, paper, one blood-red accent) over a night Shibuya.
// The kernel visits only the scheduled blocks of the causal triangle; every other block is cut away.
// The dock builder owns this file and moves/pr-triton-kernels-22.jsx (parts in moves/pr-triton-kernels-22/);
// the fields are in cards/index.js. The shrine speaks (land); the pup is the demon seal (round head, no ears).
//
// THE SHOT. The two-shot puts a land speaker on a fixed bearing from the pup, so the shrine's mouth is not
// where the bubble's tail would reach. The tail anchor (`landAt`) is therefore computed each frame: the
// point on that bearing that sits exactly on the camera's line to the mouth, so the tail lands on the mouth
// and the rig never turns. The camera (`view`) pushes in slowly as `SHOT.k` runs 0 to 1 (the move writes it).

const FIG = [1.7, -3.2]; // timeline.js FIGURE_AT (x, z)
const FL = Math.hypot(FIG[0], FIG[1]);
const D = [FIG[0] / FL, FIG[1] / FL];

// the layout in the rig frame (the pup at the origin, +z toward the camera)
export const SHOT = {
  k: 0, // the push-in, 0..1
  pup: { x: 0, z: 0 },
  yaw: -0.2386, // the city's turn about the pup: its -z axis runs at the shrine
  shrineZ: -78, // the shrine's centre along the avenue (city frame)
  scale: 0.9, // the shrine's scale
  mouth: [0, 8.2, 9.2], // the mouth, in the shrine's frame
  wide: { e0: [1.1, 0.9, 8.4], e1: [0.5, 0.8, 5.8], p0: [2.4, 2.6, -24], p1: [2.0, 3.0, -24] },
  tall: { e0: [1.0, 0.9, 15], e1: [0.5, 0.8, 10.5], p0: [2.0, 3.2, -24], p1: [2.0, 3.6, -24] },
};

// the mouth in the rig frame (m from the pup)
export function mouthRig(out = [0, 0, 0]) {
  const a = SHOT.yaw;
  const cz = SHOT.shrineZ + SHOT.scale * SHOT.mouth[2];
  out[0] = cz * Math.sin(a);
  out[1] = SHOT.scale * SHOT.mouth[1];
  out[2] = cz * Math.cos(a);
  return out;
}

const lerp3 = (a, b, k, out) => {
  for (let i = 0; i < 3; i++) out[i] = a[i] + (b[i] - a[i]) * k;
  return out;
};
const tallScreen = () => typeof window !== "undefined" && window.innerWidth / Math.max(1, window.innerHeight) < 1;
const EYE = [0, 0, 0];
const MOUTH = [0, 0, 0];
const ANCHOR = { x: 0, y: 2, z: 0 };
const W = [[0, 0, 0], [0, 0, 0]];
const T = [[0, 0, 0], [0, 0, 0]];
const VIEW = { wide: W, tall: T };
function shotFor(cfg, out) {
  const eye = lerp3(cfg.e0, cfg.e1, SHOT.k, EYE);
  const look = lerp3(cfg.p0, cfg.p1, SHOT.k, out[0]);
  for (let i = 0; i < 3; i++) out[1][i] = eye[i] - look[i];
  return out;
}

export default {
  id: "pr-triton-kernels-22",
  homage: "Jujutsu Kaisen: Malevolent Shrine",
  why: "The kernel visits only the scheduled blocks of the causal triangle; every other block is cut away.",
  stage: { hue: 352, color: "#e5142e", stars: "none", halftone: 6, sfx: "SHING" },
  // real clock: line A 5.4 s, line B 9.9 s (the barrage and the return), the flex 6 s, the credit 4.5 s; see the move's WARP
  length: 29.3,
  beats: { lineA: 2.7, move: [7.5, 8.1], lineB: 8.1, lineC: 18.0, credit: 24.0 },
  speaker: "land",
  // the tail anchor: on the bearing the two-shot gives a land speaker, and on the camera's line to the mouth
  get landAt() {
    const m = mouthRig(MOUTH);
    const cfg = tallScreen() ? SHOT.tall : SHOT.wide;
    const eye = lerp3(cfg.e0, cfg.e1, SHOT.k, EYE);
    const ax = m[0] - eye[0];
    const az = m[2] - eye[2];
    const s = ((D[1] * eye[0]) / D[0] - eye[2]) / (az - (D[1] * ax) / D[0]);
    const t = (eye[0] + s * ax) / D[0];
    ANCHOR.x = SHOT.pup.x + t * D[0];
    ANCHOR.z = SHOT.pup.z + t * D[1];
    ANCHOR.y = eye[1] + s * (m[1] - eye[1]);
    return ANCHOR;
  },
  get view() {
    shotFor(SHOT.wide, W);
    shotFor(SHOT.tall, T);
    return VIEW;
  },
  a: { who: "land", text: "Domain Expansion." },
  b: { who: "seal", text: "Malevolent Shrine. Only the scheduled blocks survive.", kind: "burst" },
  c: { who: "seal", text: "Merged into triton-lang/kernels. 804 lines added, 17 tests passing.", kind: "burst" },
  credit: { title: "triton-lang/kernels #22 · merged · 804 lines added · 17 tests passed", sub: "A topology-derived sparse attention kernel" },
  move: { pose: "sign", then: "point", note: "The demon pup signs; a barrierless domain draws Shibuya in ink on the air and the shrine rises over the crossing; the barrage slices the block, the schedule of the causal triangle survives; the shrine's jaws close, the drawing is rubbed out and the island returns." },
  bold: ["Malevolent Shrine", "804 lines added, 17 tests passing"],
  num: "804",
};
