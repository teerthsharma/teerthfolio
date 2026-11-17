// LENS: the live camera per shot, measured by livecam.mjs from 1266 samples: [eye, forward] in the rig frame (seal at the origin facing +z, metres).
export const LENS = {
  island: [[-9.642, 4.045, 9.363], [0.575, -0.125, -0.808]],
  bloom: [[-9.782, 4.144, 9.484], [0.575, -0.125, -0.808]],
  a: [[7.306, 4.159, 12.141], [-0.315, -0.15, -0.937]],
  b: [[7.29, 4.683, 12.09], [-0.315, -0.15, -0.937]],
  c: [[7.289, 4.493, 12.088], [-0.315, -0.15, -0.937]],
  spent: [[4.565, 1.957, 7.631], [-0.315, -0.15, -0.937]],
  credit: [[0, 16.756, 21.135], [0, -0.372, -0.928]],
  home: [[0, 16.756, 21.135], [0, -0.372, -0.928]],
};
export const FOV = 48;
// STAND: the character and the pale seal stand 1.6 m toward the lens (+z), so they fill more of the frame.
// The gods and the arena stay where the live put them; LENS and FOV are the live camera as sampled.
// The seal is the origin of every eye above, so STAND moves only the figures.
export const STAND = [0, 0, 1.6];
