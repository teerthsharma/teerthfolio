/* global document, window, WebGL2RenderingContext, requestAnimationFrame */
// Time-to-first-igloo-frame and steady-state frame cost, measured against a
// production build in real Chrome. Bundled chromium falls back to software
// raster and fakes order-of-magnitude regressions, so channel "chrome" and a
// headed window are load-bearing, not incidental.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.PROBE_BASE || "http://localhost:3000";
const OUT = process.argv[2] || "verification/render-timeline";
const RUNS = Number(process.env.PROBE_RUNS || 3);
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  channel: "chrome",
  headless: false,
  // Every run must be a first-time visit: Chrome's on-disk program cache
  // otherwise hides the exact stall being measured behind a warm second run.
  args: ["--enable-gpu", "--window-position=0,0", "--disable-gpu-shader-disk-cache"],
});

const results = [];

for (let run = 0; run < RUNS; run += 1) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__probe = { longTasks: [], frames: [], marks: {} };
    window.__probe.t0 = performance.now();
    // The honest first-frame timestamp. A rAF poll cannot observe the world
    // appearing while the main thread is inside a multi-second driver link, so
    // it reports when it was next scheduled, not when the frame drew. Stamping
    // inside the draw call is recorded synchronously and survives starvation.
    {
      const proto = WebGL2RenderingContext.prototype;
      const marks = window.__probe.marks;
      let worldDraws = 0;
      for (const name of ["drawElements", "drawArrays", "drawElementsInstanced", "drawArraysInstanced"]) {
        const original = proto[name];
        proto[name] = function (...args) {
          if (this.canvas?.classList?.contains("igloo-scene-canvas")) {
            worldDraws += 1;
            if (worldDraws === 1) marks.firstWorldDraw = performance.now();
            if (worldDraws === 40) marks.fortiethWorldDraw = performance.now();
          }
          return original.apply(this, args);
        };
      }
    }
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__probe.longTasks.push({ start: entry.startTime, duration: entry.duration });
        }
      }).observe({ entryTypes: ["longtask"] });
    } catch {
      // No longtask support: the milestone numbers below still stand alone.
    }
    // First frame in which the world canvas has actually drawn: the app flips
    // #world[data-renderer-mode] to "webgl" when the R3F canvas is live, so the
    // next rAF after that flip is the first composited world frame.
    const poll = () => {
      const world = document.querySelector("#world");
      if (world?.dataset.rendererMode === "webgl") {
        requestAnimationFrame(() => {
          window.__probe.marks.firstWorldFrame = performance.now();
          let last = performance.now();
          const sample = () => {
            const now = performance.now();
            window.__probe.frames.push(now - last);
            last = now;
            if (window.__probe.frames.length < 600) requestAnimationFrame(sample);
          };
          requestAnimationFrame(sample);
        });
        return;
      }
      requestAnimationFrame(poll);
    };
    requestAnimationFrame(poll);
  });

  const started = Date.now();
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 180000 });
  const domContentLoaded = Date.now() - started;

  // The splash gates the world behind an explicit entry control.
  const enter = page.locator("button", { hasText: /enter the world/i }).first();
  let enterClickedAt = null;
  if (await enter.count()) {
    await enter.click({ timeout: 30000 }).catch(() => {});
    enterClickedAt = Date.now() - started;
  }

  await page
    .waitForFunction(() => window.__probe?.marks?.firstWorldFrame != null, { timeout: 120000 })
    .catch(() => {});
  // Let the frame sampler fill.
  await page.waitForTimeout(12000);

  const probe = await page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0];
    const paints = Object.fromEntries(
      performance.getEntriesByType("paint").map((entry) => [entry.name, entry.startTime]),
    );
    return {
      firstWorldFrame: window.__probe.marks.firstWorldFrame ?? null,
      firstWorldDraw: window.__probe.marks.firstWorldDraw ?? null,
      fortiethWorldDraw: window.__probe.marks.fortiethWorldDraw ?? null,
      longTasks: window.__probe.longTasks,
      frames: window.__probe.frames,
      paints,
      navigation: navigation
        ? {
            domContentLoaded: navigation.domContentLoadedEventEnd,
            responseEnd: navigation.responseEnd,
            loadEvent: navigation.loadEventEnd,
          }
        : null,
    };
  });

  const frames = probe.frames.filter((value) => value > 0 && value < 2000);
  const sorted = [...frames].sort((a, b) => a - b);
  const at = (q) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] : null);
  const summary = {
    run,
    domContentLoadedMs: domContentLoaded,
    enterClickedMs: enterClickedAt,
    firstWorldDrawMs: probe.firstWorldDraw,
    fortiethWorldDrawMs: probe.fortiethWorldDraw,
    firstWorldFrameMs: probe.firstWorldFrame,
    firstContentfulPaintMs: probe.paints["first-contentful-paint"] ?? null,
    longTaskCount: probe.longTasks.length,
    longTaskTotalMs: Math.round(probe.longTasks.reduce((sum, task) => sum + task.duration, 0)),
    longTaskWorstMs: Math.round(Math.max(0, ...probe.longTasks.map((task) => task.duration))),
    frameSamples: frames.length,
    frameMedianMs: at(0.5),
    frameP95Ms: at(0.95),
    frameP99Ms: at(0.99),
    frameWorstMs: sorted.at(-1) ?? null,
    framesOver33ms: frames.filter((value) => value > 33).length,
  };
  results.push({ summary, longTasks: probe.longTasks.slice(0, 40) });
  console.log(JSON.stringify(summary));
  await context.close();
}

await writeFile(path.join(OUT, "timeline.json"), JSON.stringify(results, null, 2));
await browser.close();
console.log("wrote", path.join(OUT, "timeline.json"));
