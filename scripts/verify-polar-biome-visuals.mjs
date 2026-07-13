/* global document */

import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.VERIFY_RENDER_URL || "http://127.0.0.1:5273";
const outDir = path.resolve(".verification", "biome-live");
const stations = [
  { id: "observatory-plaque", quality: "high" },
  { id: "s2-kernel-core", quality: "medium" },
  { id: "manifold-reactor", quality: "high" },
  { id: "field-chamber-coils", quality: "medium" },
  { id: "qpu-ice-bridge", quality: "high" },
  { id: "upstream-radio-mast", quality: "medium" },
];

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--disable-dev-shm-usage", "--no-first-run", "--no-default-browser-check"],
});
const report = [];

function rootMeanSquareDifference(left, right) {
  const count = Math.min(left.length, right.length);
  let sum = 0;
  for (let index = 0; index < count; index += 1) {
    const delta = left[index] - right[index];
    sum += delta * delta;
  }
  return Math.sqrt(sum / Math.max(1, count));
}

try {
  for (const station of stations) {
    const context = await browser.newContext({
      deviceScaleFactor: 1,
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    const logs = [];
    const failedRequests = [];
    page.on("console", (message) => {
      if (["error", "warning"].includes(message.type())) {
        logs.push({ type: message.type(), text: message.text() });
      }
    });
    page.on("pageerror", (error) => logs.push({ type: "pageerror", text: error.message }));
    page.on("requestfailed", (request) =>
      failedRequests.push({ error: request.failure()?.errorText || "unknown", url: request.url() }),
    );

    const query = new URLSearchParams({
      "qa-artifact": station.id,
      "qa-sdf": "1",
      qa: `biome-live-${station.id}`,
    });
    await page.goto(`${baseUrl}/?${query}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('#world[data-render-enabled="true"]', { timeout: 25000 });
    const qualityButton = page.getByRole("button", { name: station.quality, exact: true });
    await qualityButton.click();
    await page.waitForFunction(
      ({ id, quality }) => {
        const canvas = document.querySelector("canvas.igloo-scene-canvas");
        const activeQuality = Array.from(document.querySelectorAll(".igloo-controls button")).find(
          (button) => button.getAttribute("aria-pressed") === "true" && button.textContent?.trim() === quality,
        );
        return canvas?.dataset.biomePrimary === id && Boolean(activeQuality);
      },
      station,
      { timeout: 15000 },
    );
    await page.waitForTimeout(1900);

    const metrics = await page.evaluate(() => {
      const canvas = document.querySelector("canvas.igloo-scene-canvas");
      const world = document.querySelector("#world");
      if (!canvas) return { error: "missing WebGL canvas" };
      const sampler = document.createElement("canvas");
      sampler.width = 80;
      sampler.height = 50;
      const context = sampler.getContext("2d", { willReadFrequently: true });
      context.drawImage(canvas, 0, 0, sampler.width, sampler.height);
      const pixels = context.getImageData(0, 0, sampler.width, sampler.height).data;
      let red = 0;
      let green = 0;
      let blue = 0;
      let saturation = 0;
      let luminance = 0;
      let luminanceSquared = 0;
      let minLuminance = 255;
      let maxLuminance = 0;
      let blackPixels = 0;
      let edgeEnergy = 0;
      let edgeSamples = 0;
      const luminanceGrid = [];
      const lumaAt = (index) =>
        pixels[index] * 0.2126 + pixels[index + 1] * 0.7152 + pixels[index + 2] * 0.0722;

      for (let index = 0; index < pixels.length; index += 4) {
        const r = pixels[index];
        const g = pixels[index + 1];
        const b = pixels[index + 2];
        const luma = lumaAt(index);
        const maximum = Math.max(r, g, b);
        const minimum = Math.min(r, g, b);
        red += r;
        green += g;
        blue += b;
        saturation += maximum > 0 ? (maximum - minimum) / maximum : 0;
        luminance += luma;
        luminanceSquared += luma * luma;
        minLuminance = Math.min(minLuminance, luma);
        maxLuminance = Math.max(maxLuminance, luma);
        if (luma < 8) blackPixels += 1;
        const pixelIndex = index / 4;
        const x = pixelIndex % sampler.width;
        const y = Math.floor(pixelIndex / sampler.width);
        if (x > 0) {
          edgeEnergy += Math.abs(luma - lumaAt(index - 4));
          edgeSamples += 1;
        }
        if (y > 0) {
          edgeEnergy += Math.abs(luma - lumaAt(index - sampler.width * 4));
          edgeSamples += 1;
        }
      }

      const blockWidth = sampler.width / 10;
      const blockHeight = sampler.height / 5;
      for (let blockY = 0; blockY < 5; blockY += 1) {
        for (let blockX = 0; blockX < 10; blockX += 1) {
          let blockLuma = 0;
          let blockSamples = 0;
          for (let y = blockY * blockHeight; y < (blockY + 1) * blockHeight; y += 1) {
            for (let x = blockX * blockWidth; x < (blockX + 1) * blockWidth; x += 1) {
              blockLuma += lumaAt((y * sampler.width + x) * 4);
              blockSamples += 1;
            }
          }
          luminanceGrid.push(blockLuma / blockSamples);
        }
      }

      const count = pixels.length / 4;
      const averageLuminance = luminance / count;
      return {
        averageColor: [red / count, green / count, blue / count],
        averageLuminance,
        averageSaturation: saturation / count,
        blackPixelRatio: blackPixels / count,
        biome: {
          drawBudget: canvas.dataset.biomeDrawBudget,
          primary: canvas.dataset.biomePrimary,
          primaryWeight: canvas.dataset.biomePrimaryWeight,
          programBudget: canvas.dataset.biomeProgramBudget,
          secondary: canvas.dataset.biomeSecondary,
          secondaryWeight: canvas.dataset.biomeSecondaryWeight,
          textureBudget: canvas.dataset.biomeTextureBudget,
        },
        dockedStation: world?.dataset.dockedStation || "",
        edgeEnergy: edgeEnergy / Math.max(1, edgeSamples),
        luminanceGrid,
        luminanceRange: maxLuminance - minLuminance,
        luminanceStdDev: Math.sqrt(Math.max(0, luminanceSquared / count - averageLuminance ** 2)),
        rendererMode: world?.dataset.rendererMode || "",
      };
    });

    const hudPath = path.join(outDir, `${station.id}-hud.png`);
    const worldPath = path.join(outDir, `${station.id}-world.png`);
    await page.screenshot({ path: hudPath, fullPage: false });
    await page.evaluate(() => {
      for (const selector of [
        ".igloo-hud",
        ".igloo-input-hint",
        ".igloo-diagnostics",
        ".open-world-loading-bridge",
        ".black-hole-transition",
      ]) {
        const element = document.querySelector(selector);
        if (element) element.style.display = "none";
      }
    });
    await page.waitForTimeout(120);
    await page.screenshot({ path: worldPath, fullPage: false });

    const fatalLogs = logs.filter(
      (entry) =>
        entry.type === "pageerror" ||
        /shader error|webglprogram|context lost|gl_invalid|uncaught|referenceerror/i.test(entry.text),
    );
    assert.equal(metrics.error, undefined, `${station.id}: ${metrics.error}`);
    assert.equal(metrics.biome.primary, station.id, `${station.id}: wrong primary biome`);
    assert.equal(metrics.biome.drawBudget, "3", `${station.id}: runtime draw budget drifted`);
    assert.equal(metrics.biome.programBudget, "2", `${station.id}: runtime program budget drifted`);
    assert.equal(metrics.biome.textureBudget, "0", `${station.id}: runtime texture budget drifted`);
    assert.ok(Number(metrics.biome.primaryWeight) > 0.98, `${station.id}: dock weight is not dominant`);
    assert.equal(metrics.rendererMode, "webgl", `${station.id}: renderer did not settle to WebGL`);
    assert.ok(metrics.averageLuminance >= 108, `${station.id}: scene is too dark (${metrics.averageLuminance})`);
    assert.ok(metrics.averageLuminance <= 225, `${station.id}: scene is washed out (${metrics.averageLuminance})`);
    assert.ok(metrics.blackPixelRatio < 0.06, `${station.id}: black void ratio ${metrics.blackPixelRatio}`);
    assert.ok(metrics.luminanceRange > 52, `${station.id}: scene lacks tonal structure`);
    assert.ok(metrics.luminanceStdDev > 12, `${station.id}: scene is flat`);
    assert.ok(metrics.edgeEnergy > 2.2, `${station.id}: geography/object edges are too weak`);
    assert.deepEqual(fatalLogs, [], `${station.id}: fatal browser logs ${JSON.stringify(fatalLogs)}`);
    assert.deepEqual(failedRequests, [], `${station.id}: failed requests ${JSON.stringify(failedRequests)}`);

    report.push({
      ...station,
      failedRequests,
      hudPath,
      logs,
      metrics,
      worldPath,
    });
    await context.close();
  }

  for (let left = 0; left < report.length; left += 1) {
    for (let right = left + 1; right < report.length; right += 1) {
      const structuralDifference = rootMeanSquareDifference(
        report[left].metrics.luminanceGrid,
        report[right].metrics.luminanceGrid,
      );
      report[left].metrics[`structureVs:${report[right].id}`] = structuralDifference;
      assert.ok(
        structuralDifference > 3.2,
        `${report[left].id} and ${report[right].id} differ mostly by hue (${structuralDifference})`,
      );
    }
  }
} finally {
  await browser.close();
}

await writeFile(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
console.log(`Polar biome visual proof captured: ${report.length} stations × HUD/world, no shader/runtime failures.`);
