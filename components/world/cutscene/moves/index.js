// Every place's move, one file each, loaded on demand: the prewarm (registerLoader) or Cutscene.jsx on mount (loadMove).
// A move gets the cutscene's props { card, place, tl, mode } and draws in 3D with the kit (../kit.jsx).
import { registerLoader } from "../prewarm";
import { cardFor } from "../../../../lib/world/cutscene/cards";

const LOAD = {
  "p-aether-lang": () => import("./p-aether-lang.jsx"),
  "p-resolvent": () => import("./p-resolvent.jsx"),
  "p-epsilon-hollow": () => import("./p-epsilon-hollow.jsx"),
  "spawn-seal": () => import("./spawn-seal.jsx"),
  "p-caustic": () => import("./p-caustic.jsx"),
  "p-monodromy": () => import("./p-monodromy.jsx"),
  "p-topological-ml-toolkit": () => import("./p-topological-ml-toolkit.jsx"),
  "p-faraday": () => import("./p-faraday.jsx"),
  "p-nerve": () => import("./p-nerve.jsx"),
  "p-separatrix": () => import("./p-separatrix.jsx"),
  "p-planimeter": () => import("./p-planimeter.jsx"),
  "p-tangle": () => import("./p-tangle.jsx"),
  "pr-mujoco-3396": () => import("./pr-mujoco-3396.jsx"),
  "pr-mujoco-warp-1541": () => import("./pr-mujoco-warp-1541.jsx"),
  "pr-mujoco-3450": () => import("./pr-mujoco-3450.jsx"),
  "pr-highway-3244": () => import("./pr-highway-3244.jsx"),
  "pr-xnnpack-10801": () => import("./pr-xnnpack-10801.jsx"),
  "pr-tensorflow-124410": () => import("./pr-tensorflow-124410.jsx"),
  "pr-nemo-relay-481": () => import("./pr-nemo-relay-481.jsx"),
  "pr-triton-kernels-22": () => import("./pr-triton-kernels-22.jsx"),
  "pr-openxla-46539": () => import("./pr-openxla-46539.jsx"),
  "pr-topograph-432": () => import("./pr-topograph-432.jsx"),
  "pr-pyrefly-4180": () => import("./pr-pyrefly-4180.jsx"),
  "pr-polychrom-79": () => import("./pr-polychrom-79.jsx"),
  "home": () => import("./home.jsx"),
};

const LOADED = {};
const PENDING = {};
export const getMove = (id) => LOADED[id] ?? null;
export function loadMove(id) {
  if (LOADED[id]) return Promise.resolve(LOADED[id]);
  if (!LOAD[id]) return Promise.reject(new Error(`no move ${id}`));
  return (PENDING[id] ??= LOAD[id]().then((m) => (LOADED[id] = m.default), (e) => { delete PENDING[id]; throw e; }));
}
// a group dock's card plays another dock's scene (its move is loaded under that id), so it registers no loader
for (const id of Object.keys(LOAD)) if (!cardFor(id)?.plays) registerLoader(id, () => loadMove(id));
