/* global window, document, requestAnimationFrame */
// The cutscene load gate (ARCHITECTURE-PLAN section 4, rows T1 to T19). Real Chrome on one named adapter, against a production build.
//   node scripts/cut-load.mjs --phase boot --gpu intel --runs 3        curtain lift, programs at ready, pup latency, warm table (T1 to T5)
//   node scripts/cut-load.mjs --phase arrival --dock home --gpu intel  key to the engine's first frame, arrival to first frame (T6 to T9)
//   node scripts/cut-load.mjs --phase repeat                           revalidating requests on a second visit (T16)
//   node scripts/cut-load.mjs --phase net --net slow4g                 the largest script chunk done under throttling (T15)
//   node scripts/cut-load.mjs --phase chunks [--match <text>]          gzip size of .next/static chunks, no browser (T14)
// Options: --url (default http://localhost:3114), --runs, --dock, --after-walk <s>, --query "?x", --engine-fault <id|hang>,
//   --dump-warm, --build-dir <folder> (a copy of a commit with its own .next), --out <file.json>. Every row prints the adapter string,
//   the git short HEAD and the build id.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { chromium } from "playwright";
import { withGpuLock } from "./cut-lock.mjs";
import { BASE_FLAGS, adapterFlags } from "./gpu-adapter.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RAM_NEED_GB = 3;
const RAM_WAIT_MS = 15 * 60e3;
const VIEW = { width: 1440, height: 900 };
const DPR = 2;
const NET = {
  slow4g: { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 },
  fast4g: { offline: false, latency: 70, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 },
};
const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  path.join(process.env.LOCALAPPDATA ?? "", "Google/Chrome/Application/chrome.exe"),
].find(existsSync);

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) out[argv[i].slice(2)] = true;
    else { out[argv[i].slice(2)] = next; i++; }
  }
  return out;
}
const args = parseArgs(process.argv.slice(2));
const URL_BASE = String(args.url || "http://localhost:3114").replace(/\/$/, "");
const PHASES = String(args.phase || "boot").split(",");
const RUNS = Number(args.runs || 3);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const median = (xs) => { const s = xs.filter((x) => x != null).sort((a, b) => a - b); return s.length ? s[s.length >> 1] : null; };
const commit = () => execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
const BUILD_ROOT = args["build-dir"] ? path.resolve(String(args["build-dir"])) : ROOT;
const buildId = () => { try { return readFileSync(path.join(BUILD_ROOT, ".next", "BUILD_ID"), "utf8").trim(); } catch { return "no build"; } };

function queryString() {
  const parts = [];
  if (args.query) parts.push(String(args.query).replace(/^\?/, ""));
  if (args["engine-fault"]) parts.push(`engine-fault=${args["engine-fault"]}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

async function waitForRam() {
  const t0 = Date.now();
  while (os.freemem() < RAM_NEED_GB * 1e9) {
    if (Date.now() - t0 > RAM_WAIT_MS) throw new Error(`cut-load: under ${RAM_NEED_GB} GB free RAM for 15 min`);
    console.log(`cut-load: ${(os.freemem() / 1e9).toFixed(2)} GB free, waiting for ${RAM_NEED_GB} GB`);
    await sleep(60e3);
  }
}

// marks come from rAF timestamps (page clock): ready, the arrival (data-cutscene on), the engine's first drawn frame (a clip-path circle above 0)
function initScript() {
  const T = (window.__T = { marks: {}, long: [], paint: {}, frames: [] });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) T.long.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: "longtask", buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) T.paint[e.name] = Math.round(e.startTime); }).observe({ type: "paint", buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) T.paint.lcp = Math.round(e.startTime); }).observe({ type: "largest-contentful-paint", buffered: true });
  window.addEventListener("keydown", (e) => { if (e.code === "KeyW" && !T.marks.w) T.marks.w = performance.now(); }, true);
  let last = 0;
  const tick = (now) => {
    const w = window.__world;
    if (w?.ready && !T.marks.ready) { T.marks.ready = now; T.marks.progs = w.gl?.info?.programs?.length ?? null; }
    const on = document.querySelector(".hud")?.dataset.cutscene === "on";
    if (on && !T.marks.cutOn) T.marks.cutOn = now;
    if (!on && T.marks.cutOn && !T.marks.cutOff) T.marks.cutOff = now;
    if (T.marks.cutOn && !T.marks.cutOff) T.frames.push(now - last);
    if (!T.marks.engineFirst) {
      for (const d of document.querySelectorAll("div[style*='clip-path']")) {
        if (d.closest(".hud")) continue;
        const m = /circle\(([\d.]+)%/.exec(d.style.clipPath || "");
        if (m && parseFloat(m[1]) > 0) { T.marks.engineFirst = now; break; }
      }
    }
    last = now;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function trackNetwork(cdp) {
  const reqs = new Map();
  cdp.on("Network.requestWillBeSent", (e) => reqs.set(e.requestId, { url: e.request.url, type: e.type, t0: e.timestamp }));
  cdp.on("Network.responseReceived", (e) => {
    const r = reqs.get(e.requestId);
    if (r) { r.status = e.response.status; r.fromCache = Boolean(e.response.fromDiskCache || e.response.fromPrefetchCache); }
  });
  cdp.on("Network.loadingFinished", (e) => { const r = reqs.get(e.requestId); if (r) { r.t1 = e.timestamp; r.bytes = e.encodedDataLength; } });
  return reqs;
}

async function openPage(ctx, net) {
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  if (NET[net]) await cdp.send("Network.emulateNetworkConditions", NET[net]);
  return { page, reqs: trackNetwork(cdp) };
}

async function waitReady(page) {
  await page.goto(`${URL_BASE}/${queryString()}`, { waitUntil: "commit" });
  await page.waitForFunction(() => window.__world?.ready, null, { timeout: 120e3 });
}

// network times are ms from the document request; the page clock is ms from navigation start (the two differ by a few ms)
function netSummary(reqs, readyMs) {
  const list = [...reqs.values()];
  const doc = list.find((r) => r.type === "Document");
  const at = (r) => Math.round((r.t0 - doc.t0) * 1000);
  const before = list.filter((r) => at(r) <= readyMs);
  const js = list.filter((r) => r.t1 && /_next\/static\/chunks\/.*\.js/.test(r.url)).sort((a, b) => b.bytes - a.bytes);
  const big = js[0];
  return {
    requests: before.length,
    bytes: before.reduce((s, r) => s + (r.bytes || 0), 0),
    chunk: big ? { url: big.url.replace(/^https?:\/\/[^/]+/, ""), bytes: big.bytes, doneMs: at({ t0: big.t1 }) } : null,
    list,
    at,
  };
}

async function bootRun(browser, net) {
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: DPR });
  await ctx.addInitScript(initScript);
  const { page, reqs } = await openPage(ctx, net);
  await waitReady(page);
  const info = await page.evaluate(() => {
    const T = window.__T;
    const renderer = window.__world?.gl;
    const gl = renderer?.getContext?.();
    const dbg = gl?.getExtension("WEBGL_debug_renderer_info");
    return {
      adapter: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "unknown",
      readyMs: Math.round(T.marks.ready),
      progs: T.marks.progs,
      fcp: T.paint["first-contentful-paint"] ?? null,
      warm: [...(window.__warm?.values() ?? [])].map((e) => [e.id, e.state]),
    };
  });
  await sleep(2000);
  const p0 = await page.evaluate(() => ({ x: window.__world.live.seal.x, z: window.__world.live.seal.z }));
  await page.keyboard.down("KeyW");
  await page.waitForFunction((p) => Math.hypot(window.__world.live.seal.x - p.x, window.__world.live.seal.z - p.z) > 0.05, p0, { timeout: 10e3 });
  const pupMs = await page.evaluate(() => performance.now() - window.__T.marks.w);
  await page.keyboard.up("KeyW");
  const net_ = netSummary(reqs, info.readyMs);
  await ctx.close();
  return {
    adapter: info.adapter, readyMs: info.readyMs, progs: info.progs, fcp: info.fcp, pupMs: Math.round(pupMs),
    requests: net_.requests, bytes: net_.bytes, chunk: net_.chunk,
    builtBeforeArrival: info.warm.filter(([, s]) => s !== "idle"),
    warm: args["dump-warm"] ? info.warm : undefined,
  };
}

async function arrivalRun(browser) {
  const { PLACE_BY_ID } = await import("../lib/world/places.js");
  const dock = PLACE_BY_ID[args.dock || "home"];
  if (!dock) throw new Error(`cut-load: no dock ${args.dock}`);
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: DPR });
  await ctx.addInitScript(initScript);
  const { page, reqs } = await openPage(ctx, args.net);
  await waitReady(page);
  const walkS = Number(args["after-walk"] || 0);
  if (walkS > 0) {
    await page.keyboard.down("KeyW");
    await sleep(walkS * 1000);
    await page.keyboard.up("KeyW");
  }
  const keyAt = await page.evaluate((p) => { window.__world.live.target = { x: p.x, z: p.z }; return performance.now(); }, { x: dock.x, z: dock.z });
  await page.waitForFunction(() => window.__T.marks.cutOn, null, { timeout: 60e3 });
  await page.waitForFunction(() => window.__T.marks.engineFirst, null, { timeout: 30e3 }).catch(() => {});
  const m = await page.evaluate(() => window.__T.marks);
  const net_ = netSummary(reqs, m.cutOn);
  const chunksAfterFire = net_.list.filter((r) => r.t0 && net_.at(r) > m.cutOn && /_next\/static\/chunks\//.test(r.url)).length;
  const adapter = await page.evaluate(() => { const gl = window.__world?.gl?.getContext?.(); const d = gl?.getExtension("WEBGL_debug_renderer_info"); return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : "unknown"; });
  await ctx.close();
  return {
    adapter,
    keyToFire: Math.round(m.cutOn - keyAt),
    keyToFirst: m.engineFirst ? Math.round(m.engineFirst - keyAt) : null,
    fireToFirst: m.engineFirst ? Math.round(m.engineFirst - m.cutOn) : null,
    chunksAfterFire,
  };
}

async function repeatRun(browser) {
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: DPR });
  const first = await openPage(ctx, undefined);
  await waitReady(first.page);
  await first.page.close();
  const second = await openPage(ctx, undefined);
  await waitReady(second.page);
  const list = [...second.reqs.values()];
  await ctx.close();
  return { requests: list.length, revalidated: list.filter((r) => r.status === 304).length };
}

function walkFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walkFiles(p) : d.name.endsWith(".js") ? [p] : [];
  });
}

function chunksReport() {
  const dir = path.join(BUILD_ROOT, ".next", "static", "chunks");
  const rows = walkFiles(dir).map((f) => {
    const src = readFileSync(f);
    return { name: path.relative(dir, f).replace(/\\/g, "/"), raw: src.length, gz: gzipSync(src, { level: 9 }).length, hit: args.match ? src.toString("utf8").includes(String(args.match)) : null };
  }).sort((a, b) => b.gz - a.gz);
  return {
    commit: commit(),
    build: buildId(),
    totalGz: rows.reduce((s, r) => s + r.gz, 0),
    top: rows.slice(0, 12),
    matched: args.match ? rows.filter((r) => r.hit) : undefined,
  };
}

async function launch() {
  if (!CHROME) throw new Error("cut-load: no Chrome install found");
  const flags = [...BASE_FLAGS, ...(await adapterFlags(chromium, CHROME, args.gpu))];
  return chromium.launch({ executablePath: CHROME, headless: true, args: flags });
}

async function browserPhases(phases) {
  await waitForRam();
  return withGpuLock(`cut-load ${phases.join(",")} ${args.gpu ?? "default"}`, async () => {
    const browser = await launch();
    const out = {};
    try {
      for (const phase of phases) {
        if (phase === "boot" || phase === "net") {
          const net = phase === "net" ? String(args.net || "slow4g") : args.net;
          const runs = [];
          for (let i = 0; i < RUNS; i++) runs.push(await bootRun(browser, net));
          out[phase] = { net: net ?? "none", runs, medianReadyMs: median(runs.map((r) => r.readyMs)), medianProgs: median(runs.map((r) => r.progs)), medianPupMs: median(runs.map((r) => r.pupMs)), medianChunkDoneMs: median(runs.map((r) => r.chunk?.doneMs)) };
        } else if (phase === "arrival") {
          const runs = [];
          for (let i = 0; i < RUNS; i++) runs.push(await arrivalRun(browser));
          out[phase] = { dock: args.dock || "home", runs, medianKeyToFirst: median(runs.map((r) => r.keyToFirst)), medianFireToFirst: median(runs.map((r) => r.fireToFirst)), medianChunksAfterFire: median(runs.map((r) => r.chunksAfterFire)) };
        } else if (phase === "repeat") {
          const runs = [];
          for (let i = 0; i < RUNS; i++) runs.push(await repeatRun(browser));
          out[phase] = { runs, medianRevalidated: median(runs.map((r) => r.revalidated)) };
        } else {
          throw new Error(`cut-load: unknown phase ${phase}`);
        }
      }
    } finally {
      await browser.close();
    }
    return out;
  });
}

async function main() {
  const report = { commit: commit(), build: buildId(), gpu: args.gpu ?? "default", url: URL_BASE, phases: {} };
  if (PHASES.includes("chunks")) report.phases.chunks = chunksReport();
  const live = PHASES.filter((p) => p !== "chunks");
  if (live.length) Object.assign(report.phases, await browserPhases(live));
  for (const [name, p] of Object.entries(report.phases)) {
    console.log(`${name} | ${report.commit} ${report.build} | ${report.gpu} | ${JSON.stringify(p, (k, v) => (k === "list" || k === "warm" ? undefined : v))}`);
  }
  if (args.out) writeFileSync(String(args.out), JSON.stringify(report, null, 1));
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
