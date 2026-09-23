/* global document */
// What does a visit cost to download, and how much of it lands before the click?
//
// Written after the same mistake three times in one session: comparing two arms
// measured by different instruments. The bundle work had no committed probe, so
// each question got a fresh ad-hoc script — one throttled, one not, one counting
// chunks and one counting all static assets — and their numbers were then
// compared to each other. A deep import of drei looked like a 500KB saving that
// way and turned out to be nothing when both arms were re-run through one script.
//
// So bundle questions get one instrument. Run it, change one thing, rebuild, run
// it again, and the two numbers are comparable because they came from the same
// place.
//
//   node scripts/probe-bundle-bytes.mjs [label]
//   PROBE_THROTTLE=0    measure on the local link instead of the default 1.6Mbps
//   PROBE_WAIT_MS=4000  how long the entry screen is read before clicking
//
// Reports bytes before the click separately from the total, because they answer
// different questions: the prefetch deliberately moves the scene chunk into the
// first number, so a change that moves work earlier improves nothing about the
// second, and a change that removes work improves both.
import { chromium } from "playwright";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { assertServedBuildIsCurrent } from "./probe-served-build.mjs";

const BASE = process.env.PROBE_BASE || "http://localhost:3100";
const LABEL = process.argv[2] || "bundle";
const WAIT_MS = Number(process.env.PROBE_WAIT_MS || 4000);
const THROTTLE = process.env.PROBE_THROTTLE !== "0";
const SETTLE_MS = 18000;

// Refuse to measure a build the server is not serving. A stopped build leaves the
// previous one complete and working in .next, and a server started before a
// rebuild keeps serving what it loaded — both produce a clean run of the wrong
// world, which has been mistaken for a null result more than once here.
await assertServedBuildIsCurrent().catch((error) => {
  console.error(String(error.message));
  process.exit(1);
});

const profile = join("verification", `bundle-profile-${LABEL}`);
await rm(profile, { recursive: true, force: true });
const context = await chromium.launchPersistentContext(profile, {
  channel: "chrome",
  headless: false,
  args: ["--enable-gpu", "--window-position=0,0"],
  viewport: { width: 1440, height: 900 },
});
const page = context.pages()[0] || (await context.newPage());

if (THROTTLE) {
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
}

const assets = [];
let unreadable = 0;
page.on("response", async (response) => {
  if (!/\/_next\/static\//.test(response.url())) return;
  try {
    assets.push({ name: response.url().split("/").pop(), bytes: (await response.body()).length });
  } catch {
    // Counted, not swallowed. An ad-hoc version of this probe silently treated
    // an unreadable body as zero bytes and reported 1,480KB against this one's
    // 2,220KB for the same build, which was then read as a difference between
    // network conditions rather than as a broken measurement.
    unreadable += 1;
  }
});

await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 180000 });
await page.waitForTimeout(WAIT_MS);
const beforeClick = assets.reduce((sum, asset) => sum + asset.bytes, 0);
const beforeCount = assets.length;

await page.locator("button", { hasText: /enter the world|start/i }).first().click().catch(() => {});
const reached = await page
  .waitForFunction(() => document.querySelector("#world")?.dataset.rendererMode === "webgl", {
    timeout: 180000,
  })
  .then(() => true)
  .catch(() => false);
await page.waitForTimeout(SETTLE_MS);
await context.close();

if (!reached) {
  console.error("the world never reported a webgl renderer; these byte counts are of a failed visit");
  process.exit(1);
}

if (unreadable > 0) {
  console.error(`${unreadable} response bodies could not be read; this total is an undercount and is not reported`);
  process.exit(1);
}
const total = assets.reduce((sum, asset) => sum + asset.bytes, 0);
const largest = [...assets].sort((a, b) => b.bytes - a.bytes)[0];
const kb = (bytes) => `${(bytes / 1024).toFixed(1)}KB`;

console.log(`${LABEL}   ${THROTTLE ? "1.6Mbps/150ms" : "local link"}, entry screen read for ${WAIT_MS}ms`);
console.log(`  before the click   ${kb(beforeClick).padStart(9)} across ${beforeCount} assets`);
console.log(`  total              ${kb(total).padStart(9)} across ${assets.length} assets`);
console.log(`  largest asset      ${kb(largest.bytes).padStart(9)}  ${largest.name}`);
// The largest asset is reported because it is the one whose arrival gates the
// canvas, but it is a poor progress metric on its own: once the scene chunk fell
// below the vendor bundle, this line stopped responding to scene changes
// entirely, and two commits were nearly justified on its silence.
