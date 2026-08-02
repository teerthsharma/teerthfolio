/* global document, window, HTMLCanvasElement */
// Real GPU time per frame, via EXT_disjoint_timer_query_webgl2, measured in
// pairs.
//
// Two cheaper instruments were tried first and both lie. With vsync on, the
// presented rAF interval quantises to multiples of the refresh period, so a
// subsystem can be removed and the frame will not move until the total crosses
// a boundary. With vsync off, rAF measures how fast commands are submitted, not
// how long they take to execute. A TIME_ELAPSED query wrapped around each
// frame's commands measures the thing itself.
//
// It still has to be measured in pairs. This GPU clocks down under sustained
// load: a nine-case sequence drifted +2.53ms end to end and a three-case
// sequence drifted +5.62ms, which is larger than every effect worth looking for
// except one. Each case is therefore measured immediately after its own fresh
// baseline, and the reported saving is the difference inside that pair.
// Absolute numbers still drift; the pairwise difference does not. A
// null-control pair — an unmodified page against an unmodified page — sets the
// floor below which no other row means anything.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.PROBE_BASE || "http://localhost:3100";
const OUT = process.argv[2] || "verification/gpu-time";
const WIDTH = Number(process.env.PROBE_WIDTH || 1440);
const HEIGHT = Number(process.env.PROBE_HEIGHT || 900);
const ONLY = process.env.PROBE_ONLY ? process.env.PROBE_ONLY.split(",") : null;
const REPEATS = Number(process.env.PROBE_REPEATS || 1);
await mkdir(OUT, { recursive: true });

const CASES = [
  { name: "no-terrain", query: "qa-no-terrain=1" },
  { name: "no-ground", query: "qa-no-ground=1" },
  { name: "no-sky", query: "qa-no-sky=1" },
  { name: "no-dome", query: "qa-no-dome=1" },
  { name: "no-shadows", query: "qa-no-shadows=1" },
  { name: "no-post", query: "qa-no-post=1" },
  { name: "no-dressing", query: "qa-no-dressing=1" },
  { name: "no-mechanisms", query: "qa-no-mechanisms=1" },
  { name: "no-signals", query: "qa-no-signals=1" },
  { name: "no-seal", query: "qa-no-seal=1" },
  { name: "null-control", query: "" },
].filter((testCase) => !ONLY || ONLY.includes(testCase.name));

function initScript() {
  const state = {
    samples: [],
    disjoint: 0,
    gl: null,
    ext: null,
    pool: [],
    pending: [],
    frameTotal: 0,
    lastFlush: 0,
  };
  window.__gpu = state;
  // The page creates more than one WebGL2 context (a capability probe runs
  // before the world) and discards the first, so always adopt the most recent.
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
      // Several rAF subscribers run per frame and more than one issues GL work,
      // so queries are accumulated against the frame they belong to and flushed
      // once per presented frame. A flat population median reports the largest
      // single pass rather than the frame.
      if (time !== state.lastFlush) {
        if (state.lastFlush !== 0 && state.frameTotal > 0) state.samples.push(state.frameTotal);
        state.frameTotal = 0;
        state.lastFlush = time;
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
        if (gl.getParameter(ext.GPU_DISJOINT_EXT)) state.disjoint += 1;
        else state.frameTotal += gl.getQueryParameter(head, gl.QUERY_RESULT) / 1e6;
        state.pool.push(head);
      }
      return result;
    });
}

const browser = await chromium.launch({
  channel: "chrome",
  headless: false,
  args: ["--enable-gpu", "--window-position=0,0"],
});

async function measure(query) {
  const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT } });
  const page = await context.newPage();
  await page.addInitScript(initScript);
  await page.goto(query ? `${BASE}/?${query}` : BASE, {
    waitUntil: "domcontentloaded",
    timeout: 180000,
  });
  await page.waitForTimeout(1500);
  await page.locator("button", { hasText: /enter the world|start/i }).first().click().catch(() => {});
  await page
    .waitForFunction(() => document.querySelector("#world")?.dataset.rendererMode === "webgl", {
      timeout: 150000,
    })
    .catch(() => {});
  // Past the staged scene admission and the background shader warm-up, so
  // neither is sampled.
  await page.waitForTimeout(9000);
  await page.bringToFront();
  await page.evaluate(() => {
    window.__gpu.samples.length = 0;
    window.__gpu.disjoint = 0;
  });
  await page.waitForTimeout(6000);
  const row = await page.evaluate(() => {
    const samples = window.__gpu.samples.filter((value) => value > 0.5 && value < 500);
    samples.sort((a, b) => a - b);
    const at = (q) => samples[Math.floor(samples.length * q)] ?? null;
    return {
      count: samples.length,
      disjoint: window.__gpu.disjoint,
      medianMs: at(0.5) == null ? null : Math.round(at(0.5) * 100) / 100,
    };
  });
  await context.close();
  return row;
}

const results = [];
for (const testCase of CASES) {
  const saved = [];
  for (let repeat = 0; repeat < REPEATS; repeat += 1) {
    const before = await measure("");
    const after = await measure(testCase.query);
    if (before.medianMs == null || after.medianMs == null) continue;
    saved.push(Math.round((before.medianMs - after.medianMs) * 100) / 100);
  }
  if (!saved.length) continue;
  const ordered = [...saved].sort((a, b) => a - b);
  const row = {
    case: testCase.name,
    savedMs: ordered[Math.floor(ordered.length / 2)],
    runs: saved,
    spreadMs: Math.round((ordered.at(-1) - ordered[0]) * 100) / 100,
  };
  results.push(row);
  console.log(
    `${testCase.name.padEnd(16)} saves ${String(row.savedMs).padStart(7)}ms  ` +
      `runs [${saved.join(", ")}]  spread ${row.spreadMs}ms`,
  );
}

const control = results.find((row) => row.case === "null-control");
if (control) {
  console.log(
    `\nnull-control measured ${control.savedMs}ms with spread ${control.spreadMs}ms — ` +
      "nothing smaller than that is a result",
  );
}

await writeFile(path.join(OUT, "gpu-time.json"), JSON.stringify(results, null, 2));
await browser.close();
