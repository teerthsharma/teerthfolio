// The landscape's own bulk, for collision. The eleven upstream contributions
// are the island's landforms (lib/world/river.js has the geology): each
// place in lib/world/places.js keeps one circle at the foot of its landform,
// where the seal stands to read it, and the rest of each landform is listed
// here as extra circles { x, z, radius, land } so the seal slides round
// mountains, glaciers and the keep instead of through them. Read by
// components/world/Controller.jsx and scripts/check-world.mjs (which also
// checks that no dock is buried under one).
//
// `land` names the builder that draws the bulk (components/world/land/*):
// a builder edits only its own lines, with a precise Edit, and keeps every
// circle clear of every place's dock. Circles may reach past the island's
// rim: the mountains rise out of the sea.

export const LAND_COLLIDERS = [
  // TRITON: the ice mountain on the north coast (peak far off the rim at
  // about (0, -112)); its foot meets the island at z = -74, and its central
  // glacier's snout (the icefall, the river's ice cave) at z = -72.
  { x: 0, z: -92, radius: 18, land: "triton" },
  { x: -18, z: -90, radius: 14, land: "triton" },
  { x: 20, z: -90, radius: 14, land: "triton" },
  { x: -6, z: -80, radius: 6, land: "triton" },
  { x: 14, z: -77, radius: 5, land: "triton" },
  { x: 4, z: -79, radius: 5, land: "triton" },

  // OWNER'S REQUIREMENT (for the MujoRush builder): each of the three carved
  // seal faces wears its merged PR number on its NECK, like a collar band or
  // a plaque cut into the granite: "#3396" (google-deepmind/mujoco),
  // "#1541" (google-deepmind/mujoco_warp) and "#3450" (google-deepmind/mujoco),
  // each under the face whose ledge plays that contribution, big and readable
  // from the follow camera. That is the joke: MujoRush.
  // MOUNT MUJORUSH: the granite massif north-west of the valley. Its carved
  // south cliff runs along z = -55 from x = -54 to -16.
  { x: -48, z: -66, radius: 11, land: "mujorush" },
  { x: -35, z: -67, radius: 12, land: "mujorush" },
  { x: -22, z: -66, radius: 11, land: "mujorush" },
  { x: -60, z: -58, radius: 8, land: "mujorush" },

  // THE GOOGLE RANGE east of the valley: Highway Pass's two peaks (the pass
  // is the 6 m gap between them, at x = 38, its saddle at z = -72 and its
  // mouth opening south onto the reading point at z = -63), then XNNPACK's
  // mountain straight behind its reading point (the cave at its foot, the
  // leading gap, faces the dock) and its eastern shoulder down to the sea.
  { x: 27, z: -74, radius: 8, land: "google-range" },
  { x: 49, z: -74, radius: 8, land: "google-range" },
  { x: 60, z: -62, radius: 8, land: "google-range" },
  { x: 72, z: -58, radius: 9, land: "google-range" },

  // THE TENSORFLOW ICE DAM: Triton's western outlet glacier down the valley's
  // west side (the river's and the lake's west bank), its elbow, and the
  // tongue across the valley (crest z = -34 from x = -12 to 4, the lake
  // against its north face, the dam front at z = -29.5). The tongue's tip
  // stops at x = 5.5 on purpose: east of it a dry granite bench runs up to
  // the spill, and that is the way north (a click-to-move line from spawn
  // to Triton passes just east of the tip).
  { x: -13, z: -70, radius: 5, land: "dam" },
  { x: -13, z: -62, radius: 5, land: "dam" },
  { x: -13, z: -54, radius: 5, land: "dam" },
  { x: -13, z: -46, radius: 5, land: "dam" },
  { x: -12, z: -38, radius: 5, land: "dam" },
  { x: -5, z: -34, radius: 4.5, land: "dam" },
  { x: 2, z: -35, radius: 3.5, land: "dam" },

  // THE NVIDIA MOAT: the keep (a rock mesa inside the ring lake) and the two
  // ice islands afloat on the ring's south side, NeMo-Relay west, topograph
  // east, each straight behind its reading point on the south bank.
  { x: 46, z: -30, radius: 7.2, land: "moat" },
  { x: 39.75, z: -19.17, radius: 1.8, land: "moat" },
  { x: 52.25, z: -19.17, radius: 1.8, land: "moat" },
];

// THE TRAILS: packed-snow paths over the land, [x, z] waypoints through a
// Catmull-Rom curve (components/world/island/build.js draws them 2.2 m wide).
// They link spawn, the igloo, every landform's reading point and every lab
// building's dock; they cross water only on a bridge in RIVER.bridges
// (lib/world/river.js). npm run check holds every sample dry or on a deck,
// clear of every place, every landform's bulk and the name in the snow.
export const PATHS = [
  [[0, 7.2], [-10, 7], [-10.5, 0.5], [0, -2.2]], // round the name, west, to the igloo's door
  [[0, 7.2], [10, 7], [10.5, 0.5], [0, -2.2]], // and east
  // NORTH: the dry old riverbed to the dam, the bench past the ice dam's tip,
  // the Spill Bridge, and up the valley's east side to Triton's foot.
  [[10.5, 0.5], [8, -8], [6, -15], [4, -19.4]],
  [[4, -19.4], [9, -21], [10.5, -30], [12.5, -37], [13, -42], [13.5, -48], [14, -55], [14, -61.4]],
  // THE GOOGLE RANGE: east along the foot of the range to the mouth of
  // Highway Pass and on to XNNPACK's cave, then south over the Outflow Bridge.
  [[13.5, -50], [24, -53.5], [32, -56], [38, -58.9], [46, -53], [52, -48.8], [56, -45.2], [60, -43.9]],
  [[60, -43.9], [63, -38], [64, -30.75], [66.5, -24.5], [70, -20.6], [74, -20.4]],
  // WEST: the geyser, then north-west round the ice dam's glacier to the
  // three terraces of Mount MujoRush, east to west.
  [[-10.5, 0.5], [-9, -8], [-10.5, -15], [-12, -19.4]],
  [[-12, -19.4], [-17.5, -21.5], [-20.5, -32], [-22.5, -40.5], [-24, -45.2], [-29.5, -46.5], [-35, -45.4], [-40.5, -46.5], [-46, -45.4]],
  [[-17.5, -21.5], [-26, -20.5], [-36, -20], [-44, -21.4]], // west to Aether-Lang
  // EAST: past nerve to the moat's south bank (NeMo-Relay, topograph), on to
  // the pyrefly floes.
  [[10, 7], [16, 7.5], [21, 6.6], [30, 2], [40, -6.9], [46, -4.5], [52, -6.9], [60, -8], [67, -14], [71.5, -19], [74, -20.4]],
  // THE SCIENCE QUARTER, south and west of spawn.
  [[-10, 7], [-16, 4.5], [-22, 1.6], [-30, 4.5], [-40, 6.2], [-48, 6.6]], // resolvent, tangle
  [[-4, 12], [-12, 18.5], [-21, 26.5], [-28, 26.6], [-38, 29.5], [-50, 30.6]], // faraday, separatrix
  [[0, 11], [2, 24], [6, 40], [5, 50], [0, 52.6], [-6, 53.5], [-14, 55], [-22, 52.6]], // monodromy, topological-ml-toolkit
  [[4, 12], [10, 20], [13, 33], [18, 34.6], [30, 38.5], [44, 42], [54, 42.6]], // Epsilon-Hollow, caustic
  [[21, 6.6], [32, 10.5], [44, 15], [52, 16.6]], // planimeter
];

// Signposts at the forks, [x, z] beside the path, each arm pointing at the
// first reading point or building down that way; the ground draws each arm's
// tip in the area's radiation colour and names the area on it.
export const SIGNPOSTS = [
  { x: 12.8, z: -2, to: ["pr-tensorflow-124410", "pr-nemo-relay-481", "p-nerve"] },
  { x: -12.8, z: -2, to: ["pr-openxla-46539", "p-resolvent", "p-tangle"] },
  { x: 1, z: -18, to: ["pr-triton-kernels-22", "pr-xnnpack-10801"] },
  { x: 11, z: -51.5, to: ["pr-triton-kernels-22", "pr-xnnpack-10801"] },
  { x: -16.6, z: -25.5, to: ["pr-mujoco-3450", "pr-highway-3244", "p-aether-lang"] },
  { x: 46, z: -1.8, to: ["pr-topograph-432", "pr-pyrefly-4180"] },
  { x: -2.5, z: 16, to: ["p-monodromy", "p-epsilon-hollow", "p-faraday"] },
];

// THE HIGHWAY (google/highway #3244): a real four-lane road from the town to
// Mount MujoRush (the owner: "just simply a real highway from main town to
// Mount MujoRush"). Town leg -> a roundabout whose island is the highway's
// place -> the monument leg -> the car park under the three faces. Drawn by
// components/world/land/Highway.jsx; the seal slides faster on it
// (lib/world/motion.js); npm run check keeps it dry, flat and clear.
export const HIGHWAY = {
  width: 7, // four lanes of 1.6 m and two 0.3 m shoulders
  legs: [
    [[-11, -3], [-10.5, -9], [-12, -14], [-19, -18.5], [-24.2, -21.9]], // the town (between the igloo and resolvent) to the roundabout
    [[-28.5, -28.9], [-29.5, -34], [-31, -38.7]], // the roundabout to the car park
  ],
  roundabout: { x: -28, z: -24.4, radius: 4.5, width: 3.2 }, // ring centre line and carriageway
  carPark: { x: -33, z: -41.5, w: 16, d: 5.6 },
};

function nearSegment(x, z, [ax, az], [bx, bz]) {
  const dx = bx - ax;
  const dz = bz - az;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - ax - t * dx, z - az - t * dz);
}

// Is (x, z) on the asphalt? Legs as straight segments between their points
// (the drawn curve bows at most ~0.4 m off them), the ring, and the car park.
export function onHighway(x, z) {
  const half = HIGHWAY.width / 2;
  for (const leg of HIGHWAY.legs) for (let i = 1; i < leg.length; i++) if (nearSegment(x, z, leg[i - 1], leg[i]) < half) return true;
  const r = HIGHWAY.roundabout;
  if (Math.abs(Math.hypot(x - r.x, z - r.z) - r.radius) < r.width / 2) return true;
  const c = HIGHWAY.carPark;
  return Math.abs(x - c.x) < c.w / 2 && Math.abs(z - c.z) < c.d / 2;
}

// THE XLA GEYSER'S LAUNCH (openxla/xla #46539, place pr-openxla-46539 at
// -12, -24, radius 3): a seal that stands at the vent's rim (within `reach`
// of its centre; the dock, 4.6 m out, is just outside) for `hold` seconds,
// or is there when the exact `period` eruption goes off, is thrown `height`
// metres up for `flight` seconds to the landing spot most in line with where
// it stood (lib/world/motion.js; npm run check holds every landing dry, flat
// and clear). The owner: "the geyser can explode if the seal stands near it,
// sending the seal flying".
export const GEYSER = {
  x: -12,
  z: -24,
  reach: 4.4,
  hold: 1.5,
  period: 50, // the same beat the geyser erupts on (components/world/land/parts/dam-geyser.js ERUPT_PERIOD)
  flight: 1.4,
  height: 7,
  landings: [[-3, -24], [-3.5, -20.9], [-5.1, -18.2], [-7.5, -16.2], [-21, -24], [-20.5, -27.1], [-18.9, -29.8], [-16.5, -31.8], [-3.5, -27.1]],
};
