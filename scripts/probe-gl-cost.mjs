/* global document, window, WebGL2RenderingContext, requestAnimationFrame */
// Where the frame and the cold start actually go. Hooks the WebGL2 context
// before any app code runs, so program links, draw calls and per-frame draw
// counts are measured from the driver side rather than trusted from the app.
// Real Chrome, headed and focused: bundled chromium software-rasters and Chrome
// throttles rAF in unfocused windows, and either one invents numbers.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.PROBE_BASE || "http://localhost:3100";
const OUT = process.argv[2] || "verification/gl-cost";
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  channel: "chrome",
  headless: false,
  // Every run must be a first-time visit: Chrome's on-disk program cache
  // otherwise hides the exact stall being measured behind a warm second run.
  args: ["--enable-gpu", "--window-position=0,0", "--disable-gpu-shader-disk-cache"],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

await page.addInitScript(() => {
  const stats = {
    programs: [],
    linkTotalMs: 0,
    compileTotalMs: 0,
    shaders: 0,
    drawsThisFrame: 0,
    frames: [],
  };
  window.__gl = stats;
  const proto = WebGL2RenderingContext.prototype;
  const wrap = (name, before, after) => {
    const original = proto[name];
    proto[name] = function (...args) {
      const t = performance.now();
      const result = original.apply(this, args);
      const cost = performance.now() - t;
      if (after) after(cost, args, this, result);
      return result;
    };
  };
  wrap("linkProgram", null, (cost) => {
    stats.linkTotalMs += cost;
    stats.programs.push(Math.round(cost * 100) / 100);
  });
  wrap("compileShader", null, (cost) => {
    stats.compileTotalMs += cost;
    stats.shaders += 1;
  });
  // getProgramParameter(LINK_STATUS) is where a driver actually blocks on a
  // parallel-compiled program, so it is the honest place to bill link cost.
  wrap("getProgramParameter", null, (cost) => {
    stats.linkTotalMs += cost;
  });
  for (const name of ["drawElements", "drawArrays", "drawElementsInstanced", "drawArraysInstanced"]) {
    const original = proto[name];
    proto[name] = function (...args) {
      stats.drawsThisFrame += 1;
      return original.apply(this, args);
    };
  }
  let last = performance.now();
  const tick = () => {
    const now = performance.now();
    stats.frames.push({ dt: now - last, draws: stats.drawsThisFrame });
    stats.drawsThisFrame = 0;
    last = now;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 180000 });
await page.waitForTimeout(2000);
await page.locator("button", { hasText: /enter the world|start/i }).first().click().catch(() => {});
await page
  .waitForFunction(() => document.querySelector("#world")?.dataset.rendererMode === "webgl", {
    timeout: 120000,
  })
  .catch(() => console.log("never reached webgl"));

const report = {};
for (const tier of ["high", "medium", "low"]) {
  await page.bringToFront();
  const button = page.locator("button", { hasText: new RegExp(`^${tier}$`, "i") }).first();
  if (await button.count()) await button.click().catch(() => {});
  await page.waitForTimeout(3500);
  report[tier] = await page.evaluate(() => {
    const stats = window.__gl;
    stats.frames.length = 0;
    return new Promise((resolve) => {
      setTimeout(() => {
        const frames = stats.frames.filter((frame) => frame.dt > 0 && frame.dt < 2000);
        const sorted = frames.map((frame) => frame.dt).sort((a, b) => a - b);
        const canvas = document.querySelector("canvas.igloo-scene-canvas");
        resolve({
          frameMedianMs: sorted[Math.floor(sorted.length / 2)] ?? null,
          frameP95Ms: sorted[Math.floor(sorted.length * 0.95)] ?? null,
          fps: sorted.length ? Math.round(1000 / sorted[Math.floor(sorted.length / 2)]) : null,
          drawsMedian: frames.map((frame) => frame.draws).sort((a, b) => a - b)[
            Math.floor(frames.length / 2)
          ] ?? null,
          samples: frames.length,
          canvas: canvas ? { w: canvas.width, h: canvas.height, css: canvas.clientWidth } : null,
          focused: document.hasFocus(),
        });
      }, 4000);
    });
  });
  console.log(tier, JSON.stringify(report[tier]));
}

report.startup = await page.evaluate(() => ({
  programLinks: window.__gl.programs.length,
  shaderCompiles: window.__gl.shaders,
  linkTotalMs: Math.round(window.__gl.linkTotalMs),
  compileTotalMs: Math.round(window.__gl.compileTotalMs),
  slowestLinksMs: [...window.__gl.programs].sort((a, b) => b - a).slice(0, 10),
}));
console.log("startup", JSON.stringify(report.startup));

await writeFile(path.join(OUT, "gl-cost.json"), JSON.stringify(report, null, 2));
await browser.close();
console.log("wrote", path.join(OUT, "gl-cost.json"));
