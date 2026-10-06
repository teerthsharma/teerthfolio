// Calculated per-dock permutation. CORE lighting always. Family extras next.
// Budget drop happens in load.js, not here.

import { CORE_CHUNKS, ALU_BUDGET } from "./law.js";

const SCHOOL = Object.freeze(["fluoro", "paper", "hold", "print"]);
const JOJO = Object.freeze(["hatch", "print", "invert"]);
const FATE = Object.freeze(["gold", "emit", "paper"]);
const MYTH = Object.freeze(["night", "emit", "invert"]);
const MANHWA = Object.freeze(["grey", "hatch", "night"]);
const GHIBLI = Object.freeze(["wash", "paper"]);
const HERO = Object.freeze(["benday", "emit", "print"]);
const BLEACH = Object.freeze(["night", "paper", "print"]);
const SLIME = Object.freeze(["emit", "wash", "paper"]);
const TV = Object.freeze(["gold", "night", "emit"]);

const FAMILY = Object.freeze({
  "_template": SCHOOL,
  home: GHIBLI,
  "p-aether-lang": Object.freeze(["night", "emit", "invert"]),
  "p-caustic": MANHWA,
  "p-epsilon-hollow": MYTH,
  "p-faraday": SCHOOL,
  "p-monodromy": FATE,
  "p-nerve": MYTH,
  "p-planimeter": SCHOOL,
  "p-separatrix": FATE,
  "p-tangle": SCHOOL,
  "p-resolvent": FATE,
  "p-topological-ml-toolkit": SCHOOL,
  "spawn-seal": SLIME,
  "pr-mujoco-3396": GHIBLI,
  "pr-mujoco-warp-1541": TV,
  "pr-mujoco-3450": HERO,
  "pr-polychrom-79": FATE,
  "pr-nemo-relay-481": HERO,
  "pr-topograph-432": TV,
  "pr-highway-3244": FATE,
  "pr-triton-kernels-22": MANHWA,
  "pr-tensorflow-124410": JOJO,
  "pr-openxla-46539": HERO,
  "pr-pyrefly-4180": HERO,
  "pr-xnnpack-10801": BLEACH,
});

export const DOCK_FAMILIES = FAMILY;

export function extrasFor(dock) {
  return FAMILY[dock] ?? SCHOOL;
}

export function planDock(dock, opts = {}) {
  const extras = extrasFor(dock);
  const more = opts.extra ?? [];
  const ids = [...CORE_CHUNKS, "paper", "hairRing", ...extras, ...more];
  return Object.freeze({
    dock: dock || "home",
    chunks: Object.freeze(ids),
    budget: opts.budget ?? ALU_BUDGET,
    fps: opts.fps ?? 12,
  });
}

export const PLANNED_DOCKS = Object.freeze(Object.keys(FAMILY));
