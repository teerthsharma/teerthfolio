# Task 1 report: canonical traversal, HUD truth, rail, and portal intent

Status: **IMPLEMENTED_UNVERIFIED — source changes are written; execution is deferred to Wave E by controller direction**

## Scope and constraints

Only Task 1-owned source and focused check files were edited. The shared server stayed off; no browser, test, lint, build, or verifier command was run after the execution contract moved all proof to Wave E. Existing safe-mode, reduced-motion, keyboard/mobile, evidence archive, GitHub fallback, fixed-step traversal, collision, offscreen GPU suspension, and Vercel paths were preserved.

## Exact attributable diff

### `lib/polar-traversal.js`

- Added pure `deriveTraversalPresentation(snapshot, stations)`.
- The selector returns exactly `destinationId`, `dockedStationId`, `nearestStationId`, `phase`, `progress`, and `isArrived`.
- Nearest station is derived from canonical XZ station docks; phase is derived from selected destination, earned dock, route activity, canonical velocity, and dock proximity. A pre-derived explicit phase can also be projected unchanged.
- Physical `state.dockedId` remains the live contact/dwell signal. The new selector deliberately does not mutate controller state.
- Reduced `GUIDED_MAX_SPEED` from `4.8` to `3.8` world m/s and `MANUAL_MAX_SPEED` from `5.8` to `4.0` world m/s. Fixed-step integration, acceleration/braking, interpolation, collision, and the single render pose remain unchanged; no second smoothing layer was added.

### `components/IglooWorld.jsx`

- Removed the parallel React `activeArtifactId` / `destinationArtifactId` authorities and their setters.
- Added three explicit semantic authorities:
  - `selectedDestinationIdRef`: persistent user destination, including after the controller clears a completed route.
  - `earnedDockedStationIdRef`: last station whose evidence was earned by docking.
  - `traversalPresentation`: the one React presentation snapshot, mirrored by `presentationRef` for frame-safe callbacks.
- Added frozen canonical station targets and `createWorldTraversalPresentation(...)`; publishing remains on the existing 100 ms semantic cadence rather than introducing 60 Hz React updates.
- Manual input cancels selected guided intent without altering the last earned evidence dock.
- Arrival promotes live controller `dockedId` into `earnedDockedStationIdRef`; route completion no longer erases presentation destination identity.
- Derived `evidenceArtifact` from presentation `dockedStationId` and `intentArtifact` from presentation destination/nearest. These now drive:
  - HUD evidence card: earned dock.
  - Scene/camera intent: destination, then nearest fallback.
  - Seal halo/accent: the same scene intent artifact.
  - Loading route title and route progress: the same presentation snapshot.
- Added inspectable `data-presentation-*` fields and `data-seal-halo-station` while preserving live `data-docked-station` for physical docking verifiers.
- Embedded the canonical presentation into `traversalPoseRef` without changing the existing single interpolated translation pose.
- Replaced automatic Topology portal activation with `archivePortalOfferOpen`, `confirmArchivePortal`, and `cancelArchivePortal`.
- Topology arrival may offer the archive only after earned docking. Only `confirmArchivePortal` calls `setBlackHoleActive(true)`. Cancel and transition close suppress re-opening for the current arrival sequence. Leaving Topology resets the offer for a future earned return.
- Plaque return routes scene intent back to Plaque immediately and restores Plaque evidence when docking is earned, so the dome/home composition is selected again without a remount authority split.

### `components/IglooHud.jsx`

- Replaced split destination/velocity semantics with the canonical `presentation` prop.
- Added visible route status: `EN ROUTE → <station>` before arrival and `ARRIVED • <station>` after earned docking.
- Kept the evidence body bound to `activeArtifact`, which `IglooWorld` now supplies from `dockedStationId`; QPU evidence is therefore not presented as docked during approach.
- Rail `aria-current` / `data-active` now represent earned docking; `aria-pressed` / `data-destination` represent presentation intent.
- Rail centering reruns on destination and phase/arrival changes, uses `smooth` normally and `auto` under reduced motion, and never calls `.focus()`, preserving keyboard focus.
- Radar/source strip now publishes the same route title and `data-route-phase` as the card/rail.
- Added a seal-guided, non-modal accessible “Launch into the archive?” offer inside the docked Topology card with explicit `Launch archive` and `Stay in world` buttons. The normal top-navigation `Archive` link remains unchanged.

### Focused checks

- `scripts/check-polar-traversal.mjs`
  - Added the required Plaque → QPU moving and QPU arrived six-field selector contracts.
  - Added 3–4 m/s guided/manual cruise assertions.
  - Added static rejection of the removed parallel station setters.
- `scripts/check-hud-accessibility.mjs`
  - Added contracts for shared presentation wiring, evidence versus intent, rail centering/focus semantics, route/radar phase, inspectable state, halo/camera intent, and explicit archive confirm/cancel.
  - Added a rejection for proximity/active-artifact-driven portal opening.
- `scripts/verify-hud-accessibility.mjs` was intentionally left unchanged for Wave E’s clean browser specification/run.

## Root-cause changes implemented

1. A station click previously wrote destination intent while camera/card/halo consumed a separately mutated `activeArtifactId`.
2. Live physical `dockedId` was being treated as both contact and durable evidence ownership, even though routing correctly clears live contact on departure.
3. Controller arrival correctly cleared its route destination, but the HUD incorrectly lost the user’s selected destination identity.
4. Rail centering was reduced-motion-aware but keyed to split destination/active state rather than one semantic snapshot.
5. Topology proximity/active state automatically opened `BlackHoleTransition`, conflating arrival with user portal consent.
6. Traversal caps exceeded the explicit 3–4 world m/s cruise contract.

## Intended semantic matrix encoded in source

| Boundary | Destination | Earned dock/evidence | Phase | Camera/radar/halo/rail |
| --- | --- | --- | --- | --- |
| Plaque idle | Plaque | Plaque | arrived | Plaque |
| Plaque → QPU | QPU | Plaque | moving | QPU intent; Plaque evidence |
| QPU approach | QPU | Plaque | docking | QPU intent; Plaque evidence |
| QPU dock | QPU | QPU | arrived | QPU |
| QPU → Plaque | Plaque | QPU | moving | Plaque intent; QPU evidence |
| Plaque return | Plaque | Plaque | arrived | Plaque/dome restored |
| Topology arrival | Topology | Topology | arrived | Offer only; portal inactive |
| Offer confirm | Topology | Topology | arrived | Portal active |
| Offer cancel | Topology | Topology | arrived | Normal world remains active |
| Assembly/Tooling | Assembly | prior earned dock until arrival | moving/arrived | No portal side effect |

## Deferred RED/GREEN execution

The focused contracts were authored before production edits, but the controller explicitly prohibited running them until Wave E. Therefore there are no fresh RED/GREEN outputs, screenshots, or runtime claims in this report.

Wave E should run:

```powershell
node scripts/check-polar-traversal.mjs
node scripts/check-hud-accessibility.mjs
node scripts/verify-hud-accessibility.mjs
```

The browser journey should cover Plaque → QPU approach → QPU arrival → Plaque return on desktop/mobile, rail focus retention, reduced-motion centering, Topology offer/cancel/confirm, Assembly selection without portal activation, dome restoration, and page/shader errors.

## Remaining concerns for Wave E

- Runtime and visual verification is intentionally absent. The accessible portal offer is contained inside the existing route card and uses inline minimum target sizing because Task 1 did not own global CSS; mobile/zoom layout must be inspected in Wave E.
- Several out-of-scope visual-response modules still normalize speed against historical `4.8`/`5.8` reference values. Canonical translation constants are now set to `3.8`/`4.0`; Wave E must confirm the lower normalized response still reads clearly without expanding this task’s ownership.
- The existing physical docking and route-integration suites must confirm the lower cap still completes all C8 routes inside their time budgets.
