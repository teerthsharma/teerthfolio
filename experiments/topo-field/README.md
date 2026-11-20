# topo-field

This folder tests whether the live region of a certainty field c(x) over hex cells changes topology rarely enough, under a recorded seal walk on the island, to justify rebuilding batches and shader programs only at topology events. The comparison is chunk-boundary crossings for 16 m chunks (B1): the pass bar needs topology events at or below 0.1 times the B1 rate. The pre-registration is in `PREREGISTRATION.md` and was committed before any result existed; the results are in `out/results.md`.

## Design under test

- Certainty field c(x) on hex cells of centre spacing h, over the island disc of radius 84 m (NORTH_RIM; the HEAD island is 116 m): c(x) = smoothstep(6, 24, |x - seal|) * (1 - m(x)). Near the seal c is low.
- Three tiers: live where c < 0.35, band for 0.35 <= c <= 0.65, baked above 0.65. Two thresholds give hysteresis: a cell enters live below 0.35 and leaves only above 0.65.
- Movers: N seeded random walkers at 1 m/s with a 3 m influence radius, m(x) = max over movers. Water is a fixed live annulus at r >= 76 m, always live.
- Topology events of the live set are births, deaths, merges, splits, and hole opens or closes (a baked component not touching the border). The live set and its complement both use 6-neighbour connectivity.
- RAW counts every live component. SIMPLIFIED (pre-registered) keeps a component only if its minimum c is at most 0.25, that is a dip of at least 0.10 below the live threshold. SIMP-H is a post-hoc variant, reported under Results.
- The walk: a nearest-neighbour tour of the place docks at boost speed, then a 60 s seeded roam, sampled at 60 Hz, with 3 seeds.

## Files

- `hexgrid.mjs`: hex grid on a disc, odd-r offset centres, CSR 6-neighbour adjacency and border flags.
- `cc.mjs`: hysteresis live set, persistence filter and frame-to-frame topology events.
- `field.mjs`: certainty field c(x) with seeded movers and the fixed water annulus.
- `path.mjs`: the 60 Hz seal walk, dock tour then seeded roam.
- `baselines.mjs`: B1 chunk-boundary crossings and B2 per-cell live flips per second.
- `verdict.mjs`: the pre-registered verdict and the post-hoc verdict as pure functions.
- `report.mjs`: pure renderer from the results object to `out/results.md`.
- `run.mjs`: runner for the known-answer gate, E1 sweep, K5 control, water sensitivity, E2 microbench, verdict and output.
- `test/`: five test files (`known`, `sim`, `verdict`, `baselines`, `run`).
- `out/`: `results.md` and `results.json`, rewritten by `run.mjs`.
- `PREREGISTRATION.md`: the pre-registration, committed unchanged.

## Running

```
node --test experiments/topo-field/test/*.test.mjs
node experiments/topo-field/run.mjs
```

- The glob form is the one that works. The directory form (`node --test experiments/topo-field/test/`) fails on Node 25.
- `test/known.test.mjs` is the known-answer gate for the detector. Its results table is in `out/results.md`.
- `run.mjs` takes about 3 minutes (the recorded sweep took 179.1 s) and rewrites `out/results.json` and `out/results.md`. `--out <dir>` writes elsewhere.

## Results

Source: `out/results.md`, with `out/results.json` for the same figures. Environment as recorded there: HEAD bb9a44698d169898be8da5689a8a99f9927ba203, node v25.8.1, Intel(R) Core(TM) i7-14700HX (28 logical cores), run 2026-11-20T09:11:26.876Z.

### Pre-registered verdict

- E1: **DEAD**
- E2: **PASS**
- E1 DEAD: SIMPLIFIED events 3060 over 21921 frames is 0.1396 per frame, above 0.1.
- E2 PASS: pooled core p95 0.09770000001299195 ms per frame at h=4, N=20 (bar <= 0.5 ms).

The E1 pass bar is SIMPLIFIED median <= 1 per second and <= 0.1 x B1 at h=4, N=20, on all 3 seeds. E1 is DEAD if SIMPLIFIED events exceed 1 per 10 frames at h=4, N=20.

### Post-hoc reading (SIMP-H, not pre-registered)

SIMP-H was chosen after the pre-registered numbers were seen, by a reviewer who had seen them. Its lineage latch makes a raw live component significant if its minimum c is at most 0.25 now, or if it overlaps a component that was significant on the previous frame. It can only add information and does not replace the verdict above.

Labelled post-hoc reading: E1 **UNRESOLVED**, E2 PASS.

- Seed 1: SIMP-H median 2/s (bar <= 1), mean 1.7819/s vs 0.1 x B1 = 0.0788/s.
- Seed 2: SIMP-H median 2/s (bar <= 1), mean 2.0446/s vs 0.1 x B1 = 0.0690/s.
- Seed 3: SIMP-H median 2/s (bar <= 1), mean 1.9953/s vs 0.1 x B1 = 0.0788/s.

### Economics at h=4, N=20

Mean rates over the judged walk, in events or crossings per second.

| seed | RAW events/s | SIMP-H events/s | B1 crossings/s |
|---|---|---|---|
| 1 | 1.782 | 1.782 | 0.788 |
| 2 | 2.061 | 2.045 | 0.690 |
| 3 | 1.995 | 1.995 | 0.788 |
| pooled | 1.946 | 1.941 | 0.755 |

### K5 shuffled control

The judged ratio (SIMPLIFIED, h=4, N=20) is 182.65x, against a bar of 20x: met. The real walk gives 0.13959 events per frame and the shuffled walk gives 25.49601. The SIMP-H ratio at the same cell is 788.26x (post-hoc).

## Limits

The occlusion term c_occ is not modelled, because the camera never rotates; this is a stated limit, not a pass. The path has no collisions or steering, and the three seeds share one tour, so only the roam differs. The one-frame seam (a 2.85 m tour-to-roam hand-over at frame 3707) is excluded from the headline event counts and reported as `seam`; B1 is computed on the unmodified path and includes that pair. The mover model (N seeded random walkers of 3 m influence radius) and the water annulus (r >= 76 m, always live) are assumptions that drive the event rate. At N=0 the SIMP-H rate is 0.123 to 0.172 events per second, which the design attributes mostly to the seal clearing joining and leaving the water annulus; no water-off run at N=0 is in `out/`, so that attribution is not measured. With water off at N=20, the SIMP-H mean rises to 9.952 to 10.239 events per second, against 7.801 to 8.786 with water on. Two known defects are recorded and not fixed: the SIMPLIFIED column can exceed RAW (h=8, N=20, seed 1, 5 s roam: RAW 121, SIMPLIFIED 127), and warm-start frame-0 births let SIMP-H exceed RAW by at most the frame-0 births column (witness h=4, N=60, seed 3: RAW 361, SIMP-H 362). Timing is wall-clock single-thread JavaScript on one machine. Band-edge ghosting and GPU read-back are not tested, and Q3 (program ownership) and E0 (the real-build baseline) are not covered.
