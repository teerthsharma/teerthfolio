// PARTS for the p-epsilon-hollow look (Rimuru): the coat, lining, trim, hair and eye colours of the live capture, and the channel
// sets the track's `set` puts on the hero (the wind-up, the strike, the hold). Poses are plain overrides; no geometry here.
export const INK = "#120820";

export const COLOR = {
  coat: "#07060d", coatShade: "#030208", lining: "#142070", trim: "#2438c0",
  hair: "#0d0b1a", hairShade: "#05040c", hairHi: "#2438c0",
  skin: "#f2e6de", eye: "#f2b01a", eye2: "#ffe48a",
};

const arm = (sx, sz, elbow, sy = 0) => ({ sx, sz, elbow, sy });
const wr = (rx, ry, rz) => ({ rx, ry, rz });

export const POSES = {
  stand: { rx: -0.02, head: { rx: 0.03 }, armR: arm(0.12, 0.18, 0.2, 0), armL: arm(0.12, 0.18, 0.2, 0), handR: "open", handL: "open" },
  wind: { rx: -0.1, ry: 0.28, head: { ry: -0.12 }, armR: arm(-0.45, 0.45, 1.0, 0), wristR: wr(0.3, 0, 0), handR: "fist", armL: arm(0.35, 0.3, 0.3, 0), handL: "open" },
  strike: { rx: 0.15, ry: -0.22, z: 0.06, head: { rx: 0.04, ry: 0.08 }, armR: arm(1.45, 0.05, 0.15, 0), wristR: wr(0, 0, 0), handR: "fist", armL: arm(0.1, 0.35, 0.3, 0) },
  hold: { rx: 0.02, head: { rx: -0.05 }, armR: arm(0.1, 0.22, 0.2, 0), armL: arm(0.1, 0.22, 0.2, 0) },
};
