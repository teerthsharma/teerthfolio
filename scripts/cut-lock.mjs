// At most SLOTS GPU runs at a time across processes: an atomic mkdir per slot under os.tmpdir(), heartbeat every 30 s,
// stale after 10 min without one, released in finally, on exit and on SIGINT/SIGTERM.   await withGpuLock("cut-verify p-nerve", async () => {...})
import { mkdirSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export const LOCK_DIR = path.join(os.tmpdir(), "teerthfolio-cut-gpu.lock");
const SLOTS = Math.max(1, Number(process.env.CUT_GPU_SLOTS ?? 3));
// slot 0 keeps the original name so a process started before slots existed still excludes it
const SLOT_DIRS = Array.from({ length: SLOTS }, (_, i) => (i === 0 ? LOCK_DIR : `${LOCK_DIR}.${i}`)).reverse();
const STALE_MS = 10 * 60e3, POLL_MS = 2000, WAIT_MS = 60 * 60e3, BEAT_MS = 30e3;

const ageMs = (dir) => { try { return Date.now() - statSync(dir).mtimeMs; } catch { return null; } };
const owner = (dir) => { try { return readFileSync(path.join(dir, "owner.json"), "utf8").trim(); } catch { return "unknown owner"; } };

// an extra slot opens only while the machine has headroom: a second Chrome on a heavy page costs about 1 GB
const HEADROOM = Number(process.env.CUT_GPU_HEADROOM_GB ?? 2.5) * 1e9;

function tryAcquire(label) {
  for (const dir of SLOT_DIRS) {
    if (dir !== LOCK_DIR && os.freemem() < HEADROOM) continue;
    try { mkdirSync(dir); } catch (e) { if (e.code === "EEXIST") continue; throw e; }
    writeFileSync(path.join(dir, "owner.json"), JSON.stringify({ pid: process.pid, label, since: new Date().toISOString() }));
    return dir;
  }
  return null;
}

// only the process holding the slot's gc dir may delete a stale lock, so two waiters can never both remove it
function clearStale() {
  for (const dir of SLOT_DIRS) {
    const age = ageMs(dir);
    if (age === null || age < STALE_MS) continue;
    const gc = `${dir}.gc`;
    try { mkdirSync(gc); } catch { if ((ageMs(gc) ?? 0) > 60e3) rmSync(gc, { recursive: true, force: true }); continue; }
    try {
      if ((ageMs(dir) ?? 0) >= STALE_MS) { console.log(`cut-lock: taking over a stale lock (${Math.round(age / 60e3)} min without a heartbeat): ${owner(dir)}`); rmSync(dir, { recursive: true, force: true }); }
    } finally { rmSync(gc, { recursive: true, force: true }); }
  }
}

export async function withGpuLock(label, fn) {
  const t0 = Date.now();
  let told = false, dir = tryAcquire(label);
  while (!dir) {
    clearStale();
    dir = tryAcquire(label);
    if (dir) break;
    if (Date.now() - t0 > WAIT_MS) throw new Error(`GPU lock ${LOCK_DIR} still held after ${WAIT_MS / 60e3} min by ${owner(SLOT_DIRS[0])}`);
    if (!told) { console.log(`waiting for a GPU slot (${SLOTS} at a time); polling every ${POLL_MS / 1000} s for up to ${WAIT_MS / 60e3} min`); told = true; }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  let held = true;
  const release = () => { if (held) { held = false; clearInterval(beat); rmSync(dir, { recursive: true, force: true }); } };
  const beat = setInterval(() => { try { const now = new Date(); utimesSync(dir, now, now); } catch { /* released */ } }, BEAT_MS);
  beat.unref();
  const onSignal = () => { release(); process.exit(130); };
  process.on("exit", release);
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);
  try {
    return await fn();
  } finally {
    process.off("SIGINT", onSignal);
    process.off("SIGTERM", onSignal);
    process.off("exit", release);
    release();
  }
}
