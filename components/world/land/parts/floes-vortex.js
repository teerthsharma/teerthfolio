// THE PYREFLY WHIRLPOOL, drawn: pure layout for the spinning spiral of foam
// on the river's own surface (lib/world/river.js WHIRLPOOL), exactly
// WHIRLPOOL.radius wide -- the water made visible for what the physics
// already does (lib/world/motion.js stepSeal): catch a swimmer inside that
// radius, carry it round tighter and faster, then throw it back onto the
// bank. The pin (floes-layout.js PIN, where the funnel's chain commits)
// stands close by on the north bank; the whirlpool itself sits on the
// channel's centre line, WHIRLPOOL.x/z, a few metres off.
//
// Local frame: origin at the whirlpool's own centre, on the water plane; x
// east, z south. Pure and run once, floes-layout.js's own rule: every
// chip's place is fixed for good; only the two rings' spin and the shared
// material's glow (Floes.jsx, per frame) move.

import { WHIRLPOOL } from "../../../../lib/world/river.js";

export const OUTER_R = WHIRLPOOL.radius; // the spiral's outer edge: the catch radius, shown, never told
export const EYE_R = 0.8; // the dark core

const TURNS = 2.3;
const CHIP_N = 56;
const SPLIT = 0.55; // u below this: the outer ring; at/above: the inner ring -- two groups turning at their own speed is a whirlpool's real differential (faster near the eye), cheap as two rotations instead of one

function rand(i, k) {
  const h = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

// One entry per foam streak, rim to eye: x/z its centre, y how far it dips
// below the still surface, angle tangent to the spin (which way it points),
// len/w its size (long and wide toward the rim, tight chips near the eye),
// u 0 (rim)..1 (eye) for colour.
const ALL = Array.from({ length: CHIP_N }, (_, i) => {
  const u = (i + 0.5) / CHIP_N;
  const r = OUTER_R - (OUTER_R - EYE_R * 1.2) * u;
  const a = u * TURNS * Math.PI * 2 + rand(i, 1) * 0.4;
  const wob = 1 + (rand(i, 2) - 0.5) * 0.12;
  return {
    x: Math.cos(a) * r * wob,
    z: Math.sin(a) * r * wob,
    // River.jsx's water surface is an opaque mesh flat at WATER_Y here (no
    // per-vertex dip), so a chip centred below y = 0 renders fully hidden
    // under it -- the old -0.02 - 0.22*u*u dip put most of the inner ring
    // (and the eye, below) beneath that surface, which is why the whirlpool
    // barely read. Every chip now sits above the surface instead, still
    // tallest at the rim and lowest near the eye (River's own streaks ride
    // 0.018 above the surface the same way).
    y: 0.02 + 0.05 * (1 - u),
    angle: a + Math.PI / 2,
    len: (0.6 + 1.2 * (1 - u)) * (0.85 + 0.3 * rand(i, 3)),
    w: 0.15 + 0.18 * (1 - u),
    u,
  };
});
export const OUTER_CHIPS = ALL.filter((c) => c.u < SPLIT);
export const INNER_CHIPS = ALL.filter((c) => c.u >= SPLIT);

// A few mist puffs breathing off the pin, always on: the geyser's own
// golden-angle fan (land/parts/dam-geyser.js STEAM), smaller and slower.
const GOLDEN = 2.39996;
export const MIST_N = 6;
export const MIST = Array.from({ length: MIST_N }, (_, i) => ({
  angle: i * GOLDEN,
  radius: 0.12 + 0.28 * ((i * 0.53) % 1),
  offset: i / MIST_N,
  apex: 0.5 + 0.6 * ((i * 0.618) % 1),
}));
