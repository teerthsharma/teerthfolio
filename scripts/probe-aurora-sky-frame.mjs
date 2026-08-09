/* global document, requestAnimationFrame */
// Does the aurora reach the frame, at every station rather than at one?
//
// The curtain's worst defect was never a shader defect: the shell's band spanned
// -7..+31 degrees of elevation while the observatory camera shows a 3.7-degree
// strip of sky, so the part with the curtain in it sat above the top edge and
// what rendered was the skirt below the hem. It was invisible to every numeric
// assertion in check-aurora-field.mjs because a coordinate mapping that is never
// written down is a coordinate mapping nothing can check.
//
// That was fixed for ONE framing. This sweeps all eight, because each station
// authors its own vertical field of view and its own camera elevation, so each
// one shows a different amount of sky and puts the same band in a different
// place. Two things are measured per station:
//
//   FRAMING   solved from lib/polar-camera-composition.js, which is the code the
//             rig runs -- the camera sits at `elevationDegrees` above the look
//             target and looks straight at it, so the optical axis is pitched
//             down by exactly that and the top of frame is halfFov - elevation
//             degrees above the horizon. Cross-checked against the ablation:
//             the horizon predicted here is where the delta profile dies.
//
//   ABLATION  the same frame with and without ?no-aurora=1. A station where the
//             two are identical in the sky band HAS NO AURORA, whatever the code
//             says, and that is the only measurement that can prove otherwise.
//             Reduced motion is emulated so the field freezes to its pose and
//             the rig stops breathing; the residual between two aurora-ON frames
//             is captured as the noise floor the delta has to beat.
//
// Headless only, one browser per sweep, closed in a finally.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { AURORA_SHELL_ELEVATION, horizontalFov } from "../lib/aurora-field.js";
import { solvePolarCameraComposition } from "../lib/polar-camera-composition.js";
import { STATION_WORLD_SCHEMA } from "../lib/polar-station-world.js";

const BASE = process.env.PROBE_BASE || "http://localhost:3100";
const TIER = process.env.PROBE_TIER || "medium";
const OUT = process.argv[2] || "verification/aurora-sky-frame";
const VIEWPORT = { height: 900, width: 1440 };

const STATIONS = (process.env.PROBE_STATIONS || "").split(",").filter(Boolean).length
  ? process.env.PROBE_STATIONS.split(",")
  : STATION_WORLD_SCHEMA.order;

/**
 * Where the sky is, for one station, from the rig's own solver.
 *
 * Not an approximation of the camera: it IS the camera. IglooScene places the
 * lens at look + spherical(azimuth, elevation, distance) and calls lookAt(look),
 * so the axis is pitched down by `elevationDegrees` and the vertical half-angle
 * is half the solved fov. Everything else here is that one fact in pixels.
 */
export function stationSkyFraming(id, { height = 900, quality = TIER, width = 1440 } = {}) {
  const station = STATION_WORLD_SCHEMA.stations[id];
  if (!station) {
    throw new Error(`unknown station "${id}" — one of: ${STATION_WORLD_SCHEMA.order.join(", ")}`);
  }
  const solved = solvePolarCameraComposition({
    height,
    quality,
    sealPosition: station.dock,
    station,
    velocity: { x: 0, z: 0 },
    width,
  });
  const verticalFovDegrees = solved.camera.verticalFovDegrees;
  const elevationDegrees = solved.camera.elevationDegrees;
  const topDegrees = verticalFovDegrees / 2 - elevationDegrees;
  const pxPerDegree = height / verticalFovDegrees;
  const screenY = (degrees) => (topDegrees - degrees) * pxPerDegree;
  return {
    bandHighY: screenY(AURORA_SHELL_ELEVATION.high),
    bandLowY: screenY(AURORA_SHELL_ELEVATION.low),
    bottomDegrees: -verticalFovDegrees / 2 - elevationDegrees,
    distance: solved.camera.distance,
    elevationDegrees,
    horizonY: screenY(0),
    horizontalFovDegrees: horizontalFov({ aspect: width / height, verticalFovDegrees }),
    id,
    pxPerDegree,
    screenY,
    skyPx: Math.max(0, screenY(0)),
    topDegrees,
    verticalFovDegrees,
  };
}

/** Per-row mean absolute RGB difference, 0..1, over the full frame width. */
async function rowDelta(firstPath, secondPath) {
  const load = (file) => sharp(file).raw().toBuffer({ resolveWithObject: true });
  const [a, b] = await Promise.all([load(firstPath), load(secondPath)]);
  const { channels, height, width } = a.info;
  const rows = new Float64Array(height);
  for (let y = 0; y < height; y += 1) {
    let sum = 0;
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * channels;
      sum +=
        Math.abs(a.data[index] - b.data[index]) +
        Math.abs(a.data[index + 1] - b.data[index + 1]) +
        Math.abs(a.data[index + 2] - b.data[index + 2]);
    }
    rows[y] = sum / (width * 3 * 255);
  }
  return rows;
}

/**
 * The four numbers that decide whether the curtain reads as PHOTOGRAPHED light.
 *
 * "Is it in the frame" is what rowDelta answers, and it is not the same
 * question. A curtain can be present, correct and still read as an airbrushed
 * smudge, which is what a benchmark judge measured against studio marketing
 * frames. What separates a photograph of an aurora from a gradient layer is:
 *
 *   coreLuma vs skyLuma   a core that stands off the sky it hangs in. Measured
 *                         as the 99.5th percentile luma inside the band against
 *                         the MEDIAN luma of the same pixels with the curtain
 *                         ablated -- the sky underneath, not the frame average.
 *   hemGradient           luma per px across the LOWER boundary, per COLUMN and
 *                         then median -- a Chapman hem is scalloped, so a row
 *                         mean measures the edge's vertical wander instead of
 *                         the edge. A Gaussian smudge has no edge to measure.
 *   filamentPx            the finest structure that survives a high pass along
 *                         the arc. Zero-crossing spacing of the band-limited
 *                         luma delta, gated on amplitude so the frame's own
 *                         noise cannot manufacture crossings.
 *
 * All of it on the ablation pair, so nothing here can be satisfied by the sky
 * gradient, the terrain or the post grade.
 */
async function skyExposure(onPath, offPath, framing, peakY) {
  const load = (file) => sharp(file).raw().toBuffer({ resolveWithObject: true });
  const [on, off] = await Promise.all([load(onPath), load(offPath)]);
  const { channels, width } = on.info;
  const luma = (buffer, index) =>
    0.2126 * buffer[index] + 0.7152 * buffer[index + 1] + 0.0722 * buffer[index + 2];

  const top = Math.max(0, Math.floor(framing.bandHighY));
  const bottom = Math.min(on.info.height, Math.ceil(framing.horizonY));
  // MASKED TO THE PIXELS THE CURTAIN ACTUALLY LIGHTS. The band rectangle also
  // contains mast, ridge and building, and the brightest thing in it was a lit
  // panel at 234 luma on a frame whose curtain peaked near 120 -- a "core"
  // reading that moves when someone else repaints the hut and does not move
  // when the exposure model changes. The mask is the ablation itself: a pixel
  // belongs to the curtain when removing the curtain changes it.
  const lit = [];
  for (let y = top; y < bottom; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * channels;
      const a = luma(on.data, index);
      const b = luma(off.data, index);
      if (a - b > 1) lit.push([a, b]);
    }
  }
  if (lit.length === 0) return { coreLuma: 0, filamentPx: 0, hemGradient: 0, litPx: 0, skyLuma: 0 };
  // PAIRED, and that is the whole point of the number. "Core luma against the
  // sky it hangs in" is a comparison at the SAME pixels: the sky dome carries a
  // bright horizon glow, so an unpaired percentile over the band reports that
  // glow as the curtain's core and moves when the sky is regraded. Rank by the
  // curtain's own contribution, take the brightest half percent of it, and read
  // both frames there.
  const core = lit.sort((p, q) => q[0] - q[1] - (p[0] - p[1])).slice(0, Math.max(1, Math.round(lit.length * 0.005)));
  const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const coreLuma = mean(core.map(([a]) => a));
  const skyLuma = mean(core.map(([, b]) => b));

  // THE HEM, PER COLUMN, and that distinction is the whole measurement.
  //
  // A Chapman hem is scalloped by construction -- the shader drops the stopping
  // altitude where the precipitation is hard, which is what stops the lower
  // edge being a ruled line -- so a row mean across 1440px averages an edge
  // that is sharp everywhere against its own vertical wander and reports a
  // smooth ramp. It did: the row-mean number did not move at all across a
  // change that visibly sharpened the edge. Steepest fall in each column
  // between that column's own peak and the horizon, median across columns.
  const columnGradients = [];
  for (let x = 0; x < width; x += 1) {
    let columnPeak = top;
    let best = -Infinity;
    for (let y = top; y < bottom; y += 1) {
      const index = (y * width + x) * channels;
      const value = luma(on.data, index) - luma(off.data, index);
      if (value > best) {
        best = value;
        columnPeak = y;
      }
    }
    // A column with no curtain in it has no hem, and averaging its noise in
    // would report the sky's own gradient as an edge.
    if (best < 4) continue;
    let steepest = 0;
    for (let y = columnPeak; y < bottom - 1; y += 1) {
      const a = (y * width + x) * channels;
      const b = ((y + 1) * width + x) * channels;
      steepest = Math.max(
        steepest,
        luma(on.data, a) - luma(off.data, a) - (luma(on.data, b) - luma(off.data, b)),
      );
    }
    columnGradients.push(steepest);
  }
  columnGradients.sort((a, b) => a - b);
  const hemGradient = columnGradients.length
    ? columnGradients[columnGradients.length >> 1]
    : 0;

  // Filaments: the delta along one strip of rows through the core, high-passed
  // over 33px so the envelope and the sky gradient drop out, then counted by
  // zero crossings whose excursion clears the frame's quantisation.
  const strip = new Float64Array(width);
  const rows = [];
  for (let y = Math.max(top, Math.floor(peakY) - 4); y <= Math.min(bottom - 1, Math.floor(peakY) + 4); y += 1) {
    rows.push(y);
  }
  for (const y of rows) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * channels;
      strip[x] += (luma(on.data, index) - luma(off.data, index)) / rows.length;
    }
  }
  const half = 16;
  const highPass = new Float64Array(width);
  for (let x = 0; x < width; x += 1) {
    let sum = 0;
    let count = 0;
    for (let k = -half; k <= half; k += 1) {
      const j = x + k;
      if (j < 0 || j >= width) continue;
      sum += strip[j];
      count += 1;
    }
    highPass[x] = strip[x] - sum / count;
  }
  let crossings = 0;
  let previousSign = 0;
  let excursion = 0;
  for (let x = 0; x < width; x += 1) {
    const sign = Math.sign(highPass[x]);
    if (sign === 0) continue;
    if (sign === previousSign || previousSign === 0) {
      excursion = Math.max(excursion, Math.abs(highPass[x]));
      previousSign = sign;
      continue;
    }
    // Gate at half a code value: below that the "filament" is dithering.
    if (excursion > 0.5) crossings += 1;
    excursion = Math.abs(highPass[x]);
    previousSign = sign;
  }
  const filamentPx = crossings > 1 ? (2 * width) / crossings : 0;
  return {
    coreLuma: Number(coreLuma.toFixed(1)),
    filamentPx: Number(filamentPx.toFixed(1)),
    hemGradient: Number(hemGradient.toFixed(3)),
    litPx: lit.length,
    skyLuma: Number(skyLuma.toFixed(1)),
  };
}

/**
 * The snow anchor, on this probe's own captures.
 *
 * scripts/check-polar-color-continuity.mjs requires at least 35% of the frame
 * to be low-saturation and high-luma -- the snow that keeps this world reading
 * as Antarctic rather than as a light show. A brighter, more saturated sky band
 * eats exactly those pixels, so an aurora exposure change has to report its
 * margin, and reporting it here rather than only through the contract's own
 * eight-station capture means the ABLATION is available: aurora-on against
 * aurora-off says how much of the margin the curtain itself is spending.
 *
 * Same definition and same 160x100 resize as the contract, so the numbers are
 * comparable rather than merely similar.
 */
async function snowAnchorRatio(file) {
  const { data, info } = await sharp(file)
    .resize(160, 100, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let anchors = 0;
  for (let index = 0; index < data.length; index += 3) {
    const maximum = Math.max(data[index], data[index + 1], data[index + 2]);
    const minimum = Math.min(data[index], data[index + 1], data[index + 2]);
    const saturation = maximum > 0 ? (maximum - minimum) / maximum : 0;
    const luminance = data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722;
    if (saturation <= 0.28 && luminance >= 100) anchors += 1;
  }
  return anchors / (info.width * info.height);
}

const summarise = (rows, from, to) => {
  let sum = 0;
  let peak = 0;
  let peakY = from;
  const lo = Math.max(0, Math.floor(from));
  const hi = Math.min(rows.length, Math.ceil(to));
  for (let y = lo; y < hi; y += 1) {
    sum += rows[y];
    if (rows[y] > peak) {
      peak = rows[y];
      peakY = y;
    }
  }
  return { mean: sum / Math.max(1, hi - lo), peak, peakY };
};

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({
  args: ["--enable-gpu"],
  channel: "chrome",
  headless: true,
});
const rows = [];
try {
  for (const id of STATIONS) {
    const framing = stationSkyFraming(id);
    const context = await browser.newContext({
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
      viewport: VIEWPORT,
    });
    const page = await context.newPage();
    const shots = {};
    try {
      // PROBE_REUSE=1 re-reads an existing capture set instead of taking a new
      // one. This exists because the measurements below are themselves under
      // development: when an instrument is found to be wrong -- the hem
      // gradient was a row mean over a scalloped edge and could not see a
      // change that was plainly visible -- the fix has to be applied to the
      // BASELINE too, and re-capturing a baseline means reverting the code
      // under test. The pixels are the evidence; re-reading them is not.
      const reuse = process.env.PROBE_REUSE === "1";
      for (const variant of ["on", "on-repeat", "off"]) {
        if (reuse) {
          shots[variant] = path.join(OUT, `${id}-${variant}.png`);
          continue;
        }
        const ablation = variant === "off" ? "&no-aurora=1" : "";
        await page.goto(`${BASE}/?qa-artifact=${id}&qa-sdf=1${ablation}`, {
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
        // A cold browser lands on the splash gate rather than in the world, and
        // a first load has a GPU process and a shader set to build. Click through
        // and give it room: a 60s wait failed only ever on the FIRST context of a
        // run, which reads as a broken station and is a cold start.
        await page
          .locator("button", { hasText: /enter the world|start/i })
          .first()
          .click({ timeout: 5000 })
          .catch(() => {});
        await page.waitForSelector('#world[data-render-enabled="true"]', { timeout: 120000 });
        // The tier button's visible text does not match its accessible name.
        await page
          .getByRole("button", { name: `Use ${TIER} graphics quality` })
          .click()
          .catch(() => {});
        await page.waitForTimeout(4500);
        // The framing above is the DOCKED solve, so a capture taken while the
        // rig is still flying in measures a camera this probe is not describing
        // -- and it does not announce itself: the shot looks like a plausible
        // frame and every number derived from it is quietly about a different
        // pose. IglooScene publishes the live chase distance on the canvas, so
        // wait for it to reach the solved one instead of trusting a timeout.
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
            throw new Error(`${id}/${variant} never settled onto the docked pose`);
          });
        shots[variant] = path.join(OUT, `${id}-${variant}.png`);
        await page.screenshot({ path: shots[variant] });
      }
      // At full-frame scale the curtain is too small to judge, so the sky strip
      // is written out on its own at 2x. This is the artefact a human looks at.
      const cropHeight = Math.max(60, Math.ceil(framing.horizonY) + 40);
      await sharp(shots.on)
        .extract({ height: Math.min(cropHeight, VIEWPORT.height), left: 0, top: 0, width: VIEWPORT.width })
        .resize({ width: VIEWPORT.width * 2 })
        .toFile(path.join(OUT, `${id}-sky.png`));

      const signal = await rowDelta(shots.on, shots.off);
      const noise = await rowDelta(shots.on, shots["on-repeat"]);
      const sky = summarise(signal, 0, framing.horizonY);
      const skyNoise = summarise(noise, 0, framing.horizonY);
      const band = summarise(signal, framing.bandHighY, framing.horizonY);
      const exposure = await skyExposure(shots.on, shots.off, framing, sky.peakY);
      const [anchorOn, anchorOff] = await Promise.all([
        snowAnchorRatio(shots.on),
        snowAnchorRatio(shots.off),
      ]);
      rows.push({
        ...exposure,
        anchorOff: Number((anchorOff * 100).toFixed(1)),
        anchorOn: Number((anchorOn * 100).toFixed(1)),
        bandHighY: Math.round(framing.bandHighY),
        bandMean: Number(band.mean.toFixed(5)),
        elevationDegrees: framing.elevationDegrees,
        horizonY: Math.round(framing.horizonY),
        id,
        fovH: Number(framing.horizontalFovDegrees.toFixed(1)),
        fovV: framing.verticalFovDegrees,
        noiseMean: Number(skyNoise.mean.toFixed(5)),
        peakY: sky.peakY,
        skyMean: Number(sky.mean.toFixed(5)),
        skyPeak: Number(sky.peak.toFixed(5)),
        skyPx: Math.round(framing.skyPx),
        snr: Number((sky.mean / Math.max(skyNoise.mean, 1e-6)).toFixed(1)),
        topDegrees: Number(framing.topDegrees.toFixed(2)),
      });
      const last = rows[rows.length - 1];
      console.log(
        `${id.padEnd(24)} fov ${last.fovV}v/${last.fovH}h  top ${last.topDegrees}deg  sky ${last.skyPx}px  ` +
          `delta ${last.skyMean.toFixed(5)} (peak ${last.skyPeak.toFixed(5)} @y=${last.peakY})  ` +
          `noise ${last.noiseMean.toFixed(5)}  snr ${last.snr}\n` +
          `${"".padEnd(24)} core ${last.coreLuma} vs sky ${last.skyLuma}  ` +
          `hem ${last.hemGradient}/px  filament ${last.filamentPx}px  ` +
          `anchor ${last.anchorOn}% (off ${last.anchorOff}%, floor 35%)`,
      );
      await writeFile(
        path.join(OUT, `${id}-profile.csv`),
        `y,signal,noise\n${Array.from(signal, (value, y) => `${y},${value.toFixed(6)},${noise[y].toFixed(6)}`).join("\n")}\n`,
      );
    } catch (error) {
      console.log(`${id.padEnd(24)} SKIPPED  ${String(error.message).split("\n")[0]}`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

await writeFile(path.join(OUT, "summary.json"), `${JSON.stringify(rows, null, 2)}\n`);
console.table(rows);

/**
 * And what the band costs, per tier.
 *
 * Same ablation lever, no reduced motion (a frozen loop has no frame time), and
 * vsync off: with vsync on the presented interval quantises to the refresh
 * period, so a subsystem can be removed entirely and the number does not move
 * until the total crosses a boundary. That turns a cost into a step function.
 * Median of 180 presented intervals, which is the machine's own resolution --
 * anything under about 0.1ms here is below it and should be read as free.
 */
if (process.env.PROBE_FRAME !== "0") {
  const station = process.env.PROBE_FRAME_STATION || "observatory-plaque";
  const timed = await chromium.launch({
    args: ["--enable-gpu", "--disable-gpu-vsync", "--disable-frame-rate-limit"],
    channel: "chrome",
    headless: true,
  });
  const cost = [];
  try {
    for (const tier of ["low", "medium", "high"]) {
      const sample = {};
      for (const variant of ["on", "off"]) {
        const context = await timed.newContext({ deviceScaleFactor: 1, viewport: VIEWPORT });
        const page = await context.newPage();
        try {
          const ablation = variant === "off" ? "&no-aurora=1" : "";
          await page.goto(`${BASE}/?qa-artifact=${station}&qa-sdf=1${ablation}`, {
            timeout: 60000,
            waitUntil: "domcontentloaded",
          });
          // A cold browser lands on the splash gate rather than in the world, and
        // a first load has a GPU process and a shader set to build. Click through
        // and give it room: a 60s wait failed only ever on the FIRST context of a
        // run, which reads as a broken station and is a cold start.
        await page
          .locator("button", { hasText: /enter the world|start/i })
          .first()
          .click({ timeout: 5000 })
          .catch(() => {});
        await page.waitForSelector('#world[data-render-enabled="true"]', { timeout: 120000 });
          await page
            .getByRole("button", { name: `Use ${tier} graphics quality` })
            .click()
            .catch(() => {});
          // Past the shader warm pass, or its idle slices land in the sample.
          await page.waitForTimeout(9000);
          sample[variant] = await page.evaluate(
            () =>
              new Promise((resolve) => {
                const deltas = [];
                let previous = performance.now();
                const step = () => {
                  const now = performance.now();
                  deltas.push(now - previous);
                  previous = now;
                  if (deltas.length < 180) requestAnimationFrame(step);
                  else {
                    deltas.sort((a, b) => a - b);
                    resolve(deltas[Math.floor(deltas.length / 2)]);
                  }
                };
                requestAnimationFrame(step);
              }),
          );
        } finally {
          await context.close();
        }
      }
      cost.push({
        auroraOffMs: Number(sample.off.toFixed(2)),
        auroraOnMs: Number(sample.on.toFixed(2)),
        deltaMs: Number((sample.on - sample.off).toFixed(2)),
        station,
        tier,
      });
      const last = cost[cost.length - 1];
      console.log(
        `${tier.padEnd(7)} aurora on ${last.auroraOnMs}ms  off ${last.auroraOffMs}ms  delta ${last.deltaMs}ms`,
      );
    }
  } finally {
    await timed.close();
  }
  await writeFile(path.join(OUT, "frame-cost.json"), `${JSON.stringify(cost, null, 2)}\n`);
  console.table(cost);
}
