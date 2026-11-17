/* global window, document */
// node scripts/tool-sheet.mjs [--pack <name>] [--port 3811]
// One contact sheet per shader pack: verification/shaders/<pack>.jpg, 8 tiles across, each labelled with the tool name.
// Each tool with a demo is opened at /lab/anime?tool=<registry name>&pack=<pack>&paused (ToolLab loads the pack through
// lib/anime/tools/packs.js), real Chrome, one GPU run at a time (cut-lock.mjs). Tools without a demo get a grey tile,
// tools that fail to compile or to draw a dark red one. Needs the dev server on --port and lib/anime/tools/catalog.json
// (node scripts/shader-catalog.mjs).
import sharp from "sharp";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { withGpuLock } from "./cut-lock.mjs";
import { contactSheet, launchChrome } from "./cut-cap.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TW = 240, TH = 135, COLS = 8;
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

async function labelled(input, label, w = TW, h = TH) {
  const base = input ?? { create: { width: w, height: h, channels: 3, background: "#555" } };
  const text = label.length > 36 ? label.slice(0, 35) + "~" : label;
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="${w}" height="17" fill="rgba(0,0,0,0.72)"/>`
    + `<text x="4" y="12" font-family="Arial, sans-serif" font-size="11" fill="#fff">${esc(text)}</text></svg>`;
  return sharp(base).resize(w, h).composite([{ input: Buffer.from(svg) }]).png().toBuffer();
}

async function sheetFor(pack, recs, page, port, tmp) {
  const files = [];
  let ok = 0, nodemo = 0, failed = 0;
  for (const [i, r] of recs.entries()) {
    const file = path.join(tmp, `${pack}-${i}.png`), label = r.sub ? `${r.sub}/${r.name}` : r.name;
    let tile = null, color = "#555";
    if (!r.hasDemo) nodemo++;
    else if (r.compiles === false) { failed++; color = "#5a1d1d"; console.log(`FAILED ${pack} ${r.name}: did not compile (${r.error})`); }
    else {
      try {
        await page.goto(`http://localhost:${port}/lab/anime?tool=${encodeURIComponent(r.pull ?? r.name)}&pack=${pack}&paused`, { waitUntil: "load", timeout: 180000 });
        await page.waitForFunction(() => window.__anime, null, { timeout: 120000 });
        await page.addStyleTag({ content: "nav{display:none!important}" });
        await page.evaluate(() => window.__anime.seek(1.5));
        await page.waitForTimeout(250);
        const bad = await page.evaluate(() => /failed:/.test(document.body.innerText));
        if (bad) throw new Error("ToolLab reports a compile failure");
        tile = await page.screenshot({ type: "png" });
        ok++;
      } catch (e) { failed++; color = "#5a1d1d"; tile = null; console.log(`FAILED ${pack} ${r.name}: ${String(e).slice(0, 200)}`); }
    }
    const base = tile ?? { create: { width: TW, height: TH, channels: 3, background: color } };
    await sharp(await labelled(base, label)).toFile(file);
    files.push(file);
  }
  if (!files.length) return { ok, nodemo, failed, sheet: "" };
  mkdirSync(path.join(ROOT, "verification/shaders"), { recursive: true });
  const sheet = path.join(ROOT, `verification/shaders/${pack}.jpg`);
  await contactSheet(files, sheet, TW, TH, COLS);
  return { ok, nodemo, failed, sheet };
}

async function main(args) {
  const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : def; };
  const only = opt("--pack"), port = opt("--port", "3811");
  const cat = JSON.parse(readFileSync(path.join(ROOT, "lib/anime/tools/catalog.json"), "utf8"));
  const packs = [...new Set(cat.map((r) => r.pack))].filter((p) => !only || p === only);
  if (!packs.length) throw new Error(`no such pack: ${only}`);
  const tmp = mkdtempSync(path.join(os.tmpdir(), "tool-sheet-"));
  let failed = 0;
  try {
    await withGpuLock(`tool-sheet ${only ?? "all"} pid ${process.pid}`, async () => {
      const browser = await launchChrome();
      try {
        const page = await browser.newPage({ viewport: { width: 480, height: 270 }, deviceScaleFactor: 1 });
        for (const pack of packs) {
          const r = await sheetFor(pack, cat.filter((x) => x.pack === pack), page, port, tmp);
          failed += r.failed;
          console.log(`SHEET ${r.sheet || "(none)"}  ${pack}: ${r.ok} drawn, ${r.nodemo} without a demo, ${r.failed} failed`);
        }
      } finally { await browser.close(); }
    });
  } finally { rmSync(tmp, { recursive: true, force: true }); }
  return failed;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then((f) => { process.exitCode = f ? 1 : 0; }, (e) => { console.log(`tool-sheet: ${e.message}`); process.exitCode = 1; });
}
