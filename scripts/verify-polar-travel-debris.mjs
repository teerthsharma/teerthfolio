/* global document */

import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.VERIFY_RENDER_URL || "http://127.0.0.1:3000";
const outputDir = path.resolve(".verification", "travel-debris");
const screenshotPath = path.join(outputDir, "plaque-to-s2-moving-1600x1000.png");
const reportPath = path.join(outputDir, "report.json");
await mkdir(outputDir, { recursive: true });

function isFatal(message) {
  return /(?:shader error|webgl.*(?:error|lost)|referenceerror|typeerror|uncaught|failed to compile)/i.test(
    message,
  );
}

function isDriverReadbackNote(message) {
  return /GL Driver Message.*(?:ReadPixels|GPU stall)/i.test(message);
}

async function sampleCanvas(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector("canvas.igloo-scene-canvas");
    if (!canvas) return { error: "missing WebGL canvas" };
    const sampler = document.createElement("canvas");
    sampler.width = 160;
    sampler.height = 100;
    const context = sampler.getContext("2d", { willReadFrequently: true });
    context.drawImage(canvas, 0, 0, sampler.width, sampler.height);
    const pixels = context.getImageData(0, 0, sampler.width, sampler.height).data;
    let blackPixels = 0;
    let luminance = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      const luma =
        pixels[index] * 0.2126 +
        pixels[index + 1] * 0.7152 +
        pixels[index + 2] * 0.0722;
      luminance += luma;
      if (luma < 18) blackPixels += 1;
    }
    const sampleCount = pixels.length / 4;
    return {
      averageLuminance: luminance / sampleCount,
      blackPixelRatio: blackPixels / sampleCount,
      debris: {
        instances: Number(canvas.dataset.travelDebrisInstances || 0),
        ownedDelta: {
          drawCalls: Number(canvas.dataset.travelDebrisDrawCalls || 0),
          programs: Number(canvas.dataset.travelDebrisPrograms || 0),
          textures: Number(canvas.dataset.travelDebrisTextures || 0),
        },
        profile: canvas.dataset.travelDebrisProfile || "",
      },
      quality:
        Array.from(document.querySelectorAll(".igloo-controls button")).find(
          (button) => button.getAttribute("aria-pressed") === "true" &&
            /^(?:low|medium|high)$/i.test(button.textContent?.trim() || ""),
        )?.textContent?.trim().toLowerCase() || canvas.dataset.quality || "",
    };
  });
}

const browser = await chromium.launch({
  headless: true,
  args: ["--disable-dev-shm-usage", "--no-first-run", "--no-default-browser-check"],
});
const report = { baseUrl, moving: null, reducedMotion: null };

try {
  const context = await browser.newContext({
    deviceScaleFactor: 1,
    viewport: { height: 1000, width: 1600 },
  });
  const page = await context.newPage();
  const diagnostics = [];
  const driverReadbackNotes = [];
  const failedRequests = [];
  page.on("console", (message) => {
    if (!["error", "warning"].includes(message.type())) return;
    if (isDriverReadbackNote(message.text())) driverReadbackNotes.push(message.text());
    else diagnostics.push(message.text());
  });
  page.on("pageerror", (error) => diagnostics.push(error.message));
  page.on("requestfailed", (request) =>
    failedRequests.push({ error: request.failure()?.errorText || "unknown", url: request.url() }),
  );

  await page.goto(`${baseUrl}/?qa-sdf=1&qa=travel-debris-proof`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector('#world[data-render-enabled="true"]', { timeout: 30000 });
  await page.getByRole("button", { name: /high graphics quality/i }).click();
  await page.waitForTimeout(1100);
  await page.locator(".station-profile-chip").nth(1).click();
  await page.waitForFunction(
    () =>
      document.querySelector("canvas.igloo-scene-canvas")?.dataset.travelDebrisDrawCalls === "1",
    null,
    { timeout: 10000 },
  );
  await page.waitForTimeout(260);
  const movingMetrics = await sampleCanvas(page);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  report.moving = {
    ...movingMetrics,
    diagnostics,
    driverReadbackNotes,
    failedRequests,
    screenshot: screenshotPath,
    viewport: { height: 1000, width: 1600 },
  };

  assert.equal(movingMetrics.error, undefined, movingMetrics.error);
  assert.deepEqual(movingMetrics.debris, {
    instances: 18,
    ownedDelta: { drawCalls: 1, programs: 1, textures: 0 },
    profile:
      "bright pooled frost wake / one instanced draw / deterministic mass-weighted arcs / zero reduced-motion shards",
  });
  assert.ok(
    movingMetrics.blackPixelRatio < 0.06,
    `moving frame regressed to near-black flying geometry (${movingMetrics.blackPixelRatio})`,
  );
  assert.deepEqual(diagnostics, [], "moving frame emitted application/browser diagnostics");
  assert.deepEqual(failedRequests, [], "moving frame emitted failed requests");
  await context.close();

  const reducedContext = await browser.newContext({
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
    viewport: { height: 900, width: 1440 },
  });
  const reducedPage = await reducedContext.newPage();
  const reducedDiagnostics = [];
  reducedPage.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) reducedDiagnostics.push(message.text());
  });
  reducedPage.on("pageerror", (error) => reducedDiagnostics.push(error.message));
  await reducedPage.goto(`${baseUrl}/?qa-sdf=1&qa=travel-debris-reduced`, {
    waitUntil: "domcontentloaded",
  });
  await reducedPage.waitForSelector('#world[data-render-enabled="true"]', { timeout: 30000 });
  await reducedPage.locator(".station-profile-chip").nth(1).click();
  await reducedPage.waitForTimeout(500);
  const reducedMotion = await reducedPage.evaluate(() => {
    const canvas = document.querySelector("canvas.igloo-scene-canvas");
    return {
      debrisDrawCalls: Number(canvas?.dataset.travelDebrisDrawCalls || 0),
      debrisInstances: Number(canvas?.dataset.travelDebrisInstances || 0),
      reducedMotion: canvas?.dataset.reducedMotion || "",
    };
  });
  report.reducedMotion = { ...reducedMotion, diagnostics: reducedDiagnostics };
  assert.equal(reducedMotion.reducedMotion, "true");
  assert.equal(reducedMotion.debrisDrawCalls, 0);
  assert.equal(reducedMotion.debrisInstances, 0);
  assert.deepEqual(
    reducedDiagnostics.filter(isFatal),
    [],
    "reduced-motion proof emitted fatal browser diagnostics",
  );
  await reducedContext.close();
} finally {
  await browser.close();
}

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(
  `travel debris runtime proof captured: black=${report.moving.blackPixelRatio.toFixed(4)} / delta ${report.moving.debris.ownedDelta.drawCalls} draw, ${report.moving.debris.ownedDelta.programs} program, ${report.moving.debris.ownedDelta.textures} textures`,
);
