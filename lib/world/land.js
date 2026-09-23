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

  // MOUNT MUJORUSH: the granite massif north-west of the valley. Its carved
  // south cliff runs along z = -55 from x = -54 to -16.
  { x: -48, z: -66, radius: 11, land: "mujorush" },
  { x: -35, z: -67, radius: 12, land: "mujorush" },
  { x: -22, z: -66, radius: 11, land: "mujorush" },
  { x: -60, z: -58, radius: 8, land: "mujorush" },

  // THE GOOGLE RANGE east of the valley: Highway Pass's two peaks (the pass
  // is the 6 m gap between them, at x = 38), the ridge on to XNNPACK, and
  // XNNPACK's mountain.
  { x: 27, z: -74, radius: 8, land: "google-range" },
  { x: 49, z: -74, radius: 8, land: "google-range" },
  { x: 58, z: -66, radius: 8, land: "google-range" },
  { x: 70, z: -60, radius: 10, land: "google-range" },

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
