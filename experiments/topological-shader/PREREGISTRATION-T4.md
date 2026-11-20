# T4 pre-registration addendum: phase and amplitude on the L8 plates

Written and committed before any code or run of T4; never edited after the first run. A reading that a number suggests after the run is a new addendum for a new run, not an edit here. `PREREGISTRATION.md`, `PREREGISTRATION-T2.md` and `PREREGISTRATION-T3.md` are unchanged.

Scope. T4 is run on the 8 baked plates exactly as the table row states. T1 returned DEAD on the library (`out/t1.md`): the plates do not explain roam heat. The owner ordered the machinery completed regardless, so the verdict of T4 stands whatever it is, and a DEAD for L2 or L3 kills that mechanism and nothing else. The classification and the bars come from `critical.mjs`, which passed T2.

## 1. The bars, verbatim

From the design report (`docs/topological-shader/README.md` on `release/seo-plus-load`), test table row T4:

| T4 phase and amplitude on the L8 plates | kappa and Lambda of the 8 plates, delta 0.05 | kill criteria only | L2 DEAD if |kappa(u) - kappa(v)| > delta on more than 10 percent of edges of any plate. L3 DEAD if Spearman < 0.3 on any roam | `phase.mjs` |

From the L2 and L3 rows of the same report:

| L2 | phase 2 pi kappa / delta from the distance to the nearest critical value; motion bands are level sets that reconnect at saddles | critical values are diagram coordinates and move at most eps (P1); only values are used, never identities. Holds on static (baked) plates only (K15) | T4: known answer, kappa moves at most 4 eps per step or the run is void | DEAD if kappa differs by more than delta across more than 10 percent of edges of any plate |
| L3 | amplitude and tempo from the top tent of the persistence landscape (not the sum over bars); large Lambda moves large and slow, small flickers small | depends on the diagram and f(v) only; assumes persistence in value predicts lifetime in time | T4: Spearman correlation between Lambda at a cell and the remaining life of its {Hn >= 0.20} component (`diffComponents`) | DEAD if the correlation is below 0.3 on any roam |

From `PREREGISTRATION.md` section 6.5:

T4 phase and amplitude on the L8 plates: `phase.mjs`. kappa from 2.5, Lambda from 2.6. DEAD (L2) if |kappa(u) - kappa(v)| > delta on more than 10 percent of edges of any plate. DEAD (L3) if the Spearman correlation between Lambda at a cell and the remaining life of its {Hn >= 0.20} component (via `diffComponents`) is below 0.3 on any roam.

From the formal section of the same report, the definitions:

kappa(v) = min(2 delta, min over finite bars (b, d) of [min(|f(v) - b|, |f(v) - d|) + max(0, 2 delta - (b - d))]), the essential bar excluded. Across one edge |kappa(u) - kappa(v)| <= |f(u) - f(v)|; under a sup distance of at most eps, |kappa_f(v) - kappa_g(v)| <= 4 eps.

Lambda(v) = max over bars with b - d >= delta of tent(f(v)) / N, with a fixed normaliser N (2 delta, or the essential range at bake time), where tent(x) = max(0, min(x - d, b - x)).

Hypothesis under test (Q12): the kappa phase on plates does not alias, and Lambda predicts remaining life.

## 2. Readings fixed before the run

The text leaves the following open. Each reading is taken now.

1. The plates. `public/topo/route-plates.json` as committed (format version 1, `grid` n 1,615, 8 legs), each `heat` array read as Float64 in the file's cell order. The plates are not re-baked. A plate is the field f in Hn units: its maximum is 1 and its values carry 4 decimals. delta = 0.05 (`DELTA` of `alive.mjs`).
2. The edge set. The undirected edges of the hex adjacency CSR of `lib/world/heat/hexgrid.js` `makeHexGrid(84, 4)` (`adj.offsets`, `adj.indices`), each pair counted once (i < j). All edges are in the denominator, flat edges included. The experiment grid `GRID` of `heat.mjs` (from `experiments/topo-field/hexgrid.mjs`) must have the same cell positions and the same edge set; if not, the run is void.
3. Bars. The bars of `critical.mjs` on the plate: `h0Bars` (finite H0 bars, essential bar not produced) and `holeBars` (finite dual-sweep hole bars), with the tie order and the cone of `PREREGISTRATION-T2.md` readings 1 to 6. Both families are the finite bars (b, d) of the formula. The persistence of a bar is |b - d| (for a hole bar b < d, so the design's b - d is read as its absolute value). Bars of persistence 0 are kept; they contribute at least 2 delta and so never lower kappa.
4. kappa. Exactly the formula of section 1 with the finite bars of reading 3, in Float64. A field with no finite bar has kappa = 2 delta = 0.1 everywhere. The phase 2 pi kappa / delta is a monotone map of kappa and is not computed.
5. The L2 statistic. For each plate, the share of the 4,698 edges with |kappa(u) - kappa(v)| > delta (strict, Float64). L2 is DEAD if that share is above 0.10 (strict) on any one of the 8 plates; otherwise L2 SURVIVES. There is no PASS bar: a survival says only that the kill did not fire.
6. Lambda. The formula of section 1 over the finite bars of reading 3 whose persistence |b - d| is >= delta (inclusive, Float64), with lo = min(b, d), hi = max(b, d), tent(x) = max(0, min(x - lo, hi - x)), and N = 2 delta = 0.1. The essential bar is excluded, as in kappa. A cell outside the open interval of every such bar has Lambda 0. The Spearman statistic is invariant to any positive N, so the choice of N cannot move a verdict.
7. Lambda at a cell on a roam. The text says kappa and Lambda come only from static plates. The Lambda field of a roam is the same for every roam: Lambda_lib(v) = max over the 8 plates k of Lambda_k(v), computed once from the 8 baked plates. It is a function of the cell alone and does not look at the roam.
8. Beds. The 30 roams are `roamWalk(seed)` for seeds 1 to 30 (`makePath(seed)`), each scored from an empty heat field, as in T1 reading 2 and T3 reading 1. The tour, `tourWalk()`, is scored the same way and is reported; it does not enter the L3 verdict, because the bar says "any roam" and T1 reading 15 already separates the tour from the roams.
9. The field. The live D5 heat field of `heat.mjs` (`liveSamples`, decay on, normalised Hn = H / M with M the running maximum), sampled once per second after ticks 10, 20, 30, ... (T1 reading 7). Every sample is used, a sample with no heat simply has no component cell.
10. Components. The connected components, under the 6-adjacency of `GRID` (`makeLabeler` of `experiments/topo-field/cc.mjs`), of the set {Hn >= 0.20} (inclusive, Float64). A cell with Hn < 0.20 has no component and no pair.
11. Remaining life. Time is the sample index t = 0 to T - 1, one step per second. A component D at t + 1 is a descendant of a component C at t if they share at least one cell. life(C, t) = 0 if C has no descendant, otherwise 1 + the maximum of life(D, t + 1) over its descendants (the lineage lasts as long as its longest-lived descendant); the life of any component at the last sample is 0. A merge and a split are continuations; the death event of `diffComponents` is exactly a component with no descendant, and the run is void if the death count of `diffComponents` summed over a bed differs from the count of components with no descendant.
12. Censoring. A lineage that is still alive at the last sample of a roam has an unknown end. It is kept at the value of reading 11 (a lower bound) in the verdict. The variant that drops the cell-samples of every lineage that reaches the last sample is reported and is not used in the verdict.
13. The pairs and Spearman. For each roam, every sample t and every cell v with a component at t gives one pair (Lambda_lib(v), life(component of v at t, t)). The pairs of a roam are pooled. The statistic is the Pearson correlation of the average ranks (ties take the mean rank), in Float64. If either variable is constant on a roam the correlation is undefined, and it is counted as 0, that is, below the bar. The correlation is the one number of the roam.
14. L3 verdict. L3 is DEAD if the correlation is below 0.3 (strict) on any one of the 30 roams; otherwise L3 SURVIVES. There is no PASS bar.
15. Verdict. Precedence: VOID, then DEAD, then SURVIVES. The two halves are reported separately; the T4 verdict is the pair (L2, L3). VOID if a gate of reading 16 fails.
16. Known answers and gate (void, not dead, if any fails), asserted in `test/phase.test.mjs` and again at the top of `run-t4.mjs`:
    - kappa and Lambda on hand-built bars: a bar (1.0, 0.7) of persistence 0.3 gives kappa 0 at f = 1.0 and at f = 0.7, 0.02 at f = 0.72, and 0.1 at f = 0.85; a short bar (0.5, 0.46) of persistence 0.04 gives kappa 0.06 at f = 0.5; no bars give kappa 0.1; the tent of (1.0, 0.7) peaks at 0.15 at f = 0.85 and is 0 at f = 0.7, 1.0 and outside; Lambda ignores a bar of persistence 0.03 and a bar of persistence exactly 0.05 is counted.
    - on a single Gaussian bump (sigma 14 m) kappa is 0.1 on every cell and Lambda is 0 on every cell (no finite bar of persistence >= delta); on two bumps (sigma 10 m at (-20, 0) and (20, 0), heights 1 and 0.8) kappa is 0 at the lower maximum cell and at the saddle cell, and Lambda is positive on the cells between the lower peak value and the saddle value;
    - the edge bound |kappa(u) - kappa(v)| <= |f(u) - f(v)| + 1e-12 on every edge of the 8 plates, and the sup bound |kappa_f - kappa_g| <= 4 eps + 1e-12 for each plate g = plate + uniform noise on [-eps, eps], eps = 0.01, one draw per plate from `mulberry32(100 + k)`;
    - the CSR of `lib/world/heat/hexgrid.js` and `GRID` agree (reading 2), the file has version 1, n 1,615, 8 legs and each plate has maximum exactly 1;
    - Spearman known answers (a monotone pair gives 1, a reversed pair -1, the tied case x = [1, 2, 2, 3], y = [1, 3, 2, 4] gives 0.9487, a constant variable gives the undefined case) and the life known answers of reading 11 on hand-built label sequences (a blob alive for samples 0 to 4 has life 4, 3, 2, 1, 0; two blobs that merge keep both lives; a split takes the longest branch);
    - the death count of reading 11 against `diffComponents` on every bed.
17. Reported, not used in the verdict: per plate the share of edges over delta, the share of cells with kappa below 2 delta, the number of bars of persistence >= delta by family, and the maximum kappa edge difference; per roam the number of pairs, the share of pairs with Lambda_lib > 0, the correlation of reading 12 (censored lineages dropped), the correlation with Lambda computed from the live field's own bars at each sample (the live-field Lambda, which the design does not allow in the shader and which is context only), and the correlation with Lambda_lib permuted over the cells (one Fisher-Yates shuffle per bed from `mulberry32(20000 + b)`, b = 0 for the tour and b = seed for roam `seed`; the control that the instrument can read zero); the tour's correlation; the wall time.
18. No threshold (0.05, 0.10, 0.20, 0.3), tie order, N, field family or seed is changed to move a verdict. If a gate bug voids the first run, the correction and the re-run are stated in the README with the commit of the void run, and the numbers of both runs are compared.
19. What a verdict means. L2 DEAD would mean the phase aliases on the plates at h = 4 m, and the plate phase 2 pi kappa / delta is dropped from the shader; L3 DEAD would mean the plate Lambda does not predict the life of live components, and the amplitude and tempo of L3 are dropped. A SURVIVES is not evidence that the mechanism helps the picture; that is T6.
