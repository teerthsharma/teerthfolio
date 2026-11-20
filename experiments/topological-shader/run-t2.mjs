// Runs T2 as pre-registered (PREREGISTRATION-T2.md) and writes out/t2.json and out/t2.md.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { mulberry32 } from "../topo-field/field.mjs";
import { h0Superlevel } from "../../lib/anime/topology.js";
import { GRID, liveSamples } from "./heat.mjs";
import { roamWalk, ticksOf } from "./library.mjs";
import { classify, h0Bars, holeBars, holesAt, detectorHoles, thresholds } from "./critical.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const n = GRID.n;
const field = (fn) => Float64Array.from({ length: n }, (_, i) => fn(GRID.x[i], GRID.z[i]));
const gauss = (cx, cz, s, a = 1) => (x, z) => a * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (2 * s * s));
const key = (a, b) => a[0] - b[0] || a[1] - b[1];
const t0 = performance.now();

const randomField = (i) => {
  const rng = mulberry32(i + 1);
  if (i % 2 === 0) return Float64Array.from({ length: n }, () => rng());
  const K = 3 + (i % 7);
  const bumps = Array.from({ length: K }, () => {
    const r = 84 * Math.sqrt(rng());
    const th = 2 * Math.PI * rng();
    const s = 4 + 10 * rng();
    const a = 2 * rng() - 1;
    return gauss(r * Math.cos(th), r * Math.sin(th), s, a);
  });
  const noise = Float64Array.from({ length: n }, () => 0.02 * rng());
  return field((x, z) => bumps.reduce((acc, b) => acc + b(x, z), 0)).map((v, c) => v + noise[c]);
};

const d5Fields = () => {
  const out = [];
  for (let seed = 1; seed <= 5; seed++) {
    const S = liveSamples(ticksOf(roamWalk(seed)));
    for (let j = 0; j < 10; j++) {
      let idx = 5 + 6 * j;
      while (idx < S.length && Math.max(...S[idx]) === Math.min(...S[idx])) idx++;
      out.push({ id: `d5-s${seed}-i${5 + 6 * j}`, f: S[idx] });
    }
  }
  return out;
};

function check(f) {
  const c = classify(f);
  const bars = h0Bars(f);
  const pos = bars.filter((b) => b.birth > b.death).map((b) => [b.birth, b.death]).sort(key);
  const ref = h0Superlevel(f, GRID).pairs.map((p) => [p.birth, p.death]).sort(key);
  const posOk = pos.length === ref.length && pos.every((p, i) => p[0] === ref[i][0] && p[1] === ref[i][1]);
  const hb = holeBars(f);
  let holeMiss = 0;
  let withHole = 0;
  let maxHoles = 0;
  for (const t of thresholds(f)) {
    const a = holesAt(hb, t);
    const b = detectorHoles(f, t);
    if (a !== b) holeMiss++;
    if (b > 0) withHole++;
    if (b > maxHoles) maxHoles = b;
  }
  return {
    banchoffOk: c.banchoff === 2,
    h0Ok: bars.length === c.maxima - 1 && posOk,
    holeMiss,
    stats: { maxima: c.maxima, saddles: c.saddles, saddleMult: c.saddleMult, minima: c.minima, bars: bars.length, withHole, maxHoles },
  };
}

// known answers, as in test/critical.test.mjs: the run is void if one fails
const gate = (() => {
  const g1 = classify(field(gauss(0, 0, 14)));
  const f2 = field((x, z) => gauss(-20, 0, 10)(x, z) + gauss(20, 0, 10, 0.8)(x, z));
  const g2 = classify(f2);
  const ring = field((x, z) => Math.exp(-((Math.hypot(x, z) - 40) ** 2) / 72));
  const monkey = classify(field((x, z) => x ** 3 - 3 * x * z * z));
  const origin = Array.from({ length: n }, (_, i) => i).reduce((b, i) => (Math.hypot(GRID.x[i], GRID.z[i]) < Math.hypot(GRID.x[b], GRID.z[b]) ? i : b), 0);
  const checks = {
    singleBump: g1.maxima === 1 && g1.saddles === 0 && g1.banchoff === 2,
    twoBumps: g2.maxima === 2 && g2.saddleMult === 1 && g2.banchoff === 2 && h0Bars(f2).length === 1,
    ring: holesAt(holeBars(ring), 0.5) === 1 && detectorHoles(ring, 0.5) === 1,
    monkey: monkey.mult[origin] === 2 && monkey.banchoff === 2,
  };
  return { ok: Object.values(checks).every(Boolean), checks };
})();

const families = {
  uniform: { fields: 0, banchoff: 0, h0: 0, holeFields: 0, holeThresholds: 0, thresholds: 0, thresholdsWithHole: 0, maxHoles: 0, maxima: 0, saddles: 0 },
  bumps: { fields: 0, banchoff: 0, h0: 0, holeFields: 0, holeThresholds: 0, thresholds: 0, thresholdsWithHole: 0, maxHoles: 0, maxima: 0, saddles: 0 },
  d5: { fields: 0, banchoff: 0, h0: 0, holeFields: 0, holeThresholds: 0, thresholds: 0, thresholdsWithHole: 0, maxHoles: 0, maxima: 0, saddles: 0 },
};
const mismatches = [];
const tally = (fam, id, f) => {
  const r = check(f);
  const F = families[fam];
  F.fields++;
  if (!r.banchoffOk) { F.banchoff++; mismatches.push({ id, bar: "banchoff" }); }
  if (!r.h0Ok) { F.h0++; mismatches.push({ id, bar: "h0" }); }
  if (r.holeMiss) { F.holeFields++; F.holeThresholds += r.holeMiss; mismatches.push({ id, bar: "holes", thresholds: r.holeMiss }); }
  F.thresholds += 20;
  F.thresholdsWithHole += r.stats.withHole;
  F.maxHoles = Math.max(F.maxHoles, r.stats.maxHoles);
  F.maxima += r.stats.maxima;
  F.saddles += r.stats.saddles;
};

for (let i = 0; i < 1000; i++) tally(i % 2 === 0 ? "uniform" : "bumps", `random-${i}`, randomField(i));
const snaps = d5Fields();
for (const s of snaps) tally("d5", s.id, s.f);

const k4a = spawnSync(process.execPath, ["--test", "--test-name-pattern=K4", join(HERE, "..", "topo-field", "test", "known.test.mjs")], { encoding: "utf8" });
const k4aPass = k4a.status === 0 && /ℹ pass 1\b/.test(k4a.stdout) && /ℹ fail 0\b/.test(k4a.stdout);
const k4frame = (frame) => field((x, z) => { const r = Math.hypot(x, z); return frame >= 100 && r <= 6 ? 1 : r < 30 ? 0 : 1; }).map((v) => -v);
const k4b = [99, 100].map((frame) => {
  const f = k4frame(frame);
  return { frame, dual: holesAt(holeBars(f), -0.35), holeLabels: detectorHoles(f, -0.35) };
});
const k4bPass = k4b[0].dual === 0 && k4b[0].holeLabels === 0 && k4b[1].dual === 1 && k4b[1].holeLabels === 1;
const k4 = { pass: k4aPass && k4bPass, testPass: k4aPass, frames: k4b };

const total = (k) => Object.values(families).reduce((s, F) => s + F[k], 0);
const counts = {
  fields: total("fields"),
  banchoffMismatch: total("banchoff"),
  h0Mismatch: total("h0"),
  holeFieldMismatch: total("holeFields"),
  holeThresholdMismatch: total("holeThresholds"),
  thresholds: total("thresholds"),
  thresholdsWithHole: total("thresholdsWithHole"),
};
const anyMismatch = counts.banchoffMismatch + counts.h0Mismatch + counts.holeFieldMismatch > 0 || !k4.pass;
const verdict = !gate.ok ? "VOID" : anyMismatch ? "KILL" : "PASS";
const costMs = performance.now() - t0;

const summary = { verdict, gate, counts, families, k4, mismatches: mismatches.slice(0, 50), costMs, node: process.version };
const outDir = join(HERE, "out");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "t2.json"), JSON.stringify(summary, null, 2) + "\n");

const row = (name, F) => `| ${name} | ${F.fields} | ${F.banchoff} | ${F.h0} | ${F.holeFields} (${F.holeThresholds} thresholds) | ${F.thresholds} | ${F.thresholdsWithHole} | ${F.maxHoles} | ${(F.maxima / F.fields).toFixed(1)} | ${(F.saddles / F.fields).toFixed(1)} |`;
const lines = [
  `# T2 verdict: ${verdict}`,
  "",
  `${counts.fields} fields (1,000 random plus ${families.d5.fields} D5 snapshots), ${counts.thresholds} thresholds. Mismatches: Banchoff ${counts.banchoffMismatch} fields, H0 bars ${counts.h0Mismatch} fields, dual-sweep holes ${counts.holeFieldMismatch} fields (${counts.holeThresholdMismatch} thresholds). K4: ${k4.pass ? "pass" : "FAIL"}.`,
  "",
  "## Known-answer gate",
  "",
  `${gate.ok ? "ok" : "void"}: ${Object.entries(gate.checks).map(([k, v]) => `${k} ${v ? "ok" : "FAIL"}`).join(", ")}.`,
  "",
  "## Per family",
  "",
  "| family | fields | Banchoff mismatches | H0 mismatches | hole mismatches | thresholds | thresholds with a hole | max holes | mean maxima | mean saddles |",
  "|---|---|---|---|---|---|---|---|---|---|",
  row("uniform noise", families.uniform),
  row("random bumps", families.bumps),
  row("D5 snapshots", families.d5),
  "",
  "## K4",
  "",
  `\`known.test.mjs\` K4: ${k4.testPass ? "pass" : "FAIL"}. Dual-sweep and holeLabels hole counts at t = -0.35: frame 99 ${k4b[0].dual} and ${k4b[0].holeLabels}, frame 100 ${k4b[1].dual} and ${k4b[1].holeLabels}.`,
  "",
  "## Cost",
  "",
  `${costMs.toFixed(0)} ms for the whole run on Node ${process.version}.`,
  "",
];
if (mismatches.length) lines.push("## First mismatches", "", ...mismatches.slice(0, 20).map((m) => `- ${m.id}: ${m.bar}${m.thresholds ? ` (${m.thresholds} thresholds)` : ""}`), "");
writeFileSync(join(outDir, "t2.md"), lines.join("\n"));

console.log(`T2 verdict: ${verdict}; fields ${counts.fields}; Banchoff ${counts.banchoffMismatch}, H0 ${counts.h0Mismatch}, holes ${counts.holeFieldMismatch} mismatching fields; K4 ${k4.pass ? "pass" : "FAIL"}; ${costMs.toFixed(0)} ms`);
