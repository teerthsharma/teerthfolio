/* global requestAnimationFrame */
// Silhouette test for one station building, at all three tiers.
//
// The house 3D Object Gate asks whether the focal object is recognizable from
// its OUTLINE, before colour, label or HUD. Edge-energy probes cannot answer
// that: they measure how hard a surface turns, not what shape the turns add up
// to. So this renders the docked building and thresholds it to black-on-white,
// which is the only view in which "a stack of boxes" and "a braced tower" are
// visibly different things.
//
// The mask is a DIFFERENCE, not a threshold. Every luma cutoff tried here
// leaked: the sky carries a vertical gradient and an aurora band, so a cutoff
// that holds at the plinth swallows the sky above the crown, and the pale dish
// sits brighter than the cutoff and punches a hole in its own silhouette. So
// the frame is captured twice at a stopped clock (qa-freeze) — once with the
// station mechanisms mounted, once with qa-no-mechanisms — and a pixel is
// "object" exactly when the two differ. Nothing else in the frame moves, so
// the mask is the building and only the building.
//
// Headless only, one browser per sweep, closed in a finally.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const BASE = process.env.PROBE_BASE || "http://localhost:3100";
const STATION = process.env.PROBE_STATION || "upstream-radio-mast";
const OUT = process.argv[2] || "verification/station-silhouette";
const TIERS = (process.env.PROBE_TIERS || "low,medium,high").split(",");
const VIEWPORT = { height: 900, width: 1440 };
// Same frozen docked crop the relief probe uses, widened upward: a mast's
// identity lives in the part of it that is against sky, which the relief crop
// deliberately excluded.
// Frozen docked crop. PROBE_CROP overrides it as "left,top,width,height" so a
// before/after pair can be re-measured under ONE crop after the building's
// height changes — a crop that clipped the taller side would cap its aspect
// ratio and hide the very thing being measured.
const CROP = (() => {
  const [left, top, width, height] = (process.env.PROBE_CROP || "545,70,370,565")
    .split(",")
    .map(Number);
  return { height, left, top, width };
})();
// Re-derive the masks and tallies from captures already on disk instead of
// rendering. The "before" geometry no longer exists in the tree, so this is the
// only way its silhouette can be re-measured under a changed crop.
const RECOMPUTE = process.env.PROBE_RECOMPUTE === "1";
// Ground off so the building is read against sky the way an outline test needs,
// seal and drift dressing off so nothing overlaps it, clock stopped so the
// paired captures differ in the station alone. The light rig stays mounted
// (qa-no-ground, not qa-no-terrain) so the object is lit as the real frame
// lights it.
const ISOLATE = [
  "qa-freeze=1",
  "qa-no-ground=1",
  "qa-no-dressing=1",
  "qa-no-seal=1",
  "qa-no-smashables=1",
  "qa-no-signals=1",
].join("&");

function tallies(mask, width, height) {
  // SLENDERNESS is the number that decides this, and bounding-box aspect is
  // not. A mast has a wide base and a narrow tower, so its bounding box is as
  // wide as its footing spread and its aspect ratio understates it badly —
  // worse, once the object is taller than the crop is wide, box aspect just
  // saturates at the crop's own ratio and stops measuring the building at all.
  //
  //   slenderness = object height / MEDIAN row width
  //
  // The median row is a row through the tower, because most rows are; the base
  // and the crossarms are outvoted. A stack of boxes is one to two of its own
  // widths tall. A broadcast mast is six or more, and that is the whole claim.
  //
  //   openness = fraction of the bounding box NOT filled — a truss shows sky
  //              through itself; a solid does not.
  //   clipped  = the mask touches a crop edge, so the numbers understate it
  //              and the crop must be widened before they mean anything.
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;
  let filled = 0;
  let tallestColumn = 0;
  const rowWidths = [];
  for (let y = 0; y < height; y += 1) {
    let rowLeft = -1;
    let rowRight = -1;
    for (let x = 0; x < width; x += 1) {
      if (!mask[y * width + x]) continue;
      if (rowLeft < 0) rowLeft = x;
      rowRight = x;
      filled += 1;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    if (rowLeft >= 0) rowWidths.push(rowRight - rowLeft + 1);
  }
  for (let x = 0; x < width; x += 1) {
    let columnTop = -1;
    let columnBottom = -1;
    for (let y = 0; y < height; y += 1) {
      if (!mask[y * width + x]) continue;
      if (columnTop < 0) columnTop = y;
      columnBottom = y;
    }
    if (columnTop >= 0) tallestColumn = Math.max(tallestColumn, columnBottom - columnTop + 1);
  }
  if (maxX < 0) {
    return { aspect: 0, clipped: false, coverage: 0, openness: 0, slenderness: 0, verticality: 0 };
  }
  const boxWidth = maxX - minX + 1;
  const boxHeight = maxY - minY + 1;
  const sorted = [...rowWidths].sort((a, b) => a - b);
  const medianRowWidth = sorted[Math.floor(sorted.length / 2)];
  return {
    aspect: Math.round((boxHeight / boxWidth) * 1000) / 1000,
    clipped: minX === 0 || minY === 0 || maxX === width - 1 || maxY === height - 1,
    coverage: Math.round((filled / (width * height)) * 1000) / 1000,
    medianRowWidth,
    objectHeight: boxHeight,
    openness: Math.round((1 - filled / (boxWidth * boxHeight)) * 1000) / 1000,
    slenderness: Math.round((boxHeight / medianRowWidth) * 1000) / 1000,
    verticality: Math.round((tallestColumn / height) * 1000) / 1000,
  };
}

/**
 * Keep only the largest connected blob.
 *
 * qa-freeze stops the world clock, but it only reaches the surfaces that read
 * the clock as a property, and the aurora curtain and the drifting travel
 * debris do not — so the paired difference picks up an aurora comb across the
 * sky and a scatter of moving pebbles along with the building. Rather than
 * chase a flag for each of them (the next agent adds the next moving thing),
 * the mask keeps its one large four-connected component. The building is
 * connected to itself and to nothing else once the ground is off.
 */
function largestComponent(mask, width, height) {
  const label = new Int32Array(width * height).fill(-1);
  const stack = new Int32Array(width * height);
  let best = -1;
  let bestSize = 0;
  let next = 0;
  for (let seed = 0; seed < mask.length; seed += 1) {
    if (!mask[seed] || label[seed] >= 0) continue;
    const id = next;
    next += 1;
    let top = 0;
    let size = 0;
    stack[top] = seed;
    top += 1;
    label[seed] = id;
    while (top > 0) {
      top -= 1;
      const pixel = stack[top];
      size += 1;
      const x = pixel % width;
      const y = (pixel - x) / width;
      if (x > 0) {
        const n = pixel - 1;
        if (mask[n] && label[n] < 0) { label[n] = id; stack[top] = n; top += 1; }
      }
      if (x < width - 1) {
        const n = pixel + 1;
        if (mask[n] && label[n] < 0) { label[n] = id; stack[top] = n; top += 1; }
      }
      if (y > 0) {
        const n = pixel - width;
        if (mask[n] && label[n] < 0) { label[n] = id; stack[top] = n; top += 1; }
      }
      if (y < height - 1) {
        const n = pixel + width;
        if (mask[n] && label[n] < 0) { label[n] = id; stack[top] = n; top += 1; }
      }
    }
    if (size > bestSize) { bestSize = size; best = id; }
  }
  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    if (mask[pixel] && label[pixel] !== best) mask[pixel] = 0;
  }
  return mask;
}

async function cropRaw(pngPath) {
  return sharp(pngPath).extract(CROP).raw().toBuffer({ resolveWithObject: true });
}

/** Object pixels are exactly the pixels the mounted station changed. */
async function silhouette(withPath, withoutPath, outPath) {
  const [present, absent] = await Promise.all([cropRaw(withPath), cropRaw(withoutPath)]);
  const { channels, height, width } = present.info;
  const mask = new Uint8Array(width * height);
  for (let index = 0, pixel = 0; pixel < width * height; pixel += 1, index += channels) {
    const delta =
      Math.abs(present.data[index] - absent.data[index]) +
      Math.abs(present.data[index + 1] - absent.data[index + 1]) +
      Math.abs(present.data[index + 2] - absent.data[index + 2]);
    // 12/765 clears 8-bit dither and the shadow the station casts on nothing
    // (ground is off) without eating the pale dish rim.
    if (delta > 12) mask[pixel] = 1;
  }
  largestComponent(mask, width, height);
  const out = Buffer.alloc(width * height, 255);
  for (let pixel = 0; pixel < width * height; pixel += 1) if (mask[pixel]) out[pixel] = 0;
  await sharp(out, { raw: { channels: 1, height, width } }).png().toFile(outPath);
  return tallies(mask, width, height);
}

await mkdir(OUT, { recursive: true });
const rows = [];

function report(tier, metrics, frameMs) {
  rows.push({ frameMs, tier, ...metrics });
  console.log(
    `${tier.padEnd(7)} slenderness ${metrics.slenderness.toFixed(2)}  (h ${metrics.objectHeight} / median w ${metrics.medianRowWidth})  aspect ${metrics.aspect.toFixed(2)}  openness ${metrics.openness.toFixed(3)}  ${metrics.clipped ? "CLIPPED " : ""}frame ${frameMs ?? "-"}ms`,
  );
}

if (RECOMPUTE) {
  for (const tier of TIERS) {
    const metrics = await silhouette(
      path.join(OUT, `${STATION}-${tier}.png`),
      path.join(OUT, `${STATION}-${tier}-nomech.png`),
      path.join(OUT, `${STATION}-${tier}-mask.png`),
    );
    report(tier, metrics, null);
  }
  await writeFile(
    path.join(OUT, "silhouette.json"),
    JSON.stringify({ crop: CROP, rows, station: STATION }, null, 2),
  );
  process.exit(0);
}

const browser = await chromium.launch({
  args: ["--enable-gpu"],
  channel: "chrome",
  headless: true,
});

async function capture(tier, file, extra) {
  const context = await browser.newContext({ deviceScaleFactor: 1, viewport: VIEWPORT });
  const page = await context.newPage();
  try {
    await page.goto(`${BASE}/?qa-artifact=${STATION}&qa-sdf=1&${ISOLATE}${extra}`, {
      timeout: 60000,
      waitUntil: "domcontentloaded",
    });
    await page.waitForSelector('#world[data-render-enabled="true"]', { timeout: 60000 });
    // The tier button's visible text does not match its accessible name.
    await page
      .getByRole("button", { name: `Use ${tier} graphics quality` })
      .click()
      .catch(() => {});
    await page.waitForTimeout(4500);
    await page.screenshot({ path: file });
    return await page.evaluate(
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
              resolve(Math.round(deltas[Math.floor(deltas.length / 2)] * 10) / 10);
            }
          };
          requestAnimationFrame(step);
        }),
    );
  } finally {
    await context.close();
  }
}

try {
  for (const tier of TIERS) {
    try {
      const file = path.join(OUT, `${STATION}-${tier}.png`);
      const bare = path.join(OUT, `${STATION}-${tier}-nomech.png`);
      const frameMs = await capture(tier, file, "");
      await capture(tier, bare, "&qa-no-mechanisms=1");
      const metrics = await silhouette(file, bare, path.join(OUT, `${STATION}-${tier}-mask.png`));
      report(tier, metrics, frameMs);
    } catch (error) {
      console.log(`${tier.padEnd(7)} SKIPPED  ${String(error.message).split("\n")[0]}`);
    }
  }
} finally {
  await browser.close();
}
await writeFile(
  path.join(OUT, "silhouette.json"),
  JSON.stringify({ crop: CROP, rows, station: STATION }, null, 2),
);
