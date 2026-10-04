/* global window, document, requestAnimationFrame, sessionStorage */
// Frame-time gate in real Chrome (the bundled chromium renders WebGL in
// software here and fakes a 40x slowdown). Every phase records rAF deltas
// from an init script, so load, walk and cutscene are measured the same way.
//
//   node scripts/perf-frames.mjs [--url http://localhost:3403] [--w 1440] [--h 900] [--dpr 2]
//        [--phase load,walk,arrival,skip,reduced,tiers,memory] [--secs 180 (memory)]
//        phases also: first, flap (2 min), nostorage, ramp [--top 2]
//        [--query "?play&look=2"] [--gpu intel|nvidia | --hp | --lp (one adapter of a hybrid laptop)]
//
// Budgets (a 60 Hz laptop; exit 1 on any breach):
//   walk     p95 <= 33.4 ms (30 fps floor for 95% of frames), max <= 100 ms
//   arrival  p95 <= 33.4 ms, no frame > 100 ms during the 5.4 s cutscene
//   load     no frame > 250 ms in the 4 s after window.__world.ready
//   memory   JS heap grows < 20 MB and DOM nodes < 500 over the walk
// Behaviour guards (any machine): the arrival flattens (fov < 10, html
// data-pop=on), a fresh key skips it within 300 ms and restores fov 35,
// reduced motion never flattens, and phone / iPad start on the rung their GPU
// classifies to (lib/world/quality.js) at that rung's DPR.
//
// The dev machine is Intel UHD (fill-bound, low tier): quote its numbers as
// such. Run one at a time: concurrent WebGL pages share the one GPU.

import { existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { BASE_FLAGS, adapterFlags } from "./gpu-adapter.mjs";
import { TOP, classify, dprFor } from "../lib/world/quality.js";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, token, i, all) => {
    if (token.startsWith("--")) pairs.push([token.slice(2), all[i + 1]?.startsWith("--") ? true : all[i + 1] ?? true]);
    return pairs;
  }, []),
);
const base = (args.url || "http://localhost:3403").replace(/\/$/, "");
const W = Number(args.w || 1440);
const H = Number(args.h || 900);
const DPR = Number(args.dpr || 2);
const phases = String(args.phase || "load,walk,arrival,skip,reduced,tiers").split(",");
const BUDGET = { p95: 33.4, max: 100, load: 250, heapMB: 20, nodes: 500 };

const local = process.env.LOCALAPPDATA;
// --edge launches Edge instead: on a hybrid laptop where Windows pins
// chrome.exe to the discrete GPU, Edge still gets the default (integrated).
const chrome = [
  ...(args.edge ? ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"] : []),
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  local && path.join(local, "Google/Chrome/Application/chrome.exe"),
].filter(Boolean).find((c) => existsSync(c));
if (!chrome) throw new Error("real Chrome not found; the bundled chromium is software WebGL and its numbers lie");

const PLACE_IDS = (await import("../lib/world/places.js")).PLACES.map((p) => p.id);
// --gpu intel|nvidia (or --lp / --hp) pins one adapter of a hybrid laptop by
// its LUID (gpu-adapter.mjs; --force_low_power_gpu alone does not reach the
// Intel once Windows prefers the discrete GPU). The report's gpu field says
// which one answered.
const vendor = args.gpu || (args.lp ? "intel" : args.hp ? "nvidia" : null);
const browser = await chromium.launch({ executablePath: chrome, headless: true, args: [...BASE_FLAGS, ...(await adapterFlags(chromium, chrome, vendor))] });
const failures = [];
const report = { url: base, viewport: `${W}x${H}@${DPR}`, browser: path.basename(chrome) };

// Records every frame: [now, dt, cutscene on, html data-pop, camera fov, look tier, programs linked].
function recorder() {
  window.__pf = [];
  // Shader programs linked so far: a deterministic count, where frame times
  // on a shared GPU are noisy.
  window.__links = 0;
  for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
    const link = C.prototype.linkProgram;
    C.prototype.linkProgram = function (p) {
      window.__links += 1;
      return link.call(this, p);
    };
  }
  let last = 0;
  const tick = (now) => {
    const hud = document.querySelector(".hud");
    window.__pf.push([now, last ? now - last : 0, hud?.dataset.cutscene === "on" ? 1 : 0, document.documentElement.dataset.pop || "", window.__world?.camera?.fov ?? 0, window.__world?.look ?? -1, window.__links]);
    last = now;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

const stats = (dts) => {
  const s = [...dts].sort((a, b) => a - b);
  if (!s.length) return { frames: 0 };
  const pct = (p) => +s[Math.min(s.length - 1, Math.floor(s.length * p))].toFixed(1);
  return { frames: s.length, p50: pct(0.5), p95: pct(0.95), p99: pct(0.99), max: +s[s.length - 1].toFixed(1), over50: s.filter((d) => d > 50).length };
};
// The longest frame and what was happening around it.
const worstOf = (frames) => {
  const i = frames.reduce((a, f, j) => (j && f[1] > frames[a][1] ? j : a), 1);
  const change = frames.findLastIndex((f, j) => j && j <= i && f[5] !== frames[j - 1][5]);
  return { ms: +frames[i][1].toFixed(0), atS: +((frames[i][0] - frames[0][0]) / 1000).toFixed(1), look: frames[i][5], framesAfterTierChange: change < 0 ? null : i - change, cutscene: !!frames[i][2] };
};
const check = (name, ok, detail) => {
  if (!ok) failures.push(`${name}: ${detail}`);
};

async function open({ w = W, h = H, dpr = DPR, touch = false, seen = false, reduced = false, noStorage = false, query = args.query || "?play" } = {}) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: touch, hasTouch: touch, reducedMotion: reduced ? "reduce" : "no-preference" });
  if (seen) await context.addInitScript((ids) => sessionStorage.setItem("seal:seen", JSON.stringify(ids)), PLACE_IDS);
  // A private window that blocks storage: every access throws.
  if (noStorage) {
    await context.addInitScript(() => {
      for (const name of ["localStorage", "sessionStorage"]) {
        Object.defineProperty(window, name, { get() { throw new DOMException("storage blocked", "SecurityError"); } });
      }
    });
  }
  await context.addInitScript(recorder);
  const page = await context.newPage();
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(String(e)));
  const t0 = Date.now();
  await page.goto(base + "/" + query, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__world?.ready, null, { timeout: 90000 });
  const readyMs = Date.now() - t0;
  report.gpu ??= await page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const info = gl?.getExtension("WEBGL_debug_renderer_info");
    return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : "unknown";
  });
  report.tier ??= /NVIDIA|AMD|Radeon|Apple/i.test(report.gpu) ? "discrete/high" : /Intel/i.test(report.gpu) ? "integrated/low (fill-bound)" : "unknown";
  const mark = await page.evaluate(() => window.__pf.length);
  return { context, page, readyMs, mark };
}
const framesSince = (page, from) => page.evaluate((i) => window.__pf.slice(i), from);
const now = (page) => page.evaluate(() => window.__pf.length);

// Hold W from spawn: the igloo (home) is 17 m up the screen and a fresh
// session plays its arrival. Returns the frames of the cutscene alone.
async function arrive(page, { skipAt = 0 } = {}) {
  await page.waitForTimeout(2000);
  await page.keyboard.down("KeyW");
  await page.waitForFunction(() => document.querySelector(".hud")?.dataset.cutscene === "on", null, { timeout: 20000 });
  const from = await now(page);
  if (skipAt) {
    await page.waitForTimeout(skipAt);
    const pressed = await now(page);
    await page.keyboard.down("KeyD");
    await page.waitForFunction(() => document.querySelector(".hud")?.dataset.cutscene !== "on", null, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(300);
    await page.keyboard.up("KeyD");
    await page.keyboard.up("KeyW");
    return { frames: await framesSince(page, from), pressed: pressed - from };
  }
  await page.waitForFunction(() => document.querySelector(".hud")?.dataset.cutscene !== "on", null, { timeout: 15000 });
  await page.keyboard.up("KeyW");
  return { frames: await framesSince(page, from) };
}

try {
  if (phases.includes("load")) {
    const { context, page, readyMs, mark } = await open({ seen: true });
    await page.waitForTimeout(4000);
    const s = stats((await framesSince(page, mark)).map((f) => f[1]).slice(1));
    report.load = { readyMs, ...s };
    check("load", s.max <= BUDGET.load, `longest frame ${s.max} ms > ${BUDGET.load} ms in the 4 s after ready`);
    await context.close();
  }

  if (phases.includes("walk")) {
    const { context, page } = await open({ seen: true });
    await page.waitForTimeout(6000); // shaders compiled, PerformanceMonitor has had its say
    const from = await now(page);
    for (const [k, ms] of [["KeyW", 3000], ["KeyD", 3000], ["KeyS", 2000], ["KeyA", 2000]]) {
      await page.keyboard.down(k);
      await page.waitForTimeout(ms);
      await page.keyboard.up(k);
    }
    const frames = await framesSince(page, from);
    const s = stats(frames.map((f) => f[1]).slice(1));
    const worst = frames.reduce((a, f, i) => (f[1] > frames[a][1] ? i : a), 1);
    report.walk = { ...s, look: await page.evaluate(() => window.__world.look), worstFrame: { ms: +frames[worst][1].toFixed(0), lookBefore: frames[worst - 1][5], lookAfter: frames[worst][5], framesAfterLastTierChange: worst - frames.findLastIndex((f, i) => i && i <= worst && f[5] !== frames[i - 1][5]) }, tierDrops: frames.filter((f, i) => i && f[5] !== frames[i - 1][5]).map((f) => f[5]) };
    // A quality step must not itself freeze the page (within 10 frames; the old tier 0 dropped
    // the composer and recompiled every shader: one 5.5-5.9 s frame).
    const stepHitch = Math.max(0, ...frames.map((f, i) => (frames.slice(Math.max(1, i - 10), i + 1).some((g, j) => g[5] !== frames[Math.max(1, i - 10) + j - 1][5]) ? f[1] : 0)));
    report.walk.tierStepHitchMs = +stepHitch.toFixed(0);
    // Programs first linked while walking: a material met for the first time
    // compiles mid-walk. Reported, and the worst frame says if it linked one.
    report.walk.linkedDuringWalk = frames.at(-1)[6] - frames[0][6];
    report.walk.worstFrame.linked = frames[worst][6] - frames[worst - 1][6];
    // Programs linked from each tier change to 30 frames after it.
    report.walk.linksPerTierStep = frames.flatMap((f, i) => (i && f[5] !== frames[i - 1][5] ? [(frames[Math.min(frames.length - 1, i + 30)][6] - frames[i - 1][6])] : []));
    check("tier step recompile", report.walk.linksPerTierStep.every((n) => n <= 20), `programs linked per tier step ${report.walk.linksPerTierStep} (<= 20 each)`);
    check("tier step hitch", stepHitch <= 1000, `a frame of ${stepHitch.toFixed(0)} ms within 10 frames of a look-tier change (<= 1000)`);
    check("walk", s.p95 <= BUDGET.p95 && s.max <= BUDGET.max, `p95 ${s.p95} ms (<= ${BUDGET.p95}), max ${s.max} ms (<= ${BUDGET.max})`);
    await context.close();
  }

  if (phases.includes("arrival")) {
    const { context, page } = await open();
    const { frames } = await arrive(page);
    const s = stats(frames.map((f) => f[1]).slice(1));
    const minFov = Math.min(...frames.map((f) => f[4]).filter(Boolean));
    const popOn = frames.some((f) => f[3] === "on");
    const popFrames = stats(frames.filter((f) => f[3] === "on").map((f) => f[1]));
    report.arrival = { ...s, seconds: +((frames.at(-1)[0] - frames[0][0]) / 1000).toFixed(2), minFov: +minFov.toFixed(1), popOn, popFrames, look: await page.evaluate(() => window.__world.look) };
    check("arrival budget", s.p95 <= BUDGET.p95 && s.max <= BUDGET.max, `p95 ${s.p95} ms (<= ${BUDGET.p95}), longest ${s.max} ms (<= ${BUDGET.max})`);
    check("arrival flattens", minFov < 10 && popOn, `min fov ${minFov.toFixed(1)}, html data-pop=on seen: ${popOn}`);
    await context.close();
  }

  if (phases.includes("skip")) {
    const { context, page } = await open();
    const { frames, pressed } = await arrive(page, { skipAt: 2600 });
    const after = frames.slice(pressed);
    const end = after.findIndex((f) => !f[2]);
    const endMs = end < 0 ? Infinity : after[end][0] - after[0][0];
    const fovBack = end >= 0 && after.slice(end + 1, end + 3).every((f) => Math.abs(f[4] - 35) < 0.01);
    report.skip = { endMs: +endMs.toFixed(0), fovBack, popCleared: end >= 0 && !after[end][3] };
    check("skip", endMs <= 300 && fovBack, `cutscene ended ${endMs} ms after the key (<= 300), fov back to 35: ${fovBack}`);
    await context.close();
  }

  if (phases.includes("reduced")) {
    const { context, page } = await open({ reduced: true });
    const { frames } = await arrive(page);
    const minFov = Math.min(...frames.map((f) => f[4]).filter(Boolean));
    const popOn = frames.some((f) => f[3] === "on");
    report.reduced = { minFov: +minFov.toFixed(1), popOn };
    check("reduced motion", minFov > 34.9 && !popOn, `min fov ${minFov.toFixed(1)} (want 35), html data-pop=on seen: ${popOn}`);
    await context.close();
  }

  if (phases.includes("tiers")) {
    // Read in the first second after ready, before PerformanceMonitor may
    // move the rung: what the device is configured to draw. Touch devices
    // get no special branch; the rung comes from the GPU and the pixel
    // budget from the screen, so a phone and a laptop on one GPU agree.
    report.tiers = {};
    for (const [name, o] of [
      ["phone", { w: 390, h: 844, dpr: 3, touch: true }],
      ["ipad", { w: 1024, h: 1366, dpr: 2, touch: true }],
    ]) {
      const { context, page } = await open({ ...o, seen: true });
      const got = await page.evaluate(() => {
        const c = document.querySelector(".game-stage canvas");
        return { dpr: +(c.width / c.clientWidth).toFixed(2), look: window.__world.look };
      });
      const look = Math.min(classify(report.gpu), got.look);
      const want = { look: classify(report.gpu), dpr: dprFor(look, o.w, o.h, o.dpr) };
      report.tiers[name] = { ...got, want };
      // the warm-up may step a guessed rung down before ready, never up
      check(`${name} tier`, got.look <= want.look && Math.abs(got.dpr - want.dpr) <= 0.02, `drawing-buffer DPR ${got.dpr} (want ${want.dpr}), look ${got.look} (want <= ${want.look})`);
      await context.close();
    }
  }

  if (phases.includes("first")) {
    // The first frames a visitor sees after the world says ready: none may
    // be a 3 fps frame, and the first ten must hold 20 fps at the median.
    const { context, page, mark } = await open({ seen: true });
    await page.waitForTimeout(1500);
    const dts = (await framesSince(page, mark)).map((f) => f[1]).slice(1, 11);
    const s = stats(dts);
    report.first = { ...s, dts: dts.map((d) => +d.toFixed(0)) };
    check("first frames", s.p50 <= 50 && s.max <= 333, `first ten frames after ready: median ${s.p50} ms (<= 50), longest ${s.max} ms (<= 333)`);
    await context.close();
  }

  if (phases.includes("flap")) {
    // Quality may step down and, on a GPU that can afford it, back up; it
    // may not flap. Per 60 s window: at most 3 tier changes and at most one
    // reversal of direction.
    const { context, page } = await open({ seen: true });
    const tierLog = async (from) => {
      const looks = (await framesSince(page, from)).map((f) => f[5]);
      const changes = looks.flatMap((l, i) => (i && l !== looks[i - 1] ? [l - looks[i - 1]] : []));
      const reversals = changes.filter((d, i) => i && Math.sign(d) !== Math.sign(changes[i - 1])).length;
      return { changes: changes.length, reversals, path: [looks[0], ...looks.filter((l, i) => i && l !== looks[i - 1])] };
    };
    let from = await now(page);
    await page.waitForTimeout(60000);
    const idle = await tierLog(from);
    from = await now(page);
    const keys = ["KeyW", "KeyD", "KeyS", "KeyA"];
    for (let i = 0; i < 30; i++) {
      await page.keyboard.down(keys[i % 4]);
      await page.waitForTimeout(2000);
      await page.keyboard.up(keys[i % 4]);
    }
    const walk = await tierLog(from);
    report.flap = { idle, walk };
    // A one-way monitor leaves a discrete GPU low for good after one dip.
    if (report.tier === "discrete/high") check("flap ends at top", walk.path.at(-1) === Number(args.top ?? TOP), `discrete GPU ends the 2 min at look ${walk.path.at(-1)} (want ${args.top ?? TOP})`);
    for (const [name, w] of Object.entries(report.flap)) check(`flap ${name}`, w.changes <= 3 && w.reversals <= 1, `${w.changes} tier changes, ${w.reversals} reversals in 60 s (path ${w.path})`);
    await context.close();
  }

  if (phases.includes("nostorage")) {
    const { context, page, readyMs } = await open({ noStorage: true });
    await page.waitForTimeout(3000);
    const blocked = await page.evaluate(() => {
      try {
        return !window.localStorage;
      } catch {
        return true;
      }
    });
    report.nostorage = { readyMs, blocked, errors: page.errors.slice(0, 3) };
    check("no storage", blocked && !page.errors.length, `page errors with storage blocked: ${page.errors.slice(0, 2)}`);
    await context.close();
  }

  if (phases.includes("ramp")) {
    // A GPU that can afford the top tier ends there: a fix tuned for the
    // integrated GPU must not leave a discrete one stuck low.
    const top = Number(args.top ?? TOP);
    const { context, page } = await open({ seen: true });
    await page.waitForTimeout(20000);
    const got = await page.evaluate(() => {
      const c = document.querySelector(".game-stage canvas");
      return { dpr: +(c.width / c.clientWidth).toFixed(2), look: window.__world.look };
    });
    report.ramp = { ...got, want: { dpr: dprFor(top, W, H, DPR), look: top } };
    if (report.tier === "discrete/high") check("ramp", got.dpr === dprFor(top, W, H, DPR) && got.look === top, `after 20 s: DPR ${got.dpr}, look ${got.look} (want ${dprFor(top, W, H, DPR)}, ${top})`);
    else report.ramp.note = "integrated GPU: reported, not asserted";
    await context.close();
  }

  if (phases.includes("memory")) {
    const secs = Number(args.secs || 180);
    const { context, page } = await open({ seen: true });
    const cdp = await context.newCDPSession(page);
    await cdp.send("Performance.enable");
    const sample = async () => {
      await cdp.send("HeapProfiler.collectGarbage");
      const { metrics } = await cdp.send("Performance.getMetrics");
      const m = Object.fromEntries(metrics.map((x) => [x.name, x.value]));
      return { heapMB: +(m.JSHeapUsedSize / 2 ** 20).toFixed(1), nodes: m.Nodes, listeners: m.JSEventListeners };
    };
    await page.waitForTimeout(6000);
    const start = await sample();
    const from = await now(page);
    const keys = ["KeyW", "KeyD", "KeyS", "KeyA"];
    for (let i = 0; i * 2 < secs; i++) {
      const k = keys[i % 4];
      await page.keyboard.down(k);
      await page.waitForTimeout(2000);
      await page.keyboard.up(k);
    }
    const end = await sample();
    const frames = await framesSince(page, from);
    const s = stats(frames.map((f) => f[1]).slice(1));
    report.memory = { secs, start, end, ...s, worstFrame: worstOf(frames), tierChanges: frames.filter((f, i) => i && f[5] !== frames[i - 1][5]).length };
    check("memory", end.heapMB - start.heapMB < BUDGET.heapMB && end.nodes - start.nodes < BUDGET.nodes, `heap +${(end.heapMB - start.heapMB).toFixed(1)} MB, nodes +${end.nodes - start.nodes}`);
    await context.close();
  }
} finally {
  await browser.close();
}
report.pass = !failures.length;
report.failures = failures;
console.log(JSON.stringify(report, null, 1));
process.exit(failures.length ? 1 : 0);
