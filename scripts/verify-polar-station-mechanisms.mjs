/* global document */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";

const baseUrl = process.env.VERIFY_RENDER_URL || "http://127.0.0.1:3000";
const viewport = {
  height: Number(process.env.VERIFY_VIEWPORT_HEIGHT) || 900,
  width: Number(process.env.VERIFY_VIEWPORT_WIDTH) || 1440,
};
const quality = ["low", "medium", "high"].includes(process.env.VERIFY_QUALITY)
  ? process.env.VERIFY_QUALITY
  : "medium";
const FAMILY_BUDGETS = Object.freeze({
  northeast: Object.freeze({
    high: Object.freeze({ drawCalls: 12, programs: 3, textures: 0 }),
    low: Object.freeze({ drawCalls: 4, programs: 2, textures: 0 }),
    medium: Object.freeze({ drawCalls: 12, programs: 3, textures: 0 }),
  }),
  southwest: Object.freeze({
    high: Object.freeze({ drawCalls: 9, programs: 3, textures: 0 }),
    low: Object.freeze({ drawCalls: 4, programs: 1, textures: 0 }),
    medium: Object.freeze({ drawCalls: 9, programs: 3, textures: 0 }),
  }),
});
const outDir = path.resolve(
  ".verification",
  process.env.VERIFY_OUTPUT_DIR || `station-mechanisms-live-${quality}`,
);
const allStations = [
  { family: "northeast", id: "s2-kernel-core", label: "S2 Kernel Core" },
  { family: "northeast", id: "manifold-reactor", label: "Manifold Reactor" },
  { family: "northeast", id: "field-chamber-coils", label: "Field Chamber Coils" },
  { family: "northeast", id: "qpu-ice-bridge", label: "QPU Ice Bridge" },
  { family: "southwest", id: "upstream-radio-mast", label: "Upstream Radio Mast" },
  { family: "southwest", id: "topology-archive-wall", label: "Topology Archive Wall" },
  { family: "southwest", id: "assembly-tool-locker", label: "Assembly Tool Locker" },
];
const requestedStationIds = new Set(
  (process.env.VERIFY_STATION_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);
const stations = requestedStationIds.size > 0
  ? allStations.filter((station) => requestedStationIds.has(station.id))
  : allStations;

assert.ok(stations.length > 0, "VERIFY_STATION_IDS must select at least one known station");

const artifactsSource = readFileSync(
  path.resolve("components", "IglooArtifacts.jsx"),
  "utf8",
);
const proxyMatch = artifactsSource.match(
  /if \(mechanismMotionOwned\) \{([\s\S]*?)\r?\n {2}\}\r?\n\r?\n {2}return \(/,
);
assert.ok(proxyMatch, "mechanism navigation proxy branch is missing");
const proxySource = proxyMatch[1];
const legacyOverlapContract = Object.freeze({
  colorWriteDisabled: proxySource.includes("colorWrite={false}"),
  depthTestDisabled: proxySource.includes("depthTest={false}"),
  depthWriteDisabled: proxySource.includes("depthWrite={false}"),
  noLegacyPhysicalSubject: !proxySource.includes("physical-station-subject"),
  noLegacyPointLight: !proxySource.includes("pointLight"),
  noLegacyStationPedestal: !proxySource.includes("StationGridPedestal"),
  noLegacySurfaceMaterial: !proxySource.includes("StationSurfaceMaterial"),
  opacityZero: proxySource.includes("opacity={0}"),
  visualOwner: proxySource.includes('visualOwner: "PolarStationMechanismLayer"'),
});
assert.ok(
  Object.values(legacyOverlapContract).every(Boolean),
  `mechanism navigation proxy retained visible legacy overlap: ${JSON.stringify(legacyOverlapContract)}`,
);

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--disable-dev-shm-usage", "--no-first-run", "--no-default-browser-check"],
});
const report = [];

function fatalLog(entry) {
  return (
    entry.type === "pageerror" ||
    /uncaught|referenceerror|typeerror|shader error|webglprogram|context lost|gl_invalid/i.test(
      entry.text,
    )
  );
}

async function createContactSheet(items, imageKey, outputName, { grayscale = false } = {}) {
  const margin = 18;
  const gap = 14;
  const columns = 3;
  const cellWidth = 436;
  const cellHeight = 300;
  const thumbnailWidth = 420;
  const thumbnailHeight = 263;
  const rows = Math.ceil(items.length / columns);
  const width = margin * 2 + columns * cellWidth + (columns - 1) * gap;
  const height = margin * 2 + rows * cellHeight + (rows - 1) * gap;
  const layers = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const left = margin + (index % columns) * (cellWidth + gap);
    const top = margin + Math.floor(index / columns) * (cellHeight + gap);
    layers.push({
      input: Buffer.from(
        `<svg width="${cellWidth}" height="${cellHeight}" xmlns="http://www.w3.org/2000/svg"><rect x="0.5" y="0.5" width="${cellWidth - 1}" height="${cellHeight - 1}" fill="#fffdf7" stroke="#9fcbd0"/><text x="10" y="290" fill="#28345e" font-family="monospace" font-size="15" font-weight="700">${item.label} / ${item.family}</text></svg>`,
      ),
      left,
      top,
    });
    const thumbnail = sharp(item[imageKey]).resize(thumbnailWidth, thumbnailHeight, {
      fit: "cover",
    });
    if (grayscale) thumbnail.grayscale();
    layers.push({
      input: await thumbnail.png().toBuffer(),
      left: left + 8,
      top: top + 8,
    });
  }

  const outputPath = path.join(outDir, outputName);
  await sharp({
    create: {
      background: "#eaf4ee",
      channels: 3,
      height,
      width,
    },
  })
    .composite(layers)
    .png()
    .toFile(outputPath);
  return outputPath;
}

try {
  for (const station of stations) {
    const context = await browser.newContext({
      deviceScaleFactor: 1,
      viewport,
    });
    const page = await context.newPage();
    const logs = [];
    const failedRequests = [];
    page.on("console", (message) => {
      if (["error", "warning"].includes(message.type())) {
        logs.push({ text: message.text(), type: message.type() });
      }
    });
    page.on("pageerror", (error) => {
      logs.push({ text: error.message, type: "pageerror" });
    });
    page.on("requestfailed", (request) => {
      failedRequests.push({
        error: request.failure()?.errorText || "unknown",
        url: request.url(),
      });
    });

    const query = new URLSearchParams({
      qa: `mechanism-live-${station.id}`,
      "qa-artifact": station.id,
      "qa-sdf": "1",
    });
    if (quality === "low") query.set("qa-low", "1");
    await page.goto(`${baseUrl}/?${query}`, {
      timeout: 25000,
      waitUntil: "domcontentloaded",
    });
    if (station.id === "topology-archive-wall") {
      const portalOffer = page.getByRole("dialog", {
        name: /topology archive/i,
      });
      await portalOffer.waitFor({ state: "attached", timeout: 25000 });
      await portalOffer
        .getByRole("button", { name: /Stay in (?:the polar )?world/i })
        .click();
      await portalOffer.waitFor({ state: "detached", timeout: 25000 });
    }
    await page.waitForSelector('#world[data-render-enabled="true"]', {
      timeout: 25000,
    });
    const renderedQuality = await page
      .locator("canvas.igloo-scene-canvas")
      .getAttribute("data-quality");
    if (renderedQuality !== quality) {
      await page
        .getByRole("button", { name: `Use ${quality} graphics quality` })
        .click();
    }
    await page.waitForFunction(
      ({ family, id, quality: expectedQuality }) => {
        const canvas = document.querySelector("canvas.igloo-scene-canvas");
        const world = document.querySelector("#world");
        const readout = document.querySelector(".igloo-artifact-readout");
        return (
          world?.dataset.dockedStation === id &&
          readout?.dataset.stationId === id &&
          canvas?.dataset.mechanismStation === id &&
          canvas?.dataset.mechanismFamily === family &&
          canvas?.dataset.quality === expectedQuality &&
          canvas?.dataset.mechanismActiveFamilies === "1" &&
          Number(canvas?.dataset.mechanismOpacity || 0) >= 0.94
        );
      },
      { ...station, quality },
      { timeout: 25000 },
    );
    await page.waitForTimeout(station.id === "assembly-tool-locker" ? 6200 : 2400);

    const familySamples = [];
    for (let sample = 0; sample < 8; sample += 1) {
      familySamples.push(
        await page.locator("canvas.igloo-scene-canvas").getAttribute(
          "data-mechanism-active-families",
        ),
      );
      await page.waitForTimeout(80);
    }

    const metrics = await page.evaluate(() => {
      const canvas = document.querySelector("canvas.igloo-scene-canvas");
      const world = document.querySelector("#world");
      const readout = document.querySelector(".igloo-artifact-readout");
      const diagnostics = document.querySelector(".igloo-diagnostics");
      if (!canvas) return { error: "missing WebGL canvas" };

      const sampler = document.createElement("canvas");
      sampler.width = 96;
      sampler.height = 60;
      const context = sampler.getContext("2d", { willReadFrequently: true });
      context.drawImage(canvas, 0, 0, sampler.width, sampler.height);
      const pixels = context.getImageData(0, 0, sampler.width, sampler.height).data;
      let blackPixels = 0;
      let edgeEnergy = 0;
      let edgeSamples = 0;
      let heroBlackPixels = 0;
      let heroSamples = 0;
      let maximum = 0;
      let minimum = 255;
      let total = 0;
      const lumaAt = (index) =>
        pixels[index] * 0.2126 +
        pixels[index + 1] * 0.7152 +
        pixels[index + 2] * 0.0722;
      for (let index = 0; index < pixels.length; index += 4) {
        const luminance = lumaAt(index);
        total += luminance;
        maximum = Math.max(maximum, luminance);
        minimum = Math.min(minimum, luminance);
        if (luminance < 8) blackPixels += 1;
        const pixelIndex = index / 4;
        const x = pixelIndex % sampler.width;
        const y = Math.floor(pixelIndex / sampler.width);
        if (
          x >= sampler.width * 0.3 &&
          x < sampler.width * 0.7 &&
          y >= sampler.height * 0.08 &&
          y < sampler.height * 0.55
        ) {
          heroSamples += 1;
          if (luminance < 18) heroBlackPixels += 1;
        }
        if (x > 0) {
          edgeEnergy += Math.abs(luminance - lumaAt(index - 4));
          edgeSamples += 1;
        }
        if (y > 0) {
          edgeEnergy += Math.abs(luminance - lumaAt(index - sampler.width * 4));
          edgeSamples += 1;
        }
      }
      const count = pixels.length / 4;
      return {
        averageLuminance: total / count,
        blackPixelRatio: blackPixels / count,
        diagnostics: diagnostics?.textContent?.trim() || "",
        dockedStation: world?.dataset.dockedStation || "",
        edgeEnergy: edgeEnergy / Math.max(1, edgeSamples),
        heroBlackPixelRatio: heroBlackPixels / Math.max(1, heroSamples),
        luminanceRange: maximum - minimum,
        mechanism: {
          activeFamilies: canvas.dataset.mechanismActiveFamilies,
          drawBudget: canvas.dataset.mechanismDrawBudget,
          family: canvas.dataset.mechanismFamily,
          opacity: canvas.dataset.mechanismOpacity,
          programBudget: canvas.dataset.mechanismProgramBudget,
          station: canvas.dataset.mechanismStation,
          textureBudget: canvas.dataset.mechanismTextureBudget,
        },
        readoutStation: readout?.dataset.stationId || "",
        renderer: canvas.dataset.renderer || "",
      };
    });

    const hudPath = path.join(outDir, `${station.id}-hud.png`);
    const worldPath = path.join(outDir, `${station.id}-world.png`);
    await page.screenshot({ fullPage: false, path: hudPath });
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
    await page.screenshot({ fullPage: false, path: worldPath });

    assert.equal(metrics.error, undefined, `${station.id}: ${metrics.error}`);
    assert.equal(metrics.dockedStation, station.id);
    assert.equal(metrics.readoutStation, station.id);
    assert.equal(metrics.mechanism.family, station.family);
    assert.equal(metrics.mechanism.station, station.id);
    assert.equal(metrics.mechanism.activeFamilies, "1");
    const expectedBudget = FAMILY_BUDGETS[station.family][quality];
    assert.equal(metrics.mechanism.drawBudget, String(expectedBudget.drawCalls));
    assert.equal(metrics.mechanism.programBudget, String(expectedBudget.programs));
    assert.equal(metrics.mechanism.textureBudget, String(expectedBudget.textures));
    assert.ok(Number(metrics.mechanism.opacity) >= 0.94);
    assert.ok(familySamples.every((count) => count === "1"));
    assert.equal(metrics.renderer, "webgl");
    assert.ok(metrics.averageLuminance > 70, `${station.id}: scene too dark`);
    assert.ok(
      metrics.blackPixelRatio < 0.14,
      `${station.id}: black monolith/void ratio too high (${metrics.blackPixelRatio})`,
    );
    assert.ok(
      metrics.heroBlackPixelRatio < 0.05,
      `${station.id}: near-black hero pixels exceed 5% (${metrics.heroBlackPixelRatio})`,
    );
    assert.ok(metrics.luminanceRange > 48, `${station.id}: scene lacks tonal structure`);
    assert.ok(metrics.edgeEnergy > 2, `${station.id}: mechanisms/geography lack visible edges`);
    assert.deepEqual(logs.filter(fatalLog), [], `${station.id}: fatal browser logs`);
    assert.deepEqual(failedRequests, [], `${station.id}: failed requests`);

    report.push({
      ...station,
      failedRequests,
      familySamples,
      hudPath,
      legacyOverlapContract,
      logs,
      metrics,
      quality,
      worldPath,
    });
    await context.close();
  }

  const contactSheetPath = await createContactSheet(
    report,
    "worldPath",
    "mechanism-world-contact-sheet.png",
  );
  const hudContactSheetPath = await createContactSheet(
    report,
    "hudPath",
    "mechanism-hud-contact-sheet.png",
  );
  const grayscaleContactSheetPath = await createContactSheet(
    report,
    "worldPath",
    "mechanism-world-grayscale-contact-sheet.png",
    { grayscale: true },
  );

  await writeFile(
    path.join(outDir, "report.json"),
    `${JSON.stringify({
      contactSheetPath,
      grayscaleContactSheetPath,
      hudContactSheetPath,
      legacyOverlapContract,
      quality,
      report,
    }, null, 2)}\n`,
  );
  console.log(
    `Polar station mechanism runtime proof captured: ${report.length} stations at ${quality}, one family each, family-aware budgets, zero legacy visual overlap.`,
  );
} finally {
  await browser.close();
}
