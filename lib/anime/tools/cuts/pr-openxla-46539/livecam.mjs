/* global window, requestAnimationFrame, performance */
// node lib/anime/tools/cuts/pr-openxla-46539/livecam.mjs [outDir]: samples the live site's camera while its cutscene plays (real
// Chrome, NVIDIA adapter pinned, one GPU slot). Each frame: eye and forward relative to live.seal, in world axes (no turn: the rig
// stands at DOCK unrotated, as build.js sets it). Writes <outDir>/livecam.json (default verification/faithful/pr-openxla-46539).
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchChrome } from "../../../../../scripts/cut-cap.mjs";
import { withGpuLock } from "../../../../../scripts/cut-lock.mjs";

const DOCK = "pr-openxla-46539";
const BASE = "https://evilseal.si";
const SECS = 28;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");
const outDir = path.resolve(ROOT, process.argv[2] ?? `verification/faithful/${DOCK}`);
const PHASES = {
  arr0: [0, 1.15], land: [1.15, 1.95], w: [1.95, 9.4], dash: [9.4, 10.5], dash2: [10.5, 11.4], w2: [11.4, 14.05],
  pull: [14.35, 14.8], w3: [15.4, 18.8], home: [19.6, 24.0],
};

const raw = await withGpuLock(`livecam ${DOCK}`, async () => {
  const browser = await launchChrome();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    await page.goto(`${BASE}/?play&spawn=${DOCK}&debug`, { waitUntil: "load", timeout: 180000 });
    await page.waitForFunction(() => window.__world && window.__replay, null, { timeout: 180000 });
    await page.waitForTimeout(6000);
    await page.evaluate((id) => { try { sessionStorage.removeItem("seal:seen"); } catch { /* private window */ } window.__replay(id); }, DOCK);
    return await page.evaluate((secs) => new Promise((resolve) => {
      const out = [];
      const t0 = performance.now();
      const step = () => {
        const w = window.__world, e = w.camera.matrixWorld.elements, q = w.camera.quaternion;
        out.push({
          t: w.clock.elapsedTime - w.live.arrival.start,
          pos: [e[12], e[13], e[14]],
          fwd: [-e[8], -e[9], -e[10]],
          quat: [q.x, q.y, q.z, q.w],
          fov: w.camera.fov,
          seal: [w.live.seal?.x ?? 0, w.live.seal?.y ?? 0, w.live.seal?.z ?? 0],
        });
        if (performance.now() - t0 < secs * 1000) requestAnimationFrame(step);
        else resolve(out);
      };
      requestAnimationFrame(step);
    }), SECS);
  } finally {
    await browser.close();
  }
});

const median = (a) => { const b = [...a].sort((x, y) => x - y), m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
const round = (v) => +v.toFixed(3);
const samples = raw.map((r) => ({
  t: r.t,
  eye: [r.pos[0] - r.seal[0], r.pos[1], r.pos[2] - r.seal[2]],
  fwd: r.fwd,
  quat: r.quat,
  fov: r.fov,
}));
const pose = (s) => ({ t: round(s.t), eye: s.eye.map(round), fwd: s.fwd.map(round), quat: s.quat.map(round) });
const phases = {};
let report = "";
for (const [name, [t0, t1]] of Object.entries(PHASES)) {
  const ph = samples.filter((s) => s.t >= t0 && s.t <= t1);
  if (!ph.length) { report += `${name}: 0 samples\n`; continue; }
  const eye = [0, 1, 2].map((i) => median(ph.map((s) => s.eye[i])));
  const fwd = [0, 1, 2].map((i) => median(ph.map((s) => s.fwd[i])));
  const spread = Math.max(...[0, 1, 2].map((i) => Math.max(...ph.map((s) => Math.abs(s.eye[i] - eye[i])))));
  const fov = median(ph.map((s) => s.fov));
  phases[name] = { t: [t0, t1], n: ph.length, eye: eye.map(round), fwd: fwd.map(round), spread: round(spread), fov: round(fov), first: pose(ph[0]), last: pose(ph.at(-1)) };
  report += `${name.padEnd(5)} n ${String(ph.length).padStart(4)}  eye ${eye.map((v) => v.toFixed(2)).join(" ")}  fwd ${fwd.map((v) => v.toFixed(2)).join(" ")}  fov ${fov.toFixed(2)}  spread ${spread.toFixed(3)} m\n`;
}
const fovAll = median(samples.map((s) => s.fov));
mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "livecam.json"), JSON.stringify({
  dock: DOCK, source: `${BASE} live replay, real Chrome, NVIDIA adapter pinned`, frame: "world axes, relative to live.seal; no turn",
  samples: samples.length, seconds: SECS, fov: round(fovAll), phases, raw: samples.map((s) => ({ t: round(s.t), eye: s.eye.map(round), fwd: s.fwd.map(round), fov: round(s.fov) })),
}));
console.log(`samples ${samples.length} (need >= 1000 for a LENS), FOV ${fovAll.toFixed(2)}`);
console.log(report.trimEnd());
console.log(`wrote ${path.join(outDir, "livecam.json")}`);
process.exit(0);
