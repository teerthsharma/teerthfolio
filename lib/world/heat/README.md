# World heat

Pure maths for the route-heat field of the topological shader: the hex grid the field lives on, and the Gaussian deposit with exponential decay that the walker feeds each tick.

## Belongs here

- `hexgrid.js`: `makeHexGrid(R, h)`, the odd-r hex cells on a disc, their CSR six-neighbour adjacency, border flags, and a nearest-cell lookup.
- `heatfield.js`: `makeHeat(grid, { sigma, halfLifeS })`, the per-tick deposit (cut at 3.5 sigma), the half-life decay, and the running-maximum normalisation into `hn`.
- Modules with no `three` import and no DOM, so the experiment and the browser can load the same code.

## Does not belong here

- Rendering, shaders, textures or plate baking. Those live in the shader and world code.
- Walker paths, dock positions or cutscene timing. Those are inputs.
- Experiment bars, verdicts or results. Those stay in `experiments/`.

## Parity

The experiment copies are `experiments/topo-field/hexgrid.mjs` and `experiments/topological-shader/heat.mjs`. `experiments/topological-shader/test/heat-lib.test.mjs` requires that this library reproduces their cell graph, cell lookup and heat values exactly (heat is compared after rounding to the float32 storage of `hn`). A change to a constant here fails that test.

Files: `hexgrid.js` (the hex grid), `heatfield.js` (the decayed heat field), `latch.js` (the two-threshold region latch, D7) and `governor.js` (the budget governor, D5).
