/* global window */
// node scripts/cut-cap.mjs --out <dir> --tag <name> --shots "dock@t[@extraQuery],..." [--port 3811] [--size 1280x720]
// node scripts/cut-cap.mjs --sbs <out.jpg> <imageA> <imageB> [<imageC>]   (equal height, thin gap: BEFORE | AFTER | ref)
// Stills as _cap.mjs takes them (real Chrome, NVIDIA adapter pinned, lab nav hidden), one GPU run at a time (cut-lock.mjs).
import { chromium } from "playwright";
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { BASE_FLAGS, adapterFlags } from "./gpu-adapter.mjs";
import { withGpuLock } from "./cut-lock.mjs";
import { cutUrl } from "./cut-serve.mjs";

export const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

export async function launchChrome() {
  // strict: the NVIDIA adapter (GPU1) is pinned or the capture stops; never a silent fall back to the Intel iGPU
  const gpu = await adapterFlags(chromium, CHROME, "nvidia");
  if (!gpu.length) throw new Error("NVIDIA adapter not pinned: refusing to capture on another GPU");
  return chromium.launch({ executablePath: CHROME, headless: true, args: [...BASE_FLAGS, ...gpu] });
}

export async function contactSheet(inputs, file, w, h, cols = 3) {
  const rows = Math.ceil(inputs.length / cols);
  const comps = await Promise.all(inputs.map(async (f, i) => ({ input: await sharp(f).resize(w, h).toBuffer(), left: (i % cols) * w, top: Math.floor(i / cols) * h })));
  await sharp({ create: { width: cols * w, height: rows * h, channels: 3, background: "#000" } }).composite(comps).jpeg({ quality: 88 }).toFile(file);
}

export async function sideBySide(out, files, gap = 6) {
  const h = Math.min(...(await Promise.all(files.map((f) => sharp(f).metadata()))).map((m) => m.height));
  const parts = await Promise.all(files.map((f) => sharp(f).resize({ height: h }).toBuffer({ resolveWithObject: true })));
  let left = 0;
  const comps = parts.map(({ data, info }) => { const c = { input: data, left, top: 0 }; left += info.width + gap; return c; });
  await sharp({ create: { width: left - gap, height: h, channels: 3, background: "#202020" } }).composite(comps).toFile(out);
  return { width: left - gap, height: h };
}

async function capture({ out, tag, shots, port, size }) {
  const [W, H] = size.split("x").map(Number);
  mkdirSync(out, { recursive: true });
  const tiles = [];
  let failed = 0;
  const browser = await launchChrome();
  try {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    let errs = [];
    page.on("pageerror", (e) => errs.push("pageerror: " + String(e).slice(0, 400)));
    page.on("console", (m) => { const s = m.text(); if (m.type() === "error" && !/cloudflareinsights|net::ERR_FAILED/.test(s)) errs.push("console: " + s.slice(0, 600)); });
    for (const spec of shots.split(",").map((s) => s.trim()).filter(Boolean)) {
      const [dock, t, extra = ""] = spec.split("@");
      const file = `${out}/${tag}-${dock}-${t}${extra ? "-" + extra.replace(/[^a-z0-9]+/gi, "_") : ""}.png`;
      // a hot reload between the wait and the seek removes window.__cut: retry, and keep the sheet aligned on a final failure
      for (let attempt = 1; ; attempt++) {
        errs = [];
        try {
          await page.goto(await cutUrl(dock, `t=${t}&paused${extra ? "&" + extra : ""}`, port), { waitUntil: "load", timeout: 180000 });
          await page.waitForFunction(() => window.__cut, null, { timeout: 120000 });
          await page.addStyleTag({ content: "nav{display:none!important}" });
          await page.evaluate(() => document.querySelectorAll("button").forEach((b) => { if (b.textContent === "Skip") b.style.display = "none"; }));
          await page.evaluate((s) => window.__cut.seek(s), Number(t));
          await page.waitForTimeout(900);
          const st = await page.evaluate(() => ({ ...window.__cut.stats(), errors: window.__cut.player.errors.map((e) => `${e.layer}: ${String(e.message).slice(0, 160)}`) }));
          await page.screenshot({ path: file });
          console.log("OK", dock, t, extra, JSON.stringify({ adapter: st.adapter?.slice(0, 48), tier: st.tier, p50ms: st.p50?.toFixed(1), gpu: st.gpu, layerErrors: st.errors }));
          break;
        } catch (e) {
          if (attempt < 3 && !/timeout/i.test(String(e))) continue; // a timeout is a dead page, not a reload: retrying it only holds the GPU slot
          failed++; console.log("FAILED", dock, t, extra, String(e).slice(0, 300));
          await sharp({ create: { width: W, height: H, channels: 3, background: "#300" } }).png().toFile(file);
          break;
        }
      }
      tiles.push(file);
      if (errs.length) console.log("  ERRORS " + dock + ":\n   " + [...new Set(errs)].slice(0, 6).join("\n   "));
    }
  } finally {
    await browser.close();
  }
  if (tiles.length) {
    await contactSheet(tiles, `${out}/${tag}-sheet.jpg`, Math.round(W / 2), Math.round(H / 2));
    console.log(`SHEET ${out}/${tag}-sheet.jpg  (${tiles.length} tiles, ${failed} failed, row-major, 3 across, in the order given)`);
  }
  return failed;
}

async function main(args) {
  const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : def; };
  if (args[0] === "--sbs") {
    const [out, ...inputs] = args.slice(1);
    if (!out || inputs.length < 2 || inputs.length > 3) throw new Error("usage: --sbs <out.jpg> <imageA> <imageB> [<imageC>]");
    const { width, height } = await sideBySide(out, inputs);
    console.log(`SBS ${out}  (${width}x${height}, ${inputs.map((f) => path.basename(f)).join(" | ")})`);
    return 0;
  }
  const o = { out: opt("--out"), tag: opt("--tag"), shots: opt("--shots"), port: opt("--port", "3811"), size: opt("--size", "1280x720") };
  if (!o.out || !o.tag || !o.shots || !/^\d+x\d+$/.test(o.size)) throw new Error("usage: --out <dir> --tag <name> --shots \"dock@t[@extraQuery],...\" [--port 3811] [--size 1280x720]");
  return withGpuLock(`cut-cap ${o.tag} pid ${process.pid}`, () => capture(o));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then((failed) => { process.exitCode = failed ? 1 : 0; }, (e) => { console.log(`cut-cap: ${e.message}`); process.exitCode = 1; });
}
