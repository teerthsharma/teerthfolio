/* global document */
// Captures one card's animated figure from teerthsharma.github.io, twice a
// couple of seconds apart, so a 3D sculpture can be judged against the 2D
// figure it retells.
//
//   node scripts/shot-landing.mjs --id pr-mujoco-3396   (upstream cards, index.html)
//   node scripts/shot-landing.mjs --id p-caustic        (lab cards, work.html)
//
// Writes verification/landing-<id>-a.png and -b.png.

import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const argv = process.argv.slice(2);
const id = argv[argv.indexOf("--id") + 1];
if (!id || id.startsWith("--")) throw new Error("usage: node scripts/shot-landing.mjs --id <card id>");
const page = id.startsWith("pr-") ? "" : "work.html";
const local = process.env.LOCALAPPDATA;
const chrome = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  local && path.join(local, "Google/Chrome/Application/chrome.exe"),
].filter(Boolean).find((c) => existsSync(c));

mkdirSync("verification", { recursive: true });
const browser = await chromium.launch({ executablePath: chrome, headless: true });
try {
  const tab = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  await tab.goto(`https://teerthsharma.github.io/${page}#${id}`, { waitUntil: "networkidle" });
  const card = tab.locator(`#${id}`);
  await card.scrollIntoViewIfNeeded();
  await tab.evaluate((cid) => document.getElementById(cid)?.querySelector("details")?.setAttribute("open", ""), id);
  await tab.waitForTimeout(2500);
  await card.screenshot({ path: `verification/landing-${id}-a.png` });
  await tab.waitForTimeout(2200);
  await card.screenshot({ path: `verification/landing-${id}-b.png` });
  console.log(JSON.stringify({ id, out: [`verification/landing-${id}-a.png`, `verification/landing-${id}-b.png`] }));
} finally {
  await browser.close();
}
