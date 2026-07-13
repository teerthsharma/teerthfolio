# Post / HUD / Contract Implementation Report

## Status

DONE_WITH_CONCERNS — the assigned implementation slice is integrated in source, but all tests, builds, static gates, lint, and rendered verification were intentionally deferred until the parallel scene and seal work landed.

## Changes

- Added frozen `POLAR_PALETTE`, eight-ID `STATION_PALETTE`, `CAMERA_COMPOSITION`, `MOTION_TIMINGS`, and exact low/medium/high `POST_PROCESS_BUDGET` contracts.
- Added `check:polar-rescue` and placed it in the existing build chain immediately before `next build`.
- Added a polar-rescue contract script covering exact palettes/budgets, guide-state priority examples, source integration profiles, bright CSS tokens, safe-gate seal states, and banned world-black literals.
- Rebuilt the existing single fullscreen post shader as the ordered anime-soft depth stack: bounded fisheye, linear depth, depth pixel fog, nine-tap Gaussian luma edges, four-tap depth edges, edge-gated chromatic AA, 10-band/24-level quantization, 0.0025 dither, indigo ink, static scanlines, and an eight-percent vignette.
- Preserved the existing `DepthTexture`, render target, orthographic quad, priority-1 `useFrame`, disposal path, reduced-motion seed freeze, and quality tiers. `GLOBAL_RETRO_POST_PROFILE` remains as a compatibility alias for `GLOBAL_ANIME_POST_PROFILE`.
- Converted world, HUD/readout/live rail/controls, fallback poster, diagnostics, and safe gate to bright polar-ivory paper glass with anime-ink text while retaining pointer behavior and responsive placement.
- Added complete CSS gate-seal anatomy and `idle` / `probing` / `error` pose/halo styling for the integrated splash markup, including reduced-motion treatment.
- Kept Work / Archive / Contact, station rail, low/medium/high quality, contrast control, evidence strip, and responsive HUD access present.
- Strengthened the render-budget shader assertion without removing existing checks and added the exact post-tier cap assertion.
- Added the desktop average-luminance floor of `118` without changing existing blank, overexposure, tonal-range, movement, bounds, interaction, or console assertions.
- Rewrote README direction around the shipped bright anime-soft polar field and added the new gate to documented checks.

## Owned Files Changed

- `lib/polar-art-direction.js`
- `components/RetroCinematicPostProcess.jsx`
- `components/IglooHud.jsx`
- `app/globals.css`
- `package.json`
- `scripts/check-polar-rescue.mjs`
- `scripts/check-render-budget.mjs`
- `scripts/verify-cinematic-render.mjs`
- `README.md`

## Risks / Follow-up Verification

- The GLSL stack has not yet been compiled by a browser; shader compatibility and live depth behavior require the integrated render verifier.
- The final paper-glass HUD and safe poster have not been inspected at desktop, iPad portrait/landscape, mobile, safe-gate, station-docking, high-contrast, or reduced-motion viewports.
- The new luminance threshold is intentionally uncalibrated against a fresh integrated capture; it must not be lowered to accommodate a darker frame.
- Static gate patterns were source-reviewed against the integrated scene/seal markup, but the scripts themselves were not executed.

## Untested Status

Per the integration-first instruction, none of the following were run: `npm run lint`, `npm run check:teerth`, `npm run check:render-budget`, `npm run check:polar-rescue`, `npm run verify:render`, or `npm run build`.
