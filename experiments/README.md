# Experiments

Each directory is one pre-registered experiment: its question, its fixed bars, the code, the tests and the committed results. A result never edits the pre-registration.

| Directory | Question | Verdict |
|---|---|---|
| [`topo-field/`](topo-field/README.md) | Does the live region of a certainty field c(x) change topology rarely enough to rebuild batches and programs only at topology events? | Pre-registered E1 DEAD; post-hoc lineage-latched variant UNRESOLVED; E2 (cost of c(x)) PASS |
| [`occluder-topology/`](occluder-topology/README.md) | Does the topology of the pup's occluders, from a 32x32 screen mask weighted by H0 persistence, change rarely enough to drive a visible response? | UNRESOLVED |

Run the tests of one experiment with `node --test experiments/<name>/test/*.test.mjs` (the glob form; the directory form fails on Node 25).
