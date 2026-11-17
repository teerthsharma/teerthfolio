// CLOCK for pr-anyps5-12609: the tide table, the B5 sub-clock and the beat times every layer shares (pure functions of the pocket time).
export const KNOTS = [[5.5, 40.0], [7.8333, 24.0], [8.0, 23.6], [8.5, 21.5], [9.1667, 18.2], [9.8333, 17.0], [10.0, 16.9], [10.1667, 16.7], [10.5, 16.7], [11.0, 16.6]];
export const SERIES = [16.6, 16.9, 16.7, 18.2, 16.7, 17.1, 36.0, 41.5, 41.5, 38.8, 21.0, 16.8, 16.7, 23.6, 17.0, 29.4, 24.0, 27.1, 21.5, 22.4, 33.2, 17.4, 16.7];

export const frame = (t) => Math.floor(t * 12 + 0.02);
export const sub = (t) => (t >= 8 - 1e-6 && t < 8.5 - 1e-6 ? Math.floor((t - 8) * 24 + 0.02) : -1); // B5 kill sub-clock k 0..11, else -1
const smooth = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };

// water level W in ms: the card table stepped on sixths, B5 overrides it (D10, D11)
export function water(t) {
  const k = sub(t);
  if (k >= 0) return k >= 8 ? 21.5 : 23.6 - 2.0 * (k / 7);
  const s = Math.floor(6 * t + 0.01) / 6;
  if (s < KNOTS[0][0]) return 45;
  for (let i = 1; i < KNOTS.length; i++) {
    if (s <= KNOTS[i][0] + 1e-6) { const [a, wa] = KNOTS[i - 1], [b, wb] = KNOTS[i]; return wa + ((wb - wa) * (s - a)) / (b - a); }
  }
  return KNOTS[KNOTS.length - 1][1];
}

// 0..1 grey: B5 ramps over k0..k7 and holds, colour returns over f102..f108
export function desat(t) {
  const k = sub(t);
  if (k >= 0) return smooth(0, 7, k);
  if (t >= 8.5 - 1e-6) return Math.max(0, 1 - (frame(t) - 102) / 6);
  return 0;
}

// tide height of the flood plane in the storm shots (band uv, up): 0.12 at 1.0 s, 0.20 at 2.0, 0.34 at 3.5, held
export function floodY(t) {
  const ts = Math.floor(t * 12 + 0.02) / 12;
  if (ts <= 1) return 0.12;
  if (ts <= 2) return 0.12 + 0.08 * (ts - 1);
  if (ts <= 3.5) return 0.2 + 0.14 * ((ts - 2) / 1.5);
  return 0.34;
}
