/* global console */

import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  deviceScaleFactor: 1,
  viewport: { height: 1000, width: 1600 },
});
const logs = [];
page.on("console", (message) => {
  if (["error", "warning"].includes(message.type())) {
    logs.push(`${message.type()}: ${message.text()}`);
  }
});
page.on("pageerror", (error) => logs.push(`pageerror: ${error.message}`));
await page.goto("http://127.0.0.1:3000/?qa-sdf=1&qa=home-medium", {
  waitUntil: "domcontentloaded",
});
await page.waitForSelector('#world[data-render-enabled="true"]', { timeout: 25_000 });
await page.waitForTimeout(4_000);
await page.screenshot({ path: ".verification/canonical-home-camera-v5-medium.png" });
console.log(
  JSON.stringify({
    logs,
    proximity: await page.locator("#world").getAttribute("data-station-proximity"),
    station: await page.locator("#world").getAttribute("data-proximity-station"),
  }),
);
await browser.close();
