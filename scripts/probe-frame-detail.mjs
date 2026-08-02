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
import { mkdir, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const BASE = process.env.PROBE_BASE || "http://localhost:3100";
const ROOT = "verification/frame-detail";
const TIERS = (process.env.PROBE_TIERS || "medium,low").split(",");
const FRAMES = Number(process.env.PROBE_FRAMES || 4);
const SPACING_MS = 1700;
// The world area, with the HUD panel on the right and the hint text on the left
// excluded: both are DOM, unaffected by anything in the render path, and they
// would dilute every measurement here toward zero.
const BOX = { x0: 280, x1: 1090, y0: 120, y1: 820 };
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
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 180000 });
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
  for (const tier of TIERS) {
    await page.locator("button", { hasText: new RegExp(`^${tier}$`, "i") }).first().click().catch(() => {});
    await page.waitForTimeout(5200);
    for (let k = 0; k < FRAMES; k += 1) {
      await page.bringToFront();
      await page.screenshot({ path: join(out, `${tier}-${k}.png`) });
      await page.waitForTimeout(SPACING_MS);
    }
    console.log(`${tag}: ${FRAMES} frames at tier ${tier}`);
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
  const listing = async (tag) => (await readdir(join(ROOT, tag))).filter((f) => f.endsWith(".png")).sort();
  const controlFiles = await listing(controlTag);
  const treatmentFiles = await listing(treatmentTag);
  if (controlFiles.length !== treatmentFiles.length || controlFiles.some((f, i) => f !== treatmentFiles[i])) {
    console.error("the two tags do not hold the same frames; a paired comparison needs matching tiers and counts");
    process.exit(1);
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
    console.log(`tier ${tier}  (${frames.length} matched pairs)`);
    console.log(`  gradient   control ${controlMean.toFixed(3)}   treatment ${treatmentMean.toFixed(3)}   ${mean >= 0 ? "+" : ""}${((mean / controlMean) * 100).toFixed(1)}%`);
    console.log(`  paired     delta ${mean >= 0 ? "+" : ""}${mean.toFixed(3)}  sd ${sd.toFixed(3)}  [${deltas.map((d) => (d >= 0 ? "+" : "") + d.toFixed(2)).join(" ")}]`);
    // Reported per pair, not just pooled. Index-matched frames come from two
    // browser sessions that started milliseconds apart, and the aurora and drift
    // pull them out of phase as the sequence runs — so the first pair is the
    // most trustworthy and a rising series is the pairing decaying, not the
    // filter ringing harder. A pooled figure alone hides exactly that: this
    // change measured 0.16% on pair 0 and 1.10% pooled over four.
    console.log(`  ringing    ${((over / edge) * 100).toFixed(2)}% pooled, per pair [${perPair.map((v) => v.toFixed(2)).join(" ")}] — trust the first`);
    console.log(`  clipping   highlights ${((clipHi / px) * 100).toFixed(3)}%   shadows ${((clipLo / px) * 100).toFixed(3)}%`);
    if (sd > Math.abs(mean)) {
      console.log(`  NOT RESOLVED: the pairwise spread exceeds the effect; more pairs, or the change does nothing`);
    }
    console.log("");
  }
} else {
  console.error("usage:\n  probe-frame-detail.mjs capture <tag>\n  probe-frame-detail.mjs compare <controlTag> <treatmentTag>");
  process.exit(1);
}
