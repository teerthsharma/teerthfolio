/* global document */

import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.VERIFY_RENDER_URL || "http://127.0.0.1:3000";
const outputDir = path.resolve(".verification", "wave-f-particles");
const reportPath = path.join(outputDir, "report.json");
const stationIds = [
  "observatory-plaque",
  "s2-kernel-core",
  "manifold-reactor",
  "field-chamber-coils",
  "qpu-ice-bridge",
  "upstream-radio-mast",
  "topology-archive-wall",
  "assembly-tool-locker",
];
await mkdir(outputDir, { recursive: true });

function isFatal(message) {
  return /(?:shader error|webgl.*(?:error|lost)|referenceerror|typeerror|uncaught|failed to compile)/i.test(
    message,
  );
}

async function readParticleState(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector("canvas.igloo-scene-canvas");
    if (!canvas) return { error: "missing WebGL canvas" };
    const sampler = document.createElement("canvas");
    sampler.width = 144;
    sampler.height = 90;
    const context = sampler.getContext("2d", { willReadFrequently: true });
    context.drawImage(canvas, 0, 0, sampler.width, sampler.height);
    const pixels = context.getImageData(0, 0, sampler.width, sampler.height).data;
    let luminanceSum = 0;
    let blackPixels = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      const luminance =
        pixels[index] * 0.2126 +
        pixels[index + 1] * 0.7152 +
        pixels[index + 2] * 0.0722;
      luminanceSum += luminance;
      if (luminance < 12) blackPixels += 1;
    }
    const samples = pixels.length / 4;
    return {
      averageLuminance: luminanceSum / samples,
      blackPixelRatio: blackPixels / samples,
      count: Number(canvas.dataset.semanticParticleCount || 0),
      draws: Number(canvas.dataset.semanticParticleDraws || 0),
      mode: canvas.dataset.semanticParticleMode || "",
      programs: Number(canvas.dataset.semanticParticlePrograms || 0),
      quality: canvas.dataset.quality || "",
      reducedMotion: canvas.dataset.reducedMotion || "",
      source: canvas.dataset.semanticParticleSource || "",
      station: canvas.dataset.semanticParticleStation || "",
    };
  });
}

async function selectQuality(page, quality) {
  await page.getByRole("button", { name: new RegExp(`${quality} graphics quality`, "i") }).click();
  await page.waitForFunction(
    (expected) => document.querySelector("canvas.igloo-scene-canvas")?.dataset.quality === expected,
    quality,
    { timeout: 10000 },
  );
}

const browser = await chromium.launch({
  headless: true,
  args: ["--disable-dev-shm-usage", "--no-first-run", "--no-default-browser-check"],
});
const report = {
  baseUrl,
  qualityTiers: {},
  reducedMotion: null,
  stations: [],
};

try {
  const context = await browser.newContext({
    deviceScaleFactor: 1,
    viewport: { height: 900, width: 1440 },
  });
  const page = await context.newPage();
  const diagnostics = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) diagnostics.push(message.text());
  });
  page.on("pageerror", (error) => diagnostics.push(error.message));
  await page.goto(`${baseUrl}/?qa-sdf=1&qa=wave-f-particles`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('#world[data-render-enabled="true"]', { timeout: 30000 });
  await page.waitForFunction(
    () => document.querySelector("canvas.igloo-scene-canvas")?.dataset.semanticParticleDraws === "1",
    null,
    { timeout: 15000 },
  );

  for (const [quality, expectedCount] of [["low", 512], ["medium", 1536], ["high", 4096]]) {
    await selectQuality(page, quality);
    await page.waitForTimeout(240);
    const state = await readParticleState(page);
    assert.equal(state.error, undefined, state.error);
    assert.equal(state.count, expectedCount, `${quality} particle count`);
    assert.equal(state.draws, 1, `${quality} particle draw delta`);
    assert.equal(state.programs, 1, `${quality} particle program delta`);
    assert.equal(state.mode, "active", `${quality} particle mode`);
    assert.equal(state.source, "cortiz-igloo-concepts-original-webgl-port");
    report.qualityTiers[quality] = state;
  }

  for (let index = 0; index < stationIds.length; index += 1) {
    const stationId = stationIds[index];
    await page.locator(".station-profile-chip").nth(index).click();
    await page.waitForFunction(
      (expected) =>
        document.querySelector("canvas.igloo-scene-canvas")?.dataset.semanticParticleStation === expected,
      stationId,
      { timeout: 10000 },
    );
    await page.waitForTimeout(260);
    const state = await readParticleState(page);
    const screenshot = path.join(outputDir, `${String(index + 1).padStart(2, "0")}-${stationId}.png`);
    await page.screenshot({ path: screenshot, fullPage: false });
    assert.equal(state.station, stationId);
    assert.equal(state.count, 4096);
    assert.ok(state.averageLuminance > 24, `${stationId} frame must not be blank`);
    assert.ok(state.blackPixelRatio < 0.08, `${stationId} must not regress to a black particle field`);
    report.stations.push({ ...state, screenshot, stationId });
  }
  report.diagnostics = diagnostics;
  assert.deepEqual(diagnostics.filter(isFatal), [], "particle tour emitted fatal diagnostics");
  await context.close();

  const reducedContext = await browser.newContext({
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
    viewport: { height: 844, width: 390 },
  });
  const reducedPage = await reducedContext.newPage();
  const reducedDiagnostics = [];
  reducedPage.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) reducedDiagnostics.push(message.text());
  });
  reducedPage.on("pageerror", (error) => reducedDiagnostics.push(error.message));
  await reducedPage.goto(`${baseUrl}/?qa-sdf=1&qa=wave-f-particles-reduced`, {
    waitUntil: "domcontentloaded",
  });
  await reducedPage.waitForSelector('#world[data-render-enabled="true"]', { timeout: 30000 });
  await reducedPage.waitForFunction(
    () => document.querySelector("canvas.igloo-scene-canvas")?.dataset.semanticParticleCount === "1536",
    null,
    { timeout: 15000 },
  );
  const reducedState = await readParticleState(reducedPage);
  assert.equal(reducedState.reducedMotion, "true");
  assert.equal(reducedState.count, 1536);
  assert.equal(reducedState.draws, 1);
  assert.equal(reducedState.programs, 1);
  assert.equal(reducedState.mode, "active");
  assert.equal(reducedState.source, "cortiz-igloo-concepts-original-webgl-port");
  assert.deepEqual(reducedDiagnostics.filter(isFatal), [], "reduced particle field emitted fatal diagnostics");
  report.reducedMotion = { ...reducedState, diagnostics: reducedDiagnostics };
  await reducedContext.close();
} finally {
  await browser.close();
}

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`Wave F semantic particle proof captured for ${report.stations.length} stations`);
