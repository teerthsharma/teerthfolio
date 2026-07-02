/* global document, window */

import { existsSync, createWriteStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { chromium } from "playwright";

const DEFAULT_BASE_URL = "http://127.0.0.1:5273";
const baseUrl = process.env.VERIFY_RENDER_URL || DEFAULT_BASE_URL;
const outDir = path.resolve("verification/screenshots-cinematic-render");
const isWindows = process.platform === "win32";
const devLog = path.join(outDir, "next-dev.log");
const devErrLog = path.join(outDir, "next-dev.err.log");

const viewports = [
  { name: "desktop", width: 1440, height: 900, query: "qa-sdf=1&qa=verify-desktop" },
  { name: "ipad", width: 768, height: 1024, query: "qa-sdf=1&qa-low=1&qa=verify-ipad" },
  { name: "mobile", width: 375, height: 667, query: "qa-sdf=1&qa-low=1&qa=verify-mobile" },
];
const safeGateViewport = { name: "safe-gate", width: 1440, height: 900, query: "safe=1&qa=verify-safe-gate" };

function chromeCandidates() {
  const localAppData = process.env.LOCALAPPDATA;
  const candidates = [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    localAppData && path.join(localAppData, "Google/Chrome/Application/chrome.exe"),
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

async function canReach(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1200) });
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

function devServerPort() {
  try {
    return new URL(baseUrl).port || "5273";
  } catch {
    return "5273";
  }
}

function startDevServer() {
  const nextBin = isWindows
    ? path.resolve("node_modules", "next", "dist", "bin", "next")
    : path.resolve("node_modules", ".bin", "next");
  if (!existsSync(nextBin)) {
    throw new Error(`Cannot find Next binary at ${nextBin}. Run npm install first.`);
  }

  const command = isWindows ? process.execPath : nextBin;
  const args = isWindows ? [nextBin, "dev", "-H", "127.0.0.1", "-p", devServerPort()] : ["dev", "-H", "127.0.0.1", "-p", devServerPort()];
  const child = spawn(command, args, {
    cwd: process.cwd(),
    detached: false,
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  child.stdout.pipe(createWriteStream(devLog, { flags: "a" }));
  child.stderr.pipe(createWriteStream(devErrLog, { flags: "a" }));
  return child;
}

async function waitForServer(url, timeoutMs = 45000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await canReach(url)) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function launchBrowser() {
  const executablePath = chromeCandidates();
  return chromium.launch({
    executablePath,
    headless: true,
    args: ["--disable-dev-shm-usage", "--no-first-run", "--no-default-browser-check"],
  });
}

async function collectMetrics(page) {
  return page.evaluate(() => {
    const world = document.querySelector("#world");
    const canvas = document.querySelector(".igloo-scene canvas, canvas");
    const rail = document.querySelector(".station-profile-rail");
    const readout = document.querySelector(".igloo-artifact-readout");
    const live = document.querySelector(".igloo-live-strip");
    const controls = document.querySelector(".igloo-controls");
    const diagnostics = document.querySelector(".igloo-diagnostics");

    const rectOf = (node) => {
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
    };
    const overlaps = (a, b) => Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);

    let canvasSample = {
      averageLuminance: 0,
      brightPixels: 0,
      brightObjectBounds: null,
      darkPixels: 0,
      nonBlankPixels: 0,
      tonalRange: 0,
      error: "",
    };
    if (canvas) {
      try {
        const sampler = document.createElement("canvas");
        sampler.width = 32;
        sampler.height = 32;
        const context = sampler.getContext("2d", { willReadFrequently: true });
        context.drawImage(canvas, 0, 0, sampler.width, sampler.height);
        const pixels = context.getImageData(0, 0, sampler.width, sampler.height).data;
        let brightPixels = 0;
        let darkPixels = 0;
        let luminanceTotal = 0;
        let maxLuminance = 0;
        let minLuminance = 255;
        let brightMinX = sampler.width;
        let brightMinY = sampler.height;
        let brightMaxX = -1;
        let brightMaxY = -1;
        let nonBlankPixels = 0;
        for (let index = 0; index < pixels.length; index += 4) {
          const pixelIndex = index / 4;
          const x = pixelIndex % sampler.width;
          const y = Math.floor(pixelIndex / sampler.width);
          const alpha = pixels[index + 3];
          const luminance = pixels[index] * 0.2126 + pixels[index + 1] * 0.7152 + pixels[index + 2] * 0.0722;
          if (pixels[index] + pixels[index + 1] + pixels[index + 2] + alpha > 18) nonBlankPixels += 1;
          if (luminance > 215) brightPixels += 1;
          if (luminance > 58) {
            brightMinX = Math.min(brightMinX, x);
            brightMinY = Math.min(brightMinY, y);
            brightMaxX = Math.max(brightMaxX, x);
            brightMaxY = Math.max(brightMaxY, y);
          }
          if (luminance < 42) darkPixels += 1;
          luminanceTotal += luminance;
          maxLuminance = Math.max(maxLuminance, luminance);
          minLuminance = Math.min(minLuminance, luminance);
        }
        canvasSample = {
          averageLuminance: Number((luminanceTotal / (pixels.length / 4)).toFixed(2)),
          brightPixels,
          brightObjectBounds:
            brightMaxX >= 0
              ? {
                  bottom: Number(((brightMaxY + 1) / sampler.height).toFixed(3)),
                  left: Number((brightMinX / sampler.width).toFixed(3)),
                  right: Number(((brightMaxX + 1) / sampler.width).toFixed(3)),
                  top: Number((brightMinY / sampler.height).toFixed(3)),
                }
              : null,
          darkPixels,
          nonBlankPixels,
          tonalRange: Number((maxLuminance - minLuminance).toFixed(2)),
          error: "",
        };
      } catch (error) {
        canvasSample = {
          averageLuminance: 0,
          brightPixels: 0,
          brightObjectBounds: null,
          darkPixels: 0,
          nonBlankPixels: 0,
          tonalRange: 0,
          error: error?.message || String(error),
        };
      }
    }

    const railRect = rectOf(rail);
    const readoutRect = rectOf(readout);
    const liveRect = rectOf(live);
    const controlsRect = rectOf(controls);

    return {
      canvas: rectOf(canvas),
      canvasSample,
      diagnosticsVisible: Boolean(diagnostics),
      railButtonCount: document.querySelectorAll(".station-profile-rail .station-profile-chip").length,
      renderEnabled: world?.dataset.renderEnabled,
      rendererMode: world?.dataset.rendererMode,
      sealAwake: world?.dataset.sealAwake,
      overlaps: {
        railReadout: overlaps(railRect, readoutRect),
        railLive: overlaps(railRect, liveRect),
        railControls: overlaps(railRect, controlsRect),
      },
      titleText: document.querySelector(".igloo-brand strong")?.textContent?.trim() || "",
      viewport: { width: window.innerWidth, height: window.innerHeight },
    };
  });
}

async function collectSafeGateMetrics(page) {
  return page.evaluate(() => {
    const world = document.querySelector("#world");
    const gate = document.querySelector(".sdf-seal-splash");
    const gateButton = document.querySelector(".sdf-render-button");
    const diagnostics = document.querySelector(".igloo-diagnostics");
    const canvas = document.querySelector(".igloo-scene canvas");
    const diagnosticText = diagnostics?.textContent || "";
    return {
      diagnosticsVisible: Boolean(diagnostics),
      diagnosticText,
      gateButtonText: gateButton?.textContent?.trim() || "",
      gatePresent: Boolean(gate),
      renderEnabled: world?.dataset.renderEnabled,
      rendererMode: world?.dataset.rendererMode,
      sealAwake: world?.dataset.sealAwake,
      webglCanvasPresent: Boolean(canvas),
    };
  });
}

async function verifyMovement(page) {
  const axisText = async () => page.locator(".igloo-axis-meter strong").textContent();
  const before = await axisText();
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(250);
  const afterArrow = await axisText();
  const hint = await page.locator(".igloo-input-hint").textContent().catch(() => "");
  await page.keyboard.down("d");
  await page.waitForTimeout(700);
  await page.keyboard.up("d");
  const afterD = await axisText();
  return {
    afterArrow,
    afterD,
    arrowHintVisible: /wasd/i.test(hint || ""),
    arrowMoved: before !== afterArrow,
    dMoved: afterArrow !== afterD,
    before,
  };
}

function assertViewport(result) {
  const failures = [];
  const { metrics, movement, name } = result;
  if (!metrics.canvas) failures.push("missing WebGL canvas");
  if (metrics.canvas && (metrics.canvas.width < metrics.viewport.width * 0.96 || metrics.canvas.height < metrics.viewport.height * 0.96)) {
    failures.push("canvas does not cover viewport");
  }
  if (metrics.canvasSample.error) failures.push(`canvas sampling failed: ${metrics.canvasSample.error}`);
  if (metrics.canvasSample.nonBlankPixels < 100) failures.push(`canvas appears blank: ${metrics.canvasSample.nonBlankPixels} sampled pixels`);
  if (metrics.canvasSample.averageLuminance > 150) {
    failures.push(`canvas is overexposed: average luminance ${metrics.canvasSample.averageLuminance}`);
  }
  if (metrics.canvasSample.brightPixels > 460) {
    failures.push(`canvas has too many blown highlights: ${metrics.canvasSample.brightPixels} sampled pixels`);
  }
  if (metrics.canvasSample.darkPixels < 80) {
    failures.push(`canvas lacks cinematic dark mass: ${metrics.canvasSample.darkPixels} sampled pixels`);
  }
  if (metrics.canvasSample.tonalRange < 32) {
    failures.push(`canvas lacks object contrast: tonal range ${metrics.canvasSample.tonalRange}`);
  }
  if (["desktop", "ipad"].includes(name) && metrics.canvasSample.brightObjectBounds?.left <= 0.001) {
    failures.push(`bright hero object is clipped on the left edge: ${JSON.stringify(metrics.canvasSample.brightObjectBounds)}`);
  }
  if (metrics.renderEnabled !== "true") failures.push(`renderer not enabled: ${metrics.renderEnabled}`);
  if (metrics.rendererMode !== "webgl") failures.push(`renderer mode is ${metrics.rendererMode}`);
  if (metrics.sealAwake !== "true") failures.push(`seal not awake: ${metrics.sealAwake}`);
  if (metrics.diagnosticsVisible) failures.push("diagnostics panel visible in normal render");
  if (metrics.railButtonCount < 8) failures.push(`station rail incomplete: ${metrics.railButtonCount}`);
  if (metrics.overlaps.railReadout || metrics.overlaps.railLive || metrics.overlaps.railControls) {
    failures.push(`HUD overlap detected: ${JSON.stringify(metrics.overlaps)}`);
  }
  if (name === "desktop") {
    if (movement.arrowMoved) failures.push("arrow key moved seal axis");
    if (!movement.arrowHintVisible) failures.push("arrow key did not show WASD hint");
    if (!movement.dMoved) failures.push("D key did not move seal axis");
  }
  if (!/Seal's Topology Land/i.test(metrics.titleText)) failures.push(`unexpected title: ${metrics.titleText}`);
  return failures;
}

function assertSafeGate(result) {
  const failures = [];
  const { initial, probed } = result;
  if (!initial.gatePresent) failures.push("safe gate did not render the splash gate");
  if (!/start exploring/i.test(initial.gateButtonText)) failures.push(`safe gate button text is wrong: ${initial.gateButtonText}`);
  if (initial.renderEnabled !== "false") failures.push(`safe gate initially enabled renderer: ${initial.renderEnabled}`);
  if (initial.rendererMode !== "safe") failures.push(`safe gate initial mode is ${initial.rendererMode}`);
  if (initial.sealAwake !== "false") failures.push(`safe gate initially woke seal: ${initial.sealAwake}`);
  if (initial.webglCanvasPresent) failures.push("safe gate mounted WebGL canvas before probe");
  if (!initial.diagnosticsVisible || !/safe-boot/i.test(initial.diagnosticText)) {
    failures.push("safe gate did not expose safe-boot diagnostics");
  }
  if (probed.renderEnabled !== "true") failures.push(`safe probe did not enable renderer: ${probed.renderEnabled}`);
  if (probed.rendererMode !== "webgl") failures.push(`safe probe did not settle to webgl: ${probed.rendererMode}`);
  if (probed.webglCanvasPresent !== true) failures.push("safe probe did not mount WebGL canvas");
  return failures;
}

await mkdir(outDir, { recursive: true });
let devServer = null;
if (!(await canReach(baseUrl))) {
  devServer = startDevServer();
  await waitForServer(baseUrl);
}

const browser = await launchBrowser();
const report = [];
try {
  {
    const context = await browser.newContext({
      deviceScaleFactor: 1,
      viewport: { width: safeGateViewport.width, height: safeGateViewport.height },
    });
    const page = await context.newPage();
    const logs = [];
    page.on("console", (message) => {
      if (["error", "warning"].includes(message.type())) logs.push({ type: message.type(), text: message.text() });
    });
    page.on("pageerror", (error) => logs.push({ type: "pageerror", text: error.message }));

    await page.goto(`${baseUrl}/?${safeGateViewport.query}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('#world[data-renderer-mode="safe"]', { timeout: 12000 });
    await page.waitForSelector(".sdf-render-button", { timeout: 12000 });
    await page.waitForTimeout(160);
    const initial = await collectSafeGateMetrics(page);
    const safeScreenshot = path.join(outDir, `${safeGateViewport.name}.png`);
    await page.screenshot({ path: safeScreenshot, fullPage: false });
    await page.waitForSelector('#world[data-renderer-mode="webgl"]', { timeout: 25000 });
    await page.waitForTimeout(1200);
    const probed = await collectSafeGateMetrics(page);
    const result = { name: safeGateViewport.name, screenshot: safeScreenshot, initial, probed, logs };
    result.failures = assertSafeGate(result);
    report.push(result);
    await context.close();
  }

  for (const viewport of viewports) {
    const context = await browser.newContext({
      deviceScaleFactor: 1,
      viewport: { width: viewport.width, height: viewport.height },
    });
    const page = await context.newPage();
    const logs = [];
    page.on("console", (message) => {
      if (["error", "warning"].includes(message.type())) logs.push({ type: message.type(), text: message.text() });
    });
    page.on("pageerror", (error) => logs.push({ type: "pageerror", text: error.message }));

    await page.goto(`${baseUrl}/?${viewport.query}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('#world[data-render-enabled="true"]', { timeout: 25000 });
    await page.waitForTimeout(viewport.name === "desktop" ? 2600 : 1800);

    const movement = viewport.name === "desktop" ? await verifyMovement(page) : {};
    const metrics = await collectMetrics(page);
    const screenshot = path.join(outDir, `${viewport.name}.png`);
    await page.screenshot({ path: screenshot, fullPage: false });
    const result = { name: viewport.name, screenshot, metrics, movement, logs };
    result.failures = assertViewport(result);
    report.push(result);
    await context.close();
  }
} finally {
  await browser.close();
  if (devServer) devServer.kill();
}

await writeFile(path.join(outDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
const failures = report.flatMap((result) => result.failures.map((failure) => `${result.name}: ${failure}`));
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`cinematic render verification passed: ${report.length} viewports`);
