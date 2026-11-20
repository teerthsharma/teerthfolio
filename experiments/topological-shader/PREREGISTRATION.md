Written before any run; committed unchanged. Only T1 is run in this commit series.

### 6.1 The route library (computed [S], pre-registered here)
Definition: from spawn, the legs to the 4 non-statue critical docks; from each, the leg to its rank-1 EDF dock outside the critical set. EDF rank 1 equals Euclidean NN in all 4 cases.

| # | leg | length (dock point to dock point) | deadlineS |
|---|---|---|---|
| 1 | spawn -> home | 11.2 m | 0.327 s |
| 2 | spawn -> p-caustic | 31.5 m | 1.278 s |
| 3 | spawn -> pr-tensorflow-124410 | 28.7 m | 1.489 s |
| 4 | spawn -> p-resolvent | 33.7 m | 1.517 s |
| 5 | home -> pr-openxla-46539 | 21.0 m | 0.932 s |
| 6 | p-caustic -> pr-nemo-relay-481 | 18.6 m | 0.795 s |
| 7 | pr-tensorflow-124410 -> pr-openxla-46539 | 16.0 m | 0.383 s |
| 8 | p-resolvent -> pr-highway-3244 | 21.5 m | 1.005 s |

L8 totals 182.2 m. A secondary, non-gating L10 adds the rank-2 continuations of the two docks whose rank-1 target coincides: home -> pr-highway-3244 (1.589 s) and pr-tensorflow-124410 -> pr-highway-3244 (1.366 s). The spawn-statue leg has length 0 and is not a plate.

### 6.5 Pre-registered tests (bars fixed now, before any run)
Folder `experiments/topological-shader/` with README, PREREGISTRATION.md (a copy of these bars, never edited after the first run), code, `test/`, `out/` (CLAUDE.md rule 6).

T1 RED first: does the library carry information? `library.mjs`. Bed: `makeHexGrid(84, 4)`; `makePath(seed)` for seeds 1 to 30 (one shared tour, 30 roams); D5 at sigma 6 m, half-life 90 s, 10 Hz deposit, 1 Hz samples. Arms: A = L8; B = 8 random directed dock pairs, 30 seeded draws; U = one uniform plate; C = the static layout prior; D = the first 8 legs walked (oracle). Metric: explained mass X = 1 - sum R / sum Hn, median over 1 Hz samples, reported separately for the tour (n = 1) and each roam. Known answers, or the run is void: a walk built only of L8 legs gives X >= 0.95; with the plate cells permuted that walk loses >= 0.2. PASS: tour X_A >= 0.5, and on the roams median(X_A - max(X_U, median X_B)) >= 0.15. DEAD: that median <= 0.05, or median X_A < 0.2. Anything else UNRESOLVED. Pre-stated: only 2 of 8 library legs are tour legs, so the tour half is a weak check either way.

T2 topology correctness (gate for T3 and T4): `critical.mjs`. 1,000 random fields plus 50 D5 snapshots. Bars, all exact: the Banchoff sum = 2 on every field; finite H0 bars of f = maxima - 1; at 20 thresholds per field the dual-sweep hole count equals `holeLabels` (`cc.mjs:98`); K4 passes. KILL: any mismatch; holes are then dropped from the harness.

T3 critical-cell share and re-bake staleness: `alive.mjs`. Same bed as T1. L1 metric: share of cells within one ring of a critical cell with persistence >= 0.05, per 1 Hz sample; control: the same field with cells permuted must give at least 3 times the share. PASS: median share <= 0.10 on every roam and the tour; DEAD: median > 0.25 on any. L5: one cell per frame re-baked with probability proportional to R; DEAD if sup-norm staleness >= 0.10 on more than 1 percent of cell-seconds.

T4 phase and amplitude on the L8 plates: `phase.mjs`. kappa from 2.5, Lambda from 2.6. DEAD (L2) if |kappa(u) - kappa(v)| > delta on more than 10 percent of edges of any plate. DEAD (L3) if the Spearman correlation between Lambda at a cell and the remaining life of its {Hn >= 0.20} component (via `diffComponents`) is below 0.3 on any roam.

T5 renderer gate: `neutral.mjs` driving `scripts/perf-frames.mjs` on a production build, 3 runs per adapter, adapters named. Arms: flag off; `?topo=neutral`. Bars: neutral-vs-off pixel difference <= 1/255 per channel on 3 held frames; programs at ready <= 109 (Intel) and <= 124 (RTX); first-visit window >= 938 and >= 844 frames; longest prewarm tick <= 37 and <= 40 ms; first key-press frame <= 36.4 ms (thesis H3 row). BAND ghosting: no trace longer than 8 frames after its cause leaves, in any of 3 runs (O3's criterion), and BAND <= 0.25 of visible cells at defaults. KILL: any one bar.

T6 blind owner pairs, the decisive kill: one held cutscene shot, composer plate as P. Arms: topological (section 4) against uniform noise with the same life budget: equal share of animated pixels and the same amplitude histogram. Precondition: a = 0 against a = a_max changes at least 1 percent of masked pixels by at least 2/255, else void. 8 pairs, order randomised. PASS: the owner picks the topological arm in >= 7 of 8 (null p = 0.035). DEAD: <= 4 of 8. Else UNRESOLVED.

