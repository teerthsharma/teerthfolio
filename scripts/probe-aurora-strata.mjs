/* global document */
// Is the curtain STRATIFIED in the frame, per channel, per elevation band?
//
// probe-aurora-sky-frame.mjs answers "is the curtain on screen at all" with a
// mean absolute delta over R+G+B. That number cannot see this defect: a curtain
// that is entirely one hue and a curtain with a violet hem under a green core
// under a red mantle produce the same scalar. Averaging the three channels
// together hides exactly the thing the four-line emission map exists to make.
//
// So this keeps them apart. For each station it takes the aurora-ON minus
// aurora-OFF ablation -- which is the curtain's own additive contribution and
// nothing else, since AdditiveBlending means the sky underneath cancels
// exactly -- and reports mean R, G and B separately for each band of elevation,
// against the station's own solved framing.
//
// A NULL CONTROL is captured every time and quoted beside every delta: two
// aurora-ON frames of the same build. Reduced motion is emulated so the field
// freezes to its pose, but the rig still breathes, and four confident
// conclusions in this file's history have been overturned by a delta that was
// inside its own noise floor.
//
// Headless real Chrome only, one browser per sweep, closed in a finally.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { AURORA_SHELL_ELEVATION } from "../lib/aurora-field.js";
import { stationSkyFraming } from "./probe-aurora-sky-frame.mjs";

const BASE = process.env.PROBE_BASE || "http://localhost:3100";
const OUT = process.argv[2] || "verification/aurora-strata";
const VIEWPORT = { height: 900, width: 1440 };
const SWEEP = (process.env.PROBE_SWEEP || "qpu-ice-bridge:medium,observatory-plaque:medium,qpu-ice-bridge:low")
  .split(",")
  .map((entry) => entry.split(":"));

/**
 * Per-row mean SIGNED per-channel difference. Signed, not absolute: the curtain
 * only ever adds light, so the sign carries information and |a-b| would report
 * the same number for "added 8 units of red" and "lost 8 units of red".
 */
async function rowChannels(onPath, offPath) {
  const load = (file) => sharp(file).raw().toBuffer({ resolveWithObject: true });
  const [a, b] = await Promise.all([load(onPath), load(offPath)]);
  const { channels, height, width } = a.info;
  const rows = [];
  for (let y = 0; y < height; y += 1) {
    const sum = [0, 0, 0];
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * channels;
      for (let c = 0; c < 3; c += 1) sum[c] += a.data[index + c] - b.data[index + c];
    }
    rows.push(sum.map((value) => value / width));
  }
  return rows;
}

/** Mean sky pixel over a row range, for the blend headroom the curtain adds into. */
async function skyLevel(file, fromY, toY) {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const sum = [0, 0, 0];
  let count = 0;
  for (let y = Math.max(0, Math.floor(fromY)); y < Math.min(info.height, Math.ceil(toY)); y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const index = (y * info.width + x) * info.channels;
      for (let c = 0; c < 3; c += 1) sum[c] += data[index + c];
      count += 1;
    }
  }
  return sum.map((value) => value / Math.max(count, 1));
}

async function settle(page, id, framing, tier, ablation) {
  await page.goto(`${BASE}/?qa-artifact=${id}&qa-sdf=1${ablation}`, {
    timeout: 60000,
    waitUntil: "domcontentloaded",
  });
  if (id === "topology-archive-wall") {
    const offer = page.getByRole("dialog", { name: /topology archive/i });
    await offer.waitFor({ state: "attached", timeout: 30000 }).catch(() => {});
    await offer.getByRole("button", { name: /Stay in (?:the polar )?world/i }).click().catch(() => {});
    await offer.waitFor({ state: "detached", timeout: 30000 }).catch(() => {});
  }
  await page.locator("button", { hasText: /enter the world|start/i }).first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForSelector('#world[data-render-enabled="true"]', { timeout: 120000 });
  // The tier button's visible text does not match its accessible name.
  await page.getByRole("button", { name: `Use ${tier} graphics quality` }).click().catch(() => {});
  await page.waitForTimeout(4500);
  await page
    .waitForFunction(
      ([station, distance]) => {
        const canvas = document.querySelector("#world canvas");
        return (
          canvas?.dataset.cameraStation === station &&
          Math.abs(Number(canvas.dataset.cameraDistance) - distance) < 0.4
        );
      },
      [id, framing.distance],
      { timeout: 20000 },
    )
    .catch(() => {
      throw new Error(`${id}/${tier} never settled onto the docked pose`);
    });
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: ["--enable-gpu"], channel: "chrome", headless: true });
const summary = [];
try {
  for (const [id, tier] of SWEEP) {
    const framing = stationSkyFraming(id, { quality: tier });
    const context = await browser.newContext({
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
      viewport: VIEWPORT,
    });
    const page = await context.newPage();
    const shots = {};
    try {
      for (const variant of ["on", "on-repeat", "off"]) {
        await settle(page, id, framing, tier, variant === "off" ? "&no-aurora=1" : "");
        shots[variant] = path.join(OUT, `${id}-${tier}-${variant}.png`);
        await page.screenshot({ path: shots[variant] });
      }
      // The artefact a human looks at: the sky strip alone, at 2x. At full-frame
      // scale the curtain is a few dozen rows and no one can judge its colour.
      const cropHeight = Math.min(VIEWPORT.height, Math.max(80, Math.ceil(framing.horizonY) + 30));
      await sharp(shots.on)
        .extract({ height: cropHeight, left: 0, top: 0, width: VIEWPORT.width })
        .resize({ width: VIEWPORT.width * 2 })
        .toFile(path.join(OUT, `${id}-${tier}-sky.png`));

      const signal = await rowChannels(shots.on, shots.off);
      const noise = await rowChannels(shots.on, shots["on-repeat"]);
      const sky = await skyLevel(shots.off, 0, framing.horizonY);

      // Bucket by ELEVATION, which is the axis the stratification lives on, and
      // which is a different number of pixels at every station.
      const bands = [];
      for (let deg = 0; deg < AURORA_SHELL_ELEVATION.high; deg += 0.5) {
        const yTop = framing.screenY(deg + 0.5);
        const yBottom = framing.screenY(deg);
        const lo = Math.max(0, Math.floor(yTop));
        const hi = Math.min(VIEWPORT.height, Math.ceil(yBottom));
        if (hi <= lo) continue;
        const acc = [0, 0, 0];
        const nAcc = [0, 0, 0];
        for (let y = lo; y < hi; y += 1) {
          for (let c = 0; c < 3; c += 1) {
            acc[c] += signal[y][c] / (hi - lo);
            nAcc[c] += Math.abs(noise[y][c]) / (hi - lo);
          }
        }
        const total = acc[0] + acc[1] + acc[2];
        bands.push({
          b: Number(acc[2].toFixed(2)),
          deg: Number(deg.toFixed(1)),
          fracB: total > 1 ? Number((acc[2] / total).toFixed(3)) : null,
          fracG: total > 1 ? Number((acc[1] / total).toFixed(3)) : null,
          fracR: total > 1 ? Number((acc[0] / total).toFixed(3)) : null,
          g: Number(acc[1].toFixed(2)),
          noise: Number(Math.max(...nAcc).toFixed(2)),
          r: Number(acc[0].toFixed(2)),
        });
      }
      const record = {
        bands,
        id,
        skyPx: Math.round(framing.skyPx),
        skyRgb: sky.map((v) => Number(v.toFixed(1))),
        tier,
        topDegrees: Number(framing.topDegrees.toFixed(2)),
      };
      summary.push(record);
      console.log(`\n=== ${id} / ${tier} — ${record.skyPx}px of sky, top ${record.topDegrees} deg`);
      console.log(`    sky under the curtain (aurora off): R${sky[0].toFixed(0)} G${sky[1].toFixed(0)} B${sky[2].toFixed(0)}`);
      console.log("    elev    dR     dG     dB   | noise |  r     g     b   (fraction of the curtain's own light)");
      for (const band of bands) {
        if (Math.abs(band.r) + Math.abs(band.g) + Math.abs(band.b) < 0.3) continue;
        console.log(
          `    ${String(band.deg).padStart(4)}  ${String(band.r).padStart(6)} ${String(band.g).padStart(6)} ` +
            `${String(band.b).padStart(6)} | ${String(band.noise).padStart(5)} | ` +
            `${band.fracR ?? "  -  "}  ${band.fracG ?? "  -  "}  ${band.fracB ?? "  -  "}`,
        );
      }
    } catch (error) {
      console.log(`${id}/${tier} SKIPPED  ${String(error.message).split("\n")[0]}`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
await writeFile(path.join(OUT, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
