# Experiments

Each directory is one pre-registered experiment: its question, its fixed bars, the code, the tests and the committed results. A result never edits the pre-registration.

| Directory | Question | Verdict |
|---|---|---|
| [`topo-field/`](topo-field/README.md) | Does the live region of a certainty field c(x) change topology rarely enough to rebuild batches and programs only at topology events? | Pre-registered E1 DEAD; post-hoc lineage-latched variant UNRESOLVED; E2 (cost of c(x)) PASS |
| [`occluder-topology/`](occluder-topology/README.md) | Does the topology of the pup's occluders, from a 32x32 screen mask weighted by H0 persistence, change rarely enough to drive a visible response? | UNRESOLVED |
| [`topological-shader/`](topological-shader/README.md) | Does the 8-leg baked route-plate library (L8) explain where seal heat goes? (T1 of the topological shader design; T2 to T6 are pre-registered; T2 has its own row) | T1 DEAD: median explained mass over 30 roams 0.0185 against a bar of 0.2, margin over the best control -0.3208; known-answer gate ok |
| [`topological-shader/`](topological-shader/README.md) | Does the PL critical-cell classification and the dual-sweep hole count of the hex-disc heat field agree exactly with the Banchoff sum, the H0 bars and `holeLabels`? (T2 of the topological shader design) | T2 PASS: 0 mismatches over 1,050 fields (1,000 random, 50 D5 snapshots) and 21,000 thresholds; K4 passes |
| [`topological-shader/`](topological-shader/README.md) | The topological shader's tests, each pre-registered: T1 (does the 8-route plate library explain roam heat?) DEAD; T2 (topology correctness) PASS, 0 mismatches in 1,050 fields; T3 L1 (live residual share near critical cells) PASS, median 0.0043 to 0.0477 against 0.10; T5 (`?topo=neutral` renderer gate) KILL on 2 of 5 bars, the off arm in the same session fails the same two; T4 (phase and amplitude on the plates) L2 SURVIVES vacuously (no finite bar above 0.0019, kappa flat, 0 of 4,698 edges over 0.05 on every plate) and L3 DEAD (plate Lambda is 0 everywhere, Spearman undefined on 30 of 30 roams); T6 not run. |
