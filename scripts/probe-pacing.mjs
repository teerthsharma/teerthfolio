/* global document, window */
// Frame pacing, not frame average. p95 sits ~11ms above the median, and that
// spread is what reads as stutter regardless of what the average says. This
// records every interval with its timestamp, splits them on whether the
// background shader warm-up had finished, and reports the worst frames with
// where they landed — so a spike can be traced to a cause instead of averaged
// into the noise.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.PROBE_BASE || "http://localhost:3100";
const OUT = process.argv[2] || "verification/pacing";
const SECONDS = Number(process.env.PROBE_SECONDS || 25);
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  channel: "chrome",
  headless: false,
  args: ["--enable-gpu", "--window-position=0,0"],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

await page.addInitScript(() => {
  const frames = [];
  window.__pace = frames;
  const raw = window.requestAnimationFrame.bind(window);
  let last = performance.now();
  const tick = () => {
    const now = performance.now();
    // One entry per presented frame, not per subscriber.
    frames.push({
      at: Math.round(now),
      dt: now - last,
      warm:
        document.querySelector("canvas.igloo-scene-canvas")?.dataset.shaderWarmComplete ?? null,
    });
    last = now;
    raw(tick);
  };
  raw(tick);
});

await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 180000 });
await page.waitForTimeout(1500);
await page.locator("button", { hasText: /enter the world|start/i }).first().click().catch(() => {});
await page
  .waitForFunction(() => document.querySelector("#world")?.dataset.rendererMode === "webgl", {
    timeout: 150000,
  })
  .catch(() => {});
await page.bringToFront();
await page.waitForTimeout(SECONDS * 1000);

const report = await page.evaluate(() => {
  const frames = window.__pace.filter((frame) => frame.dt > 0 && frame.dt < 4000);
  const describe = (list) => {
    if (!list.length) return null;
    const sorted = list.map((frame) => frame.dt).sort((a, b) => a - b);
    const at = (q) => Math.round(sorted[Math.floor(sorted.length * q)] * 10) / 10;
    return {
      count: sorted.length,
      medianMs: at(0.5),
      p95Ms: at(0.95),
      p99Ms: at(0.99),
      worstMs: Math.round(sorted.at(-1) * 10) / 10,
      // A frame more than half again the median is a hitch a person notices.
      hitches: sorted.filter((value) => value > at(0.5) * 1.5).length,
    };
  };
  const warmDone = frames.filter((frame) => frame.warm === "true");
  const warmRunning = frames.filter((frame) => frame.warm === "false");
  return {
    all: describe(frames),
    duringWarmup: describe(warmRunning),
    afterWarmup: describe(warmDone),
    worstFrames: [...frames]
      .sort((a, b) => b.dt - a.dt)
      .slice(0, 10)
      .map((frame) => ({ atMs: frame.at, dtMs: Math.round(frame.dt * 10) / 10, warm: frame.warm })),
  };
});

for (const [name, stats] of Object.entries(report)) {
  if (name === "worstFrames" || !stats) continue;
  console.log(
    `${name.padEnd(14)} n=${String(stats.count).padStart(5)}  median ${String(stats.medianMs).padStart(6)}ms  ` +
      `p95 ${String(stats.p95Ms).padStart(6)}ms  p99 ${String(stats.p99Ms).padStart(6)}ms  ` +
      `worst ${String(stats.worstMs).padStart(7)}ms  hitches ${stats.hitches}`,
  );
}
console.log("\nworst frames:", JSON.stringify(report.worstFrames));
await writeFile(path.join(OUT, "pacing.json"), JSON.stringify(report, null, 2));
await browser.close();
