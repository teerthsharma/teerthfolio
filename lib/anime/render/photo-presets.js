// PHOTOGRAPHY DATA: the complete default rig and the named moods. A scene asks with look.photo = "night-red" or
// { preset, ...overrides, shots: [{ t: [a, b], ...overrides }], beats: [{ t, dur, flash, col }] }; the rest is lookup.
const V = (x, y, z) => [x, y, z];
const lerp = (a, b, k) => a + (b - a) * k;
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
export const merge = (a, b) => {
  if (!isObj(b)) return b === undefined ? a : b;
  const o = { ...(isObj(a) ? a : {}) };
  for (const [k, v] of Object.entries(b)) o[k] = isObj(v) ? merge(o[k], v) : v;
  return o;
};

// view space: x right, y up, z toward the lens; dirs point from the subject toward the light
export const PHOTO_DEFAULT = {
  on: 1, space: "view",
  key: { dir: null, col: "#fff1dc", amt: 0.6, hard: 0.9, reach: 0.9, contact: 1, sync: false },
  rim: { dir: V(0.8, 0.25, -0.55), col: "auto", amt: 1.1, w: 10, gain: 1 },
  rim2: null,
  fill: { col: "auto", amt: 0.3 }, bounce: { col: "auto", amt: 0.25 },
  shadow: { col: "#2e2850", amt: 0.65 },
  // THE VALUE BUDGET (one per shot, owned here): darks the set's multiplier away from the focal pool, ceil the luma a set or effect BODY may
  // reach there (a soft knee; only hot cores above 1.0 pass), sat the saturation a broad surface keeps, lift the face's gain inside the pool
  value: { darks: 0.3, hero: 0.04, contrast: 0.55, vig: 0.55, r: 0.46, at: "hero", ceil: 0.38, sat: 0.66, lift: 0.26, body: 0.5, thin: 1 },
  hero: { cap: 0.92, floor: "#2a2848", floorAmt: 0.4, tint: 0.4, desat: 0 },
  veins: { col: "#ff3a2a", amt: 0, n: 6, flow: 1.3, speed: 0.05 },
  halo: { col: "#ffffff", amt: 0, r: 0.5 },
  haze: { col: "auto", k: 0.014, start: 3, max: 0.4, sky: 0.25 },
  mist: { col: "#aab0c8", y: 0, h: 1.2, amt: 0, scale: 0.18, wind: 0.05, speed: 0.4 },
  motes: { col: "#ffe8c0", amt: 0.5, n: 0.45, size: 0.8, rise: 0.05, layers: 3 },
  shafts: { col: "#ffe2b0", amt: 0, at: null },
  glow: { thr: 1.05, amt: 0.3, col: "#ffffff", wide: 0.45 },
  dof: { amt: 0.5, focus: "hero" },
  paint: { grain: 0.04, hatch: 0.12, hatchCol: "#14081a" },
  grade: { exposure: 1, sat: 1, contrast: 0, sh: "#000000", mid: "#808080", hi: "#ffffff", tone: 0, harmony: { hues: "auto", amt: 0.45, hero: 0 } },
  hit: { flash: 0.8, ca: 4, blow: 0.3, col: "#ffffff" },
  shots: [], beats: [],
};

export const PRESETS = {
  auto: {},
  none: { on: 0 },
  // `photo: false`: the value law alone, for a printed or flat look (a manga page): the set is pulled down and the face lifted; no colour, air, rim, glow or blur
  law: {
    key: { amt: 0, contact: 0 }, rim: { amt: 0 }, rim2: null, fill: { amt: 0 }, bounce: { amt: 0 }, shadow: { amt: 0 },
    value: { darks: 0.5, hero: 0.04, contrast: 0, vig: 0.3, r: 0.5, ceil: 0.5, sat: 0.8, lift: 0.25 },
    hero: { cap: 1, floorAmt: 0, tint: 0, desat: 0 }, veins: { amt: 0 }, halo: { amt: 0 }, haze: { max: 0, sky: 0 }, mist: { amt: 0 }, motes: { amt: 0 },
    shafts: { amt: 0 }, glow: { amt: 0 }, dof: { amt: 0 }, paint: { grain: 0, hatch: 0 }, grade: { harmony: { amt: 0, hero: 0 } }, hit: { flash: 0, ca: 0, blow: 0 },
  },
  // a flat-filled look (fill.flat): the same budget, no blur, no desaturation of the flat colours
  flat: { value: { darks: 0.62, ceil: 0.62, sat: 0.95, lift: 0.22, body: 0.6 }, dof: { amt: 0 }, haze: { max: 0.1, sky: 0.05 }, mist: { amt: 0 }, motes: { amt: 0.15 }, paint: { grain: 0.02, hatch: 0 }, grade: { harmony: { amt: 0.15 } } },
  "night-red": {
    key: { dir: V(-0.82, 0.32, 0.38), col: "#ff8a6c", amt: 1.0, hard: 0.95, reach: 1.0, sync: true },
    rim: { dir: V(-0.9, 0.15, -0.4), col: "#ff2a1c", amt: 1.5, w: 11 },
    rim2: { dir: V(0.9, 0.25, -0.35), col: "#c01428", amt: 0.8, w: 7 },
    fill: { col: "#1a2458", amt: 0.4 }, bounce: { col: "#8a1020", amt: 0.5 },
    hero: { cap: 0.92, floor: "#1c2656", floorAmt: 0.7, tint: 0.2, desat: 0.35 },
    veins: { col: "#ff2418", amt: 0.9, n: 9, flow: 1.7, speed: 0.06 },
    shadow: { col: "#3a1860", amt: 0.85 },
    value: { darks: 0.28, hero: 0.03, contrast: 0.8, vig: 0.6, r: 0.42, ceil: 0.34, sat: 0.62, lift: 0.3 },
    halo: { col: "#ff1a0c", amt: 0.3, r: 0.3 },
    haze: { col: "#3a0610", k: 0.012, start: 2, max: 0.4, sky: 0.08 },
    mist: { col: "#8a1020", y: -0.1, h: 0.6, amt: 0.3 },
    motes: { col: "#ff6a2a", amt: 1.4, n: 0.5, size: 0.6, rise: 0.14 },
    shafts: { col: "#ff3a1a", amt: 0.14 },
    glow: { thr: 1.3, amt: 0.4, col: "#ff2a1a", wide: 0.3 },
    dof: { amt: 0.8 },
    paint: { grain: 0.06, hatch: 0.55 },
    grade: { exposure: 1.02, sat: 1.12, contrast: 0.2, sh: "#140a30", mid: "#6a4048", hi: "#ffd0b8", tone: 0.18, harmony: { hues: [356, 14, 332], amt: 0.7, hero: 0.1 } },
    hit: { flash: 0.9, ca: 5, blow: 0.45, col: "#ffd2c0" },
  },
  "noon-desert": {
    key: { dir: V(-0.5, 0.75, 0.45), col: "#fff0d0", amt: 0.8, hard: 0.95, reach: 1.2, sync: true },
    rim: { dir: V(0.7, 0.5, -0.5), col: "#ffd9a0", amt: 0.8, w: 7 },
    fill: { col: "#8aaad8", amt: 0.45 }, bounce: { col: "#e8b878", amt: 0.5 },
    shadow: { col: "#3c4c8c", amt: 0.7 },
    value: { darks: 0.82, hero: 0.05, contrast: 0.25, vig: 0.28, r: 0.7 },
    halo: { col: "#ffe2a8", amt: 0.35, r: 0.7 },
    haze: { col: "#e8c89c", k: 0.008, start: 6, max: 0.6, sky: 0.3 },
    mist: { col: "#e8cfa4", y: 0, h: 0.8, amt: 0.28, wind: 0.12 },
    motes: { col: "#fff0c8", amt: 0.5, n: 0.4, rise: 0.02 },
    shafts: { col: "#fff0c0", amt: 0.25 },
    glow: { thr: 0.75, amt: 0.4, col: "#ffe8b8", wide: 0.6 },
    dof: { amt: 0.6 },
    paint: { grain: 0.05, hatch: 0 },
    grade: { exposure: 1.04, sat: 1.1, contrast: 0.15, sh: "#2a2850", mid: "#a09078", hi: "#fff2d8", tone: 0.2, harmony: { hues: [32, 195, 18], amt: 0.5, hero: 0.1 } },
    hit: { flash: 0.7, ca: 3, blow: 0.35, col: "#fff2d0" },
  },
  "blue-void": {
    key: { dir: V(-0.3, 0.7, 0.65), col: "#c8e8ff", amt: 0.8, hard: 0.85, reach: 1.0, sync: true },
    rim: { dir: V(0.8, 0.3, -0.5), col: "#5ac8ff", amt: 1.2, w: 12 },
    rim2: { dir: V(-0.8, 0.2, -0.5), col: "#8a7aff", amt: 0.8, w: 9 },
    veins: { col: "#4ab8ff", amt: 0.7, n: 6, flow: 1.4, speed: 0.07 },
    fill: { col: "#2a3a8c", amt: 0.4 }, bounce: { col: "#1a6ab0", amt: 0.4 },
    shadow: { col: "#101a4a", amt: 0.8 },
    value: { darks: 0.34, hero: 0.03, contrast: 0.6, vig: 0.55, r: 0.5 },
    halo: { col: "#3a8cff", amt: 0.9, r: 0.55 },
    haze: { col: "#081850", k: 0.02, start: 3, max: 0.65, sky: 0.5 },
    mist: { col: "#2a58b8", y: 0, h: 1.5, amt: 0.45 },
    motes: { col: "#8ad0ff", amt: 1.0, n: 0.5, size: 0.9, rise: 0.06 },
    shafts: { col: "#6ab0ff", amt: 0.3 },
    glow: { thr: 0.45, amt: 0.9, col: "#4a9aff", wide: 0.85 },
    dof: { amt: 0.8 },
    paint: { grain: 0.05, hatch: 0.2, hatchCol: "#060a28" },
    grade: { exposure: 1.0, sat: 1.1, contrast: 0.2, sh: "#040a28", mid: "#4a6aa8", hi: "#d8f0ff", tone: 0.25, harmony: { hues: [212, 238, 188], amt: 0.7, hero: 0.1 } },
    hit: { flash: 0.9, ca: 5, blow: 0.45, col: "#d8f0ff" },
  },
  "noon-gold": {
    key: { dir: V(-0.55, 0.7, 0.45), col: "#fff0c0", amt: 0.9, hard: 0.95, reach: 1.1, sync: true },
    rim: { dir: V(0.75, 0.45, -0.5), col: "#ffd060", amt: 1.2, w: 12 },
    rim2: { dir: V(-0.8, 0.2, -0.45), col: "#ff7a30", amt: 0.8, w: 9 },
    fill: { col: "#6a78c8", amt: 0.4 }, bounce: { col: "#e8a040", amt: 0.6 },
    shadow: { col: "#4a2c6c", amt: 0.75 },
    hero: { cap: 0.8, floor: "#4a3068", floorAmt: 0.6, tint: 0.5 },
    value: { darks: 0.4, hero: 0.04, contrast: 0.6, vig: 0.5, r: 0.5 },
    halo: { col: "#ffc860", amt: 0.6, r: 0.55 },
    haze: { col: "#a05a28", k: 0.012, start: 3, max: 0.5, sky: 0.3 },
    mist: { col: "#e8a860", y: 0, h: 0.8, amt: 0.4, wind: 0.12 },
    motes: { col: "#ffe090", amt: 1.0, n: 0.45, size: 0.7, rise: 0.05 },
    shafts: { col: "#ffd070", amt: 0.3 },
    glow: { thr: 0.7, amt: 0.6, col: "#ffc060", wide: 0.6 },
    dof: { amt: 0.7 },
    paint: { grain: 0.05, hatch: 0.25, hatchCol: "#241008" },
    grade: { exposure: 1.02, sat: 1.15, contrast: 0.25, sh: "#1c1038", mid: "#a07040", hi: "#fff0c8", tone: 0.3, harmony: { hues: [42, 28, 262], amt: 0.55, hero: 0.08 } },
    hit: { flash: 0.9, ca: 4, blow: 0.5, col: "#fff0c0" },
  },
  storm: {
    key: { dir: V(-0.35, 0.65, 0.6), col: "#d8e4ff", amt: 0.6, hard: 0.7, reach: 1.1, sync: true },
    rim: { dir: V(0.75, 0.4, -0.55), col: "#bcd0ff", amt: 0.9, w: 9 },
    veins: { col: "#a8c0ff", amt: 0.5, n: 5, flow: 1.2, speed: 0.09 },
    fill: { col: "#3a4a68", amt: 0.4 }, bounce: { col: "#4a5870", amt: 0.3 },
    shadow: { col: "#1c2438", amt: 0.7 },
    value: { darks: 0.5, hero: 0.05, contrast: 0.45, vig: 0.5, r: 0.55 },
    halo: { col: "#8aa0d8", amt: 0.35, r: 0.7 },
    haze: { col: "#2a3448", k: 0.02, start: 2, max: 0.75, sky: 0.7 },
    mist: { col: "#6a7890", y: 0, h: 2.2, amt: 0.55, wind: 0.3, speed: 0.9 },
    motes: { col: "#c8d8ff", amt: 0.7, n: 0.6, size: 0.8, rise: -0.5 },
    shafts: { col: "#c8d8ff", amt: 0.12 },
    glow: { thr: 0.6, amt: 0.6, col: "#a8c0ff", wide: 0.7 },
    dof: { amt: 0.5 },
    paint: { grain: 0.06, hatch: 0.25, hatchCol: "#0a1020" },
    grade: { exposure: 0.98, sat: 0.85, contrast: 0.25, sh: "#060a18", mid: "#586478", hi: "#e8f0ff", tone: 0.2, harmony: { hues: [216, 232], amt: 0.6, hero: 0.1 } },
    hit: { flash: 1.2, ca: 4, blow: 0.7, col: "#e8f0ff" },
  },
};

// preset, then the scene's own keys over it; an unknown name is "auto"
export function resolvePhoto(spec, flat = false) {
  if (spec === null) return merge(PHOTO_DEFAULT, PRESETS.none);
  if (spec === false) spec = { preset: "law" };
  const s = typeof spec === "string" ? { preset: spec } : spec ?? {};
  const { preset = "auto", ...own } = s;
  const R = merge(merge(PHOTO_DEFAULT, merge(flat && (preset === "auto" || !PRESETS[preset]) ? PRESETS.flat : {}, PRESETS[preset] ?? PRESETS.auto)), own);
  R.preset = PRESETS[preset] ? preset : "auto"; R.own = own;
  return R;
}

// "auto" asks the colour round the hero which mood fits. Only a set-wide red or blue is a mood: a yellow or gold round the hero is
// usually the effects, so it never picks gold (a dock asks for noon-gold); anything else keeps the neutral dark rig
export function moodFor(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), L = 0.2126 * r + 0.7152 * g + 0.0722 * b, sat = mx > 0 ? (mx - mn) / mx : 0;
  if (sat < 0.4 || L > 0.5) return null;
  let h = mx === r ? ((g - b) / (mx - mn)) * 60 : mx === g ? (2 + (b - r) / (mx - mn)) * 60 : (4 + (r - g) / (mx - mn)) * 60;
  h = (h + 360) % 360;
  return h >= 335 || h < 14 ? "night-red" : h >= 195 && h < 255 ? "blue-void" : null;
}

// THE HOLD: what a shot with `menace` does to the rig (calm menace against chaos): a tighter, darker world round a lit face, the rim from the
// power wider, depth of field behind the seal. Over the shot's own values; m.dark (0..1.5) scales how far the set drops.
export function withMenace(P, m) {
  const d = m.dark ?? 1, V = P.value;
  return merge(P, {
    value: { darks: Math.min(V.darks, 0.3) * (1 - 0.25 * d), ceil: Math.min(V.ceil ?? 1, 0.4) * (1 - 0.15 * d), sat: Math.min(V.sat ?? 1, 0.62), lift: Math.max(V.lift ?? 0, 0.34), body: Math.min(V.body ?? 1, 0.42), r: Math.min(V.r, 0.36), vig: Math.max(V.vig, 0.6) },
    hero: { cap: 0.96 }, dof: { amt: Math.max(P.dof.amt, 0.7) },
    rim: P.rim ? { amt: P.rim.amt * 1.25, w: P.rim.w * 1.25 } : P.rim,
    haze: { max: Math.min(P.haze.max, 0.3) },
  });
}

// the rig at clock t: the base, then every shot window and beat that holds t
export function photoAt(R, t) {
  let P = R;
  for (const s of R.shots) if (t >= s.t[0] && t < s.t[1]) { const { t: _t, ...o } = s; P = merge(P, o); }
  let flash = 0, col = null;
  for (const b of R.beats) {
    const a = t - b.t;
    if (a >= 0 && a < (b.dur ?? 0.3)) { const k = (1 - a / (b.dur ?? 0.3)) ** 2 * (b.flash ?? 1); if (k > flash) { flash = k; col = b.col ?? null; } }
  }
  return { P, beat: flash, beatCol: col };
}
export { lerp };
