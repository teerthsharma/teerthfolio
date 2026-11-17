// Which docks the visitor's first arrival plays on the anime engine (engine-design.md section 2).
// ENGINE_LIVE holds the docks the owner has approved by eye; every other dock keeps its R3F move.
// ?engine=<id>[,<id>] | all previews engine docks, ?engine=none forces every R3F move.
export const ENGINE_DOCKS = ["pr-anyps5-12609", "pr-tensorflow-128930", "p-asmodeus", "the-loop", "home", "p-aether-lang", "p-caustic", "p-epsilon-hollow", "p-faraday", "p-monodromy", "p-nerve", "p-planimeter", "p-resolvent", "p-separatrix", "p-tangle", "p-topological-ml-toolkit", "pr-highway-3244", "pr-mujoco-3396", "pr-nemo-relay-481", "pr-openxla-46539", "pr-polychrom-79", "pr-pyrefly-4180", "pr-tensorflow-124410", "pr-topograph-432", "pr-triton-kernels-22", "pr-xnnpack-10801", "spawn-seal"];
export const ENGINE_LIVE = new Set([
  "pr-triton-kernels-22", "pr-pyrefly-4180", "pr-mujoco-3396", "pr-openxla-46539", "p-planimeter", "p-nerve", "home", "pr-highway-3244",
  "p-caustic", "p-tangle", "pr-nemo-relay-481", "pr-polychrom-79", "pr-anyps5-12609", "pr-tensorflow-124410", "pr-tensorflow-128930",
]);

let memo = [null, []];
const query = (search) => (memo[0] === search ? memo[1] : (memo = [search, new URLSearchParams(search).get("engine")?.split(",") ?? []])[1]);

export function engineOwns(id, search = typeof location === "undefined" ? "" : location.search) {
  if (!ENGINE_DOCKS.includes(id)) return null;
  const q = query(search);
  if (q.includes("none")) return null;
  return ENGINE_LIVE.has(id) || q.includes("all") || q.includes(id) ? id : null;
}

// the engine plays this arrival (fail: ui.engineFail), so every R3F consumer of the cutscene stands down
export const engineActive = (id, fail, search) => !fail?.[id] && engineOwns(id, search) !== null;
