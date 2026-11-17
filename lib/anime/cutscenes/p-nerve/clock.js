// The p-nerve clock (live: moves/p-nerve/timeline.js): the scene clock, its pacing warp, the beats, the dock, the card's wide and the measured lens.
export const T = {
  banner: [0.35, 2.15, 2.5],
  rain: 1.3,
  reach: [1.9, 2.8],
  take: 3.25,
  realm: [3.0, 4.6],
  write: [3.7, 4.1, 4.5, 4.9],
  drop: [4.05, 4.45, 4.85, 5.25],
  ryuk: 5.4,
  grains: 5.6,
  toll: [7.0, 8.1, 9.2],
  survive: 9.95,
  core: 10.4,
  bag: [10.9, 11.6],
  page: [11.7, 12.3],
  screens: 12.5,
  crack: [12.9, 13.6],
  crunch: 13.6,
  reveal: 13.8,
};

export const KNOTS = [[0, 0], [1.6, 1.6], [11.7, 17.55], [13.6, 24.4]];
export const unwarp = (r) => {
  if (r >= KNOTS[3][1]) return KNOTS[3][0] + (r - KNOTS[3][1]);
  for (let i = 1; i < 4; i++) {
    if (r <= KNOTS[i][1]) {
      const [s0, r0] = KNOTS[i - 1];
      const [s1, r1] = KNOTS[i];
      return s0 + ((r - r0) / (r1 - r0)) * (s1 - s0);
    }
  }
  return r;
};
export const warp = (t) => {
  if (t >= KNOTS[3][0]) return KNOTS[3][1] + (t - KNOTS[3][0]);
  for (let i = 1; i < 4; i++) {
    if (t <= KNOTS[i][0]) {
      const [s0, r0] = KNOTS[i - 1];
      const [s1, r1] = KNOTS[i];
      return r0 + ((t - s0) / (s1 - s0)) * (r1 - r0);
    }
  }
  return t;
};
export const snap = (x) => Math.round(x * 24) / 24;

export const REAL = {
  reach: T.reach.map(warp),
  take: warp(T.take),
  realm: T.realm.map(warp),
  write: T.write.map(warp),
  drop: T.drop.map(warp),
  ryuk: warp(T.ryuk),
  grains: warp(T.grains),
  toll: T.toll.map(warp),
  survive: warp(T.survive),
  core: warp(T.core),
  bag: T.bag.map(warp),
  page: T.page.map(warp),
  screens: warp(T.screens),
  crack: T.crack.map(warp),
  crunch: warp(T.crunch),
  reveal: warp(T.reveal),
};

// The live card clock (.oneshot/p-nerve/AREA.md), real seconds; LINE reads it, impact, ring and cut stay on the 12 grid.
export const AREA = { duration: 31, sign: [0.45, 1.05], impact: 1.15, bloom: [1.15, 1.6], enter: 1.95, lineA: 4.2, move: [11.3, 11.9], lineB: 11.9, lineC: 17.6, credit: 26, collapse: [30.2, 30.6] };
export const LINE = { impact: 28 / 24, ring: [28 / 24, 31 / 24], cut: 29 / 24, bloom: AREA.bloom, enter: AREA.enter, sign: AREA.sign, A: AREA.lineA, B: AREA.lineB, C: AREA.lineC, credit: AREA.credit, collapse: AREA.collapse, duration: AREA.duration };
export const BACK = snap(REAL.crunch);
export const SKY_R = 140;
export const CORE_Y = 0.9;
export const BOOST = typeof location === "undefined" || !/[?&]boost=0\b/.test(location.search);

export const DOCK = [31.5, 0, 9.6]; // dockPoint(PLACE_BY_ID["p-nerve"]): x 31.5, z 3 + radius 5 + 1.6
export const SEAL = { yaw: 0.6, scale: 1.6 };

export const VIEW = { eye: [0, 0.7, 10.4], aim: [0.7, 0.8, -1.0], fov: 44 };
export const WIDE = (k) => ({ eye: [0, 0.9 - 0.2 * k, 10.4 * k], aim: VIEW.aim, fov: VIEW.fov });

// LENS: the live camera (eye, forward) per window, rig frame (seal at DOCK), from tools/livecam.mjs run 2; run 1 agrees to 0.001 m on b to isl.
// a is a moving pull (fov 55 to 42 over 0 to 4 s); the lens cuts between 12.0 and 12.5 s, so c is the lens after the cut; FOV is the held lens.
export const FOV = 42;
export const LENS = {
  a: [[-1.169, 1.477, 7.099], [0.1488, -0.0797, -0.9857]],
  b: [[-1.974, 0.4, 9.05], [0.2569, 0.0384, -0.9657]],
  c: [[2.848, 0.9, 9.176], [-0.2065, -0.0096, -0.9784]],
  hold: [[2.849, 0.438, 9.18], [-0.2065, -0.0096, -0.9784]],
  d: [[2.849, 0.437, 9.18], [-0.2065, -0.0096, -0.9784]],
  isl: [[2.848, 0.9, 9.176], [-0.2065, -0.0096, -0.9784]],
};

export const LIVE_WIDE = (k) => ({ eye: [2.849 * k, 0.44, 9.18 * k], aim: [2.849 * k - 2.065, 0.344, 9.18 * k - 9.784], fov: FOV });
export const ISL = { eye: [2.848, 0.9, 9.176], aim: [0.783, 0.804, -0.608], fov: FOV };
export const HOLD_END = 459 / 24;
export const RED_FLASH = [[24.9, 0], [25.2, 0.06], [25.5, 0.27], [25.78, 0.95], [26.02, 0.54], [26.3, 0]]; // live gif pages 25 to 35 (LIVE.md 12.4)
export const TOLL_F = [243, 285, 326]; // the live tolls at 24 fps (REAL.toll 10.13, 11.87, 13.60), snapped
export const AMP = { toll: [0.024, 0.032, 0.04], crunch: 0.04, back: 0.012, rumble: [0.004, 0.014] };
export const SEAL_FRAC = { wide: [0.24, 0.36], close: 0.5, hold: 0.7 };
// the page-up hold is the live tableau's lens (f02, 18.6 s), not a chest-up close-up: the camera is the live cutscene's law
export const HOLD = { f: [421, 459], eye: LIVE_WIDE(1).eye, aim: LIVE_WIDE(1).aim, fov: LIVE_WIDE(1).fov };
