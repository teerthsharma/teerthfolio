/* global window, document, requestAnimationFrame */
// Laptop parity gate, in real Chrome (the bundled chromium has no GPU here
// and fakes a 40x slowdown). Loads /?play as a phone, an iPad and a laptop,
// lets the quality monitor settle the way a visitor's would, drives the seal,
// and fails unless the laptop holds the iPad's frame time.
//
//   node scripts/perf-gate.mjs [--url http://localhost:3402/?play] [--secs 6] [--only laptop] [--gpu intel|nvidia]
//   Every row prints the WebGL renderer string; never compare rows across adapters.
//
// On this machine (Intel UHD integrated graphics) the numbers are a low-end,
// fill-bound reading; say so when you quote them.

import { existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { BASE_FLAGS, adapterFlags } from "./gpu-adapter.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, token, i, all) => {
    if (token.startsWith("--")) pairs.push([token.slice(2), all[i + 1]?.startsWith("--") ? true : all[i + 1] ?? true]);
    return pairs;
  }, []),
);
const url = args.url || "http://localhost:3402/?play";
const secs = Number(args.secs || 6);
const settle = Number(args.settle || 14); // monitor waits 4 s, then ~2.5 s per step

const PROFILES = {
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  ipad: { viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  laptop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
};
// Laptop must hold the iPad's frame time (10 % slack for noise) and 50 fps,
// the same bound Look.jsx's monitor holds every device to.
const SLACK = 1.1;
const LAPTOP_MAX_MS = 20;

const local = process.env.LOCALAPPDATA;
const chrome = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  local && path.join(local, "Google/Chrome/Application/chrome.exe"),
].filter(Boolean).find((c) => existsSync(c));
if (!chrome) throw new Error("real Chrome not found; the bundled chromium fakes GPU numbers here");

async function measure(browser, name) {
  const context = await browser.newContext(PROFILES[name]);
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__world?.ready, null, { timeout: 90000 });
    // what the visitor sees first: the 3 s after the loading screen lifts
    const frameTimes = (ms) => page.evaluate((ms) => new Promise((resolve) => {
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
    }), ms);
    const first = (await frameTimes(3000)).sort((a, b) => a - b);
    const startLook = await page.evaluate(() => window.__world?.look);
    await page.waitForTimeout(Math.max(0, settle - 3) * 1000);
    const sampling = frameTimes(secs * 1000);
    await page.keyboard.down("KeyW");
    await page.waitForTimeout(secs * 400);
    await page.keyboard.up("KeyW");
    await page.keyboard.down("KeyD");
    await page.waitForTimeout(secs * 400);
    await page.keyboard.up("KeyD");
    const times = (await sampling).slice(5).sort((a, b) => a - b);
    const pct = (p) => +times[Math.min(times.length - 1, Math.floor(times.length * p))].toFixed(1);
    const state = await page.evaluate(() => {
      const c = document.querySelector("canvas");
      const gl = document.createElement("canvas").getContext("webgl2");
      const info = gl?.getExtension("WEBGL_debug_renderer_info");
      const w = window.__world || {};
      return { look: w.look, dpr: w.dpr, buffer: c ? `${c.width}x${c.height}` : null, gpu: info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : "unknown" };
    });
    const mpx = state.buffer ? +(state.buffer.split("x").reduce((a, b) => a * b, 1) / 1e6).toFixed(2) : null;
    return { name, startLook, firstP50ms: +first[first.length >> 1].toFixed(1), ...state, mpx, frames: times.length, p50ms: pct(0.5), p90ms: pct(0.9), fpsP50: +(1000 / pct(0.5)).toFixed(1) };
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ executablePath: chrome, headless: true, args: [...BASE_FLAGS, ...(await adapterFlags(chromium, chrome, args.gpu))] });
const results = {};
try {
  for (const name of args.only ? [args.only] : ["phone", "ipad", "laptop"]) {
    results[name] = await measure(browser, name);
    console.log(JSON.stringify(results[name]));
  }
} finally {
  await browser.close();
}

const { ipad, laptop } = results;
const fails = [];
if (laptop && laptop.p50ms > LAPTOP_MAX_MS) fails.push(`laptop p50 ${laptop.p50ms} ms > ${LAPTOP_MAX_MS} ms`);
if (laptop && ipad && laptop.p50ms > ipad.p50ms * SLACK) fails.push(`laptop p50 ${laptop.p50ms} ms > iPad ${ipad.p50ms} ms x ${SLACK}`);
console.log(fails.length ? `RED perf-gate: ${fails.join("; ")}` : "GREEN perf-gate: laptop holds iPad-level frame time");
process.exitCode = fails.length ? 1 : 0;
