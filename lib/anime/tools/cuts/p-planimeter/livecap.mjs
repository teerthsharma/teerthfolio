// node lib/anime/tools/cuts/p-planimeter/livecap.mjs [seconds=33]: the LIVE in-world cutscene (evilseal.si, spawn p-planimeter, __replay),
// one 640x360 frame about every 0.1 s, each stamped with the CUT second read beside the screenshot. Writes
// verification/live/p-planimeter/cut/c<milliseconds>.png and index.json [{ ms, file }].
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { launchChrome } from "../../../../../scripts/cut-cap.mjs";
import { withGpuLock } from "../../../../../scripts/cut-lock.mjs";

const ID = "p-planimeter";
const secs = Number(process.argv[2] ?? 33);
const DIR = fileURLToPath(new URL("../../../../../verification/live/p-planimeter/cut/", import.meta.url));
mkdirSync(DIR, { recursive: true });

const frames = await withGpuLock(`livecap ${ID}`, async () => {
  const browser = await launchChrome();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    await page.goto(`https://evilseal.si/?play&spawn=${ID}&debug`, { waitUntil: "load", timeout: 180000 });
    await page.waitForFunction(() => window.__world && window.__replay, null, { timeout: 180000 });
    await page.waitForTimeout(6000);
    await page.evaluate((id) => { try { sessionStorage.removeItem("seal:seen"); } catch {} window.__replay(id); }, ID);
    const shots = [];
    const t0 = Date.now();
    const cutNow = () => page.evaluate(() => {
      const w = window.__world;
      const lv = w?.live?.arrival;
      return w?.clock && lv?.id ? w.clock.elapsedTime - lv.start : null;
    });
    while ((Date.now() - t0) / 1000 < secs) {
      const before = await cutNow();
      const png = await page.screenshot();
      const after = await cutNow();
      if (before != null && after != null && before >= 0) shots.push({ cut: (before + after) / 2, spread: after - before, png });
      await page.waitForTimeout(40);
    }
    return shots;
  } finally {
    await browser.close();
  }
});

const index = [];
for (const f of frames) {
  const ms = Math.round(f.cut * 1000);
  const file = `c${ms}.png`;
  await sharp(f.png).resize(640, 360).png().toFile(`${DIR}${file}`);
  index.push({ ms, file });
}
writeFileSync(`${DIR}index.json`, JSON.stringify(index, null, 1) + "\n");
const spreads = frames.map((f) => f.spread).sort((a, b) => a - b);
console.log("frames", index.length, "cut span", index.length ? `${index[0].ms}..${index.at(-1).ms} ms` : "none", "stamp spread median", spreads.length ? (spreads[spreads.length >> 1] * 1000).toFixed(0) + " ms" : "none", "dir", DIR);
process.exit(index.length ? 0 : 1);
