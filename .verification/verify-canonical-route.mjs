/* global console, performance */

import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const BASE_URL =
  "http://127.0.0.1:3000/?qa-sdf=1&qa-low=1&qa=canonical-route";
const STATIONS = {
  "observatory-plaque": { index: 0, x: -19.26, z: 8.99 },
  "s2-kernel-core": { index: 1, x: -6.01, z: 15.61 },
  "assembly-tool-locker": { index: 7, x: -20.98, z: -2.33 },
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  deviceScaleFactor: 1,
  viewport: { height: 1000, width: 1600 },
});
const page = await context.newPage();
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(`console: ${message.text()}`);
});
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));

await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
await page.waitForSelector('#world[data-render-enabled="true"]', { timeout: 25_000 });
await page.waitForSelector('#world[data-docked-station="observatory-plaque"]', {
  timeout: 12_000,
});
await page.waitForTimeout(1_000);
await page.screenshot({ path: ".verification/canonical-route-plaque.png" });

const world = page.locator("#world");
const readSample = () =>
  world.evaluate((node) => ({
    docked: node.dataset.dockedStation,
    queueLength: Number(node.dataset.routeQueueLength),
    speed: Number(node.dataset.traversalSpeed),
    time: performance.now(),
    waypoint: node.dataset.routeWaypoint,
    x: Number(node.dataset.worldX),
    z: Number(node.dataset.worldZ),
  }));

async function travelTo(id, screenshotName) {
  const station = STATIONS[id];
  await page.locator(".station-profile-chip").nth(station.index).click();
  const samples = [];
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    const sample = await readSample();
    samples.push(sample);
    if (sample.docked === id) break;
    await page.waitForTimeout(60);
  }
  assert.equal(
    samples.at(-1)?.docked,
    id,
    `${id} did not earn its semantic dock: ${JSON.stringify(samples.at(-1))}`,
  );
  const final = samples.at(-1);
  assert.ok(
    Math.hypot(final.x - station.x, final.z - station.z) <= 0.35,
    `${id} dock pose drifted from its canonical XZ target`,
  );
  let maximumObservedSpeed = 0;
  let previousChangedSample = samples[0];
  for (let index = 1; index < samples.length; index += 1) {
    const sampleDistance = Math.hypot(
      samples[index].x - previousChangedSample.x,
      samples[index].z - previousChangedSample.z,
    );
    if (sampleDistance <= 0.000_1) continue;
    const elapsedSeconds = Math.max(
      0.001,
      (samples[index].time - previousChangedSample.time) / 1_000,
    );
    maximumObservedSpeed = Math.max(
      maximumObservedSpeed,
      sampleDistance / elapsedSeconds,
    );
    previousChangedSample = samples[index];
  }
  assert.ok(
    maximumObservedSpeed <= 5.55,
    `${id} browser route exceeded the bounded controller (${maximumObservedSpeed.toFixed(3)} u/s)`,
  );
  await page.waitForTimeout(350);
  await page.screenshot({ path: `.verification/${screenshotName}` });
  return { maximumObservedSpeed, samples };
}

const plaqueToS2 = await travelTo("s2-kernel-core", "canonical-route-s2.png");
const s2ToAssembly = await travelTo(
  "assembly-tool-locker",
  "canonical-route-assembly.png",
);
const assemblyToPlaque = await travelTo(
  "observatory-plaque",
  "canonical-route-plaque-return.png",
);

const plaqueDock = STATIONS["observatory-plaque"];
const intermediateSamples = s2ToAssembly.samples.filter(
  (sample) =>
    sample.waypoint === "observatory-plaque" &&
    Math.hypot(sample.x - plaqueDock.x, sample.z - plaqueDock.z) <= 1.85,
);
assert.ok(intermediateSamples.length > 0, "browser route never sampled the Plaque bend");
const minimumIntermediateSpeed = Math.min(
  ...intermediateSamples.map((sample) => sample.speed),
);
assert.ok(
  minimumIntermediateSpeed >= 1.5,
  `browser route nearly stopped at its intermediate bend (${minimumIntermediateSpeed.toFixed(3)} u/s)`,
);
assert.deepEqual(errors, [], "canonical route emitted browser errors");

const report = {
  errors,
  maximumObservedSpeeds: {
    assemblyToPlaque: assemblyToPlaque.maximumObservedSpeed,
    plaqueToS2: plaqueToS2.maximumObservedSpeed,
    s2ToAssembly: s2ToAssembly.maximumObservedSpeed,
  },
  minimumIntermediateSpeed,
  route: [
    "observatory-plaque",
    "s2-kernel-core",
    "assembly-tool-locker",
    "observatory-plaque",
  ],
};
await writeFile(
  ".verification/canonical-route-report.json",
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(JSON.stringify(report));
await context.close();
await browser.close();
