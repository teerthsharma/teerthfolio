// node lib/anime/tools/cuts/p-resolvent/livecam.mjs [seconds=32]: samples the LIVE camera and the pup on every animation frame in real Chrome
// (evilseal.si, spawn p-resolvent, __replay), in the rig frame (pup at the origin, facing +z). Writes .oneshot/p-resolvent/livecam.json and lens.js.
import { writeFileSync } from "node:fs";
import { launchChrome } from "../../../../../scripts/cut-cap.mjs";
import { withGpuLock } from "../../../../../scripts/cut-lock.mjs";

const ID = "p-resolvent";
const secs = Number(process.argv[2] ?? 32);
const OUT = new URL("../../../../../.oneshot/p-resolvent/livecam.json", import.meta.url);
const LENS_OUT = new URL("../../../cutscenes/p-resolvent/lens.js", import.meta.url);
const WINDOWS = {
  island: [0.1, 1.8], pull: [2.0, 2.8], two: [3.3, 7.3], two2: [7.6, 11.3], push: [12.7, 14.0],
  kneel: [14.6, 15.8], cracks: [16.0, 18.0], home: [21.6, 23.0], credit: [23.3, 27.2], end: [27.8, 29.5],
};
const KEYS = Object.keys(WINDOWS);
const TURN = 0;
const LOOK = 30;

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
            if (!diag && w?.live) diag = { live: Object.keys(w.live), sealType: typeof s, sealKeys: s && typeof s === "object" ? Object.keys(s) : null };
            if (c) out.push({ t, p: [c.position.x, c.position.y, c.position.z], q: [c.quaternion.x, c.quaternion.y, c.quaternion.z, c.quaternion.w], fov: c.fov, up: [c.up.x, c.up.y, c.up.z], seal: s ? [s.x, s.z] : null });
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

const samples = raw.out.filter((s) => s.seal);
console.log("samples", raw.out.length, "with seal", samples.length, "diag", JSON.stringify(raw.diag));
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
const rest = [median(samples.filter((s) => s.t >= 0.6 && s.t <= 1.1).map((s) => s.seal[0])), median(samples.filter((s) => s.t >= 0.6 && s.t <= 1.1).map((s) => s.seal[1]))];
const rigSamples = samples.map((s) => ({ t: s.t, p: ry(-TURN, [s.p[0] - s.seal[0], s.p[1], s.p[2] - s.seal[1]]), f: norm(ry(-TURN, fwd(s.q))), fov: s.fov, up: ry(-TURN, s.up) }));

const maxStep = (rows) => rows.reduce((m, r, i) => (i ? Math.max(m, Math.hypot(...r.p.map((v, k) => v - rows[i - 1].p[k]))) : m), 0);
const stats = (rows) => {
  const f = norm(med3(rows.map((r) => r.f)));
  return { n: rows.length, step: +maxStep(rows).toFixed(3), eye: med3(rows.map((r) => r.p)).map((v) => +v.toFixed(4)), fwd: f.map((v) => +v.toFixed(4)), fov: +median(rows.map((r) => r.fov)).toFixed(3), up: norm(med3(rows.map((r) => r.up))).map((v) => +v.toFixed(4)), pitchDeg: +((Math.asin(f[1]) * 180) / Math.PI).toFixed(2) };
};
const windows = {};
for (const [name, [a, b]] of Object.entries(WINDOWS)) windows[name] = stats(rigSamples.filter((s) => s.t >= a && s.t < b));

const shot = (k) => (windows[k]?.n >= 8 ? { eye: windows[k].eye, aim: windows[k].eye.map((v, i) => +(v + LOOK * windows[k].fwd[i]).toFixed(4)), fov: windows[k].fov } : null);
const two = shot("two");
if (!two) { console.error("two window has fewer than 8 samples"); process.exit(1); }
const lens = Object.fromEntries(KEYS.map((k) => [k, shot(k) ?? { ...two }]));
const FOV = two.fov;
const bins = new Set();
const path = rigSamples.filter((r) => (bins.has(Math.floor(r.t * 2)) ? false : bins.add(Math.floor(r.t * 2)))).map((r) => ({ t: +r.t.toFixed(2), eye: r.p.map((v) => +v.toFixed(3)), fwd: r.f.map((v) => +v.toFixed(3)), fov: +r.fov.toFixed(2) }));
const out = { id: ID, secs, samples: samples.length, rest: rest.map((v) => +v.toFixed(4)), TURN, FOV, windows, LENS: lens, path };
writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");

const fmt = (v) => `[${v.map((x) => +x.toFixed(3)).join(", ")}]`;
const row = (k) => `  ${k}: { eye: ${fmt(lens[k].eye)}, aim: ${fmt(lens[k].aim)}, fov: ${lens[k].fov} },`;
writeFileSync(LENS_OUT, [
  `// LENS: the live camera per shot, measured by lib/anime/tools/cuts/p-resolvent/livecam.mjs from ${samples.length} samples of the deployed site`,
  "// (rig frame: pup at the origin facing +z, metres; fov in degrees; aim = eye + 30 m along the measured forward).",
  "export const LENS = {",
  ...KEYS.map(row),
  "};",
  `export const FOV = ${FOV};`,
  "",
].join("\n"));
console.log(JSON.stringify({ FOV, samples: samples.length, counts: Object.fromEntries(Object.entries(windows).map(([k, v]) => [k, v.n])), LENS: lens }));
