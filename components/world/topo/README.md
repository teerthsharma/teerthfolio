# World topo

The per-pixel half of the topological shader (`docs/topological-shader/README.md`): the `?topo` switch and the GLSL chunk plus its JS twin. Nothing here is wired into a material; the default is `off` and `off` builds no program.

## Belongs here

- `topoFlag.js`: `topoMode()`, which reads `?topo=off|neutral|on` (default `off`, unknown values `off`).
- `uber.glsl.js`: `topoChunk`, the GLSL for `onBeforeCompile` injection (region-type fetch from T_h, `life`, the alive multiply), and the JS twins `lifeJs` and `aliveJs` that the tests check against the report's definition.

## Does not belong here

- The CPU controller, latch, governor or heat field. Those are `lib/world/heat/`.
- Plate baking, route weights or plate picks. The route plates are dead (T1), so kappa and Lambda stay reserved zeros and the alive multiply is the identity.
- Experiment bars, verdicts or results. Those stay in `experiments/topological-shader/`.
