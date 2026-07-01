import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const url = process.argv[2] || "http://localhost:3000/?qa-sdf=1";
const width = Number(process.argv[3]) || 1440;
const height = Number(process.argv[4]) || 900;
const outDir = path.resolve("verification/screenshots-super-igloo");
const outFile = path.join(outDir, `desktop-igloo-v3-${width}x${height}.png`);

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
const page = await context.newPage();

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(3000);

await page.screenshot({ path: outFile, fullPage: false });
console.log(`Screenshot saved: ${outFile}`);
await browser.close();
