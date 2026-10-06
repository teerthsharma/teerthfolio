// Public stack API. Parent owns this file. Teams extend sibling files only.

export {
  STASH_IDS,
  ALU_BUDGET,
  PREFETCH_BUDGET,
  CORE_CHUNKS,
  CHUNK_SHAPE,
  freezeChunk,
  permKey,
  holdTime,
} from "./law.js";

export { CHUNK_LIST, CHUNKS, CHUNK_IDS, chunkById } from "./chunks.js";
export { pickChunks, kitsOf, byStash, loadChunks } from "./load.js";
export { extrasFor, planDock, DOCK_FAMILIES, PLANNED_DOCKS } from "./plan.js";
export {
  programKey,
  cacheGet,
  cacheSet,
  cacheClear,
  cacheSize,
  loadCached,
  khrParallel,
  programReady,
  neighborsOf,
  prefetchPlans,
  idleWarm,
  KHR_PARALLEL,
  COMPLETION_STATUS_KHR,
} from "./opt.js";
export { GENSHIN_GLSL } from "./genshin.glsl.js";
export { genshinKit, STACK_KITS, STACK_KIT_COUNT } from "./kits.js";

import { loadCached } from "./opt.js";
import { planDock } from "./plan.js";

export function stackForDock(dock, opts = {}) {
  const plan = planDock(dock, opts);
  const packed = loadCached(dock, opts);
  return Object.freeze({ plan, packed });
}
