// THE RACE, analytically (nothing is simulated, nothing allocates): the beats,
// the guest's path down the straight, the rivals' paths, and the sums the
// scene reads each frame. The camera stands still; the world is a treadmill
// (the track's group slides under the lens by the distance the guest covers),
// so the guest stays in shot and the pack streams past it.
// Frame: the track's own, x along the straight (the cars head -x), z toward the lens.

export const FINISH = -89; // x of the chequered line (land.js FINISH_X, kept in step by the move)
export const START = [-1, -1.0]; // the guest's grid slot (x, z)
export const LANES = [-1.0, -4.6, -8.2, -11.8];

// seconds from the arrival
export const T = {
  hop: [1.6, 2.1], // the pup jumps onto the roof the moment the car arrives, so it sits there for the first line
  go: 3.55, // the lights go: the guest launches
  kachow: 4.95, // it passes the last rival
  cross: 6.0, // the nose crosses the chequered line
  cover: [6.3, 6.42], // the flag sweeps across the lens: the full cover lasts 0.25 s
  swap: 6.43, // behind the cloth the speedway becomes the island
  turn: [6.42, 6.9], // the page turns
  stop: 7.55, // the guest rolls to rest beside where the pup stood
  off: 8.1, // unused: the pup leaves at the card's collapse
  leave: 13.0, // the guest stays until the collapse
};

const clamp = (x) => Math.min(1, Math.max(0, x));
export const sm = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// distance covered since `go` for a car with top speed V that takes `ramp` s to reach it
export function dist(V, ramp, tau) {
  if (tau <= 0) return 0;
  if (tau < ramp) {
    const r = tau / ramp;
    return V * ramp * (r * r * r - (r * r * r * r) / 2);
  }
  return V * ramp * 0.5 + V * (tau - ramp);
}
export const speed = (V, ramp, tau) => {
  if (tau <= 0) return 0;
  const r = Math.min(1, tau / ramp);
  return V * (3 * r * r - 2 * r * r * r);
};

export const HERO_V = 44;
export const HERO_RAMP = 0.9;
export const heroDist = (t) => dist(HERO_V, HERO_RAMP, t - T.go);
export const heroSpeed = (t) => speed(HERO_V, HERO_RAMP, t - T.go);

// the guest's lateral line: wide round the lane-0 car, through the gap, out across, home to the line
const Z_WAY = [[3.55, -1.0], [4.05, -1.0], [4.42, 1.0], [4.85, -2.7], [5.3, -4.2], [5.75, -2.2], [6.1, -1.4]];
export function heroZ(t) {
  if (t <= Z_WAY[0][0]) return Z_WAY[0][1];
  for (let i = 1; i < Z_WAY.length; i++) {
    const [t1, z1] = Z_WAY[i];
    if (t <= t1) {
      const [t0, z0] = Z_WAY[i - 1];
      const k = (t - t0) / (t1 - t0);
      return z0 + (z1 - z0) * (k * k * (3 - 2 * k));
    }
  }
  return Z_WAY[Z_WAY.length - 1][1];
}

// the rivals: [dx from the guest's slot, lane, top speed]
export const RIVALS = [
  [-9, 0, 27], [9, 0, 26],
  [-15, 1, 28], [-6, 1, 27], [3, 1, 26], [12, 1, 28],
  [-12, 2, 27], [-3, 2, 28], [6, 2, 26], [15, 2, 27],
  [0, 3, 27], [9, 3, 28],
];
export const rivalStart = (i) => 3.62 + 0.035 * (i % 5);
export function rivalX(i, t) {
  const [dx, , V] = RIVALS[i];
  return START[0] + dx - dist(V, 1.0, t - rivalStart(i));
}
export const rivalZ = (i, t) => LANES[RIVALS[i][1]] + 0.18 * Math.sin(t * 2.3 + i * 1.7) * (t > T.go ? 1 : 0.3);
// when the guest comes level with a rival (for its swerve); computed once
export const PASS = RIVALS.map(([dx, , V], i) => {
  if (dx >= 0) return -1;
  for (let t = T.go; t < T.cross + 1; t += 0.01) if (START[0] - heroDist(t) <= START[0] + dx - dist(V, 1.0, t - rivalStart(i))) return t;
  return -1;
});
