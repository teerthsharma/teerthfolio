// Instance counts by quality tier (lib/world/quality.js TIERS, T0 to T4). A missing tier counts as the base.
const SCALE = [0.4, 0.6, 1, 1, 1.25];

export function detail(base, tier) {
  const s = SCALE[Number.isInteger(tier) ? Math.min(SCALE.length - 1, Math.max(0, tier)) : 2];
  return Math.max(1, Math.round(base * s));
}
