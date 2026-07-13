# Seal guide implementation report

## Status

DONE_WITH_CONCERNS — the owned implementation is present, but it is intentionally untested pending integration with the parallel scene and CSS slices.

## Changes

- Added the pure five-state `deriveSealGuideState` policy with priority `error > probing > docking > moving > idle` and the frozen state list.
- Derived one world-level guide state from fatal/safe renderer status, bridge/probe status, movement velocity, and loop-aware distance to the active station navigation target.
- Published `data-seal-guide-state` and forwarded the same `guideState` to the WebGL scene and safe gate without moving input handlers, render-gate policy, or target refs.
- Rebuilt the visible seal hierarchy around a shorter torso, larger raised head, ivory muzzle, ink eyes/outlines, chartreuse scarf, subdued instruments/faceplates, and retained collision/station-bearing structures.
- Added allocation-free frame mutations for idle breathing, probing lean/pulse, moving waddle/heading lead, one docking nod, error settle/tilt, and deterministic 120 ms blinks at 4–7 second intervals.
- Added reduced-motion static parity: poses, heading, selected-station bearing, and navigation information remain, while oscillation, blinking, nod animation, and halo pulse stop.
- Added lightweight `.sdf-gate-seal` markup with `data-guide-state`; the parallel CSS slice owns its presentation.

## Files

- `lib/seal-guide-state.js`
- `components/IglooWorld.jsx`
- `components/SealAvatar.jsx`
- `components/SdfSealSplash.jsx`

## Risks and integration notes

- `IglooScene.jsx` must accept `guideState` and pass it plus `reducedMotion` to `SealAvatar`; that file is owned by the parallel scene agent.
- `app/globals.css` must style the new `.sdf-gate-seal` structure and its `idle`, `probing`, and `error` selectors; that file is owned by the parallel CSS agent.
- Three.js pose/material behavior and final visual composition have not yet been exercised in a browser.

## Verification status

No tests, builds, linters, static gates, browser checks, or other verifiers were run, as explicitly requested for integration-before-testing.
