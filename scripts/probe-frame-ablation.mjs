/* global document, requestAnimationFrame */
// Which subsystem owns the frame. The frame is fragment-bound, so draw counts
// cannot apportion it; each run disables one subsystem via its qa flag and
// reports the frame time that remains. Real Chrome, focused window, production
// build — Chrome throttles rAF in unfocused windows and would report fiction.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.PROBE_BASE || "http://localhost:3100";
const OUT = process.argv[2] || "verification/frame-ablation";
await mkdir(OUT, { recursive: true });

const CASES = [
  { name: "baseline", query: "" },
  { name: "no-post", query: "qa-no-post=1" },
  { name: "no-terrain", query: "qa-no-terrain=1" },
  { name: "no-post+no-terrain", query: "qa-no-post=1&qa-no-terrain=1" },
  { name: "no-mechanisms", query: "qa-no-mechanisms=1" },
  { name: "no-signals", query: "qa-no-signals=1" },
  { name: "no-dressing", query: "qa-no-dressing=1" },
  { name: "no-dome", query: "qa-no-dome=1" },
  { name: "no-seal", query: "qa-no-seal=1" },
];

const browser = await chromium.launch({
  channel: "chrome",
  headless: false,
  // Unthrottled presentation. With vsync on, the presented interval quantises to
  // multiples of the refresh period, so a subsystem can be removed entirely and
  // the measured frame will not move until the total crosses a vsync boundary —
  // which makes per-subsystem cost look like a step function instead of a cost.
  args: [
    "--enable-gpu",
    "--window-position=0,0",
    "--disable-gpu-vsync",
    "--disable-frame-rate-limit",
  ],
});

const results = [];
for (const testCase of CASES) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const url = testCase.query ? `${BASE}/?${testCase.query}` : BASE;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForTimeout(1500);
  await page.locator("button", { hasText: /enter the world|start/i }).first().click().catch(() => {});
  await page
    .waitForFunction(() => document.querySelector("#world")?.dataset.rendererMode === "webgl", {
      timeout: 150000,
    })
    .catch(() => {});
  // Let the background warm pass finish so its idle slices are not sampled.
  await page.waitForTimeout(9000);
  await page.bringToFront();

  const sample = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const deltas = [];
        let last = performance.now();
        const tick = () => {
          const now = performance.now();
          deltas.push(now - last);
          last = now;
          if (deltas.length < 260) requestAnimationFrame(tick);
          else {
            const usable = deltas.slice(20).sort((a, b) => a - b);
            resolve({
              median: usable[Math.floor(usable.length / 2)],
              p95: usable[Math.floor(usable.length * 0.95)],
              focused: document.hasFocus(),
              samples: usable.length,
            });
          }
        };
        requestAnimationFrame(tick);
      }),
  );
  const row = {
    case: testCase.name,
    medianMs: Math.round(sample.median * 10) / 10,
    p95Ms: Math.round(sample.p95 * 10) / 10,
    fps: Math.round(1000 / sample.median),
    focused: sample.focused,
  };
  results.push(row);
  console.log(
    `${testCase.name.padEnd(20)} ${String(row.medianMs).padStart(6)}ms  p95 ${String(row.p95Ms).padStart(6)}ms  ${row.fps}fps  focused=${row.focused}`,
  );
  await context.close();
}

const baseline = results.find((row) => row.case === "baseline");
if (baseline) {
  console.log("\nshare of the frame, vs baseline:");
  for (const row of results) {
    if (row.case === "baseline") continue;
    const saved = baseline.medianMs - row.medianMs;
    console.log(
      `${row.case.padEnd(20)} saves ${String(Math.round(saved * 10) / 10).padStart(6)}ms  ` +
        `(${Math.round((saved / baseline.medianMs) * 100)}% of frame)`,
    );
  }
}

await writeFile(path.join(OUT, "ablation.json"), JSON.stringify(results, null, 2));
await browser.close();
