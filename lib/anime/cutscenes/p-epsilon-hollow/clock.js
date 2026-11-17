// The live clock: real seconds at pace 1:1, 30.0 s long, 12 fps. Windows are the live smoothsteps of spawn-seal.jsx and slime.js.
export const F = (f) => f / 24;
export const G = (g) => g / 12;
export const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const bump = (x, c, w) => Math.max(0, 1 - Math.abs(x - c) / w);

export const T = {
  sign: [0.3, 0.9, 3.0, 3.6],
  portal: [1.0, 1.6, 3.0, 3.8],
  sage1: [1.3, 1.8, 5.6, 6.0],
  hollow: [1.4, 2.4, 9.0, 9.8],
  veldora: [2.0, 3.0],
  vortex: [8.8, 9.3, 10.1, 10.9],
  rimuru: [9.3, 10.1, 13.5, 13.8],
  spin: [9.3, 10.2],
  war: [9.2, 10.4],
  rain: [10.3, 11.8],
  wind: [12.6, 13.1],
  strike: [13.05, 13.4],
  fist: [13.0, 13.45, 13.5, 13.8],
  maw: [13.6, 14.3, 14.5, 14.9],
  eat: [13.6, 14.8],
  gone: [13.8, 14.6],
  pull: [13.7, 14.6],
  back: [14.4, 14.8],
  sage2: [14.4, 14.9, 18.0, 18.5],
  push: [26.9, 27.7],
  reform: 14.6,
  shown: 15.3,
  end: 30.0,
};

export const HIT = { plop: F(24), turn: F(223), wind: F(302), strike: F(313), punch: F(324), back: F(348) };

export const LINE = {
  A: 3.4,
  AEnd: 8.25,
  B: 8.6,
  C: 13.8,
  CEnd: 22.6,
  credit: 22.6,
  creditEnd: 26.8,
  plop: [1.0, 1.5],
  impact: 1.0,
  collapse: [26.8, 29.3],
};

export const AT = {
  veldora: [3.1, 2.4, -1.5],
  hollow: [-3.0, 2.4, 0.2],
  maw: [0, 3.6, -9],
  plaqueEye: [1.6, 1.15, 2.9],
  plaque: [1.65, 1.15, 0.05],
  statue: [3.2, 0.85, -3.2],
};

export const SEAL = { pupScale: 1, rimuruScale: 1.7, yaw: 0 };
