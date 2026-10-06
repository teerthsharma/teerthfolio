// Calculated per-dock extras. Family lock lives in plan.js — this file names the still.
// extra = family chunks beyond CORE, whitelist only. Island roaming seal never here.

const ALLOWED = Object.freeze([
  "paper", "hairRing", "print", "night", "gold", "hatch", "emit",
  "wash", "fluoro", "benday", "grey", "invert",
]);

const PASSES = Object.freeze([
  "paintWash", "printDot", "sakugaHold", "paperTooth", "filmGate",
  "multiplane", "holdTwos", "bookIn", "bookOut", "celBoil",
  "shaftUfo", "fluoroLerche", "washGhibli", "hatchAraki", "greyManhwa",
  "plasterFresco", "duskShinkai", "smearImpact", "analogWeave", "mappaDiff",
]);

const FAM = Object.freeze({
  "_template": "school",
  home: "ghibli",
  "p-aether-lang": "myth",
  "p-caustic": "manhwa",
  "p-epsilon-hollow": "myth",
  "p-faraday": "school",
  "p-monodromy": "fate",
  "p-nerve": "myth",
  "p-planimeter": "school",
  "p-separatrix": "fate",
  "p-tangle": "school",
  "p-resolvent": "fate",
  "p-topological-ml-toolkit": "school",
  "spawn-seal": "slime",
  "pr-mujoco-3396": "ghibli",
  "pr-mujoco-warp-1541": "tv",
  "pr-mujoco-3450": "hero",
  "pr-polychrom-79": "fate",
  "pr-nemo-relay-481": "hero",
  "pr-topograph-432": "tv",
  "pr-highway-3244": "fate",
  "pr-triton-kernels-22": "manhwa",
  "pr-tensorflow-124410": "jojo",
  "pr-openxla-46539": "hero",
  "pr-pyrefly-4180": "hero",
  "pr-xnnpack-10801": "bleach",
});

// 0 skin, 1 cloth, 2 metal, 3 hair, 4 leather — Genshin lightmap.a
const ROW = Object.freeze({
  "_template": 1,
  home: 1,
  "p-aether-lang": 1,
  "p-caustic": 4,
  "p-epsilon-hollow": 1,
  "p-faraday": 3,
  "p-monodromy": 1,
  "p-nerve": 4,
  "p-planimeter": 3,
  "p-separatrix": 1,
  "p-tangle": 1,
  "p-resolvent": 1,
  "p-topological-ml-toolkit": 3,
  "spawn-seal": 0,
  "pr-mujoco-3396": 1,
  "pr-mujoco-warp-1541": 1,
  "pr-mujoco-3450": 1,
  "pr-polychrom-79": 2,
  "pr-nemo-relay-481": 0,
  "pr-topograph-432": 1,
  "pr-highway-3244": 2,
  "pr-triton-kernels-22": 4,
  "pr-tensorflow-124410": 4,
  "pr-openxla-46539": 1,
  "pr-pyrefly-4180": 3,
  "pr-xnnpack-10801": 1,
});

const LOOK = Object.freeze({
  "_template": "navy cream classroom stub",
  home: "jetty watercolour",
  "p-aether-lang": "Unlimited Void: giant eye, white patches, Infinity halt",
  "p-caustic": "manhwa shrine LOW",
  "p-epsilon-hollow": "Mangekyo iris dusk",
  "p-faraday": "cyanotype classroom",
  "p-monodromy": "palace gold vessel",
  "p-nerve": "notebook roof dusk",
  "p-planimeter": "sit fringe half-lid red blazer",
  "p-separatrix": "fresco gold life",
  "p-tangle": "school dusk tubes",
  "p-resolvent": "courtyard gold wash",
  "p-topological-ml-toolkit": "white-eye overcast",
  "spawn-seal": "slime-told, not a human",
  "pr-mujoco-3396": "survey cloak fresco gold",
  "pr-mujoco-warp-1541": "pale tyrant boil",
  "pr-mujoco-3450": "yellow cape smash",
  "pr-polychrom-79": "gold king gates",
  "pr-nemo-relay-481": "silver instinct",
  "pr-topograph-432": "cartoon robe throne",
  "pr-highway-3244": "red conquest race",
  "pr-triton-kernels-22": "shrine ink",
  "pr-tensorflow-124410": "Araki coat hat",
  "pr-openxla-46539": "hero colours smash",
  "pr-pyrefly-4180": "yellow flash",
  "pr-xnnpack-10801": "white haori dusk",
});

const EXTRA = Object.freeze({
  school: Object.freeze(["fluoro", "paper", "print"]),
  jojo: Object.freeze(["hatch", "print", "invert"]),
  fate: Object.freeze(["gold", "emit", "paper"]),
  myth: Object.freeze(["night", "emit", "invert"]),
  manhwa: Object.freeze(["grey", "hatch", "night"]),
  ghibli: Object.freeze(["wash", "paper"]),
  hero: Object.freeze(["benday", "emit", "print"]),
  bleach: Object.freeze(["night", "paper", "print"]),
  slime: Object.freeze(["emit", "wash", "paper"]),
  tv: Object.freeze(["gold", "night", "emit"]),
});

const FPS = Object.freeze({
  school: 12,
  jojo: 8,
  fate: 24,
  myth: 12,
  manhwa: 8,
  ghibli: 24,
  hero: 12,
  bleach: 12,
  slime: 12,
  tv: 8,
});

const GFX = Object.freeze({
  school: Object.freeze(["fluoroLerche", "holdTwos", "paperTooth", "paintWash"]),
  jojo: Object.freeze(["hatchAraki", "printDot", "smearImpact", "sakugaHold", "paperTooth"]),
  fate: Object.freeze(["plasterFresco", "filmGate", "shaftUfo", "paintWash"]),
  myth: Object.freeze(["duskShinkai", "bookIn", "paperTooth", "sakugaHold"]),
  manhwa: Object.freeze(["greyManhwa", "analogWeave", "hatchAraki", "paperTooth"]),
  ghibli: Object.freeze(["washGhibli", "multiplane", "paperTooth", "paintWash"]),
  hero: Object.freeze(["printDot", "smearImpact", "sakugaHold", "paperTooth"]),
  bleach: Object.freeze(["duskShinkai", "filmGate", "paperTooth", "sakugaHold"]),
  slime: Object.freeze(["washGhibli", "shaftUfo", "paperTooth", "multiplane"]),
  tv: Object.freeze(["mappaDiff", "celBoil", "filmGate", "paperTooth"]),
});

const GFX_MORE = Object.freeze({
  "p-faraday": Object.freeze(["sakugaHold"]),
  "p-planimeter": Object.freeze(["sakugaHold", "printDot"]),
  "p-tangle": Object.freeze(["sakugaHold"]),
  "p-topological-ml-toolkit": Object.freeze(["printDot"]),
  "p-aether-lang": Object.freeze(["mappaDiff", "smearImpact"]),
  "p-epsilon-hollow": Object.freeze(["filmGate"]),
  "p-nerve": Object.freeze(["filmGate"]),
  "p-monodromy": Object.freeze(["paperTooth"]),
  "p-separatrix": Object.freeze(["sakugaHold"]),
  "p-resolvent": Object.freeze(["paperTooth"]),
  "pr-polychrom-79": Object.freeze(["sakugaHold"]),
  "pr-highway-3244": Object.freeze(["smearImpact"]),
  "p-caustic": Object.freeze(["printDot"]),
  "pr-triton-kernels-22": Object.freeze(["filmGate"]),
  home: Object.freeze(["sakugaHold"]),
  "pr-mujoco-3396": Object.freeze(["filmGate"]),
  "pr-tensorflow-124410": Object.freeze(["filmGate"]),
  "pr-openxla-46539": Object.freeze(["paintWash"]),
  "pr-pyrefly-4180": Object.freeze(["filmGate"]),
  "pr-nemo-relay-481": Object.freeze(["paintWash"]),
  "pr-mujoco-3450": Object.freeze(["paintWash"]),
  "pr-xnnpack-10801": Object.freeze(["paintWash"]),
  "spawn-seal": Object.freeze(["paintWash"]),
  "pr-topograph-432": Object.freeze(["sakugaHold"]),
  "pr-mujoco-warp-1541": Object.freeze(["paintWash"]),
});

function extrasOf(family, row) {
  const out = [];
  const add = (id) => {
    if (!ALLOWED.includes(id) || out.includes(id)) return;
    out.push(id);
  };
  for (const id of EXTRA[family] ?? EXTRA.school) add(id);
  if (row === 3) add("hairRing");
  return Object.freeze(out);
}

function graphicsOf(id, family) {
  const base = GFX[family] ?? GFX.school;
  const more = GFX_MORE[id] ?? [];
  const out = [];
  for (const g of [...base, ...more]) {
    if (!PASSES.includes(g)) throw new Error(`dock ${id}: graphic ${g}`);
    if (!out.includes(g)) out.push(g);
  }
  if (out.length < 4 || out.length > 6) throw new Error(`dock ${id}: graphics ${out.length}`);
  return Object.freeze(out);
}

function record(id) {
  const family = FAM[id];
  if (!family) throw new Error(`dock ${id}: family`);
  const row = ROW[id];
  if (!(row >= 0 && row <= 4)) throw new Error(`dock ${id}: row ${row}`);
  const fps = FPS[family];
  if (fps !== 8 && fps !== 12 && fps !== 24) throw new Error(`dock ${id}: fps ${fps}`);
  const look = LOOK[id];
  if (!look) throw new Error(`dock ${id}: look`);
  return Object.freeze({
    id,
    family,
    row,
    extra: extrasOf(family, row),
    fps,
    graphics: graphicsOf(id, family),
    look,
  });
}

const ORDER = Object.freeze(Object.keys(FAM));

export const DOCKS = Object.freeze(Object.fromEntries(ORDER.map((id) => [id, record(id)])));

export function dockPlan(id) {
  return DOCKS[id] ?? DOCKS.home;
}

export const DOCK_IDS = Object.freeze(Object.keys(DOCKS));
if (DOCK_IDS.length !== 26) throw new Error(`docks: ${DOCK_IDS.length} != 26`);
