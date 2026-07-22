# Task 2 report — living station manifolds

## Outcome

- QPU now renders one globally sampled, indexed double-curved Riemann pavilion across the conceptual 13-slice span. Shared global samples eliminate slice-boundary gaps under the maximum fold; the completed surface is also merged into the low-tier frame pool, alongside the stable dock band and slender endpoint abutments.
- S2 now owns six fixed-seed tangent coordinates and velocities. A fixed 120 Hz harmonic/OU update mean-reverts and projects the state to radius `0.18`; shell/core/signal transforms consume the displacement without per-frame allocation or `Math.random`. Reduced motion zeros and freezes the state.
- Tooling now derives a stable architectural yaw once from immutable center/dock coordinates and geometry-backed local open axis `[0, -1]` in XZ (local `-Z`). The resulting yaw is `1.4605074283` radians (`83.680911°`), the rotated open-face/dock dot product is `1`, and the world collider uses the same yaw.
- Existing safe-mode, proof/evidence, reduced-motion completed pose, and family budgets remain intact.

## TDD evidence

### RED

1. Initial focused contracts:
   - `npm run check:station-mechanisms-ne` failed with `undefined !== 13` for the absent QPU manifold slice contract.
   - `npm run check:station-mechanisms-sw` failed with `TypeError: deriveAssemblyVisitorYaw is not a function`.
2. Live geometry regression:
   - The first live verifier run failed before render enablement. Browser evidence isolated incompatible indexed/non-indexed geometry in `createQpuSampledManifoldSliceGeometry`.
   - A new focused normalization contract then failed with `sampled QPU geometry must normalize its index and attributes before merging with ribs`.
3. Visual abutment contract:
   - The new endpoint bounds contract failed before `QPU_ABUTMENT_RADIUS` / `QPU_ABUTMENT_HEIGHT` existed.

### GREEN

- `npx eslint lib/polar-station-mechanisms.js components/PolarStationMechanismsNE.jsx scripts/check-polar-station-mechanisms-ne.mjs lib/polar-station-mechanisms-sw.js components/PolarStationMechanismsSW.jsx scripts/check-polar-station-mechanisms-sw.mjs` — exit 0.
- `npm run check:station-mechanisms-ne` — PASS; continuous QPU, bounded Brownian coordinates, 12/4/0 tiers.
- `npm run check:station-mechanisms-sw` — PASS; visitor-facing Tooling and 9/4/0 tiers.
- `npm run check:station-mechanism-layer` — PASS; one family, proof gating, 12/4/0 handoff.
- `git diff --check` — exit 0 (line-ending notices only).
- `$env:VERIFY_QUALITY='high'; $env:VERIFY_STATION_IDS='s2-kernel-core,qpu-ice-bridge,assembly-tool-locker'; npm run verify:station-mechanisms` — PASS against `http://127.0.0.1:3000`; three Task 2 stations, one family each, authoritative high-tier budgets, zero failed requests, zero fatal diagnostics, and zero hero-black pixels.

### Review RED

1. Tooling geometry semantics:
   - A geometry-backed contract failed because the local open face was not exported; inspection of the authored backplane at local `+Z` and ribs at local `±Z` established local `-Z` as the true opening.
   - The station-world contract then failed with legacy collider yaw `-9°` versus derived render yaw `83.680911°`.
2. QPU continuity and low-tier completeness:
   - Numerical adjacency could not be expressed before `QPU_MANIFOLD_LAYOUT` and `sampleQpuManifoldBoundary` existed.
   - Source contracts exposed independently transformed repeated strips and no completed manifold in the low-tier frame geometry.
3. Fixed-step hitch invariance:
   - New 10 Hz and mixed-cadence tests failed because a `0.1` second frame admitted only eight 120 Hz substeps and discarded the remaining simulation time.

### Review GREEN

- `npx eslint lib/polar-station-mechanisms.js components/PolarStationMechanismsNE.jsx scripts/check-polar-station-mechanisms-ne.mjs lib/polar-station-mechanisms-sw.js components/PolarStationMechanismsSW.jsx scripts/check-polar-station-mechanisms-sw.mjs lib/polar-station-world.js scripts/check-station-world-schema.mjs` — exit 0.
- `npm run check:station-mechanisms-ne` — PASS; every conceptual QPU boundary matches to `< 1e-10` at nine transverse samples, fold activity `0` and `1`, and three times; 10 Hz, 30 Hz, 144 Hz, and mixed cadence agree; low frame source includes the continuous manifold.
- `npm run check:station-mechanisms-sw` — PASS; geometry-derived local `-Z` opening, render/collider yaw agreement, and 10 Hz/mixed hitch invariance.
- `npm run check:station-mechanism-layer` — PASS.
- `npm run check:station-world` — PASS.
- `npm run check:station-world-integration` — PASS.
- `git diff --check` — exit 0 (line-ending notices only).
- High-tier scoped browser proof in `.verification/station-mechanisms-live-task2-review-high` — PASS for S2, QPU, and Tooling with no fatal diagnostics.
- Explicit low + reduced-motion QPU proof in `.verification/station-mechanisms-live-task2-review-low-reduced` — station `qpu-ice-bridge`, quality `low`, reduced motion `true`, budgets `4/2/0`, zero fatal logs, and mean absolute pixel delta `0` across frames 900 ms apart.

The required unscoped `npm run verify:station-mechanisms` was also run. After the Task 2 mount and S2 luminance fixes, it advanced beyond S2 and stopped on the unrelated existing Manifold Reactor low-tier darkness threshold (`0.0613553 > 0.05`). No Manifold Reactor code was changed because it is outside Task 2; this is recorded as a Task 3 handoff. The verifier's supported station filter was used for the final Task 2 proof above.

## Determinism and motion evidence

- Runtime contracts compare 10 Hz, 30 Hz, 144 Hz, and mixed frame chunking. The 12-substep cap preserves every accepted `0.1` second frame while all S2 Brownian coordinates and velocities remain within `1e-5`; the Tooling dish bearing is invariant under the same hitch cadences.
- A 90-second simulation remains finite and inside the `0.18` authored manifold radius.
- Browser image audit over a fixed S2 hero ROI, 900 ms apart:
  - dynamic mean absolute pixel delta: `2.8374961597542243`
  - reduced-motion mean absolute pixel delta: `0`

## Visual evidence

- High-detail contact sheet: `.verification/station-mechanisms-live-task2-high-green/mechanism-world-contact-sheet.png`
- Grayscale silhouette sheet: `.verification/station-mechanisms-live-task2-high-green/mechanism-world-grayscale-contact-sheet.png`
- Runtime report: `.verification/station-mechanisms-live-task2-high-green/report.json`
- QPU world frame: `.verification/station-mechanisms-live-task2-high-green/qpu-ice-bridge-world.png`
- Tooling world frame: `.verification/station-mechanisms-live-task2-high-green/assembly-tool-locker-world.png`
- S2 world frame: `.verification/station-mechanisms-live-task2-high-green/s2-kernel-core-world.png`
- S2 dynamic pair: `.verification/station-mechanisms-live-task2-high-green/s2-brownian-motion-a.png`, `.verification/station-mechanisms-live-task2-high-green/s2-brownian-motion-b.png`
- S2 reduced/static pair: `.verification/station-mechanisms-live-task2-high-green/s2-reduced-static-a.png`, `.verification/station-mechanisms-live-task2-high-green/s2-reduced-static-b.png`
- Review high-detail contact sheet: `.verification/station-mechanisms-live-task2-review-high/mechanism-world-contact-sheet.png`
- Review low + reduced QPU frame: `.verification/station-mechanisms-live-task2-review-low-reduced/qpu-low-reduced-a.png`

Visual inspection confirms a coherent turquoise arched pavilion/floor rather than five scattered slabs, two subordinate teal abutments rather than huge black endpoint blocks, a stable dock band, a visitor-facing open Tooling bay, and a readable cobalt S2 assembly. The distant Observatory circle is unrelated and reserved for Task 3.

## Files

- `lib/polar-station-mechanisms.js`
- `components/PolarStationMechanismsNE.jsx`
- `scripts/check-polar-station-mechanisms-ne.mjs`
- `lib/polar-station-mechanisms-sw.js`
- `components/PolarStationMechanismsSW.jsx`
- `scripts/check-polar-station-mechanisms-sw.mjs`
- `lib/polar-station-world.js`
- `scripts/check-station-world-schema.mjs`
- `.superpowers/sdd/task-20260722-2-report.md`

## Implementation commits

- `5bbdca60a6feaff721ee9296b0cfda0d80c7260e` — `feat: rebuild stations as living manifolds`
- `49f9735192902df4d90f6388e36ba1d5e698e100` — `fix: close manifold review gaps`

## Risks / notes

- High/medium add QPU reconstruction-rib and signal pools; low retains four draws while its frame pool now contains the complete static manifold and dock band.
- Tooling render and collider yaw are identical and derive from the authored workshop footprint.
- Generated verification directories and pre-existing Task 1 review packages remain untracked and were not staged.
