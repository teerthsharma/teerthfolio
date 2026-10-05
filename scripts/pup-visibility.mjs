/* global window, document, sessionStorage, innerWidth, innerHeight, Image */
// PUP VISIBILITY: plays every APPROVED cutscene (and the island follow) in real Chrome at 1280x800 against a
// production build, samples the pup every 0.25 s through window.__frame (FrameGuard.jsx, ?debug=frame) and saves a
// frame every 1 s. A dock FAILS when, outside the establishing wide (the hand-back home IS judged), the pup's body is
//   - under 12% of the frame height (on the arc out of the wide: under the arc's own rising floor), or off
//     screen, for any sample, or
//   - occluded (the centre ray from the eye hits an opaque mesh, or a bubble covers the body box) for over 0.5 s, or
//   - a foreground mesh nearer than the pup covers over 15% of the frame (FrameGuard's 24-ray grid) for over 0.5 s, or
//   - a saved frame is over 60% one flat colour (blank sky, blank pocket), or the eye is under the pup's eye + 1.5 m
//     on the island.
//
//   node scripts/pup-visibility.mjs [--url http://localhost:3450] [--only p-caustic,p-faraday] [--out dir] [--par 2]
//
// Exit 1 if any dock fails. Writes <out>/<id>/<s>.png and <out>/report.json.
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { APPROVED, arrivalLength } from "../lib/world/cutscene/timeline.js";
import { CARDS } from "../lib/world/cutscene/cards/index.js";

const arg = (k, d) => (process.argv.includes(`--${k}`) ? process.argv[process.argv.indexOf(`--${k}`) + 1] : d);
const base = arg("url", "http://localhost:3450").replace(/\/$/, "");
const only = arg("only");
const out = arg("out", "verification/pup");
const PAR = Number(arg("par", 2));
const MIN_F = 0.12;
const OCC_S = 0.5;
const ids = [...APPROVED, "island"].filter((id) => !only || only.split(",").includes(id));

const browser = await chromium.launch({ channel: "chrome", args: ["--ignore-gpu-blocklist", "--enable-gpu-rasterization"] });

const sampler = () => {
  const L = window.__world.live;
  window.__pv = [];
  const t0 = performance.now();
  setInterval(() => {
    const f = window.__frame;
    if (!f) return;
    const p = f.post;
    let bubble = false;
    for (const el of document.querySelectorAll(".bubble, .comic-credit")) {
      const r = el.getBoundingClientRect();
      const b = { x0: r.left / innerWidth, x1: r.right / innerWidth, y0: r.top / innerHeight, y1: r.bottom / innerHeight };
      // covered: the bubble hides the middle of the body box
      const mx = (p.x0 + p.x1) / 2;
      const my = (p.y0 + p.y1) / 2;
      if (mx > b.x0 && mx < b.x1 && my > b.y0 && my < b.y1) bubble = true;
    }
    const onScreen = p.ok && p.x1 > 0.02 && p.x0 < 0.98 && p.y1 > 0.02 && p.y0 < 0.98;
    window.__pv.push({ t: +((performance.now() - t0) / 1000).toFixed(2), id: L.arrival.id, phase: f.active ? f.phase : "island", f: p.ok ? +p.f.toFixed(3) : 0, floor: f.floor, on: onScreen, occ: f.occ, bubble, comp: f.composing, hidden: f.hidden, fg: f.fg, low: !f.inStage && f.eyeY < 2.05 });
  }, 250);
};

async function run(id) {
  const dir = `${out}/${id}`;
  mkdirSync(dir, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 120)));
  const as = CARDS.find((c) => c.id === id)?.plays ?? id;
  try {
    await page.goto(`${base}/?play${id === "island" ? "" : `&spawn=${id}`}&debug=frame`, { waitUntil: "load" });
    await page.waitForFunction(() => window.__world?.ready && window.__world?.live && window.__replay, null, { timeout: 90000 });
    await page.evaluate(() => sessionStorage.removeItem("seal:seen"));
    await page.waitForTimeout(1500);
    let len = 12;
    if (id !== "island") {
      const already = await page.evaluate((i) => window.__world.live.arrival.id === i, as);
      if (!already) await page.evaluate((i) => window.__replay(i), id);
      len = arrivalLength(as) || 30;
    }
    await page.evaluate(sampler);
    const t0 = Date.now();
    const flats = [];
    for (let s = 0; s <= Math.ceil(len) + 1; s++) {
      await page.waitForTimeout(Math.max(0, s * 1000 - (Date.now() - t0)));
      const buf = await page.screenshot({ path: `${dir}/${String(s).padStart(2, "0")}.png` });
      const phase = await page.evaluate(() => (window.__frame?.active ? window.__frame.phase : "island"));
      flats.push({ s, phase, share: await page.evaluate(flatShare, buf.toString("base64")) });
    }
    const pv = await page.evaluate(() => window.__pv);
    return judge(id, as, pv, errors, flats);
  } catch (e) {
    return { id, pass: false, note: String(e.message).split("\n")[0].slice(0, 100) };
  } finally {
    await page.close();
  }
}

// the share of the frame in its most common colour (4 bits a channel, 160 x 100), in the page
async function flatShare(b64) {
  const img = new Image();
  img.src = `data:image/png;base64,${b64}`;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = 160;
  c.height = 100;
  const g = c.getContext("2d");
  g.drawImage(img, 0, 0, 160, 100);
  const d = g.getImageData(0, 0, 160, 100).data;
  const n = new Map();
  for (let i = 0; i < d.length; i += 4) {
    const k = ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4);
    n.set(k, (n.get(k) || 0) + 1);
  }
  return Math.max(...n.values()) / 16000;
}

function judge(id, as, pv, errors, flats) {
  const scene = id === "island" ? pv : pv.filter((x) => x.id === as && x.phase !== "wide");
  // on the arc out of the wide the bar is the arc's own floor while that is under 12%
  // a cutaway: the move hides the pup's body outright (no visible coat mesh: spawn-seal's "wrong place" gag); counted, not judged
  const cutaway = scene.filter((x) => x.hidden);
  const small = scene.filter((x) => !x.hidden && (!x.on || x.f < (x.phase === "arc" ? Math.min(MIN_F, x.floor) : MIN_F)));
  let run = 0;
  let worst = 0;
  for (let i = 0; i < scene.length; i++) {
    const blocked = scene[i].occ || scene[i].bubble || scene[i].fg > 0.15;
    run = blocked ? run + (i ? Math.min(0.25, scene[i].t - scene[i - 1].t) : 0.25) : 0;
    worst = Math.max(worst, run);
  }
  const fs = scene.map((x) => x.f).sort((a, b) => a - b);
  const pct = (q) => (fs.length ? fs[Math.min(fs.length - 1, Math.floor(q * fs.length))] : 0);
  const minF = fs[0] ?? 0;
  const flat = flats.filter((x) => x.phase !== "wide" && x.share > 0.6).map((x) => `${x.s}s:${x.share.toFixed(2)}`);
  const low = scene.filter((x) => x.low).length;
  // no-pup stretches (the move hid the pup): at most 1 s
  let hid = 0;
  let hidMax = 0;
  for (let i = 0; i < scene.length; i++) {
    hid = scene[i].hidden ? hid + (i ? Math.min(0.25, scene[i].t - scene[i - 1].t) : 0.25) : 0;
    hidMax = Math.max(hidMax, hid);
  }
  const pass = (id === "island" ? scene.every((x) => x.on) : scene.length > 8 && small.length === 0) && worst <= OCC_S && !flat.length && !low && hidMax <= 1;
  const occBy = [...new Set(scene.filter((x) => x.occ).map((x) => x.occ))].slice(0, 3);
  return { id, n: scene.length, minF, p10: pct(0.1), med: pct(0.5), small: small.length, occMax: +worst.toFixed(2), composed: scene.filter((x) => x.comp).length, cutaway: cutaway.length, hidMax, flat, low, fgMax: Math.max(0, ...scene.map((x) => x.fg || 0)), occBy, errors: errors.length, pass, smallAt: small.slice(0, 4).map((x) => `${x.t}s:${x.f}`) };
}

const results = [];
const queue = [...ids];
await Promise.all(Array.from({ length: PAR }, async () => {
  for (let id; (id = queue.shift()); ) {
    const r = await run(id);
    console.log(`${r.pass ? "PASS" : "FAIL"} ${id} ${JSON.stringify(r)}`);
    results.push(r);
  }
}));
await browser.close();
results.sort((a, b) => a.id.localeCompare(b.id));
writeFileSync(`${out}/report.json`, JSON.stringify(results, null, 1));
console.log(`\npup visibility 1280x800 (min ${MIN_F * 100}% height, occluded <= ${OCC_S} s, outside the establishing wide)`);
console.log("dock                          samples  min f   p10    median  small  occ max s  composed  cutaway  flat  low eye  fg max  result");
for (const r of results) {
  console.log(`${r.id.padEnd(30)}${String(r.n ?? "-").padStart(6)}  ${(r.minF ?? 0).toFixed(2).padStart(5)}  ${(r.p10 ?? 0).toFixed(2).padStart(5)}  ${(r.med ?? 0).toFixed(2).padStart(6)}  ${String(r.small ?? "-").padStart(5)}  ${String(r.occMax ?? "-").padStart(9)}  ${String(r.composed ?? "-").padStart(8)}  ${String(r.cutaway ?? "-").padStart(7)}  ${String(r.flat?.length ?? "-").padStart(4)}  ${String(r.low ?? "-").padStart(7)}  ${(r.fgMax ?? 0).toFixed(2).padStart(6)}  ${r.pass ? "PASS" : "FAIL"} ${r.note ?? (r.occBy?.length ? "occ:" + r.occBy.join("|") : "")}`);
}
const failed = results.filter((r) => !r.pass);
console.log(`${results.length - failed.length}/${results.length} pass`);
process.exit(failed.length ? 1 : 0);
