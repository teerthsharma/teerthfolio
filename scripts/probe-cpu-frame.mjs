/* global document, window */
// Is the frame CPU-bound or GPU-bound? Wraps requestAnimationFrame so the
// synchronous cost of the render callback (R3F's render plus every useFrame
// subscriber) is timed directly, and compares it against the wall-clock frame
// interval. If callback time ~= frame interval the main thread is the wall; if
// it is a small fraction, the GPU is.
import { chromium } from "playwright";

const BASE = process.env.PROBE_BASE || "http://localhost:3100";
const QUERY = process.env.PROBE_QUERY || "";
const browser = await chromium.launch({
  channel: "chrome",
  headless: false,
  args: ["--enable-gpu", "--window-position=0,0"],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

await page.addInitScript(() => {
  const stats = { callbacks: [], intervals: [] };
  window.__cpu = stats;
  const raw = window.requestAnimationFrame.bind(window);
  let last = performance.now();
  window.requestAnimationFrame = (callback) =>
    raw((time) => {
      const start = performance.now();
      stats.intervals.push(start - last);
      last = start;
      const result = callback(time);
      stats.callbacks.push(performance.now() - start);
      return result;
    });
});

await page.goto(QUERY ? `${BASE}/?${QUERY}` : BASE, {
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
await page.waitForTimeout(9000);
await page.bringToFront();

const report = await page.evaluate(
  () =>
    new Promise((resolve) => {
      window.__cpu.callbacks.length = 0;
      window.__cpu.intervals.length = 0;
      setTimeout(() => {
        const median = (list) => {
          const sorted = [...list].sort((a, b) => a - b);
          return Math.round(sorted[Math.floor(sorted.length / 2)] * 10) / 10;
        };
        const canvas = document.querySelector("canvas.igloo-scene-canvas");
        resolve({
          samples: window.__cpu.callbacks.length,
          // Several rAF subscribers exist per frame; sum them per frame is not
          // separable here, so report the total callback time per frame as the
          // sum of all callbacks divided by the number of frame intervals.
          callbackTotalMs:
            Math.round(
              (window.__cpu.callbacks.reduce((sum, value) => sum + value, 0) /
                Math.max(1, window.__cpu.intervals.filter((value) => value > 4).length)) *
                10,
            ) / 10,
          callbackMedianMs: median(window.__cpu.callbacks),
          intervalMedianMs: median(window.__cpu.intervals.filter((value) => value > 4)),
          canvas: canvas ? `${canvas.width}x${canvas.height}` : null,
        });
      }, 5000);
    }),
);
console.log(JSON.stringify(report));
await browser.close();
