// THE AKATSUKI HIDEOUT (place p-epsilon-hollow, issue 10 W3): a rock hill on the south-east rim with a carved
// mouth in its south flank. One heightfield bump (lib/world/terrain.js), one collider (lib/world/land.js) and the
// dressed gate (components/world/buildings/Hideout.jsx) all read these numbers. Pure, allocation-free.

export const HIDEOUT = {
  hill: { x: 48, z: 58, h: 14, r: 11 }, // the peak behind the terrace (-z)
  terrace: { x: 48, z: 68, r: 3.2 }, // the place: a flat stone terrace cut into the hill's south foot
  mouth: { x: 44, z: 66 }, // the gate's face, on the terrace's west corner
  yaw: Math.atan2(48 - 44, 72.6 - 66), // the mouth looks at the dock [48, 72.6]
  notch: { half: 3.6, back: 0.3 }, // the cut the gate stands in: half-width, how far behind the face it reaches (m)
  rock: "#3a3228",
  edge: "#9e928d",
};

const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// The hill's height at (x, z), or -Infinity off its footprint. A steep-skirted dome (h (1 - t^2.2)), so the
// mouth's face stands ~5 m tall; the notch cuts the ground in front of the gate back to the plain.
export function hideoutHeight(x, z, ridge) {
  const { hill, terrace, mouth, yaw, notch } = HIDEOUT;
  const t = Math.hypot(x - hill.x, z - hill.z) / hill.r;
  if (t >= 1) return -Infinity;
  let h = hill.h * (1 - Math.pow(t, 2.2));
  if (ridge) h += 1.6 * (ridge(x / 4.5, z / 4.5) - 0.45) * smooth(0.98, 0.6, t);
  // the notch, in the mouth's frame: u across, v out toward the dock
  const dx = x - mouth.x;
  const dz = z - mouth.z;
  const u = dx * Math.cos(yaw) - dz * Math.sin(yaw);
  const v = dx * Math.sin(yaw) + dz * Math.cos(yaw);
  const cut = smooth(notch.half + 0.8, notch.half, Math.abs(u)) * smooth(-notch.back - 0.6, -notch.back, v);
  const flat = smooth(terrace.r + 1.2, terrace.r, Math.hypot(x - terrace.x, z - terrace.z));
  return h * (1 - Math.max(cut, flat));
}
