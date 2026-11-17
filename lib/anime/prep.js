// Engine prep (ARCHITECTURE-PLAN WP2): what an anime cutscene needs before its arrival, kept off the arrival's critical path.
// Framework-free: components/anime/EngineCut.jsx hands in the loaders and the engine and player factories through configure(),
// so this file runs under Node (prep.check.mjs). A dock walks idle, fetching, building, ready, then taken or failed. One hot
// engine stays resident on a detached canvas between arrivals, and at most one prepared player is kept at a time.

export const HOT_MIN_MEMORY_GB = 4; // below this deviceMemory the arrival takes the cold path
export const SLICE_MS = 50; // a player's init yields to the frame loop once a slice has run this long
export const LEVEL_1 = new Set(); // docks whose longest layer exceeds SLICE_MS on an adapter: they keep 2a and 2b only (the 2c table fills this)

export const hotAllowed = ({ memory, saveData, off }) => !off && !saveData && (memory === undefined || memory >= HOT_MIN_MEMORY_GB);

let deps = null;
export const configure = (d) => { deps = d; };

const docks = new Map();
const entry = (id) => {
  let e = docks.get(id);
  if (!e) docks.set(id, (e = { id, status: "idle", promise: null, prep: null, token: null, player: null, engine: null, extras: [] }));
  return e;
};
let hot = null, hotP = null;

export const status = (id) => docks.get(id)?.status ?? "idle";
export const readiness = (id, fn) => { entry(id).extras.push(fn); };

const dispose = (p) => { try { p?.dispose(); } catch (err) { console.error(err); } };

// the shared modules only (registry, framework, engine): network and evaluation, no GPU; memoised by the host
export const preload = () => deps.loadModules();

// network and evaluation only: the shared modules, then the dock's scene.js and build.js; memoised per dock
export function prefetch(id) {
  const e = entry(id);
  if (!e.promise) {
    e.status = "fetching";
    e.promise = (async () => {
      await deps.loadModules();
      const cut = await deps.loadCut(id);
      if (!cut?.scene || !cut.build) throw new Error(cut?.error?.message ?? `no cutscene "${id}"`);
      return cut;
    })();
    e.promise.catch(() => {});
  }
  return e.promise;
}

// the resident engine: one per page, on a detached canvas at 1x1, its composer programs linked by one tiny frame
export function spin() {
  if (!hotP) {
    const p = (hotP = (async () => {
      if (!deps || !hotAllowed(deps.env())) return null;
      const canvas = deps.makeCanvas();
      const engine = await deps.makeEngine(canvas);
      engine.resize(1, 1, 1);
      await deps.warm(engine);
      hot = { engine, canvas };
      deps.onLost(canvas, () => { if (hot?.engine === engine) { hot = null; hotP = null; } });
      return engine;
    })());
    p.catch(() => { if (hotP === p) hotP = null; });
  }
  return hotP;
}

// prefetch, spin, the player's init in slices, compileAsync, readiness, one hidden frame at t = 0. Rejects on a failure.
export function prepare(id) {
  const e = entry(id);
  if (!e.prep) {
    const token = (e.token = {});
    e.prep = run(e, token).catch((err) => {
      if (e.token !== token) return null; // dropped meanwhile: the seal left, so no failure is reported
      e.status = "failed"; e.prep = null;
      throw err;
    });
  }
  return e.prep;
}

async function run(e, token) {
  const stale = () => e.token !== token;
  const cut = await prefetch(e.id);
  if (stale()) return null;
  const engine = await spin();
  if (stale() || !engine || LEVEL_1.has(e.id) || deps.modeOf(engine) === "low") return null;
  for (const o of docks.values()) if (o !== e && (o.status === "ready" || o.status === "building")) drop(o.id);
  e.status = "building";
  let player = null;
  try {
    player = deps.makePlayer(engine, cut);
    await sliced(deps.steps(player));
    if (stale()) { dispose(player); return null; }
    await deps.compile(engine, player);
    await Promise.all(e.extras.map((fn) => fn()));
    if (stale()) { dispose(player); return null; }
    player.seek(0);
    e.player = player; e.engine = engine; e.status = "ready";
    return e;
  } catch (err) {
    dispose(player);
    throw err;
  }
}

// the arrival takes the prepared dock: its engine and player, the player restyled for this dock (another may have run since)
export function take(id) {
  const e = docks.get(id);
  if (!e || e.status !== "ready") return null;
  if (!hot || e.engine !== hot.engine) { drop(id); return null; }
  e.status = "taken";
  deps.restyle(e.player);
  return { engine: hot.engine, player: e.player, canvas: hot.canvas };
}

// the arrival is over: dispose its player and hand the resident engine back at 1x1 with its context kept
export function release(id) {
  const e = docks.get(id);
  if (e?.player) dispose(e.player);
  if (e) Object.assign(e, { player: null, engine: null, prep: null, token: null, status: "idle" });
  if (hot) { deps.shrink(hot.engine); hot.canvas.remove(); }
}

// the seal walked away: a ready player is disposed; an in-flight prepare notices the cleared token and disposes its own
export function drop(id) {
  const e = docks.get(id);
  if (!e || e.status === "taken") return;
  if (e.status === "ready") dispose(e.player);
  Object.assign(e, { token: null, prep: null, player: null, engine: null, status: "idle" });
}

// drives a generator, yielding to the frame loop after a slice has run SLICE_MS
async function sliced(gen) {
  let t0 = deps.now();
  for (let r = gen.next(); !r.done; r = gen.next()) {
    if (deps.now() - t0 >= SLICE_MS) { await deps.nextTask(); t0 = deps.now(); }
  }
}
