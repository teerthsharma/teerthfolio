# Topological shader, T1: does the route library carry information?

The question is whether the 8-leg baked route-plate library (PREREGISTRATION.md section 6.1) explains where the seal's route heat goes. The explained mass X projects the live heat field onto the plates (one projection per plate), on a 1 Hz cadence over the tour and over 30 seeded roams. Bars, definitions and the known-answer gate are fixed in PREREGISTRATION.md before any run, and the run is in `run-t1.mjs`.

## Files

| file | purpose |
|---|---|
| `PREREGISTRATION.md` | sections 6.1 and 6.5 of the design, copied verbatim before any run (commit 1) |
| `library.mjs` | the 8 legs and their table, the critical set, the tour order, the leg walker, the tour and roam beds |
| `heat.mjs` | the route-heat field D5 (sigma 6 m, cut 3.5 sigma, 10 Hz deposit, 90 s half-life), plate baking, the static prior |
| `explain.mjs` | the explained mass X, medians, plate permutation |
| `verdict.mjs` | the bar strings, the known-answer gate and the pure verdict |
| `run-t1.mjs` | runs arms A, U, B, C, D on the tour and the 30 roams, the gate, and writes `out/t1.json` and `out/t1.md` |
| `test/` | unit tests for each module, including that the bar strings occur verbatim in PREREGISTRATION.md |
| `out/` | committed results of the single T1 run |

Run the tests with `node --test experiments/topological-shader/test/*.test.mjs` and the experiment with `node experiments/topological-shader/run-t1.mjs`.

## Dependencies

The grid is `makeHexGrid(84, 4)` and the roams are `makePath(seed)` from `experiments/topo-field/`, which are read and not changed. The dock points, the spawn, the motion constants and the deadline functions are read from `lib/world/`.

## Ambiguities and the reading taken

Each item is a place where the pre-registered text does not fix a choice. The reading below was taken before the run and was not changed after a number was seen.

1. Leg walks start from rest (speed 0) at each leg's start. The tour in `path.mjs` carries speed from one leg to the next. The plates and arms B and D use legs from rest.
2. The tour and each roam are scored as separate beds, each from an empty heat field. A roam starts at the tour's last position but is not preceded by heat from the tour.
3. The known-answer walk is the 8 L8 legs in table order, each walked from rest, concatenated with no deposit in transit. The known-answer gate uses the same live field and the same X as the other arms.
4. The deposit is one per 10 Hz tick, taken from frames 0, 6, 12, ... of the 60 Hz walk. The amount per tick at the centre is K = 0.1 (dt, with rho K(0) = 1, from the design's 2.7). The kernel is exp(-d^2 / (2 sigma^2)), cut at 3.5 sigma. Plates are normalised to a maximum of 1, so K cancels in them.
5. Decay on the live field is 0.5^(0.1 / 90) per tick, applied before each deposit. Plate bakes suspend decay (P9).
6. The running maximum M is the maximum over cells and over all earlier ticks. Hn = H / M.
7. Samples are taken after ticks 10, 20, 30, ... (1 Hz). A sample with no heat is skipped. A median over an even count is the mean of the two middle values.
8. Each plate weight w_k is its own projection, clamp(<Hn, H_k> / <H_k, H_k>, 0, 1), as written. The weights are not solved jointly, so overlapping plates can jointly over-explain a cell (R is clipped at 0).
9. Arm B: each draw takes 8 directed pairs of distinct places among the 26 place dock points (the spawn statue is excluded), using `mulberry32(d + 1)` for draws d = 0 to 29 (seeds 1 to 30). The start index is uniform over 26 and the end index uniform over the other 25. The per-roam B value is the median over the 30 draws.
10. Arm C (the static layout prior) is not defined in section 6.5. The reading taken is one plate: the same kernel summed over the 26 place dock points, normalised to 1. Arm C is reported and is not used in the verdict.
11. Arm D (oracle): the plates are the first 8 legs of the tour, built by the same nearest-neighbour order as `path.mjs` from spawn over the place dock points, and baked as the other plates. The same 8 plates serve every roam.
12. Walks aim at dock points clamped to radius 83 m, as `path.mjs` does. The 8 L8 legs and their lengths use the same points, all of which lie inside 83 m, so the clamp is inactive for them.
13. The critical set uses the rule of `components/world/cutscene/prewarm.js`: deadline from spawn under `CRITICAL_S` (1.6 s), or `SPAWN_CRITICAL_S` (12 s) for the statue. The rank-1 EDF dock is measured from the source dock's point with `deadlineS` as written. The result reproduces the table exactly, so this reading is confirmed by the library test.
14. Verdict precedence: VOID first, then DEAD, then PASS, else UNRESOLVED. The text does not order DEAD against PASS. A case that satisfies both (median X_A below 0.2 while the margin is at least 0.15 and the tour clears 0.5) is reported as DEAD.
15. The DEAD bar's "median X_A" is the median over roams, not the tour value.
16. The known-answer permutation is a seeded Fisher-Yates shuffle of the 1,615 cells (`mulberry32(7)`), applied to every L8 plate.
17. The tour bed is the tour part of `makePath(1)`. It is the same for every seed.
18. Plates and fields are Float64. Quantisation to Uint8 (section 6.2) is a shader step and is not part of T1.
19. The experiment index `experiments/README.md` is not changed, because the task restricts files to `experiments/topological-shader/`.

## What the measurement does not cover

Only the 8 L8 legs and the tour and roam beds of the design are measured. No visitor route exists, so the roams are synthetic walks from `makePath`. Alternative readings of items 1, 2 and 10 were not run.

## T2: topology correctness

The question is whether the piecewise-linear critical-cell classification, the H0 bars and the dual-sweep hole bars of a field on the 1,615-cell hex disc (coned with one virtual vertex) agree exactly with the Banchoff sum, the maxima count and `holeLabels` (`experiments/topo-field/cc.mjs`). Bars, readings and the order of events are in `PREREGISTRATION-T2.md`, committed before the first run. The result is in `out/t2.md` and `out/t2.json`.

| file | purpose |
|---|---|
| `PREREGISTRATION-T2.md` | T2 bars verbatim and the readings taken before any run |
| `critical.mjs` | link cycles, critical classification and Banchoff sum, H0 bars, dual-sweep hole bars, the `holeLabels` bridge |
| `run-t2.mjs` | the gate, 1,000 random fields, 50 D5 snapshots, K4, and `out/t2.json` and `out/t2.md` |
| `test/critical.test.mjs` | known answers (single bump, two bumps, ring, saddle, monkey saddle, constant field, K4) and the bar strings |

Run with `node experiments/topological-shader/run-t2.mjs`.

The first run of `run-t2.mjs` (commit `ec67088`) was VOID, not a verdict: its monkey-saddle gate compared the multiplicity summed over the whole field (the lattice adds saddles near the border) with 2, where the unit test and the pre-registration reading 12 mean the origin cell. The gate line in the runner was corrected and the experiment re-run; the field counts of the two runs are identical (0 mismatches in both). No bar, threshold or field family changed.

Limits: on the 50 D5 snapshots only 10 of 1,000 thresholds have a hole (at most 1), so the hole bar is exercised mostly by the 1,000 random fields (11,636 of 20,000 thresholds with at least one hole, up to 158 holes). The D5 snapshots carry exact-zero plateaus and run on the tie order of reading 2. The two hole counts are computed by independent code paths but on the same grid, so they test the dual sweep against the complement labelling, not the grid against the design.

## T3, L1 half: how much of the field does a critical-cell residual cover?

The question is whether the live residual of L1, confined to one ring around the surviving critical cells (persistence >= 0.05) of the live heat field, stays within 10 percent of the 1,615 cells (Q11). Only the L1 half is tested. L5 (re-bake staleness) is not built: T1 killed the route-plate library, so there is no plate to refresh, and no plate from `library.mjs` is an input here. The T1 bed is used only as a simulator of the tour and the 30 roams, with the D5 field of `heat.mjs` sampled at 1 Hz. Bars, readings and the order of events are in `PREREGISTRATION-T3.md`, committed (`6b7881a`) before any code or run. The result is in `out/t3.md` and `out/t3.json`.

| file | purpose |
|---|---|
| `PREREGISTRATION-T3.md` | T3 bars verbatim and 14 numbered readings, fixed before any code |
| `alive.mjs` | surviving critical cells (bar persistence from `h0Bars` and `holeBars`), the one-ring share, the permuted control, the verdict |
| `run-t3.mjs` | the known-answer gate, the 31 beds, the permuted control, and `out/t3.json` and `out/t3.md` |
| `test/alive.test.mjs` | known answers (single bump 7/1,615, two bumps 21/1,615, a bump under the filter, ring minimum, constant field, permuted bump), verdict precedence and the bar strings |

Run with `node experiments/topological-shader/run-t3.mjs`.

Result (one run on the commit that adds `out/t3.json`, Node v25.8.1 single thread, 6.1 s, no void first run): PASS. Over the tour and 30 roams (31 beds, 1,861 one-second samples, none skipped) the median share per bed lies between 0.0043 and 0.0477 (median of medians 0.0130). The tour is the largest at 0.0477 and the largest roam is roam 24 at 0.0381. No bed exceeds 0.10 (the PASS bar) and none exceeds 0.25 (the DEAD bar). The permuted control gives a median share of at least 0.614 on every bed, at least 18.1 times the real share, so the 3 times condition holds on all 31 beds. The known-answer gate passed and the count of bar cells that `classify` does not call critical is 0.

Context, not bars. The 95th percentile of the share is at most 0.091 on any bed (the tour). Without the persistence filter the median share is 0.044 to 0.150 across beds; on the tour the filter takes it from 0.1195 to 0.0477. The mean number of surviving critical cells per sample on the tour is 5.0 maxima, 4.2 saddles and 0.2 minima.

Limits: the PASS says the live field's own structure is sparse, not that a residual near critical cells reproduces the live field; the pixels outside the rings are not compared with anything. The field is a sum of Gaussian deposits along one walker's track, so it is smooth and has few critical cells by construction, and the permuted control is white noise on the same values, far above any real field, so the 3 times condition is easy. The tour has the least margin (median 0.0477, p95 0.091 against the 0.10 bar). The walks are synthetic (`makePath`); no visitor route exists. The PASS is a necessary condition for L1 and says nothing about L5.

## T4: phase and amplitude on the 8 plates

The question is whether the phase kappa (L2) of the 8 baked route plates stays within 0.05 across the edges of the hex grid (it must not alias at h = 4 m) and whether the amplitude Lambda (L3) of the plates predicts the remaining life of the live {Hn >= 0.20} components on the 30 roams. Kill criteria only, run on the plates as written although T1 found that they do not explain roam heat. Bars, 19 numbered readings and the known-answer gate are in `PREREGISTRATION-T4.md`, committed (`f95c7bc`) before any code or run. The result is in `out/t4.md` and `out/t4.json`.

| file | purpose |
|---|---|
| `PREREGISTRATION-T4.md` | T4 bars verbatim, the kappa and Lambda definitions, and 19 readings fixed before any code |
| `phase.mjs` | kappa and Lambda from the finite bars (`h0Bars`, `holeBars`), the edge set share, component lifetimes, Spearman with average ranks, the known answers and the pure verdict |
| `run-t4.mjs` | the gate, the 8 plates, the tour and 30 roams, the context columns, and `out/t4.json` and `out/t4.md` |
| `test/phase.test.mjs` | hand-built kappa and Lambda values, single and two bumps, the edge set against the production grid, Spearman and lifetime known answers, the strict bars |

Run with `node experiments/topological-shader/run-t4.mjs`.

Result (Node v25.8.1 single thread, 1.6 s, gate ok, no void run): L2 SURVIVES, L3 DEAD. The 8 plates carry no finite bar of persistence 0.05 or more, by either family: the largest finite bar of any plate is 0.0019 (`spawn-seal-to-p-resolvent`) and the other 7 are below 0.00005 (each plate has one effective peak). So kappa is the constant 2 delta = 0.1 on every cell of 7 plates and on all but 0.12 percent of the cells of the eighth, and the share of edges with |kappa(u) - kappa(v)| > 0.05 is 0 on all 8 plates (bar: DEAD above 0.10). Lambda is 0 on every cell of every plate, so Lambda at a cell is a constant over the 316,385 (cell, sample) pairs of the 31 beds (1,861 one-second samples) and the Spearman correlation is undefined on 30 of 30 roams and on the tour. Reading 13 counts it as 0, below the 0.3 bar, on every roam. The run gate passed: the known answers, the production grid against the experiment grid (the same 4,698 edges and positions), the edge bound |kappa(u) - kappa(v)| <= |f(u) - f(v)| on all 8 plates, the sup bound |kappa_f - kappa_g| <= 4 eps (largest move 0.0144 against 0.04 at eps 0.01), and the death count of the lifetime code against `diffComponents` on all 31 beds.

What is dead and what stays. L3 as defined, amplitude and tempo from the top tent of the plates, is dead: a plate has no bar for a tent to stand on. L2 survives the kill vacuously: the phase does not alias because it does not vary, and a constant phase gives no motion band, so a survival says nothing in favour of L2 (T6 would be the test of that). Both results follow from one fact, a plate is a single smooth bump with no valley deeper than 0.05 and no hole, and they hold for any value of the Lambda normaliser N and for every reading of the phase map, since both are monotone in kappa and Lambda. L1 (T3 PASS) and the live-field mechanisms are not touched by this verdict. Reserved, not tested here: kappa and Lambda from the live field's own bars (the design allows them at 1 Hz only if L1 is on, and its phase is unbounded by theory, K15). As context only, with no bar behind it, the Lambda of the live field's bars at each sample gives a Spearman correlation with the remaining life of between -0.730 and 0.180 over the 30 roams (tour -0.363), none at or above 0.3; so the live-field Lambda in this definition does not rescue L3 either. The Lambda-permuted control and the censored-lineages-dropped variant are 0 on every roam for the same reason (Lambda constant).

The run was made once, before the context column `largest finite bar` was added to the plate table of `run-t4.mjs` and `out/t4.md`; the second run (the committed one) differs from the first in that column and the wall time only. No bar, threshold, reading or field changed.

Limits: the verdict rests on the plates as committed (4 decimals, normalised to a maximum of 1), whose legs are 11 m to 34 m long against a deposit of sigma 6 m; none of them carries a valley deeper than 0.0019, and a longer or looping route may. The component lifetime is the overlap lineage of 1 Hz samples of the D5 field with decay on, truncated at the roam's 60 samples (the end censors long lineages, reading 12), and the live-field context correlation uses the same lifetime. The roams are synthetic walks from `makePath`; no visitor route exists.

## T5: the renderer gate, neutral against off

The question is whether `?topo=neutral` (the heat field, latch, T_h texture and the chunk in the cutscene plate pass, everything on and a = 0) costs the island anything or changes a pixel against the flag off. Bars, readings and the order of events are in `PREREGISTRATION-T5.md`, committed before the first measured run. The result is in `out/t5.md` and `out/t5.json`.

| file | purpose |
|---|---|
| `PREREGISTRATION-T5.md` | T5 bars verbatim and the readings taken before any run |
| `neutral.mjs` | `pixels` (three held plate frames, neutral against off, with an off-against-off control) and `report` (the bars from the raw runs, `out/t5.json` and `out/t5.md`) |
| `test/neutral.test.mjs` | the bar strings against the pre-registration, and the evaluator at every limit |
| `test/topo-core.test.mjs` | `components/world/topo/core.js`: the texture, the odd-r lookup against the cells, neutral forced LIVE, the latch and the governor shift |

Run with `pwsh -NoProfile -File scripts/topo-run.ps1 -Ref <sha> -SkipTagged -Arms off,neutral -Pixels -Phases fresh,walk -OutDir <dir>` and then `node experiments/topological-shader/neutral.mjs report --raw <dir>/raw --meta <dir>/raw/meta.json`.

Result (commit `5176b57`, production build, 3 runs per adapter per arm, order alternating by run, off and neutral in one session): KILL. Pixel difference 0 on 18 held frames (positive control 201 to 255), programs at ready 109 (Intel) and 124 (RTX), first-visit window at least 1,141 and 1,075 frames pass. Longest prewarm tick (Intel 44 ms against 37, RTX 48 against 40) and first key-press frame (Intel 48.5 ms, RTX 66.6, against 36.4) fail. The off arm in the same session fails the same two rows (Intel 54 ms and 48.4 ms, RTX 48 ms and 42.4 ms), so the failure is the machine against the old baseline numbers, not the flag; the bar stands as written. See `out/t5.md`.

## D6 and D10: route weights and plate pick (unit level)

`lib/world/heat/route-weights.js` computes the plate weights w_k, the explained fraction, the control input min(c, e), the early-session gate and the two-plate pick with latches on w_k. It has no measured run; the readings are fixed in `PREREGISTRATION-D10.md` and checked by `test/route-weights.test.mjs`. T1 is DEAD, so nothing here shows that the library explains visitor heat; its value is the owner's blind pairs (T6).
