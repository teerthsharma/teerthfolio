import { signFor } from "./seal-signs.js";
import { cameraFor } from "./seal-camera.js";

const brown = { preset: "forelock", color: { base: "#4a3224", shade: "#241812", hi: "#8a6a50" } };
const gold = { preset: "forelock", color: { base: "#d4b45a", shade: "#8a6a28", hi: "#f0e0a0" } };
const white = { preset: "slick", color: { base: "#e8e4dc", shade: "#9aa0b0", hi: "#f4f0ea" } };
const black = (preset = "spiky") => ({ preset, color: { base: "#1a1820", shade: "#0a0810", hi: "#4a4658" } });

export const FOUNDER = { morph: { tuft: 0 } };
export const ME = FOUNDER;

export function mergeMe(o = {}) {
  if (!o || o.locked) return o;
  return { ...o, morph: { tuft: 0, ...(o.morph ?? {}) } };
}

export const SEAL_LOOKS = {
  "pr-mujoco-3396": {
    story: "survey cloak on fresco gold",
    layers: [{ type: "cloak", col: "#3f5c3c", shade: "#1e3020", len: 0.9, collar: true, clasp: "#d6c070" }, { type: "uniform", col: "#8a6a44", shade: "#4a3822", buttons: "#cfcfcf" }],
    hair: "swept",
    weapon: { kind: "sword", hand: "r", tilt: [0, -0.5] },
  },
  "pr-mujoco-warp-1541": {
    story: "pale tyrant, still a pear",
    layers: [{ type: "cloak", col: "#6a3a88", shade: "#2a1040", len: 0.85, collar: "high", trim: "#d4b050" }],
    hair: { preset: "slick", color: { base: "#c8b8d0", shade: "#6a5a78", hi: "#e8dce8" } },
    hat: { kind: "horns", col: "#e8e0d0" },
  },
  "pr-mujoco-3450": {
    story: "yellow cape",
    layers: [{ type: "cape", col: "#d8b84a", shade: "#8a6a18", trim: "#f0d070" }, { type: "uniform", col: "#eceae2", shade: "#9aa0c0" }],
    hair: "slick",
  },
  "spawn-seal": {
    story: "slime-told, not a human",
    layers: [{ type: "cloak", col: "#3a6a88", shade: "#143040", len: 0.7, trim: "#7ec8e8" }],
    hair: { preset: "bob", color: { base: "#6ec8e0", shade: "#2a6a80", hi: "#c8f0ff" } },
    eyes: { style: "round", iris: "#3a88aa" },
    expr: "calm",
    sign: "clap",
  },
  "p-faraday": {
    story: "gakuran fringe",
    layers: [{ type: "uniform", col: "#232f52", shade: "#0e1428", buttons: "#d8bd50" }],
    hair: brown,
  },
  "pr-polychrom-79": {
    story: "gold king",
    layers: [{ type: "armour", col: "#d9a441", shade: "#8a6020", trim: "#f0d070" }, { type: "cape", col: "#b02838", shade: "#601018", trim: "#f0d070" }],
    hair: gold,
    hat: { kind: "crown" },
  },
  "p-resolvent": {
    story: "elf wash",
    layers: [{ type: "cloak", col: "#3a2a6a", shade: "#150c32", len: 1, collar: "high", trim: "#d6a840" }],
    hair: { preset: "long", color: { base: "#e8d8a0", shade: "#a09060", hi: "#f4ecd0" } },
    hat: { kind: "pointed" },
    weapon: { kind: "staff", hand: "r" },
  },
  "p-planimeter": {
    story: "sit fringe half-lid red blazer",
    layers: [{ type: "uniform", col: "#b83a4b", shade: "#5a1820", collar: "#f4e7cc", buttons: "#d8bd50" }],
    hair: brown,
    eyes: { style: "tareme", iris: "#3a2a24" },
    expr: "calm",
    exprK: 1,
  },
  "pr-nemo-relay-481": {
    story: "silver instinct",
    layers: [{ type: "sash", col: "#e8e4d8" }],
    hair: white,
    eyes: { style: "round", iris: "#c8d0e0" },
    expr: "awe",
  },
  "p-separatrix": {
    story: "gold life ladybug",
    layers: [{ type: "coat", col: "#e8dcc0", shade: "#8a7040", open: 0.06, trim: "#c02838", collar: true }],
    hair: gold,
  },
  "p-nerve": {
    story: "notebook roof",
    layers: [{ type: "coat", col: "#19171f", shade: "#08070c", open: 0.05 }],
    hair: black("slick"),
    weapon: { kind: "book", hand: "l" },
    expr: "calm",
  },
  "p-aether-lang": {
    story: "Gojeal in Muryokusho — Six Eyes, Infinity halt",
    layers: [{ type: "uniform", col: "#19171f", shade: "#0a0c12", collar: "high" }],
    hair: white,
    eyes: { style: "round", iris: "#7ec8ff" },
    expr: "calm",
    sign: "gojo",
  },
  "p-topological-ml-toolkit": {
    story: "white-eye city",
    layers: [{ type: "uniform", col: "#232f52", shade: "#0e1428", buttons: "#c8c8d0" }],
    hair: white,
    eyes: { style: "blank", iris: "#e8e4dc" },
  },
  home: {
    story: "jetty watercolour",
    layers: [{ type: "cloak", col: "#4a3a2a", shade: "#241810", len: 0.8, clasp: "#c4a46a" }],
    hair: brown,
  },
  "p-epsilon-hollow": {
    story: "red-cloud cloak tomoe",
    layers: [{ type: "cloak", col: "#16141c", shade: "#07060a", len: 1, collar: "high", trim: "#c02828", spread: 1.1 }],
    hair: black("slick"),
    hat: { kind: "kasa" },
    eyes: { style: "tomoe", iris: "#8a1018" },
  },
  "p-caustic": {
    story: "manhwa shrine",
    layers: [{ type: "coat", col: "#2a241f", shade: "#100e0c", open: 0.04 }, { type: "sash", col: "#e5142e" }],
    hair: black("spiky"),
    eyes: { style: "slit", iris: "#e5142e" },
    expr: "smug",
  },
  "p-monodromy": {
    story: "gold vessel",
    layers: [{ type: "cape", col: "#b02838", shade: "#601018", trim: "#f0d070" }, { type: "sash", col: "#d8bd50" }],
    hair: black("swept"),
    hat: { kind: "crown" },
  },
  "p-tangle": {
    story: "school dusk",
    layers: [{ type: "uniform", col: "#2a3a68", shade: "#101828", buttons: "#d8bd50" }],
    hair: brown,
    eyes: { style: "round", iris: "#3a2a6a" },
  },
  "pr-topograph-432": {
    story: "cartoon robe",
    layers: [{ type: "cloak", col: "#19171f", shade: "#08070c", len: 1, collar: "high", trim: "#c9a24a" }],
    hat: { kind: "pointed", col: "#19171f" },
    weapon: { kind: "staff", hand: "r" },
  },
  "pr-highway-3244": {
    story: "red conquest",
    layers: [{ type: "cape", col: "#b02838", shade: "#601018", trim: "#f0d070" }, { type: "armour", col: "#c4cad6", shade: "#6a7088" }],
    hair: { preset: "swept", color: { base: "#c45a28", shade: "#6a2810", hi: "#e8a060" } },
    hat: { kind: "crown" },
    weapon: { kind: "broadsword", hand: "r" },
  },
  "pr-triton-kernels-22": {
    story: "shrine ink",
    layers: [{ type: "coat", col: "#2a1814", shade: "#100808", open: 0.03 }],
    hair: black("spiky"),
    eyes: { style: "slit", iris: "#c02828" },
  },
  "pr-tensorflow-124410": {
    story: "Araki coat hat",
    layers: [{ type: "coat", col: "#19171f", shade: "#08070c", open: 0.05, collar: true }],
    hair: black("spiky"),
    hat: { kind: "top", col: "#19171f", trim: "#c0302c" },
  },
  "pr-openxla-46539": {
    story: "hero colours",
    layers: [{ type: "uniform", col: "#2a4a88", shade: "#102040", stripe: "#e8c040", buttons: "#e8c040" }],
    hair: brown,
  },
  "pr-pyrefly-4180": {
    story: "yellow flash",
    layers: [{ type: "cloak", col: "#e8c040", shade: "#8a6a10", len: 0.75, clasp: "#c4302b" }],
    hair: gold,
    hat: { kind: "headband", col: "#1d2a52", trim: "#c9ced8" },
  },
  "pr-xnnpack-10801": {
    story: "white haori glasses",
    layers: [{ type: "coat", col: "#eceae2", shade: "#9aa0c0", open: 0.07, trim: "#c8c4b8", collar: true }, { type: "sash", col: "#2a2833" }],
    hair: brown,
    accessories: [{ kind: "glasses" }],
    expr: "calm",
  },
};

export function lookFor(dock, override) {
  if (override === "locked") return null;
  const raw = override && typeof override === "object"
    ? override
    : (typeof override === "string" && SEAL_LOOKS[override]) || SEAL_LOOKS[dock];
  if (!raw) {
    return {
      ...FOUNDER,
      coat: "#7a6a58",
      shade: "#3a3228",
      ink: "#2a241c",
      sign: signFor(dock),
      camera: cameraFor(dock),
    };
  }
  return {
    ...raw,
    morph: { tuft: 0, ...(raw.morph ?? {}) },
    sign: raw.sign ?? signFor(dock),
    camera: raw.camera ?? cameraFor(dock),
  };
}
