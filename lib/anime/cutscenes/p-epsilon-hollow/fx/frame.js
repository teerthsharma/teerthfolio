// The seal's frame, read live from the handle (never from the mesh): world = at + R_y(yaw) * (local * scale).
//   x' = x cos(yaw) + z sin(yaw);  z' = -x sin(yaw) + z cos(yaw)    (three's rotateY)
// Seal-local axes: x right, y up, z forward. The seal is 0.8 m tall at scale 1, chest at y = 0.4.
export function toWorld(seal, x, y, z, out) {
  const s = seal.scale, c = Math.cos(seal.yaw), n = Math.sin(seal.yaw);
  return out.set(seal.at[0] + (x * c + z * n) * s, seal.at[1] + y * s, seal.at[2] + (-x * n + z * c) * s);
}
export const dirToWorld = (seal, x, y, z, out) => out.set(x * Math.cos(seal.yaw) + z * Math.sin(seal.yaw), y, -x * Math.sin(seal.yaw) + z * Math.cos(seal.yaw));

// Where the drawn shard is, as a pure function of the clock (bible 3.8): buried at the sleeper, rising 1.0 m/s over 6.4-9.0,
// then held overhead (seal-local base (0, 0.85, 0.15), axis up) until the swing.
//   swing: anticipation 3 frames (26.8 -> 26.925): theta 0 -> -0.35 rad; smear 2 frames; strike 4 frames (27.008 -> 27.175): -> 1.75; hold.
//   theta is measured from straight up toward the seal's forward (+z): axis = (0, cos theta, sin theta).
const ease = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
export function swingTheta(t) {
  const a = 26.8, b = 26.925, c = 27.008, d = 27.175;
  if (t < a) return 0;
  if (t < b) return -0.35 * ease((t - a) / (b - a));
  if (t < c) return -0.35;
  if (t < d) return -0.35 + 2.1 * (1 - Math.pow(1 - (t - c) / (d - c), 3));
  return 1.75;
}
