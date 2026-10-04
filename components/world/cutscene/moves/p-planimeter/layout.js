// THE CAMPUS PLAN and the camera shots, shared by the card (bubble tails) and the move.
// Campus frame: x east, z south, y up, metres; the main building's glass faces south onto the plaza.
// The move's rig puts the pup at the origin; a shot maps the campus into it: rig = R_y(psi) * (campus - P) + off.
// So the "camera" is the world's own transform: the lens (cards view) never moves, the campus does.

export const GRID = 4; // m: the chessboard under everything

// Classroom 1-D on the third floor: x 16..28, the glass at z -14; desks face the blackboard on the east wall.
export const FLOOR3 = 6.55; // m: the third floor's slab top
export const SEAT = [17.2, 7.0, -16.0]; // the window seat: back row, by the glass (the chair seat top)
export const PODIUM = [26.3, FLOOR3, -21.0];
export const HORIKITA_AT = [17.2, 7.0, -18.2]; // the next seat in the back row

export const PLAZA = { x0: 0, x1: 32, z0: -12, z1: 20 }; // 8 x 8 squares of 4 m
export const SQUARE = (i, j) => [PLAZA.x0 + GRID * i + GRID / 2, PLAZA.z0 + GRID * j + GRID / 2];
export const STAND = [...SQUARE(5, 2)]; // [22, -2]: where the pup stands on the board
export const TABLE_AT = [33.8, -1.2];
export const GATE_AT = [48, -58]; // the bridge head on the north shore: the avenue runs round the building to it
export const PSI = 0.5;

// the shots: the world's transform about the pup. A: the window seat. B: the plaza, the pup brought toward the lens.
export const SHOTS = {
  A: { P: SEAT, psi: PSI, off: [0, 0, 0], yaw: PSI },
  B: { P: [STAND[0], 0.0, STAND[1]], psi: 1.15, off: [0, 0, 11], yaw: 0.2 }, // the lens looks east along the plaza: the chess table behind the pup
};

export function rigPoint(c, shot, out = [0, 0, 0]) {
  const x = c[0] - shot.P[0];
  const y = c[1] - shot.P[1];
  const z = c[2] - shot.P[2];
  const s = Math.sin(shot.psi);
  const k = Math.cos(shot.psi);
  out[0] = x * k + z * s + shot.off[0];
  out[1] = y + shot.off[1];
  out[2] = -x * s + z * k + shot.off[2];
  return out;
}

// the lens: look and eye offsets from the pup (cutView), per aspect. It dollies (lensAt): CLOSE on the window seat while the
// banner reads, back to a WIDE establishing of the whole campus for the bell, the guess and the check, in to the MEDIUM
// two-floor shot for the tap, the stamps and the near-miss; the plaza shot (B) is the world's own drop at T.cut.
const gateLook = rigPoint([47, 2.5, -57], { P: SEAT, psi: PSI, off: [0, 0, 0] });
const wideLook = rigPoint([6, 0, -8], { P: SEAT, psi: PSI, off: [0, 0, 0] });
export const VIEW = {
  close: { wide: [[0.3, 0.35, 0], [0.9, 0.55, 5.2]], tall: [[0.3, 0.35, 0], [0.9, 0.6, 6.4]] },
  estab: { wide: [wideLook, [0, 44, 88]], tall: [wideLook, [0, 52, 108]] },
  med: { wide: [[0.4, -3.0, 0], [0, 8.0, 15.5]], tall: [[0.4, -3.8, 0], [0, 10.5, 22]] },
  mid: { wide: [[0.4, -5, 0], [0, 14, 27]], tall: [[0.4, -6, 0], [0, 18, 36]] }, // the stamps across the plaza, the pup in its window
  plaza: { wide: [[0, 0.0, 0], [2.4, 1.9, 9.6]], tall: [[0, 0.1, 0], [1.8, 2.2, 12.5]] }, // after the drop: level, the whole pup centred, the table and the island behind it
  gate: { wide: [gateLook, [20.1, 22, 34.6]], tall: [gateLook, [25.8, 26, 45.2]] }, // from the south along the avenue
};
const ss = (a, b, t) => {
  const k = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return k * k * (3 - 2 * k);
};
const OUT = { wide: [[0, 0, 0], [0, 0, 0]], tall: [[0, 0, 0], [0, 0, 0]] };
// one reused object: the card's `view` getter calls this every frame with the scene clock (s from the arrival)
export function lensAt(t) {
  const a = t < 0 ? 1 : ss(1.9, 3.3, t); // close -> estab
  const b = t < 0 ? 1 : ss(6.3, 6.9, t); // estab -> medium
  const m2 = t < 0 ? 0 : ss(7.3, 7.9, t) * (1 - ss(8.9, 9.4, t)); // medium -> mid for the rain, and back for HMM.
  const c = t < 0 || t >= T.cut ? 0 : ss(T.gateLens[0], T.gateLens[1], t); // medium -> the gate; the plaza cut resets it
  const pz = t >= T.cut ? 1 : 0; // the drop to the plaza: a pup-height lens, never down at the snow
  const pe = 1 - (1 - Math.min(1, Math.max(0, (t - T.cut) / 0.34))) ** 3; // the pup is brought SHOTS.B.off[2] m toward the lens: the look follows it
  for (const asp of ["wide", "tall"]) {
    for (let r = 0; r < 2; r++) {
      for (let i = 0; i < 3; i++) {
        const k = VIEW.close[asp][r][i];
        const e = VIEW.estab[asp][r][i];
        const m = VIEW.med[asp][r][i];
        const g = VIEW.gate[asp][r][i];
        const x = k + (e - k) * a;
        const y0 = x + (m - x) * b;
        const y = y0 + (VIEW.mid[asp][r][i] - y0) * m2;
        const z = y + (g - y) * c;
        OUT[asp][r][i] = pz ? VIEW.plaza[asp][r][i] + (r === 0 && i === 2 ? SHOTS.B.off[2] * pe : 0) : z;
      }
    }
  }
  return OUT;
}

// where the speech tails point (rig frame, from the pup): Chabashira at the podium, Horikita beside the pup, and, once the
// camera has dropped, Horikita off-panel to the left; the pup itself in shot B (the flex)
const mouthOf = (c, h) => [c[0], c[1] + h, c[2]];
export const TAILS = {
  chab: rigPoint(mouthOf(PODIUM, 1.78), SHOTS.A),
  hori: rigPoint(mouthOf(HORIKITA_AT, 1.0), SHOTS.A),
  off: [-9, 3.4, 8],
  flex: [SHOTS.B.off[0], 1.1, SHOTS.B.off[2]],
};

// the clock (s from the arrival)
export const T = {
  banner: [0.35, 2.15, 2.35], // unfurled by, held to, rolled up by
  bell: 2.15, // the sheets blow out of the windows
  slam: 4.2, // Sudo's ball hits the plaza: every sheet snaps shut
  sweep: [4.5, 5.8], // the red checking line, building to sea wall
  wind: [6.0, 6.7], // the wind lifts the rest back to blank
  tap: 6.9, // the pup's flipper on the desk
  rain: [7.05, 8.8], // the exact ones close and are stamped
  hmm: 9.3, // the flipper over the near-miss (held 0.8 s)
  gateLens: [10.0, 10.6], // the lens swings out to the bridge gate
  gate: 10.7, // the bridge gate drops
  cut: 11.5, // the camera drops to the plaza
  move: [11.65, 12.05], // the white piece lifts one square
  click: 12.1, // and sets down
  king: 12.35, // Sakayanagi lays her king down
  mate: 12.55, // CHECKMATE
  fold: 12.85, // the grid is cleared, square by square
};
// pacing (owner): line A >= 3.5 s, line B 4 s, the credit card 3 s; the board is gone by fold + 3.4
export const LENGTH = 20.0;
export const BEATS = { lineA: 3.6, move: [7.72, 8.3], lineB: 12.2, credit: 16.2, collapse: [19.2, 19.6], radius: 130 };
