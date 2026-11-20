# E1/E2 topo-field results

Env: HEAD bb9a44698d169898be8da5689a8a99f9927ba203, node v25.8.1, CPU Intel(R) Core(TM) i7-14700HX (28 logical cores), 2026-11-20T09:11:26.876Z.

## Verdict

- E1: **DEAD**

- E2: **PASS**

- E1 DEAD: SIMPLIFIED events 3060 over 21921 frames is 0.1396 per frame, above 0.1.

- E2 PASS: pooled core p95 0.09770000001299195 ms per frame at h=4, N=20 (bar <= 0.5 ms).

Bars, verbatim from the prereg:

- PASS bar (fixed now): SIMPLIFIED topology events median <= 1 per second AND <= 0.1 x B1 chunk crossings per second, at h=4, N=20, on all 3 seeds.
- DEAD if SIMPLIFIED events > 1 per 10 frames at h=4, N=20. Anything between is reported as unresolved, not as a pass.
- Bar: p95 <= 0.5 ms CPU per frame.
- K5 negative control: same walk with mover positions re-randomised every frame: events/frame must be at least 20x the real walk (shows the detector can see events).

## Post-hoc variant SIMP-H (not pre-registered)

The SIMP-H rule (lineage latch: a raw live component is significant if its min c <= 0.25 now, or it overlaps a component that was significant last frame) was chosen after the pre-registered numbers were seen, by a reviewer who had seen them. It can only add information. It never replaces the pre-registered verdict, which is the Verdict section above, printed first and unchanged.

SIMP-H post-hoc reading (same bars, same pure verdict function, fed the SIMP-H counts): E1 **UNRESOLVED**, E2 **PASS**. K5 ratio on SIMP-H at h=4, N=20: 788.26x.

- E1 UNRESOLVED on seed 1: SIMP-H median 2/s (bar <= 1), mean 1.7819/s vs 0.1 x B1 = 0.0788/s.
- E1 UNRESOLVED on seed 2: SIMP-H median 2/s (bar <= 1), mean 2.0446/s vs 0.1 x B1 = 0.0690/s.
- E1 UNRESOLVED on seed 3: SIMP-H median 2/s (bar <= 1), mean 1.9953/s vs 0.1 x B1 = 0.0788/s.
- E2 PASS: pooled core p95 0.09770000001299195 ms per frame at h=4, N=20 (bar <= 0.5 ms).

Invariant reading, per cell: SIMP-H total <= RAW total + SIMP-H frame-0 births (the column after SIMP-H total). Subtract that column to compare. The tests also assert SIMP-H death, merge, split and hole kinds are each <= RAW.

Known defect 1 (recorded, not fixed): the pre-registered SIMPLIFIED column can exceed RAW (h8 N20 seed 1, 5 s roam: RAW 121, SIMPLIFIED 127), because its significance test has no memory from frame to frame.

Known defect 2 (recorded, not fixed, warm start): frame-0 events are suppressed in both detectors (G9), so a component already live at frame 0 has no birth on record; if it turns significant later, SIMP-H records a birth that RAW cannot match, so the excess is bounded by the frame-0 births column (witness h4 N60 seed 3: RAW 361, SIMP-H 362).

| h | N | seed | ncells | seconds | RAW total | SIMP-H total | SIMP-H frame-0 births | SIMP-H birth | SIMP-H death | SIMP-H merge | SIMP-H split | SIMP-H holeOpen | SIMP-H holeClose | SIMP-H seam | SIMP-H events/s (mean) | SIMP-H median/s |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|

| 2 | 0 | 1 | 6409 | 121.78 | 21 | 21 | 0 | 0 | 0 | 11 | 10 | 0 | 0 | 0 | 0.172 | 0.0 |
| 2 | 0 | 2 | 6409 | 121.78 | 15 | 15 | 0 | 0 | 0 | 8 | 7 | 0 | 0 | 0 | 0.123 | 0.0 |
| 2 | 0 | 3 | 6409 | 121.78 | 21 | 21 | 0 | 0 | 0 | 11 | 10 | 0 | 0 | 0 | 0.172 | 0.0 |
| 2 | 20 | 1 | 6409 | 121.78 | 110 | 110 | 0 | 0 | 0 | 55 | 53 | 1 | 1 | 0 | 0.903 | 1.0 |
| 2 | 20 | 2 | 6409 | 121.78 | 151 | 151 | 0 | 0 | 0 | 74 | 75 | 1 | 1 | 0 | 1.240 | 1.0 |
| 2 | 20 | 3 | 6409 | 121.78 | 157 | 157 | 0 | 0 | 0 | 76 | 77 | 2 | 2 | 0 | 1.289 | 1.0 |
| 2 | 60 | 1 | 6409 | 121.78 | 625 | 625 | 0 | 0 | 0 | 300 | 299 | 13 | 13 | 0 | 5.132 | 5.0 |
| 2 | 60 | 2 | 6409 | 121.78 | 559 | 559 | 0 | 0 | 0 | 271 | 270 | 9 | 9 | 0 | 4.590 | 4.0 |
| 2 | 60 | 3 | 6409 | 121.78 | 520 | 520 | 0 | 0 | 0 | 255 | 249 | 8 | 8 | 0 | 4.270 | 4.0 |
| 4 | 0 | 1 | 1615 | 121.78 | 21 | 21 | 0 | 0 | 0 | 11 | 10 | 0 | 0 | 0 | 0.172 | 0.0 |
| 4 | 0 | 2 | 1615 | 121.78 | 15 | 15 | 0 | 0 | 0 | 8 | 7 | 0 | 0 | 0 | 0.123 | 0.0 |
| 4 | 0 | 3 | 1615 | 121.78 | 19 | 19 | 0 | 0 | 0 | 10 | 9 | 0 | 0 | 0 | 0.156 | 0.0 |
| 4 | 20 | 1 | 1615 | 121.78 | 217 | 217 | 0 | 47 | 50 | 59 | 61 | 0 | 0 | 0 | 1.782 | 2.0 |
| 4 | 20 | 2 | 1615 | 121.78 | 251 | 249 | 0 | 51 | 54 | 69 | 75 | 0 | 0 | 0 | 2.045 | 2.0 |
| 4 | 20 | 3 | 1615 | 121.78 | 243 | 243 | 0 | 47 | 44 | 76 | 76 | 0 | 0 | 0 | 1.995 | 2.0 |
| 4 | 60 | 1 | 1615 | 121.78 | 785 | 779 | 0 | 85 | 91 | 294 | 305 | 2 | 2 | 0 | 6.397 | 6.0 |
| 4 | 60 | 2 | 1615 | 121.78 | 784 | 777 | 1 | 114 | 108 | 279 | 274 | 1 | 1 | 0 | 6.380 | 6.0 |
| 4 | 60 | 3 | 1615 | 121.78 | 682 | 677 | 1 | 105 | 112 | 224 | 234 | 1 | 1 | 0 | 5.559 | 5.0 |
| 8 | 0 | 1 | 397 | 121.78 | 21 | 21 | 0 | 0 | 0 | 11 | 10 | 0 | 0 | 0 | 0.172 | 0.0 |
| 8 | 0 | 2 | 397 | 121.78 | 13 | 13 | 0 | 0 | 0 | 7 | 6 | 0 | 0 | 0 | 0.107 | 0.0 |
| 8 | 0 | 3 | 397 | 121.78 | 17 | 17 | 0 | 0 | 0 | 9 | 8 | 0 | 0 | 0 | 0.140 | 0.0 |
| 8 | 20 | 1 | 397 | 121.78 | 230 | 217 | 0 | 89 | 90 | 18 | 20 | 0 | 0 | 0 | 1.782 | 2.0 |
| 8 | 20 | 2 | 397 | 121.78 | 271 | 257 | 0 | 111 | 108 | 20 | 18 | 0 | 0 | 0 | 2.110 | 2.0 |
| 8 | 20 | 3 | 397 | 121.78 | 213 | 187 | 0 | 75 | 74 | 18 | 20 | 0 | 0 | 1 | 1.536 | 1.0 |
| 8 | 60 | 1 | 397 | 121.78 | 510 | 482 | 0 | 185 | 194 | 50 | 53 | 0 | 0 | 0 | 3.958 | 4.0 |
| 8 | 60 | 2 | 397 | 121.78 | 490 | 449 | 0 | 188 | 186 | 38 | 37 | 0 | 0 | 0 | 3.687 | 3.0 |
| 8 | 60 | 3 | 397 | 121.78 | 539 | 489 | 0 | 196 | 211 | 36 | 46 | 0 | 0 | 0 | 4.015 | 4.0 |

Economics at h=4, N=20, all three seeds: RAW and SIMP-H events per second against B1 chunk-boundary crossings per second (mean rates over the judged walk).

| seed | RAW events/s | SIMP-H events/s | B1 crossings/s |
|---|---|---|---|

| 1 | 1.782 | 1.782 | 0.788 |
| 2 | 2.061 | 2.045 | 0.690 |
| 3 | 1.995 | 1.995 | 0.788 |
| pooled | 1.946 | 1.941 | 0.755 |

## Known-answer tests

Gate: `node --test experiments/topo-field/test/known.test.mjs`, exit status 0.

| test | result |
|---|---|

| T0 geometry: cell counts at R=84 for h=2, 4, 8 | pass |
| T0 geometry: deg-6 neighbours at distance h, symmetric adjacency, border ring | pass |
| T1 diffComponents: birth, death, continuation, merge, split, 2 to 2, zero-overlap move | pass |
| K1 static disc: no events | pass |
| K2 disc split by a slit at frame 100: exactly one split, no hole | pass |
| K3 smooth grow then shrink: no events | pass |
| K4 baked island opens inside the disc at frame 100: exactly one hole-open | pass |
| K6 persistence filter: blip at 0.30 is raw-only, 0.20 and 0.25 pass the filter | pass |
| K7 hysteresis: 0.30/0.60 oscillation makes no events; 0.30 to 0.70 to 0.30 makes one death and one birth | pass |
| det.live keeps its identity across calls | pass |
| K8 persistence filter matches h0Superlevel on five seeds | pass |
| K9 sticky (post-hoc SIMP-H): a blob wobbling 0.24/0.27 flickers in SIMPLIFIED, SIMP-H has one birth and no events after it | pass |
| K10 sticky (post-hoc SIMP-H): a real split of a significant component is exactly one split | pass |
| K11 sticky (post-hoc SIMP-H): a blob born insignificant at 0.30 that never dips to 0.25 gives 0 SIMP-H events | pass |
| K13 warm start (post-hoc SIMP-H): a component live at frame 0 that turns significant later gives one SIMP-H birth and one frame-0 birth, and no RAW event | pass |
| K12 sticky (post-hoc SIMP-H): a significant lineage that drifts to 0.40 (above 0.35, still live) stays significant | pass |

K5 is the shuffled control, reported below.

## E1 sweep

| h | N | seed | ncells | seconds | RAW total | RAW seam | SIMP total | SIMP birth | SIMP death | SIMP merge | SIMP split | SIMP holeOpen | SIMP holeClose | SIMP seam | SIMP events/s (mean) | SIMP median/s | RAW median/s | B1/s | B2 no-hyst flips/s | B2 hyst flips/s |

|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2 | 0 | 1 | 6409 | 121.78 | 21 | 0 | 21 | 0 | 0 | 11 | 10 | 0 | 0 | 0 | 0.172 | 0.0 | 0.0 | 0.788 | 138.952 | 129.878 |
| 2 | 0 | 2 | 6409 | 121.78 | 15 | 0 | 15 | 0 | 0 | 8 | 7 | 0 | 0 | 0 | 0.123 | 0.0 | 0.0 | 0.690 | 130.855 | 122.414 |
| 2 | 0 | 3 | 6409 | 121.78 | 21 | 0 | 21 | 0 | 0 | 11 | 10 | 0 | 0 | 0 | 0.172 | 0.0 | 0.0 | 0.788 | 130.954 | 120.411 |
| 2 | 20 | 1 | 6409 | 121.78 | 110 | 0 | 110 | 0 | 0 | 55 | 53 | 1 | 1 | 0 | 0.903 | 1.0 | 1.0 | 0.788 | 175.853 | 159.825 |
| 2 | 20 | 2 | 6409 | 121.78 | 151 | 0 | 151 | 0 | 0 | 74 | 75 | 1 | 1 | 0 | 1.240 | 1.0 | 1.0 | 0.690 | 172.355 | 156.327 |
| 2 | 20 | 3 | 6409 | 121.78 | 157 | 0 | 157 | 0 | 0 | 76 | 77 | 2 | 2 | 0 | 1.289 | 1.0 | 1.0 | 0.788 | 168.980 | 151.063 |
| 2 | 60 | 1 | 6409 | 121.78 | 625 | 0 | 625 | 0 | 0 | 300 | 299 | 13 | 13 | 0 | 5.132 | 5.0 | 5.0 | 0.788 | 249.550 | 218.651 |
| 2 | 60 | 2 | 6409 | 121.78 | 559 | 0 | 559 | 0 | 0 | 271 | 270 | 9 | 9 | 0 | 4.590 | 4.0 | 4.0 | 0.690 | 247.645 | 216.401 |
| 2 | 60 | 3 | 6409 | 121.78 | 520 | 0 | 520 | 0 | 0 | 255 | 249 | 8 | 8 | 0 | 4.270 | 4.0 | 4.0 | 0.788 | 244.130 | 212.279 |
| 4 | 0 | 1 | 1615 | 121.78 | 21 | 0 | 21 | 0 | 0 | 11 | 10 | 0 | 0 | 0 | 0.172 | 0.0 | 0.0 | 0.788 | 34.726 | 32.287 |
| 4 | 0 | 2 | 1615 | 121.78 | 15 | 0 | 15 | 0 | 0 | 8 | 7 | 0 | 0 | 0 | 0.123 | 0.0 | 0.0 | 0.690 | 32.353 | 30.349 |
| 4 | 0 | 3 | 1615 | 121.78 | 19 | 0 | 19 | 0 | 0 | 10 | 9 | 0 | 0 | 0 | 0.156 | 0.0 | 0.0 | 0.788 | 32.410 | 29.922 |
| 4 | 20 | 1 | 1615 | 121.78 | 217 | 0 | 1040 | 462 | 477 | 45 | 56 | 0 | 0 | 0 | 8.540 | 8.0 | 2.0 | 0.788 | 43.315 | 39.283 |
| 4 | 20 | 2 | 1615 | 121.78 | 251 | 0 | 1070 | 475 | 485 | 49 | 61 | 0 | 0 | 0 | 8.786 | 9.0 | 2.0 | 0.690 | 43.003 | 39.020 |
| 4 | 20 | 3 | 1615 | 121.78 | 243 | 0 | 950 | 413 | 420 | 54 | 63 | 0 | 0 | 0 | 7.801 | 8.0 | 2.0 | 0.788 | 42.025 | 37.747 |
| 4 | 60 | 1 | 1615 | 121.78 | 785 | 0 | 2477 | 962 | 1012 | 223 | 276 | 2 | 2 | 0 | 20.339 | 19.0 | 6.0 | 0.788 | 61.429 | 53.628 |
| 4 | 60 | 2 | 1615 | 121.78 | 784 | 0 | 2435 | 975 | 1018 | 199 | 241 | 1 | 1 | 0 | 19.995 | 20.0 | 6.0 | 0.690 | 60.838 | 53.398 |
| 4 | 60 | 3 | 1615 | 121.78 | 682 | 0 | 2474 | 1041 | 1085 | 151 | 195 | 1 | 1 | 1 | 20.315 | 20.0 | 6.0 | 0.788 | 59.787 | 52.027 |
| 8 | 0 | 1 | 397 | 121.78 | 21 | 0 | 21 | 0 | 0 | 11 | 10 | 0 | 0 | 0 | 0.172 | 0.0 | 0.0 | 0.788 | 8.523 | 8.006 |
| 8 | 0 | 2 | 397 | 121.78 | 13 | 0 | 13 | 0 | 0 | 7 | 6 | 0 | 0 | 0 | 0.107 | 0.0 | 0.0 | 0.690 | 7.875 | 7.407 |
| 8 | 0 | 3 | 397 | 121.78 | 17 | 0 | 17 | 0 | 0 | 9 | 8 | 0 | 0 | 0 | 0.140 | 0.0 | 0.0 | 0.788 | 7.875 | 7.407 |
| 8 | 20 | 1 | 397 | 121.78 | 230 | 0 | 255 | 111 | 109 | 18 | 17 | 0 | 0 | 0 | 2.094 | 2.0 | 2.0 | 0.788 | 10.609 | 9.780 |
| 8 | 20 | 2 | 397 | 121.78 | 271 | 0 | 311 | 141 | 138 | 18 | 14 | 0 | 0 | 0 | 2.554 | 2.0 | 2.0 | 0.690 | 10.666 | 9.739 |
| 8 | 20 | 3 | 397 | 121.78 | 213 | 1 | 246 | 107 | 104 | 18 | 17 | 0 | 0 | 0 | 2.020 | 2.0 | 2.0 | 0.788 | 10.379 | 9.451 |
| 8 | 60 | 1 | 397 | 121.78 | 510 | 0 | 583 | 243 | 251 | 44 | 45 | 0 | 0 | 0 | 4.787 | 5.0 | 4.0 | 0.788 | 15.142 | 13.327 |
| 8 | 60 | 2 | 397 | 121.78 | 490 | 0 | 548 | 246 | 242 | 32 | 28 | 0 | 0 | 0 | 4.500 | 4.0 | 4.0 | 0.690 | 14.591 | 13.007 |
| 8 | 60 | 3 | 397 | 121.78 | 539 | 0 | 607 | 261 | 273 | 33 | 40 | 0 | 0 | 0 | 4.984 | 5.0 | 4.0 | 0.788 | 14.509 | 12.908 |

## K5 shuffled control

Judged ratio (SIMPLIFIED, h=4, N=20): 182.65x. Bar 20x: met.

| h | RAW real/frame | RAW shuffled/frame | RAW ratio | SIMP real/frame | SIMP shuffled/frame | SIMP ratio |
|---|---|---|---|---|---|---|

| 2 | 0.01907 | 28.94156 | 1517.77 | 0.01907 | 28.94334 | 1517.86 |
| 4 | 0.03243 | 27.16304 | 837.47 | 0.13959 | 25.49601 | 182.65 |
| 8 | 0.03257 | 6.04046 | 185.45 | 0.03704 | 5.46918 | 147.65 |

Shuffled rows (N=20, mover positions re-randomised every frame):

| h | seed | frames | RAW total | SIMP total | SIMP seam | SIMP events/s (mean) |
|---|---|---|---|---|---|---|

| 2 | 1 | 7307 | 210666 | 210671 | 35 | 1729.884 |
| 2 | 2 | 7307 | 211758 | 211768 | 32 | 1738.891 |
| 2 | 3 | 7307 | 212004 | 212028 | 30 | 1741.026 |
| 4 | 1 | 7307 | 197677 | 185730 | 31 | 1525.086 |
| 4 | 2 | 7307 | 198626 | 186221 | 27 | 1529.117 |
| 4 | 3 | 7307 | 199138 | 186947 | 28 | 1535.079 |
| 8 | 1 | 7307 | 43920 | 39766 | 4 | 326.531 |
| 8 | 2 | 7307 | 44249 | 40030 | 9 | 328.699 |
| 8 | 3 | 7307 | 44244 | 40094 | 5 | 329.224 |

## E2 CPU cost

Per (h, N): median and p95 of the per-frame core (field update + tag + count) and full (core + events), in ms, averaged over seeds. The judged cell is marked.

| h | N | judged | core median | core p95 | full median | full p95 |
|---|---|---|---|---|---|---|

| 2 | 0 |  | 0.1623 | 0.2254 | 0.6667 | 0.7522 |
| 2 | 20 |  | 0.3560 | 0.4190 | 0.8555 | 0.9323 |
| 2 | 60 |  | 0.6696 | 0.7424 | 1.1781 | 1.2722 |
| 4 | 0 |  | 0.0413 | 0.0457 | 0.1608 | 0.1748 |
| 4 | 20 | yes | 0.0894 | 0.0978 | 0.2134 | 0.2327 |
| 4 | 60 |  | 0.1714 | 0.1865 | 0.3000 | 0.3308 |
| 8 | 0 |  | 0.0096 | 0.0105 | 0.0373 | 0.0405 |
| 8 | 20 |  | 0.0229 | 0.0246 | 0.0508 | 0.0549 |
| 8 | 60 |  | 0.0454 | 0.0491 | 0.0742 | 0.0810 |

Pooled over the 3 seeds at h=4, N=20 (judged, from the concatenated per-frame arrays after the 300-frame warm-up): core median 0.0894 ms, core p95 0.0977 ms (bar <= 0.5 ms), full median 0.2134 ms, full p95 0.2334 ms.

## Sensitivity

Water on versus off, h=4, N=20, per seed.

| seed | water | RAW total | SIMP total | SIMP events/s (mean) | SIMP median/s | B1/s |
|---|---|---|---|---|---|---|

| 1 | off | 208 | 1242 | 10.198 | 10.0 | 0.788 |
| 2 | off | 242 | 1247 | 10.239 | 10.0 | 0.690 |
| 3 | off | 237 | 1212 | 9.952 | 10.0 | 0.788 |
| 1 | on | 217 | 1040 | 8.540 | 8.0 | 0.788 |
| 2 | on | 251 | 1070 | 8.786 | 9.0 | 0.690 |
| 3 | on | 243 | 950 | 7.801 | 8.0 | 0.788 |

## Interpretation

- G1 Disc radius is 84 m as the prereg says (= NORTH_RIM; HEAD island is 116 m). Dock points with r > 83 are scaled radially to r = 83. The seal never leaves r <= 83 (roam bounces at 80).
- G2 Mover influence: `m_i(x) = 1 - smoothstep(1.5, 3.0, d_i)`, `m(x) = max_i m_i(x)` (3 m is the outer radius; full strength inside 1.5 m). A mover is live (c<0.35) within ~2.08 m of a cell centre.
- G3 Water = fixed live annulus: cells with `hypot(x,z) >= 76` get `c = 0` always (WATER_R0 = 76, free parameter, prereg gives none). Sensitivity row without water at h=4,N=20.
- G4 "SIMPLIFIED events median <= 1 per second": bin the walk into whole 1-second bins of 60 frames (drop a partial last bin), count events per bin, take the median of the bin counts. "<= 0.1 x B1": compare MEAN rates (total events / seconds) vs (total crossings / seconds), per seed.
- G5 "DEAD if > 1 per 10 frames at h=4,N=20": pooled over the 3 seeds, `sum(simp events) / sum(frames) > 0.1`.
- G6 Persistence: a live component is significant iff `min c over its cells <= tau_low - delta` (tau_low 0.35, delta 0.10, tolerance +1e-12, boundary inclusive). SIMPLIFIED live set S = union of significant live components. Holes in SIMPLIFIED are holes of the complement of S, no further filter. RAW uses the full hysteresis live set.
- G7 No dwell at docks (the seal moves on when within 0.5 m of its dock); plain kinematics, heading snaps to the target (no collisions, no steering).
- G8 E2 bar is judged at h=4, N=20 (same cell as E1), pooled over 3 seeds; N=0 and N=60 are reported next to it, not judged.
- G9 Frame 0 produces no events; events are counted on transitions f=1..F-1; `frames` = F-1.

## Limits

Occlusion term not modelled (the camera never rotates). No collisions or steering in the path. The 3 seeds share one tour (the tour is seed-independent; only the roam differs). Timing is wall-clock single-thread JS on the one machine named in the environment line, and GPU read-back is not measured. Q3, Q4 and E0 are not covered. The one-frame seam (2.85 m tour-to-roam hand-over at frame 3707) is excluded from the headline event counts and reported as `seam`; B1 is computed on the unmodified path and so includes that one pair. results.md sits under out/ because results/ is git-excluded in this repo.

