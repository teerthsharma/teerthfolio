# T3 pre-registration addendum: L1 critical-cell share (L1 half only)

Written and committed before any code or run of T3; never edited after the first run. A reading that a number suggests after the run is a new addendum for a new run, not an edit here. `PREREGISTRATION.md` and `PREREGISTRATION-T2.md` are unchanged.

Scope. Only the L1 half of T3 is tested. L5 (stochastic re-bake staleness) is out and is not built: T1 returned DEAD on the route-plate library (`out/t1.md`), so there is no plate for L5 to refresh. No plate from `library.mjs` is used as an input. The T1 bed is used only as a simulator of roams (`roamWalk`, `tourWalk`, `ticksOf`) and the D5 heat field (`heat.mjs`, `liveSamples`). The classification and the bars come from `critical.mjs`, which passed T2.

## 1. The bars, verbatim

From the design report (`docs/topological-shader/README.md` on `release/seo-plus-load`), test table row T3:

| T3 critical-cell share and re-bake staleness | same bed as T1 | L1: median share <= 0.10 on every roam and the tour (control at least 3 times). L5: no bar beyond the kill | L1 DEAD if median > 0.25 on any. L5 DEAD if sup-norm staleness >= 0.10 on more than 1 percent of cell-seconds | `alive.mjs` |

From the L1 row of the same report:

| L1 | live residual only within one ring of a surviving critical cell of Pi_h(f) with persistence >= 0.05; elsewhere the plate stands | Lemma T: flipping a simple cell cannot change the components of a level set | T3: share of cells per 1 Hz sample; the same field with cells permuted must give at least 3 times the share | PASS median share <= 0.10 on every roam and the tour; DEAD if median > 0.25 on any |

From `PREREGISTRATION.md` section 6.5:

T3 critical-cell share and re-bake staleness: `alive.mjs`. Same bed as T1. L1 metric: share of cells within one ring of a critical cell with persistence >= 0.05, per 1 Hz sample; control: the same field with cells permuted must give at least 3 times the share. PASS: median share <= 0.10 on every roam and the tour; DEAD: median > 0.25 on any.

Hypothesis under test (Q11): life near critical cells covers at most 10 percent of cells.

## 2. Readings fixed before the run

The text leaves the following open. Each reading is taken now.

1. Beds. The tour bed is `tourWalk()` and the 30 roam beds are `roamWalk(seed)` for seeds 1 to 30 (`makePath(seed)`), each scored from an empty heat field, as in T1 readings 2 and 17. That is 31 beds.
2. The field. The live D5 heat field of `heat.mjs` (`liveSamples`, decay on, normalised Hn = H / M with M the running maximum), sampled once per second after ticks 10, 20, 30, ... (T1 reading 7). A sample with maximum equal to minimum is skipped and its count is reported. Float64 throughout.
3. Grid, tie order and cone. `makeHexGrid(84, 4)`, 1,615 cells; the tie order and the virtual vertex w of `PREREGISTRATION-T2.md` readings 1 to 4 apply unchanged; the classification is `classify` of `critical.mjs`.
4. Persistence of a critical cell. The bars of `critical.mjs` on the same field: `h0Bars` (a maximum is the birth cell m and a saddle is the merging cell s of a finite H0 bar) and `holeBars` (a minimum of the disc is the birth cell m and a saddle is the merging cell s of a dual-sweep hole bar). The persistence of a bar is |birth - death|, in Hn units. A cell takes the largest persistence of the bars it belongs to (a cell can be the saddle of several bars). A cell that belongs to no bar has persistence 0.
5. The essential class. The global maximum (first cell in the tie order) has no finite bar. It survives if and only if max(f) - min(f) >= 0.05, that is, its essential bar is at least 0.05 long. The virtual vertex w is not a cell and is never counted.
6. Surviving critical cell. A cell with `classify` type maximum, saddle or minimum (type 1, 3 or 2) whose persistence by readings 4 and 5 is >= 0.05 (inclusive, Float64 comparison). All other critical cells, including every critical cell on a plateau of exactly equal values (persistence exactly 0), are not surviving. A cell that appears in a bar of persistence >= 0.05 but is not critical by `classify` would be a classification disagreement; the count is reported and the run is void if it is not 0.
7. One ring. The closed one-ring of a cell is the cell and its graph neighbours in the grid adjacency of `GRID` (hex distance at most 1). The marked set is the union of the closed one-rings of all surviving critical cells.
8. Share. The share of a sample is (number of marked cells) / 1,615. The denominator is all cells of the disc, border cells included. The share of a bed is the median of its sample shares (an even count takes the mean of the two middle values, as in T1 reading 7).
9. The permuted control. For each sample, the 1,615 values of the same field are permuted by a Fisher-Yates shuffle and the whole pipeline of readings 4 to 8 is recomputed on the permuted field. The permutation stream of bed b is `mulberry32(10000 + b)` (from `experiments/topo-field/field.mjs`), with b = 0 for the tour and b = seed for roam `seed`, and one fresh shuffle per sample drawn in sample order. The control share of a bed is the median over its samples. The control condition holds on a bed when control share >= 3 times the real share of that bed (non-strict).
10. Verdict. Precedence: VOID, then DEAD, then PASS, else UNRESOLVED (T1 reading 14).
    - VOID if a known-answer gate of reading 11 fails or the count of reading 6 is not 0.
    - DEAD if the median share exceeds 0.25 (strictly) on any one of the 31 beds.
    - PASS if the median share is <= 0.10 on all 31 beds and the control condition holds on all 31 beds.
    - Otherwise UNRESOLVED. In particular, a median share <= 0.10 on all beds with the control condition failing on some bed is UNRESOLVED, and a median between 0.10 and 0.25 on some bed with none above 0.25 is UNRESOLVED.
11. Known answers (void, not dead, if any fails), asserted in `test/alive.test.mjs` and again at the top of `run-t3.mjs`: a single Gaussian bump (sigma 14 m at the origin) has exactly one surviving critical cell, an interior maximum, and share exactly 7/1,615; two bumps (sigma 10 m at (-20, 0) and (20, 0) of heights 1 and 0.8) have exactly three surviving cells (2 maxima, 1 saddle), disjoint one-rings and share exactly 21/1,615; a second bump of height 0.03 beside a bump of height 1 is below the 0.05 filter and the share is exactly 7/1,615; a ring ridge (r = 40 m, sigma 6 m) has a surviving minimum within 8 m of the origin with hole-bar persistence above 0.5; a constant field has share 0; the single-bump field with its cells permuted gives at least 3 times the real share.
12. Reported, not used in the verdict: the per-bed median and 95th percentile of the share; the mean number of surviving cells per sample by type; the median share counting every critical cell with no persistence filter (the filter's own effect); the number of samples and skipped samples per bed; and the wall time.
13. No threshold (0.05, 0.10, 0.25, the factor 3), ring radius, tie order, field family or seed is changed to move a verdict. If a gate bug voids the first run, the correction and the re-run are stated in the README with the commit of the void run, and the field counts of both runs are compared.
14. L5 and the library plates. L5 is not built and the verdict says nothing about it. Because T1 killed the route plates, "the plate stands" in L1 has no plate to stand on; the test measures only the share of the live field's cells that L1 would hand to the live residual, which is the quantity Q11 states.
