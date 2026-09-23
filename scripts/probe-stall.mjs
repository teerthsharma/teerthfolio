/* global document, window, WebGL2RenderingContext, requestAnimationFrame */
// Where the gap goes. GPU timer queries say ~21ms, the render callback's JS says
// ~4ms, an empty page in the same browser runs at 6ms — and the presented frame
// is 30ms. This counts the GL calls that force a pipeline sync (any call that
// must wait for the GPU to catch up) and times the most expensive ones, so a
// stall shows up by name instead of by subtraction.
import { chromium } from "playwright";

const BASE = process.env.PROBE_BASE || "http://localhost:3100";
const browser = await chromium.launch({
  channel: "chrome",
  headless: false,
  args: ["--enable-gpu", "--window-position=0,0"],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

await page.addInitScript(() => {
  const totals = {};
  window.__stall = totals;
  const proto = WebGL2RenderingContext.prototype;
  // Everything here either flushes, syncs, or can force a driver round trip.
  const watched = [
    "readPixels",
    "finish",
    "flush",
    "getError",
    "clientWaitSync",
    "getBufferSubData",
    "texImage2D",
    "texSubImage2D",
    "bufferData",
    "bufferSubData",
    "getParameter",
    "getShaderParameter",
    "getProgramParameter",
    "copyTexImage2D",
    "framebufferTexture2D",
    "bindFramebuffer",
    "drawElements",
    "drawArrays",
    "drawElementsInstanced",
    "drawArraysInstanced",
    "uniformMatrix4fv",
    "useProgram",
  ];
  for (const name of watched) {
    const original = proto[name];
    if (typeof original !== "function") continue;
    totals[name] = { calls: 0, ms: 0 };
    proto[name] = function (...args) {
      const start = performance.now();
      const result = original.apply(this, args);
      const entry = totals[name];
      entry.calls += 1;
      entry.ms += performance.now() - start;
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
  .catch(() => {});
await page.waitForTimeout(9000);
await page.bringToFront();

const report = await page.evaluate(
  () =>
    new Promise((resolve) => {
      for (const entry of Object.values(window.__stall)) {
        entry.calls = 0;
        entry.ms = 0;
      }
      let frames = 0;
      const start = performance.now();
      const tick = () => {
        frames += 1;
        if (performance.now() - start < 5000) requestAnimationFrame(tick);
        else {
          const elapsed = performance.now() - start;
          resolve({
            frames,
            frameMs: Math.round((elapsed / frames) * 100) / 100,
            perFrame: Object.fromEntries(
              Object.entries(window.__stall)
                .filter(([, entry]) => entry.calls > 0)
                .map(([name, entry]) => [
                  name,
                  {
                    calls: Math.round((entry.calls / frames) * 10) / 10,
                    ms: Math.round((entry.ms / frames) * 100) / 100,
                  },
                ])
                .sort((a, b) => b[1].ms - a[1].ms),
            ),
          });
        }
      };
      requestAnimationFrame(tick);
    }),
);
console.log(`frames=${report.frames} frameMs=${report.frameMs}`);
for (const [name, entry] of Object.entries(report.perFrame)) {
  if (entry.ms < 0.05 && entry.calls < 5) continue;
  console.log(`${name.padEnd(24)} ${String(entry.calls).padStart(7)} calls/frame  ${String(entry.ms).padStart(7)} ms/frame`);
}
await browser.close();
