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

import { existsSync, mkdirSync, readdirSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import os from "node:os";
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

// Many agents capture at once and they all share one integrated GPU. Past
// about three concurrent WebGL pages every capture slows to minutes, so a
// capture takes one of SLOTS lock directories first (mkdir is atomic) and
// waits for a free one. A slot older than 4 minutes belongs to a crashed run.
// Slots SLOTS.. are the land's reserved lane (see LAND below).
const SLOTS = Number(process.env.SHOT_SLOTS || 3);
// The land comes first (the owner's priority): captures of the terrain and
// the landforms also get two reserved slots the building captures never take.
const LAND = /terrain|triton|mujo|google-range|highway|xnnpack|dam|geyser|moat|floes|water|sea|sky|land|creation/i.test(out);
const LAND_SLOTS = LAND ? 2 : 0;
const slotDir = (i) => path.join(os.tmpdir(), `teerthfolio-shot-slot-${i}`);
async function takeSlot() {
  for (;;) {
    for (let i = 0; i < SLOTS + LAND_SLOTS; i++) {
      try {
        mkdirSync(slotDir(i));
        return i;
      } catch {
        try {
          if (Date.now() - statSync(slotDir(i)).mtimeMs > 240000) rmSync(slotDir(i), { recursive: true, force: true });
        } catch {
          /* another process released or reclaimed it first */
        }
      }
    }
    if (LAND) {
      try {
        utimesSync(waitingMark, new Date(), new Date());
      } catch {
        /* the marker is recreated on the next capture */
      }
    }
    await new Promise((r) => setTimeout(r, 400));
  }
}
// Humans bow to god (the owner's rule). While a land capture is waiting for
// the GPU, or two are already running, a building capture does not queue: it
// yields at once and tells its agent to spend the time on a bug hunt and lint
// instead, then retry. Land captures announce themselves with marker files.
const TMP = os.tmpdir();
const fresh = (prefix, ms) =>
  readdirSync(TMP).filter((f) => f.startsWith(prefix)).filter((f) => {
    try {
      return Date.now() - statSync(path.join(TMP, f)).mtimeMs < ms;
    } catch {
      return false;
    }
  }).length;
const waitingMark = path.join(TMP, `teerthfolio-god-waiting-${process.pid}`);
const activeMark = path.join(TMP, `teerthfolio-god-active-${process.pid}`);
if (!LAND && (fresh("teerthfolio-god-waiting-", 15000) > 0 || fresh("teerthfolio-god-active-", 240000) >= 2)) {
  console.log(JSON.stringify({
    out,
    yielded: true,
    message: "The land (god) needs the GPU right now, so this capture yielded. Spend the next few minutes on a bug hunt instead: re-read your files for bugs, run npx eslint on them and npm run check, then retry this capture.",
  }));
  process.exit(3);
}
if (LAND) writeFileSync(waitingMark, "");
const slot = await takeSlot();
if (LAND) {
  rmSync(waitingMark, { force: true });
  writeFileSync(activeMark, "");
}
process.on("exit", () => {
  rmSync(slotDir(slot), { recursive: true, force: true });
  rmSync(waitingMark, { force: true });
  rmSync(activeMark, { force: true });
});

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
