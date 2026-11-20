# World heat

Pure maths for the route-heat field of the topological shader: the hex grid the field lives on, and the Gaussian deposit with exponential decay that the walker feeds each tick.

## Belongs here

- `hexgrid.js`: `makeHexGrid(R, h)`, the odd-r hex cells on a disc, their CSR six-neighbour adjacency, border flags, and a nearest-cell lookup.
- `critical.js`: `makeCritical(grid)`, the piecewise-linear critical-cell classification, H0 bars and dual-sweep hole bars (T2), and `holesAt` and `thresholds`.
- `heatfield.js`: `makeHeat(grid, { sigma, halfLifeS })`, the per-tick deposit (cut at 3.5 sigma), the half-life decay, and the running-maximum normalisation into `hn`.
- `route-weights.js`: `makeRouteWeights(plates, g, opts)`, the D6 plate weights `w`, the explained fraction (`e` scalar, `eCell` per cell), the D3 control input `C = min(c, e)`, the early-session gate (M below 80 holds everything LIVE) and the D10 plate pick `pick()` (top two plates, each held by its own two-threshold latch on its weight). `plates` is the injected `route-plates.json` object; the module never imports the file. It is unmeasured: T1 found that the route library does not explain roam heat, and the module exists behind the `?topo` flag for the owner's blind pairs (T6). Readings: `experiments/topological-shader/PREREGISTRATION-D10.md`.
- Modules with no `three` import and no DOM, so the experiment and the browser can load the same code.

## Does not belong here

- Rendering, shaders, textures or plate baking. Those live in the shader and world code.
- Walker paths, dock positions or cutscene timing. Those are inputs.
- Experiment bars, verdicts or results. Those stay in `experiments/`.

## Parity

The experiment copies are `experiments/topo-field/hexgrid.mjs` and `experiments/topological-shader/heat.mjs`. `experiments/topological-shader/test/heat-lib.test.mjs` requires that this library reproduces their cell graph, cell lookup and heat values exactly (heat is compared after rounding to the float32 storage of `hn`). A change to a constant here fails that test.

Files: `hexgrid.js` (the hex grid), `critical.js` (critical cells and bars; `experiments/topological-shader/test/critical-lib.test.mjs` requires it to return exactly what `experiments/topological-shader/critical.mjs` returns), `heatfield.js` (the decayed heat field), `latch.js` (the two-threshold region latch, D7), `governor.js` (the budget governor, D5), `route-weights.js` (D6 and D10; tests in `experiments/topological-shader/test/route-weights.test.mjs`) and `harness.js` (the 43x49 RGBA8 harness texture codec: `packTh` and `unpackTh`, tests in `experiments/topological-shader/test/harness.test.mjs`).
