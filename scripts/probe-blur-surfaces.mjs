/* global document, window, getComputedStyle */
// Which elements actually blur the live world canvas during play, and how much
// of the viewport each one covers. Compositor blur cost scales with the blurred
// area and the radius, so a rule that never appears on screen is free and a
// full-width bar is not — and neither fact is visible in the stylesheet.
import { chromium } from "playwright";

const BASE = process.env.PROBE_BASE || "http://localhost:3100";
const browser = await chromium.launch({
  channel: "chrome",
  headless: false,
  args: ["--enable-gpu", "--window-position=0,0"],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 180000 });
await page.waitForTimeout(1500);
await page.locator("button", { hasText: /enter the world|start/i }).first().click().catch(() => {});
await page
  .waitForFunction(() => document.querySelector("#world")?.dataset.rendererMode === "webgl", {
    timeout: 150000,
  })
  .catch(() => {});
await page.waitForTimeout(8000);

const surfaces = await page.evaluate(() => {
  const viewport = window.innerWidth * window.innerHeight;
  const rows = [];
  for (const element of document.querySelectorAll("*")) {
    const style = getComputedStyle(element);
    const filter = style.backdropFilter || style.webkitBackdropFilter;
    if (!filter || filter === "none") continue;
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    if (style.visibility === "hidden" || style.display === "none") continue;
    if (Number(style.opacity) === 0) continue;
    // Only the part actually on screen is composited.
    const width = Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0));
    const height = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
    if (width <= 0 || height <= 0) continue;
    const radius = Number(/blur\(([\d.]+)px\)/.exec(filter)?.[1] ?? 0);
    rows.push({
      selector:
        element.tagName.toLowerCase() +
        (element.className && typeof element.className === "string"
          ? "." + element.className.trim().split(/\s+/).slice(0, 2).join(".")
          : ""),
      filter,
      radiusPx: radius,
      viewportPercent: Math.round(((width * height) / viewport) * 1000) / 10,
      // Separable blur touches roughly radius x area samples per axis, so this
      // ranks surfaces by cost rather than by size alone.
      costIndex: Math.round(((width * height) / viewport) * radius * 10) / 10,
    });
  }
  return rows.sort((a, b) => b.costIndex - a.costIndex);
});

console.log(`${surfaces.length} blurred surfaces on screen during play\n`);
let totalCost = 0;
let totalArea = 0;
for (const row of surfaces) {
  totalCost += row.costIndex;
  totalArea += row.viewportPercent;
  console.log(
    `${String(row.costIndex).padStart(7)}  ${String(row.viewportPercent).padStart(5)}% of viewport  ` +
      `blur ${String(row.radiusPx).padStart(4)}px  ${row.selector}`,
  );
}
console.log(
  `\ntotal blurred area ${Math.round(totalArea * 10) / 10}% of viewport, cost index ${Math.round(totalCost * 10) / 10}`,
);
await browser.close();
