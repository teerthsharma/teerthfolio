/* global window, document */
// FRAME AUDIT: plays every APPROVED dock cutscene in real Chrome against a
// production build (npm run build && npm start -- -p 3190) and samples the
// pup's screen box every 0.5 s through window.__frame (FrameGuard.jsx, exposed
// by ?debug=frame). A dock fails if more than 10% of its samples leave the
// safe zone: box inside the viewport with a 4% margin, height 16-55% of the
// viewport, clear of every bubble and the credit card. Samples on a beat the
// card exempts (card.frame) are skipped. Each dock also reports the raw
// violation rate, the same test on the camera before the guard corrects it.
//
//   node scripts/frame-audit.mjs [--url http://localhost:3190] [--only p-tangle,p-faraday]
//                                [--w 1024] [--h 768] [--par 3] [--guard off]
//
// `--guard off` audits the unguarded cameras (what shipped before FrameGuard).
// Exit code 1 if any dock fails. Slow (about 30 s a dock): not part of `npm run check`.

import { existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { APPROVED } from "../lib/world/cutscene/timeline.js";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, token, i, all) => {
    if (token.startsWith("--")) pairs.push([token.slice(2), all[i + 1]?.startsWith("--") ? true : all[i + 1] ?? true]);
    return pairs;
  }, []),
);
const base = args.url || "http://localhost:3190";
const W = Number(args.w || 1024);
const H = Number(args.h || 768);
const PAR = Number(args.par || 3);
const ids = args.only ? String(args.only).split(",") : [...APPROVED];
const local = process.env.LOCALAPPDATA;
const exe = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  local && path.join(local, "Google/Chrome/Application/chrome.exe"),
].filter(Boolean).find((p) => existsSync(p));

const browser = await chromium.launch({ executablePath: exe, headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });

async function audit(id) {
  const page = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage();
  try {
    await page.goto(`${base}/?spawn=${id}&debug=frame${args.guard === "off" ? "&guard=off" : ""}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__world?.ready, null, { timeout: 90000 });
    await page.waitForTimeout(2200); // past the 1.5 s "spawn beside it" rule
    await page.keyboard.press("Escape"); // a panel left open holds the arrival back
    await page.evaluate(() => {
      const L = window.__world.live;
      L.seen.clear();
      window.__fs = { samples: [], id: null };
      const box = (a) => ({ x0: a.left / innerWidth, x1: a.right / innerWidth, y0: a.top / innerHeight, y1: a.bottom / innerHeight });
      const bad = (b, skipSmall) => {
        if (!b.ok) return "no pup";
        if (b.x0 < 0.04 || b.x1 > 0.96 || b.y0 < 0.04 || b.y1 > 0.96) return "edge";
        const f = b.y1 - b.y0 < 0 ? 0 : b.f;
        if (f > 0.55) return "big";
        if (f < 0.16 && !skipSmall) return "small";
        for (const el of document.querySelectorAll(".bubble, .comic-credit")) {
          const r = box(el.getBoundingClientRect());
          if (r.x1 > b.x0 && r.x0 < b.x1 && r.y1 > b.y0 && r.y0 < b.y1) return "bubble";
        }
        return null;
      };
      setInterval(() => {
        const f = window.__frame;
        if (L.arrival.id) window.__fs.id = L.arrival.id;
        if (!f || !L.arrival.id || !f.active) return;
        window.__fs.samples.push({ t: +(performance.now() / 1000).toFixed(1), beat: f.beat, exempt: !f.on, post: bad(f.post, f.allowSmall), raw: bad(f.raw, f.allowSmall), f: +f.post.f.toFixed(2), fading: f.fading, flip: f.flip });
      }, 500);
    });
    await page.waitForFunction(() => window.__fs.id !== null, null, { timeout: 15000 }).catch(() => {});
    const started = await page.evaluate(() => window.__fs.id);
    if (started !== id) return { id, pass: false, note: started ? `played ${started}` : "arrival never started" };
    await page.waitForFunction(() => !window.__world.live.arrival.id, null, { timeout: 90000 });
    const s = await page.evaluate(() => window.__fs.samples.filter((x) => !x.exempt));
    if (args.verbose) console.log(id, JSON.stringify(s.map((x) => [x.beat, x.f, x.post, x.flip])));
    const n = s.length || 1;
    const post = s.filter((x) => x.post);
    const rawBad = s.filter((x) => x.raw);
    const why = {};
    for (const x of post) why[x.post] = (why[x.post] || 0) + 1;
    return { id, n: s.length, post: post.length / n, raw: rawBad.length / n, why, pass: s.length > 4 && post.length / n <= 0.1, fades: Math.max(0, ...s.map((x) => x.fading)) };
  } catch (e) {
    return { id, pass: false, note: String(e.message).slice(0, 80) };
  } finally {
    await page.context().close();
  }
}

const results = [];
const queue = [...ids];
await Promise.all(Array.from({ length: PAR }, async () => {
  for (let id; (id = queue.shift()); ) results.push(await audit(id));
}));
await browser.close();
results.sort((a, b) => a.id.localeCompare(b.id));
const pct = (x) => (x == null ? "  -  " : `${(x * 100).toFixed(0).padStart(3)}% `);
console.log(`frame audit ${W}x${H}${args.guard === "off" ? " (guard off)" : ""}\ndock                          samples  outside  raw(unguarded)  result`);
for (const r of results) {
  console.log(`${r.id.padEnd(30)}${String(r.n ?? "-").padStart(5)}    ${pct(r.post)}   ${pct(r.raw)}          ${r.pass ? "PASS" : "FAIL"} ${r.note ?? JSON.stringify(r.why ?? {})}`);
}
const failed = results.filter((r) => !r.pass);
console.log(`${results.length - failed.length}/${results.length} docks pass`);
process.exit(failed.length ? 1 : 0);
