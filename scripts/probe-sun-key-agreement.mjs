/* global document */
// Does the sky's sun and a station's key light disagree ON SCREEN?
//
// The bearings disagree on paper: the sky paints one fixed sun and each station
// authors its own key, and converted to a common convention six of the eight sit
// 51 to 167 degrees apart. That is a number, not a defect. A bearing can only be
// contradicted by a bearing the frame actually shows, so this measures the one
// thing the arithmetic cannot: how much of each station's frame the sun owns.
//
// The lever is an ABLATION, not a tuning pass. Build once with the sun's
// azimuthal identity intact and once with it forced dead (sunSide = 0.0 in
// polarSkyAnchor, which is the single gate on the honey seam, both dawn lobes
// and the disc), and diff the two frames. A station whose frame does not move
// when the sun is deleted is a station with no sun in it, and its key bearing
// has nothing to contradict -- whatever the arithmetic says.
//
// Every run also captures the same build twice as a NULL CONTROL. The sky
// breathes on a 95s sine and the snow carries a dither, so a frame differenced
// against itself is not zero, and any delta at or under that spread is nothing.
//
// Usage: node scripts/probe-sun-key-agreement.mjs <outDir>
// Headless real Chrome only, one browser per sweep, closed in a finally.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { solvePolarCameraComposition } from "../lib/polar-camera-composition.js";
import { STATION_WORLD_SCHEMA } from "../lib/polar-station-world.js";

const BASE = process.env.PROBE_BASE || "http://localhost:3100";
const TIER = process.env.PROBE_TIER || "medium";
const OUT = process.argv[2] || "verification/sun-key-agreement";
const VIEWPORT = { height: 900, width: 1440 };
const STATIONS = process.env.PROBE_STATIONS
  ? process.env.PROBE_STATIONS.split(",")
  : STATION_WORLD_SCHEMA.order;

/** Where the horizon lands, from the rig's own solver. Same math as probe-aurora-sky-frame. */
function framing(id) {
  const station = STATION_WORLD_SCHEMA.stations[id];
  const solved = solvePolarCameraComposition({
    height: VIEWPORT.height,
    quality: TIER,
    sealPosition: station.dock,
    station,
    velocity: { x: 0, z: 0 },
    width: VIEWPORT.width,
  });
  const { distance, elevationDegrees, verticalFovDegrees } = solved.camera;
  const topDegrees = verticalFovDegrees / 2 - elevationDegrees;
  const pxPerDegree = VIEWPORT.height / verticalFovDegrees;
  return {
    distance,
    horizonY: Math.max(0, Math.round(topDegrees * pxPerDegree)),
    id,
  };
}

async function capture(page, id, { distance }) {
  await page.goto(`${BASE}/?qa-artifact=${id}&qa-sdf=1`, {
    timeout: 60000,
    waitUntil: "domcontentloaded",
  });
  if (id === "topology-archive-wall") {
    const offer = page.getByRole("dialog", { name: /topology archive/i });
    await offer.waitFor({ state: "attached", timeout: 30000 }).catch(() => {});
    await offer
      .getByRole("button", { name: /Stay in (?:the polar )?world/i })
      .click()
      .catch(() => {});
    await offer.waitFor({ state: "detached", timeout: 30000 }).catch(() => {});
  }
  await page
    .locator("button", { hasText: /enter the world|start/i })
    .first()
    .click({ timeout: 5000 })
    .catch(() => {});
  await page.waitForSelector('#world[data-render-enabled="true"]', { timeout: 120000 });
  // The tier button's visible text does not match its accessible name.
  await page.getByRole("button", { name: `Use ${TIER} graphics quality` }).click().catch(() => {});
  await page.waitForTimeout(4500);
  await page
    .waitForFunction(
      ([station, target]) => {
        const canvas = document.querySelector("#world canvas");
        return (
          canvas?.dataset.cameraStation === station &&
          Math.abs(Number(canvas.dataset.cameraDistance) - target) < 0.4
        );
      },
      [id, distance],
      { timeout: 20000 },
    )
    .catch(() => {
      throw new Error(`${id} never settled onto the docked pose`);
    });
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({
  args: ["--enable-gpu"],
  channel: "chrome",
  headless: true,
});
const rows = [];
try {
  for (const id of STATIONS) {
    const frame = framing(id);
    const context = await browser.newContext({
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
      viewport: VIEWPORT,
    });
    const page = await context.newPage();
    try {
      await capture(page, id, frame);
      const shot = path.join(OUT, `${id}.png`);
      await page.screenshot({ path: shot });
      // Second capture of the SAME build, same context, so the null control
      // carries the dither and whatever the frozen clock still moves.
      const repeat = path.join(OUT, `${id}-repeat.png`);
      await page.screenshot({ path: repeat });
      const stats = await sharp(shot).stats();
      rows.push({
        horizonY: frame.horizonY,
        id,
        meanLuma: Number(
          (
            0.2126 * stats.channels[0].mean +
            0.7152 * stats.channels[1].mean +
            0.0722 * stats.channels[2].mean
          ).toFixed(2),
        ),
      });
      console.log(`${id.padEnd(24)} captured  horizonY ${frame.horizonY}  luma ${rows.at(-1).meanLuma}`);
    } catch (error) {
      console.log(`${id.padEnd(24)} SKIPPED  ${String(error.message).split("\n")[0]}`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
await writeFile(path.join(OUT, "framing.json"), `${JSON.stringify(rows, null, 2)}\n`);
