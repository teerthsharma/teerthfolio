// node lib/anime/tools/cuts/p-planimeter/livecam.mjs [seconds=32]: samples the LIVE camera and the seal on every animation frame in
// real Chrome (evilseal.si, spawn p-planimeter, __replay), keyed on the CUT second (clock.elapsedTime - live.arrival.start), in the rig
// frame (rig = Ry(-TURN) * (p - seal)), into .oneshot/p-planimeter/livecam.json.
import { writeFileSync } from "node:fs";
import { launchChrome } from "../../../../../scripts/cut-cap.mjs";
import { withGpuLock } from "../../../../../scripts/cut-lock.mjs";

const { TURN } = await import("../../../cutscenes/p-planimeter/clock.js");

const ID = "p-planimeter";
const secs = Number(process.argv[2] ?? 32);
const OUT = new URL("../../../../../.oneshot/p-planimeter/livecam.json", import.meta.url);
const WINDOWS = {
  island: [0.8, 2.8], pull: [3.0, 3.7], swell: [3.8, 4.3], room: [5.0, 7.2], eyes: [7.95, 9.9],
  b: [10.8, 15.0], c: [15.4, 20.3], credit: [20.9, 24.5], home: [26.6, 27.1],
};
const KEYS = [
  0.0, 0.3, 0.6, 1.0, 1.5, 2.0, 2.4, 3.0, 3.3, 3.6, 3.7, 3.8, 3.9, 4.0, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 5.0, 5.2, 5.5,
  7.2, 7.95, 8.6, 9.5, 9.95, 10.0, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 11.0, 12.5, 14.7, 15.3, 17.0, 18.7, 20.5, 23.0,
  24.4, 24.6, 24.8, 25.0, 25.2, 25.4, 25.6, 25.8, 26.0, 26.2, 26.5, 26.8, 27.0, 27.1,
];

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
            if (c) out.push({ t, c: cut, p: [c.position.x, c.position.y, c.position.z], q: [c.quaternion.x, c.quaternion.y, c.quaternion.z, c.quaternion.w], fov: c.fov, up: [c.up.x, c.up.y, c.up.z], seal: s ? [s.x, s.z] : null });
            if (t < secs) requestAnimationFrame(step);
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
console.log("samples", raw.out.length, "on cut clock", samples.length, "diag", JSON.stringify(raw.diag));
if (!samples.length) process.exit(1);

const median = (xs) => { const a = [...xs].sort((p, q) => p - q); return a.length ? a[Math.floor(a.length / 2)] : null; };
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
const rigSamples = samples.map((s) => ({ t: s.c, p: ry(-TURN, [s.p[0] - s.seal[0], s.p[1], s.p[2] - s.seal[1]]), f: norm(ry(-TURN, fwd(s.q))), fov: s.fov, up: ry(-TURN, s.up) }));

const maxStep = (rows) => rows.reduce((m, r, i) => (i ? Math.max(m, Math.hypot(...r.p.map((v, k) => v - rows[i - 1].p[k]))) : m), 0);
const stats = (rows) => {
  const f = norm(med3(rows.map((r) => r.f)));
  return { n: rows.length, step: +maxStep(rows).toFixed(3), eye: med3(rows.map((r) => r.p)).map((v) => +v.toFixed(4)), fwd: f.map((v) => +v.toFixed(4)), fov: +median(rows.map((r) => r.fov)).toFixed(3), up: norm(med3(rows.map((r) => r.up))).map((v) => +v.toFixed(4)), pitchDeg: +((Math.asin(f[1]) * 180) / Math.PI).toFixed(2) };
};
const windows = {};
for (const [name, [a, b]] of Object.entries(WINDOWS)) windows[name] = stats(rigSamples.filter((s) => s.t >= a && s.t < b));
const keys = [];
for (const k of KEYS) {
  let near = rigSamples.filter((s) => Math.abs(s.t - k) <= 0.06);
  if (!near.length) {
    near = rigSamples.filter((s) => Math.abs(s.t - k) <= 0.12);
    if (near.length) console.log("wide", k);
  }
  if (!near.length) { console.log("no sample", k); continue; }
  const f = norm(med3(near.map((r) => r.f)));
  keys.push({ t: k, n: near.length, eye: med3(near.map((r) => r.p)).map((v) => +v.toFixed(4)), fwd: f.map((v) => +v.toFixed(4)), fov: +median(near.map((r) => r.fov)).toFixed(3) });
}
const lagRows = raw.out.filter((s) => s.c != null && s.c >= 1 && s.c <= 2).map((s) => s.t - s.c);
const lag = lagRows.length ? +median(lagRows).toFixed(3) : null;
const out = { id: ID, secs, samples: samples.length, lag, TURN, FOV: windows.room?.fov ?? null, windows, keys };
writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify({ FOV: out.FOV, lag, samples: out.samples, keys: keys.length, windows: Object.fromEntries(Object.entries(windows).map(([k, v]) => [k, v.n])) }));
