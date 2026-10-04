/* global window */
// The look's post stack must be as big as the frame it is drawn into.
// Look.jsx raises the canvas DPR to the rung's after the first frame (and on
// every rung change or move to another screen); a composer sized before that
// keeps its buffers, and N8AO's half-size ones, at the old size, so on any
// screen with a DPR above 1 the ambient occlusion lands on 1/DPR of the frame
// (ghost copies of buildings, a rectangular seam on the snow).
//
//   node scripts/dpr-check.mjs [--url http://localhost:3122] [--dsf 2] [--look 3]
//
// Two checks on a real-Chrome frame of the Tangle gantry, exit 1 if either fails:
//   buffers  composer.inputBuffer is the drawing buffer's size
//   seam     the snow's median luma does not step where a 1/DPR overlay would end
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";

const args = Object.fromEntries(process.argv.slice(2).reduce((p, t, i, a) => (t.startsWith("--") ? [...p, [t.slice(2), a[i + 1]]] : p), []));
const base = args.url || "http://localhost:3122";
const dsf = Number(args.dsf || 2);
const look = args.look ?? "3";
const out = args.out || "verification/dpr-check.png";
const W = 1600;
const H = 874;
const chrome = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"].find(existsSync);

mkdirSync(path.dirname(out), { recursive: true });
const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
try {
  const page = await (await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: dsf })).newPage();
  await page.goto(`${base}/?play&spawn=p-tangle&look=${look}&zoom=2.4`);
  await page.waitForFunction(() => window.__world?.ready && window.__world.composer, null, { timeout: 90000 });
  await page.waitForTimeout(6000);
  const probe = await page.evaluate(() => {
    const w = window.__world;
    const canvas = w.gl.domElement;
    return { dpr: w.dpr, draw: [canvas.width, canvas.height], buf: [w.composer.inputBuffer.width, w.composer.inputBuffer.height] };
  });
  await page.screenshot({ path: out });

  // median luma of the snow just left and just right of the column where a
  // 1/DPR overlay would end, over the rows it covers (its top is H - H/DPR)
  const { data, info } = await sharp(out).resize(W, H).greyscale().raw().toBuffer({ resolveWithObject: true });
  const seamX = Math.round(W / probe.dpr);
  const median = (x0, x1, y0, y1) => {
    const v = [];
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) v.push(data[y * info.width + x]);
    return v.sort((a, b) => a - b)[v.length >> 1];
  };
  const rows = [Math.round(H * 0.7), Math.round(H * 0.98)];
  const step = probe.dpr > 1.05 ? Math.abs(median(seamX - 80, seamX - 10, ...rows) - median(seamX + 10, seamX + 80, ...rows)) : 0;
  const bufferOk = probe.buf[0] === probe.draw[0] && probe.buf[1] === probe.draw[1];
  const seamOk = step < 5;
  console.log(JSON.stringify({ look, dsf, ...probe, seamX, lumaStep: +step.toFixed(2), bufferOk, seamOk, out }));
  if (!bufferOk || !seamOk) process.exitCode = 1;
} finally {
  await browser.close();
}
