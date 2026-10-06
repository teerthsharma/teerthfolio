// Smooth load: permutation cache, KHR_parallel_shader_compile, idle prefetch.
// Never compile 1000 programs. Cache by permKey. Warm neighbors on idle.

import { PREFETCH_BUDGET, permKey } from "./law.js";
import { loadChunks } from "./load.js";
import { planDock } from "./plan.js";

const cache = new Map();

export function programKey(ids) {
  return permKey(ids);
}

export function cacheGet(key) {
  return cache.get(key) ?? null;
}

export function cacheSet(key, packed) {
  cache.set(key, packed);
  return packed;
}

export function cacheClear() {
  cache.clear();
}

export function cacheSize() {
  return cache.size;
}

/** Compile-or-hit. Same dock + extras = same WebGL program. */
export function loadCached(dock, opts = {}) {
  const plan = planDock(dock, opts);
  const key = `${plan.dock}:${programKey(plan.chunks)}:${plan.budget}`;
  const hit = cacheGet(key);
  if (hit) return { ...hit, cached: true };
  const packed = loadChunks(plan.chunks, { budget: plan.budget, glslFor: opts.glslFor });
  return cacheSet(key, Object.freeze({ ...packed, dock: plan.dock, fps: plan.fps, cached: false }));
}

export const KHR_PARALLEL = "KHR_parallel_shader_compile";
export const COMPLETION_STATUS_KHR = 0x91B1;

export function khrParallel(gl) {
  if (!gl) return null;
  return gl.getExtension(KHR_PARALLEL) || gl.getExtension("GL_KHR_parallel_shader_compile") || null;
}

export function programReady(gl, program, ext) {
  if (!gl || !program) return false;
  if (!ext) return gl.getProgramParameter(program, gl.LINK_STATUS);
  return !!gl.getProgramParameter(program, COMPLETION_STATUS_KHR);
}

/** Neighbor docks to warm while the current permutation is already up. */
export function neighborsOf(dock, docks) {
  const list = docks ?? [];
  const i = list.indexOf(dock);
  if (i < 0) return Object.freeze(list.slice(0, 2));
  const out = [];
  if (list[i - 1]) out.push(list[i - 1]);
  if (list[i + 1]) out.push(list[i + 1]);
  return Object.freeze(out);
}

export function prefetchPlans(dock, docks, opts = {}) {
  const budget = opts.budget ?? PREFETCH_BUDGET;
  return neighborsOf(dock, docks).map((id) =>
    loadCached(id, { ...opts, budget }),
  );
}

export function idleWarm(dock, docks, opts = {}) {
  const run = () => prefetchPlans(dock, docks, opts);
  if (typeof requestIdleCallback === "function") {
    return requestIdleCallback(run, { timeout: opts.timeout ?? 800 });
  }
  return setTimeout(run, 0);
}
