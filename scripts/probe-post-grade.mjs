/* global document */
// What the post-process grade is actually doing to colour, measured rather than
// argued about.
//
// The three numbers that decide whether a grade reads as a stylised game look or
// as a filter are not the ones the existing gates collect. Those guard floors
// (mean luma >= 108, snow anchors >= 35%, no clipping); they say nothing about
// whether highlights and shadows disagree in HUE, which is the whole point of a
// split tone, and a grade can pass every floor while being perfectly neutral.
//
// So this reports, per station, at a pinned tier:
//   - mid-crop mean saturation / luma / (R-B), the middle 50% of the frame where
//     the docked camera puts the building rather than sky or HUD chrome
//   - the SPLIT-TONE SIGNATURE: mean (R-B) of the top-luma decile against the
//     bottom-luma decile, whole frame. Warm highlights and cool shadows means the
//     first is positive and the second negative, and the SPREAD between them is
//     the strength of the split. One number alone cannot tell a split tone from a
//     global colour cast, which is why both are printed.
//   - the snow-anchor ratio at the same definition check-polar-color-continuity
//     uses (sat <= 0.28, luma >= 100, on a 160x100 resize), so a run here
//     predicts that gate instead of waiting for it.
//
// Real Chrome, headless, one browser for the sweep, closed in a finally. The
// bundled chromium software-rasters this scene and its readings are not this
// world's colour.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const BASE = process.env.PROBE_BASE || "http://localhost:3100";
const OUT = process.argv[2] || "verification/post-grade";
const TIER = process.env.PROBE_TIER || "medium";
const STATIONS = (
  process.env.PROBE_STATIONS ||
  "observatory-plaque,s2-kernel-core,qpu-ice-bridge,assembly-tool-locker"
)
  .split(",")
  .filter(Boolean);

await mkdir(OUT, { recursive: true });

// 10-degree bins, the same width check-polar-color-continuity uses, so the two
// hue measurements in this project mean the same thing.
const HUE_BIN_COUNT = 36;

function hueDegrees(r, g, b) {
  const maximum = Math.max(r, g, b);
  const chroma = maximum - Math.min(r, g, b);
  if (chroma <= 0) return 0;
  let hue;
  if (maximum === r) hue = ((g - b) / chroma) % 6;
  else if (maximum === g) hue = (b - r) / chroma + 2;
  else hue = (r - g) / chroma + 4;
  return (hue * 60 + 360) % 360;
}

function measure(data, info) {
  const { width, height, channels } = info;
  const luma = (i) => 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  const sat = (i) => {
    const max = Math.max(data[i], data[i + 1], data[i + 2]);
    const min = Math.min(data[i], data[i + 1], data[i + 2]);
    return max > 0 ? (max - min) / max : 0;
  };

  // Mid crop: the middle half in both axes. The HUD lives at the edges and the
  // sky fills the top, so a whole-frame mean is mostly not the subject.
  let cropSat = 0;
  let cropLuma = 0;
  let cropRB = 0;
  let cropCount = 0;
  for (let y = Math.floor(height * 0.25); y < Math.floor(height * 0.75); y += 1) {
    for (let x = Math.floor(width * 0.25); x < Math.floor(width * 0.75); x += 1) {
      const i = (y * width + x) * channels;
      cropSat += sat(i);
      cropLuma += luma(i);
      cropRB += data[i] - data[i + 2];
      cropCount += 1;
    }
  }

  // Whole-frame luma deciles for the split-tone signature.
  const all = [];
  for (let i = 0; i < data.length; i += channels) all.push(luma(i));
  const sorted = Float64Array.from(all).sort();
  const shadowCut = sorted[Math.floor(sorted.length * 0.1)];
  const highlightCut = sorted[Math.floor(sorted.length * 0.9)];
  let shadowRB = 0;
  let shadowCount = 0;
  let highlightRB = 0;
  let highlightCount = 0;
  let frameLuma = 0;
  // Gap 2, at the benchmark's own thresholds: 12.5% and 87.5% of full scale.
  let darkTail = 0;
  let brightTail = 0;
  // Gap 3: a CHROMA-weighted hue histogram, so a near-neutral pixel cannot vote.
  // The share carried by the three heaviest bins is how monochromatic the picture
  // is — 80-85% was the measured "one hue per frame".
  const hueBins = new Float64Array(HUE_BIN_COUNT);
  let chromaTotal = 0;
  for (let i = 0; i < data.length; i += channels) {
    const l = luma(i);
    frameLuma += l;
    const rb = data[i] - data[i + 2];
    if (l <= shadowCut) {
      shadowRB += rb;
      shadowCount += 1;
    } else if (l >= highlightCut) {
      highlightRB += rb;
      highlightCount += 1;
    }
    if (l < 31.875) darkTail += 1;
    else if (l > 223.125) brightTail += 1;
    const chroma =
      Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]);
    if (chroma > 0) {
      chromaTotal += chroma;
      const bin = Math.min(
        HUE_BIN_COUNT - 1,
        Math.floor(hueDegrees(data[i], data[i + 1], data[i + 2]) / (360 / HUE_BIN_COUNT)),
      );
      hueBins[bin] += chroma;
    }
  }

  const ranked = Array.from(hueBins, (weight, bin) => ({ bin, weight })).sort(
    (left, right) => right.weight - left.weight,
  );
  const pixels = data.length / channels;
  return {
    cropSaturation: cropSat / cropCount,
    cropLuma: cropLuma / cropCount,
    cropRedMinusBlue: cropRB / cropCount,
    frameLuma: frameLuma / pixels,
    highlightRedMinusBlue: highlightRB / Math.max(1, highlightCount),
    shadowRedMinusBlue: shadowRB / Math.max(1, shadowCount),
    darkTailRatio: darkTail / pixels,
    brightTailRatio: brightTail / pixels,
    topHueBins: ranked.slice(0, 3).map((entry) => entry.bin * 10),
    topHueConcentration:
      ranked.slice(0, 3).reduce((total, entry) => total + entry.weight, 0) /
      Math.max(1, chromaTotal),
  };
}

// Same definition and same 160x100 resize check-polar-color-continuity uses, so
// the margin on the tightest gate is visible here instead of two commands later.
async function anchorRatio(file) {
  const { data, info } = await sharp(file)
    .resize(160, 100, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let anchors = 0;
  let saturationSum = 0;
  let clipped = 0;
  const count = info.width * info.height;
  for (let i = 0; i < data.length; i += 3) {
    const max = Math.max(data[i], data[i + 1], data[i + 2]);
    const min = Math.min(data[i], data[i + 1], data[i + 2]);
    const saturation = max > 0 ? (max - min) / max : 0;
    const luminance = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    saturationSum += saturation;
    if (saturation <= 0.28 && luminance >= 100) anchors += 1;
    if (luminance >= 248) clipped += 1;
  }
  return {
    anchorRatio: anchors / count,
    clippedRatio: clipped / count,
    frameSaturation: saturationSum / count,
  };
}

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  // --enable-gpu is not optional. Without it headless Chrome software-rasters the
  // scene, the world never flips data-render-enabled inside the wait, and the
  // colours that do arrive are not this world's.
  args: ["--enable-gpu", "--disable-dev-shm-usage", "--no-first-run", "--no-default-browser-check"],
});
const rows = [];
try {
  for (const id of STATIONS) {
    const context = await browser.newContext({
      deviceScaleFactor: 1,
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    const query = new URLSearchParams({ "qa-artifact": id, "qa-sdf": "1", qa: `post-grade-${id}` });
    await page.goto(`${BASE}/?${query}`, { waitUntil: "domcontentloaded", timeout: 120000 });
    // The dataset flag, not the CSS selector. `waitForSelector` also requires the
    // element to be VISIBLE, and #world reports no box of its own while the
    // canvas child fills the screen — so that wait is intermittent for a reason
    // that has nothing to do with whether the world rendered. Two sweeps timed
    // out here against a server that was serving a fully rendered scene.
    await page.waitForFunction(
      () => document.querySelector("#world")?.dataset.renderEnabled === "true",
      null,
      { timeout: 90000 },
    );
    await page.getByRole("button", { name: `Use ${TIER} graphics quality` }).click();
    await page.waitForFunction(
      ({ station, tier }) => {
        const canvas = document.querySelector("canvas.igloo-scene-canvas");
        const active = Array.from(document.querySelectorAll(".igloo-controls button")).find(
          (button) =>
            button.getAttribute("aria-pressed") === "true" &&
            button.textContent?.trim().toLowerCase() === tier.toLowerCase(),
        );
        return canvas?.dataset.biomePrimary === station && Boolean(active);
      },
      { station: id, tier: TIER },
      { timeout: 30000 },
    );
    await page.waitForTimeout(2200);
    await page.evaluate(() => {
      for (const selector of [
        ".igloo-hud",
        ".igloo-input-hint",
        ".igloo-diagnostics",
        ".open-world-loading-bridge",
        ".black-hole-transition",
      ]) {
        const element = document.querySelector(selector);
        if (element) element.style.display = "none";
      }
    });
    await page.waitForTimeout(150);
    const file = path.join(OUT, `${id}-${TIER}.png`);
    await page.screenshot({ path: file });
    const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    rows.push({ id, file, tier: TIER, ...measure(data, info), ...(await anchorRatio(file)) });
    await context.close();
  }
} finally {
  await browser.close();
}

await writeFile(path.join(OUT, "post-grade.json"), `${JSON.stringify(rows, null, 2)}\n`);

const f = (value, digits = 2) => value.toFixed(digits).padStart(digits + 5);
console.log(`post grade @ ${TIER}, 1440x900, real Chrome headless`);
console.log(
  "station                        crop-sat crop-luma crop-R-B  frame-luma  hi-R-B  sh-R-B   split  anchor%  clip%   sat",
);
for (const row of rows) {
  console.log(
    `${row.id.padEnd(30)}${f(row.cropSaturation, 3)} ${f(row.cropLuma, 1)} ${f(row.cropRedMinusBlue, 1)} ` +
      `${f(row.frameLuma, 1)} ${f(row.highlightRedMinusBlue, 1)} ${f(row.shadowRedMinusBlue, 1)} ` +
      `${f(row.highlightRedMinusBlue - row.shadowRedMinusBlue, 1)} ${f(row.anchorRatio * 100, 1)} ` +
      `${f(row.clippedRatio * 100, 2)} ${f(row.frameSaturation, 3)}`,
  );
}
console.log("\nvalue anchors and hue spread");
console.log(
  "station                        dark%  bright%  top3hue%  top bins (deg)   anchor margin",
);
for (const row of rows) {
  console.log(
    `${row.id.padEnd(30)}${f(row.darkTailRatio * 100, 2)} ${f(row.brightTailRatio * 100, 2)} ` +
      `${f(row.topHueConcentration * 100, 1)}   ${row.topHueBins.join("/").padEnd(16)} ` +
      `${f((row.anchorRatio - 0.35) * 100, 1)}pt`,
  );
}
console.log(
  "\nsplit = highlight (R-B) minus shadow (R-B). A split tone needs hi positive, sh negative;\n" +
    "a global cast moves both the same way and leaves the spread flat.\n" +
    "dark% is luma below 12.5%, bright% above 87.5%; top3hue% is the share of frame\n" +
    "chroma in the three heaviest 10-degree hue bins. anchor margin is against the\n" +
    "35% floor check-polar-color-continuity asserts.",
);
