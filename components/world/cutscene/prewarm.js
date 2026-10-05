// SHARED PREWARM: every dock's world (thousands of merged geometries, its
// ShaderMaterials) is built and its programs compiled while the seal walks up
// to it, never on the arrival's first frame. Controller.jsx calls warmTick
// every 0.1 s; a move registers its builder at module scope (registerWarm) and
// takes the held world at mount (takeWarm). `build` returns the world, or an
// iterator that yields between steps and returns the world (one step per tick).
import { PLACES, PLACE_BY_ID, SPAWN_PLAY } from "../../../lib/world/places";
import { live } from "../../../lib/world/store";
import { cutsceneMode } from "../../../lib/world/cutscene/timeline";
import { stageWarmObjects } from "./Stage";

const DOCKS = [...PLACES, PLACE_BY_ID[SPAWN_PLAY]]; // the spawn statue's play is not in PLACES
const WARM = new Map(); // id -> { build, gen, held, state: "idle"|"built"|"compiled"|"used" }
if (typeof window !== "undefined") window.__warm = WARM; // capture probes read each dock's warm state
const BUILD_REACH = 110; // m: start early, the nearest dock first; a walk across the island is 8-30 s
const DROP_REACH = 170;
let stageDone = false;

export function registerWarm(id, build) {
  WARM.set(id, { id, build, gen: null, held: null, state: "idle" });
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
  const e = warmStep(gl, camera, composer);
  const d = performance.now() - t0;
  if (e && d > 30) (window.__warmLog ??= []).push([e.id, e.state, e.queue?.length ?? -1, Math.round(d)]); // slow ticks, for the capture probes
}

function warmStep(gl, camera, composer) {
  if (!gl || !camera || live.arrival.id) return;
  const { x, z } = live.seal;
  let near = null;
  let nearD = BUILD_REACH;
  for (const p of DOCKS) {
    const e = WARM.get(p.id);
    if (!e) continue;
    let d = Math.hypot(x - p.x, z - p.z);
    if (e.state !== "used" && d > DROP_REACH && (e.held || e.gen)) dispose(e);
    if (e.state === "used" || live.seen.has(p.id) || !cutsceneMode(p.id)) continue;
    // the dock the seal is travelling to goes first
    const tg = live.target;
    if (tg && Math.hypot(tg.x - p.x, tg.z - p.z) < 12) d -= 1000;
    if ((e.state === "idle" || e.state === "built") && d < nearD) {
      near = e;
      nearD = d;
    }
  }
  if (!near) return null;
  if (near.state === "idle") {
    if (!near.gen && !near.held) {
      const r = near.build();
      if (r && typeof r.next === "function") near.gen = r;
      else near.held = r;
    }
    if (near.gen) {
      const r = near.gen.next();
      if (r.done) { near.held = r.value; near.gen = null; }
    }
    if (near.held) near.state = "built";
    return near;
  }
  if (near.state === "built" && !near.compiling) {
    let extra = null;
    if (!stageDone && !near.queue) { stageDone = true; extra = stageWarmObjects(); }
    compileStep(near, gl, camera, composer, extra);
  }
  return near;
}

// true while a dock the seal is already within reach of still has world to build or programs to link: the boot curtain waits for it,
// so the docks beside the spawn warm behind the curtain, not under the first frames
export function warmPending() {
  const { x, z } = live.seal;
  for (const p of DOCKS) {
    const e = WARM.get(p.id);
    if (!e || e.state === "used" || e.state === "compiled" || live.seen.has(p.id) || !cutsceneMode(p.id)) continue;
    if (Math.hypot(x - p.x, z - p.z) < BUILD_REACH) return true;
  }
  return false;
}
