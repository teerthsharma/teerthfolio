# Task 6 — Seal locomotion, halo, local camera, and collision handoff

Status: **IMPLEMENTED_UNVERIFIED**. No server, test, lint, build, browser, or capture command was run before the Wave E execution gate.

## Existing architecture retained

- `lib/polar-station-world.js` already places all eight stations at distinct canonical XZ centers/docks with distinct approach azimuths.
- `lib/polar-camera-composition.js` and `IglooScene.CameraRig` already use station-local two-subject composition and frame-rate-independent damping rather than coordinate wrapping.
- `lib/polar-traversal.js` already resolves station ellipsoid collision in the single fixed-step authority; Task 1 tightened ordinary/guided cruise to `4.0/3.8 m/s`.
- `TopologicalSealMascot` already copied the canonical render pose directly, retained permanent breathing at every station, used a critically damped lift spring, and had eyes plus one stateful halo.

## Production changes

### `components/TopologicalSealMascot.jsx`

- Added `uSpeed` to the existing topology-surface material runtime.
- Added a true vertex deformation rather than a color-only movement hint:
  - a small permanent breath signal runs through the surface;
  - the movement signal is gated by canonical speed and the `moving` guide state;
  - phase begins at the face and travels toward the tail using canonical X;
  - surface-normal compression, bounded vertical lift, and small longitudinal impulse create the seal-like glumph without translating the root;
  - reduced motion sets motion/speed to zero.
- Preserved direct `root.current.position.copy(targetPosition)`, preventing double smoothing and teleport-like catch-up.
- Added restrained station-specific sacred halo mixtures:
  - Aether: violet with a warm-gold component;
  - QPU: jade with a warm-gold component.
- Halo pose/color still follows the five real guide states and remains a single mesh/draw rather than decorative text.
- Updated the published motion profile and shader program key.

### `scripts/check-seal-manifold.mjs`

- Added deferred source contracts for the face-to-tail wave, speed uniform, direct canonical root position, and Aether/QPU halo pairs.
- Preserved closed-manifold topology, triangle budgets, one primary surface, two instanced accessory draws, one halo, one light, permanent breathing, and lifecycle checks.

## Wave C/D handoff

The controller created `lib/polar-dome-lattice.js` as the shared geometric authority and handed it to Task 11. Task 11 owns final alignment between the rendered doorway, the lattice exclusion, and collision/approach corridor. The seal change does not introduce a second collision system.

## Deferred Wave E proof

- Idle breathing at Plaque, S2, Aether, QPU, and Assembly.
- 60 fps side/profile capture showing the crest move face → body → tail during travel.
- Pose trace proving ordinary displacement remains below the specification and no root interpolation follows the canonical pose.
- Aether violet-gold and QPU jade-gold halo closeups; every other station must retain its own accent.
- Low/high/reduced-motion, docking, error, and mobile frames.
- Seal-to-dome collision plus doorway approach after Task 11 completes the shared corridor.
