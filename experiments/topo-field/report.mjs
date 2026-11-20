// Pure renderer: results object -> results.md, in the section order the spec fixes.
import { BARS } from './verdict.mjs';

export const INTERPRETATION = [
  'G1 Disc radius is 84 m as the prereg says (= NORTH_RIM; HEAD island is 116 m). Dock points with r > 83 are scaled radially to r = 83. The seal never leaves r <= 83 (roam bounces at 80).',
  'G2 Mover influence: `m_i(x) = 1 - smoothstep(1.5, 3.0, d_i)`, `m(x) = max_i m_i(x)` (3 m is the outer radius; full strength inside 1.5 m). A mover is live (c<0.35) within ~2.08 m of a cell centre.',
  'G3 Water = fixed live annulus: cells with `hypot(x,z) >= 76` get `c = 0` always (WATER_R0 = 76, free parameter, prereg gives none). Sensitivity row without water at h=4,N=20.',
  'G4 "SIMPLIFIED events median <= 1 per second": bin the walk into whole 1-second bins of 60 frames (drop a partial last bin), count events per bin, take the median of the bin counts. "<= 0.1 x B1": compare MEAN rates (total events / seconds) vs (total crossings / seconds), per seed.',
  'G5 "DEAD if > 1 per 10 frames at h=4,N=20": pooled over the 3 seeds, `sum(simp events) / sum(frames) > 0.1`.',
  'G6 Persistence: a live component is significant iff `min c over its cells <= tau_low - delta` (tau_low 0.35, delta 0.10, tolerance +1e-12, boundary inclusive). SIMPLIFIED live set S = union of significant live components. Holes in SIMPLIFIED are holes of the complement of S, no further filter. RAW uses the full hysteresis live set.',
  'G7 No dwell at docks (the seal moves on when within 0.5 m of its dock); plain kinematics, heading snaps to the target (no collisions, no steering).',
  'G8 E2 bar is judged at h=4, N=20 (same cell as E1), pooled over 3 seeds; N=0 and N=60 are reported next to it, not judged.',
  'G9 Frame 0 produces no events; events are counted on transitions f=1..F-1; `frames` = F-1.',
];

const LIMITS = 'Occlusion term not modelled (the camera never rotates). No collisions or steering in the path. The 3 seeds share one tour (the tour is seed-independent; only the roam differs). Timing is wall-clock single-thread JS on the one machine named in the environment line, and GPU read-back is not measured. Q3, Q4 and E0 are not covered. The one-frame seam (2.85 m tour-to-roam hand-over at frame 3707) is excluded from the headline event counts and reported as `seam`; B1 is computed on the unmodified path and so includes that one pair. results.md sits under out/ because results/ is git-excluded in this repo.';

const f = (x, d = 3) => (typeof x === 'number' && Number.isFinite(x) ? x.toFixed(d) : String(x));

export function renderMarkdown(r) {
  const L = [];
  const push = (...s) => L.push(...s, '');
  push('# E1/E2 topo-field results');
  push(`Env: HEAD ${r.env.head}, node ${r.env.node}, CPU ${r.env.cpu} (${r.env.cpuCount} logical cores), ${r.env.date}.`);

  push('## Verdict');
  push(`- E1: **${r.verdict.e1}**`);
  push(`- E2: **${r.verdict.e2}**`);
  for (const s of r.verdict.reasons) push(`- ${s}`);
  push('Bars, verbatim from the prereg:');
  push(`- ${BARS.pass}`, `- ${BARS.dead}`, `- ${BARS.e2}`, `- ${BARS.k5}`);

  push('## Known-answer tests');
  push(`Gate: \`node --test experiments/topo-field/test/known.test.mjs\`, exit status ${r.known.status}.`);
  push('| test | result |', '|---|---|');
  for (const t of r.known.tests) L.push(`| ${t.name} | ${t.pass ? 'pass' : 'FAIL'} |`);
  L.push('');
  push('K5 is the shuffled control, reported below.');

  push('## E1 sweep');
  push('| h | N | seed | ncells | seconds | RAW total | RAW seam | SIMP total | SIMP birth | SIMP death | SIMP merge | SIMP split | SIMP holeOpen | SIMP holeClose | SIMP seam | SIMP events/s (mean) | SIMP median/s | RAW median/s | B1/s | B2 no-hyst flips/s | B2 hyst flips/s |');
  L.push('|' + '---|'.repeat(21));
  for (const c of r.e1) {
    const s = c.simp;
    L.push(`| ${c.h} | ${c.N} | ${c.seed} | ${c.ncells} | ${f(c.seconds, 2)} | ${c.raw.total} | ${c.raw.seam.total} | ${s.total} | ${s.birth} | ${s.death} | ${s.merge} | ${s.split} | ${s.holeOpen} | ${s.holeClose} | ${s.seam.total} | ${f(s.total / c.seconds)} | ${f(s.medianPerSec, 1)} | ${f(c.raw.medianPerSec, 1)} | ${f(c.b1.perSec)} | ${f(c.b2.noHystPerSec)} | ${f(c.b2.hystPerSec)} |`);
  }
  L.push('');

  push('## K5 shuffled control');
  push(`Judged ratio (SIMPLIFIED, h=4, N=20): ${f(r.k5Ratio.judged, 2)}x. Bar 20x: ${r.k5Ratio.judged >= 20 ? 'met' : 'NOT met'}.`);
  push('| h | RAW real/frame | RAW shuffled/frame | RAW ratio | SIMP real/frame | SIMP shuffled/frame | SIMP ratio |', '|---|---|---|---|---|---|---|');
  for (const h of Object.keys(r.k5Ratio.byH)) {
    const b = r.k5Ratio.byH[h];
    L.push(`| ${h} | ${f(b.realPerFrame.raw, 5)} | ${f(b.shuffledPerFrame.raw, 5)} | ${f(b.raw, 2)} | ${f(b.realPerFrame.simp, 5)} | ${f(b.shuffledPerFrame.simp, 5)} | ${f(b.simp, 2)} |`);
  }
  L.push('');
  push('Shuffled rows (N=20, mover positions re-randomised every frame):');
  push('| h | seed | frames | RAW total | SIMP total | SIMP seam | SIMP events/s (mean) |', '|---|---|---|---|---|---|---|');
  for (const c of r.k5) L.push(`| ${c.h} | ${c.seed} | ${c.frames} | ${c.raw.total} | ${c.simp.total} | ${c.simp.seam.total} | ${f(c.simp.total / c.seconds)} |`);
  L.push('');

  push('## E2 CPU cost');
  push('Per (h, N): median and p95 of the per-frame core (field update + tag + count) and full (core + events), in ms, averaged over seeds. The judged cell is marked.');
  push('| h | N | judged | core median | core p95 | full median | full p95 |', '|---|---|---|---|---|---|---|');
  for (const b of r.e2.byCell) {
    L.push(`| ${b.h} | ${b.N} | ${b.h === 4 && b.N === 20 ? 'yes' : ''} | ${f(b.coreMedian, 4)} | ${f(b.coreP95, 4)} | ${f(b.fullMedian, 4)} | ${f(b.fullP95, 4)} |`);
  }
  L.push('');
  if (r.e2.pooled) {
    const p = r.e2.pooled;
    push(`Pooled over the 3 seeds at h=4, N=20 (judged, from the concatenated per-frame arrays after the 300-frame warm-up): core median ${f(p.coreMedian, 4)} ms, core p95 ${f(p.coreP95, 4)} ms (bar <= 0.5 ms), full median ${f(p.fullMedian, 4)} ms, full p95 ${f(p.fullP95, 4)} ms.`);
  }

  push('## Sensitivity');
  push('Water on versus off, h=4, N=20, per seed.');
  push('| seed | water | RAW total | SIMP total | SIMP events/s (mean) | SIMP median/s | B1/s |', '|---|---|---|---|---|---|---|');
  for (const c of (r.water || [])) {
    L.push(`| ${c.seed} | off | ${c.raw.total} | ${c.simp.total} | ${f(c.simp.total / c.seconds)} | ${f(c.simp.medianPerSec, 1)} | ${f(c.b1.perSec)} |`);
  }
  for (const c of (r.e1 || []).filter((c) => c.h === 4 && c.N === 20)) {
    L.push(`| ${c.seed} | on | ${c.raw.total} | ${c.simp.total} | ${f(c.simp.total / c.seconds)} | ${f(c.simp.medianPerSec, 1)} | ${f(c.b1.perSec)} |`);
  }
  L.push('');

  push('## Interpretation');
  for (const g of INTERPRETATION) L.push(`- ${g}`);
  L.push('');

  push('## Limits');
  push(LIMITS);

  return L.join('\n');
}
