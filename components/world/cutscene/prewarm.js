// SHARED PREWARM: every dock's world (thousands of merged geometries, its
// ShaderMaterials) is built and its programs compiled while the seal walks up
// to it, never on the arrival's first frame. Controller.jsx calls warmTick
// every 0.1 s; a move registers its builder at module scope (registerWarm) and
// takes the held world at mount (takeWarm). `build` returns the world, or an
// iterator that yields between steps and returns the world (one step per tick).
//
// The queue is earliest-deadline-first (deadline.js: seconds for the seal to reach a dock's ring). Candidates are a dock's R3F world,
// a lazy move chunk (registerLoader) and an engine job (registerEngineProvider). A dock the engine owns builds no R3F world.
import { engineActive } from "../../../lib/anime/live.js";
import { PLACES, PLACE_BY_ID, SPAWN_PLAY } from "../../../lib/world/places";
import { cutsceneMode } from "../../../lib/world/cutscene/timeline";
import { CRITICAL_S, DROP_S, HORIZON_S, SPAWN_CRITICAL_S, deadlineS } from "../../../lib/world/cutscene/deadline";
import { getUi, live } from "../../../lib/world/store";
import { stageWarmObjects } from "./Stage";

const DOCKS = [...PLACES, PLACE_BY_ID[SPAWN_PLAY]]; // the spawn statue's play is not in PLACES
const WARM = new Map(); // id -> { build, gen, held, state: "idle"|"built"|"compiled"|"used" }
if (typeof window !== "undefined") window.__warm = WARM; // capture probes read each dock's warm state
const LOADERS = new Map(); // id -> { load, state: "idle"|"loading"|"loaded"|"failed" }
const ENGINE = []; // { p, started: Set, done: Set } per engine provider
const PENDING_MS = 8000; // the curtain never waits for the queue past this, from navigation start
const TRAVEL_M = 12; // a dock this close to live.target is the one the seal travels to: it goes first
let stageDone = false;

export function registerWarm(id, build) {
  WARM.set(id, { id, build, gen: null, held: null, state: "idle" });
}

export function registerLoader(id, load) {
  LOADERS.set(id, { load, state: "idle" });
}

export function registerEngineProvider(p) {
  ENGINE.push({ p, started: new Set(), done: new Set() });
}

function finish(e) {
  if (e.gen) {
    let r = e.gen.next();
    while (!r.done) r = e.gen.next();
    e.held = r.value;
    e.gen = null;
  }
}

export function takeWarm(id, build) {
  const e = WARM.get(id);
  if (e && (e.held || e.gen)) {
    finish(e);
    const h = e.held;
    e.held = null;
    e.state = "used";
    return h;
  }
  if (e) e.state = "used";
  const r = (e?.build ?? build)();
  if (r && typeof r.next === "function") {
    let n = r.next();
    while (!n.done) n = r.next();
    return n.value;
  }
  return r;
}

// every top-most Object3D the held world owns (walks plain objects and arrays up to 4 deep), for compile and dispose
function objects(held, out = [], seen = new Set(), depth = 0) {
  if (!held || typeof held !== "object" || seen.has(held) || depth > 4) return out;
  seen.add(held);
  if (held.isObject3D) { out.push(held); return out; }
  if (held.isMaterial || held.isBufferGeometry || held.isTexture) return out;
  for (const v of Array.isArray(held) ? held : Object.values(held)) objects(v, out, seen, depth + 1);
  return out;
}

function dispose(e) {
  const roots = objects(e.held);
  for (const o of roots) o.traverse((n) => { n.geometry?.dispose?.(); const m = n.material; if (m) for (const x of Array.isArray(m) ? m : [m]) x.dispose?.(); });
  e.held?.dispose?.();
  e.held = null;
  e.gen = null;
  e.state = "idle";
  e.compiling = false;
  e.queue = null;
}

// one root per tick: each compileAsync (three 0.178 traverses ALL of it, hidden parts included, so no visibility toggling is needed) is
// keyed by the LIVE scene's lights and fog and the composer's input buffer, so the program it links is the one the draw asks for
function compileStep(e, gl, camera, composer, extra) {
  if (!e.queue) {
    // one entry per distinct material: the unit that links one program
    const seen = new Set();
    e.queue = [];
    e.pending = [];
    for (const r of [...objects(e.held), ...(extra ? [extra] : [])]) r.traverse((n) => {
      if (!n.material) return; // groups would compile every descendant in one tick
      const ms = Array.isArray(n.material) ? n.material : [n.material];
      if (ms.some((x) => !seen.has(x))) { ms.forEach((x) => seen.add(x)); e.queue.push(n); }
    });
  }
  const root = e.queue.shift();
  if (root) {
    const prev = gl.getRenderTarget();
    try {
      if (composer?.inputBuffer) gl.setRenderTarget(composer.inputBuffer);
      e.pending.push(gl.compileAsync(root, camera, window.__world?.scene ?? null).catch(() => {}));
    } catch { /* a failed warm-up only means the first draw pays */ }
    gl.setRenderTarget(prev);
  }
  if (!e.queue.length) {
    e.compiling = true;
    Promise.all(e.pending).then(() => { if (e.state === "built") e.state = "compiled"; });
  }
}

// at most one build step or compile per call
export function warmTick(gl, camera, composer) {
  const t0 = performance.now();
  const c = warmStep(gl, camera, composer);
  const d = performance.now() - t0;
  if (c && d > 30) (window.__warmLog ??= []).push([c.id, c.entry?.state ?? c.kind, c.entry?.queue?.length ?? -1, Math.round(d)]); // slow ticks, for the capture probes
}

const criticalS = (id) => (id === SPAWN_PLAY ? SPAWN_CRITICAL_S : CRITICAL_S);
const travelling = (x, z) => Boolean(live.target) && Math.hypot(live.target.x - x, live.target.z - z) < TRAVEL_M;
// before ready only the critical horizon is worked (the curtain waits on it); after ready the horizon; the dock travelled to always
const inWindow = (id, s, x, z, ready) => travelling(x, z) || (ready ? s <= HORIZON_S : s <= criticalS(id));

// the one test a lazy move chunk passes to start loading (warmStep) or to hold the curtain (warmPending): a cutscene dock the seal has not seen,
// not owned by the engine, in its window. A loader still to start or in flight is "idle" or "loading".
function eligible(id, loader) {
  const dock = PLACE_BY_ID[id];
  const ui = getUi();
  if (!dock || live.seen.has(id) || !cutsceneMode(id) || engineActive(id, ui.engineFail)) return false;
  if (loader.state !== "idle" && loader.state !== "loading") return false;
  return inWindow(id, deadlineS(live.seal, dock), dock.x, dock.z, ui.ready);
}

// one world step; false when the world has nothing to do this tick (a compile still in flight)
function worldStep(e, gl, camera, composer) {
  if (e.state === "idle") {
    if (!e.gen && !e.held) {
      const r = e.build();
      if (r && typeof r.next === "function") e.gen = r;
      else e.held = r;
    }
    if (e.gen) {
      const r = e.gen.next();
      if (r.done) { e.held = r.value; e.gen = null; }
    }
    if (e.held) e.state = "built";
    return true;
  }
  if (e.state === "built" && !e.compiling) {
    let extra = null;
    if (!stageDone && !e.queue) { stageDone = true; extra = stageWarmObjects(); }
    compileStep(e, gl, camera, composer, extra);
    return true;
  }
  return false;
}

function startLoad(l) {
  l.state = "loading";
  Promise.resolve().then(l.load).then(() => { l.state = "loaded"; }, () => { l.state = "failed"; });
}

// an engine job that answers "idle" yields to the next candidate; "busy", "done" or "failed" used this tick
function engineStep(q, id, ctx) {
  q.started.add(id);
  const r = q.p.step(id, ctx);
  if (r === "done" || r === "failed") q.done.add(id);
  return r === "busy" || r === "done" || r === "failed";
}

function warmStep(gl, camera, composer) {
  if (!gl || !camera || live.arrival.id) return null;
  for (const [id, l] of LOADERS) if (l.state === "idle" && eligible(id, l)) startLoad(l); // async and free: they never take the tick a world build needs
  const ui = getUi();
  const seal = live.seal;
  const cands = [];
  for (const p of DOCKS) {
    const s = deadlineS(seal, p);
    const e = WARM.get(p.id);
    if (e && e.state !== "used" && s > DROP_S && (e.held || e.gen)) dispose(e);
    if (!e || e.state === "used" || live.seen.has(p.id) || !cutsceneMode(p.id) || engineActive(p.id, ui.engineFail)) continue;
    if ((e.state !== "idle" && e.state !== "built") || !inWindow(p.id, s, p.x, p.z, ui.ready)) continue;
    cands.push({ id: p.id, key: travelling(p.x, p.z) ? -1000 : s, entry: e, kind: "world", run: () => worldStep(e, gl, camera, composer) });
  }
  for (const q of ENGINE) {
    const jobs = [...q.p.jobs()];
    const dueNow = new Set(jobs.filter((j) => { const s = deadlineS(seal, j); return s <= DROP_S && !live.seen.has(j.id) && engineActive(j.id, ui.engineFail) && (inWindow(j.id, s, j.x, j.z, ui.ready) || (!ui.ready && q.p.critical?.(j.id) === true)); }).map((j) => j.id));
    for (const j of jobs) {
      const s = deadlineS(seal, j);
      if (q.started.has(j.id) && s > DROP_S) { q.p.drop?.(j.id); q.started.delete(j.id); q.done.delete(j.id); continue; }
      if (q.done.has(j.id) || !engineActive(j.id, ui.engineFail) || live.seen.has(j.id)) continue;
      const due = inWindow(j.id, s, j.x, j.z, ui.ready) || (!ui.ready && q.p.critical?.(j.id) === true);
      if (!due) continue;
      if ([...q.started].some((id) => id !== j.id && dueNow.has(id) && !q.done.has(id))) continue;
      cands.push({ id: j.id, key: travelling(j.x, j.z) ? -1000 : s, entry: null, kind: "engine", run: () => engineStep(q, j.id, { gl, camera, composer }) });
    }
  }
  cands.sort((a, b) => a.key - b.key);
  return cands.find((c) => c.run()) ?? null;
}

// true while a dock the seal is within the critical horizon still has world to build or programs to link: the boot curtain waits for it,
// so the docks beside the spawn warm behind the curtain. Engine jobs never hold it, and it gives up after PENDING_MS.
export function warmPending() {
  if (performance.now() >= PENDING_MS) return false;
  const ui = getUi();
  const seal = live.seal;
  if (DOCKS.some((p) => {
    const e = WARM.get(p.id);
    if (!e || e.state === "used" || e.state === "compiled" || live.seen.has(p.id) || !cutsceneMode(p.id)) return false;
    if (engineActive(p.id, ui.engineFail)) return false;
    return deadlineS(seal, p) <= criticalS(p.id);
  })) return true;
  for (const [id, l] of LOADERS) if (eligible(id, l)) return true;
  return false;
}
