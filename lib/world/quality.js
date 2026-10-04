// The quality ladder: one rung per class of GPU, cheapest first.
//
// The frame costs about one fixed slice (geometry, the shadow pass) plus a
// slice per drawing-buffer pixel, and the per-pixel slice dominates (Intel
// UHD, 1440x900, no post: 66.7 ms at DPR 2, 30.2 ms at DPR 1). A DPR cap
// hands the most pixels to the biggest CSS viewport: a phone at DPR 2 draws
// 1.3 MP, an iPad 3.9 MP, a 1440x900 laptop 5.2 MP, a 16" MacBook 7.7 MP.
// So each rung spends a pixel budget (mpx), not a DPR: every screen at a rung
// draws about the same number of pixels, and the laptop stops being the
// worst case.
//
// Nothing a rung changes may change a material's program key, or a step
// recompiles every shader in one frame (5.5 s frozen on Intel UHD, see
// scripts/perf-frames.mjs): every rung keeps the composer (Look.jsx) and a
// shadow-casting sun, and spends less on them instead: MSAA, map size, and
// how often the sun redraws its map (shadowEvery frames). Once the drawing
// buffer fits the pixel budget, the shadow pass (every caster drawn again)
// is the biggest fixed cost left on an iGPU.
// The sky keeps one resolution for the same reason: the PMREM size is in
// every PBR program key (three: envMapCubeUVHeight), and it renders once.
//
// Every rung is a finished look, not the top with things switched off: the
// key, fill and rim are lights at every rung (lights are cheap, post is not),
// the seal's contact shadow grounds it where the sun's map is coarse, and the
// Neutral tone map the palette was solved for runs at every rung, so snow
// keeps its value.

export const TIERS = [
  // T0 potato: software GL, very old iGPU, old phones
  { name: "T0", mpx: 0.6, dpr: [0.5, 1], msaa: 0, shadow: 1024, shadowEvery: 4, ao: false, bloom: false, snow: 120 },
  // T1 weak iGPU: Intel HD/UHD
  { name: "T1", mpx: 0.9, dpr: [0.6, 1.25], msaa: 0, shadow: 1024, shadowEvery: 2, ao: false, bloom: false, snow: 200 },
  // T2 good iGPU: Iris Xe, Radeon iGPU, Apple M base, recent phones and iPads
  { name: "T2", mpx: 2.2, dpr: [0.75, 2], msaa: 2, shadow: 2048, shadowEvery: 1, ao: false, bloom: true, snow: 400 },
  // T3 discrete mid: RTX 4060 laptop, M Pro
  { name: "T3", mpx: 5.2, dpr: [1, 2], msaa: 4, shadow: 2048, shadowEvery: 1, ao: true, bloom: true, snow: 400 },
  // T4 top: big desktop GPUs, M Max
  { name: "T4", mpx: 9, dpr: [1, 2], msaa: 4, shadow: 2048, shadowEvery: 1, ao: true, bloom: true, snow: 400 },
];
export const TOP = TIERS.length - 1;

// The starting rung from the WebGL renderer string. Only a first guess: the
// loading screen measures it, and the monitor moves it both ways after.
// ponytail: a regex table, not a benchmark database (detect-gpu fetches one
// from a CDN); the measured warm-up corrects any misread.
const TABLE = [
  [/swiftshader|llvmpipe|softpipe|basic render|mali-[4t]|adreno \(tm\) [34]\d\d|powervr/i, 0],
  [/intel.*(hd|uhd)/i, 1],
  [/apple m\d (max|ultra)|rtx [345]0[789]0|rx [67][89]\d\d/i, 4],
  [/nvidia|geforce|quadro|radeon (rx|pro)|apple m\d (pro)/i, 3],
  [/iris|apple|radeon|adreno|mali|intel/i, 2],
];
export function classify(renderer = "") {
  for (const [re, tier] of TABLE) if (re.test(renderer)) return tier;
  return 2;
}

// The DPR a rung gets on this screen: its pixel budget over the CSS area,
// never above the device's own DPR, clamped to the rung's range.
export function dprFor(tier, cssWidth, cssHeight, deviceDpr) {
  const t = TIERS[tier];
  const fit = Math.sqrt((t.mpx * 1e6) / Math.max(1, cssWidth * cssHeight));
  return +Math.min(deviceDpr, t.dpr[1], Math.max(t.dpr[0], fit)).toFixed(2);
}

// The settled rung, remembered per GPU so a second visit starts on it.
const key = (renderer) => `teerthfolio.tier:${renderer}`;
export function recall(renderer) {
  try {
    const v = window.localStorage.getItem(key(renderer));
    return v !== null && /^\d$/.test(v) && Number(v) <= TOP ? Number(v) : null;
  } catch {
    return null;
  }
}
export function remember(renderer, tier) {
  try {
    window.localStorage.setItem(key(renderer), String(tier));
  } catch {
    /* private window or blocked storage: the next visit measures again */
  }
}
