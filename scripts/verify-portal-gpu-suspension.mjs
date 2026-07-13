import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const url = process.env.VERIFY_RENDER_URL || "http://127.0.0.1:3000";
const outputDirectory = new URL("../.verification/", import.meta.url);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({
  deviceScaleFactor: 1,
  viewport: { height: 650, width: 1000 },
});
const errors = [];

page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(`console: ${message.text()}`);
});

await page.addInitScript(() => {
  const wrapped = new WeakSet();
  const wrap = (prototype) => {
    if (!prototype) return;
    for (const name of [
      "drawArrays",
      "drawElements",
      "drawArraysInstanced",
      "drawElementsInstanced",
    ]) {
      const original = prototype[name];
      if (typeof original !== "function" || wrapped.has(original)) continue;
      const measured = function measuredDraw(...args) {
        if (this.canvas) {
          this.canvas.__portalDrawCount = (this.canvas.__portalDrawCount || 0) + 1;
        }
        return original.apply(this, args);
      };
      wrapped.add(original);
      wrapped.add(measured);
      prototype[name] = measured;
    }
  };
  wrap(globalThis.WebGLRenderingContext?.prototype);
  wrap(globalThis.WebGL2RenderingContext?.prototype);
});

try {
  const topologyUrl = `${url}/?qa-low=1&qa-sdf=1&qa-artifact=topology-archive-wall&qa=portal-intent`;
  await page.goto(topologyUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('#world[data-render-enabled="true"]', { timeout: 30000 });
  const portalOffer = page.getByRole("dialog", { name: "Launch into the archive?" });
  await portalOffer.waitFor({ state: "visible", timeout: 30000 });
  const offerBeforeCancel = {
    blackHoleDialogs: await page
      .getByRole("dialog", { name: /Topology Hall of Fame/ })
      .count(),
    offer: await page.locator("#world").getAttribute("data-world-portal-offer"),
    portalActive: await page.locator("#world").getAttribute("data-world-portal-active"),
  };
  assert.deepEqual(offerBeforeCancel, {
    blackHoleDialogs: 0,
    offer: "archive",
    portalActive: "false",
  });
  await portalOffer.getByRole("button", { name: "Stay in world" }).click();
  await portalOffer.waitFor({ state: "detached", timeout: 10000 });
  const afterCancel = {
    offer: await page.locator("#world").getAttribute("data-world-portal-offer"),
    portalActive: await page.locator("#world").getAttribute("data-world-portal-active"),
  };
  assert.deepEqual(afterCancel, { offer: "none", portalActive: "false" });

  await page.goto(
    `${url}/?qa-low=1&qa-sdf=1&qa-artifact=assembly-tool-locker&qa=tooling-no-portal`,
    { waitUntil: "domcontentloaded" },
  );
  await page.waitForSelector(
    '#world[data-render-enabled="true"][data-docked-station="assembly-tool-locker"]',
    { timeout: 30000 },
  );
  const toolingIntent = {
    blackHoleDialogs: await page
      .getByRole("dialog", { name: /Topology Hall of Fame/ })
      .count(),
    offer: await page.locator("#world").getAttribute("data-world-portal-offer"),
    portalActive: await page.locator("#world").getAttribute("data-world-portal-active"),
  };
  assert.deepEqual(toolingIntent, {
    blackHoleDialogs: 0,
    offer: "none",
    portalActive: "false",
  });

  await page.goto(topologyUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('#world[data-render-enabled="true"]', { timeout: 30000 });
  await portalOffer.waitFor({ state: "visible", timeout: 30000 });
  await portalOffer.getByRole("button", { name: "Launch archive" }).click();
  await page
    .getByRole("dialog", { name: /Topology Hall of Fame/ })
    .waitFor({ state: "visible", timeout: 60000 });
  await page.waitForTimeout(400);

  const before = await page.locator("canvas").evaluateAll((canvases) =>
    canvases.map((canvas) => ({
      className: canvas.className,
      drawCount: canvas.__portalDrawCount || 0,
      parentClassName: canvas.parentElement?.className || "",
    })),
  );
  await page.waitForTimeout(1100);
  const after = await page.locator("canvas").evaluateAll((canvases) =>
    canvases.map((canvas) => ({
      className: canvas.className,
      drawCount: canvas.__portalDrawCount || 0,
      parentClassName: canvas.parentElement?.className || "",
    })),
  );

  const mainBefore = before.find((canvas) => canvas.className.includes("igloo-scene-canvas"));
  const mainAfter = after.find((canvas) => canvas.className.includes("igloo-scene-canvas"));
  const portalAfter = after.find((canvas) => canvas.parentClassName.includes("black-hole-transition"));
  const report = {
    after,
    afterCancel,
    before,
    errors,
    mainDrawDelta: (mainAfter?.drawCount || 0) - (mainBefore?.drawCount || 0),
    offerBeforeCancel,
    portalActive: await page.locator("#world").getAttribute("data-world-portal-active"),
    toolingIntent,
    worldSuspended: await page.locator("#world").getAttribute("data-world-suspended"),
  };

  assert.equal(errors.length, 0, errors.join("\n"));
  assert.ok(mainBefore && mainAfter, "main Three.js canvas was not mounted behind the portal");
  assert.ok(portalAfter, "archive portal WebGL canvas was not mounted");
  assert.equal(report.mainDrawDelta, 0, "main Three.js world drew behind the opaque archive portal");
  assert.equal(report.portalActive, "true", "portal state was not published");
  assert.equal(report.worldSuspended, "true", "world suspension state was not published");

  const directArchive = await browser.newPage({
    deviceScaleFactor: 1,
    viewport: { height: 650, width: 1000 },
  });
  await directArchive.goto(`${url}/#archive`, { waitUntil: "domcontentloaded" });
  await directArchive.locator("#archive").waitFor({ state: "visible", timeout: 20000 });
  report.directArchive = {
    blackHoleDialogs: await directArchive
      .getByRole("dialog", { name: /Topology Hall of Fame/ })
      .count(),
    hash: await directArchive.evaluate(() => globalThis.location.hash),
    portalActive: await directArchive
      .locator("#world")
      .getAttribute("data-world-portal-active"),
  };
  assert.deepEqual(report.directArchive, {
    blackHoleDialogs: 0,
    hash: "#archive",
    portalActive: "false",
  });
  await directArchive.close();

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(
    new URL("portal-gpu-suspension-report.json", outputDirectory),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(
    `portal intent and GPU suspension passed: offer/cancel/confirm/direct archive, tooling isolation, main draw delta ${report.mainDrawDelta}`,
  );
} finally {
  await browser.close();
}
