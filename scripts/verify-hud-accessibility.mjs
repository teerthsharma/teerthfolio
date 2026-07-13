/* global document, window */

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.VERIFY_RENDER_URL || "http://127.0.0.1:3000";
const outDir = path.resolve(".verification", "hud-accessibility");
const viewports = [
  { name: "1600x1000", width: 1600, height: 1000 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "412x915", width: 412, height: 915 },
  { name: "390x844", width: 390, height: 844 },
  { capture: false, name: "320x700", width: 320, height: 700 },
  { capture: false, name: "2560x1440", width: 2560, height: 1440 },
];

const chromeCandidates = () => {
  const localAppData = process.env.LOCALAPPDATA;
  const candidates = [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    localAppData && path.join(localAppData, "Google/Chrome/Application/chrome.exe"),
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
};

async function enterWorld(page) {
  await page.goto(`${baseUrl}/?qa-sdf=1&qa-low=1&qa=hud-accessibility`, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await page.waitForSelector("#world", { timeout: 20000 });
  await page.evaluate(() => document.querySelector(".sdf-render-button")?.click());
  await page.waitForFunction(
    () => {
      const world = document.querySelector("#world");
      return ["webgl", "safe"].includes(world?.dataset.rendererMode || "");
    },
    { timeout: 30000 },
  );
  await page
    .waitForFunction(
      () => {
        const bridge = document.querySelector(".open-world-loading-bridge");
        return !bridge || bridge.dataset.active === "false" || window.getComputedStyle(bridge).visibility === "hidden";
      },
      { timeout: 10000 },
    )
    .catch(() => {});
  await page.waitForTimeout(300);
}

async function collectWorldMetrics(page) {
  return page.evaluate(() => {
    const pick = (selector) => document.querySelector(selector);
    const box = (node) => {
      if (!node) return null;
      const value = node.getBoundingClientRect();
      return {
        bottom: value.bottom,
        height: value.height,
        left: value.left,
        right: value.right,
        top: value.top,
        width: value.width,
      };
    };
    const overlaps = (a, b) =>
      Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
    const visible = (node) => {
      if (!node) return false;
      const style = window.getComputedStyle(node);
      const value = node.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && value.width > 0 && value.height > 0;
    };
    const rgb = (value) => {
      const channels = value.match(/[\d.]+/g)?.slice(0, 3).map(Number);
      return channels?.length === 3 ? channels : null;
    };
    const luminance = (channels) => {
      const linear = channels.map((channel) => {
        const value = channel / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    };
    const contrastAgainstPaper = (selector) => {
      const node = pick(selector);
      const foreground = node ? rgb(window.getComputedStyle(node).color) : null;
      if (!foreground) return null;
      const light = Math.max(luminance(foreground), luminance([250, 248, 239]));
      const dark = Math.min(luminance(foreground), luminance([250, 248, 239]));
      return (light + 0.05) / (dark + 0.05);
    };
    const world = pick("#world");
    const rail = pick(".station-profile-rail");
    const active = pick('.station-profile-chip[aria-pressed="true"]');
    const readout = pick(".igloo-artifact-readout");
    const route = pick(".igloo-route-sheet");
    const controls = pick(".igloo-controls");
    const live = pick(".igloo-live-strip");
    const nav = pick(".igloo-topnav");
    const worldRect = box(world);
    const railRect = box(rail);
    const activeRect = box(active);
    const readoutRect = box(readout);
    const routeRect = box(route);
    const controlsRect = box(controls);
    const liveRect = box(live);
    const navRect = box(nav);
    const targets = Array.from(document.querySelectorAll(".igloo-hud a, .igloo-hud button"))
      .filter(visible)
      .map((node) => ({
        height: node.getBoundingClientRect().height,
        label: node.getAttribute("aria-label") || node.textContent?.trim() || node.tagName,
        width: node.getBoundingClientRect().width,
      }));
    const technicalSizes = Array.from(document.querySelectorAll(".igloo-hud .hud-technical"))
      .filter(visible)
      .map((node) => Number.parseFloat(window.getComputedStyle(node).fontSize));
    const bodyCopy = Array.from(
      document.querySelectorAll(".igloo-readout > p:not(.igloo-artifact-signal)"),
    )
      .filter(visible)
      .map((node) => Number.parseFloat(window.getComputedStyle(node).fontSize));
    const mobile = window.innerWidth <= 720;
    return {
      activeCenterDelta: activeRect && railRect ? Math.abs((activeRect.left + activeRect.right) / 2 - (railRect.left + railRect.right) / 2) : null,
      activeInsideRail: Boolean(
        activeRect &&
          railRect &&
          activeRect.left >= railRect.left - 1 &&
          activeRect.right <= railRect.right + 1,
      ),
      bodyCopy,
      bounds: { active: activeRect, controls: controlsRect, live: liveRect, nav: navRect, rail: railRect, readout: readoutRect, route: routeRect, world: worldRect },
      mobile,
      contrastRatios: [
        contrastAgainstPaper(".igloo-artifact-readout > span"),
        contrastAgainstPaper(".igloo-readout > p:not(.igloo-artifact-signal)"),
        contrastAgainstPaper(".igloo-topnav a"),
        contrastAgainstPaper(".igloo-controls button"),
        contrastAgainstPaper(".station-profile-chip strong"),
        contrastAgainstPaper(".igloo-live-strip strong"),
      ].filter((value) => Number.isFinite(value)),
      overlaps: {
        controlsRoute: overlaps(controlsRect, routeRect),
        liveRoute: overlaps(liveRect, routeRect),
        navControls: overlaps(navRect, controlsRect),
        navReadout: overlaps(navRect, readoutRect),
        railControls: overlaps(railRect, controlsRect),
        railLive: overlaps(railRect, liveRect),
        railReadout: overlaps(railRect, readoutRect),
      },
      railButtonCount: document.querySelectorAll(".station-profile-chip").length,
      rendererMode: world?.dataset.rendererMode || "unknown",
      readoutStyle: readout
        ? {
            animation: window.getComputedStyle(readout).animationName,
            position: window.getComputedStyle(readout).position,
            top: window.getComputedStyle(readout).top,
            transform: window.getComputedStyle(readout).transform,
          }
        : null,
      targets,
      technicalSizes,
      viewport: { height: window.innerHeight, width: window.innerWidth },
      worldOverflow: world ? { x: world.scrollWidth - world.clientWidth, y: world.scrollHeight - world.clientHeight } : null,
    };
  });
}

function assertWorldMetrics(metrics, name) {
  const inside = (inner, outer) =>
    Boolean(
      inner &&
        outer &&
        inner.left >= outer.left - 1 &&
        inner.right <= outer.right + 1 &&
        inner.top >= outer.top - 1 &&
        inner.bottom <= outer.bottom + 1,
    );
  assert.ok(["webgl", "safe"].includes(metrics.rendererMode), `${name}: renderer never reached a usable mode`);
  assert.equal(metrics.railButtonCount, 8, `${name}: station route does not expose all eight stations`);
  assert.ok(metrics.activeInsideRail, `${name}: active station is clipped by the route rail`);
  assert.ok(metrics.activeCenterDelta <= 3, `${name}: active station is not centered (${metrics.activeCenterDelta}px)`);
  for (const target of metrics.targets) {
    assert.ok(target.width >= 44 && target.height >= 44, `${name}: undersized target ${target.label} (${target.width}x${target.height})`);
  }
  assert.ok(metrics.technicalSizes.every((size) => size >= 12), `${name}: technical metadata fell below 12px`);
  assert.ok(metrics.bodyCopy.every((size) => size >= 16), `${name}: paragraph copy fell below 16px`);
  assert.ok(metrics.contrastRatios.every((ratio) => ratio >= 4.5), `${name}: HUD text contrast fell below 4.5:1`);
  assert.ok(metrics.worldOverflow.x <= 1, `${name}: HUD creates ${metrics.worldOverflow.x}px horizontal overflow`);
  assert.ok(metrics.worldOverflow.y <= 1, `${name}: HUD creates ${metrics.worldOverflow.y}px vertical overflow`);
  assert.ok(inside(metrics.bounds.nav, metrics.bounds.world), `${name}: world navigation leaves the viewport`);
  assert.ok(inside(metrics.bounds.controls, metrics.bounds.world), `${name}: quality controls leave the viewport`);
  assert.ok(inside(metrics.bounds.live, metrics.bounds.world), `${name}: source radar leaves the viewport`);
  assert.equal(metrics.overlaps.navControls, false, `${name}: navigation overlaps quality controls`);
  assert.equal(metrics.overlaps.navReadout, false, `${name}: navigation overlaps station readout`);
  assert.equal(metrics.overlaps.railControls, false, `${name}: route rail overlaps quality controls`);
  assert.equal(metrics.overlaps.railLive, false, `${name}: route rail overlaps source radar`);
  if (metrics.mobile) {
    assert.equal(metrics.overlaps.controlsRoute, false, `${name}: mobile controls overlap route sheet`);
    assert.equal(metrics.overlaps.liveRoute, false, `${name}: mobile source radar overlaps route sheet`);
    assert.ok(metrics.bounds.route.bottom <= metrics.viewport.height + 1, `${name}: route sheet leaves viewport`);
    assert.ok(inside(metrics.bounds.route, metrics.bounds.world), `${name}: route sheet leaves the viewport`);
  } else {
    assert.equal(metrics.overlaps.railReadout, false, `${name}: route rail overlaps corner readout`);
    const cardCenter = (metrics.bounds.readout.left + metrics.bounds.readout.right) / 2;
    assert.ok(cardCenter >= metrics.viewport.width * 0.72, `${name}: readout drifted into the central hero arena`);
    assert.ok(metrics.bounds.readout.top <= metrics.viewport.height * 0.2, `${name}: readout is not anchored to a screen corner`);
    assert.ok(inside(metrics.bounds.readout, metrics.bounds.world), `${name}: station readout leaves the viewport`);
  }
}

async function verifyRailKeyboard(page) {
  const first = page.locator(".station-profile-chip").first();
  await first.focus();
  await page.keyboard.press("End");
  await page.waitForTimeout(450);
  const state = await page.evaluate(() => {
    const rail = document.querySelector(".station-profile-rail");
    const focused = document.activeElement;
    const active = document.querySelector('.station-profile-chip[aria-pressed="true"]');
    const railRect = rail?.getBoundingClientRect();
    const activeRect = active?.getBoundingClientRect();
    return {
      activeIsLast: active === document.querySelector(".station-profile-chip:last-child"),
      centered: Boolean(
        railRect &&
          activeRect &&
          Math.abs((activeRect.left + activeRect.right - railRect.left - railRect.right) / 2) <= 3,
      ),
      focusVisible: focused?.matches?.(":focus-visible") || false,
      focusedIsLast: focused === document.querySelector(".station-profile-chip:last-child"),
    };
  });
  assert.equal(state.focusedIsLast, true, "End key did not focus the last station");
  assert.equal(state.activeIsLast, true, "End key did not select the last station destination");
  assert.equal(state.centered, true, "keyboard-selected station was not centered");
  assert.equal(state.focusVisible, true, "keyboard focus ring is not visible");
}

async function verifyArchive(page) {
  await page.evaluate(() => document.querySelector("#archive")?.scrollIntoView({ behavior: "instant" }));
  await page.waitForTimeout(400);
  const first = page.locator('.archive-tabs [role="tab"]').first();
  await first.focus();
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(100);
  const archive = await page.evaluate(() => ({
    focusedTab: document.activeElement?.getAttribute("role") === "tab",
    panelCount: document.querySelectorAll('#archive [role="tabpanel"]').length,
    selectedCount: document.querySelectorAll('#archive [role="tab"][aria-selected="true"]').length,
    targetHeights: Array.from(document.querySelectorAll("#archive button, #archive a")).map(
      (node) => node.getBoundingClientRect().height,
    ),
  }));
  assert.equal(archive.panelCount, 1, "archive renders more than one evidence panel");
  assert.equal(archive.selectedCount, 1, "archive tab selection is ambiguous");
  assert.equal(archive.focusedTab, true, "archive arrow navigation lost keyboard focus");
  assert.ok(archive.targetHeights.every((height) => height >= 44), "archive contains a target below 44px");
  const repoReachability = await page.evaluate(async () => {
    const section = document.querySelector("#archive");
    const tape = section?.querySelector(".repo-tape");
    if (!section || !tape) return { reachable: false, scrollable: false };
    section.scrollTop = section.scrollHeight;
    await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
    const bounds = tape.getBoundingClientRect();
    const reachable = bounds.top < window.innerHeight && bounds.bottom > 0;
    const scrollable = section.scrollHeight <= section.clientHeight + 1 || section.scrollTop > 0;
    section.scrollTop = 0;
    return { reachable, scrollable };
  });
  assert.equal(repoReachability.scrollable, true, "archive fallback cannot be vertically reached");
  assert.equal(repoReachability.reachable, true, "archive source tape remains outside the reading viewport");
}

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({
  executablePath: chromeCandidates(),
  headless: true,
  args: ["--disable-dev-shm-usage", "--no-first-run", "--no-default-browser-check"],
});
const report = [];
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await enterWorld(page);
    const metrics = await collectWorldMetrics(page);
    if (process.env.HUD_DEBUG === "1") console.error(JSON.stringify(metrics, null, 2));
    assertWorldMetrics(metrics, viewport.name);
    await verifyRailKeyboard(page);
    if (viewport.capture !== false) {
      await page.screenshot({ path: path.join(outDir, `hud-${viewport.name}.png`) });
    }
    await verifyArchive(page);
    if (viewport.capture !== false) {
      await page.screenshot({ path: path.join(outDir, `archive-${viewport.name}.png`) });
    }
    assert.deepEqual(pageErrors, [], `${viewport.name}: page errors: ${pageErrors.join(" | ")}`);
    report.push({ name: viewport.name, metrics, pageErrors });
    await context.close();
  }

  const zoomContext = await browser.newContext({
    deviceScaleFactor: 1.5,
    viewport: { width: 1067, height: 667 },
  });
  const zoomPage = await zoomContext.newPage();
  await enterWorld(zoomPage);
  const zoomMetrics = await collectWorldMetrics(zoomPage);
  assertWorldMetrics(zoomMetrics, "150-percent-zoom");
  await verifyRailKeyboard(zoomPage);
  await zoomPage.screenshot({ path: path.join(outDir, "hud-150-percent-zoom-keyboard.png") });
  report.push({ name: "150-percent-zoom", metrics: zoomMetrics });
  await zoomContext.close();
} finally {
  await browser.close();
}

await writeFile(path.join(outDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(`HUD visual/accessibility verification passed across ${report.length} viewport modes.`);
