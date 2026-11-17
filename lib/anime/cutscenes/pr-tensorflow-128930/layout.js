// LAYOUT for pr-tensorflow-128930: per shot, where the set stands in the image band (u right, v down, rects [u0, u1, v0, v1]).
// Shots in order: 0 wade, 1 rise, 2 room board (map and board, no creature), 3 wide with the fake, 4 room stamp, 5 lock,
// 6 breath, 7 snap, 8 burn, 9-11 dawn dissolve, 12 turn away, 13 pale pup return. A `room` shot has no tower and no blocks.
const TW = (u0, v0) => [u0, 1.04, v0, 0.9]; // the tower face reaches past the right edge
const NIGHT = { hy: 0.66, dawn: 0 };
const BLK_LEFT = [[-0.02, 0.15, 0.42, 0.7, 3], [0.13, 0.26, 0.5, 0.68, 7], [0.24, 0.33, 0.56, 0.67, 11]];
const BLK_MID = [[0.4, 0.5, 0.56, 0.66, 5], [0.5, 0.63, 0.5, 0.65, 9], [0.62, 0.72, 0.58, 0.66, 13]];
const BLK_RIGHT = [[0.76, 0.9, 0.46, 0.66, 17], [0.88, 1.02, 0.5, 0.66, 21]];

export const SHOTS = [
  { ...NIGHT, shift: 0, blocks: [...BLK_LEFT, ...BLK_MID, ...BLK_RIGHT] },
  { ...NIGHT, shift: 0.1, siren: -1, blocks: [...BLK_LEFT, ...BLK_MID, ...BLK_RIGHT] },
  { room: 1, hy: 0.66, dawn: 0, shift: 0, map: [0.24, 0.55, 0.08, 0.82], board: [0.70, 0.857, 0.08, 0.88], op: [0.12, 0.96, 0.46], blocks: [] },
  { ...NIGHT, shift: 0.3, tower: TW(0.74, 0.08), board: [0.86, 0.97, 0.16, 0.72], fake: [0.64, 0.74], blocks: [...BLK_LEFT, ...BLK_MID] },
  { room: 1, hy: 0.66, dawn: 0, shift: 0, board: [0.50, 0.68, 0.04, 0.96], op: [0.26, 0.97, 0.70], blocks: [] },
  { ...NIGHT, shift: 0.4, lock: 5, tower: TW(0.76, 0.12), board: [0.86, 0.97, 0.16, 0.72], fake: [0.68, 0.8], blocks: [...BLK_LEFT, ...BLK_MID] },
  { ...NIGHT, shift: 0.5, lock: 9, fake: [0.74, 0.62], blocks: [...BLK_LEFT, ...BLK_MID, ...BLK_RIGHT] },
  { ...NIGHT, shift: 0.5, lock: 9, fake: [0.74, 0.62], blocks: [...BLK_LEFT, ...BLK_MID, ...BLK_RIGHT] },
  { ...NIGHT, shift: 0.6, lock: 7, fake: [0.78, 0.66], blocks: [...BLK_LEFT, ...BLK_MID, ...BLK_RIGHT] },
  { hy: 0.66, dawn: 1 / 3, shift: 0.7, blocks: [...BLK_LEFT, ...BLK_MID, ...BLK_RIGHT] },
  { hy: 0.66, dawn: 2 / 3, shift: 0.7, blocks: [...BLK_LEFT, ...BLK_MID, ...BLK_RIGHT] },
  { hy: 0.66, dawn: 1, shift: 0.7, blocks: [...BLK_LEFT, ...BLK_MID, ...BLK_RIGHT] },
  { hy: 0.66, dawn: 1, shift: 0.8, board: [0.9, 0.97, 0.3, 0.64], blocks: [...BLK_LEFT, ...BLK_MID] },
  { hy: 0.66, dawn: 1, shift: 0.8, blocks: [...BLK_LEFT, ...BLK_MID, ...BLK_RIGHT] },
];
