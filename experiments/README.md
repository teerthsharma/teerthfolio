# Experiments

Each directory is one pre-registered experiment: its question, its fixed bars, the code, the tests and the committed results. A result never edits the pre-registration.

| Directory | Question | Verdict |
|---|---|---|
| [`topo-field/`](topo-field/README.md) | Does the live region of a certainty field c(x) change topology rarely enough to rebuild batches and programs only at topology events? | Pre-registered E1 DEAD; post-hoc lineage-latched variant UNRESOLVED; E2 (cost of c(x)) PASS |
| [`occluder-topology/`](occluder-topology/README.md) | Does the topology of the pup's occluders, from a 32x32 screen mask weighted by H0 persistence, change rarely enough to drive a visible response? | UNRESOLVED |
| [`topological-shader/`](topological-shader/README.md) | Does the 8-leg baked route-plate library (L8) explain where seal heat goes? (T1 of the topological shader design; T2 to T6 are pre-registered; T2 has its own row) | T1 DEAD: median explained mass over 30 roams 0.0185 against a bar of 0.2, margin over the best control -0.3208; known-answer gate ok |
| [`topological-shader/`](topological-shader/README.md) | Does the PL critical-cell classification and the dual-sweep hole count of the hex-disc heat field agree exactly with the Banchoff sum, the H0 bars and `holeLabels`? (T2 of the topological shader design) | T2 PASS: 0 mismatches over 1,050 fields (1,000 random, 50 D5 snapshots) and 21,000 thresholds; K4 passes |
| [`topological-shader/`](topological-shader/README.md) | Does `?topo=neutral` (heat field, latch, T_h texture and the chunk in the cutscene plate pass, a = 0) cost the island anything or change a pixel against the flag off? (T5 of the topological shader design) | T5 KILL on 2 of 5 bars on both adapters: pixel difference 0 over 18 held frames and 109 / 124 programs hold; longest prewarm tick 44 ms (Intel, bar 37) and 48 ms (RTX, bar 40), first key-press frame 48.5 and 66.6 ms (bar 36.4), and the off arm in the same session fails the same two bars (54 / 48 ms ticks, 48.4 / 42.4 ms keys) |

Run the tests of one experiment with `node --test experiments/<name>/test/*.test.mjs` (the glob form; the directory form fails on Node 25).
