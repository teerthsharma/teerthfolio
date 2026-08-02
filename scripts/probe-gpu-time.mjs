/* global document, window, HTMLCanvasElement */
// Real GPU time per frame, via EXT_disjoint_timer_query_webgl2.
//
// Neither of the cheaper instruments answers this. With vsync on, the presented
// rAF interval quantises to multiples of the refresh period, so a subsystem can
// be removed and the frame will not move until the total crosses a boundary.
// With vsync off, rAF measures how fast commands are submitted, not how long
// they take to execute. A TIME_ELAPSED query wrapped around each frame's
// commands measures the thing itself.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.PROBE_BASE || "http://localhost:3100";
const OUT = process.argv[2] || "verification/gpu-time";
await mkdir(OUT, { recursive: true });

// Viewport override, so fill sensitivity can be measured on the same instrument
// as everything else. The earlier device-pixel-ratio sweep used presented rAF
// intervals, which quantise to the refresh period and therefore cannot resolve
// a few milliseconds either way.
const WIDTH = Number(process.env.PROBE_WIDTH || 1440);
const HEIGHT = Number(process.env.PROBE_HEIGHT || 900);
const ONLY = process.env.PROBE_ONLY ? process.env.PROBE_ONLY.split(",") : null;

const CASES = [
  { name: "baseline", query: "" },
  { name: "no-terrain", query: "qa-no-terrain=1" },
  { name: "no-sky", query: "qa-no-sky=1" },
  { name: "no-dome", query: "qa-no-dome=1" },
  { name: "no-post", query: "qa-no-post=1" },
  { name: "no-dressing", query: "qa-no-dressing=1" },
  { name: "no-mechanisms", query: "qa-no-mechanisms=1" },
  { name: "no-signals", query: "qa-no-signals=1" },
  { name: "no-seal", query: "qa-no-seal=1" },
  { name: "no-shadows", query: "qa-no-shadows=1" },
].filter((testCase) => !ONLY || ONLY.includes(testCase.name));

const browser = await chromium.launch({
  channel: "chrome",
  headless: false,
  args: ["--enable-gpu", "--window-position=0,0"],
});

const results = [];
for (const testCase of CASES) {
  const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT } });
  const page = await context.newPage();
  await page.addInitScript(() => {
    const state = { samples: [], disjoint: 0, gl: null, ext: null, pool: [], pending: [] };
    window.__gpu = state;
    // The page creates more than one WebGL2 context (a capability probe runs
    // before the world), and the first one is discarded. Always adopt the most
    // recent, and keep the frame wrapper independent of which one that is.
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
        if (!gl || gl.isContextLost()) return callback(time);
        let query = state.pool.pop() || gl.createQuery();
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
          if (gl.getParameter(ext.GPU_DISJOINT_EXT)) state.disjoint += 1;
          else state.samples.push(gl.getQueryParameter(head, gl.QUERY_RESULT) / 1e6);
          state.pool.push(head);
        }
        return result;
      });
  });

  const url = testCase.query ? `${BASE}/?${testCase.query}` : BASE;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForTimeout(1500);
  await page.locator("button", { hasText: /enter the world|start/i }).first().click().catch(() => {});
  await page
    .waitForFunction(() => document.querySelector("#world")?.dataset.rendererMode === "webgl", {
      timeout: 150000,
    })
    .catch(() => {});
  await page.waitForTimeout(9000);
  await page.bringToFront();
  await page.evaluate(() => {
    window.__gpu.samples.length = 0;
    window.__gpu.disjoint = 0;
  });
  await page.waitForTimeout(6000);

  const row = await page.evaluate(() => {
    // Several rAF subscribers run per frame and most issue no GL commands at
    // all, so their queries return a few microseconds. Only the render callback
    // is a frame; 0.5ms separates it from the bookkeeping ones cleanly.
    const samples = window.__gpu.samples.filter((value) => value > 0.5 && value < 500);
    samples.sort((a, b) => a - b);
    const at = (q) => samples[Math.floor(samples.length * q)] ?? null;
    return {
      count: samples.length,
      disjoint: window.__gpu.disjoint,
      medianMs: at(0.5) == null ? null : Math.round(at(0.5) * 100) / 100,
      p95Ms: at(0.95) == null ? null : Math.round(at(0.95) * 100) / 100,
    };
  });
  results.push({ case: testCase.name, ...row });
  console.log(
    `${testCase.name.padEnd(16)} gpu ${String(row.medianMs).padStart(7)}ms  ` +
      `p95 ${String(row.p95Ms).padStart(7)}ms  n=${row.count} disjoint=${row.disjoint}`,
  );
  await context.close();
}

const baseline = results.find((row) => row.case === "baseline");
if (baseline?.medianMs) {
  console.log(`\nGPU budget against a ${baseline.medianMs}ms baseline:`);
  for (const row of results) {
    if (row.case === "baseline" || row.medianMs == null) continue;
    const saved = Math.round((baseline.medianMs - row.medianMs) * 100) / 100;
    console.log(
      `${row.case.padEnd(16)} ${String(saved).padStart(7)}ms  ` +
        `(${Math.round((saved / baseline.medianMs) * 100)}%)`,
    );
  }
}

await writeFile(path.join(OUT, "gpu-time.json"), JSON.stringify(results, null, 2));
await browser.close();
