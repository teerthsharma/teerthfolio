// Plain node check for islands.js: hand cases, 10,000 seeded oracle agreements, the dock table and the packet's HUD constants. Exit 1 on failure.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { bruteForce, EVENTS, persistentSpikes, SERIES } from "./islands.js";

let failed = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) { failed++; console.log(`FAIL ${name}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); }
  return ok;
};
const round = (x) => Math.round(x * 20) / 20;

eq("a1", persistentSpikes([10, 10, 40, 41, 40, 10, 30, 10, 10, 25, 10]), [[3, 31], [6, 20], [9, 15]]);
eq("a2", persistentSpikes([10, 50, 30, 45, 10]), [[1, 40], [3, 15]]);
eq("a3", persistentSpikes([10, 20, 20, 10]), [[1, 10]]);

function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(12609);
let agree = 0;
for (let c = 0; c < 10000; c++) {
  const n = Math.floor(rnd() * 15);
  const mode = c % 3;
  const s = Array.from({ length: n }, () => (mode === 0 ? Math.floor(rnd() * 6) : mode === 1 ? Math.floor(rnd() * 24) / 4 : rnd() * 20));
  if (eq(`b${c}`, persistentSpikes(s), bruteForce(s))) agree++;
}
console.log(`${agree}/10000 oracle agreements`);

const dock = persistentSpikes(SERIES);
eq("c1", dock.map(([k, p]) => [k, round(p)]).sort((u, v) => v[1] - u[1]).slice(0, 5), [[7, 24.9], [20, 16.5], [15, 7.9], [13, 6.6], [17, 3.1]]);
eq("c2", dock.map(([k, p]) => [k, round(p)]), EVENTS.map((e) => [e.frame, e.persistence]).sort((u, v) => u[0] - v[0]));
eq("c3", EVENTS.map((e) => [e.frame, e.birth, e.death]), EVENTS.map((e) => [e.frame, SERIES[e.frame], e.death]));

const src = readFileSync(fileURLToPath(new URL("../../tools/cuts/pr-anyps5-12609/packet.js", import.meta.url)), "utf8");
const table = (name) => {
  const m = src.match(new RegExp(`const float ${name}\\[\\d+\\] = float\\[\\d+\\]\\(([^)]*)\\)`));
  return m ? m[1].split(",").map(Number) : null;
};
const KA_B = table("KA_B"), KA_D = table("KA_D");
eq("d1", KA_B, [41.5, 33.2, 29.4, 27.1, 23.6, 18.2, 16.9]);
eq("d2", KA_D, [16.6, 16.7, 21.5, 24.0, 17.0, 16.7, 16.7]);
eq("d3", EVENTS.map((e) => e.birth), KA_B);
eq("d4", EVENTS.map((e) => e.death), KA_D);

if (failed) { console.log(`islands.check: ${failed} FAIL`); process.exit(1); }
console.log("islands.check: OK");
