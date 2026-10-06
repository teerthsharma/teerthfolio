// node lib/anime/governor.check.mjs : T3 gates on synthetic traces, against two baselines.
import assert from "node:assert/strict";
import { TIERS } from "../world/quality.js";
import { Governor } from "./governor.js";

// frame model: ms = fixed + perMpx * mpx(tier) (+ noise), hitches injected at given times
function run(kind, policy, { perMpx, fixed, start, hitches = [], noise = 0, T = 40 }) {
  let tier = start, t = 0, seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const changes = [];
  const g = new Governor({ tier: start, budgetMs: 1000 / 30 });
  let win = [], cap = TIERS.length - 1, lastEval = 0, settled = null;
  const pending = [...hitches];
  while (t < T) {
    let ms = fixed + perMpx * TIERS[tier].mpx + (rnd() - 0.5) * 2 * noise;
    if (pending.length && t >= pending[0][0]) ms = pending.shift()[1];
    t += ms / 1000;
    let next = tier;
    if (policy === "topo") next = g.observe(ms, t);
    else {
      // baselines: drei PerformanceMonitor-like 2.5 s mean-fps (< 50 down + cap), and p99 > budget
      win.push(ms);
      if (t - lastEval >= 2.5) {
        const mean = win.reduce((a, b) => a + b, 0) / win.length;
        const p99 = [...win].sort((a, b) => a - b)[Math.floor(win.length * 0.99)];
        if (policy === "mean" && 1000 / mean < 50) { next = Math.max(0, tier - 1); cap = next; }
        else if (policy === "mean" && 1000 / mean > 50 * 1.5 && tier < cap) next = tier + 1;
        if (policy === "p99" && p99 > 1000 / 30) next = Math.max(0, tier - 1);
        else if (policy === "p99" && p99 < 1000 / 60 && tier < TIERS.length - 1) next = tier + 1;
        win = []; lastEval = t;
      }
    }
    if (next !== tier) { changes.push([+t.toFixed(2), tier, next]); tier = next; settled = t; }
  }
  let thrash = 0;
  for (let i = 0; i < changes.length; i++) thrash = Math.max(thrash, changes.filter((c) => c[0] >= changes[i][0] && c[0] < changes[i][0] + 10).length);
  return { kind, policy, final: tier, min: Math.min(start, ...changes.map((c) => c[2])), changes, settledAt: settled && +settled.toFixed(2), maxPer10s: thrash };
}

const rtx = { perMpx: 1.0, fixed: 2, start: 3, hitches: [[0.5, 900], [1.4, 1500], [2.2, 600], [3.0, 400], [3.6, 1200], [5, 300], [9, 250]] };
const intel = { perMpx: 25, fixed: 4, start: 3, noise: 3 };
const border = { perMpx: 25, fixed: 4, start: 1, noise: 9 };
const rows = [];
for (const p of ["topo", "mean", "p99"]) rows.push(run("rtx+prewarm", p, rtx), run("intel overload", p, intel), run("intel borderline", p, border));
for (const r of rows) console.log(JSON.stringify(r));
const topo = (k) => rows.find((r) => r.kind === k && r.policy === "topo");
assert.ok(topo("rtx+prewarm").min >= 2, "gate: RTX never below T2 under prewarm hitches");
assert.ok(topo("intel overload").settledAt <= 3, "gate: Intel overload settles within 3 s");
assert.ok(rows.filter((r) => r.policy === "topo").every((r) => r.maxPer10s <= 1), "gate: <= 1 change per 10 s");
console.log("governor.check ok");
