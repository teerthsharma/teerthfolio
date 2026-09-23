// THE XLA GEYSER, pure layout: openxla/xla #46539 fixed GroupDisjointReductions
// so the same program always emits the same GPU code -- so this geyser erupts
// on the exact same beat every time, real seconds, driven by the clock
// (state.clock.elapsedTime mod ERUPT_PERIOD), never sped up for the seal
// being near (the one thing that would make it non-deterministic).
//
// The beat, all in real seconds: ~47 s of quiet steam, a 3 s build-up
// (bubbling, a couple of puffs) as the moment nears, then one big eruption --
// a tall column, a splash ring at its foot, drops raining back -- over in a
// few seconds, then quiet again. Old Faithful, timed to the fix.

const GOLDEN = 2.39996;

export const ERUPT_PERIOD = 50; // s: the whole beat, source of truth for the schedule
export const BUILDUP_S = 3; // s of bubbling/puffs before the eruption
export const RISE_S = 1.3; // s the column takes to climb
export const FALL_S = 3.2; // s it takes to fall back as spray
export const DROP_COUNT = 30;

export const VENT_R = 1.8; // the sinter mound's base radius
export const VENT_H = 1.6; // the mound's height at the vent lip

// Every drop's own, fixed way up: a golden-angle fan (the same trick as
// land/Moat.jsx's Uphill), so the column reads as a fountain, not one jet,
// and is bit-for-bit the same shape every cycle -- the fix, shown.
export const DROPS = Array.from({ length: DROP_COUNT }, (_, i) => ({
  angle: i * GOLDEN,
  apex: 4.6 + 3.4 * ((i * 0.618) % 1), // m above the vent lip: a tall, spectacular column
  delay: ((i % 8) / 8) * (RISE_S * 0.75), // staggered launch inside the rise, so the column fans out and builds
  spread: 0.4 + 0.55 * (((i * 7) % 5) / 5), // outward drift while falling
}));

// THE SPLASH RING: a skirt of spray thrown out at the base as the column
// falls, expanding and fading with FALL.
export const SPLASH_COUNT = 18;
export const SPLASH = Array.from({ length: SPLASH_COUNT }, (_, i) => ({
  angle: i * GOLDEN,
  delay: ((i % 6) / 6) * 0.5, // staggered so the ring doesn't pop out as one rigid disc
}));

// THE ALWAYS-ON TELL: a few pale steam puffs drift up off the vent lip all
// the time, on their own slow loop -- never gated to ERUPT_PERIOD, so the
// mound reads "hot" through the ~86% of the cycle the fountain is dormant.
export const STEAM_COUNT = 7;
export const STEAM_PERIOD = 3.4; // s: one puff's own rise-and-fade loop
export const STEAM = Array.from({ length: STEAM_COUNT }, (_, i) => ({
  angle: i * GOLDEN,
  radius: 0.12 + 0.22 * ((i * 0.41) % 1),
  offset: i / STEAM_COUNT,
  apex: 1.3 + 0.9 * ((i * 0.618) % 1),
}));

// THE BUILD-UP: in the last BUILDUP_S seconds before an eruption, a few
// bubbles jostle at the vent lip (their own fast, uneven rate, so they read
// as agitated water, not a metronome) and a couple of bigger puffs kick
// loose -- the tell that something is about to go, never a silent jump-cut
// into the column.
export const BUBBLE_COUNT = 5;
export const BUBBLES = Array.from({ length: BUBBLE_COUNT }, (_, i) => ({
  angle: i * GOLDEN,
  radius: 0.22 + 0.5 * ((i * 0.53) % 1),
  rate: 2.6 + (i % 3) * 0.9, // bubbles per second, off-phase from each other
}));
export const PUFF_COUNT = 3;
export const PUFFS = Array.from({ length: PUFF_COUNT }, (_, i) => ({
  angle: i * GOLDEN * 1.7,
  at: 0.4 + i * 0.22, // fraction into the build-up window each puff fires
}));
export const BUILDUP_COUNT = BUBBLE_COUNT + PUFF_COUNT;
