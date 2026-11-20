// Baselines B1 (chunk-boundary crossings per second) and B2 (per-cell live flips per second) for the walk.
export function chunkCrossings(x, z, { chunk = 16, window = 48 } = {}) {
  const W = window / chunk;
  const F = x.length;
  let crossings = 0;
  let loads = 0;
  let pcx = Math.floor(x[0] / chunk);
  let pcz = Math.floor(z[0] / chunk);
  for (let f = 1; f < F; f++) {
    const cx = Math.floor(x[f] / chunk);
    const cz = Math.floor(z[f] / chunk);
    if (cx !== pcx || cz !== pcz) {
      crossings += 1;
      const dcx = Math.abs(cx - pcx);
      const dcz = Math.abs(cz - pcz);
      loads += W * W - Math.max(0, W - dcx) * Math.max(0, W - dcz);
      pcx = cx;
      pcz = cz;
    }
  }
  const seconds = (F - 1) / 60;
  return {
    crossings,
    loads,
    seconds,
    perSec: crossings / seconds,
    loadsPerSec: loads / seconds,
  };
}

export function makeFlipCounter(n, lo = 0.35) {
  const prev = new Uint8Array(n);
  let started = false;
  let total = 0;
  return {
    step(c) {
      if (!started) {
        started = true;
        for (let i = 0; i < n; i++) prev[i] = c[i] < lo ? 1 : 0;
        return 0;
      }
      let flips = 0;
      for (let i = 0; i < n; i++) {
        const live = c[i] < lo ? 1 : 0;
        if (live !== prev[i]) {
          flips += 1;
          prev[i] = live;
        }
      }
      total += flips;
      return flips;
    },
    get total() {
      return total;
    },
  };
}
