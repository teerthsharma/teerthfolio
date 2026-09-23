/* global document, window, HTMLCanvasElement, requestAnimationFrame */
// What does each station cost to render?
//
// Every frame measurement on this branch was taken at the home dock. The
// station mechanism layer only draws the station the traveller is at, so
// qa-no-mechanisms measures ~0 at spawn and says nothing about what the other
// seven cost once you arrive. A world that holds 60fps where you start and drops
// at a building you drive to is not smooth; it is smooth in one place.
//
// Docks at each station in turn and reports the presented frame and the GPU
// frame side by side, at a pinned tier.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.PROBE_BASE || "http://localhost:3100";
const OUT = process.argv[2] || "verification/station-frame-cost";
const TIER = process.env.PROBE_TIER || "medium";
const ARRIVAL_RADIUS = 4;
await mkdir(OUT, { recursive: true });

const STATIONS = [
  ["CO_01", "observatory-plaque", -3, 1],
  ["CO_02", "s2-kernel-core", 3, 8],
  ["CO_03", "manifold-reactor", -14, -6],
  ["CO_04", "field-chamber-coils", -10, -9],
  ["CO_05", "qpu-ice-bridge", 17, -13],
  ["CO_06", "upstream-radio-mast", 14, 12],
  ["CO_07", "topology-archive-wall", 11, -8],
  ["CO_08", "assembly-tool-locker", -16, 2],
];

const browser = await chromium.launch({
  channel: "chrome",
  headless: false,
  args: ["--enable-gpu", "--window-position=0,0"],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

await page.addInitScript(() => {
  const state = { samples: [], gl: null, ext: null, pool: [], pending: [], frameTotal: 0, last: 0 };
  window.__gpu = state;
  const rawGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    const gl = rawGetContext.call(this, type, ...rest);
    if (gl && type === "webgl2") {
      const ext = gl.getExtension("EXT_disjoint_timer_query_webgl2");
      if (ext) {
        state.gl = gl;
        state.ext = ext;
        state.pool = [];
        state.pending = [];
      }
    }
    return gl;
  };
  const rawRaf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (callback) =>
    rawRaf((time) => {
      const { gl, ext } = state;
      if (time !== state.last) {
        if (state.last !== 0 && state.frameTotal > 0) state.samples.push(state.frameTotal);
        state.frameTotal = 0;
        state.last = time;
      }
      if (!gl || gl.isContextLost()) return callback(time);
      const query = state.pool.pop() || gl.createQuery();
      let active = false;
      try {
        gl.beginQuery(ext.TIME_ELAPSED_EXT, query);
        active = true;
      } catch {
        state.pool.push(query);
      }
      const result = callback(time);
      if (active) {
        try {
          gl.endQuery(ext.TIME_ELAPSED_EXT);
          state.pending.push(query);
        } catch {
          state.pool.push(query);
        }
      }
      while (state.pending.length) {
        const head = state.pending[0];
        if (!gl.getQueryParameter(head, gl.QUERY_RESULT_AVAILABLE)) break;
        state.pending.shift();
        if (!gl.getParameter(ext.GPU_DISJOINT_EXT)) {
          state.frameTotal += gl.getQueryParameter(head, gl.QUERY_RESULT) / 1e6;
        }
        state.pool.push(head);
      }
      return result;
    });
});

await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 180000 });
await page.waitForTimeout(1800);
await page.locator("button", { hasText: /enter the world|start/i }).first().click().catch(() => {});
await page
  .waitForFunction(() => document.querySelector("#world")?.dataset.rendererMode === "webgl", {
    timeout: 150000,
  })
  .catch(() => {});
await page.bringToFront();
await page.waitForTimeout(24000);
await page.locator("button", { hasText: new RegExp(`^${TIER}$`, "i") }).first().click().catch(() => {});
await page.waitForTimeout(4000);

const readPose = () =>
  page.evaluate(() => {
    const world = document.querySelector("#world");
    return { x: Number(world?.dataset.worldX), z: Number(world?.dataset.worldZ) };
  });

const rows = [];
for (const [chip, id, sx, sz] of STATIONS) {
  await page.locator("button", { hasText: new RegExp(chip) }).first().click().catch(() => {});
  let pose = await readPose();
  let waited = 0;
  while (waited < 26000 && Math.hypot(pose.x - sx, pose.z - sz) > ARRIVAL_RADIUS) {
    await page.waitForTimeout(900);
    waited += 900;
    pose = await readPose();
  }
  // Let the station's machinery spin up: several are animated on docking, and
  // measuring during the spin-up reports the wrong steady state.
  await page.waitForTimeout(6000);
  await page.bringToFront();
  const row = await page.evaluate(
    () =>
      new Promise((resolve) => {
        window.__gpu.samples.length = 0;
        const deltas = [];
        let last = performance.now();
        const tick = () => {
          const now = performance.now();
          deltas.push(now - last);
          last = now;
          if (deltas.length < 150) requestAnimationFrame(tick);
          else {
            const presented = deltas.slice(20).sort((a, b) => a - b);
            const gpu = window.__gpu.samples.filter((v) => v > 0.5).sort((a, b) => a - b);
            resolve({
              presentedMs: Math.round(presented[Math.floor(presented.length / 2)] * 10) / 10,
              presentedP95: Math.round(presented[Math.floor(presented.length * 0.95)] * 10) / 10,
              gpuMs: gpu.length ? Math.round(gpu[Math.floor(gpu.length / 2)] * 100) / 100 : null,
              gpuSamples: gpu.length,
            });
          }
        };
        requestAnimationFrame(tick);
      }),
  );
  const final = await readPose();
  rows.push({ id, ...row, fps: Math.round(1000 / row.presentedMs) });
  console.log(
    `${id.padEnd(24)} presented ${String(row.presentedMs).padStart(6)}ms (${String(Math.round(1000 / row.presentedMs)).padStart(3)}fps)  ` +
      `p95 ${String(row.presentedP95).padStart(6)}ms  gpu ${String(row.gpuMs).padStart(6)}ms  ` +
      `at ${final.x.toFixed(1)},${final.z.toFixed(1)}`,
  );
}

const sorted = [...rows].sort((a, b) => b.presentedMs - a.presentedMs);
console.log(
  `\nworst ${sorted[0].id} at ${sorted[0].presentedMs}ms, best ${sorted.at(-1).id} at ${sorted.at(-1).presentedMs}ms — ` +
    `spread ${Math.round((sorted[0].presentedMs - sorted.at(-1).presentedMs) * 10) / 10}ms`,
);
await writeFile(path.join(OUT, "station-frame-cost.json"), JSON.stringify(rows, null, 2));
await browser.close();
