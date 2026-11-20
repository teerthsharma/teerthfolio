# D6 and D10 unit-level specification: route weights, explained fraction and plate pick

Written before the tests of `test/route-weights.test.mjs` and the code of `lib/world/heat/route-weights.js`. There is no measured run: this file fixes the readings the unit tests check. T1 found that the 8-leg route library does not explain roam heat (DEAD, `out/t1.md`); the machinery exists because the owner ordered it, and its value is judged by the owner's blind pairs (T6), not here. Nothing here claims that the library explains visitor heat.

Source: `docs/topological-shader/README.md` on `release/seo-plus-load`, definitions D3, D6, D10 and the failure-mode list (early session).

## 1. Statements taken verbatim

- D3: C(v) = min(c(v), e(v)).
- D6: plates H_1..H_m (m = 8); w_k = clamp(<Hn, H_k> / <H_k, H_k>, 0, 1) at 1 Hz; S(v) = sum_k w_k H_k(v); R(v) = Hn(v) - min(Hn(v), S(v)); e(v) = 1 - R(v) / max(Hn(v), eps0), eps0 = 1/255.
- D10: the top 2 of w_k, each held by its own two-threshold latch on w_k.
- Early session (M below 80): the library weights are held at 0 (all LIVE) until M reaches 80.
- I8: 0 <= R <= Hn, e in [0, 1], e = 1 where Hn = 0.

The report states no sum rule for the weights (each plate is its own projection, `experiments/topological-shader/README.md` reading 8), so none is tested.

## 2. Readings taken

1. The w_k latch thresholds are not stated: D10 says they are pre-registered in T1's file, and `PREREGISTRATION.md` (T1) contains none. The reading taken is the D4 pair 0.35 and 0.65, the only two-threshold pair the report fixes for a quantity on [0, 1]; the Hn-chunk pair 0.20 and 0.30 is a different quantity. Both are injectable (`wLo`, `wHi`). OPEN: the owner may fix other values.
2. Each plate has its own latch b_k: b_k = 1 if w_k > wHi, 0 if w_k < wLo, else the previous b_k; b_k starts at 0. The comparisons are strict, as in D7.
3. D10 has two slots. A slot holds one plate index. A slot releases its plate when that plate's latch turns 0. A free slot takes, among plates with b_k = 1 that the other slot does not hold, the one with the largest w_k, ties to the lower index. Slot A is filled before slot B on one sample.
4. `pick()` returns [k1, k2], always two distinct indices. A slot with no latched plate is filled for the return value only (state unchanged) by the unheld plate with the largest w_k, ties to the lower index; k1 is slot A's plate, k2 slot B's. Before any sample, and during the gate, the return value is [0, 1].
5. The control input is C'(v) = min(c(v), e(v)), written into a Float32Array that `observe` returns and exposes as `C`. `c` and `Hn` are read, never written.
6. D6 gives e per cell, the call signature asks for `e: number`. Both are provided: `eCell` (Float32Array, D6 as stated, used in C') and `e`, the scalar explained fraction X = 1 - sum_v R(v) / sum_v Hn(v), the quantity T1 reports, with e = 1 when sum Hn = 0 (I8).
7. `heatLive` is Hn, the heat normalised by the running maximum, on [0, 1]. The 1 Hz cadence is the caller's: each `observe` call is one sample, and `t` is stored as `t` and affects nothing.
8. The early-session gate is M < 80 with M the running maximum of H in dwell-seconds. Hn does not carry M, so `observe` takes M as an optional fourth argument. When it is absent or not finite, the gate counts samples: sample i (0-based) is gated while i < 80, so the first 80 samples are gated. The sample count is the stand-in because the running maximum gains at most one dwell-second per second (the deposit is dt x kernel with kernel 1 at the centre) and so cannot exceed the elapsed seconds.
9. While gated, w is all 0 and the latches see w = 0, so every b_k is 0 and both slots are free. The gate also forces eCell = 0 everywhere, so C' = 0 and the latch of D7 stays LIVE. Literal D6 with w = 0 gives e = 1 on cells with Hn = 0, which would let a cold cell with high c turn BAKED, against the report's "all LIVE"; the gate therefore overrides e, not only w. The scalar `e` is 0 while gated and Hn has heat, 1 if it has none (reading 6).
10. The plates object is `{ version: 1, grid: { R, h, n }, legs: [{ id, from, to, lengthM, heat }] }`. `makeRouteWeights` throws if `version` is not 1, `grid.n` differs from `g.n`, `grid.R` or `grid.h` differs from `g.R` or `g.h` when `g` carries them, there are no legs, or a leg's heat length differs from n. The caller treats a throw as the report's ALL-LIVE, a = 0.
11. A plate with <H_k, H_k> = 0 has w_k = 0. Plate heat is read into Float64Array copies, so later mutation of the input does not change the weights.
12. Weights and C' are computed in Float64 and stored in Float32 (`w`, `C`, `eCell`); tests compare with float32 tolerance.
13. The module has no `three` import and no DOM, allocates its arrays once, and runs nothing at import time.
