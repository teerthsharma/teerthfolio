// The DIO seal's static channel sets for this cutscene's track (a `set` held over a span). They are the look's own `dio-stop` and `dio-brood` at
// full strength, with the look's helpers copied in (the look does not export them); the time-dependent poses stay named poses of the look.
const D2 = Math.PI / 180;
const arm = (sx, sz, elbow, sy = 0) => ({ sx, sz, elbow, sy });
const wr = (rx, ry, rz) => ({ rx, ry, rz });

export const P = {
  // the stop: right flipper out, palm forward beside the face, the other hand on the hip, head tilted
  stop: { rz: -4 * D2, rx: -2 * D2, head: { rx: 0.04, rz: 0.05 }, armR: arm(1.6, 0.05, 0.3, -0.9), wristR: wr(-0.6, 0.1, 0.8), handR: "flat", armL: arm(0.6, 0.55, 1.5, -0.7), wristL: wr(0.4, 0.9, -0.2) },
  // head down, shoulders rolled forward, flippers hanging: the brow takes the light
  brood: { y: -0.02, sy: 0.95, sxz: 1.04, rx: 11 * D2, head: { rx: 0.3 }, armR: arm(0.5, 0.55, 0.9, -0.5), wristR: wr(0.3, 0.8, 0), armL: arm(0.5, 0.55, 0.9, -0.5), wristL: wr(0.3, 0.8, 0) },
};
