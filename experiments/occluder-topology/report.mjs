// Pure renderer: occluder-topology results object (shape in test/report.test.mjs fixture) -> results.md, sections in spec order.
import { BARS } from './verdict.mjs';

export const INTERPRETATION = [
  "D1 Grass term dropped: The island's only grass is the Covenant meadow, centred (102, 22) radius 11 (+2) (`places.js:95`; `terrain.js:432-440`), 220 tufts of three 0.34 m cones and 220 flower cups (`components/world/land/Covenant.jsx:195-205,211-212`), plus flat turf facets. The walk never gets there (docks clamp to r 83, roam bounces at 80: `path.mjs:8,9`; the meadow starts at x = 89), so a grass term would be an empty set. The pre-registered bed loses by this: the p < 1 \"draw over\" class (grass blades) has no real occupant, so thin-occluder flicker is exercised only by the movers; the class is tested only by known-answer masks.",
  'D2 Movers: 20 seeded walkers from `makeField` (topo-field), not penguins, because real penguins flee the seal and are not deterministic (`Penguins.jsx:226-265`); the prereg fallback is used.',
  'D3 p definition: `p = max(EDT over the component) - 0.5`, not the prereg "largest inradius in mask pixels", because the exact EDT gives every occluded pixel a distance of at least 1 and p < 1 could never occur. The pOffset0 sensitivity uses `p = max(EDT)`.',
  'D4 Events: the four `diffComponents` kinds (birth, death, merge, split) from `topo-field/cc.mjs`; no hole kinds.',
  'D5 Physically impossible frames: the path has no collisions, so a frame is invalid when the pup is within 0.9 m of a building, collider or mountain it cannot stand on. Transitions touching an invalid frame, and the seam into frame 3707, are excluded and reported, not counted.',
  'D6 Outcomes: PASS, DEAD and UNRESOLVED as the prereg states them; INVALID is added for a failed known-answer gate, which the prereg does not cover.',
  'D7 Mask: 32x32 rays over the pup\'s measured screen rect, not FrameGuard\'s 24-ray whole-frame grid; the prereg asks for the 32x32 box mask.',
  'D8 Not ported: dock lean and per-place zoom, camera shake, the litTint cutaway (buildings are treated as opaque solids, as the prereg says) and plinthLift in the camera focus.',
  'D9 LATCHED column: specified before any run, so it is not post-hoc, but it is not the pre-registered column and never replaces the verdict.',
];

const LIMITS = 'Limits. Lab and upstream-place sculpture heights are unknown: the nominal bed models none, and envelope is only an upper bound. Roofs and the igloo tunnel are ignored. Toy heights are assumed to be 2 x radius. Cutaway and heading lag are not modelled. The path has no collisions, so excluded frames are reported rather than removed from the walk. Cars and the real penguin flock are not modelled. Mask-space tracking by overlap breaks when relative image motion per frame exceeds a component width (boost, near occluders). The p offset and the 32 px resolution place the thresholds. Timing is Node on one machine only. The annex kills (async 32x32 readback p95 on Intel UHD; two `__replay` runs) are not run. Q3 and E0 are not covered.';

const f = (x, d = 3) => (Number.isFinite(x) ? x.toFixed(d) : String(x));
const sum = (xs) => xs.reduce((s, x) => s + x, 0);
const COLUMNS = [
  ['RAW', 'raw'],
  ['filtered (pre-registered)', 'plain'],
  ['LATCHED (not pre-registered)', 'latched'],
];
const SENSITIVITIES = [
  ['envelope', 'envelope: lab sculptures as cylinders of height 12 m (upper bound)'],
  ['n0', 'N=0: static occluders only'],
  ['pOffset0', 'pOffset=0: p = max(EDT)'],
];

function invariantText(c, key) {
  if (key === 'raw') return '-';
  if (key === 'plain') return c.invariant.plainHolds ? 'holds' : 'VIOLATED';
  return `${c.invariant.latchedHolds ? 'holds' : 'VIOLATED'} (frame0Births ${c.latched.frame0Births})`;
}

function seedTable(cells) {
  const rows = ['| seed | column | birth | death | merge | split | total | events/s | B1/s | 0.1 x B1/s | ratio to B1 | excluded | invalid share | invariant |', '|' + '---|'.repeat(14)];
  for (const c of cells) {
    for (const [label, key] of COLUMNS) {
      const k = c[key];
      const rate = k.total / c.seconds;
      rows.push(`| ${c.seed} | ${label} | ${k.birth} | ${k.death} | ${k.merge} | ${k.split} | ${k.total} | ${f(rate)} | ${f(c.b1.perSec)} | ${f(0.1 * c.b1.perSec)} | ${f(rate / c.b1.perSec, 2)} | ${c.excluded[key].total} | ${f(100 * c.invalidShare, 2)}% | ${invariantText(c, key)} |`);
    }
  }
  return rows;
}

function controlTable(r) {
  const rows = ['| column | real events per counted transition | shuffled events per counted transition | controlRatio | 20x bar |', '|---|---|---|---|---|'];
  for (const [label, key] of COLUMNS.slice(1)) {
    const real = sum(r.real.map((c) => c[key].total)) / sum(r.real.map((c) => c.counted));
    const shuffled = sum(r.shuffled.map((c) => c[key].total)) / sum(r.shuffled.map((c) => c.counted));
    const ratio = r.controlRatio[key];
    rows.push(`| ${label} | ${f(real, 5)} | ${f(shuffled, 5)} | ${f(ratio, 2)} | ${ratio >= 20 ? 'met' : 'NOT met'} |`);
  }
  return rows;
}

function invariantLines(r) {
  const groups = [['judged', r.real], ['shuffled control', r.shuffled], ...SENSITIVITIES.map(([k, label]) => [label, r.sens[k]])];
  const lines = [];
  for (const [label, cells] of groups) {
    for (const c of cells) {
      if (!c.invariant.plainHolds) lines.push(`- VIOLATED plain <= raw, ${label}, seed ${c.seed}: plain ${c.plain.total}, raw ${c.raw.total}. Recorded, not fixed.`);
      if (!c.invariant.latchedHolds) lines.push(`- VIOLATED latched <= raw + frame0Births, ${label}, seed ${c.seed}: latched ${c.latched.total}, raw ${c.raw.total}, frame0Births ${c.latched.frame0Births}. Recorded, not fixed.`);
    }
  }
  if (lines.length === 0) lines.push('Every cell holds plain <= raw and latched <= raw + frame0Births.');
  const same = r.real.map((c) => `seed ${c.seed}: ${c.tracking.birthDeathSameFrame}`).join('; ');
  lines.push(`Frames with a birth and a death in the same frame (judged cells, tracking breaks): ${same}.`);
  return lines;
}

export function renderMarkdown(r) {
  const L = [];
  const block = (...s) => L.push(...s, '');

  block('# Occluder-topology results (E3, pre-registered in PREREGISTRATION.md)');
  block(`Env: HEAD ${r.env.head}, node ${r.env.node}, CPU ${r.env.cpu} (${r.env.cpuCount} logical cores), ${r.env.date}.`);

  block('## Verdict', `Filtered column (the pre-registered one): **${r.judged.plain.verdict}**`, ...r.judged.plain.reasons.map((s) => `- ${s}`), 'The bars, verbatim from the prereg:', `- ${BARS.pass}`, `- ${BARS.dead}`, `- ${BARS.mid}`);

  block('## LATCHED reading', 'LATCHED: specified before the run, not pre-registered. This never replaces the verdict above.',`LATCHED column: **${r.judged.latched.verdict}**`, ...r.judged.latched.reasons.map((s) => `- ${s}`));

  block('## Per-seed table', 'Events per second are counted transitions over 60. Ratio to B1 is events/s over B1/s. Excluded and invalid share are per seed; the invariant column tests the column against its bound.', ...seedTable(r.real));

  block('## K control', `Known-answer gate (known.test.mjs): ${r.known.pass ? 'PASS' : 'FAIL'}, ${r.known.count} tests.`, 'Shuffled control: occluders re-randomised every frame; the ratio is shuffled events per counted transition over real events per counted transition.', ...controlTable(r));

  block('## Sensitivities', 'Not judged. Each row is one seed of a non-judged variant.', '| sensitivity | seed | RAW total | filtered total | LATCHED total | filtered events/s | B1/s |', '|---|---|---|---|---|---|---|', ...SENSITIVITIES.flatMap(([k, label]) => r.sens[k].map((c) => `| ${label} | ${c.seed} | ${c.raw.total} | ${c.plain.total} | ${c.latched.total} | ${f(c.plain.total / c.seconds)} | ${f(c.b1.perSec)} |`)));

  block('## Invariants', 'Witnesses are written out, not fixed.', ...invariantLines(r));

  block('## Interpretation', ...INTERPRETATION.map((g) => `- ${g}`));

  block('## Limits', LIMITS);

  return L.join('\n');
}
