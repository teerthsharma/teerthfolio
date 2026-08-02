/* global document, window, WebGL2RenderingContext */
// When do the 76 program links actually resolve, and what is mounted at that
// moment? Bins link-blocking cost by 250ms so a wall of links is visually
// distinguishable from a spread, and records the scene admission bucket next to
// it so a staging change can be confirmed rather than assumed.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.PROBE_BASE || "http://localhost:3100";
const OUT = process.argv[2] || "verification/link-timeline";
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  channel: "chrome",
  headless: false,
  args: ["--enable-gpu", "--window-position=0,0", "--disable-gpu-shader-disk-cache"],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

await page.addInitScript(() => {
  const events = [];
  window.__links = events;
  const proto = WebGL2RenderingContext.prototype;
  for (const name of ["getProgramParameter", "linkProgram", "compileShader", "getUniformLocation"]) {
    const original = proto[name];
    proto[name] = function (...args) {
      const start = performance.now();
      const result = original.apply(this, args);
      const cost = performance.now() - start;
      if (cost > 0.5) {
        events.push({
          call: name,
          at: Math.round(start),
          ms: Math.round(cost * 10) / 10,
          bucket: document.querySelector("canvas.igloo-scene-canvas")?.parentElement?.dataset
            ?.renderBucket ?? null,
        });
      }
      return result;
    };
  }
});

await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 180000 });
await page.waitForTimeout(1500);
await page.locator("button", { hasText: /enter the world|start/i }).first().click().catch(() => {});
await page
  .waitForFunction(() => document.querySelector("#world")?.dataset.rendererMode === "webgl", {
    timeout: 150000,
  })
  .catch(() => console.log("never reached webgl"));
await page.waitForTimeout(8000);

const data = await page.evaluate(() => ({
  events: window.__links,
  bucketAttr:
    document.querySelector("[data-render-bucket]")?.dataset?.renderBucket ?? "ATTRIBUTE MISSING",
}));

const bins = new Map();
for (const event of data.events) {
  const bin = Math.floor(event.at / 250) * 250;
  bins.set(bin, (bins.get(bin) || 0) + event.ms);
}
const top = [...bins.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
console.log("final bucket attr:", data.bucketAttr);
console.log("blocking calls >0.5ms:", data.events.length);
console.log("total blocked ms:", Math.round(data.events.reduce((sum, e) => sum + e.ms, 0)));
console.log("heaviest 250ms bins [startMs, blockedMs]:", JSON.stringify(top));
console.log(
  "worst single calls:",
  JSON.stringify(
    [...data.events].sort((a, b) => b.ms - a.ms).slice(0, 8),
  ),
);

await writeFile(path.join(OUT, "links.json"), JSON.stringify(data, null, 2));
await browser.close();
