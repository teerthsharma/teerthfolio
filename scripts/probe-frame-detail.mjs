/* global document */
// Did a visual change add detail, or add artefacts?
//
// Written after the same mistake was made twice on this branch. A camera-space
// filter was measured by capturing one frame with it on and one with it off, and
// reported as a 13% gain; measured paired, it was 3.2%. The world animates —
// aurora, drift, particles, the mascot — and mean gradient magnitude moves with
// it, so two captures of the SAME build read 5.30 and 5.89. The confound is
// larger than anything a camera-space filter does, and it is shared by both
// arms, which means it cancels under subtraction and never cancels under
// averaging. Four matched pairs give the effect to a standard deviation of
// 0.023; four unmatched captures per arm do not resolve it at all.
//
// So this probe does two things and refuses to do them out of order:
//
//   capture   node scripts/probe-frame-detail.mjs capture <tag>
//   compare   node scripts/probe-frame-detail.mjs compare <tagA> <tagB>
//
// Capture the control, change one thing, rebuild, capture the treatment, then
// compare. Frame k of one tag is only ever compared against frame k of the
// other, because they are the ones taken at the same point in the animation.
//
// Gradient alone cannot tell recovered detail from ringing — both raise it — so
// overshoot and clipping are reported beside it, never instead of it.
//
// Which of the three survives the animation, and which does not:
//
//   gradient delta   ROBUST. A global statistic differenced within a pair, so
//                    the phase cancels. sd across four pairs was 0.015 on a
//                    +0.229 effect.
//   clipping         ROBUST. Measured on the treatment frame alone, so there is
//                    no pairing to break.
//   overshoot        WEAK, and it is left in because a large reading is still
//                    worth seeing. It compares individual pixels across two
//                    browser sessions that cannot be phase-locked, so a moving
//                    aurora registers as ringing. The per-pair series is printed
//                    for exactly this reason: 0.94, 0.48, 0.77, 2.27 for one
//                    change is the pairing decaying across the sequence, not the
//                    filter getting worse. Read it as an upper bound. To measure
//                    ringing properly, stop the world.
import { chromium } from "playwright";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const BASE = process.env.PROBE_BASE || "http://localhost:3100";
// qa-freeze pins the world's clock, which is what makes per-pixel comparison
// across two sessions valid at all. Set PROBE_LIVE=1 to measure the moving world
// instead, and read the overshoot column as an upper bound when you do.
const FREEZE = process.env.PROBE_LIVE ? "" : "?qa-freeze=1";
const ROOT = "verification/frame-detail";
const TIERS = (process.env.PROBE_TIERS || "medium,low").split(",");
const FRAMES = Number(process.env.PROBE_FRAMES || 4);
// Settle after a tier switch, not merely after the click. At 5200ms a null
// control was exact at three tiers out of four and showed one pair adrift at
// low, which reversing the capture order proved was the switch and not the tier:
// low captured first is exact, low captured after medium is not. The post chain
// re-allocates its target when `scale` changes and the first frames after that
// are not yet the steady state.
const TIER_SETTLE_MS = Number(process.env.PROBE_SETTLE_MS || 8000);
const SPACING_MS = 1700;
// Frames thrown away before the real ones. With clock and delta both pinned the
// scene converges to a fixed point and then repeats bit for bit — measured over
// eight captures, frames two through seven were byte-identical — but the first
// two still differ, by a mean of 0.14 and 1.04 grey levels. Discarding them is
// what turns "deterministic given the same frame index" into "actually static",
// and it is the difference between a null control that happens to cancel and one
// that is exact for the right reason.
const WARMUP_FRAMES = 2;
// The world area, with the HUD panel on the right and the hint text on the left
// excluded: both are DOM, unaffected by anything in the render path, and they
// would dilute every measurement here toward zero.
const BOX = { x0: 280, x1: 1090, y0: 120, y1: 820 };
// Optionally judge the change somewhere other than the opening shot. The home
// dock is where the traveller is parked, so most of the near dressing band sits
// behind the camera and ground-level changes read as almost nothing there — a
// dressing density test at the dock measured +0.2% for a change that covers the
// whole field. PROBE_STATION=CO_05 travels the way a visitor does, by selecting
// the station in the HUD, and captures on arrival.
const STATION = process.env.PROBE_STATION || "";
const ARRIVAL_RADIUS = 4;
const STATION_XZ = Object.freeze({
  CO_01: [-3, 1], CO_02: [3, 8], CO_03: [-14, -6], CO_04: [-10, -9],
  CO_05: [17, -13], CO_06: [14, 12], CO_07: [11, -8], CO_08: [-16, 2],
});
const OVERSHOOT_LEVELS = 8;
const EDGE_CONTRAST = 18;

const [mode, ...rest] = process.argv.slice(2);

const grey = async (file) => {
  const { data, info } = await sharp(file).removeAlpha().greyscale().raw().toBuffer({ resolveWithObject: true });
  return { d: data, w: info.width };
};

const meanGradient = ({ d, w }) => {
  let sum = 0;
  let n = 0;
  for (let y = BOX.y0; y < BOX.y1; y += 1) {
    for (let x = BOX.x0; x < BOX.x1; x += 1) {
      const i = y * w + x;
      sum += Math.hypot(d[i + 1] - d[i - 1], d[i + w] - d[i - w]);
      n += 1;
    }
  }
  return sum / n;
};

// Overshoot is measured against the CONTROL's own neighbourhood, so it counts
// pixels the change pushed outside the range its neighbours already spanned.
// That is ringing. Measured across unmatched frames it counts scene motion
// instead, which is how 0.03% was once reported as 1.32%.
const artefacts = (treatment, control) => {
  let over = 0;
  let edge = 0;
  let clipHi = 0;
  let clipLo = 0;
  let px = 0;
  for (let y = BOX.y0; y < BOX.y1; y += 1) {
    for (let x = BOX.x0; x < BOX.x1; x += 1) {
      const i = y * control.w + x;
      const lo = Math.min(control.d[i - 1], control.d[i + 1], control.d[i - control.w], control.d[i + control.w], control.d[i]);
      const hi = Math.max(control.d[i - 1], control.d[i + 1], control.d[i - control.w], control.d[i + control.w], control.d[i]);
      if (hi - lo > EDGE_CONTRAST) {
        edge += 1;
        if (treatment.d[i] > hi + OVERSHOOT_LEVELS || treatment.d[i] < lo - OVERSHOOT_LEVELS) over += 1;
      }
      if (treatment.d[i] >= 254) clipHi += 1;
      if (treatment.d[i] <= 1) clipLo += 1;
      px += 1;
    }
  }
  return { over, edge, clipHi, clipLo, px };
};

if (mode === "capture") {
  const tag = rest[0];
  if (!tag) {
    console.error("usage: probe-frame-detail.mjs capture <tag>");
    process.exit(1);
  }
  const out = join(ROOT, tag);
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  const browser = await chromium.launch({
    channel: "chrome",
    headless: false,
    args: ["--enable-gpu", "--window-position=0,0"],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE}${FREEZE}`, { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForTimeout(1800);
  await page.locator("button", { hasText: /enter the world|start/i }).first().click().catch(() => {});
  const reached = await page
    .waitForFunction(() => document.querySelector("#world")?.dataset.rendererMode === "webgl", { timeout: 150000 })
    .then(() => true)
    .catch(() => false);
  if (!reached) {
    console.error("the world never reported a webgl renderer; refusing to write captures");
    await browser.close();
    process.exit(1);
  }
  await page.bringToFront();
  if (STATION) {
    const target = STATION_XZ[STATION];
    if (!target) {
      console.error(`unknown station ${STATION}`);
      await browser.close();
      process.exit(1);
    }
    await page.locator("button", { hasText: new RegExp(STATION) }).first().click().catch(() => {});
    const pose = () =>
      page.evaluate(() => {
        const world = document.querySelector("#world");
        return { x: Number(world?.dataset.worldX), z: Number(world?.dataset.worldZ) };
      });
    let at = await pose();
    let waited = 0;
    while (waited < 26000 && Math.hypot(at.x - target[0], at.z - target[1]) > ARRIVAL_RADIUS) {
      await page.waitForTimeout(900);
      waited += 900;
      at = await pose();
    }
    const gap = Math.hypot(at.x - target[0], at.z - target[1]);
    if (gap > ARRIVAL_RADIUS + 1.5) {
      console.error(`never arrived at ${STATION} (${gap.toFixed(1)} away); refusing to capture`);
      await browser.close();
      process.exit(1);
    }
    // Record where it actually stopped. Auto-travel does not arrive at a
    // deterministic pose — two runs measured 3.6 and 2.4 units from centre — and
    // a paired per-pixel comparison across two camera positions is not a
    // comparison at all. The first station run made exactly that mistake and read
    // +5.1% for a change that measured +0.2% at the dock.
    await writeFile(join(out, "pose.json"), JSON.stringify({ station: STATION, x: at.x, z: at.z }));
    console.log(`${tag}: travelled to ${STATION}, stopped at ${at.x.toFixed(2)},${at.z.toFixed(2)}`);
  }
  for (const tier of TIERS) {
    await page.locator("button", { hasText: new RegExp(`^${tier}$`, "i") }).first().click().catch(() => {});
    await page.waitForTimeout(TIER_SETTLE_MS);
    for (let k = 0; k < WARMUP_FRAMES; k += 1) {
      await page.bringToFront();
      await page.screenshot({ path: join(out, "warmup.png") });
      await page.waitForTimeout(SPACING_MS);
    }
    for (let k = 0; k < FRAMES; k += 1) {
      await page.bringToFront();
      await page.screenshot({ path: join(out, `${tier}-${k}.png`) });
      await page.waitForTimeout(SPACING_MS);
    }
      console.log(`${tag}: ${FRAMES} frames at tier ${tier}${FREEZE ? " (clock frozen)" : " (live)"}`);
  }
  await browser.close();
  console.log(`\nnow change one thing, rebuild, capture the other tag, then:\n  node scripts/probe-frame-detail.mjs compare <control> ${tag}`);
} else if (mode === "compare") {
  const [controlTag, treatmentTag] = rest;
  if (!controlTag || !treatmentTag) {
    console.error("usage: probe-frame-detail.mjs compare <controlTag> <treatmentTag>");
    process.exit(1);
  }
  for (const tag of [controlTag, treatmentTag]) {
    if (!existsSync(join(ROOT, tag))) {
      console.error(`no captures for "${tag}": run capture first`);
      process.exit(1);
    }
  }
  const listing = async (tag) =>
    (await readdir(join(ROOT, tag))).filter((f) => f.endsWith(".png") && f !== "warmup.png").sort();
  const controlFiles = await listing(controlTag);
  const treatmentFiles = await listing(treatmentTag);
  if (controlFiles.length !== treatmentFiles.length || controlFiles.some((f, i) => f !== treatmentFiles[i])) {
    console.error("the two tags do not hold the same frames; a paired comparison needs matching tiers and counts");
    process.exit(1);
  }
  // If either arm travelled, both must have stopped in the same place.
  const poseOf = (tag) =>
    readFile(join(ROOT, tag, "pose.json"), "utf8").then(JSON.parse).catch(() => null);
  const [controlPose, treatmentPose] = await Promise.all([poseOf(controlTag), poseOf(treatmentTag)]);
  if (Boolean(controlPose) !== Boolean(treatmentPose)) {
    console.error("one arm travelled to a station and the other did not; these are not comparable");
    process.exit(1);
  }
  if (controlPose && treatmentPose) {
    const drift = Math.hypot(controlPose.x - treatmentPose.x, controlPose.z - treatmentPose.z);
    if (controlPose.station !== treatmentPose.station || drift > 0.35) {
      console.error(
        `the two arms stopped ${drift.toFixed(2)} units apart at ${controlPose.station}/${treatmentPose.station}; ` +
          "a per-pixel comparison needs the same camera pose, so this would measure the walk, not the change",
      );
      process.exit(1);
    }
    console.log(`both arms stopped within ${drift.toFixed(2)} units at ${controlPose.station}`);
  }
  console.log(`paired comparison: ${controlTag} (control) against ${treatmentTag}\n`);
  const tiers = [...new Set(controlFiles.map((f) => f.split("-")[0]))];
  for (const tier of tiers) {
    const frames = controlFiles.filter((f) => f.startsWith(`${tier}-`));
    const deltas = [];
    const perPair = [];
    let over = 0;
    let edge = 0;
    let clipHi = 0;
    let clipLo = 0;
    let px = 0;
    let controlMean = 0;
    let treatmentMean = 0;
    for (const file of frames) {
      const c = await grey(join(ROOT, controlTag, file));
      const t = await grey(join(ROOT, treatmentTag, file));
      const cg = meanGradient(c);
      const tg = meanGradient(t);
      controlMean += cg / frames.length;
      treatmentMean += tg / frames.length;
      deltas.push(tg - cg);
      const a = artefacts(t, c);
      perPair.push((a.over / a.edge) * 100);
      over += a.over;
      edge += a.edge;
      clipHi += a.clipHi;
      clipLo += a.clipLo;
      px += a.px;
    }
    const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    const sd = Math.sqrt(deltas.reduce((a, b) => a + (b - mean) ** 2, 0) / deltas.length);
    // Median and median absolute deviation, because roughly one capture in four
    // lands on a transient the freeze does not cover and a single such frame
    // moves the mean more than the effect being measured. With the clock stopped
    // the concordant pairs agree to the third decimal, so the median is the
    // estimate and the MAD is what decides whether it resolved; the mean and sd
    // are still printed because a large gap between them and the median is
    // itself the signal that a capture went wrong.
    const sorted = [...deltas].sort((a, b) => a - b);
    const median = sorted.length % 2
      ? sorted[(sorted.length - 1) / 2]
      : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
    const spread = [...deltas.map((d) => Math.abs(d - median))].sort((a, b) => a - b);
    const mad = spread.length % 2
      ? spread[(spread.length - 1) / 2]
      : (spread[spread.length / 2 - 1] + spread[spread.length / 2]) / 2;
    console.log(`tier ${tier}  (${frames.length} matched pairs)`);
    console.log(`  gradient   control ${controlMean.toFixed(3)}   treatment ${treatmentMean.toFixed(3)}   ${median >= 0 ? "+" : ""}${((median / controlMean) * 100).toFixed(1)}%`);
    console.log(`  paired     median ${median >= 0 ? "+" : ""}${median.toFixed(3)}  mad ${mad.toFixed(3)}   mean ${mean >= 0 ? "+" : ""}${mean.toFixed(3)}  sd ${sd.toFixed(3)}`);
    console.log(`             deltas [${deltas.map((d) => (d >= 0 ? "+" : "") + d.toFixed(2)).join(" ")}]`);
    // Reported per pair, not just pooled. Index-matched frames come from two
    // browser sessions that started milliseconds apart, and the aurora and drift
    // pull them out of phase as the sequence runs — so the first pair is the
    // most trustworthy and a rising series is the pairing decaying, not the
    // filter ringing harder. A pooled figure alone hides exactly that: this
    // change measured 0.16% on pair 0 and 1.10% pooled over four.
    console.log(`  ringing    ${((over / edge) * 100).toFixed(2)}% pooled, per pair [${perPair.map((v) => v.toFixed(2)).join(" ")}] — trust the first`);
    console.log(`  clipping   highlights ${((clipHi / px) * 100).toFixed(3)}%   shadows ${((clipLo / px) * 100).toFixed(3)}%`);
    if (mad > Math.abs(median)) {
      console.log(`  NOT RESOLVED: the pairwise spread exceeds the effect; more pairs, or the change does nothing`);
    }
    console.log("");
  }
} else {
  console.error("usage:\n  probe-frame-detail.mjs capture <tag>\n  probe-frame-detail.mjs compare <controlTag> <treatmentTag>");
  process.exit(1);
}
