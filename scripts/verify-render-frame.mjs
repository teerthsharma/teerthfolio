/* global document */
// Does the world still render?
//
// Two consecutive optimisations in this branch measured large wins on a scene
// that was silently broken — one hid the ground behind a promise that never
// resolved, one damaged the terrain shader. gl.debug.checkShaderErrors is off
// deliberately, because leaving it on serialised every boot link into a 16.5s
// stall, so a broken shader renders wrong instead of throwing. Every one of the
// repository's 20 contracts is a source pattern or a CPU-side assertion, and
// both failures were invisible to all of them and obvious in a screenshot.
//
// This compares a rendered frame against a committed reference, coarsely enough
// to ignore the aurora phase, the mascot's idle and the particle field, and
// finely enough to catch a subsystem that stopped drawing. The reference is a
// grid of mean luminances, not an image: a per-cell mean moves a few percent
// when the sky animates and by tens of percent when the terrain turns into a
// flat plane.
//
// Run against a production build. `--update` rewrites the reference; do that
// only alongside a deliberate visual change, and say so in the commit.
import { chromium } from "playwright";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const BASE = process.env.PROBE_BASE || "http://localhost:3100";
const REFERENCE = join(process.cwd(), "scripts", "render-frame-reference.json");
const UPDATE = process.argv.includes("--update");
const COLUMNS = 12;
const ROWS = 8;
// A cell may move this much before it counts as a change. The aurora sweeps and
// the particle field drift; neither moves a cell mean by more than a few luma.
const CELL_TOLERANCE = 14;
// One or two cells over tolerance is weather. A subsystem that stopped drawing
// takes a whole band of them.
const MAX_CHANGED_CELLS = 6;

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
// Past the staged admission, the shader warm-up and the measured quality step,
// so the frame under test is the settled one a visitor sits in front of.
await page.waitForTimeout(26000);

const tier = await page.evaluate(
  () => document.querySelector("canvas.igloo-scene-canvas")?.dataset.quality ?? null,
);
const shot = join(process.cwd(), "verification", "render-frame-current.png");
await page.screenshot({ path: shot });
await browser.close();

const { data, info } = await sharp(shot).removeAlpha().raw().toBuffer({ resolveWithObject: true });
// The HUD is DOM painted over the canvas; sampling it would compare text
// rendering rather than the world.
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
    for (let y = y0; y < y1; y += 2) {
      for (let x = x0; x < x1; x += 2) {
        const i = (y * info.width + x) * info.channels;
        sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        count += 1;
      }
    }
    cells.push(Math.round((sum / count) * 10) / 10);
  }
}

// A reference captured from a world that never loaded would enshrine the splash
// screen as the expected frame and pass forever after. The first run of this
// probe did exactly that, against a stale server, and wrote a grid of 20-luma
// cells.
if (UPDATE || !existsSync(REFERENCE)) {
  if (failures.length) {
    for (const failure of failures) console.error(`refusing to write a reference: ${failure}`);
    process.exit(1);
  }
  writeFileSync(REFERENCE, `${JSON.stringify({ tier, columns: COLUMNS, rows: ROWS, cells }, null, 2)}\n`);
  console.log(`render frame reference written: ${COLUMNS}x${ROWS} cells at tier ${tier}`);
  process.exit(0);
}

const reference = JSON.parse(readFileSync(REFERENCE, "utf8"));
if (reference.columns !== COLUMNS || reference.rows !== ROWS) {
  failures.push("reference grid shape does not match this probe; regenerate with --update");
}
const changed = [];
for (let index = 0; index < cells.length; index += 1) {
  const delta = Math.abs(cells[index] - reference.cells[index]);
  if (delta > CELL_TOLERANCE) {
    changed.push({
      cell: `r${Math.floor(index / COLUMNS)}c${index % COLUMNS}`,
      was: reference.cells[index],
      now: cells[index],
      delta: Math.round(delta * 10) / 10,
    });
  }
}
if (changed.length > MAX_CHANGED_CELLS) {
  failures.push(
    `${changed.length} of ${cells.length} cells moved more than ${CELL_TOLERANCE} luma: ` +
      changed
        .slice(0, 8)
        .map((c) => `${c.cell} ${c.was}->${c.now}`)
        .join(", "),
  );
}

if (failures.length) {
  for (const failure of failures) console.error(`render frame check failed: ${failure}`);
  process.exit(1);
}
console.log(
  `render frame contract passed at tier ${tier}: ${changed.length}/${cells.length} cells moved ` +
    `beyond ${CELL_TOLERANCE} luma, ceiling ${MAX_CHANGED_CELLS}`,
);
