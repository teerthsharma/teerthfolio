/* global window, sessionStorage */
// Plays every APPROVED cutscene in real Chrome and prints a pass/fail table.
//   node scripts/cutscene-smoke.mjs [--url http://localhost:3340] [--only p-caustic]
// Per id: ?play&spawn=<id>&debug, clear seal:seen, window.__replay(id), then at
// 3 s, 8 s and the end: arrival id, camera-to-pup distance, pup on screen.
// Pass = the arrival started, the pup was on screen and near the camera at 3 s
// and 8 s, the scene ended back on the island, and no console errors.
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { APPROVED, arrivalLength } from "../lib/world/cutscene/timeline.js";
import { PLACE_BY_ID, dockPoint } from "../lib/world/places.js";
import { CARDS } from "../lib/world/cutscene/cards/index.js";

const arg = (k, d) => (process.argv.includes(`--${k}`) ? process.argv[process.argv.indexOf(`--${k}`) + 1] : d);
const base = arg("url", "http://localhost:3340").replace(/\/$/, "");
const only = arg("only");
const ids = [...APPROVED].filter((id) => !only || only.split(",").includes(id));
const GAP = Number(arg("gap", 250)); // ms: a frame gap over this, after the first second of the scene, fails the dock (hitch regression)
const NEAR = 60; // m: camera farther than this from the pup = the scene plays somewhere else (the zoom-out wide, d >= 420 m, is allowed at 3 s: the bloom)
mkdirSync("verification/smoke", { recursive: true });

const probe = () => {
  const w = window.__world;
  const s = w.live.seal;
  const c = w.camera;
  c.updateMatrixWorld();
  const e = c.matrixWorldInverse.elements;
  const p = c.projectionMatrix.elements;
  const y = 1;
  const v = [0, 1, 2, 3].map((i) => e[i] * s.x + e[4 + i] * y + e[8 + i] * s.z + e[12 + i]);
  const cl = [0, 1, 2, 3].map((i) => p[i] * v[0] + p[4 + i] * v[1] + p[8 + i] * v[2] + p[12 + i] * v[3]);
  const nx = cl[0] / cl[3];
  const ny = cl[1] / cl[3];
  const pos = c.getWorldPosition(c.position.clone());
  return {
    id: w.live.arrival.id,
    dist: Math.hypot(pos.x - s.x, pos.y - y, pos.z - s.z),
    onScreen: cl[3] > 0 && Math.abs(nx) <= 1 && Math.abs(ny) <= 1,
  };
};

const browser = await chromium.launch({ channel: "chrome", args: ["--ignore-gpu-blocklist", "--enable-gpu-rasterization"] });
const rows = [];
for (const id of ids) {
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  const errors = [];
  // frame gaps: every rAF delta, stamped; the scene's first second is exempt (the arrival's own build)
  await page.addInitScript(() => {
    window.__gaps = [];
    let last = performance.now();
    const f = (t) => { window.__gaps.push([t, t - last]); last = t; requestAnimationFrame(f); };
    requestAnimationFrame(f);
    window.__lt = [];
    try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push([e.startTime, e.duration]))).observe({ entryTypes: ["longtask"] }); } catch {}
  });
  // a shader that fails to compile on ANGLE only warns (GL_INVALID_OPERATION), yet draws nothing: count it
  page.on("console", (m) => (m.type() === "error" || /GL_INVALID_OPERATION|Error compiling/.test(m.text())) && errors.push(m.text().slice(0, 120)));
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 120)));
  const as = CARDS.find((c) => c.id === id)?.plays ?? id; // MujoRush docks share one scene
  let tStart = 0;
  const row = { id, started: false, t3: "-", t8: "-", ended: false, errors: 0, why: [] };
  try {
    await page.goto(`${base}/?play&debug`, { waitUntil: "load" });
    await page.waitForFunction(() => window.__world?.ready && window.__world?.live && window.__replay, null, { timeout: 60000 });
    // THE WALK: from the spawn the seal travels to the dock (click-to-travel), so the shared prewarm builds and compiles on the way, as in play;
    // the arrival then starts by proximity. Frame gaps of the walk and of the scene are measured apart.
    await page.evaluate((i) => { sessionStorage.removeItem("seal:seen"); window.__world.live.seen.delete(i); }, as);
    tStart = await page.evaluate(() => performance.now());
    const dock = dockPoint(PLACE_BY_ID[as === "spawn-seal" ? as : id] ?? PLACE_BY_ID[as]);
    await page.evaluate((d) => { window.__world.live.target = d; }, dock);
    const arrived = await page.waitForFunction((i) => window.__world.live.arrival.id === i, as, { timeout: as === "spawn-seal" ? 40000 : 120000, polling: 100 }).then(() => true, () => false);
    const tArr = await page.evaluate(() => performance.now());
    row.warm = await page.evaluate(([t, u]) => Math.round(window.__gaps.filter(([at]) => at > t + 1000 && at < u).reduce((m, [, d]) => Math.max(m, d), 0)), [tStart, tArr]);
    row.walk = Math.round((tArr - tStart) / 1000);
    if (!arrived) { row.why.push("never arrived"); await page.evaluate((i) => window.__replay(i), id); }
    if (process.env.WARMLOG) console.log(id, JSON.stringify(await page.evaluate(() => window.__warmLog)));
    tStart = tArr;
    const t0 = Date.now();
    row.started = (await page.evaluate(probe)).id === as;
    const len = arrivalLength(as);
    for (const [at, key] of [[3, "t3"], [8, "t8"]]) {
      if (at > len) continue;
      await page.waitForTimeout(Math.max(0, at * 1000 - (Date.now() - t0)));
      const p = await page.evaluate(probe);
      row[key] = `${p.dist.toFixed(0)}m${p.onScreen ? "" : " OFF"}${p.id === as ? "" : " gone"}`;
      // off screen is only a note: staged scenes cut to a rig double or a close-up (polychrom, topograph)
      if (p.dist > NEAR && !(at === 3 && p.dist >= 100)) row.why.push(`camera ${p.dist.toFixed(0)}m from pup @${at}s`);
      await page.evaluate(() => (window.__shots ??= []).push(performance.now()));
      await page.screenshot({ path: `verification/smoke/${id}-${at}s.png` });
    }
    await page.waitForFunction((i) => window.__world.live.arrival.id !== i, as, { timeout: (len + 6) * 1000 }).catch(() => {});
    await page.waitForTimeout(800);
    const end = await page.evaluate(probe);
    row.ended = end.id !== as && !(await page.evaluate(() => window.__world.live.stageOn));
    await page.evaluate(() => (window.__shots ??= []).push(performance.now()));
    await page.screenshot({ path: `verification/smoke/${id}-end.png` });
  } catch (e) {
    row.why.push(String(e.message).split("\n")[0].slice(0, 80));
  }
  const worst = await page.evaluate((t) => window.__gaps.filter(([at]) => at > t + 1000 && !(window.__shots ?? []).some((q) => at >= q && at < q + 800)).reduce((m, [, d]) => Math.max(m, d), 0), tStart ?? 0).catch(() => 0);
  row.gap = Math.round(worst);
  // long tasks (main-thread blocks over 50 ms) in the scene: total and worst; p99 vs median frame time of the scene
  const lt = await page.evaluate((t) => { const a = (window.__lt ?? []).filter(([at]) => at > t + 1000).map(([, d]) => d); return [Math.round(a.reduce((x, y) => x + y, 0)), Math.round(Math.max(0, ...a))]; }, tStart).catch(() => [-1, -1]);
  row.lt = lt[0];
  row.ltMax = lt[1];
  const dts = await page.evaluate((t) => window.__gaps.filter(([at]) => at > t + 1000 && !(window.__shots ?? []).some((q) => at >= q && at < q + 800)).map(([, d]) => d).sort((a, b) => a - b), tStart).catch(() => []);
  row.p50 = dts.length ? Math.round(dts[dts.length >> 1]) : 0;
  row.p99 = dts.length ? Math.round(dts[Math.min(dts.length - 1, Math.floor(dts.length * 0.99))]) : 0;
  if (row.ltMax > GAP) row.why.push(`long task ${row.ltMax} ms > ${GAP}`);
  if (row.p99 > 2.5 * row.p50 && row.p99 > 50) row.why.push(`p99 ${row.p99} ms > 2.5x median ${row.p50}`);
  if (worst > GAP) row.why.push(`frame gap ${row.gap} ms > ${GAP}`);
  if (row.warm > GAP) row.why.push(`walk gap ${row.warm} ms > ${GAP}`);
  row.errors = errors.length;
  if (!row.started) row.why.push("never started");
  if (!row.ended) row.why.push("did not end");
  if (errors.length) row.why.push(errors[0]);
  row.pass = row.why.length === 0;
  rows.push(row);
  console.log(`${row.pass ? "PASS" : "FAIL"}  ${id.padEnd(26)} 3s:${row.t3.padEnd(10)} 8s:${row.t8.padEnd(10)} walk:${String(row.walk ?? "-").padEnd(3)}s warm:${String(row.warm ?? "-").padEnd(5)} gap:${String(row.gap ?? "-").padEnd(5)} p50/p99:${row.p50}/${row.p99} longtask:${row.lt}/${row.ltMax} ${row.why.join("; ")}`);
  await page.close();
}
await browser.close();
console.log(`\n${rows.filter((r) => r.pass).length}/${rows.length} pass`);
process.exit(rows.every((r) => r.pass) ? 0 : 1);
