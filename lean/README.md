# Lean

Machine-checked statements behind the thesis in [`../docs/thesis/topological-rendering.md`](../docs/thesis/topological-rendering.md), section 7. Core Lean 4.36.0, no Mathlib. Check one file with `lean lean/TopologicalRendering/<File>.lean`; a file passes when it exits 0 with no `sorry`, `admit`, `axiom` or `native_decide`.

| File | Statement | Axioms used |
|---|---|---|
| [`TopologicalRendering/Flip.lean`](TopologicalRendering/Flip.lean) | A two-threshold trigger flips at most total variation divided by the gap, plus one, times (`flips_mul_le`, and the Lipschitz form `flips_mul_le_of_stepBound`) | propext, Quot.sound |
| [`TopologicalRendering/Components.lean`](TopologicalRendering/Components.lean) | Reachability is monotone under inclusion; a sup-norm bound of epsilon gives the three interleaving maps between components of superlevel sets (`interleave_forward`, `interleave_backward`, `interleave_composite`) | none for `Reach.*`; propext, Quot.sound for the rest |
| [`TopologicalRendering/Heat.lean`](TopologicalRendering/Heat.lean) | The decayed heat update is a contraction in the sup norm and moves a cell by at most the per-update deposit bound (`contraction`, `step_bound`, `invariant`, `sharp_step`) | propext, Quot.sound; `invariant` also Classical.choice |

The statements are integer models of the real-valued statements in the thesis. Flip uses integer samples and thresholds with the gap as `(hi - lo).toNat` and states the bound without division. Components works with reachability itself, so that a map on components is well defined because walks map to walks, over `Nat -> Int` fields on an arbitrary relation. Heat replaces the decay factor by a rational `a / b`, measures heat in integer units of `1 / b`, and takes the per-update deposit bound `K` as given.
