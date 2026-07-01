/* global document, window */

import { existsSync, createWriteStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { chromium } from "playwright";

const DEFAULT_BASE_URL = "http://127.0.0.1:5173";
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

function startDevServer() {
  const nextBin = path.resolve("node_modules", ".bin", isWindows ? "next.cmd" : "next");
  if (!existsSync(nextBin)) {
    throw new Error(`Cannot find Next binary at ${nextBin}. Run npm install first.`);
  }

  const child = spawn(nextBin, ["dev", "-H", "127.0.0.1", "-p", "5173"], {
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

    let canvasSample = { nonBlankPixels: 0, error: "" };
    if (canvas) {
      try {
        const sampler = document.createElement("canvas");
        sampler.width = 32;
        sampler.height = 32;
        const context = sampler.getContext("2d", { willReadFrequently: true });
        context.drawImage(canvas, 0, 0, sampler.width, sampler.height);
        const pixels = context.getImageData(0, 0, sampler.width, sampler.height).data;
        let nonBlankPixels = 0;
        for (let index = 0; index < pixels.length; index += 4) {
          if (pixels[index] + pixels[index + 1] + pixels[index + 2] + pixels[index + 3] > 18) nonBlankPixels += 1;
        }
        canvasSample = { nonBlankPixels, error: "" };
      } catch (error) {
        canvasSample = { nonBlankPixels: 0, error: error?.message || String(error) };
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

await mkdir(outDir, { recursive: true });
let devServer = null;
if (!(await canReach(baseUrl))) {
  devServer = startDevServer();
  await waitForServer(baseUrl);
}

const browser = await launchBrowser();
const report = [];
try {
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
