// node lib/anime/prep.check.mjs : the engine prep state machine (ARCHITECTURE-PLAN WP2), run with fake loaders and engines.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const PREP = new URL("./prep.js", import.meta.url);
const fresh = (name) => import(`${PREP.href}?case=${name}`);
const until = async (fn) => { for (let i = 0; i < 1000 && !fn(); i++) await new Promise((r) => setImmediate(r)); };
const cutFor = (id) => ({ id, scene: { id }, build: () => null });

function rig(over = {}) {
  const clock = { t: 0 };
  const log = { made: 0, warm: 0, compiled: 0, players: 0, disposed: [], shrunk: 0, restyled: 0, nextTask: 0, lost: null, loads: 0 };
  const d = {
    env: () => ({ memory: 8, saveData: false, off: false }),
    loadModules: async () => { log.loads++; },
    loadCut: async (id) => cutFor(id),
    makeCanvas: () => ({ remove() {} }),
    makeEngine: async () => { log.made++; return { resize() {}, reset() {} }; },
    warm: async () => { log.warm++; },
    onLost: (canvas, fn) => { log.lost = fn; },
    makePlayer: (engine, cut) => { log.players++; return { cut, seek() {}, dispose() { log.disposed.push(cut.id); } }; },
    steps: function* () { for (let i = 0; i < 3; i++) { clock.t += 30; yield; } },
    compile: async () => { log.compiled++; },
    restyle: () => { log.restyled++; },
    shrink: () => { log.shrunk++; },
    modeOf: () => "good",
    now: () => clock.t,
    nextTask: async () => { log.nextTask++; },
    ...over,
  };
  return { d, log, clock };
}

assert.equal(readFileSync(PREP, "utf8").match(/^import /m), null, "prep.js is framework-free: no imports");

{
  const P = await fresh("hot");
  assert.equal(P.HOT_MIN_MEMORY_GB, 4);
  assert.equal(P.SLICE_MS, 50);
  assert.equal(P.hotAllowed({ memory: 8, saveData: false, off: false }), true);
  assert.equal(P.hotAllowed({ memory: undefined, saveData: false, off: false }), true, "unreported memory is allowed");
  assert.equal(P.hotAllowed({ memory: 4, saveData: false, off: false }), true, "4 GB is the floor");
  assert.equal(P.hotAllowed({ memory: 2, saveData: false, off: false }), false);
  assert.equal(P.hotAllowed({ memory: 8, saveData: true, off: false }), false, "saveData takes the cold path");
  assert.equal(P.hotAllowed({ memory: 8, saveData: false, off: true }), false, "?hot=off forces the cold path");
}

{
  const P = await fresh("life");
  const { d, log } = rig(); P.configure(d);
  assert.equal(P.status("home"), "idle");
  const pf = P.prefetch("home");
  assert.equal(P.status("home"), "fetching");
  await pf;
  await P.prepare("home");
  assert.equal(P.status("home"), "ready");
  assert.equal(log.made, 1, "one resident engine");
  assert.equal(log.warm, 1, "its programs are linked by one frame");
  assert.equal(log.compiled, 1);
  const taken = P.take("home");
  assert.ok(taken, "a ready dock is taken");
  assert.equal(P.status("home"), "taken");
  assert.equal(log.restyled, 1, "the taken player is restyled for this dock");
  assert.equal(P.take("home"), null, "a dock is taken once");
  P.release("home");
  assert.deepEqual(log.disposed, ["home"], "release disposes the taken player");
  assert.equal(log.shrunk, 1, "the engine goes back to 1x1");
  assert.equal(P.status("home"), "idle");
  assert.equal(log.made, 1, "the engine is kept, not recreated");
}

{
  const P = await fresh("lost");
  const { d, log } = rig(); P.configure(d);
  const a = await P.spin(), b = await P.spin();
  assert.equal(a, b, "spin is idempotent");
  assert.equal(log.made, 1);
  log.lost();
  const c = await P.spin();
  assert.notEqual(c, a, "a lost engine is rebuilt by the next spin");
  assert.equal(log.made, 2);
}

{
  const P = await fresh("memory");
  const { d, log } = rig({ env: () => ({ memory: 2, saveData: false, off: false }) }); P.configure(d);
  assert.equal(await P.spin(), null);
  assert.equal(await P.prepare("home"), null);
  assert.equal(P.take("home"), null);
  assert.equal(log.made, 0, "low memory builds no resident engine");
  assert.equal(log.players, 0);
}

{
  const P = await fresh("low-mode");
  const { d, log } = rig({ modeOf: () => "low" }); P.configure(d);
  assert.equal(await P.prepare("home"), null, "mode low is baked only: no player is prepared");
  assert.equal(log.players, 0);
}

{
  const P = await fresh("level1");
  const { d, log } = rig(); P.configure(d);
  P.LEVEL_1.add("home");
  assert.equal(await P.prepare("home"), null, "a LEVEL_1 dock keeps 2a and 2b only");
  assert.equal(log.made, 1, "the resident engine is still spun for it");
  assert.equal(log.players, 0);
  P.LEVEL_1.delete("home");
}

{
  const P = await fresh("preload");
  const { d, log } = rig(); P.configure(d);
  await P.preload();
  assert.equal(log.loads, 1, "the shared modules load once, from the pre-ready step");
  assert.equal(log.made, 0, "preload builds no engine");
}

{
  const P = await fresh("fail-load");
  const { d, log } = rig({ loadCut: async () => { throw new Error("boom"); } }); P.configure(d);
  await assert.rejects(P.prepare("home"), /boom/);
  assert.equal(P.status("home"), "failed", "a failed prepare is reported to the host");
  assert.equal(log.players, 0);
}

{
  const P = await fresh("fail-build");
  const { d, log } = rig({ steps: function* () { yield; throw new Error("layer"); } }); P.configure(d);
  await assert.rejects(P.prepare("home"), /layer/);
  assert.equal(P.status("home"), "failed");
  assert.deepEqual(log.disposed, ["home"], "a half-built player is disposed");
}

{
  const P = await fresh("drop-fetch");
  let open;
  const gate = new Promise((r) => (open = r));
  const { d, log } = rig({ loadCut: async (id) => { await gate; return cutFor(id); } }); P.configure(d);
  const p = P.prepare("home");
  P.drop("home");
  open();
  assert.equal(await p, null, "a dropped prepare resolves to nothing");
  assert.equal(log.players, 0, "no player is built for a dock the seal left");
  assert.equal(P.status("home"), "idle");
}

{
  const P = await fresh("drop-fail");
  let open;
  const gate = new Promise((r) => (open = r));
  const { d } = rig({ loadCut: async () => { await gate; throw new Error("late network error"); } }); P.configure(d);
  const p = P.prepare("home");
  P.drop("home");
  open();
  assert.equal(await p, null, "a failure after the seal left is not reported");
  assert.equal(P.status("home"), "idle");
}

{
  const P = await fresh("drop-build");
  let go, calls = 0, slow = 0;
  const { d, log } = rig({
    now: () => slow,
    steps: function* () { for (let i = 0; i < 2; i++) { slow += 60; yield; } },
    nextTask: () => (calls++ === 0 ? new Promise((r) => (go = r)) : Promise.resolve()),
  });
  P.configure(d);
  const p = P.prepare("home");
  await until(() => go !== undefined);
  P.drop("home");
  go();
  assert.equal(await p, null);
  assert.deepEqual(log.disposed, ["home"], "the in-flight player is disposed once, by its own prepare");
  assert.equal(log.compiled, 0, "nothing compiles for a dock the seal left");
}

{
  const P = await fresh("readiness");
  const { d } = rig(); P.configure(d);
  let finish;
  P.readiness("home", () => new Promise((r) => (finish = r)));
  const p = P.prepare("home");
  await until(() => finish !== undefined);
  assert.equal(P.status("home"), "building", "a readiness promise still pending: not ready");
  finish();
  await p;
  assert.equal(P.status("home"), "ready");
}

{
  const P = await fresh("one-at-a-time");
  const { d, log } = rig(); P.configure(d);
  await P.prepare("home");
  await P.prepare("p-nerve");
  assert.equal(P.status("home"), "idle", "the earlier prepared dock is dropped");
  assert.equal(P.status("p-nerve"), "ready");
  assert.deepEqual(log.disposed, ["home"]);
  assert.equal(P.take("home"), null);
  assert.ok(P.take("p-nerve"));
}

{
  const P = await fresh("lost-take");
  const { d, log } = rig(); P.configure(d);
  await P.prepare("home");
  log.lost();
  assert.equal(P.take("home"), null, "an engine lost since the prepare is not handed out");
  assert.equal(P.status("home"), "idle");
  assert.equal(log.restyled, 0);
  assert.deepEqual(log.disposed, ["home"]);
}

{
  const P = await fresh("slices");
  const { d, log } = rig(); P.configure(d);
  await P.prepare("home");
  assert.equal(log.nextTask, 1, "three 30 ms steps yield once, when a slice passes 50 ms");
}

console.log("prep.check: ok");
