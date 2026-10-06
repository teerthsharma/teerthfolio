// pr-tensorflow-124410 CAST: costume DATA for costumed-seal-kit (bible 4). Hex values are the bible's. Pure data plus two small prop builders.
// Every victim is a small SEAL (locked proportions) in a costume: the Jotaro seal and six Cairo bystander seals.
import { PUP_HEAD2 } from "../../../pup.js";

// Jotaro: black long coat #0a0a12 (lit step #1c1c30) with gold buttons #ffe27a, a gold chain #ffe27a; eyes teal-black under the cap brim, a stoic frown
export const JOTARO = () => ({
  scale: 0.5,                                    // multiplied by the hero scale S in jotaro.js (0.9 m against the hero's 1.8 m)
  layers: [
    { type: "coat", col: "#1c1c30", shade: "#0a0a12", open: 0.02, trim: "#05020a", collar: true },        // the long coat (gakuran, open skirt)
    { type: "uniform", col: "#1c1c30", shade: "#0a0a12", buttons: "#ffe27a", collar: "#1c1c30" },          // the closed jacket: gold button column and stand collar
  ],
  eyes: { style: "tsurime", iris: "#1f6a6a", irisLo: "#08242a", lash: "#05020a" },
  ink: "#05020a",
});
// the 3-clumps-a-side black hair under the cap (hair-clump-kit), teal-black highlight
export const JOTARO_HAIR = (kit, side) => kit.defineHair("bob", {
  band: [0.95, 1.32], sector: side > 0 ? [1.1, 2.5] : [-2.5, -1.1], count: 3, layers: 1, length: [0.1, 0.2], width: 0.075, lift: 0.3, sweep: [side * 0.1, -0.3, 0], droop: 0.25, spike: 0.3,
  seed: side > 0 ? 3 : 4, color: { base: "#101018", shade: "#05050a", hi: "#2a5a6a" }, cut: { at: [0.4, 0.7], slant: 0.1, rate: 0.8 },
});

// the six Cairo bystanders: linen tunic #d8c8a0 (shadow #9a8a64), a headscarf in a different dusty gold #c8a060, a basket; each a different fur tint
const darker = (hex, k) => { const n = parseInt(hex.slice(1), 16); return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(c * k).toString(16).padStart(2, "0")).join("")}`; };
const FURS = ["#8e8c91", "#a39a8c", "#7d8190", "#9a8f86", "#8a8d82", "#a09aa0"];
const SCARVES = ["#c8a060", "#b8884a", "#d4ae70", "#c09450", "#caa868", "#b88a52"];
const TUNICS = ["#d8c8a0", "#d0be94", "#e0d0a8", "#d8c8a0", "#cfc09a", "#dccca4"];
const IRIS = ["#4a3020", "#2a3a2a", "#3a2a40", "#4a3a20", "#2a2a3a", "#4a2a2a"];
export const BYSTANDERS = () => FURS.map((fur, i) => ({
  id: `bystander-${i + 1}`,
  scale: 0.45 + 0.02 * ((i * 7) % 3),
  // dam-local start (hero units: x right, z forward); beside and just behind the hero's flanks, fleeing away from it
  pos: [[-2.1, 0.3], [2.3, 0.5], [-2.8, -0.6], [1.9, -0.8], [-1.7, 1.0], [2.9, 1.0]][i],
  spec: {
    coat: fur, shade: darker(fur, 0.78),
    layers: [{ type: "coat", col: TUNICS[i], shade: "#9a8a64", open: 0.0, trim: "#b8a478" }, { type: "sash", col: "#8a6a3a", shade: "#5a4220" }, { type: "scarf", col: SCARVES[i], shade: darker(SCARVES[i], 0.6) }],
    hat: { kind: "headband", col: SCARVES[i], trim: SCARVES[i] },                                          // the headscarf
    eyes: { style: "round", iris: IRIS[i], irisLo: darker(IRIS[i], 0.5) },
  },
}));
export const HEAD = { c: PUP_HEAD2.pos, r: [0.27, 0.245, 0.255] };
