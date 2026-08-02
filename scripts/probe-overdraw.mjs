/* global document */
// How many times is each pixel written?
//
// Every timing instrument on this machine is bounded by thermal drift — the
// null-control pair moved from 0.46ms of spread to 4.82ms over one session — and
// the frame is fill-bound in a way that does not care what shader runs at each
// pixel: replacing every material with MeshLambert measured nothing. What is
// left is how much gets written per pixel, and that is a count, not a duration,
// so it can be measured exactly on a hot GPU.
//
// qa-overdraw renders every surface with a fixed additive increment and depth
// testing off, against a zero clear on a linear output path. The red channel
// divided by that increment is the write count. qa-no-post is required
// alongside it: the grade chain would rewrite the values being counted.
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const BASE = process.env.PROBE_BASE || "http://localhost:3100";
// "depth" counts only fragments that survive depth rejection; the default
// counts every fragment submitted.
const MODE = process.env.PROBE_MODE === "depth" ? "qa-overdraw-depth" : "qa-overdraw";
const OUT = process.argv[2] || "verification/overdraw";
// Must match OVERDRAW_STEP in components/IglooScene.jsx.
const STEP = 4;
await mkdir(OUT, { recursive: true });

const CASES = [
  { name: "as shipped", query: "" },
  { name: "no dome", query: "&qa-no-dome=1" },
  { name: "no ground", query: "&qa-no-ground=1" },
  { name: "no sky", query: "&qa-no-sky=1" },
  { name: "no signals", query: "&qa-no-signals=1" },
  { name: "no topology", query: "&qa-no-topology=1" },
  { name: "no dressing", query: "&qa-no-dressing=1" },
  { name: "no mechanisms", query: "&qa-no-mechanisms=1" },
];

const browser = await chromium.launch({
  channel: "chrome",
  headless: false,
  args: ["--enable-gpu", "--window-position=0,0"],
});

const results = [];
for (const testCase of CASES) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/?${MODE}=1&qa-no-post=1${testCase.query}`, {
    waitUntil: "domcontentloaded",
    timeout: 180000,
  });
  await page.waitForTimeout(1500);
  await page.locator("button", { hasText: /enter the world|start/i }).first().click().catch(() => {});
  await page
    .waitForFunction(() => document.querySelector("#world")?.dataset.rendererMode === "webgl", {
      timeout: 150000,
    })
    .catch(() => {});
  await page.bringToFront();
  await page.waitForTimeout(9000);
  // The counter must be live in the frame being sampled, not merely requested.
  const live = await page.evaluate(
    () => document.querySelector("canvas.igloo-scene-canvas")?.dataset.overdrawActive === "true",
  );
  if (!live) {
    console.log(`${testCase.name}: counter never went live, skipped`);
    await context.close();
    continue;
  }
  const file = path.join(OUT, `${testCase.name.replace(/\s+/g, "-")}.png`);
  await page.screenshot({ path: file });

  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const counts = [];
  let total = 0;
  // The HUD is DOM drawn over the capture, so the right column and the bottom
  // strip are skipped rather than counted as world.
  const maxX = Math.floor(info.width * 0.74);
  const maxY = Math.floor(info.height * 0.9);
  for (let y = 0; y < maxY; y += 2) {
    for (let x = 0; x < maxX; x += 2) {
      const writes = data[(y * info.width + x) * info.channels] / STEP;
      counts.push(writes);
      total += writes;
    }
  }
  counts.sort((a, b) => a - b);
  const at = (q) => counts[Math.floor(counts.length * q)];
  const row = {
    case: testCase.name,
    meanWrites: Math.round((total / counts.length) * 100) / 100,
    medianWrites: at(0.5),
    p95Writes: at(0.95),
    maxWrites: counts.at(-1),
    emptyPercent: Math.round((counts.filter((v) => v === 0).length / counts.length) * 1000) / 10,
  };
  results.push(row);
  console.log(
    `${row.case.padEnd(15)} mean ${String(row.meanWrites).padStart(6)}  median ${String(row.medianWrites).padStart(5)}  ` +
      `p95 ${String(row.p95Writes).padStart(5)}  max ${String(row.maxWrites).padStart(5)}  never-written ${row.emptyPercent}%`,
  );
  await context.close();
}

const shipped = results.find((row) => row.case === "as shipped");
if (shipped) {
  console.log(`\nwrites per pixel removed, against ${shipped.meanWrites} mean:`);
  for (const row of results) {
    if (row.case === "as shipped") continue;
    console.log(
      `${row.case.padEnd(15)} ${String(Math.round((shipped.meanWrites - row.meanWrites) * 100) / 100).padStart(6)}`,
    );
  }
}

await writeFile(path.join(OUT, "overdraw.json"), JSON.stringify(results, null, 2));
await browser.close();
