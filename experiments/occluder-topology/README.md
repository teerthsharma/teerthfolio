# occluder-topology

This folder tests whether the topology of the pup's occluders changes rarely enough, under a recorded seal walk, to drive a visible response (a dithered see-through band, or a camera hold) instead of rebuilding programs. Each frame, a 32x32 screen-space mask over the pup's box marks the pixels where something is nearer than the pup. Each occluder component of that mask is weighted by its H0 persistence p. The event rate of the persistence-filtered components is compared against chunk-boundary crossings (B1, from `topo-field/baselines.mjs`). The pass bar is 0.1 times B1 on every seed, with a shuffled control at least 20 times the real rate. The pre-registration is in `PREREGISTRATION.md`, committed before any code and unchanged. The results are in `out/results.md`.

## Design under test

- **Mask.** `castMask` in `scene.mjs` casts one ray per cell of a 32x32 grid over the pup's measured screen rectangle. A cell is occluded when a static occluder or a walker is hit at least 0.5 m nearer than the pup.
- **Distance transform.** `edt` in `mask.mjs` is the exact Euclidean distance transform (Felzenszwalb and Huttenlocher). Occluded pixels get the distance to the nearest background pixel centre.
- **Persistence.** For each occluder component, `p = max(EDT over the component) - 0.5`. The H0 superlevel filtration runs on `csrGrid(32, 32)` from `lib/anime/topology.js`. The offset of 0.5 is a deviation from the pre-registered "largest inradius" (D3).
- **Response classes by p.** p < 1 is over (the pup draws over the occluder). 1 <= p <= 3 is the band (the pup shows through with probability (3 - p) / 2, dithered across frames). p > 3 is solid.
- **Event kinds.** Birth, death, merge and split, counted between consecutive frames with `diffComponents` from `topo-field/cc.mjs`. No hole kinds (D4).
- **Columns.** RAW counts every component. The pre-registered filtered column (`plain` in the code) counts events of the per-frame set of p > 3 components. The LATCHED column is specified before the run and is not pre-registered. It also keeps any component that overlaps a pixel that was solid on the previous frame. LATCHED never replaces the verdict (D9).
- **Bed.** The topo-field walk: a dock tour, then a 60 s seeded roam, sampled at 60 Hz, with seeds 1, 2 and 3. The camera is the island follow camera. The static occluders are the inventory in `scene.mjs`. The movers are 20 seeded walkers, drawn as 0.4 m cones (D2).
- **Invalid frames.** A frame is invalid when the pup is within the collider radius plus the seal radius of a building or collider, or where the ground is too high for the seal to stand. Transitions touching an invalid frame, and the seam into frame 3707, are excluded and reported, not counted (D5).
- **Controls.** The shuffled control re-randomises the occluders every frame. The known-answer gate (`test/known.test.mjs`) must pass before any verdict is given. A failed gate gives INVALID (D6).
- **Bars.** PASS: filtered events <= 0.1 x B1 on all 3 seeds, and the control rate >= 20x the real rate. DEAD: filtered events >= that seed's B1 on any seed. Anything between: UNRESOLVED. The bars are in `verdict.mjs` and are the prereg text.

## Files

- `PREREGISTRATION.md`: the contract, committed unchanged before any code. It fixes the bars, the design, the annex kills and the LEAD.
- `scene.mjs`: the island follow camera, the pup box, the screen projection, the static occluder inventory, the walkers, `castMask` and `frameValid`.
- `mask.mjs`: the exact Euclidean distance transform of the 32x32 mask.
- `persist.mjs`: the per-component persistence p, the response classes (`classify`, `showProb`) and the RAW, filtered and LATCHED event streams.
- `verdict.mjs`: the pre-registered verdict and the LATCHED verdict as pure functions, with the bar text.
- `report.mjs`: a pure renderer from the results object to `out/results.md`, including the deviations D1 to D9.
- `run.mjs`: the runner. It runs the known-answer gate, the three judged seeds, the shuffled control, the three sensitivities, the verdicts and the output files. `--out <dir>` writes elsewhere.
- `test/`: eight files (`camera`, `known`, `mask`, `persist`, `report`, `run`, `scene`, `verdict`).
- `out/`: `results.md` and `results.json`, rewritten by `run.mjs`.

## Running

```
node --test experiments/occluder-topology/test/*.test.mjs
node experiments/occluder-topology/run.mjs
```

- The glob form is the one that works. The directory form (`node --test experiments/occluder-topology/test/`) fails on Node 25.
- `run.mjs` takes about 1.5 minutes and rewrites `out/results.json` and `out/results.md`.
- The scene imports modules that import `three`, so `node_modules` must resolve from the repository root.

## Results

Source: `out/results.md`, and `out/results.json` for the same figures. Environment as recorded there: HEAD d318826ca4cac1e38ff9e90c756781b3d9ef4959, node v25.8.1, Intel(R) Core(TM) i7-14700HX (28 logical cores), run 2026-11-20T10:28:55.798Z.

### Pre-registered verdict

Filtered column (the pre-registered one): **UNRESOLVED**

- seed 1: filtered 0.3433/s, B1 0.7883/s, 0.1 x B1 0.0788/s: between.
- seed 2: filtered 0.2951/s, B1 0.6897/s, 0.1 x B1 0.0690/s: between.
- seed 3: filtered 0.3825/s, B1 0.7883/s, 0.1 x B1 0.0788/s: between.
- control ratio 2.5943x is below the 20x bar, so PASS is blocked even if every seed is under 0.1 x B1.

### LATCHED reading

LATCHED column: **UNRESOLVED** (not pre-registered; it never replaces the verdict above).

- LATCHED: seed 1: filtered 0.4022/s, B1 0.7883/s, 0.1 x B1 0.0788/s: between.
- LATCHED: seed 2: filtered 0.3142/s, B1 0.6897/s, 0.1 x B1 0.0690/s: between.
- LATCHED: seed 3: filtered 0.4208/s, B1 0.7883/s, 0.1 x B1 0.0788/s: between.
- LATCHED: control ratio 2.4322x is below the 20x bar, so PASS is blocked even if every seed is under 0.1 x B1.

### Known-answer gate

Known-answer gate (known.test.mjs): PASS, 11 tests.

### Shuffled control

| column | real events per counted transition | shuffled events per counted transition | controlRatio | 20x bar |
|---|---|---|---|---|
| filtered (pre-registered) | 0.00567 | 0.01471 | 2.59 | NOT met |
| LATCHED (not pre-registered) | 0.00631 | 0.01535 | 2.43 | NOT met |

### Per-seed invalid share

- seed 1: 16.02%
- seed 2: 13.51%
- seed 3: 13.83%

### Reading

Filtered events run at 0.43 to 0.49 times the chunk-crossing rate (0.44, 0.43 and 0.49 of B1 on seeds 1, 2 and 3). That is above the PASS bar of 0.1 times and below the DEAD line of 1 times. The shuffled control does not separate real from shuffled by 20x: its ratio is 2.59x for the filtered column and 2.43x for LATCHED. Most events come from the camera and pup moving past static occluders. With N=0 (static occluders only), the filtered totals are 27, 29 and 36, against 35, 31 and 40 with 20 walkers. As the pre-registration's own LEAD says for an UNRESOLVED result, the event-driven half is dropped. Only the stateless see-through band (1 <= p <= 3) remains a candidate. It is untested, because it needs the renderer.

## Limits

Limits. The grass term is dropped: the island's only grass is the Covenant meadow, which the walk never reaches (docks clamp to r 83, the roam bounces at 80, and the meadow starts at x = 89), so the p < 1 class has no real occupant and is tested only by known-answer masks. The movers are 20 seeded walkers from `makeField`, not penguins, because real penguins flee the seal and are not deterministic. Lab and upstream-place sculpture heights are unknown: the nominal bed models none, and the 12 m cylinder envelope is only an upper bound (its filtered totals are 48, 42 and 45). Roofs, the igloo tunnel, cutaway, heading lag, cars and the real penguin flock are not modelled; dock lean, per-place zoom, camera shake and plinth lift are not ported. Buildings are treated as opaque solids. The path has no collisions, so invalid frames are reported rather than removed from the walk. Mask-space tracking by overlap breaks when relative image motion per frame exceeds a component width. The p offset and the 32 px resolution place the thresholds. The two annex kill tests (an async 32x32 readback timed on Intel UHD in real Chrome, and a comparison of two replay runs of one dock) are not run. Timing is Node on one machine only. The program-ownership check and the real-build baseline are not covered.
