/* global document */
// Does every station still render?
//
// verify-render-frame guards one frame at the home dock, which protects the
// observatory and nothing else. Seven other buildings can stop drawing, lose a
// material, or fall through the snow, and every contract in the repository will
// still pass — the same blind spot that let two optimisations in this branch
// measure large wins on a scene whose terrain had silently broken.
//
// Travels to each station the way a visitor does, by selecting it in the HUD,
// and compares a 10x6 grid of mean luminances against a committed reference.
// Coarse enough to ignore the aurora phase and the station's own animated
// machinery, fine enough to catch a building that stopped drawing.
//
// Run against a production build. `--update` rewrites the reference; do that
// only alongside a deliberate visual change, and say so in the commit.
import { chromium } from "playwright";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const BASE = process.env.PROBE_BASE || "http://localhost:3100";
const REFERENCE = join(process.cwd(), "scripts", "station-frame-reference.json");
const UPDATE = process.argv.includes("--update");
const TIER = process.env.PROBE_TIER || "medium";
const COLUMNS = 10;
const ROWS = 6;
const CELL_TOLERANCE = 16;
const MAX_CHANGED_CELLS = 6;
const ARRIVAL_RADIUS = 4;

const STATIONS = [
  ["CO_01", "observatory-plaque", -3, 1],
  ["CO_02", "s2-kernel-core", 3, 8],
  ["CO_03", "manifold-reactor", -14, -6],
  ["CO_04", "field-chamber-coils", -10, -9],
  ["CO_05", "qpu-ice-bridge", 17, -13],
  ["CO_06", "upstream-radio-mast", 14, 12],
  ["CO_07", "topology-archive-wall", 11, -8],
  ["CO_08", "assembly-tool-locker", -16, 2],
];

const browser = await chromium.launch({
  channel: "chrome",
  headless: false,
  args: ["--enable-gpu", "--window-position=0,0"],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const failures = [];
page.on("pageerror", (error) => failures.push(`page error: ${error.message.slice(0, 160)}`));

await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 180000 });
await page.waitForTimeout(1800);
await page.locator("button", { hasText: /enter the world|start/i }).first().click().catch(() => {});
const reachedWebgl = await page
  .waitForFunction(() => document.querySelector("#world")?.dataset.rendererMode === "webgl", {
    timeout: 150000,
  })
  .then(() => true)
  .catch(() => false);
if (!reachedWebgl) failures.push("the world never reported a webgl renderer");
await page.bringToFront();
await page.waitForTimeout(24000);
// Pin the tier: the measured ladder settles wherever thermal state puts it, and
// two runs on different tiers are not comparable.
await page.locator("button", { hasText: new RegExp(`^${TIER}$`, "i") }).first().click().catch(() => {});
await page.waitForTimeout(4000);

const readPose = () =>
  page.evaluate(() => {
    const world = document.querySelector("#world");
    return { x: Number(world?.dataset.worldX), z: Number(world?.dataset.worldZ) };
  });

const gridOf = async (file) => {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const width = Math.floor(info.width * 0.74);
  const height = Math.floor(info.height * 0.9);
  const cells = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      let sum = 0;
      let count = 0;
      const x0 = Math.floor((column * width) / COLUMNS);
      const x1 = Math.floor(((column + 1) * width) / COLUMNS);
      const y0 = Math.floor((row * height) / ROWS);
      const y1 = Math.floor(((row + 1) * height) / ROWS);
      for (let y = y0; y < y1; y += 3) {
        for (let x = x0; x < x1; x += 3) {
          const i = (y * info.width + x) * info.channels;
          sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
          count += 1;
        }
      }
      cells.push(Math.round((sum / count) * 10) / 10);
    }
  }
  return cells;
};

const observed = {};
for (const [chip, id, sx, sz] of STATIONS) {
  await page.locator("button", { hasText: new RegExp(chip) }).first().click().catch(() => {});
  let pose = await readPose();
  let waited = 0;
  while (waited < 26000 && Math.hypot(pose.x - sx, pose.z - sz) > ARRIVAL_RADIUS) {
    await page.waitForTimeout(900);
    waited += 900;
    pose = await readPose();
  }
  await page.waitForTimeout(4200);
  const gap = Math.hypot(pose.x - sx, pose.z - sz);
  // observatory-plaque is where the traveller starts, so its arrival loop has
  // nothing to wait for and it can settle just outside the radius.
  if (gap > ARRIVAL_RADIUS + 1.5) failures.push(`${id}: never arrived (${gap.toFixed(1)} away)`);
  const file = join(process.cwd(), "verification", `station-frame-${id}.png`);
  await page.screenshot({ path: file });
  observed[id] = await gridOf(file);
}
await browser.close();

if (UPDATE || !existsSync(REFERENCE)) {
  if (failures.length) {
    for (const failure of failures) console.error(`refusing to write a reference: ${failure}`);
    process.exit(1);
  }
  writeFileSync(
    REFERENCE,
    `${JSON.stringify({ tier: TIER, columns: COLUMNS, rows: ROWS, stations: observed }, null, 2)}\n`,
  );
  console.log(`station frame reference written: ${STATIONS.length} stations at tier ${TIER}`);
  process.exit(0);
}

const reference = JSON.parse(readFileSync(REFERENCE, "utf8"));
for (const [, id] of STATIONS) {
  const expected = reference.stations?.[id];
  if (!expected) {
    failures.push(`${id}: no reference; regenerate with --update`);
    continue;
  }
  const changed = observed[id].filter(
    (value, index) => Math.abs(value - expected[index]) > CELL_TOLERANCE,
  ).length;
  if (changed > MAX_CHANGED_CELLS) {
    failures.push(`${id}: ${changed}/${observed[id].length} cells moved more than ${CELL_TOLERANCE} luma`);
  }
}

if (failures.length) {
  for (const failure of failures) console.error(`station frame check failed: ${failure}`);
  process.exit(1);
}
console.log(
  `station frame contract passed at tier ${TIER}: all ${STATIONS.length} stations within ` +
    `${MAX_CHANGED_CELLS} cells of ${CELL_TOLERANCE} luma`,
);
