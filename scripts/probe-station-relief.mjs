/* global requestAnimationFrame */
// Tight-crop edge energy per station building.
//
// Regional mean metrics (luma, saturation, spread) are BLIND to relief: the dome
// pass moved every one of them by under 0.01 while the picture visibly changed
// from flat plates to stacked masonry. What moves is the mean absolute luma
// GRADIENT — how hard the surface turns at an edge — and it only moves if the
// crop is tight on the building. A whole-frame average of a building occupying a
// fifth of the frame dilutes a real gain into a null result.
//
// Headless only, one browser per sweep, closed in a finally.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const BASE = process.env.PROBE_BASE || "http://localhost:3100";
const TIER = process.env.PROBE_TIER || "medium";
const OUT = process.argv[2] || "verification/station-relief";
const VIEWPORT = { height: 900, width: 1440 };
// The docked camera framing is deterministic per station, so one frozen crop
// keeps a before/after pair comparable. Centred on the docked subject and 27%
// of the frame; the sky above and the ground apron below are excluded because
// neither carries building relief.
const CROP = { height: 520, left: 430, top: 210, width: 600 };

// Several agents build against one .next and one port here, so a server started
// before someone else's build serves a stale manifest and 500s on a chunk. A
// station that fails is skipped rather than aborting the sweep; re-run after a
// server restart and the missing rows fill in. Set PROBE_STATIONS to a comma
// list to sweep only those.
const STATIONS = (process.env.PROBE_STATIONS || "").split(",").filter(Boolean).length
  ? process.env.PROBE_STATIONS.split(",")
  : [
  "observatory-plaque",
  "s2-kernel-core",
  "manifold-reactor",
  "field-chamber-coils",
  "qpu-ice-bridge",
  "upstream-radio-mast",
  "topology-archive-wall",
      "assembly-tool-locker",
    ];

// Mean absolute luma gradient over the crop, Sobel-free: a forward difference in
// x and y is enough to rank relief and is not sensitive to kernel choice.
async function edgeEnergy(pngPath) {
  const { data, info } = await sharp(pngPath)
    .extract(CROP)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { height, width } = info;
  let sum = 0;
  let samples = 0;
  let luma = 0;
  for (let y = 0; y < height - 1; y += 1) {
    for (let x = 0; x < width - 1; x += 1) {
      const index = y * width + x;
      const value = data[index];
      luma += value;
      sum += Math.abs(data[index + 1] - value) + Math.abs(data[index + width] - value);
      samples += 1;
    }
  }
  return {
    edge: Math.round((sum / samples / 255) * 10000) / 10000,
    luma: Math.round((luma / samples / 255) * 10000) / 10000,
  };
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({
  args: ["--enable-gpu"],
  channel: "chrome",
  headless: true,
});
const rows = [];
try {
  for (const id of STATIONS) {
    const context = await browser.newContext({ deviceScaleFactor: 1, viewport: VIEWPORT });
    const page = await context.newPage();
    try {
      await page.goto(`${BASE}/?qa-artifact=${id}&qa-sdf=1`, {
        timeout: 60000,
        waitUntil: "domcontentloaded",
      });
      if (id === "topology-archive-wall") {
        // The archive offers a portal on arrival and the dialog covers the subject.
        const offer = page.getByRole("dialog", { name: /topology archive/i });
        await offer.waitFor({ state: "attached", timeout: 30000 }).catch(() => {});
        await offer
          .getByRole("button", { name: /Stay in (?:the polar )?world/i })
          .click()
          .catch(() => {});
        await offer.waitFor({ state: "detached", timeout: 30000 }).catch(() => {});
      }
      await page.waitForSelector('#world[data-render-enabled="true"]', { timeout: 60000 });
      // The tier button's visible text does not match its accessible name.
      await page
        .getByRole("button", { name: `Use ${TIER} graphics quality` })
        .click()
        .catch(() => {});
      await page.waitForTimeout(4500);
      const file = path.join(OUT, `${id}.png`);
      await page.screenshot({ path: file });
      const metrics = await edgeEnergy(file);
      // Presented frame time while docked. The relief pass adds no draw call, no
      // program, no varying and no texture fetch, so this is the only place its
      // cost can show up: fragment ALU on the station's own pixels.
      const frameMs = await page.evaluate(
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
      rows.push({ frameMs, id, ...metrics });
      console.log(
        `${id.padEnd(24)} edge ${metrics.edge.toFixed(4)}  luma ${metrics.luma.toFixed(4)}  frame ${frameMs}ms`,
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
await writeFile(path.join(OUT, "relief.json"), JSON.stringify({ crop: CROP, rows, tier: TIER }, null, 2));
