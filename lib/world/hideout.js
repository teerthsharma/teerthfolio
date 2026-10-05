// THE AKATSUKI HIDEOUT (place p-epsilon-hollow, issue 10 W3): a rock hill on the south-east rim with a carved
// mouth in its south flank and a HALL inside it the seal walks into. The hill is one heightfield bump
// (lib/world/terrain.js); the hall, the corridor to the mouth, the notch before the face and the terrace are cut out
// of it to the plain (y = 0), so they are walkable; everywhere else the hill rises, and hideoutBlocked() holds the
// seal off it (lib/world/motion.js slides it along the wall). South of the hall the flank is cut back to a slope the
// follow camera (34 degrees, from +z) sees over, so the hall reads from the island camera; the vault over the hall's
// back half is a mesh (components/world/buildings/Hideout.jsx). Pure, allocation-free.

export const HIDEOUT = {
  hill: { x: 48, z: 58, h: 14, r: 11 }, // the peak behind the terrace (-z)
  terrace: { x: 48, z: 68, r: 3.2 }, // the place: a flat stone terrace cut into the hill's south foot
  mouth: { x: 44, z: 66 }, // the gate's face, on the terrace's west corner; it faces +z (south)
  door: 1.55, // half-width of the doorway and the corridor behind it (m)
  hall: { x: 44.5, z: 59.2, r: 5.2 }, // the hall inside the hill: flat, round
  face: { half: 4.3, back: 1.45, front: 0.5 }, // the dressed face's footprint about the mouth (z from mouth - back to mouth + front)
  rock: "#3a3228",
  edge: "#9e928d",
};

// The ten finger pedestals of the statue: an arc round the hall's back (north) half, [x, z, height].
export const PEDESTALS = Array.from({ length: 10 }, (_, i) => {
  const a = Math.PI * (1.12 + (0.76 * i) / 9); // west-north-west round to east-north-east
  const r = HIDEOUT.hall.r - 1.15;
  return [HIDEOUT.hall.x + Math.cos(a) * r, HIDEOUT.hall.z + Math.sin(a) * r, 1.9 + 0.5 * Math.sin((i / 9) * Math.PI)];
});
export const PEDESTAL_R = 0.45;

const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// The hill's height at (x, z), or -Infinity off its footprint. A steep-skirted dome (h (1 - t^2.2)), cut as above.
export function hideoutHeight(x, z, ridge) {
  const { hill, terrace, mouth, door, hall, face } = HIDEOUT;
  const t = Math.hypot(x - hill.x, z - hill.z) / hill.r;
  if (t >= 1) return -Infinity;
  let h = hill.h * (1 - Math.pow(t, 2.2));
  if (ridge) h += 1.6 * (ridge(x / 4.5, z / 4.5) - 0.45) * smooth(0.98, 0.6, t);
  // the camera side: south of the hall, within its width, the flank falls to a slope the follow camera sees over
  const band = smooth(hall.r + 2.5, hall.r + 0.5, Math.abs(x - hall.x));
  const cap = 0.6 * Math.max(0, z - hall.z) + 40 * (1 - band);
  if (h > cap) h = cap;
  // the cuts, to the plain
  const inHall = smooth(hall.r + 0.9, hall.r, Math.hypot(x - hall.x, z - hall.z));
  const inCorridor = smooth(door + 0.8, door, Math.abs(x - mouth.x)) * smooth(hall.z - 0.5, hall.z, z);
  const inNotch = smooth(face.half + 1.0, face.half + 0.2, Math.abs(x - mouth.x)) * smooth(mouth.z - 2.2, mouth.z - 1.4, z);
  const inTerrace = smooth(terrace.r + 1.2, terrace.r, Math.hypot(x - terrace.x, z - terrace.z));
  return h * (1 - Math.max(inHall, inCorridor, inNotch, inTerrace));
}

// Can the seal NOT stand at (x, z)? The hill where it rises, the dressed face beside the door, the pedestals.
export function hideoutBlocked(x, z) {
  const { hill, mouth, door, face } = HIDEOUT;
  if (Math.hypot(x - hill.x, z - hill.z) >= hill.r) return false;
  const u = Math.abs(x - mouth.x);
  if (z > mouth.z - face.back && z < mouth.z + face.front && u > door - 0.25 && u < face.half) return true;
  for (const [px, pz] of PEDESTALS) if (Math.hypot(x - px, z - pz) < PEDESTAL_R + 0.3) return true;
  return hideoutHeight(x, z) > 0.3;
}

export const HIDEOUT_WORLD = { blocked: hideoutBlocked };
