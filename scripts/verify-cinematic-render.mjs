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
const safeGateViewport = { name: "safe-gate", width: 1440, height: 900, query: "safe=1" };
const sectionViewports = [
  { hash: "projects", name: "projects-desktop", width: 1440, height: 900 },
  { hash: "archive", name: "archive-desktop", width: 1440, height: 900 },
  { hash: "projects", name: "projects-mobile", width: 375, height: 667 },
  { hash: "archive", name: "archive-mobile", width: 375, height: 667 },
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
    const canvas = Array.from(document.querySelectorAll("canvas")).find(
      (item) => !item.classList.contains("igloo-atmosphere-canvas"),
    );
    const rail = document.querySelector(".station-profile-rail");
    const readout = document.querySelector(".igloo-artifact-readout");
    const live = document.querySelector(".igloo-live-strip");
    const controls = document.querySelector(".igloo-controls");
    const diagnostics = document.querySelector(".igloo-diagnostics");
    const brand = document.querySelector(".igloo-brand");
    const manifesto = document.querySelector(".igloo-manifesto");
    const controlsHint = document.querySelector(".igloo-controls-hint");
    const topnav = document.querySelector(".igloo-topnav");

    const rectOf = (node) => {
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
    };
    const overlaps = (a, b) => Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
    const visibleInViewport = (rect, minWidth = 20, minHeight = 12) =>
      Boolean(
        rect &&
          rect.right > 0 &&
          rect.bottom > 0 &&
          rect.left < window.innerWidth &&
          rect.top < window.innerHeight &&
          Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0) >= minWidth &&
          Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0) >= minHeight,
      );

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
          if (luminance > 108) {
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
    const brandRect = rectOf(brand);
    const controlsHintRect = rectOf(controlsHint);
    const topnavRect = rectOf(topnav);

    return {
      canvas: rectOf(canvas),
      canvasSample,
      contentText: {
        brand: brand?.textContent?.trim() || "",
        controlsHint: controlsHint?.textContent?.trim() || "",
        latestEvidence: live?.textContent?.trim() || "",
        manifesto: manifesto?.textContent?.trim() || "",
        readout: readout?.textContent?.trim() || "",
      },
      diagnosticsVisible: Boolean(diagnostics),
      hudOverflow: {
        readout: readout ? readout.scrollHeight > readout.clientHeight + 1 : false,
      },
      hudBounds: {
        brand: brandRect,
        controls: controlsRect,
        controlsHint: controlsHintRect,
        live: liveRect,
        rail: railRect,
        readout: readoutRect,
        topnav: topnavRect,
      },
      railButtonCount: document.querySelectorAll(".station-profile-rail .station-profile-chip").length,
      renderEnabled: world?.dataset.renderEnabled,
      rendererMode: world?.dataset.rendererMode,
      sealAwake: world?.dataset.sealAwake,
      visibleHud: {
        brand: visibleInViewport(brandRect, 80, 36),
        controls: visibleInViewport(controlsRect, 60, 24),
        controlsHint: visibleInViewport(controlsHintRect, 80, 24),
        live: visibleInViewport(liveRect, 120, 40),
        rail: visibleInViewport(railRect, 180, 30),
        readout: visibleInViewport(readoutRect, 160, 60),
        topnav: visibleInViewport(topnavRect, 120, 34),
      },
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
    const canvas = Array.from(document.querySelectorAll("canvas")).find(
      (item) => !item.classList.contains("igloo-atmosphere-canvas"),
    );
    let canvasSample = {
      averageLuminance: 0,
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
        let total = 0;
        let max = 0;
        let min = 255;
        let nonBlank = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          const luminance = pixels[i] * 0.2126 + pixels[i + 1] * 0.7152 + pixels[i + 2] * 0.0722;
          total += luminance;
          max = Math.max(max, luminance);
          min = Math.min(min, luminance);
          if (luminance > 2) nonBlank += 1;
        }
        canvasSample = {
          averageLuminance: Number((total / (pixels.length / 4)).toFixed(2)),
          nonBlankPixels: nonBlank,
          tonalRange: Number((max - min).toFixed(2)),
          error: "",
        };
      } catch (error) {
        canvasSample.error = error?.message || String(error);
      }
    }
    const diagnosticText = diagnostics?.textContent || "";
    return {
      canvasSample,
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

async function collectSectionMetrics(page) {
  return page.evaluate(() => {
    const rectOf = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return {
        bottom: rect.bottom,
        height: rect.height,
        left: rect.left,
        right: rect.right,
        text: node.textContent?.trim() || "",
        top: rect.top,
        width: rect.width,
      };
    };
    const visible = (rect, minWidth = 80, minHeight = 40) =>
      Boolean(
        rect &&
          rect.right > 0 &&
          rect.bottom > 0 &&
          rect.left < window.innerWidth &&
          rect.top < window.innerHeight &&
          Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0) >= minWidth &&
          Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0) >= minHeight,
      );

    const projectHead = rectOf(".project-index-head");
    const projectList = rectOf(".project-list");
    const projectDetail = rectOf(".project-detail");
    const archiveHead = rectOf(".archive-head");
    const archiveGrid = rectOf(".archive-grid");
    const repoTape = rectOf(".repo-tape");

    return {
      archiveGrid,
      archiveHead,
      bodyScrollWidth: document.documentElement.scrollWidth,
      projectDetail,
      projectHead,
      projectList,
      repoTape,
      visible: {
        archiveGrid: visible(archiveGrid, 160, 160),
        archiveHead: visible(archiveHead, 160, 80),
        projectDetail: visible(projectDetail, 160, 120),
        projectHead: visible(projectHead, 160, 80),
        projectList: visible(projectList, 160, 60),
        repoTape: visible(repoTape, 160, 80),
      },
      viewport: { height: window.innerHeight, width: window.innerWidth },
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

async function verifyRailTap(page) {
  const readoutText = async () => page.locator(".igloo-artifact-readout").textContent();
  const before = await readoutText();
  const target = page.locator(".station-profile-rail .station-profile-chip").nth(2);
  await target.click();
  await page.waitForTimeout(450);
  const after = await readoutText();
  return {
    after,
    before,
    changed: before !== after,
    targetText: await target.textContent(),
  };
}

function assertViewport(result) {
  const failures = [];
  const { metrics, movement, name, railTap } = result;
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
  if (name === "mobile" && metrics.canvasSample.brightObjectBounds?.right >= 0.995) {
    failures.push(`mobile hero object is clipped on the right edge: ${JSON.stringify(metrics.canvasSample.brightObjectBounds)}`);
  }
  if (["desktop", "ipad"].includes(name)) {
    const heroBounds = metrics.canvasSample.brightObjectBounds;
    const heroWidth = heroBounds ? heroBounds.right - heroBounds.left : 0;
    if (heroWidth < 0.25) {
      failures.push(`bright hero object is under-scaled for cinematic object-world framing: ${JSON.stringify(heroBounds)}`);
    }
  }
  if (name === "ipad" && metrics.canvasSample.brightObjectBounds?.bottom > 0.6) {
    failures.push(`iPad hero object sits too low in the cinematic frame: ${JSON.stringify(metrics.canvasSample.brightObjectBounds)}`);
  }
  if (name === "mobile" && metrics.hudBounds.readout?.height > 150) {
    failures.push(`mobile readout overpowers the cinematic world: ${JSON.stringify(metrics.hudBounds.readout)}`);
  }
  if (metrics.hudOverflow?.readout) {
    failures.push(`station readout content is clipped: ${JSON.stringify(metrics.hudBounds.readout)}`);
  }
  if (metrics.renderEnabled !== "true") failures.push(`renderer not enabled: ${metrics.renderEnabled}`);
  if (metrics.rendererMode !== "webgl") failures.push(`renderer mode is ${metrics.rendererMode}`);
  if (metrics.sealAwake !== "true") failures.push(`seal not awake: ${metrics.sealAwake}`);
  if (metrics.diagnosticsVisible) failures.push("diagnostics panel visible in normal render");
  if (metrics.railButtonCount < 8) failures.push(`station rail incomplete: ${metrics.railButtonCount}`);
  if (!metrics.visibleHud.brand) failures.push(`brand block is not visibly in viewport: ${JSON.stringify(metrics.hudBounds.brand)}`);
  if (!metrics.visibleHud.rail) failures.push(`station rail is not visibly in viewport: ${JSON.stringify(metrics.hudBounds.rail)}`);
  if (!metrics.visibleHud.readout) failures.push(`active station readout is not visibly in viewport: ${JSON.stringify(metrics.hudBounds.readout)}`);
  if (!metrics.visibleHud.live) failures.push(`live evidence strip is not visibly in viewport: ${JSON.stringify(metrics.hudBounds.live)}`);
  if (!metrics.visibleHud.controls) failures.push(`quality controls are not visibly in viewport: ${JSON.stringify(metrics.hudBounds.controls)}`);
  if (["desktop", "ipad"].includes(name) && !metrics.visibleHud.topnav) {
    failures.push(`top navigation is not visibly in viewport: ${JSON.stringify(metrics.hudBounds.topnav)}`);
  }
  if (name === "desktop" && metrics.hudBounds.topnav?.top > 120) {
    failures.push(`desktop top navigation drifted out of the top command zone: ${JSON.stringify(metrics.hudBounds.topnav)}`);
  }
  if (name === "desktop" && !metrics.visibleHud.controlsHint) {
    failures.push(`desktop WASD hint is not visibly in viewport: ${JSON.stringify(metrics.hudBounds.controlsHint)}`);
  }
  if (!/live upstream radar|snapshot radar/i.test(metrics.contentText.latestEvidence)) {
    failures.push(`first viewport lacks source evidence: ${metrics.contentText.latestEvidence}`);
  }
  if (!/topology|manifold|homology/i.test(metrics.contentText.manifesto) || !/ml|kernel|qpu|upstream/i.test(metrics.contentText.manifesto)) {
    failures.push(`manifesto lacks Teerth-specific topology/ML systems language: ${metrics.contentText.manifesto}`);
  }
  if (!/observatory|s2|aether|field|qpu|upstream|archive/i.test(metrics.contentText.readout)) {
    failures.push(`active station readout lacks project station copy: ${metrics.contentText.readout}`);
  }
  if (!/75 repos|Seal OS|Aether-Lang|Faraday|Triton|PyTorch|topoflow|AVX-512/i.test(metrics.contentText.readout)) {
    failures.push(`active station readout lacks source-backed station signal: ${metrics.contentText.readout}`);
  }
  if (name === "desktop" && !/wasd/i.test(metrics.contentText.controlsHint)) {
    failures.push(`desktop controls hint does not mention WASD: ${metrics.contentText.controlsHint}`);
  }
  if (metrics.overlaps.railReadout || metrics.overlaps.railLive || metrics.overlaps.railControls) {
    failures.push(`HUD overlap detected: ${JSON.stringify(metrics.overlaps)}`);
  }
  if (name === "desktop") {
    if (movement.arrowMoved) failures.push("arrow key moved seal axis");
    if (!movement.arrowHintVisible) failures.push("arrow key did not show WASD hint");
    if (!movement.dMoved) failures.push("D key did not move seal axis");
  }
  if (name === "mobile" && !railTap.changed) {
    failures.push(`mobile station rail tap did not change active station: ${railTap.targetText}`);
  }
  if (!/Seal's Topology Land/i.test(metrics.titleText)) failures.push(`unexpected title: ${metrics.titleText}`);
  if (/start exploring/i.test(metrics.contentText.brand)) {
    failures.push(`normal WebGL brand copy still contains gate-era text: ${metrics.contentText.brand}`);
  }
  return failures;
}

function assertSafeGate(result) {
  const failures = [];
  const { idle, initial, probed } = result;
  if (!initial.gatePresent) failures.push("safe gate did not render the splash gate");
  if (!/start exploring/i.test(initial.gateButtonText)) failures.push(`safe gate button text is wrong: ${initial.gateButtonText}`);
  if (initial.renderEnabled !== "false") failures.push(`safe gate initially enabled renderer: ${initial.renderEnabled}`);
  if (initial.rendererMode !== "safe") failures.push(`safe gate initial mode is ${initial.rendererMode}`);
  if (initial.sealAwake !== "false") failures.push(`safe gate initially woke seal: ${initial.sealAwake}`);
  if (initial.webglCanvasPresent) failures.push("safe gate mounted WebGL canvas before probe");
  if (!initial.diagnosticsVisible || !/safe-boot/i.test(initial.diagnosticText)) {
    failures.push("safe gate did not expose safe-boot diagnostics");
  }
  if (idle.renderEnabled !== "false" || idle.rendererMode !== "safe" || idle.webglCanvasPresent) {
    failures.push(`safe gate auto-started before button click: ${JSON.stringify(idle)}`);
  }
  if (probed.renderEnabled !== "true") failures.push(`safe probe did not enable renderer: ${probed.renderEnabled}`);
  if (probed.rendererMode !== "webgl") failures.push(`safe probe did not settle to webgl: ${probed.rendererMode}`);
  if (probed.sealAwake !== "true") failures.push(`safe probe did not wake the seal: ${probed.sealAwake}`);
  if (probed.webglCanvasPresent !== true) failures.push("safe probe did not mount WebGL canvas");
  if (probed.canvasSample?.error) failures.push(`safe probe canvas sampling failed: ${probed.canvasSample.error}`);
  if ((probed.canvasSample?.nonBlankPixels || 0) < 100) {
    failures.push(`safe probe canvas appears blank: ${JSON.stringify(probed.canvasSample)}`);
  }
  if ((probed.canvasSample?.tonalRange || 0) < 24) {
    failures.push(`safe probe canvas lacks visible GL contrast: ${JSON.stringify(probed.canvasSample)}`);
  }
  return failures;
}

function assertSection(result) {
  const failures = [];
  const { hash, metrics, name } = result;
  const mobile = metrics.viewport.width < 600;
  if (hash === "projects") {
    if (!metrics.visible.projectHead) failures.push(`project heading is not visible: ${JSON.stringify(metrics.projectHead)}`);
    if (!metrics.visible.projectList) failures.push(`project selector is not visible: ${JSON.stringify(metrics.projectList)}`);
    if (!metrics.visible.projectDetail) failures.push(`project detail is not visible: ${JSON.stringify(metrics.projectDetail)}`);
    if (mobile && metrics.projectList.height > 130) failures.push(`mobile project selector is too tall: ${metrics.projectList.height}`);
    if (metrics.projectDetail.bottom > metrics.viewport.height - 8) {
      failures.push(`project detail escapes first viewport: ${JSON.stringify(metrics.projectDetail)}`);
    }
    if (!/Epsilon-Hollow|Aether-Lang|faraday|hamliton/i.test(metrics.projectList.text)) {
      failures.push("project selector lacks flagship project names");
    }
  }
  if (hash === "archive") {
    if (!metrics.visible.archiveHead) failures.push(`archive heading is not visible: ${JSON.stringify(metrics.archiveHead)}`);
    if (!metrics.visible.archiveGrid) failures.push(`archive grid is not visible: ${JSON.stringify(metrics.archiveGrid)}`);
    if (!metrics.visible.repoTape && !mobile) failures.push(`desktop repo tape is not visible: ${JSON.stringify(metrics.repoTape)}`);
    if (!/live-github|research-snapshot/i.test(metrics.archiveGrid.text)) failures.push("archive grid lacks source-mode label");
    if (!/triton-lang|PyTorch|NeMo/i.test(metrics.archiveGrid.text)) failures.push("archive grid lacks upstream evidence");
  }
  if (!["projects-desktop", "archive-desktop", "projects-mobile", "archive-mobile"].includes(name)) {
    failures.push(`unexpected section verifier name: ${name}`);
  }
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
    await page.waitForTimeout(1300);
    const idle = await collectSafeGateMetrics(page);
    const safeScreenshot = path.join(outDir, `${safeGateViewport.name}.png`);
    await page.screenshot({ path: safeScreenshot, fullPage: false });
    await page.locator(".sdf-render-button").click();
    await page.waitForSelector('#world[data-renderer-mode="webgl"]', { timeout: 25000 });
    await page.waitForTimeout(1200);
    const probed = await collectSafeGateMetrics(page);
    const result = { name: safeGateViewport.name, screenshot: safeScreenshot, initial, idle, probed, logs };
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

    const metrics = await collectMetrics(page);
    const screenshot = path.join(outDir, `${viewport.name}.png`);
    await page.screenshot({ path: screenshot, fullPage: false });
    const movement = viewport.name === "desktop" ? await verifyMovement(page) : {};
    const railTap = viewport.name === "mobile" ? await verifyRailTap(page) : {};
    const result = { name: viewport.name, screenshot, metrics, movement, railTap, logs };
    result.failures = assertViewport(result);
    report.push(result);
    await context.close();
  }

  for (const sectionViewport of sectionViewports) {
    const context = await browser.newContext({
      deviceScaleFactor: 1,
      viewport: { width: sectionViewport.width, height: sectionViewport.height },
    });
    const page = await context.newPage();
    const logs = [];
    page.on("console", (message) => {
      if (["error", "warning"].includes(message.type())) logs.push({ type: message.type(), text: message.text() });
    });
    page.on("pageerror", (error) => logs.push({ type: "pageerror", text: error.message }));

    await page.goto(`${baseUrl}/?qa-low=1#${sectionViewport.hash}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1600);
    const metrics = await collectSectionMetrics(page);
    const screenshot = path.join(outDir, `${sectionViewport.name}.png`);
    await page.screenshot({ path: screenshot, fullPage: false });
    const result = {
      hash: sectionViewport.hash,
      name: sectionViewport.name,
      screenshot,
      metrics,
      logs,
    };
    result.failures = assertSection(result);
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
