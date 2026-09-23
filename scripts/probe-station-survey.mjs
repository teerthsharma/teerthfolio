/* global document */
// One capture per station, so every building in the world can be judged on the
// same terms rather than by whichever one happens to be in front of the camera.
// The observatory has had a great deal of attention; the other seven have had
// none, and no evidence exists about how they read.
//
// Drives the canonical route and captures whenever the traveller comes within
// docking proximity of a station it has not photographed yet.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.PROBE_BASE || "http://localhost:3100";
const OUT = process.argv[2] || "verification/station-survey";
await mkdir(OUT, { recursive: true });

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
await page
  .waitForFunction(() => document.querySelector("#world")?.dataset.rendererMode === "webgl", {
    timeout: 150000,
  })
  .catch(() => {});
await page.bringToFront();
await page.waitForTimeout(24000);
// Pin the tier. The measured quality ladder settles wherever the machine's
// thermal state puts it, so two surveys run an hour apart can land on different
// tiers and their luminance readings are then not comparable — which happened
// once and made an ambient change look like a regression.
const TIER = process.env.PROBE_TIER || "medium";
await page.locator("button", { hasText: new RegExp(`^${TIER}$`, "i") }).first().click().catch(() => {});
await page.waitForTimeout(4000);
await page.mouse.click(500, 780);
await page.waitForTimeout(600);

const readWorld = () =>
  page.evaluate(() => {
    const world = document.querySelector("#world");
    return {
      docked: world?.dataset.dockedStation ?? "none",
      proximity: Number(world?.dataset.stationProximity ?? 0),
      x: Number(world?.dataset.worldX),
      z: Number(world?.dataset.worldZ),
      tier: document.querySelector("canvas.igloo-scene-canvas")?.dataset.quality ?? null,
    };
  });

// Selecting a station in the HUD auto-travels the traveller to it. Two earlier
// attempts at this survey tried to drive there instead: one waited for
// dockedStation, which is only published while actually docked and so reported
// "none" the whole way past every building; the other steered greedily toward
// the schema coordinates and drove 150 units off the map, because W follows the
// camera's forward axis and turning changes what W means.
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
const ARRIVAL_RADIUS = 4;

const seen = new Map();
for (const [chip, id, sx, sz] of STATIONS) {
  await page.locator("button", { hasText: new RegExp(chip) }).first().click().catch(() => {});
  let world = await readWorld();
  let waited = 0;
  while (waited < 26000 && Math.hypot(world.x - sx, world.z - sz) > ARRIVAL_RADIUS) {
    await page.waitForTimeout(900);
    waited += 900;
    world = await readWorld();
  }
  // Let the arrival settle: the camera eases in and the station's own machinery
  // spins up on docking.
  await page.waitForTimeout(4200);
  const final = await readWorld();
  const gap = Math.hypot(final.x - sx, final.z - sz);
  const file = path.join(OUT, `${chip}-${id}.png`);
  await page.screenshot({ path: file });
  seen.set(id, { id, chip, ...final, gap: Math.round(gap * 10) / 10, arrived: gap <= ARRIVAL_RADIUS, file });
  console.log(
    `${chip} ${id.padEnd(24)} ${gap <= ARRIVAL_RADIUS ? "arrived" : "NOT THERE"}  ` +
      `${gap.toFixed(1)} from centre  docked ${final.docked}  tier ${final.tier}`,
  );
}

const missed = [...seen.values()].filter((row) => !row.arrived);
if (missed.length) {
  console.log(`
${missed.length} not reached: ${missed.map((r) => r.id).join(", ")}`);
}
await writeFile(path.join(OUT, "survey.json"), JSON.stringify([...seen.values()], null, 2));
await browser.close();
