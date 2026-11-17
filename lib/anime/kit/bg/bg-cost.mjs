/* global window */
// node lib/anime/kit/bg/bg-cost.mjs "<gal>,<gal>" "<tier>,<tier>"  : per gallery frame and tier, draw calls, triangles, programs and GPU ms per frame
// (real Chrome behind the shared GPU lock, as cut-cap.mjs). Prints one line per run and a table.
import { chromium } from "playwright";
import { launchChrome } from "../../../../scripts/cut-cap.mjs";
import { withGpuLock } from "../../../../scripts/cut-lock.mjs";
import { closeServe, cutUrl } from "../../../../scripts/cut-serve.mjs";

const gals = (process.argv[2] ?? "shibuya,day,throne,hall").split(","), tiers = (process.argv[3] ?? "1,3").split(",");
void chromium;
await withGpuLock("bg-cost", async () => {
  const browser = await launchChrome();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const rows = [];
  for (const gal of gals) for (const tier of tiers) {
    const t0 = Date.now();
    await page.goto(await cutUrl("_bg", `t=1&paused&gal=${gal}&tier=${tier}&gpu`), { waitUntil: "load", timeout: 180000 });
    await page.waitForFunction(() => window.__cut, null, { timeout: 180000 });
    const loadMs = Date.now() - t0;
    await page.evaluate(() => window.__cut.seek(1)); await page.waitForTimeout(800);
    const r = await page.evaluate(() => {
      const { engine, player } = window.__cut, info = engine.renderer.info; info.autoReset = false;
      const ms = [];
      for (let i = 0; i < 12; i++) { info.reset(); const a = performance.now(); player.draw(player.t + i * 1e-4, 0); engine.renderer.getContext().finish(); ms.push(performance.now() - a); if (i === 11) var c = { calls: info.render.calls, tris: info.render.triangles }; }
      ms.sort((x, y) => x - y);
      return { ...c, programs: info.programs?.length, textures: info.memory.textures, geometries: info.memory.geometries, drawMs: +ms[6].toFixed(1), gpu: engine.composer.gpu && Object.fromEntries(Object.entries(engine.composer.gpu.ms).map(([k, v]) => [k, +v.toFixed(2)])) };
    });
    rows.push({ gal, tier, loadMs, ...r });
    console.log(JSON.stringify(rows.at(-1)));
  }
  await browser.close();
  console.log("\n| frame | tier | load s | draw calls | triangles | programs | textures | draw ms (cpu+finish) |\n|---|---|---|---|---|---|---|---|");
  for (const r of rows) console.log(`| ${r.gal} | ${r.tier} | ${(r.loadMs / 1000).toFixed(1)} | ${r.calls} | ${r.tris} | ${r.programs} | ${r.textures} | ${r.drawMs} |`);
});
closeServe();
process.exit(0);
