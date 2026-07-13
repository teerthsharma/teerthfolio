/* global document, HTMLCanvasElement, requestAnimationFrame */

import assert from "node:assert/strict";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";

const baseUrl = process.env.VERIFY_RENDER_URL || "http://127.0.0.1:3000";
const outputDir = path.join(process.cwd(), ".verification", "dome-crystal");
mkdirSync(outputDir, { recursive: true });

function chromeExecutable() {
  const localAppData = process.env.LOCALAPPDATA;
  return [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    localAppData && path.join(localAppData, "Google/Chrome/Application/chrome.exe"),
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  ]
    .filter(Boolean)
    .find((candidate) => existsSync(candidate));
}

const browser = await chromium.launch({
  args: ["--disable-dev-shm-usage", "--no-first-run", "--no-default-browser-check"],
  executablePath: chromeExecutable(),
  headless: true,
});

async function domeRegionMetrics(imagePath) {
  const image = sharp(imagePath);
  const metadata = await image.metadata();
  const region = {
    height: Math.round(metadata.height * 0.42),
    left: Math.round(metadata.width * 0.32),
    top: Math.round(metadata.height * 0.28),
    width: Math.round(metadata.width * 0.38),
  };
  const { data, info } = await image.extract(region).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let blackPixels = 0;
  let lumaSum = 0;
  let coolPixels = 0;
  for (let index = 0; index < data.length; index += info.channels) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const luma = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    lumaSum += luma;
    if (luma < 42) blackPixels += 1;
    if (blue > red + 5 && green > red + 3) coolPixels += 1;
  }
  const pixels = data.length / info.channels;
  return {
    averageLuma: Number((lumaSum / pixels).toFixed(2)),
    blackRatio: Number((blackPixels / pixels).toFixed(5)),
    coolRatio: Number((coolPixels / pixels).toFixed(5)),
    region,
  };
}

async function inspectPage({ noDome, quality, touched }) {
  const context = await browser.newContext({ deviceScaleFactor: 1, viewport: { width: 1600, height: 1000 } });
  await context.addInitScript(() => {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    globalThis.__domeGlStats = {
      createdPrograms: 0,
      createdTextures: 0,
      shaderDiagnostics: [],
      wrappedContexts: 0,
    };
    HTMLCanvasElement.prototype.getContext = function patchedGetContext(type, ...args) {
      const gl = originalGetContext.call(this, type, ...args);
      if (!gl || !/webgl/i.test(type) || gl.__domeCrystalWrapped) return gl;
      gl.__domeCrystalWrapped = true;
      globalThis.__domeGlStats.wrappedContexts += 1;

      const originalCreateProgram = gl.createProgram.bind(gl);
      gl.createProgram = (...programArgs) => {
        globalThis.__domeGlStats.createdPrograms += 1;
        return originalCreateProgram(...programArgs);
      };
      const originalCreateTexture = gl.createTexture.bind(gl);
      gl.createTexture = (...textureArgs) => {
        globalThis.__domeGlStats.createdTextures += 1;
        return originalCreateTexture(...textureArgs);
      };
      const originalCompileShader = gl.compileShader.bind(gl);
      gl.compileShader = (shader) => {
        originalCompileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          globalThis.__domeGlStats.shaderDiagnostics.push(gl.getShaderInfoLog(shader) || "shader compile failed");
        }
      };
      const originalLinkProgram = gl.linkProgram.bind(gl);
      gl.linkProgram = (program) => {
        originalLinkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
          globalThis.__domeGlStats.shaderDiagnostics.push(gl.getProgramInfoLog(program) || "program link failed");
        }
      };
      return gl;
    };
  });

  const page = await context.newPage();
  const diagnostics = [];
  page.on("pageerror", (error) => diagnostics.push({ kind: "pageerror", text: error.message }));
  page.on("console", (message) => {
    const text = message.text();
    if (message.type() === "error" || message.type() === "warning" || /THREE\.WebGLProgram|shader error/i.test(text)) {
      diagnostics.push({ kind: message.type(), text });
    }
  });

  const params = new URLSearchParams({ "qa-sdf": "1", qa: `dome-crystal-${quality}` });
  if (noDome) params.set("qa-no-dome", "1");
  await page.goto(`${baseUrl}/?${params}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('#world[data-render-enabled="true"]', { timeout: 25000 });
  await page.waitForTimeout(2600);
  if (quality === "high") {
    await page.getByRole("button", { name: "Use high graphics quality" }).click();
    await page.waitForTimeout(1900);
  }

  const frameStats = await page.evaluate(async () => {
    const canvas = document.querySelector("canvas");
    const gl = canvas?.getContext("webgl2") || canvas?.getContext("webgl");
    if (!canvas || !gl) throw new Error("live WebGL canvas/context unavailable");
    const methods = ["drawArrays", "drawElements", "drawArraysInstanced", "drawElementsInstanced"];
    const originals = new Map();
    let calls = 0;
    for (const method of methods) {
      if (typeof gl[method] !== "function") continue;
      const original = gl[method].bind(gl);
      originals.set(method, original);
      gl[method] = (...args) => {
        calls += 1;
        return original(...args);
      };
    }
    const samples = [];
    await new Promise((resolve) => {
      const capture = () => requestAnimationFrame(() => {
        samples.push(calls);
        calls = 0;
        if (samples.length === 28) resolve();
        else capture();
      });
      capture();
    });
    for (const [method, original] of originals) gl[method] = original;
    const active = samples.filter((value) => value > 0).sort((a, b) => a - b);
    return {
      canvasCreationQuality: canvas.dataset.quality || "unknown",
      max: active.at(-1),
      median: active[Math.floor(active.length / 2)],
      min: active[0],
      selectedQuality: document.querySelector("#world")?.className.match(/quality-(low|medium|high)/)?.[1] || "unknown",
      samples: active.length,
    };
  });

  let screenshotPath;
  let touchedPath;
  if (!noDome) {
    screenshotPath = path.join(outputDir, `${quality}-settled.png`);
    await page.screenshot({ path: screenshotPath });
    if (touched) {
      await page.mouse.click(800, 500);
      await page.waitForTimeout(86);
      touchedPath = path.join(outputDir, `${quality}-touched.png`);
      await page.screenshot({ path: touchedPath });
    }
  }

  const glStats = await page.evaluate(() => globalThis.__domeGlStats);
  await context.close();
  return { diagnostics, frameStats, glStats, screenshotPath, touchedPath };
}

try {
  const report = { generatedAt: new Date().toISOString(), tiers: {} };
  for (const quality of ["medium", "high"]) {
    const full = await inspectPage({ noDome: false, quality, touched: quality === "high" });
    const withoutDome = await inspectPage({ noDome: true, quality, touched: false });
    const metrics = await domeRegionMetrics(full.screenshotPath);
    const touchedMetrics = full.touchedPath ? await domeRegionMetrics(full.touchedPath) : null;
    const shaderDiagnostics = [
      ...full.diagnostics,
      ...withoutDome.diagnostics,
      ...full.glStats.shaderDiagnostics.map((text) => ({ kind: "shader", text })),
      ...withoutDome.glStats.shaderDiagnostics.map((text) => ({ kind: "shader-no-dome", text })),
    ];
    const tier = {
      authoredDome: { imageTextures: 0, materialPrograms: 7, visibleDraws: 8 },
      domeRegion: metrics,
      liveDelta: {
        createdPrograms: full.glStats.createdPrograms - withoutDome.glStats.createdPrograms,
        createdTextures: full.glStats.createdTextures - withoutDome.glStats.createdTextures,
        medianDraws: full.frameStats.median - withoutDome.frameStats.median,
      },
      full: { frameStats: full.frameStats, glStats: full.glStats },
      shaderDiagnostics,
      touchedRegion: touchedMetrics,
      withoutDome: { frameStats: withoutDome.frameStats, glStats: withoutDome.glStats },
    };
    assert.equal(shaderDiagnostics.length, 0, `${quality} emitted shader/page diagnostics`);
    assert.equal(tier.liveDelta.createdTextures, 0, `${quality} dome introduced texture allocations`);
    assert.equal(full.frameStats.selectedQuality, quality, `${quality} quality control did not settle`);
    assert.ok(metrics.blackRatio < 0.08, `${quality} dome regressed to a near-black material`);
    assert.ok(metrics.averageLuma > 118, `${quality} dome is not bright enough for the anime-soft field`);
    report.tiers[quality] = tier;
  }
  writeFileSync(path.join(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
