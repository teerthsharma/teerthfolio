// THE STAGE'S INKS: one palette per place, the approved Aether-Lang domain's
// night turned round the colour wheel to the place's hue. Lightness and
// saturation stay the domain's, so every stage is the same deep night with a
// pale core, only in its own colour. Pure; Stage.jsx, Speaker.jsx and the
// comic layer (ui/Bubbles.jsx) read it.

import { PLACE_BY_ID } from "../places.js";

// The domain's own inks (sRGB 0..1, as the shaders were tuned), at hue 256.
export const BASE_HUE = 256;
const BASE = {
  night: [0.035, 0.026, 0.1], // the backdrop, low
  nightHigh: [0.012, 0.01, 0.04], // and overhead
  halo: [0.16, 0.1, 0.32], // the glow round the core
  dots: [0.3, 0.22, 0.55], // the halftone in the halo's falloff
  core: [0.92, 0.86, 1.0], // the light behind the pup
  fresnel: [0.5, 0.35, 0.85], // the sphere's edge, seen from outside as it swells
  pool: [0.6, 0.5, 0.95], // the halftone light pool under the speaker
  disc: [0.62, 0.48, 1.0], // the glow the pup stands on
  ink: "#22163f", // the speaker's body
  rim: "#e9deff", // its rim light
  star: ["#fbfaf7", "#d8c8ff", "#bcd6ee"], // three star tints, cream stays cream
  deep: "#1d1240", // the impact frame's paper (CSS)
  paperDots: "#cebaff", // its halftone (CSS)
};

const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const rgb2hex = (c) => `#${c.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0")).join("")}`;

export function hueOf(hex) {
  const [r, g, b] = hex2rgb(hex);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d === 0) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

// Turn an sRGB triple round the wheel by `deg`, keeping HSL lightness and saturation.
function turn([r, g, b], deg) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [r, g, b];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (((h * 60 + deg) % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r1, g1, b1] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [r1 + m, g1 + m, b1 + m];
}

// The place's stage colour: the card's `stage.color`, else its radiation, else its own colour.
export const accentFor = (card, place) => card.stage?.color ?? place.radiation ?? place.color ?? "#e94bff";

const PALETTES = new Map();
export function paletteFor(card) {
  let p = PALETTES.get(card);
  if (p) return p;
  const place = PLACE_BY_ID[card.id];
  const hue = card.stage?.hue ?? hueOf(accentFor(card, place));
  const deg = hue - BASE_HUE;
  // at the base hue the domain's inks pass through untouched (Aether-Lang's approved frames)
  const tri = (c) => (deg === 0 ? c : turn(c, deg));
  const hex = (h) => (deg === 0 ? h : rgb2hex(turn(hex2rgb(h), deg)));
  p = {};
  for (const [k, v] of Object.entries(BASE)) p[k] = Array.isArray(v) && typeof v[0] === "number" ? tri(v) : Array.isArray(v) ? [v[0], ...v.slice(1).map(hex)] : hex(v);
  // a card may set any shader ink outright (sRGB 0..1): a pastel dusk instead of the deep night
  Object.assign(p, card.stage?.inks);
  p.accent = accentFor(card, place); // the onomatopoeia and the impact ring's plate
  PALETTES.set(card, p);
  return p;
}

// THE FILM GRADE (components/world/look/FilmEffect.js): lift (shadows),
// gamma, gain (highlights), vignette, grain and lens fringe, linear light.
// The island rests on a light grade; a pocket tints its shadows with its own
// night and its highlights with its accent. A card may set any field outright
// (`grade: { vignette: 0.5 }`). Cards whose look is locked by the owner (the
// Sukuna and Aizen docks) keep their colours: only the frame's edges (vignette,
// grain) are shared. Pure.
export const GRADE_ISLAND = { lift: [0, 0, 0], gamma: [1, 1, 1], gain: [1, 1, 1], vignette: 0.2, grain: 0.03, fringe: 0.0012 };
const LOCKED = new Set(["p-caustic", "pr-xnnpack-10801"]);
const mixc = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
export function gradeFor(card) {
  if (!card) return GRADE_ISLAND;
  const base = { ...GRADE_ISLAND, vignette: 0.32, grain: 0.045, fringe: 0.002 };
  if (!LOCKED.has(card.id)) {
    const p = paletteFor(card);
    base.lift = p.night.map((v) => v * 0.12);
    base.gain = mixc([1.03, 1.03, 1.03], hex2rgb(p.accent), 0.1).map((v) => Math.min(1.12, v * 1.02));
    base.gamma = [0.98, 0.98, 0.98];
  }
  return { ...base, ...card.grade };
}
