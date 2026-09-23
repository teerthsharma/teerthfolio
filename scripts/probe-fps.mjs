/* global window, document, requestAnimationFrame */
// Frame-time probe in real Chrome (the bundled chromium has no GPU here and
// fakes a 40x slowdown). Loads the page, waits for the first frame, drives
// the seal for a few seconds, and reports frame-time percentiles.
//
//   node scripts/probe-fps.mjs [--url http://localhost:3000/?play] [--w 1440] [--h 900] [--secs 6]
//
// On this machine (Intel UHD integrated graphics) the numbers are a low-end
// reading; say so when you quote them.

import { existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, token, i, all) => {
    if (token.startsWith("--")) pairs.push([token.slice(2), all[i + 1]?.startsWith("--") ? true : all[i + 1] ?? true]);
    return pairs;
  }, []),
);
const url = args.url || "http://localhost:3000/?play";
const width = Number(args.w || 1440);
const height = Number(args.h || 900);
const secs = Number(args.secs || 6);

const local = process.env.LOCALAPPDATA;
const chrome = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  local && path.join(local, "Google/Chrome/Application/chrome.exe"),
].filter(Boolean).find((c) => existsSync(c));

const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
try {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__world?.ready, null, { timeout: 90000 });
  await page.waitForTimeout(2500); // let shaders finish compiling
  const sampling = page.evaluate((ms) => new Promise((resolve) => {
    const times = [];
    let last = performance.now();
    const end = last + ms;
    const tick = (now) => {
      times.push(now - last);
      last = now;
      if (now < end) requestAnimationFrame(tick);
      else resolve(times);
    };
    requestAnimationFrame(tick);
  }), secs * 1000);
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(secs * 400);
  await page.keyboard.up("KeyW");
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(secs * 400);
  await page.keyboard.up("KeyD");
  const times = (await sampling).slice(5).sort((a, b) => a - b);
  const pct = (p) => +times[Math.min(times.length - 1, Math.floor(times.length * p))].toFixed(1);
  const gpu = await page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const info = gl?.getExtension("WEBGL_debug_renderer_info");
    return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : "unknown";
  });
  console.log(JSON.stringify({ url, width, height, frames: times.length, p50ms: pct(0.5), p90ms: pct(0.9), p99ms: pct(0.99), fpsP50: +(1000 / pct(0.5)).toFixed(1), gpu }));
} finally {
  await browser.close();
}
