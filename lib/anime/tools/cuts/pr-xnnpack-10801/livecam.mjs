// node lib/anime/tools/cuts/pr-xnnpack-10801/livecam.mjs [seconds=32]: samples the LIVE camera and the seal on every animation frame in
// real Chrome (evilseal.si, spawn pr-xnnpack-10801, __replay), converts them to the rig frame (rig = Ry(-TURN) * (p - seal), y from the
// seal's rest ground), and writes .oneshot/pr-xnnpack-10801/livecam.json: rest, TURN, FOV and the median [eye, forward] of each window.
import { register } from "node:module";
import { writeFileSync } from "node:fs";
import { launchChrome } from "../../../../../scripts/cut-cap.mjs";
import { withGpuLock } from "../../../../../scripts/cut-lock.mjs";

register("./resolve-hook.mjs", import.meta.url);
const { turnFor } = await import("../../../../world/cutscene/timeline.js");
const { default: card } = await import("../../../../world/cutscene/cards/pr-xnnpack-10801.js");
const { PLACE_BY_ID } = await import("../../../../world/places.js");

const ID = "pr-xnnpack-10801";
const secs = Number(process.argv[2] ?? 32);
const OUT = new URL("../../../../../.oneshot/pr-xnnpack-10801/livecam.json", import.meta.url);
const WINDOWS = {
  island: [0, 2.2], dimFar: [3.2, 3.6], dimLow: [3.8, 4.3], lineA: [4.2, 7.4], slash: [7.6, 9.9], mend: [9.3, 10.1],
  lineB: [10.2, 15.6], lineC: [15.8, 16.7], brk: [16.8, 17.5], island2: [17.6, 22.5], credit: [22.6, 26.6],
};

const raw = await withGpuLock(`livecam ${ID}`, async () => {
  const browser = await launchChrome();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    await page.goto(`https://evilseal.si/?play&spawn=${ID}&debug`, { waitUntil: "load", timeout: 180000 });
    await page.waitForFunction(() => window.__world && window.__replay, null, { timeout: 180000 });
    await page.waitForTimeout(6000);
    return await page.evaluate(
      ([id, secs]) =>
        new Promise((resolve) => {
          try { sessionStorage.removeItem("seal:seen"); } catch {}
          const out = [];
          let diag = null;
          const t0 = performance.now();
          window.__replay(id);
          const step = () => {
            const w = window.__world;
            const c = w?.camera;
            const s = w?.live?.seal;
            const t = (performance.now() - t0) / 1000;
            const lv = w?.live?.arrival;
            const cut = w?.clock && lv?.id ? w.clock.elapsedTime - lv.start : null;
            if (!diag && w?.live) diag = { live: Object.keys(w.live), sealType: typeof s, sealKeys: s && typeof s === "object" ? Object.keys(s) : null };
            if (c) out.push({ t, c: cut, p: [c.position.x, c.position.y, c.position.z], q: [c.quaternion.x, c.quaternion.y, c.quaternion.z, c.quaternion.w], fov: c.fov, up: [c.up.x, c.up.y, c.up.z], seal: s ? [s.x, s.z, typeof s.y === "number" ? s.y : null] : null });
            const done = cut != null ? cut >= secs : t >= secs;
            if (!done && t < secs + 90) requestAnimationFrame(step);
            else resolve({ out, diag });
          };
          requestAnimationFrame(step);
        }),
      [ID, secs],
    );
  } finally {
    await browser.close();
  }
});

const samples = raw.out.filter((s) => s.seal && s.c != null);
console.log("samples", raw.out.length, "with seal", samples.length, "diag", JSON.stringify(raw.diag));
if (!samples.length) process.exit(1);

const median = (xs) => { const a = xs.filter((v) => v !== null).sort((p, q) => p - q); return a.length ? a[Math.floor(a.length / 2)] : null; };
const med3 = (rows) => [0, 1, 2].map((k) => median(rows.map((r) => r[k])));
const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };
const fwd = (q) => {
  const [qx, qy, qz, qw] = q;
  const v = [0, 0, -1];
  const t = [2 * (qy * v[2] - qz * v[1]), 2 * (qz * v[0] - qx * v[2]), 2 * (qx * v[1] - qy * v[0])];
  const c = [qy * t[2] - qz * t[1], qz * t[0] - qx * t[2], qx * t[1] - qy * t[0]];
  return [0, 1, 2].map((k) => v[k] + qw * t[k] + c[k]);
};
const ry = (a, [x, y, z]) => [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)];

const restRows = samples.filter((s) => s.c >= 0.6 && s.c <= 1.1);
const rest = [median(restRows.map((s) => s.seal[0])), median(restRows.map((s) => s.seal[1]))];
const restY = median(restRows.map((s) => s.seal[2]));
const TURN = turnFor(card, PLACE_BY_ID[ID], rest[0], rest[1]);
const toRig = (s) => ry(-TURN, [s.p[0] - s.seal[0], s.p[1] - (restY ?? 0), s.p[2] - s.seal[1]]);

const rigSamples = samples.map((s) => ({ t: s.c, p: toRig(s), f: norm(ry(-TURN, fwd(s.q))), fov: s.fov, up: ry(-TURN, s.up) }));
const maxStep = (rows) => rows.reduce((m, r, i) => (i ? Math.max(m, Math.hypot(...r.p.map((v, k) => v - rows[i - 1].p[k]))) : m), 0);
const stepAt = (rows) => rows.reduce((best, r, i) => { if (!i) return best; const d = Math.hypot(...r.p.map((v, k) => v - rows[i - 1].p[k])); return d > best.d ? { d, t: +r.t.toFixed(3) } : best; }, { d: 0, t: null }).t;
const windowStats = (rows) => {
  const f = norm(med3(rows.map((r) => r.f)));
  return {
    n: rows.length, step: +maxStep(rows).toFixed(3), stepAt: stepAt(rows), eye: med3(rows.map((r) => r.p)).map((v) => +v.toFixed(4)),
    fwd: f.map((v) => +v.toFixed(4)), fov: +median(rows.map((r) => r.fov)).toFixed(3),
    up: norm(med3(rows.map((r) => r.up))).map((v) => +v.toFixed(4)), pitchDeg: +((Math.asin(f[1]) * 180) / Math.PI).toFixed(2),
  };
};
const windows = {};
for (const [name, [a, b]] of Object.entries(WINDOWS)) windows[name] = windowStats(rigSamples.filter((s) => s.t >= a && s.t < b));
const LENS = Object.fromEntries(Object.entries(windows).filter(([, v]) => v.n >= 8).map(([k, v]) => [k, [v.eye, v.fwd]]));
const out = {
  id: ID, secs, samples: samples.length, rest: rest.map((v) => +v.toFixed(4)), restY: restY === null ? null : +restY.toFixed(4),
  TURN: +TURN.toFixed(5), FOV: windows.lineA?.fov ?? null, windows, LENS,
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify({ TURN: out.TURN, rest: out.rest, restY: out.restY, FOV: out.FOV, counts: Object.fromEntries(Object.entries(windows).map(([k, v]) => [k, v.n])), LENS }));
