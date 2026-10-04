// THE CLASSROOM PLAN and the camera, shared by the card (bubble tails) and the move.
// Rig frame: the pup sits at the origin on its chair (seat top y = 0), facing +z a little to its left; x is to the lens's
// right. Class 1-D of the Advanced Nurturing High School: tall windows on the west wall (x -6), the chalkboard on the
// north wall (z -5), Chabashira at the board. The lens never moves in the world; it dollies by the card's `view`.

export const FLOOR = -0.93;
export const PUP_YAW = 0.3;
export const TEACHER_AT = [3.1, FLOOR, -3.0];

// the clock (s from the arrival, authored scene seconds: PACE in clock.js stretches the ends)
export const T = {
  banner: [0.35, 2.15, 2.35], // unfurled by, held to, rolled up by
  glint: 6.9, // the eye catches the light
  flash: [6.9, 7.25],
  board: [7.3, 8.9], // the chessboard laid over the shot, then drawn away
  mate: 8.05, // CHECKMATE.
  bell: 14.1, // the bell: class dismissed
};
export const LENGTH = 24.2;
export const BEATS = { enter: 3.1, lineA: 3.3, move: [6.4, 9.0], lineB: 9.0, lineC: 14.1, credit: 19.2, collapse: [23.4, 23.8], radius: 130 };

// the lens, [look, eye offset from look] in the rig frame (look.y is absolute; cutView adds the eye offset)
const K = (lx, ly, lz, ex, ey, ez) => [[lx, ly, lz], [ex, ey, ez]];
// keyframes: [scene s, wide, tall]
const KEYS = [
  [0.0, K(-0.2, 0.9, 0.0, 2.6, 0.9, 10.2), K(-0.2, 1.0, 0.0, 3.0, 1.0, 13.0)], // the whole classroom, the light through the glass
  [3.3, K(0.1, 0.75, 0.2, 1.7, 0.55, 6.0), K(0.1, 0.85, 0.2, 2.0, 0.6, 7.8)], // medium: the pup at its desk, the board behind
  [6.2, K(0.1, 0.6, 0.35, 0.55, 0.3, 3.2), K(0.1, 0.7, 0.35, 0.6, 0.3, 4.3)], // pushed in on the calm face
  [6.9, K(0.12, 0.52, 0.5, 0.2, 0.08, 2.1), K(0.12, 0.6, 0.5, 0.25, 0.08, 2.9)], // the eyes
  [9.0, K(0.1, 0.6, 0.35, 0.5, 0.25, 3.0), K(0.1, 0.7, 0.35, 0.55, 0.25, 4.0)],
  [13.6, K(0.1, 0.62, 0.3, 0.9, 0.3, 3.7), K(0.1, 0.72, 0.3, 1.0, 0.3, 4.9)], // the flex, a slow drift
  [14.1, K(0.1, 0.62, 0.3, 0.9, 0.3, 3.7), K(0.1, 0.72, 0.3, 1.0, 0.3, 4.9)],
  [17.5, K(-0.2, 0.9, 0.0, 2.2, 0.8, 8.2), K(-0.2, 1.0, 0.0, 2.6, 0.9, 10.6)], // class dismissed: back out to the room
  [24.2, K(-0.2, 0.9, 0.0, 2.4, 0.9, 8.8), K(-0.2, 1.0, 0.0, 2.8, 1.0, 11.4)],
];
const ss = (a, b, t) => {
  const k = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return k * k * (3 - 2 * k);
};
const OUT = { wide: [[0, 0, 0], [0, 0, 0]], tall: [[0, 0, 0], [0, 0, 0]] };
// one reused object: the card's `view` getter calls this every frame with the scene clock
export function lensAt(t) {
  const u = t < 0 ? KEYS[1][0] : t;
  let i = 0;
  while (i < KEYS.length - 2 && u >= KEYS[i + 1][0]) i++;
  const k = ss(KEYS[i][0], KEYS[i + 1][0], u);
  for (const [a, asp] of [[1, "wide"], [2, "tall"]]) for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) OUT[asp][r][c] = KEYS[i][a][r][c] + (KEYS[i + 1][a][r][c] - KEYS[i][a][r][c]) * k;
  return OUT;
}

// where the speech tails point (rig frame, from the pup): Chabashira's mouth, the pup's own
const MOUTH_UP = FLOOR + 3.3; // m: a tall woman at the board (the room is built to the pup's scale)
export const TAILS = {
  chab: [TEACHER_AT[0] - 0.2, MOUTH_UP, TEACHER_AT[2] + 0.2],
  off: [-3.5, 3.0, 2.0], // the bell: a voice from the room
};
