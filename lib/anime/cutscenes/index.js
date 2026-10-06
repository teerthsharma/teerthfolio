// THE LAZY REGISTRY: one dynamic import per dock, split into scene.js and build.js, so a broken dock can never break
// another (a failed import rejects only that dock's promise), and a broken build.js still leaves the scene data readable.
// Lab route: /lab/anime?cut=<dock>&t=<s> (components/anime/CutLab.jsx). Production code imports THIS file only.
export const DOCKS = ["pr-mujoco-3396", "pr-mujoco-warp-1541", "pr-mujoco-3450", "spawn-seal", "p-faraday", "pr-polychrom-79", "p-resolvent", "p-planimeter", "pr-nemo-relay-481", "p-separatrix", "p-nerve", "p-aether-lang", "p-topological-ml-toolkit", "home", "p-epsilon-hollow", "p-caustic", "p-monodromy", "p-tangle", "pr-topograph-432", "pr-highway-3244", "pr-triton-kernels-22", "pr-tensorflow-124410", "pr-openxla-46539", "pr-pyrefly-4180", "pr-xnnpack-10801"];
export const ANIME = {
  "pr-mujoco-3396": "Attack on Titan, the Rumbling (Renaissance)",
  "pr-mujoco-warp-1541": "Dragon Ball Z, Frieza",
  "pr-mujoco-3450": "One Punch Man",
  "spawn-seal": "Tensura, Rimuru (seal to human)",
  "p-faraday": "A Certain Scientific Railgun",
  "pr-polychrom-79": "Fate, Gilgamesh: Gate of Babylon",
  "p-resolvent": "Frieren vs Aura",
  "p-planimeter": "Classroom of the Elite (PR duel)",
  "pr-nemo-relay-481": "Dragon Ball Super, Ultra Instinct",
  "p-separatrix": "JoJo, Golden Wind",
  "p-nerve": "Death Note",
  "p-aether-lang": "Jujutsu Kaisen, Gojo: Hollow Purple",
  "p-topological-ml-toolkit": "Index, Accelerator vs Kakine",
  "home": "Vinland Saga, Thors",
  "p-epsilon-hollow": "Naruto, Itachi and Tsukuyomi (graveyard planet)",
  "p-caustic": "Naruto, Madara: blue Susanoo (PROTECTED)",
  "p-monodromy": "Magi, Sinbad: Baal",
  "p-tangle": "Your Name",
  "pr-topograph-432": "Overlord, Ainz (cartoon)",
  "pr-highway-3244": "Fate/Zero, Iskandar",
  "pr-triton-kernels-22": "Jujutsu Kaisen, Sukuna: Malevolent Shrine (PROTECTED)",
  "pr-tensorflow-124410": "JoJo Part 3, DIO: MUDA",
  "pr-openxla-46539": "My Hero Academia",
  "pr-pyrefly-4180": "Naruto, Nine-Tails and Minato",
  "pr-xnnpack-10801": "Bleach, Aizen (PROTECTED)",
};

// import specifiers must be literal strings so the bundler splits each dock into its own chunk
const LOADERS = {
  "pr-mujoco-3396": { scene: () => import("./pr-mujoco-3396/scene.js"), build: () => import("./pr-mujoco-3396/build.js") },
  "pr-mujoco-warp-1541": { scene: () => import("./pr-mujoco-warp-1541/scene.js"), build: () => import("./pr-mujoco-warp-1541/build.js") },
  "pr-mujoco-3450": { scene: () => import("./pr-mujoco-3450/scene.js"), build: () => import("./pr-mujoco-3450/build.js") },
  "spawn-seal": { scene: () => import("./spawn-seal/scene.js"), build: () => import("./spawn-seal/build.js") },
  "p-faraday": { scene: () => import("./p-faraday/scene.js"), build: () => import("./p-faraday/build.js") },
  "pr-polychrom-79": { scene: () => import("./pr-polychrom-79/scene.js"), build: () => import("./pr-polychrom-79/build.js") },
  "p-resolvent": { scene: () => import("./p-resolvent/scene.js"), build: () => import("./p-resolvent/build.js") },
  "p-planimeter": { scene: () => import("./p-planimeter/scene.js"), build: () => import("./p-planimeter/build.js") },
  "pr-nemo-relay-481": { scene: () => import("./pr-nemo-relay-481/scene.js"), build: () => import("./pr-nemo-relay-481/build.js") },
  "p-separatrix": { scene: () => import("./p-separatrix/scene.js"), build: () => import("./p-separatrix/build.js") },
  "p-nerve": { scene: () => import("./p-nerve/scene.js"), build: () => import("./p-nerve/build.js") },
  "p-aether-lang": { scene: () => import("./p-aether-lang/scene.js"), build: () => import("./p-aether-lang/build.js") },
  "p-topological-ml-toolkit": { scene: () => import("./p-topological-ml-toolkit/scene.js"), build: () => import("./p-topological-ml-toolkit/build.js") },
  "home": { scene: () => import("./home/scene.js"), build: () => import("./home/build.js") },
  "p-epsilon-hollow": { scene: () => import("./p-epsilon-hollow/scene.js"), build: () => import("./p-epsilon-hollow/build.js") },
  "p-caustic": { scene: () => import("./p-caustic/scene.js"), build: () => import("./p-caustic/build.js") },
  "p-monodromy": { scene: () => import("./p-monodromy/scene.js"), build: () => import("./p-monodromy/build.js") },
  "p-tangle": { scene: () => import("./p-tangle/scene.js"), build: () => import("./p-tangle/build.js") },
  "pr-topograph-432": { scene: () => import("./pr-topograph-432/scene.js"), build: () => import("./pr-topograph-432/build.js") },
  "pr-highway-3244": { scene: () => import("./pr-highway-3244/scene.js"), build: () => import("./pr-highway-3244/build.js") },
  "pr-triton-kernels-22": { scene: () => import("./pr-triton-kernels-22/scene.js"), build: () => import("./pr-triton-kernels-22/build.js") },
  "pr-tensorflow-124410": { scene: () => import("./pr-tensorflow-124410/scene.js"), build: () => import("./pr-tensorflow-124410/build.js") },
  "pr-openxla-46539": { scene: () => import("./pr-openxla-46539/scene.js"), build: () => import("./pr-openxla-46539/build.js") },
  "pr-pyrefly-4180": { scene: () => import("./pr-pyrefly-4180/scene.js"), build: () => import("./pr-pyrefly-4180/build.js") },
  "pr-xnnpack-10801": { scene: () => import("./pr-xnnpack-10801/scene.js"), build: () => import("./pr-xnnpack-10801/build.js") },
};

export const hasCut = (id) => Object.prototype.hasOwnProperty.call(LOADERS, id);

// -> { id, scene, build, error }. `scene` is the default export of scene.js (or null), `build` of build.js (or null);
// `error` is the first import failure as { file, message } so the caller can show it without losing the other half.
export async function loadCut(id) {
  if (!hasCut(id)) throw new Error(`no cutscene "${id}" (have ${DOCKS.length}: ${DOCKS.join(", ")})`);
  const out = { id, scene: null, build: null, error: null };
  try { out.scene = (await LOADERS[id].scene()).default; } catch (e) { out.error = { file: `${id}/scene.js`, message: String(e?.stack ?? e) }; console.error(`[cut ${id}] scene.js failed to load:`, e); }
  try { out.build = (await LOADERS[id].build()).default; } catch (e) { out.error ??= { file: `${id}/build.js`, message: String(e?.stack ?? e) }; console.error(`[cut ${id}] build.js failed to load:`, e); }
  return out;
}
