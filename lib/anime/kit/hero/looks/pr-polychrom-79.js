// LOOK pr-polychrom-79: the seal as Gilgamesh (Fate/Zero, Ufotable). Blond hair swept up in flame spikes with a forelock,
// half-lidded crimson slit eyes with a smirk, the broad gold collar, a gold chest plate over a violet bib, gold bracers and
// ear studs. Nothing is held. After 17.6 s the cutscene calls the "gil-red" variant (iris and catch-light go #ff2a3a).
import { variant } from "./_merge.js";
import { HERO_EXPRESSIONS } from "../motion.js";

const GOLD = "#c89a30", GOLD_SH = "#6a3a08", GOLD_HI = "#fadf92";

const base = {
  fur: { coat: "#86aad6", shade: "#7d9dc7", belly: "#f8eee0", bellyShade: "#d3e2f1", nose: "#2a2030", ink: "#5a3a10", blush: null, poreCol: "#6b5a5a" },
  eyes: { style: "tsurime", iris: "#d83a28", iris2: "#7a0c09", pupil: "slit", size: 0.95, lash: "#3a1a10" },
  brows: { col: "#8a6a28", thick: 1.1 },
  mouth: { rest: "smile", sharp: 0.3 },
  hair: { preset: "flame", col: "#e9d08c", shade: "#a8843a", hi: "#fff0b8", seed: 33, n: 9, length: 0.6, volume: 0.9, fringe: 3, cap: { front: 0.9, back: 1.7, zig: 0.1, n: 9 } },
  marks: [
    { kind: "dot", at: [-0.22, -0.28], w: 0.006, col: "#6b5a5a" }, { kind: "dot", at: [-0.3, -0.34], w: 0.005, col: "#6b5a5a" }, { kind: "dot", at: [-0.14, -0.36], w: 0.005, col: "#6b5a5a" },
    { kind: "dot", at: [0.22, -0.28], w: 0.006, col: "#6b5a5a" }, { kind: "dot", at: [0.3, -0.34], w: 0.005, col: "#6b5a5a" }, { kind: "dot", at: [0.14, -0.36], w: 0.005, col: "#6b5a5a" },
  ],
  acc: [{ kind: "studs", col: GOLD_HI, shade: GOLD_SH }],
  outfit: [
    { kind: "vest", col: "#3d2a5a", shade: "#2a1d44", ink: "#3a2a4a", collar: "open" },
    { kind: "plate", col: GOLD, shade: GOLD_SH, lo: 0.3 },
    { kind: "collar", col: GOLD, shade: GOLD_SH },
    { kind: "bracers", col: GOLD, shade: GOLD_SH },
  ],
  hands: { kind: "flipper" },
  extras() { Object.assign(HERO_EXPRESSIONS, expressions); return []; },
};
export default base;

export const red = variant(base, { eyes: { iris: "#ff2a3a", iris2: "#a0101a", glow: 0.35 } });

export const expressions = {
  // half-lidded, one notch of smile: the king amused
  "gil-smirk": { eyes: "smug", brow: [0.05, 0.003], mouth: ["smile", 0.8], adj: { lid: 0.35, open: -0.05 }, head: { rz: 0.06 } },
  // lids up, eyes wide and sharp, mouth set
  "gil-sharp": { eyes: "determined", brow: [-0.12, 0.004], mouth: ["closed", 0.5], adj: { lid: 0.0, open: 0.08 } },
  // the bark at 17.6 s
  "gil-bark": { eyes: "rage", brow: [-0.15, 0.004], mouth: ["open", 0.8], adj: { lid: 0.1 } },
};
