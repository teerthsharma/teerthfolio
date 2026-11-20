// The route-heat field D5 (PREREGISTRATION.md section 6.2 and the T1 bed in section 6.5): a Gaussian deposit of sigma 6 m,
// cut at 3.5 sigma, peak rho = 1, one deposit per 10 Hz tick of size K = dt = 0.1 (design spec via 2.7), and a
// half-life of 90 s on the live field. Plates are baked with decay suspended (P9) and normalised to their maximum.
import { makeHexGrid } from "../topo-field/hexgrid.mjs";
import { SIGMA, CUT_SIGMAS, TICK_S } from "../../lib/world/heat/route-heat.js";

export { SIGMA, TICK_S };

export const GRID = makeHexGrid(84, 4);
export const CUT = CUT_SIGMAS * SIGMA;
export const HALF_LIFE = 90;
export const DECAY = Math.pow(0.5, TICK_S / HALF_LIFE);
const K = TICK_S;
const SIG2 = 2 * SIGMA * SIGMA;
const CUT2 = CUT * CUT;
const TICKS_PER_S = 10;

function deposit(H, px, pz) {
  const { n, x, z } = GRID;
  for (let v = 0; v < n; v++) {
    const dx = x[v] - px;
    const dz = z[v] - pz;
    const d2 = dx * dx + dz * dz;
    if (d2 <= CUT2) H[v] += K * Math.exp(-d2 / SIG2);
  }
}

function normalise(H) {
  let m = 0;
  for (let v = 0; v < H.length; v++) if (H[v] > m) m = H[v];
  if (m > 0) for (let v = 0; v < H.length; v++) H[v] /= m;
  return H;
}

export function bakePlate(ticks) {
  const H = new Float64Array(GRID.n);
  for (let i = 0; i < ticks.x.length; i++) deposit(H, ticks.x[i], ticks.z[i]);
  return normalise(H);
}

export function staticPrior(points) {
  const H = new Float64Array(GRID.n);
  for (const p of points) deposit(H, p.x, p.z);
  return normalise(H);
}

export function liveSamples(ticks, { decay = true } = {}) {
  const H = new Float64Array(GRID.n);
  const out = [];
  let M = 0;
  for (let i = 0; i < ticks.x.length; i++) {
    if (decay) for (let v = 0; v < GRID.n; v++) H[v] *= DECAY;
    deposit(H, ticks.x[i], ticks.z[i]);
    for (let v = 0; v < GRID.n; v++) if (H[v] > M) M = H[v];
    if ((i + 1) % TICKS_PER_S === 0) {
      const Hn = new Float64Array(GRID.n);
      for (let v = 0; v < GRID.n; v++) Hn[v] = M > 0 ? H[v] / M : 0;
      out.push(Hn);
    }
  }
  return out;
}
