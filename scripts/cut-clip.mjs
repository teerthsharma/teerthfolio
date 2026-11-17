/* global window */
// node scripts/cut-clip.mjs <dock> <from> <to> <out.gif|out.webp> [fps=24] [width=640] [extraQuery] : a moving clip, one seek per frame
import sharp from "sharp";
import { launchChrome } from "./cut-cap.mjs";
import { withGpuLock } from "./cut-lock.mjs";
import { cutUrl, closeServe } from "./cut-serve.mjs";

const [dock, from, to, out, fps = "24", width = "640", extra = ""] = process.argv.slice(2);
if (!dock || !out) throw new Error("usage: cut-clip.mjs <dock> <from> <to> <out.gif|out.webp> [fps] [width] [extraQuery]");
const n = Math.round((Number(to) - Number(from)) * Number(fps)), w = Number(width), h = Math.round((w * 9) / 16);

const frames = await withGpuLock(`cut-clip ${dock}`, async () => {
  const browser = await launchChrome();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    await page.goto(await cutUrl(dock, `t=${from}&paused${extra ? "&" + extra : ""}`), { waitUntil: "load", timeout: 180000 });
    await page.waitForFunction(() => window.__cut, null, { timeout: 120000 });
    await page.addStyleTag({ content: "nav,button{display:none!important}" });
    const shots = [];
    for (let i = 0; i < n; i++) {
      await page.evaluate((s) => window.__cut.seek(s), Number(from) + i / Number(fps));
      await page.waitForTimeout(i ? 60 : 900);
      shots.push(await sharp(await page.screenshot()).resize(w, h).toBuffer());
    }
    return shots;
  } finally { await browser.close(); }
});
const anim = sharp(frames, { join: { animated: true } });
// one delay per frame: a single number only times the first frame, and viewers then play the rest at their default speed
const delay = new Array(frames.length).fill(Math.round(1000 / Number(fps)));
await (out.endsWith(".webp") ? anim.webp({ quality: 72, delay, loop: 0 }) : anim.gif({ delay, loop: 0, effort: 4, keepDuplicateFrames: true })).toFile(out);
console.log(`CLIP ${out}  (${n} frames at ${fps} fps, ${w}x${h})`);
await closeServe?.();
process.exit(0);
