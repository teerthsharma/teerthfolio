// node lib/anime/tools/cuts/pr-highway-3244/livecam.mjs [seconds=29]: samples the LIVE camera on every frame in real Chrome (evilseal.si, spawn pr-highway-3244, __replay) and writes livecam.json and cutscenes/pr-highway-3244/lens.js in the rig frame (the dock at the origin, the pup facing +z).
import { writeFileSync } from "node:fs";
import { launchChrome } from "../../../../../scripts/cut-cap.mjs";
import { withGpuLock } from "../../../../../scripts/cut-lock.mjs";

const ID = "pr-highway-3244";
const secs = Number(process.argv[2] ?? 29);
const OUT = new URL("./livecam.json", import.meta.url);
const LENS_OUT = new URL("../../../cutscenes/pr-highway-3244/lens.js", import.meta.url);
const WINDOWS = { island: [0.0, 0.4], two: [0.8, 1.1], wide: [1.6, 1.95], settle: [3.0, 6.0], cry: [7.9, 8.3], race: [10.0, 14.0], flag: [14.85, 15.15], back: [16.0, 20.5], credit: [21.5, 24.8], home: [26.0, 28.5] };
const TURN = -5.6796233186;
const DOCK = [-28, 0, -18.8];

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

const samples = raw.out;
console.log("samples", raw.out.length, "with seal", raw.out.filter((s) => s.seal).length, "diag", JSON.stringify(raw.diag));
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
const seals = samples.filter((s) => s.seal);
const anchor = seals.length ? [median(seals.map((s) => s.seal[0])), median(seals.map((s) => s.seal[1]))] : [DOCK[0], DOCK[2]];
const rigSamples = samples.map((s) => ({ t: s.t, p: ry(-TURN, [s.p[0] - anchor[0], s.p[1], s.p[2] - anchor[1]]), f: norm(ry(-TURN, fwd(s.q))), fov: s.fov, up: ry(-TURN, s.up) }));

const maxStep = (rows) => rows.reduce((m, r, i) => (i ? Math.max(m, Math.hypot(...r.p.map((v, k) => v - rows[i - 1].p[k]))) : m), 0);
const stats = (rows) => ({ n: rows.length, step: +maxStep(rows).toFixed(3), eye: med3(rows.map((r) => r.p)).map((v) => +v.toFixed(4)), fwd: norm(med3(rows.map((r) => r.f))).map((v) => +v.toFixed(4)), fov: +median(rows.map((r) => r.fov)).toFixed(3), up: norm(med3(rows.map((r) => r.up))).map((v) => +v.toFixed(4)) });
const windows = {};
for (const [name, [a, b]] of Object.entries(WINDOWS)) windows[name] = stats(rigSamples.filter((s) => s.t >= a && s.t < b));
const kept = Object.entries(windows).filter(([, v]) => v.n >= 8);
const LENS = Object.fromEntries(kept.map(([k, v]) => [k, [v.eye, v.fwd]]));
const FOVS = Object.fromEntries(kept.map(([k, v]) => [k, v.fov]));
const FOV = +median(kept.flatMap(([k]) => rigSamples.filter((s) => s.t >= WINDOWS[k][0] && s.t < WINDOWS[k][1]).map((s) => s.fov))).toFixed(3);
const out = { id: ID, secs, samples: samples.length, anchor: anchor.map((v) => +v.toFixed(4)), anchorVsDock: +Math.hypot(anchor[0] - DOCK[0], anchor[1] - DOCK[2]).toFixed(4), TURN, FOV, windows, LENS };
writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");

const fmt = (v) => `[${v.map((x) => +x.toFixed(3)).join(", ")}]`;
writeFileSync(LENS_OUT, [
  `// LENS: the live camera per window, measured by livecam.mjs from ${samples.length} samples (rig frame: the dock at the origin, the pup facing +z; metres).`,
  `export const FOV = ${FOV};`,
  `export const FOVS = { ${kept.map(([k]) => `${k}: ${FOVS[k]}`).join(", ")} };`,
  "export const LENS = {",
  ...kept.map(([k]) => `  ${k}: [${fmt(LENS[k][0])}, ${fmt(LENS[k][1])}],`),
  "};",
  `export const RIG_NOTE = "eye and forward in the rig frame: the dock at the origin, the pup facing +z";`,
  "",
].join("\n"));
console.log(JSON.stringify({ FOV, anchorVsDock: out.anchorVsDock, counts: Object.fromEntries(Object.entries(windows).map(([k, v]) => [k, v.n])), missing: Object.keys(WINDOWS).filter((k) => !LENS[k]) }));
