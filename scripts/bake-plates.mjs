// node scripts/bake-plates.mjs [--docks a,b] [--out public/plates] [--max-minutes 8] [--dry-run]
// Bakes one background plate (layer 0 only: no cast, no fx, no seal) per camera-still shot of each live dock, in real Chrome under withGpuLock. Resumable through manifest.json.
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { launchChrome } from "./cut-cap.mjs";
import { withGpuLock } from "./cut-lock.mjs";
import { cutUrl } from "./cut-serve.mjs";
import { ENGINE_LIVE } from "../lib/anime/live.js";
import { compileShots } from "../lib/anime/cutscenes/framework/director.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VIEW = { width: 1280, height: 720 };
const PORT = "3811";
const argv = process.argv.slice(2);
const opt = (name, def) => { const i = argv.indexOf(name); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : def; };
const DRY = argv.includes("--dry-run");
const docks = opt("--docks", [...ENGINE_LIVE].join(",")).split(",").map((s) => s.trim()).filter(Boolean);
const outDir = path.resolve(ROOT, opt("--out", "public/plates"));
const maxMs = Number(opt("--max-minutes", "8")) * 60e3;
const manifestFile = path.join(outDir, "manifest.json");
const rel = (f) => path.relative(ROOT, f).replace(/\\/g, "/");

if (!(maxMs > 0)) throw new Error("--max-minutes must be a positive number");

async function planDock(dock) {
  const scene = (await import(pathToFileURL(path.join(ROOT, "lib/anime/cutscenes", dock, "scene.js")).href)).default;
  return compileShots(scene, () => {}).map((s) => ({
    i: s.i, n: s.n, law: s.law, t0: s.t0, t1: s.t1, t: (s.t0 + s.t1) / 2,
    still: s.hold || !s.moving, // hold freezes the camera; otherwise the engine re-keys the plate per frame only when moving
  }));
}

function readManifest() {
  return existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, "utf8")) : {};
}

function writeManifest(m) {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(`${manifestFile}.tmp`, JSON.stringify(m, null, 1));
  renameSync(`${manifestFile}.tmp`, manifestFile);
}

let browser = null;

async function shoot(dock, shot, file) {
  return withGpuLock(`bake-plates ${dock} shot ${shot.i} pid ${process.pid}`, async () => {
    browser ??= await launchChrome();
    const page = await browser.newPage({ viewport: VIEW, deviceScaleFactor: 1 });
    try {
      await page.goto(await cutUrl(dock, `t=${shot.t.toFixed(3)}&paused`, PORT), { waitUntil: "load", timeout: 180000 });
      await page.waitForFunction(() => window.__cut, null, { timeout: 120000 });
      const png = await page.evaluate((t) => {
        const c = window.__cut, p = c.player;
        c.seek(t);
        const cast = (p.built?.group?.children ?? []).filter((g) => g.name === "cast" || g.name === "fx");
        for (const g of [p.seal?.group, ...cast]) if (g) g.visible = false;
        c.engine.composer.reset();
        return c.grab().png;
      }, shot.t);
      writeFileSync(file, Buffer.from(png.split(",")[1], "base64"));
      return statSync(file).size;
    } finally {
      await page.close();
    }
  });
}

async function main() {
  const plans = {};
  for (const dock of docks) plans[dock] = await planDock(dock);
  if (DRY) {
    let held = 0, moving = 0;
    for (const dock of docks) {
      const list = plans[dock];
      held += list.filter((s) => s.still).length;
      moving += list.filter((s) => !s.still).length;
      console.log(`${dock}: ${list.length} shots, ${list.filter((s) => s.still).length} held (bake), ${list.filter((s) => !s.still).length} moving (skip)`);
      for (const s of list) {
        const file = rel(path.join(outDir, dock, `${s.i}.png`));
        console.log(`  ${String(s.i).padStart(2)}  n=${String(s.n).padEnd(2)} ${s.law.padEnd(5)} ${s.t0.toFixed(2).padStart(6)}-${s.t1.toFixed(2).padEnd(6)} mid ${s.t.toFixed(2).padStart(6)}  ${s.still ? "bake" : "skip (moving)"}  ${file}`);
      }
    }
    console.log(`DRY RUN ${held} to bake, ${moving} skipped, ${docks.length} docks`);
    return 0;
  }

  const manifest = readManifest();
  for (const dock of docks) {
    manifest[dock] ??= {};
    for (const s of plans[dock]) if (!s.still) manifest[dock][s.i] = { file: null, bytes: 0, t: s.t, status: "skipped" };
  }
  writeManifest(manifest);

  const start = Date.now();
  let baked = 0, stopped = false;
  try {
    outer: for (const dock of docks) {
      for (const s of plans[dock].filter((x) => x.still)) {
        const file = path.join(outDir, dock, `${s.i}.png`), prev = manifest[dock][s.i];
        if (prev?.status === "done" && existsSync(file)) continue;
        if (Date.now() - start >= maxMs) { stopped = true; break outer; }
        mkdirSync(path.dirname(file), { recursive: true });
        try {
          const bytes = await shoot(dock, s, file);
          manifest[dock][s.i] = { file: `${dock}/${s.i}.png`, bytes, t: s.t, status: "done" };
          baked++;
          console.log(`OK ${dock} ${s.i} t=${s.t.toFixed(2)} ${bytes} bytes`);
        } catch (e) {
          if (browser && !browser.isConnected()) browser = null;
          const error = String(e).slice(0, 300);
          manifest[dock][s.i] = { file: null, bytes: 0, t: s.t, status: "failed", error };
          console.log(`FAILED ${dock} ${s.i} ${error}`);
        }
        writeManifest(manifest);
      }
    }
  } finally {
    await browser?.close().catch(() => {});
    browser = null;
  }

  let remaining = 0, failed = 0, skipped = 0;
  for (const dock of docks) {
    for (const s of plans[dock]) {
      const st = manifest[dock][s.i]?.status;
      if (!s.still) skipped++;
      else if (st === "failed") failed++;
      else if (!(st === "done" && existsSync(path.join(outDir, dock, `${s.i}.png`)))) remaining++;
    }
  }
  if (stopped) console.log(`STOP after ${opt("--max-minutes", "8")} min`);
  console.log(`DONE baked ${baked} remaining ${remaining} failed ${failed} skipped ${skipped}`);
  return 0;
}

main().then((code) => { process.exitCode = code; }, (e) => { console.error("bake-plates crashed:", e); process.exitCode = 1; });
