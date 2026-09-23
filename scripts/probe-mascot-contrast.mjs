/* global document */
// How well does the mascot read against the snow it stands on?
//
// The bruno and junni quality gates both come down to this: a still frame has to
// say "a character in a world", and a character that measures darker than the
// ground it is on does not. This reports the luminance of the mascot's body and
// of the snow beside it, and the contrast between them, per quality tier.
//
// It drives until the traveller crosses a fixed line rather than for a fixed
// number of steps. Earlier passes drove seven times and stopped wherever
// momentum left them, which put every tier on different ground: readings moved
// 5-10 luma between runs that should have been identical by construction, and
// that noise was larger than most of the effects being chased. The world
// publishes its traversal pose on #world, so the drive closes a loop on it and
// the run reports how far apart the stopping points ended up.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const BASE = process.env.PROBE_BASE || "http://localhost:3100";
const OUT = process.argv[2] || "verification/mascot-contrast";
const TARGET_X = Number(process.env.PROBE_TARGET_X || 6);
// Drive until x first crosses the line, then stop. A two-axis target is not
// reachable with forward/back alone — W drives along the camera's heading, not a
// world axis, so z wanders and a distance-to-point loop never converges; the
// first version of this probe flagged all six of its own runs unusable for
// exactly that. What matters is not which ground is sampled but that every tier
// samples the SAME ground, so the runs are judged against each other.
const POSE_AGREEMENT = 0.7;
await mkdir(OUT, { recursive: true });

// The chase camera holds the mascot at a stable place in frame, so these boxes
// are fixed once the world position is.
const MASCOT_BOX = { x0: 660, x1: 820, y0: 440, y1: 520 };
const SNOW_BOX = { x0: 300, x1: 600, y0: 620, y1: 700 };

const browser = await chromium.launch({
  channel: "chrome",
  headless: false,
  args: ["--enable-gpu", "--window-position=0,0"],
});

const readPose = (page) =>
  page.evaluate(() => {
    const world = document.querySelector("#world");
    return { x: Number(world?.dataset.worldX), z: Number(world?.dataset.worldZ) };
  });

const results = [];
for (const tier of ["high", "medium", "low"]) {
  for (const graded of [true, false]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(graded ? BASE : `${BASE}/?qa-no-post=1`, {
      waitUntil: "domcontentloaded",
      timeout: 180000,
    });
    await page.waitForTimeout(1800);
    await page.locator("button", { hasText: /enter the world|start/i }).first().click().catch(() => {});
    await page
      .waitForFunction(() => document.querySelector("#world")?.dataset.rendererMode === "webgl", {
        timeout: 150000,
      })
      .catch(() => {});
    await page.bringToFront();
    await page.waitForTimeout(3000);
    await page.locator("button", { hasText: new RegExp(`^${tier}$`, "i") }).first().click().catch(() => {});
    await page.waitForTimeout(5000);
    // Clicking a tier moves focus to that button; the world only takes keys once
    // focus is back on it.
    await page.mouse.click(500, 700);
    await page.waitForTimeout(500);

    let pose = await readPose(page);
    let steps = 0;
    while (steps < 60 && pose.x < TARGET_X) {
      // Short pulses near the line so the crossing is caught close to it rather
      // than wherever a long hold happened to end.
      await page.keyboard.down("w");
      await page.waitForTimeout(pose.x > TARGET_X - 2 ? 110 : 550);
      await page.keyboard.up("w");
      await page.waitForTimeout(260);
      pose = await readPose(page);
      steps += 1;
    }
    await page.waitForTimeout(1600);
    const finalPose = await readPose(page);

    const file = path.join(OUT, `${tier}-${graded ? "graded" : "raw"}.png`);
    await page.screenshot({ path: file });
    const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const mean = (box) => {
      let sum = 0;
      let count = 0;
      for (let y = box.y0; y < box.y1; y += 1) {
        for (let x = box.x0; x < box.x1; x += 1) {
          const i = (y * info.width + x) * info.channels;
          sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
          count += 1;
        }
      }
      return sum / count;
    };
    const mascot = mean(MASCOT_BOX);
    const snow = mean(SNOW_BOX);
    const row = {
      tier,
      pass: graded ? "graded" : "raw",
      poseX: Math.round(finalPose.x * 100) / 100,
      poseZ: Math.round(finalPose.z * 100) / 100,
      mascot: Math.round(mascot * 10) / 10,
      snow: Math.round(snow * 10) / 10,
      contrast: Math.round((snow - mascot) * 10) / 10,
    };
    results.push(row);
    console.log(
      `${(tier + "/" + row.pass).padEnd(14)} pose ${String(row.poseX).padStart(6)},${String(row.poseZ).padStart(5)}` +
        `  mascot ${String(row.mascot).padStart(6)}  snow ${String(row.snow).padStart(6)}  ` +
        `contrast ${String(row.contrast).padStart(6)}`,
    );
    await context.close();
  }
}

const spreadX = Math.max(...results.map((r) => r.poseX)) - Math.min(...results.map((r) => r.poseX));
const spreadZ = Math.max(...results.map((r) => r.poseZ)) - Math.min(...results.map((r) => r.poseZ));
const comparable = Math.max(spreadX, spreadZ) <= POSE_AGREEMENT;
console.log(
  `
pose spread across runs: x ${spreadX.toFixed(2)}, z ${spreadZ.toFixed(2)}` +
    (comparable
      ? " - runs sampled the same ground and are comparable"
      : ` - OVER ${POSE_AGREEMENT}, these rows sample different ground and mean nothing`),
);

await writeFile(path.join(OUT, "contrast.json"), JSON.stringify(results, null, 2));
await browser.close();
