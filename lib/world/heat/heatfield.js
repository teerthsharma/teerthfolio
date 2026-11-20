// Route-heat field on a hex grid: a Gaussian deposit per walker tick, exponential decay by half-life, normalised by the running maximum.
const CUT_SIGMAS = 3.5;

export function makeHeat(g, { sigma = 6, halfLifeS = 90 } = {}) {
  const n = g.n;
  const SIG2 = 2 * sigma * sigma;
  const CUT2 = (CUT_SIGMAS * sigma) * (CUT_SIGMAS * sigma);
  const H = new Float64Array(n);
  const hn = new Float32Array(n);
  let M = 0;
  function tick(x, z, dtS) {
    const decay = Math.pow(0.5, dtS / halfLifeS);
    for (let v = 0; v < n; v++) H[v] *= decay;
    for (let v = 0; v < n; v++) {
      const dx = g.xs[v] - x;
      const dz = g.zs[v] - z;
      const d2 = dx * dx + dz * dz;
      if (d2 <= CUT2) H[v] += dtS * Math.exp(-d2 / SIG2);
    }
    for (let v = 0; v < n; v++) if (H[v] > M) M = H[v];
    for (let v = 0; v < n; v++) hn[v] = M > 0 ? H[v] / M : 0;
  }
  return { tick, hn };
}
