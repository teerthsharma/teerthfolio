# Experiments

Each directory is one pre-registered experiment: its question, its fixed bars, the code, the tests and the committed results. A result never edits the pre-registration.

| Directory | Question | Verdict |
|---|---|---|
| [`topo-field/`](topo-field/README.md) | Does the live region of a certainty field c(x) change topology rarely enough to rebuild batches and programs only at topology events? | Pre-registered E1 DEAD; post-hoc lineage-latched variant UNRESOLVED; E2 (cost of c(x)) PASS |
| [`occluder-topology/`](occluder-topology/README.md) | Does the topology of the pup's occluders, from a 32x32 screen mask weighted by H0 persistence, change rarely enough to drive a visible response? | UNRESOLVED |
| [`topological-shader/`](topological-shader/README.md) | Does the 8-leg baked route-plate library (L8) explain where seal heat goes? (T1 of the topological shader design; T2 to T6 are pre-registered; T2 has its own row) | T1 DEAD: median explained mass over 30 roams 0.0185 against a bar of 0.2, margin over the best control -0.3208; known-answer gate ok |
| [`topological-shader/`](topological-shader/README.md) | Does the PL critical-cell classification and the dual-sweep hole count of the hex-disc heat field agree exactly with the Banchoff sum, the H0 bars and `holeLabels`? (T2 of the topological shader design) | T2 PASS: 0 mismatches over 1,050 fields (1,000 random, 50 D5 snapshots) and 21,000 thresholds; K4 passes |
| [`topological-shader/`](topological-shader/README.md) | Does a live residual confined to one ring around the surviving critical cells (persistence >= 0.05) of the live heat field stay within 10 percent of the cells? (T3, L1 half, of the topological shader design; L5 not built) | T3 PASS: median share 0.0043 to 0.0477 over the tour and 30 roams (1,861 samples), none above 0.10; permuted control at least 18.1 times the real share on every bed |

Run the tests of one experiment with `node --test experiments/<name>/test/*.test.mjs` (the glob form; the directory form fails on Node 25).
