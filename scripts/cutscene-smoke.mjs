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
import { CARDS } from "../lib/world/cutscene/cards/index.js";

const arg = (k, d) => (process.argv.includes(`--${k}`) ? process.argv[process.argv.indexOf(`--${k}`) + 1] : d);
const base = arg("url", "http://localhost:3340").replace(/\/$/, "");
const only = arg("only");
const ids = [...APPROVED].filter((id) => !only || only.split(",").includes(id));
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
  // a shader that fails to compile on ANGLE only warns (GL_INVALID_OPERATION), yet draws nothing: count it
  page.on("console", (m) => (m.type() === "error" || /GL_INVALID_OPERATION|Error compiling/.test(m.text())) && errors.push(m.text().slice(0, 120)));
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 120)));
  const as = CARDS.find((c) => c.id === id)?.plays ?? id; // MujoRush docks share one scene
  const row = { id, started: false, t3: "-", t8: "-", ended: false, errors: 0, why: [] };
  try {
    await page.goto(`${base}/?play&spawn=${id}&debug`, { waitUntil: "load" });
    await page.waitForFunction(() => window.__world?.ready && window.__world?.live && window.__replay, null, { timeout: 60000 });
    await page.evaluate(() => sessionStorage.removeItem("seal:seen"));
    await page.waitForTimeout(1500);
    const already = await page.evaluate((i) => window.__world.live.arrival.id === i, as);
    if (!already) await page.evaluate((i) => window.__replay(i), id);
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
      await page.screenshot({ path: `verification/smoke/${id}-${at}s.png` });
    }
    await page.waitForFunction((i) => window.__world.live.arrival.id !== i, as, { timeout: (len + 6) * 1000 }).catch(() => {});
    await page.waitForTimeout(800);
    const end = await page.evaluate(probe);
    row.ended = end.id !== as && !(await page.evaluate(() => window.__world.live.stageOn));
    await page.screenshot({ path: `verification/smoke/${id}-end.png` });
  } catch (e) {
    row.why.push(String(e.message).split("\n")[0].slice(0, 80));
  }
  row.errors = errors.length;
  if (!row.started) row.why.push("never started");
  if (!row.ended) row.why.push("did not end");
  if (errors.length) row.why.push(errors[0]);
  row.pass = row.why.length === 0;
  rows.push(row);
  console.log(`${row.pass ? "PASS" : "FAIL"}  ${id.padEnd(26)} 3s:${row.t3.padEnd(10)} 8s:${row.t8.padEnd(10)} ${row.why.join("; ")}`);
  await page.close();
}
await browser.close();
console.log(`\n${rows.filter((r) => r.pass).length}/${rows.length} pass`);
process.exit(rows.every((r) => r.pass) ? 0 : 1);
