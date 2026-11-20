# World topo

The per-pixel half of the topological shader (`docs/topological-shader/README.md`): the `?topo` switch and the GLSL chunk plus its JS twin. The default is `off`, and `off` loads none of this but `topoFlag.js`: no module, texture or program is created until `?topo=neutral|on` asks.

## Belongs here

- `topoFlag.js`: `topoMode()`, which reads `?topo=off|neutral|on` (default `off`, unknown values `off`).
- `uber.glsl.js`: `topoChunk`, the GLSL for `onBeforeCompile` injection (region-type fetch from T_h, `life`, the alive multiply), and the JS twins `lifeJs` and `aliveJs` that the tests check against the report's definition.

- `core.js`: `createTopo(mode)`, the CPU half: heat field, latch (forced LIVE in neutral), governor, 1 Hz critical cells, the T_h pack into one preallocated `Uint8Array` and a nearest-filtered `DataTexture`, and the uniforms the chunk reads. Heat, latch and pack run at 10 Hz because the field only changes there; the per-frame cost is the governor and the stepped time.
- `TopoDriver.jsx`: the island canvas's per-frame caller of `core.js`. `Scene.jsx` mounts it through a lazy import only when `topoMode()` is not `off`. It publishes `window.__world.topo = { chunk, uniforms }`, which `lib/anime/post.js` reads (see below).

## Where the chunk is wired

One place: the plate pass of the cutscene composer, `lib/anime/post.js` (`withTopo`, `Composer.topoSync`). When `window.__world.topo` exists the plate program is rebuilt once with the chunk spliced in and `topoOut(col, col, xz, ...)` runs on the painted plate (P = L, no baked plate exists), so the picture is unchanged. The composer runs on the engine's own renderer, so the island renderer's program list does not change. `components/anime/AnimeLab.jsx` publishes the same core under `/lab/anime?topo=neutral` so T5 can hold a plate frame.

## Does not belong here

- The pure heat field, latch, governor, critical-cell maths or texture codec. Those are `lib/world/heat/`.
- Plate baking, route weights or plate picks. The route plates are dead (T1), so kappa and Lambda stay reserved zeros and the alive multiply is the identity.
- Experiment bars, verdicts or results. Those stay in `experiments/topological-shader/`.
