# Task 2 report — living station manifolds

## Outcome

- QPU now renders as a 13-slice sampled double-curved Riemann pavilion. Overlapping floor/shell/rib slices stay on one continuous span, build symmetrically from both endpoints toward the center, retain one stable dock band, use two slender endpoint abutments, and preserve the verification beam and three-pool budget.
- S2 now owns six fixed-seed tangent coordinates and velocities. A fixed 120 Hz harmonic/OU update mean-reverts and projects the state to radius `0.18`; shell/core/signal transforms consume the displacement without per-frame allocation or `Math.random`. Reduced motion zeros and freezes the state.
- Tooling now derives a stable architectural yaw once from immutable center/dock coordinates and documented local open axis `[-1, 0]`. The resulting yaw is `-0.1102888971` radians (`-6.319088°`) and the rotated open-face/dock dot product is `1`.
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

The required unscoped `npm run verify:station-mechanisms` was also run. After the Task 2 mount and S2 luminance fixes, it advanced beyond S2 and stopped on the unrelated existing Manifold Reactor low-tier darkness threshold (`0.0613553 > 0.05`). No Manifold Reactor code was changed because it is outside Task 2; this is recorded as a Task 3 handoff. The verifier's supported station filter was used for the final Task 2 proof above.

## Determinism and motion evidence

- Runtime contracts compare 30 Hz and 144 Hz frame chunking for all S2 Brownian coordinates and velocities within `1e-5`.
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

Visual inspection confirms a coherent turquoise arched pavilion/floor rather than five scattered slabs, two subordinate teal abutments rather than huge black endpoint blocks, a stable dock band, a visitor-facing open Tooling bay, and a readable cobalt S2 assembly. The distant Observatory circle is unrelated and reserved for Task 3.

## Files

- `lib/polar-station-mechanisms.js`
- `components/PolarStationMechanismsNE.jsx`
- `scripts/check-polar-station-mechanisms-ne.mjs`
- `lib/polar-station-mechanisms-sw.js`
- `components/PolarStationMechanismsSW.jsx`
- `scripts/check-polar-station-mechanisms-sw.mjs`
- `.superpowers/sdd/task-20260722-2-report.md`

## Commit

- Message: `feat: rebuild stations as living manifolds`
- SHA: `HEAD` (the commit containing this report; resolved to the concrete SHA in the parent handoff because a commit cannot embed its own final hash)

## Risks / notes

- High/medium render the detailed QPU slice/signal pools; low intentionally retains the existing one-frame-pool family budget.
- The Tooling render yaw differs from the legacy collider yaw by about `2.68°`; the ellipse remains effectively aligned while the opening now exactly faces the dock.
- Generated verification directories and pre-existing Task 1 review packages remain untracked and were not staged.
