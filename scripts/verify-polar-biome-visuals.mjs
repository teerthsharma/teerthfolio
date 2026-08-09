/* global document */

import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.VERIFY_RENDER_URL || "http://127.0.0.1:5273";
// Overridable so an ablated sweep writes somewhere else and the two sets can be
// compared. Defaults to what check-polar-color-continuity reads, so the normal
// `npm run verify:biome-visuals` path is unchanged.
const outDir = path.resolve(process.env.POLAR_COLOR_CAPTURE_DIR || path.join(".verification", "biome-live"));
// Must stay in step with CAPTURES in check-polar-color-continuity.mjs, which consumes
// what this writes. It did not: this list held six stations while that contract asserted
// over eight, so every run threw ENOENT on topology-archive-wall and assembly-tool-locker
// and `npm run verify:biome-visuals` could not complete. The gate has been unrunnable
// rather than failing, which is why nobody noticed the accent-hue drifts it reports.
//
// The two additions carry `low` deliberately. The tier here is per station rather than a
// full matrix, and before this the ladder only ever sampled high and medium — so the tier
// the quality ladder actually puts most machines on was the one tier never captured.
const stations = [
  { id: "observatory-plaque", quality: "high" },
  { id: "s2-kernel-core", quality: "medium" },
  { id: "manifold-reactor", quality: "high" },
  { id: "field-chamber-coils", quality: "medium" },
  { id: "qpu-ice-bridge", quality: "high" },
  { id: "upstream-radio-mast", quality: "medium" },
  { id: "topology-archive-wall", quality: "low" },
  { id: "assembly-tool-locker", quality: "low" },
];

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--disable-dev-shm-usage", "--no-first-run", "--no-default-browser-check"],
});
const report = [];
// Run-wide, so one bad station cannot hide the seven after it.
const failures = [];

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
    // Ablation, so the colour contract downstream can be run against a world with a
    // subsystem removed and the difference attributed. This exists because the aurora
    // veil now overlays every capture these gates read, and a site-wide emissive layer
    // can move an "accent hue" measurement without any station palette changing.
    //   POLAR_VISUALS_FLAGS=no-aurora POLAR_COLOR_CAPTURE_DIR=.verification/no-aurora ...
    for (const flag of (process.env.POLAR_VISUALS_FLAGS || "").split(/[,\s]+/).filter(Boolean)) {
      query.set(flag, "1");
    }
    await page.goto(`${baseUrl}/?${query}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('#world[data-render-enabled="true"]', { timeout: 25000 });
    // Matched on the aria-label, not the visible text. These buttons carry
    // aria-label="Use <tier> graphics quality", and an explicit aria-label REPLACES the
    // text content as the accessible name — so the previous
    // `getByRole("button", { name: station.quality, exact: true })` could never match,
    // and every run of this gate timed out on the first station before writing a single
    // capture. The label was almost certainly added as an accessibility improvement long
    // after this selector was written, which is exactly how a gate goes quietly dead.
    const qualityButton = page.getByRole("button", {
      name: `Use ${station.quality} graphics quality`,
    });
    await qualityButton.click();
    await page.waitForFunction(
      ({ id, quality }) => {
        const canvas = document.querySelector("canvas.igloo-scene-canvas");
        const activeQuality = Array.from(document.querySelectorAll(".igloo-controls button")).find(
          (button) =>
            button.getAttribute("aria-pressed") === "true" &&
            // textContent, unlike the accessible name, is not uppercased by the HUD's
            // text-transform — but compare case-insensitively so this cannot break the
            // way the click selector above did.
            button.textContent?.trim().toLowerCase() === quality.toLowerCase(),
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

    // Collected, not thrown. This used to assert inline, so the first station with a
    // problem aborted the sweep and every station after it went unmeasured — which is
    // how a single low-tier luminance miss could hide whatever the eighth station was
    // doing. The sibling contract, check-polar-color-continuity, already collects into
    // a failures array and reports the set; this now matches it.
    const stationFailures = [];
    const check = (condition, message) => {
      if (!condition) stationFailures.push(message);
    };

    const fatalLogs = logs.filter(
      (entry) =>
        entry.type === "pageerror" ||
        /shader error|webglprogram|context lost|gl_invalid|uncaught|referenceerror/i.test(entry.text),
    );
    check(metrics.error === undefined, `${station.id}: ${metrics.error}`);
    // A failed capture returns { error } with no biome/luma fields. Collect the
    // failure and skip the dependent checks rather than crashing the sweep on a
    // dereference — the crash hid every station after the bad one.
    if (metrics.error !== undefined) {
      report.push({ id: station.id, metrics });
      await context.close();
      continue;
    }
    check(metrics.biome.primary === station.id, `${station.id}: wrong primary biome`);
    // Per tier, not a single number. This asserted "3" for every station because the
    // harness only ever captured high and medium; the first low-tier capture reported 2
    // and read as a drift. It is not a drift — dropping a draw is what the low tier is
    // FOR. A budget assertion that cannot express the ladder it is guarding will either
    // fail honest work or, worse, be relaxed until it guards nothing.
    const expectedDrawBudget = station.quality === "low" ? "2" : "3";
    check(
      metrics.biome.drawBudget === expectedDrawBudget,
      `${station.id}: runtime draw budget drifted at ${station.quality} (${metrics.biome.drawBudget} vs ${expectedDrawBudget})`,
    );
    check(metrics.biome.programBudget === "2", `${station.id}: runtime program budget drifted`);
    check(metrics.biome.textureBudget === "0", `${station.id}: runtime texture budget drifted`);
    check(Number(metrics.biome.primaryWeight) > 0.98, `${station.id}: dock weight is not dominant`);
    check(metrics.rendererMode === "webgl", `${station.id}: renderer did not settle to WebGL`);
    check(metrics.averageLuminance >= 108, `${station.id}: scene is too dark at ${station.quality} (${metrics.averageLuminance.toFixed(1)} < 108)`);
    check(metrics.averageLuminance <= 225, `${station.id}: scene is washed out at ${station.quality} (${metrics.averageLuminance.toFixed(1)} > 225)`);
    check(metrics.blackPixelRatio < 0.06, `${station.id}: black void ratio ${metrics.blackPixelRatio.toFixed(3)} at ${station.quality}`);
    check(metrics.luminanceRange > 52, `${station.id}: scene lacks tonal structure at ${station.quality} (${metrics.luminanceRange.toFixed(1)})`);
    check(metrics.luminanceStdDev > 12, `${station.id}: scene is flat at ${station.quality} (${metrics.luminanceStdDev.toFixed(1)})`);
    check(metrics.edgeEnergy > 2.2, `${station.id}: geography/object edges are too weak at ${station.quality} (${metrics.edgeEnergy.toFixed(2)})`);
    assert.deepEqual(fatalLogs, [], `${station.id}: fatal browser logs ${JSON.stringify(fatalLogs)}`);
    assert.deepEqual(failedRequests, [], `${station.id}: failed requests ${JSON.stringify(failedRequests)}`);

    if (stationFailures.length) failures.push(...stationFailures);
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
      if (structuralDifference <= 3.2) {
        failures.push(
          `${report[left].id} and ${report[right].id} differ mostly by hue (${structuralDifference.toFixed(2)})`,
        );
      }
    }
  }
} finally {
  await browser.close();
}

await writeFile(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));

// Reported as a set, after every station has been captured. The captures on disk are
// the point of this script — check-polar-color-continuity consumes them — so they must
// exist even on a failing run, which is why nothing throws until here.
if (failures.length) {
  console.error(`Polar biome visual proof FAILED (${failures.length}):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error(`\n${report.length}/${stations.length} stations captured to ${outDir}.`);
  process.exit(1);
}

console.log(
  `Polar biome visual proof captured: ${report.length} stations × HUD/world across ${
    new Set(stations.map((station) => station.quality)).size
  } quality tiers, no shader/runtime failures.`,
);
