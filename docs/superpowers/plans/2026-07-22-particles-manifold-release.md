# Seal World Particle and Manifold Release Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` to implement this plan one task at a time, with a fresh implementer and fresh reviewer for each task.

**Goal:** Finish the local Seal World as the canonical release by making its station particles abundant, rebuilding QPU as a continuous animated Riemann-manifold ice bridge, orienting the Tooling workshop toward the arriving visitor, giving the S2 core deterministic Brownian-manifold motion, restoring cinematic shadow structure, and publishing the verified result to Vercel and GitHub `main`.

**Architecture:** Preserve the existing Next.js 16 + React Three Fiber WebGL architecture and its bounded GPU ownership. Particle density scales inside the existing single `THREE.Points` draw. Northeast and southwest stations continue using fixed-step deterministic state machines and the existing instance/material pools; new manifold motion is seeded, bounded, frame-rate invariant, and frozen to an authored pose for reduced motion. Release publication is proof-gated by static contracts, lint/build, browser render verification, Vercel CLI deployment, GitHub push, and remote CI inspection.

**Tech Stack:** Next.js 16, React 19, React Three Fiber 9, Three.js 0.178, Node contract scripts, Playwright, Vercel CLI, Git/GitHub CLI.

---

## Global constraints

- Treat the current local tree as canonical. Preserve unrelated user work and do not replace it with an older remote snapshot.
- Do not copy donor GLB files, textures, WebGPU/TSL source, or other donor implementation from `donotcommit/hologram-particles`; only the already-documented interaction and distribution concepts may inform this original WebGL port.
- Keep the particle field to one draw call, one shader program, and zero textures.
- Keep station animation deterministic and fixed-step. Do not use `Math.random`, per-frame allocations, React state inside render loops, or a camera-facing billboard that spins architectural objects every frame.
- Reduced-motion mode must render a meaningful, static, completed pose.
- QPU must read as a traversable continuous building, not five floating plates or two oversized black blocks. The entrance/docking edge remains stable while the manifold rebuilds continuously.
- Tooling must face its canonical dock/visitor approach vector in XZ space.
- S2 Brownian motion must be visibly organic but mathematically bounded and mean-reverting on tangent/manifold coordinates.
- Do not push or deploy until all required local and browser checks pass.

### Task 1: Dense hologram particle field

**Files:**
- Modify: `lib/polar-semantic-particles.js`
- Modify: `scripts/check-polar-semantic-particles.mjs`
- Modify: `scripts/verify-polar-semantic-particles.mjs`
- Modify: `docs/research/2026-07-12-hologram-particles-webgl-port.md`
- Modify: `package.json`
- Inspect only unless a failing contract requires a focused fix: `components/PolarSemanticParticles.jsx`

**Step 1: Write the failing density/budget contract**

Update `scripts/check-polar-semantic-particles.mjs` to require exactly `512 / 1536 / 4096` particles for low/medium/high quality across all eight stations (`64 / 192 / 512` per station), while retaining one shared draw, one program, zero textures, deterministic typed attributes, reduced-motion support, and the no-GLB/no-source-copy credit.

Update `scripts/verify-polar-semantic-particles.mjs` to require those same quality counts in the live canvas dataset and `1536` for the medium reduced-motion route.

Add `check:particles` and `verify:particles` scripts to `package.json`, and insert `npm run check:particles` into the build gate.

**Step 2: Run the focused static test and confirm RED**

Run: `npm run check:particles`

Expected: FAIL because production still publishes `96 / 224 / 448` total particles.

**Step 3: Implement the smallest production change**

Change `POLAR_PARTICLE_QUALITY` to `64 / 192 / 512` particles per station. Preserve the existing deterministic golden-ratio/hashed distribution, station semantics, shader behavior, one `THREE.Points` draw, one material program, and zero textures. If the larger field visually clumps, tune only existing bounded point scale/opacity inputs; do not add a second draw or texture.

Update the compatibility research record with the new `512 / 1536 / 4096` bounded WebGL totals and reiterate that donor assets and WebGPU source are excluded.

**Step 4: Run focused verification**

Run: `npm run check:particles`

Run against the live local server: `npm run verify:particles`

Expected: both PASS; browser report covers every quality tier, all eight stations, reduced motion, no fatal diagnostics, one draw, one program, and correct counts.

**Step 5: Commit**

Commit message: `feat: amplify semantic hologram particles`

### Task 2: Continuous QPU manifold, visitor-facing Tooling, Brownian S2

**Files:**
- Modify: `lib/polar-station-mechanisms.js`
- Modify: `components/PolarStationMechanismsNE.jsx`
- Modify: `scripts/check-polar-station-mechanisms-ne.mjs`
- Modify: `lib/polar-station-mechanisms-sw.js`
- Modify: `components/PolarStationMechanismsSW.jsx`
- Modify: `scripts/check-polar-station-mechanisms-sw.mjs`
- Modify if names/contracts require synchronization: `lib/polar-art-direction.js`

**Step 1: Write failing northeast motion/geometry contracts**

In `scripts/check-polar-station-mechanisms-ne.mjs`, replace the old segmented-QPU expectations with contracts for:

- a continuous sampled Riemann-manifold span generated as original `THREE.BufferGeometry`/merged geometry;
- a stable entrance/dock band and continuous floor/shell/rib structure;
- one bounded scalar build envelope (or equivalent continuous slice field) that grows from endpoints and closes at the center without disconnected plate scattering;
- reconstruction, verification-beam, deterministic fixed-step, safe-mode, quality-budget, and reduced-motion completed-pose behavior;
- S2 state containing deterministic Brownian-manifold coordinates/velocities with fixed seeds, mean reversion, bounded magnitude, frame-rate invariance, no `Math.random`, and zero motion in reduced mode.

Exercise the public fixed-step mechanism system at different frame chunkings and assert equivalent S2 manifold state within tolerance. Assert the Brownian displacement remains within its authored bound over a long run.

**Step 2: Write failing southwest orientation contract**

Export a pure orientation helper or visitor-facing angle from `lib/polar-station-mechanisms-sw.js`. In `scripts/check-polar-station-mechanisms-sw.mjs`, calculate the station-to-dock vector and assert the workshop local open-face vector, after applying its yaw, has a positive near-unit dot product with the station-to-dock vector. Keep the orientation stable and architectural, not a per-frame billboard.

Run: `npm run check:station-mechanisms-ne && npm run check:station-mechanisms-sw`

Expected: FAIL on the new manifold, Brownian-state, and visitor-facing assertions.

**Step 3: Implement continuous QPU geometry and reconstruction**

Replace the oversized paired sanctum masses and five floating coherence plates with an original parametric pavilion generated from a sampled double-curved strip, using a smooth function such as:

`y(u,v) = base + arch(u) + saddle * (v*v - u*u) + ripple(u,v)`

Build a continuous floor/shell with side ribs and slender endpoint abutments. Reuse the existing three QPU frame/plate/signal material pools and budget; individual instances may represent contiguous manifold slices, but their neutral pose must overlap into an unbroken surface. Drive slice visibility/build from one continuous route-progress field that constructs from both endpoints toward the center and gently reweaves after closure. Preserve coherence and the verification beam. Reduced motion displays the fully assembled bridge.

**Step 4: Implement deterministic S2 Brownian-manifold motion**

Add a small fixed set of seeded tangent-coordinate positions and velocities to `createS2State`. Advance them in `stepS2` using a deterministic Ornstein-Uhlenbeck/mean-reverting update driven by fixed harmonic forcing (not random sampling). Project/clamp the coordinates to the authored manifold radius. Blend the displacement by proximity/closure and apply it to shell/core/signal transforms in `applyS2Instances`. Reset or damp cleanly on release; freeze at a meaningful zero/static pose for reduced motion.

**Step 5: Orient Tooling toward the visitor**

Derive the assembly yaw from the immutable station center-to-dock vector and the workshop geometry's documented local forward/open-face axis. Store the result in the southwest profile/transform, reuse it for collider/render consistency where appropriate, and add a semantic render name indicating visitor-facing open workshop. Do not update it per frame.

**Step 6: Run focused verification**

Run: `npm run check:station-mechanisms-ne && npm run check:station-mechanisms-sw && npm run check:station-mechanism-layer`

Run against the live local server: `npm run verify:station-mechanisms`

Expected: PASS with bounded budgets, no fatal diagnostics, continuous QPU silhouette, visitor-facing Tooling, deterministic Brownian S2, and reduced-motion/static safety.

**Step 7: Commit**

Commit message: `feat: rebuild stations as living manifolds`

### Task 3: Cinematic proof, Vercel deployment, and remote main

**Files:**
- Modify only if the render contract remains red: the smallest responsible cinematic grade/light/material file identified by `scripts/verify-cinematic-render.mjs`
- Modify first when fixing a render defect: `scripts/verify-cinematic-render.mjs` or the relevant focused contract script
- Modify: `.superpowers/sdd/progress.md`
- Generated evidence only: `.verification/**`, `verification/screenshots-cinematic-render/**`

**Step 1: Reproduce the known render failure**

Run against the live local server: `npm run verify:render`

Expected baseline if still unfixed: FAIL on readable shadow structure at desktop, tablet, mobile, contrast, or reduced-motion viewports even though average luminance is bright. Treat this as a flat/washed cinematic grade, not a request for blanket exposure.

**Step 2: Write/retain the failing cinematic contract and fix the root cause**

Keep the verifier's requirement for both a bright average image and at least 30 meaningfully dark/shadow pixels in the sampled frame. Trace the final post-grade, tone-mapping exposure, fog, fill/key ratios, and station material luminance. Make the smallest fix that lifts readable highlights while restoring shadow separation; do not hide the failure by lowering the threshold. Preserve accessibility contrast and reduced-motion behavior.

**Step 3: Run the complete local release gate**

Run: `npm run lint`

Run: `npm run build`

Run against the live server: `npm run verify:particles`

Run: `npm run verify:station-mechanisms`

Run: `npm run verify:render`

Expected: every command PASS, every render viewport PASS, and no fatal browser diagnostics.

**Step 4: Deploy with Vercel CLI**

Confirm CLI identity with `vercel whoami`. Link/create the canonical `teerthfolio` project in the authenticated `teerthsharma` account if it is still unlinked. Deploy the verified tree with `vercel --prod --yes`, capture the production URL, then inspect the deployment/project and perform an HTTP/browser smoke check against that URL.

**Step 5: Commit any final release fix**

Commit message: `fix: finish cinematic release proof`

If no tracked files changed in this task, do not create an empty commit.

**Step 6: Whole-branch review and publication**

Generate a whole-branch review package from `origin/main` to `HEAD` and obtain a fresh final reviewer verdict. Resolve all Critical and Important findings, rerun affected focused checks, then rerun the complete release gate if tracked production code changed.

Push the verified `HEAD` directly to remote `main` as explicitly requested. Verify:

- `git ls-remote origin refs/heads/main` equals local `HEAD`;
- `gh auth status` and repository identity resolve to `Debyte404/teerthfolio` under the authenticated `teerthsharma` GitHub CLI session;
- GitHub checks for the pushed `main` commit complete successfully (or report a concrete repository-level absence of configured checks without claiming CI success);
- the Vercel production deployment resolves and serves the pushed commit.

**Step 7: Mark the goal complete**

Only after all three task reviews, the final whole-branch review, local/browser gates, production smoke check, remote-main SHA verification, and GitHub check verification are green, mark the active goal complete and report the exact pushed SHA and production URL.
