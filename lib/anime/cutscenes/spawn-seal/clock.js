// spawn-seal's clock: real seconds on the engine clock; hits on the 24 grid (F), seal-moving cuts on the 12 grid (G). LENS is livecam.json.
export const F = (f) => f / 24, G = (g) => g / 12;
export const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
export const bump = (x, c, w) => Math.max(0, 1 - Math.abs(x - c) / w);
export const TURN_T = G(112), BACK = F(348), BREAK = F(324), IMPACT = 1.0;
export const LINE = { A: 3.4, B: 8.6, C: 13.8, credit: 22.6, collapse: [26.8, 29.3], notice1: [1.3, 6.0], notice2: [14.4, 18.5] };
export const HIT = { turn: TURN_T, punch: BREAK, devour: BACK };
export const SEAL = { scale: 1.6, yaw: 0.6 };
export const SEAL_AT = [3.1, 2.4, -1.5], MAW_AT = [0, 3.6, -9], HOLLOW_AT = [-3.0, 2.4, 0.2];
export const DOCK = [27, 0, 51.6];
export const FOV = 60;
export const LENS = {
  cave: [[3.354, 0.937, 5.8634], [-0.5735, 0.0273, -0.8188]],
  lineA: [[-1.9613, 0.95, 1.7105], [0.7502, 0.0956, -0.6543]],
  vortex: [[6.0106, 1.2, 10.5098], [-0.5735, 0.0273, -0.8188]],
  rimuru: [[3.4235, -0.1168, 5.9661], [-0.5735, 0.0273, -0.8188]],
  crack: [[3.3696, -0.1312, 5.8923], [-0.5735, 0.0273, -0.8188]],
  island2: [[3.3338, 0.4823, 5.8331], [-0.5735, 0.0273, -0.8188]],
  credit: [[0.8676, 16.7976, 12.0701], [0.794, 0, -0.6079]],
  statue: [[-15.5673, 16.7976, 12.0701], [0.6854, -0.4979, -0.5314]],
};

export function env(t) {
  const pool = smooth(1, 1.6, t) * (1 - smooth(3, 3.8, t)), gone = smooth(13.8, 14.6, t);
  return {
    pool, portal: pool, hollow: smooth(1.4, 2.4, t) * (1 - smooth(9, 9.8, t)), vel: smooth(2, 3, t), pull: smooth(13.7, 14.6, t),
    vortex: smooth(8.8, 9.3, t) * (1 - smooth(10.1, 10.9, t)), war: smooth(9.2, 10.4, t), cave: 1 - gone, eat: smooth(13.6, 14.8, t), gone,
    back: smooth(14.4, 14.8, t), fist: smooth(13, 13.45, t) * (1 - smooth(13.5, 13.8, t)),
    maw: smooth(13.6, 14.3, t) * (1 - smooth(14.5, 14.9, t)), sage1: smooth(1.3, 1.8, t) * (1 - smooth(5.6, 6, t)),
    sage2: smooth(14.4, 14.9, t) * (1 - smooth(18, 18.5, t)),
  };
}
