// Drive the seal with real keys and grab a frame strip, to see moments a
// single timed capture misses (the radiation beat on crossing into an area,
// the first-arrival showcase, the whirlpool's throw).
//
//   node scripts/probe-frames.mjs <url> <keys, e.g. KeyD+KeyW> <hold ms> <frames> <out prefix>
//
// Frames land in verification/<prefix>-NN.png, about 250 ms apart; console
// and page errors print as one JSON line at the end.
import { existsSync } from "node:fs";
import path from "node:path";
/* global window */
import { chromium } from "playwright";

const local = process.env.LOCALAPPDATA;
const chrome = ["C:/Program Files/Google/Chrome/Application/chrome.exe", local && path.join(local, "Google/Chrome/Application/chrome.exe")].filter(Boolean).find((c) => existsSync(c));
const [url, keys, holdMs, frames, prefix] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
const page = await browser.newPage({ viewport: { width: 1200, height: 750 }, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await page.goto(url, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__world?.ready, null, { timeout: 90000 });
await page.waitForTimeout(3000);
const held = keys.split("+").filter(Boolean);
for (const k of held) await page.keyboard.down(k);
const start = Date.now();
let released = false;
for (let i = 0; i < Number(frames); i++) {
  if (!released && Date.now() - start > Number(holdMs)) {
    for (const k of held) await page.keyboard.up(k);
    released = true;
  }
  await page.screenshot({ path: `verification/${prefix}-${String(i).padStart(2, "0")}.png` });
  await page.waitForTimeout(40);
}
console.log(JSON.stringify({ frames: Number(frames), errors: errors.slice(0, 5) }));
await browser.close();
