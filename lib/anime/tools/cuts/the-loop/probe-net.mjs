/* global process */
// node lib/anime/tools/cuts/the-loop/probe-net.mjs [to=25]
// Plays the-loop once in real Chrome, from 0 to `to` s, under the GPU lock, and prints every response with status 400 or more, every console error and every page error with its URL.
import { launchChrome } from "../../../../../scripts/cut-cap.mjs";
import { withGpuLock } from "../../../../../scripts/cut-lock.mjs";
import { cutUrl, closeServe } from "../../../../../scripts/cut-serve.mjs";

const to = Number(process.argv[2] ?? 25);
if (!Number.isFinite(to) || to <= 0) {
  console.log("usage: probe-net.mjs [to=25]");
  process.exit(2);
}

const seen = [];
let played = 0;
await withGpuLock(`probe-net the-loop pid ${process.pid}`, async () => {
  const browser = await launchChrome();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    page.on("response", (r) => { if (r.status() >= 400) seen.push(`response ${r.status()} ${r.request().method()} ${r.url()}`); });
    page.on("console", (m) => { if (m.type() === "error") seen.push(`console ${m.text().slice(0, 200)} @ ${m.location().url || "(no url)"}`); });
    page.on("pageerror", (e) => seen.push(`pageerror ${String(e).slice(0, 200)}`));
    await page.goto(await cutUrl("the-loop", "t=0&paused"), { waitUntil: "load", timeout: 180000 });
    await page.waitForFunction(() => window.__cut, null, { timeout: 120000 });
    await page.waitForTimeout(900);
    const loadEntries = seen.length;
    await page.evaluate(() => { window.__cut.seek(0); window.__cut.play(); });
    await page.waitForFunction((end) => window.__cut.player.t >= end, to, { timeout: 300000, polling: 200 });
    await page.waitForTimeout(1500);
    played = await page.evaluate(() => window.__cut.player.t);
    console.log(`load entries ${loadEntries}`);
  } finally {
    await browser.close();
  }
});
console.log(`probe-net the-loop 0 to ${to} s (clock reached ${played.toFixed(2)} s): ${seen.length} entries`);
for (const s of seen) console.log(s);
closeServe();
process.exit(0);
