// untracked capture driver: walk to DOCK, then shoot at scene times AT (s since the arrival), with metrics
import { chromium } from "playwright";
import { PLACE_BY_ID, dockPoint } from "../lib/world/places.js";
const chrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const W = Number(process.env.VW || 820), H = Number(process.env.VH || 1180);
const pad = W < H;
const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11", "--enable-precise-memory-info", "--js-flags=--expose-gc"] });
const ctx = await browser.newContext(pad ? { viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" } : { viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e.stack).slice(0,700)));
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(m.type() + ": " + m.text().slice(0, 300)); });
await page.goto(`${process.env.BASE}/${process.env.Q}`);
await page.waitForFunction(() => window.__world?.ready, null, { timeout: 90000 });
await page.waitForTimeout(2500);
// frame probe: per-frame dt, draw calls and triangles summed over every render of the frame
await page.evaluate(() => {
  const w = window.__world;
  w.gl.info.autoReset = false;
  const P = (window.__probe = { frames: [], calls: 0, tris: 0, maxCalls: 0, maxTris: 0, progs: [] });
  let np = 0;
  let last = performance.now();
  const loop = (now) => {
    const a = w.live.arrival;
    const t = a.id ? w.clock.elapsedTime - a.start : -1;
    P.frames.push([t, now - last]);
    const pl = w.gl.info.programs?.length ?? 0; if (pl !== np) { P.progs.push([+t.toFixed(2), pl, w.gl.info.programs.slice(np).map((p) => p.name).join('|').slice(0, 300)]); np = pl; }
    if (P.frames.length > 4000) P.frames.shift();
    last = now;
    const r = w.gl.info.render;
    P.calls = r.calls; P.tris = r.triangles;
    if (t >= 0) { P.maxCalls = Math.max(P.maxCalls, r.calls); P.maxTris = Math.max(P.maxTris, r.triangles); }
    w.gl.info.reset();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
});
const heap = async () => page.evaluate(async () => { window.gc?.(); await new Promise((r) => setTimeout(r, 300)); window.gc?.(); return performance.memory?.usedJSHeapSize ?? null; });
const heap0 = await heap();
const P = PLACE_BY_ID[process.env.DOCK];
const d = dockPoint(P);
let started = false;
for (let i = 0; i < 6 && !started; i++) {
  await page.evaluate(() => { window.__world.live.seen.clear(); });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(700);
  started = await page.evaluate(() => Boolean(window.__world.live.arrival.id));
}
const now = () => page.evaluate(() => { const w = window.__world; const a = w.live.arrival; return a.id ? w.clock.elapsedTime - a.start : -1; });
const AT = (process.env.AT || "0.8,3,4.6,5.6,6.9,8,9.4,10.6,12,14,16.6,18,19.3,20.4").split(",").map(Number);
const shots = [];
const samples = [];
if (process.env.REAL) {
  // real time, no screenshots: the frame probe only
  for (let k = 0; k < 60 && (await now()) < 21 && (await now()) >= 0; k++) await page.waitForTimeout(500);
} else {
  // SEEK: freeze the clock and set it to each time in turn (forward only), then shoot
  await page.evaluate(() => { const c = window.__world.clock; c.__gd = c.getDelta; c.getDelta = () => 0.0001; });
  for (const at of AT) {
    for (let step = 0; step < 40; step++) {
      const done = await page.evaluate((x) => { const w = window.__world; const a = w.live.arrival; if (!a.id) return true; const t = w.clock.elapsedTime - a.start; w.clock.elapsedTime = a.start + Math.min(x, t + 0.25); return t >= x; }, at);
      if (done) break;
      await page.waitForTimeout(60);
    }
    await page.evaluate((x) => { const w = window.__world; const a = w.live.arrival; if (a.id) w.clock.elapsedTime = a.start + x; }, at);
    await page.waitForTimeout(400);
    const t = await now();
    const p = `${process.env.SHOTS}-${at.toFixed(1).padStart(4, "0")}.png`;
    await page.screenshot({ path: p });
    samples.push(await page.evaluate(() => ({ calls: window.__probe.calls, tris: window.__probe.tris, seen: [...window.__world.live.seen].filter((x) => x.includes("mujoco")).length, cut: document.querySelector(".hud")?.dataset.cutscene || null })));
    shots.push([at, +t.toFixed(2), p]);
  }
  await page.evaluate(() => { const c = window.__world.clock; c.getDelta = c.__gd; });
}
await page.waitForTimeout(1500);
const heap1 = await heap();
const pr = await page.evaluate(() => { const f = window.__probe.frames.filter(([t]) => t >= 0); const worst = (a, b) => f.filter(([t]) => t >= a && t < b).reduce((m, [, d]) => Math.max(m, d), 0); return { maxCalls: window.__probe.maxCalls, maxTris: window.__probe.maxTris, start: worst(0, 1.6), brk: worst(3.8, 7.6), ret: worst(15.5, 21), all: worst(0, 21), n: f.length }; });
const dbg = await page.evaluate(() => ({ ...(window.__mujoDbg ?? {}), progs: window.__probe.progs }));
const top = await page.evaluate(() => window.__probe.frames.filter(([t]) => t >= 0).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([t, d]) => [+t.toFixed(2), Math.round(d)]));
console.log(JSON.stringify({ dbg, top, started, heap0, heap1, probe: pr, shots, samples, errors }, null, 1));
await browser.close();
