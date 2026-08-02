/* global document, requestAnimationFrame */
// Compositor cost. GPU timer queries measure the WebGL context's own execution
// and JS timing measures the main thread; neither sees the browser blurring a
// live canvas behind a HUD panel. This measures the presented frame with the
// page's backdrop filters on and then off, in the same session, so the
// difference is the compositor's share and nothing else.
import { chromium } from "playwright";

const BASE = process.env.PROBE_BASE || "http://localhost:3100";
const browser = await chromium.launch({
  channel: "chrome",
  headless: false,
  args: ["--enable-gpu", "--window-position=0,0"],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 180000 });
await page.waitForTimeout(1500);
await page.locator("button", { hasText: /enter the world|start/i }).first().click().catch(() => {});
await page
  .waitForFunction(() => document.querySelector("#world")?.dataset.rendererMode === "webgl", {
    timeout: 150000,
  })
  .catch(() => {});
await page.waitForTimeout(9000);

const sample = () =>
  page.evaluate(
    () =>
      new Promise((resolve) => {
        const deltas = [];
        let last = performance.now();
        const tick = () => {
          const now = performance.now();
          deltas.push(now - last);
          last = now;
          if (deltas.length < 220) requestAnimationFrame(tick);
          else {
            const sorted = deltas.slice(20).sort((a, b) => a - b);
            resolve({
              median: Math.round(sorted[Math.floor(sorted.length / 2)] * 10) / 10,
              p95: Math.round(sorted[Math.floor(sorted.length * 0.95)] * 10) / 10,
            });
          }
        };
        requestAnimationFrame(tick);
      }),
  );

// A radius-capping case belongs here and is deliberately absent: an attempt at
// one used attribute selectors broad enough to ADD backdrop-filter to elements
// that had none, and duly measured 36.8ms against a 31.3ms baseline. Any such
// case has to name the rules it is narrowing, not pattern-match class names.
const cases = [
  { name: "as shipped", css: "" },
  {
    name: "no backdrop-filter",
    css: "*, *::before, *::after { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }",
  },
  {
    name: "no blend modes",
    css: "*, *::before, *::after { mix-blend-mode: normal !important; }",
  },
  {
    name: "neither",
    css: "*, *::before, *::after { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; mix-blend-mode: normal !important; }",
  },
  { name: "as shipped (repeat)", css: "" },
];

for (const testCase of cases) {
  await page.bringToFront();
  await page.evaluate((css) => {
    let style = document.getElementById("probe-composite-style");
    if (!style) {
      style = document.createElement("style");
      style.id = "probe-composite-style";
      document.head.appendChild(style);
    }
    style.textContent = css;
  }, testCase.css);
  await page.waitForTimeout(1200);
  const row = await sample();
  console.log(
    `${testCase.name.padEnd(22)} ${String(row.median).padStart(6)}ms  p95 ${String(row.p95).padStart(6)}ms  ${Math.round(1000 / row.median)}fps`,
  );
}

await browser.close();
