/* global window, sessionStorage, requestAnimationFrame, performance */
// node lib/anime/tools/cuts/pr-pyrefly-4180/livecam.mjs [--explore] [outDir]: samples the live site's camera while its cutscene plays
// (real Chrome, one GPU slot), converts each sample to the rig frame, prints per-phase medians and the spread of the eye.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { launchChrome } from "../../../../../scripts/cut-cap.mjs";
import { withGpuLock } from "../../../../../scripts/cut-lock.mjs";
import { TURN } from "../../../cutscenes/pr-pyrefly-4180/clock.js";

const explore = process.argv.includes("--explore");
const outDir = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "verification/faithful/pr-pyrefly-4180";
const base = "https://evilseal.si";
const SECS = 30;
const PHASES = { pre: [0.0, 0.25], dock: [0.05, 1.1], a: [2.4, 7.8], b: [8.0, 14.2], c: [14.4, 22.7], d: [22.9, 25.9], home: [26.9, 28.3], post: [28.6, 29.8] };

const raw = await withGpuLock("livecam pr-pyrefly-4180", async () => {
  const browser = await launchChrome();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    await page.goto(`${base}/?play&spawn=pr-pyrefly-4180&debug`, { waitUntil: "load", timeout: 180000 });
    await page.waitForFunction(() => window.__world && window.__replay, null, { timeout: 180000 });
    await page.waitForTimeout(6000);
    if (explore) {
      const shape = await page.evaluate(() => {
        const w = window.__world;
        const keys = (o) => (o && typeof o === "object" ? Object.keys(o).slice(0, 60) : o);
        return { world: keys(w), live: keys(w.live), arrival: keys(w.live?.arrival), seal: keys(w.live?.seal), clock: keys(w.clock), camera: keys(w.camera), cameraFov: w.camera?.fov };
      });
      console.log(JSON.stringify(shape, null, 1));
      return null;
    }
    await page.evaluate((id) => { try { sessionStorage.removeItem("seal:seen"); } catch {} window.__replay(id); }, "pr-pyrefly-4180");
    return await page.evaluate((secs) => new Promise((resolve) => {
      const out = [];
      const t0 = performance.now();
      const step = () => {
        const w = window.__world;
        const e = w.camera.matrixWorld.elements;
        out.push({
          t: w.clock.elapsedTime - w.live.arrival.start,
          cam: [e[12], e[13], e[14]],
          fwd: [-e[8], -e[9], -e[10]],
          fov: w.camera.fov,
          seal: [w.live.seal.x, w.live.seal.z],
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

if (!raw) process.exit(0);
const c = Math.cos(TURN), s = Math.sin(TURN);
const toRig = (v, seal) => {
  const x = v[0] - (seal ? seal[0] : 0), z = v[2] - (seal ? seal[1] : 0);
  return [c * x - s * z, v[1], s * x + c * z];
};
const samples = raw.map((r) => ({ t: r.t, eye: toRig(r.cam, r.seal), fwd: toRig(r.fwd), fov: r.fov, seal: r.seal, cam: r.cam }));
const median = (a) => { const b = [...a].sort((x, y) => x - y); const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
const lens = {};
let report = "";
for (const [name, [t0, t1]] of Object.entries(PHASES)) {
  const ph = samples.filter((s) => s.t >= t0 && s.t <= t1);
  if (ph.length === 0) { report += `${name}: 0 samples\n`; continue; }
  const eye = [0, 1, 2].map((i) => median(ph.map((s) => s.eye[i])));
  const fwd = [0, 1, 2].map((i) => median(ph.map((s) => s.fwd[i])));
  const spread = Math.max(...[0, 1, 2].map((i) => Math.max(...ph.map((s) => Math.abs(s.eye[i] - eye[i])))));
  lens[name] = { n: ph.length, eye: eye.map((v) => +v.toFixed(3)), fwd: fwd.map((v) => +v.toFixed(3)), spread: +spread.toFixed(3) };
  report += `${name}: n ${ph.length}, eye ${eye.map((v) => v.toFixed(2)).join(" ")}, fwd ${fwd.map((v) => v.toFixed(2)).join(" ")}, spread ${spread.toFixed(2)} m\n`;
}
const fovMed = median(samples.map((s) => s.fov));
mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "livecam.json"), JSON.stringify({ samples: samples.length, turn: TURN, fov: fovMed, phases: lens, raw: samples.map((s) => ({ t: +s.t.toFixed(3), cam: s.cam.map((v) => +v.toFixed(3)), seal: s.seal.map((v) => +v.toFixed(3)), eye: s.eye.map((v) => +v.toFixed(3)), fwd: s.fwd.map((v) => +v.toFixed(3)), fov: s.fov })) }));
console.log(`samples ${samples.length} (need >= 1000), FOV ${fovMed.toFixed(2)}`);
console.log(report.trimEnd());
