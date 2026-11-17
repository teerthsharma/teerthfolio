// The four render modes of v1, and which quality tier draws which: one file, read by the world and the engine.
export const MODES = ["low", "good", "medium", "best"];
const BY_TIER = ["low", "low", "good", "medium", "best"]; // T0..T4 of lib/world/quality.js

export const FEATURES = {
  low: { plates: true, shaders: false, heavy: false, live: false }, // baked only
  good: { plates: true, shaders: true, heavy: false, live: false }, // baked plus shaders
  medium: { plates: true, shaders: true, heavy: true, live: false }, // baked plus heavy shaders
  best: { plates: true, shaders: true, heavy: true, live: true }, // baked plus shaders plus a few live objects
};

export const modeForTier = (tier) => BY_TIER[Math.max(0, Math.min(BY_TIER.length - 1, Math.trunc(tier) || 0))];
export const featuresForTier = (tier) => FEATURES[modeForTier(tier)];
