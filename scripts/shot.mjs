/* global window */
// Screenshot the running island in real Chrome (Playwright's bundled chromium
// has no GPU on this machine and renders WebGL in software, 40x slower).
//
//   node scripts/shot.mjs [--url http://localhost:3000/?spawn=aether]
//                         [--out verification/shot.png] [--w 1440] [--h 900]
//                         [--wait 1500] [--keys "KeyW:800,KeyD:400"] [--start]
//                         [--click "Projects"]   (clicks the button/link with that name)
//
// Waits for window.__world.ready (set after the first real frame), then
// optionally dismisses the intro and holds keys, then captures. Prints the
// console errors and a non-blank pixel check so a broken frame cannot pass
// as a picture.

import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, token, i, all) => {
    if (token.startsWith("--")) pairs.push([token.slice(2), all[i + 1]?.startsWith("--") ? true : all[i + 1] ?? true]);
    return pairs;
  }, []),
);

const url = args.url || "http://localhost:3000/";
const out = args.out || "verification/shot.png";
const width = Number(args.w || 1440);
const height = Number(args.h || 900);
const mobile = width < 720;

function chrome() {
  const local = process.env.LOCALAPPDATA;
  return [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    local && path.join(local, "Google/Chrome/Application/chrome.exe"),
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  ]
    .filter(Boolean)
    .find((candidate) => existsSync(candidate));
}

mkdirSync(path.dirname(out), { recursive: true });
const browser = await chromium.launch({
  executablePath: chrome(),
  headless: true,
  args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"],
});
const errors = [];
try {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: mobile ? 2 : 1,
    isMobile: mobile,
    hasTouch: mobile,
  });
  const page = await context.newPage();
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__world?.ready, null, { timeout: 60000 });
  if (args.start) {
    const start = page.getByRole("button", { name: /start sliding/i });
    if (await start.count()) await start.click();
  }
  if (args.keys && args.keys !== true) {
    for (const step of String(args.keys).split(",")) {
      const [key, ms] = step.split(":");
      await page.keyboard.down(key);
      await page.waitForTimeout(Number(ms || 500));
      await page.keyboard.up(key);
    }
  }
  if (args.click && args.click !== true) {
    await page.getByRole("button", { name: String(args.click) }).or(page.getByRole("link", { name: String(args.click) })).first().click();
  }
  await page.waitForTimeout(Number(args.wait || 1500));
  await page.screenshot({ path: out });
  // Measured on the saved PNG (the WebGL canvas itself reads back cleared),
  // in the middle of the frame where the seal is and the HUD is not.
  const crop = { left: Math.round(width * 0.35), top: Math.round(height * 0.45), width: Math.round(width * 0.3), height: Math.round(height * 0.2) };
  const scale = mobile ? 2 : 1;
  const region = Object.fromEntries(Object.entries(crop).map(([k, v]) => [k, v * scale]));
  const { channels } = await sharp(out).extract(region).stats();
  const spread = Math.max(...channels.slice(0, 3).map((c) => c.max - c.min));
  const blank = spread < 24 ? `flat frame (channel spread ${spread})` : null;
  console.log(JSON.stringify({ out, url, width, height, blank, errors: errors.slice(0, 8) }));
  if (blank) process.exitCode = 1;
} finally {
  await browser.close();
}
