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
