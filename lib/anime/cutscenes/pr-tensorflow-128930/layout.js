// LAYOUT for pr-tensorflow-128930: per shot, where the set stands in the image band (u right, v down, rects [u0, u1, v0, v1]).
// Shots in order: 0 wade, 1 rise, 2 board, 3 fake, 4 lock, 5 breath, 6 snap, 7 burn, 8-10 dawn dissolve, 11 turn away.
const TW = (u0, v0) => [u0, 1.04, v0, 0.9]; // the tower face reaches past the right edge
const NIGHT = { hy: 0.66, dawn: 0 };
const BLK_LEFT = [[-0.02, 0.15, 0.42, 0.7, 3], [0.13, 0.26, 0.5, 0.68, 7], [0.24, 0.33, 0.56, 0.67, 11]];
const BLK_MID = [[0.4, 0.5, 0.56, 0.66, 5], [0.5, 0.63, 0.5, 0.65, 9], [0.62, 0.72, 0.58, 0.66, 13]];
const BLK_RIGHT = [[0.76, 0.9, 0.46, 0.66, 17], [0.88, 1.02, 0.5, 0.66, 21]];

export const SHOTS = [
  { ...NIGHT, shift: 0, blocks: [...BLK_LEFT, ...BLK_MID, ...BLK_RIGHT] },
  { ...NIGHT, shift: 0.1, siren: -1, blocks: [...BLK_LEFT, ...BLK_MID, ...BLK_RIGHT] },
  { ...NIGHT, shift: 0.2, tower: TW(0.55, 0.1), map: [0.6, 0.84, 0.3, 0.62], board: [0.86, 0.97, 0.16, 0.72], op: [0.72, 0.84, 0.075], blocks: [...BLK_LEFT, [0.4, 0.5, 0.58, 0.68, 5]] },
  { ...NIGHT, shift: 0.3, tower: TW(0.74, 0.08), board: [0.86, 0.97, 0.16, 0.72], op: [0.8, 0.86, 0.07], fake: [0.64, 0.74], blocks: [...BLK_LEFT, ...BLK_MID] },
  { ...NIGHT, shift: 0.4, lock: 5, tower: TW(0.76, 0.12), board: [0.86, 0.97, 0.16, 0.72], fake: [0.68, 0.68], blocks: [...BLK_LEFT, ...BLK_MID] },
  { ...NIGHT, shift: 0.5, lock: 9, fake: [0.74, 0.62], blocks: [...BLK_LEFT, ...BLK_MID, ...BLK_RIGHT] },
  { ...NIGHT, shift: 0.5, lock: 9, fake: [0.74, 0.62], blocks: [...BLK_LEFT, ...BLK_MID, ...BLK_RIGHT] },
  { ...NIGHT, shift: 0.6, lock: 7, fake: [0.78, 0.66], blocks: [...BLK_LEFT, ...BLK_MID, ...BLK_RIGHT] },
  { hy: 0.66, dawn: 1 / 3, shift: 0.7, blocks: [...BLK_LEFT, ...BLK_MID, ...BLK_RIGHT] },
  { hy: 0.66, dawn: 2 / 3, shift: 0.7, blocks: [...BLK_LEFT, ...BLK_MID, ...BLK_RIGHT] },
  { hy: 0.66, dawn: 1, shift: 0.7, blocks: [...BLK_LEFT, ...BLK_MID, ...BLK_RIGHT] },
  { hy: 0.66, dawn: 1, shift: 0.8, tower: TW(0.82, 0.3), board: [0.9, 0.97, 0.3, 0.64], blocks: [...BLK_LEFT, ...BLK_MID] },
];
