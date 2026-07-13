# Task 2 — Modern Antarctic Ground, Palette, and Local Biome Fields

## Status

Production implementation is complete within the Task 2 ownership boundary. Static source review is complete. Per controller instruction, no Node test, server, browser, screenshot, shader-compile, lint, or build command was run; Wave E owns executable proof.

## Failure evidence and root cause

Inspected at original 2560×1440 resolution:

- `C:\Users\seal\AppData\Local\Temp\codex-clipboard-e687cc92-740a-4eaa-8392-66eef2479a2b.png`
- `C:\Users\seal\AppData\Local\Temp\codex-clipboard-47ec044c-0c9e-441e-b051-e10c8350761f.png`

The first frame showed purple high-frequency facets outranking the station, a broad clipped white highlight on the right, and station color contaminating the whole world. The newer QPU frame reduced purple noise and clipping but flattened the world into a global mint/gray wash.

Confirmed causes:

1. Remote fallback assigned the nearest station weight `1` even when every proximity was zero.
2. Station field displacement was applied across the entire terrain without an XZ envelope.
3. `biomeLocalColorEnvelope()` returned `1` for Plaque through QPU.
4. Sky, scene fog, and directional-light colors consumed globally normalized station weights.
5. Station field detail supplied both macro terrain form and micro identity; muting it removed depth.
6. QPU terrain mixed cyan at `0.95` strength and quantized interference at global scale.
7. Final output relied on hard clamping, allowing a large clipped highlight region.

## Exact implementation diff

### `lib/polar-biome-fields.js`

- Added explicit `centerXZ`, `radius`, `falloff`, `accent`, `shadow`, and normalized `weatherVector` data to all eight profiles.
- Added `computeLocalBiomeInfluence()` using the required `smoothstep(radius, radius * falloff, distanceXZ)` invariant.
- Added `clampCombinedBiomeInfluence()` with `Math.min(1, ...)` overlap protection.
- Changed `resolveTwoNearestBiomes()` so weights sum to capped local influence and expose `totalInfluence` plus `neutralWeight`; remote terrain now has station weights `0` and neutral weight `1`.
- Kept two-nearest P²·² normalization inside the bounded local contribution.
- Added shader policy declarations for local influence, total cap `1`, environment cap `0.42`, and the neutral macro snow owner.
- Added a three-signal low-frequency `polarMacroHeight()` independent of station fields.
- Applied radius/falloff envelopes to station displacement and compressed local displacement to `0.38` of its prior authored height.
- Rebuilt the shared snow anchor from warm ivory plus low-frequency cyan/lavender drift bands.
- Removed the field-kind exception that made Plaque–QPU color global; every field now uses the same radius/falloff envelope.
- Reduced terrain feature mix strengths throughout; QPU cyan/lead mixing changed from `0.95` global cyan to `0.24` local shadow plus `0.20` local green coherence.
- Added explicit shadow uniforms rather than deriving every surface response from accent hue.
- Reserved at least 58% neutral atmosphere even at a station; sky, shader fog, and shader light direction use the `0.42` environment cap.
- Spatially bounded weather on solid terrain and tied sky weather to local traveler influence.
- Added neutral fog density/color when station influence is absent.
- Added soft peak compression through `boundPolarHighlights()` before a bounded `0.03–0.99` output clamp.
- Used forward-edge GLSL smoothing (`1 - smoothstep(inner, outer, distance)`) to avoid undefined reversed-edge behavior on ANGLE/WebGL GPUs.

### `components/PolarBiomeWorld.jsx`

- Changed first-frame station weights/proximities from Plaque-owned `1` to neutral `0`.
- Added radius, falloff, and shadow uniforms and populated them from each explicit station field.
- Routed the normalized profile `weatherVector` directly to shader weather direction.
- Added stable neutral fog/key/fill/rim tokens.
- Mixed scene fog, key/fill/rim color, and light direction from a maximum 42% local station contribution with an explicit neutral remainder.
- Reduced key light from `1.95 + 0.15 proximity` to a bounded `1.68–1.84` range and lowered neutral fill energy.
- Preserved canonical XZ input, two shader programs, existing draw/texture budgets, quality tiers, reduced motion, safe mode, visibility, pause behavior, instancing, and telemetry.

### `components/IglooTerrain.jsx`

- Preserved the existing user-authored `MeshToonMaterial`, memoized four-pixel gradient map, disposal split, and `POLAR_PALETTE` integration.
- Replaced four competing terrain waves with three lower-frequency macro drift/path signals.
- Changed the ramp from the dark `#71839B` ground band to `#9EB2C5` lavender shadow and `#BCDCE2` cyan midtone while retaining `#F6F1E7` warm snow.
- Reduced PBR repetition from `7.2×5.4` to `3.2×2.6` and normal strength from `0.0025` to `0.0015` so texture cannot outrank monuments.

### `scripts/check-polar-biome-world.mjs`

- Added contract coverage for every required local-field property, normalized weather vectors, center/outer-radius influence, overlap clamping, neutral remote ownership, environment cap, macro displacement, local shader envelopes, neutral blend, shadow uniforms, and highlight bounding.
- Updated the obsolete remote fallback assertion from station weight `1` to neutral weight `1` because production semantics now prove the new contract.
- Preserved draw/program/texture, integration, reduced-motion, safe-mode, and no-texture assertions.

### `scripts/check-polar-color-continuity.mjs`

- Added a maximum local-accent ratio (`22%`) to reject full-screen station wash.
- Added black ratio (`≤6%`) and clipped-highlight ratio (`≤8%`) measurement and reporting.
- Added static requirements for common local influence, neutral blend, and soft highlight bounding.
- Preserved existing saturation, snow-anchor, authored hue, shader-dispatch, and geography checks.

### Unchanged

- `scripts/verify-polar-biome-visuals.mjs` was not edited; it already captures all eight stations and checks runtime/shader failures, luminance, black ratio, flatness, edge energy, and budgets.
- No file outside Task 2 scope was touched.

## Deferred Wave E proof

Run in this order with the Wave E server/browser contract:

```powershell
node scripts/check-polar-biome-world.mjs
node scripts/check-polar-color-continuity.mjs
node scripts/verify-polar-biome-shader-compile.mjs
node scripts/verify-polar-biome-visuals.mjs
```

Required visual matrix:

- Plaque, S2, QPU, Topology, and Assembly at 1440×900.
- QPU at 390×844.
- Low, medium, high, reduced-motion, safe/fallback, and simulation-paused paths.
- HUD-hidden world captures plus console, page error, failed request, shader diagnostic, and WebGL context evidence.

Acceptance: no clipped focal highlight, no full-screen station wash, neutral snow remains readable between stations, macro depth survives without noisy facets, station micro detail stays subordinate, local accents remain identifiable, and shader/runtime errors are zero.

## Remaining concern

The implementation has not been compiled or rendered under the current execution gate. Wave E must treat shader compilation and the representative screenshots as required proof, not assume them from static review. If a pixel threshold fails, inspect the production frame and tune production color/lighting; do not weaken the verifier to obtain green output.
