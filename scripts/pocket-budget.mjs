/* global window, sessionStorage */
// Pocket budget (issue #10 T19/T20): per dock, draw calls and triangles that
// the stage adds over the island baseline, read from gl.info at 3 s and 8 s.
//   node scripts/pocket-budget.mjs [--url http://localhost:3372] [--only id,id]
import { chromium } from "playwright";
import { APPROVED } from "../lib/world/cutscene/timeline.js";

const arg = (k, d) => (process.argv.includes(`--${k}`) ? process.argv[process.argv.indexOf(`--${k}`) + 1] : d);
const base = arg("url", "http://localhost:3372").replace(/\/$/, "");
const only = arg("only");
const ids = [...APPROVED].filter((id) => !only || only.split(",").includes(id));
// gl.info resets on every render() and the composer renders many passes: sum one whole frame by hand
const info = () => new Promise((r) => requestAnimationFrame(() => {
  const g = window.__world.gl;
  g.info.autoReset = false;
  g.info.reset();
  requestAnimationFrame(() => { const i = g.info.render; r({ calls: i.calls, tris: i.triangles }); g.info.autoReset = true; });
}));
const browser = await chromium.launch({ channel: "chrome", args: ["--ignore-gpu-blocklist"] });
let bad = 0;
for (const id of ids) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`${base}/?play&spawn=${id}&debug`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__world?.ready && window.__world?.live && window.__replay, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const rest = await page.evaluate(info);
  await page.evaluate(() => sessionStorage.removeItem("seal:seen"));
  await page.evaluate((i) => window.__replay(i), id);
  const out = [];
  for (const at of [3, 8]) {
    await page.waitForTimeout(at === 3 ? 3000 : 5000);
    out.push(await page.evaluate(info));
  }
  const worst = out.reduce((a, b) => (b.calls > a.calls ? b : a));
  const worstT = Math.max(...out.map((o) => o.tris));
  console.log(`${id.padEnd(26)} island ${rest.calls}c/${rest.tris}t | 3s ${out[0].calls}c/${out[0].tris}t | 8s ${out[1].calls}c/${out[1].tris}t`);
  if (worst.calls > 8 || worstT > 12000) bad++;
  await page.close();
}
await browser.close();
console.log(`${ids.length - bad}/${ids.length} within 8 draws and 12k tris (island included)`);
