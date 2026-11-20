// Route-heat deposit (D5) for one walked leg: a Gaussian per 10 Hz tick, cut at 3.5 sigma, decay suspended, normalised to a maximum of 1.
export const SIGMA = 6;
export const CUT_SIGMAS = 3.5;
export const TICK_S = 0.1;

export function routeHeat(grid, ticks) {
  const { n, xs, zs } = grid;
  const sig2 = 2 * SIGMA * SIGMA;
  const cut2 = (CUT_SIGMAS * SIGMA) ** 2;
  const H = new Float64Array(n);
  for (let i = 0; i < ticks.x.length; i++) {
    for (let v = 0; v < n; v++) {
      const dx = xs[v] - ticks.x[i];
      const dz = zs[v] - ticks.z[i];
      const d2 = dx * dx + dz * dz;
      if (d2 <= cut2) H[v] += TICK_S * Math.exp(-d2 / sig2);
    }
  }
  let m = 0;
  for (let v = 0; v < n; v++) if (H[v] > m) m = H[v];
  if (m > 0) for (let v = 0; v < n; v++) H[v] /= m;
  return H;
}

// Ticks of a walker at constant `speed` m/s along a polyline, one per 1/hz s from its first point.
export function ticksAlong(polyline, speed, hz = 1 / TICK_S) {
  const step = speed / hz;
  const x = [polyline[0].x];
  const z = [polyline[0].z];
  let carry = step;
  for (let i = 1; i < polyline.length; i++) {
    const a = polyline[i - 1];
    const b = polyline[i];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    for (let s = carry; s <= len + 1e-9; s += step) {
      const t = Math.min(1, s / len);
      x.push(a.x + t * (b.x - a.x));
      z.push(a.z + t * (b.z - a.z));
      carry = s + step;
    }
    carry -= len;
  }
  return { x: Float64Array.from(x), z: Float64Array.from(z) };
}
