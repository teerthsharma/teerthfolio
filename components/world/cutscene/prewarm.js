// SHARED PREWARM: every dock's world (thousands of merged geometries, its
// ShaderMaterials) is built and its programs compiled while the seal walks up
// to it, never on the arrival's first frame. Controller.jsx calls warmTick
// every 0.4 s; a move registers its builder at module scope (registerWarm) and
// takes the held world at mount (takeWarm). `build` returns the world, or an
// iterator that yields between steps and returns the world (one step per tick).
import { Group, Scene } from "three";
import { PLACES } from "../../../lib/world/places";
import { live } from "../../../lib/world/store";
import { cutsceneMode } from "../../../lib/world/cutscene/timeline";
import { stageWarmObjects } from "./Stage";

const WARM = new Map(); // id -> { build, gen, held, state: "idle"|"built"|"compiled"|"used" }
const BUILD_REACH = 60;
const DROP_REACH = 150;
let stageDone = false;

export function registerWarm(id, build) {
  WARM.set(id, { build, gen: null, held: null, state: "idle" });
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

// every Object3D the held world owns (one level into plain objects and arrays), for compile and dispose
function objects(held, out = []) {
  if (!held || typeof held !== "object") return out;
  if (held.isObject3D) out.push(held);
  else for (const v of Object.values(held)) if (v?.isObject3D) out.push(v); else if (Array.isArray(v)) for (const x of v) if (x?.isObject3D) out.push(x);
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
}

function compile(e, gl, camera, composer, extra) {
  const s = new Scene();
  const g = new Group();
  const roots = objects(e.held);
  for (const o of roots) g.add(o);
  if (extra) g.add(extra);
  s.add(g);
  const prev = gl.getRenderTarget();
  try {
    if (composer?.inputBuffer) gl.setRenderTarget(composer.inputBuffer);
    gl.compileAsync(s, camera).then(() => { if (e.state === "built") e.state = "compiled"; }, () => {});
  } finally {
    gl.setRenderTarget(prev);
    for (const o of roots) g.remove(o);
    if (extra) g.remove(extra);
  }
}

// at most one build step or compile per call
export function warmTick(gl, camera, composer) {
  if (!gl || !camera || live.arrival.id) return;
  const { x, z } = live.seal;
  let near = null;
  let nearD = BUILD_REACH;
  for (const p of PLACES) {
    const e = WARM.get(p.id);
    if (!e) continue;
    const d = Math.hypot(x - p.x, z - p.z);
    if (e.state !== "used" && d > DROP_REACH && (e.held || e.gen)) dispose(e);
    if (e.state === "used" || live.seen.has(p.id) || !cutsceneMode(p.id)) continue;
    if ((e.state === "idle" || e.state === "built") && d < nearD) {
      near = e;
      nearD = d;
    }
  }
  if (!near) return;
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
    return;
  }
  if (near.state === "built" && !near.compiling) {
    near.compiling = true;
    let extra = null;
    if (!stageDone) { stageDone = true; extra = stageWarmObjects(); }
    compile(near, gl, camera, composer, extra);
  }
}
