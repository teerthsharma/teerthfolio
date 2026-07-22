# Task 1 implementation report — dense hologram particle field

Commit: `2340d62` (`feat: amplify semantic hologram particles`)

Review hardening commit: `0f3a40d` (`test: harden particle field verification`)

## RED / GREEN evidence

- RED: `npm run check:particles` failed with `12 !== 64`, proving the original low-tier budget was still 96 total particles.
- GREEN: `npm run check:particles` passed with `512/1536/4096 particles, one shared draw` after setting the station budgets to `64/192/512`.
- RED: fresh browser verification exposed stale canvas quality/mode diagnostics after a quality geometry remount, and reduced motion was forced to the low (512-particle) tier.
- GREEN: the canvas now republishes quality/reduced-motion and particle status when geometry changes; reduced motion selects the static medium (1536-particle) tier while safe and low-memory routes remain low.

## Verification

- `npm run check:particles` — PASS.
- `npm run verify:particles` against `http://127.0.0.1:3000` — PASS: `Wave F semantic particle proof captured for 8 stations`.
- `git diff --check` — PASS before commit.

The browser proof exercised all low/medium/high tiers, eight station selections, and the reduced-motion route. It asserted the live count, one draw, one program, active state, source credit, nonblank station frames, and no fatal diagnostics. Captured evidence is in `.verification/wave-f-particles/` and intentionally remains untracked.

## Files changed

- `lib/polar-semantic-particles.js`, `components/PolarSemanticParticles.jsx`, `components/IglooScene.jsx`, `components/IglooWorld.jsx`
- `scripts/check-polar-semantic-particles.mjs`, `scripts/verify-polar-semantic-particles.mjs`, `package.json`
- `docs/research/2026-07-12-hologram-particles-webgl-port.md`
- Task plan/progress/brief records under `.superpowers/sdd/` and `docs/superpowers/plans/`

## Risks / notes

- The dense high tier is bounded at 4096 points in the existing single `THREE.Points` draw and uses the existing single shader program with no textures.
- Browser console emitted expected nonfatal WebGL `ReadPixels` GPU-stall warnings during proof screenshots; the verifier recorded no fatal diagnostics.

## Review hardening follow-up

- RED: after the strengthened static contract, `npm run check:particles` failed because `selectQuality` only waited for canvas quality and the verifier used `waitForTimeout(240)`.
- GREEN: `selectQuality(page, quality, expectedCount)` now waits until the same canvas reports both the selected quality and exact semantic particle count before state is read; the fixed 240 ms delay is removed.
- The static contract now confirms all eight station indices appear exactly `64/192/512` times for low/medium/high and that every immutable typed stream (`behaviors`, `bounds`, `centers`, `colors`, `locals`, `seeds`, `stations`, `velocities`) repeats deterministically.
- Follow-up commands: `npm run check:particles` — PASS; `npm run verify:particles` — PASS (`Wave F semantic particle proof captured for 8 stations`); `git diff --check` — PASS.
