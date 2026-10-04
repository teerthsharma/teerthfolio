// THE CLOCK of the nerve scene (seconds from the arrival), and the pure functions every part reads from it. The
// whole scene is a function of t, so any frame can be drawn alone (a capture can scrub to it).

import { GAUGE } from "./roof";
import { clamp01, ease, hash, sm } from "./look";

export const T = {
  banner: [0.35, 2.15, 2.5], // unfurled by, rolls up from, gone by
  rain: 1.3, // the rain starts to fall in the beam
  reach: [1.9, 2.8], // the pup holds the apple out at arm's length
  take: 3.25, // Ryuk's claw takes it: flipper and claw almost touching
  realm: [3.0, 4.6], // the cloud parts over Ryuk and shows the Shinigami Realm, then closes
  write: [3.7, 4.1, 4.5, 4.9], // the pup's four pen strokes
  drop: [4.05, 4.45, 4.85, 5.25], // a blue bead drops into each gauge
  ryuk: 5.4, // Ryuk opens his own notebook and writes
  grains: 5.6, // the control's grains start to fall
  toll: [7.0, 8.1, 9.2], // the bell: gauges 1, 2, 3 are buried
  survive: 9.95, // the fourth bead flares; no toll
  core: 10.4, // Ryuk tosses the apple core over the parapet
  bag: [10.9, 11.6], // the chip bag from the pocket, torn open
  page: [11.7, 12.3], // the page held up to the camera
  screens: 12.5, // the three screens cut to the page
  crack: [12.9, 13.6], // the varnish cracks along every edge
  crunch: 13.6, // CRUNCH: the picture breaks
  reveal: 13.8, // the real island under the falling shards
};
export const SCREENS = { cut: 12.5 };

// ---- the gauges ---------------------------------------------------------------------------------------------------
export const GRAIN = { n: [32, 48, 64, 16], per: 4, step: 0.075, fall: 0.55, r: 0.058 };
export const GRAINS_TOTAL = GRAIN.n.reduce((a, b) => a + b, 0);
// when the last grain of gauge i lands: the bead is buried, and the bell tolls just after
const landEnd = (i) => (i < 3 ? T.toll[i] - 0.12 : 8.8);
const GRAIN_BASE = GRAIN.n.reduce((a, n, i) => (a.push(i ? a[i - 1] + GRAIN.n[i - 1] : 0), a), []);
const FY = GAUGE.floor + 0.26;
// grain k of gauge i: { lands, x, y, z, ... } (all in the rig frame); pure
const GR = { x: 0, y: 0, z: 0, s: 0, spin: 0 };
export function grainAt(i, k, t) {
  const n = GRAIN.n[i];
  const land = T.grains + (landEnd(i) - T.grains) * ((k + 0.5) / n) ** 0.9 + (hash(i * 97 + k, 1) - 0.5) * 0.03;
  const layer = Math.floor(k / GRAIN.per);
  const a = (k % GRAIN.per) * (Math.PI / 2) + layer * 0.7 + hash(k, i) * 0.4;
  const rad = 0.1 + 0.025 * hash(k, 3 + i);
  const rest = FY + 0.07 + layer * GRAIN.step;
  const top = FY + GAUGE.h + 0.9;
  const u = (t - (land - GRAIN.fall)) / GRAIN.fall;
  if (u < 0) {
    GR.s = 0;
    return GR;
  }
  const f = clamp01(u);
  GR.s = 1;
  GR.x = GAUGE.x[i] + Math.cos(a) * rad * (0.4 + 0.6 * f) + 0.05 * (1 - f) * Math.sin(k);
  GR.z = GAUGE.z + Math.sin(a) * rad * (0.4 + 0.6 * f);
  GR.y = top - (top - rest) * f * f;
  GR.spin = f < 1 ? t * 9 + k : a;
  return GR;
}
// how high the heap stands in gauge i at t (over the floor): the count of grains that have landed
export function heapAt(i, t) {
  let n = 0;
  for (let k = 0; k < GRAIN.n[i]; k++) if (t >= T.grains + (landEnd(i) - T.grains) * ((k + 0.5) / GRAIN.n[i]) ** 0.9 + (hash(i * 97 + k, 1) - 0.5) * 0.03) n++;
  return n ? 0.04 + Math.ceil(n / GRAIN.per) * GRAIN.step : 0;
}

// the gauge states the roof draws: bead height, shown, flare, the coral ring's pop (all pure)
const G = Array.from({ length: 4 }, () => ({ y: 0, show: false, flare: 0, ring: 0 }));
export function gaugesAt(t) {
  for (let i = 0; i < 4; i++) {
    const g = G[i];
    const rest = GAUGE.bead[i];
    const top = GAUGE.h + 0.5;
    const s = clamp01((t - T.drop[i]) / 0.5);
    g.show = t >= T.drop[i];
    g.y = rest + (top - rest) * (1 - s * s) + 0.05 * Math.sin(s * Math.PI * 3) * (1 - s);
    // the survivor flares blue; the three buried beads keep a faint glow under the grains
    g.flare = i === 3 ? sm(T.survive, T.survive + 0.25, t) * (1 - 0.45 * sm(T.survive + 0.7, T.survive + 1.6, t)) : 0;
    g.ring = i < 3 && t >= T.toll[i] ? Math.max(0.001, ease.back(clamp01((t - T.toll[i]) / 0.4))) : 0;
  }
  return G;
}

// how many of the pup's lines are written and struck at t (the notebook and the page read this)
export const linesAt = (t) => T.write.reduce((n, w) => n + (t >= w + 0.22 ? 1 : 0), 0);
export const strikesAt = (t) => T.toll.reduce((n, w) => n + (t >= w ? 1 : 0), 0);

// the bell's swing (rad): a kick on each toll, ringing down
export function bellAngle(t) {
  let a = 0;
  for (const w of T.toll) {
    const d = t - w;
    if (d > 0) a += 0.42 * Math.exp(-d * 0.75) * Math.cos(d * 3.4);
  }
  return a;
}
// a flicker on each toll (the screens, the rim light)
export function tollPulse(t) {
  let p = 0;
  for (const w of T.toll) if (t >= w) p = Math.max(p, Math.exp(-(t - w) * 5));
  return p;
}
