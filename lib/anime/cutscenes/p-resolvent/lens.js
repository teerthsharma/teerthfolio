// LENS: the live camera per shot, measured by lib/anime/tools/cuts/p-resolvent/livecam.mjs from 1855 samples of the deployed site
// (rig frame: pup at the origin facing +z, metres; fov in degrees; aim = eye + 30 m along the measured forward).
export const LENS = {
  island: { eye: [-0.017, 4.86, 12.286], aim: [-0.017, -3.624, -16.49], fov: 51.097 },
  pull: { eye: [-0.202, 3.95, 13.042], aim: [-0.202, -0.433, -16.637], fov: 55.952 },
  two: { eye: [-4.311, 0.8, 8.764], aim: [9.525, 1.736, -17.837], fov: 46 },
  two2: { eye: [-2.825, 0.456, 6.52], aim: [11.272, 2.37, -19.892], fov: 46 },
  push: { eye: [10.612, 1.3, 6.503], aim: [-10.493, 1.066, -14.815], fov: 46 },
  kneel: { eye: [10.612, 1.282, 6.503], aim: [-10.493, 1.048, -14.815], fov: 46 },
  cracks: { eye: [10.614, 1.027, 6.505], aim: [-10.491, 0.793, -14.813], fov: 46 },
  home: { eye: [10.613, 1.064, 6.505], aim: [-10.492, 0.83, -14.813], fov: 46 },
  credit: { eye: [10.612, 1.3, 6.503], aim: [-10.493, 1.066, -14.815], fov: 46 },
  end: { eye: [2.505, 11.87, 15.539], aim: [-0.552, -1.696, -11.041], fov: 32.75 },
};
export const FOV = 46;
