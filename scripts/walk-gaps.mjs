// Frame-gap probe for the plain ?play island walk: node scripts/walk-gaps.mjs [--url ...] [--secs 20] [--adapter intel|nvidia]
import { chromium } from "playwright";
const arg = (k, d) => (process.argv.includes(`--${k}`) ? process.argv[process.argv.indexOf(`--${k}`) + 1] : d);
const base = arg("url", "http://localhost:3434");
const secs = Number(arg("secs", 20));
const keys = arg("keys", "w");
const browser = await chromium.launch({ channel: "chrome", args: ["--ignore-gpu-blocklist", "--enable-gpu-rasterization", ...(arg("adapter") ? [`--use-angle=d3d11`, `--force-gpu-mem-available-mb=4096`] : [])] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.addInitScript(() => {
  window.__gaps = [];
  let last = performance.now();
  const f = (t) => { const w = window.__world; window.__gaps.push([Math.round(t), Math.round(t - last), w?.gl ? w.gl.info.programs.length : -1, w?.gl ? w.gl.info.memory.textures : -1, w?.gl ? w.gl.info.memory.geometries : -1, w?.live ? Math.round(w.live.seal.x) + "," + Math.round(w.live.seal.z) : ""]); last = t; requestAnimationFrame(f); };
  requestAnimationFrame(f);
});
await page.goto(`${base}/?play&debug`, { waitUntil: "load" });
await page.waitForFunction(() => window.__world?.ready, null, { timeout: 60000 });
const t0 = await page.evaluate(() => performance.now());
const gpu = await page.evaluate(() => { const g = document.createElement("canvas").getContext("webgl2"); const e = g.getExtension("WEBGL_debug_renderer_info"); return g.getParameter(e.UNMASKED_RENDERER_WEBGL); });
console.log("adapter:", gpu);
await page.waitForTimeout(1500);
await page.keyboard.down(keys);
await page.waitForTimeout(secs * 1000);
await page.keyboard.up(keys);
const gaps = await page.evaluate(() => window.__gaps);
const bad = gaps.map((g, i) => [g, gaps[i - 1]]).filter(([g]) => g[1] > 100 && g[0] > t0 - 1000);
const fmt = ([[t, d, pr, tx, ge, pos], prev]) => `${t - Math.round(t0)}ms gap ${d}  prog ${prev?.[2]}->${pr} tex ${prev?.[3]}->${tx} geo ${prev?.[4]}->${ge} seal ${pos}`;
console.log("t0", Math.round(t0), "frames", gaps.length, "over100:");
for (const b of bad) console.log(fmt(b));
await browser.close();
