// node lib/anime/tools/cuts/pr-nemo-relay-481/livecam.mjs [seconds=30]: samples the live camera and the seal in real Chrome (evilseal.si, __replay) and writes livecam.json and lens.js.
import { writeFileSync } from "node:fs";
import { launchChrome } from "../../../../../scripts/cut-cap.mjs";
import { withGpuLock } from "../../../../../scripts/cut-lock.mjs";
import { heightAt, WATER_Y } from "../../../../../lib/world/terrain.js";

const ID = "pr-nemo-relay-481";
const secs = Number(process.argv[2] ?? 30);
const OUT = new URL("./livecam.json", import.meta.url);
const LENS_OUT = new URL("../../../cutscenes/pr-nemo-relay-481/lens.js", import.meta.url);
const WINDOWS = { island: [0, 2.0], bloom: [1.3, 2.4], a: [2.4, 7.4], b: [8.4, 11.8], c: [13.7, 18.5], spent: [19.0, 20.6], credit: [20.9, 24.6], home: [26.0, 28.5] };
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
            if (c) out.push({ t, p: [c.position.x, c.position.y, c.position.z], q: [c.quaternion.x, c.quaternion.y, c.quaternion.z, c.quaternion.w], fov: c.fov, seal: s ? [s.x, s.z] : null });
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
const ground = (x, z) => Math.max(heightAt(x, z), WATER_Y);
const rigSamples = samples.map((s) => ({ t: s.t, p: ry(-TURN, [s.p[0] - s.seal[0], s.p[1] - ground(s.seal[0], s.seal[1]), s.p[2] - s.seal[1]]), f: norm(ry(-TURN, fwd(s.q))), fov: s.fov }));

const maxStep = (rows) => rows.reduce((m, r, i) => (i ? Math.max(m, Math.hypot(...r.p.map((v, k) => v - rows[i - 1].p[k]))) : m), 0);
const stats = (rows) => ({ n: rows.length, step: +maxStep(rows).toFixed(3), eye: med3(rows.map((r) => r.p)), fwd: norm(med3(rows.map((r) => r.f))), fov: median(rows.map((r) => r.fov)) });
const near = (m) => rigSamples.reduce((b, s) => (Math.abs(s.t - m) < Math.abs(b.t - m) ? s : b));
const windows = Object.fromEntries(Object.entries(WINDOWS).map(([k, [a, b]]) => { const rows = rigSamples.filter((s) => s.t >= a && s.t < b); return [k, { ...stats(rows.length ? rows : [near((a + b) / 2)]), n: rows.length }]; }));
console.log("window counts", JSON.stringify(Object.fromEntries(Object.entries(windows).map(([k, w]) => [k, w.n]))), "first", samples[0].t.toFixed(2), "last", samples.at(-1).t.toFixed(2));
const FOV = +median(rigSamples.map((s) => s.fov)).toFixed(3);

const r4 = (v) => v.map((x) => +x.toFixed(4));
const series = rigSamples.filter((_, i) => i % 12 === 0).map((s) => ({ t: +s.t.toFixed(2), eye: r4(s.p), fwd: r4(s.f) }));
const out = { id: ID, secs, samples: samples.length, TURN, LOOK, FOV, ground: +ground(samples[0].seal[0], samples[0].seal[1]).toFixed(3), windows: Object.fromEntries(Object.entries(windows).map(([k, w]) => [k, { ...w, eye: r4(w.eye), fwd: r4(w.fwd), aim: r4(w.eye.map((v, i) => v + LOOK * w.fwd[i])) }])), series };
writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");

const fmt = (v) => `[${v.map((x) => +x.toFixed(3)).join(", ")}]`;
writeFileSync(LENS_OUT, [
  `// LENS: the live camera per shot, measured by livecam.mjs from ${samples.length} samples: [eye, forward] in the rig frame (seal at the origin facing +z, metres).`,
  "export const LENS = {",
  ...Object.keys(WINDOWS).map((k) => `  ${k}: [${fmt(windows[k].eye)}, ${fmt(windows[k].fwd)}],`),
  "};",
  `export const FOV = ${FOV};`,
  "",
].join("\n"));
console.log(JSON.stringify({ FOV, samples: samples.length, counts: Object.fromEntries(Object.entries(windows).map(([k, v]) => [k, v.n])) }));
