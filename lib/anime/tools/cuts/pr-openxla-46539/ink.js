// The live press inks for shader pulls. Every constant colour in a pulled GLSL is printed in the page's own inks: the packet's
// colours go to their role, any other constant colour to its nearest printed ink. Rows: print.js TABLE (C, M, Y, K tones),
// the inkPrint multiply model, K mixed last. Callers: `await loadInkPacks()` once, then `inked(["mhaRain"])` (synchronous).
import { glslFor } from "../../index.js";
import { fnClashes, loadPack } from "../../packs.js";

export const INK_PACKS = ["cuts", "shonen", "gold", "occlude", "other", "basic", "print"];
export const loadInkPacks = async () => { for (const p of INK_PACKS) await loadPack(p); };
export const clashes = (names) => fnClashes(names);

const PAPER = [0.97, 0.94, 0.86], INK_C = [0, 0.62, 0.88], INK_M = [0.93, 0.16, 0.54], INK_Y = [1, 0.89, 0.1], INK_K = [0.07, 0.055, 0.1];
const ROW = {
  wallA: [0.9, 0.5, 0, 0.12], wallB: [0.55, 0.9, 0, 0.15], wallC: [0.85, 0.2, 0.35, 0.18], wallD: [0, 0.85, 0.8, 0.2],
  road: [0.62, 0.52, 0, 0.42], walk: [0.5, 0.36, 0.12, 0.2], roof: [0.5, 0.4, 0, 0.55], rubble: [0.3, 0.45, 0.45, 0.45],
  sinter: [0, 0.18, 0.82, 0], heat: [0, 0.62, 1, 0], lamp: [0, 0.06, 1, 0], pole: [0.35, 0.35, 0, 0.85], nomu: [0.4, 0.38, 0, 0.8],
  brain: [0, 0.69, 0.48, 0], red: [0, 1, 0.95, 0], blue: [1, 0.7, 0, 0.08], paper: [0, 0, 0.05, 0], gold: [0, 0.25, 1, 0],
  ember: [0, 0.8, 1, 0.08], civ: [0.45, 0.4, 0, 0.8], flag: [0, 1, 0.95, 0], steel: [0.45, 0.25, 0, 0.5],
  K: [0, 0, 0, 1], C: [1, 0, 0, 0], M: [0, 1, 0, 0], Y: [0, 0, 1, 0],
};
const ROLE = {
  skyD: "K", skyL: "wallA", cloud: "wallB", rubble: "rubble", ink: "K", rib: "paper", rain: "paper", glow: "paper", core: "paper",
  white: "paper", orange: "heat", redk: "red", dust1: "road", dust2: "walk", dust3: "paper", shLo: "K", shHi: "walk", body: "blue",
  blue: "blue", blueS: "K", red: "red", redS: "wallD", hair: "gold", hairS: "roof", lens: "K", iris: "blue", cyan: "C", brow: "roof",
};
const PACKET_HEX = {
  skyD: "#121632", skyL: "#222952", cloud: "#4a4f68", rubble: "#0e0a10", ink: "#12070a", rib: "#c8d4ec", rain: "#8f9ab8", glow: "#d5c795",
  core: "#edf2e3", orange: "#ff8a20", redk: "#3a0a10", white: "#e8ebdc", dust1: "#575b72", dust2: "#84889d", dust3: "#9ea2b4", shLo: "#0c0a14",
  shHi: "#a1a4b6", body: "#86aad6", blue: "#162a6a", blueS: "#0c173b", red: "#c02a30", redS: "#6b171b", hair: "#e6c84a", hairS: "#817029",
  lens: "#20232c", iris: "#2f7fd0", cyan: "#7fe8ff", brow: "#817029",
};

const mix = (a, b, t) => a + (b - a) * t;
const printed = ([c, m, y, k]) => PAPER.map((p, i) => mix(p * mix(1, INK_C[i], c) * mix(1, INK_M[i], m) * mix(1, INK_Y[i], y), INK_K[i], k));
const STEPS = [0, 0.25, 0.5, 0.75, 1];
const GAMUT = STEPS.flatMap((c) => STEPS.flatMap((m) => STEPS.flatMap((y) => STEPS.map((k) => printed([c, m, y, k])))));
const dist = (a, b) => a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0);
const nearest = (v) => GAMUT.reduce((best, rgb) => (dist(rgb, v) < dist(best, v) ? rgb : best), GAMUT[0]);
const keyOf = (hex) => { const n = parseInt(hex.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255].join(","); };
const BY_KEY = new Map(Object.entries(PACKET_HEX).map(([name, hex]) => [keyOf(hex), printed(ROW[ROLE[name]])]));
const LITERAL = /vec3\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\)/g;
const LUMA = (a, b, c) => a === "0.2126" && b === "0.7152" && c === "0.0722";

const fmt = (rgb) => `vec3(${rgb.map((x) => x.toFixed(4)).join(", ")})`;

export function recolour(glsl) {
  return glsl.replace(LITERAL, (lit, a, b, c) => {
    const v = [a, b, c].map(Number);
    if (v.some((x) => x > 1) || LUMA(a, b, c)) return lit;
    if (v.every((x) => x === 0) || v.every((x) => x === 1)) return lit;
    const hit = BY_KEY.get(v.map((x) => Math.round(x * 255)).join(","));
    return fmt(hit ?? nearest(v));
  });
}

export function inked(names) {
  return recolour(glslFor(names));
}
