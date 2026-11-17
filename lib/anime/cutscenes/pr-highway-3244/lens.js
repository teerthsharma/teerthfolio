// LENS: the live camera per window, measured by livecam.mjs from 1678 samples (rig frame: the dock at the origin, the pup facing +z; metres).
export const FOV = 52;
export const FOVS = { island: 28.727, two: 38.14, wide: 43.112, settle: 52, cry: 52, race: 52, flag: 52, back: 52, credit: 52, home: 28 };
export const LENS = {
  island: [[-11.646, 14.577, 16.856], [0.498, -0.478, -0.723]],
  two: [[-9.181, 3.097, 13.39], [0.553, -0.231, -0.801]],
  wide: [[-0.179, 0.496, 7.681], [0.461, -0.137, -0.877]],
  settle: [[4.359, 1.198, 4.629], [-0.451, 0.104, -0.886]],
  cry: [[3.743, 1.183, 2.898], [-0.445, 0.13, -0.886]],
  race: [[-5.559, 2.521, -4.543], [0.943, 0.057, 0.327]],
  flag: [[4.554, 0.945, 6.218], [-0.451, 0.104, -0.886]],
  back: [[-2.43, 1.288, 7.449], [0.308, 0.061, -0.949]],
  credit: [[-2.446, 1.311, 7.263], [0.308, 0.061, -0.949]],
  home: [[-14.403, 20.334, 20.893], [0.492, -0.498, -0.714]],
};
export const RIG_NOTE = "eye and forward in the rig frame: the dock at the origin, the pup facing +z";
export const HOLD = { eye: [2.12, 4.35, -0.08], aim: [2.89, 4.37, -1.19], fov: 34, menace: { frac: 0.6, dark: 0.4, calm: 0.25 } };
export const FIST = { dist: 3.2, up: 0.35, fov: 40 };
