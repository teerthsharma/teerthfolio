# Eight-Station Personality World Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Teerthfolio into eight visually distinct, fullscreen Three.js micro-worlds where docking gives one dominant monument, one authored environment, one motion language, and one station-responsive seal crown while preserving every existing safety, navigation, archive, accessibility, quality, performance, and deployment contract.

**Architecture:** `lib/polar-station-personality.js` remains the immutable identity authority. Physical traversal derives `exclusiveStationId`; that single value selects the monument, biome, dressing, particles, lighting, HUD, and halo. Implementation is split by file ownership into Observatory, Northeast, Southwest, and Gate/Integration lanes so agents never edit the same Three.js scene file concurrently.

**Tech Stack:** Next.js 16.2.9, React 19.1, Three.js 0.178, React Three Fiber 9.2, GLSL, Node verifier scripts, Playwright.

## Global Constraints

- Preserve the safe gate, WASD navigation, mobile routing, Low/Medium/High/Contrast controls, reduced motion, evidence/archive fallback, accessibility, renderer lifecycle, verifier scripts, and Vercel deployment.
- `High` is the default quality. Safe mode and reduced motion remain complete experiences.
- A docked scene renders exactly one full-detail station. Travelling renders at most two bounded contextual landmarks.
- The seal is a small 0.8 m guide. A docked monument occupies 42–68% of viewport width and rises 2.5–6 seal heights.
- The seal occupies 10–16% of viewport width and remains foreground-left or foreground-right.
- Every station has unique silhouette, palette, materials, ground, horizon, objects, particles, motion, lighting, HUD identity, and halo signature.
- Procedural Three.js geometry and shaders are the primary visual medium. Do not add external models or copied reference assets.
- Use bounded deterministic pools, shared geometries/materials, DPR limits, and quality-scaled effects. Do not allocate geometry or materials inside `useFrame`.
- Pointer interaction is meaningful only when docked. The pointer must never highlight the ground or replace navigation.
- Do not weaken a verifier, delete a safety path, or hide a regression to pass the final gate.
- Preserve all unrelated dirty-worktree changes. Each implementer may edit only the files assigned to its lane.

---

## Design Decision

Three execution models were considered:

1. **One agent per station:** maximum apparent parallelism, but S2/Aether/Field/QPU share `PolarStationMechanismsNE.jsx`, and Upstream/Archive/Tooling share `PolarStationMechanismsSW.jsx`. Concurrent edits would conflict and corrupt pooled resource assumptions.
2. **One fully sequential agent:** safest merge shape, but too slow and gives weak independent review.
3. **Recommended — parallel file-ownership lanes:** one Observatory agent, one Northeast agent, one Southwest agent, and the root integrator for Gate/Camera/Halo/HUD. Each lane works sequentially inside its owned file, while independent lanes run concurrently. Shared integration happens only after all lanes stop.

Use option 3.

## Current Baseline

- Completed and retained: canonical eight-profile authority, live dock exclusivity, personality-derived biome and particle identity, dock-first HUD identity, archive action treatment, and initial station halo profiles.
- Present but not visually accepted: all monument families, the opening shader, the crown halo, macro scale, and authored station motion.
- Recently landed in the dirty worktree and requiring visual review: Observatory 1.58× scale and brick hover, Northeast macro mechanisms, Southwest 1.9–2.15× scales and motion cycles.
- No task may claim completion from source assertions alone. Every visual task needs two-frame screenshot evidence.

## Agent Topology and File Ownership

| Lane | Owner | Exclusive write scope | Forbidden shared files |
|---|---|---|---|
| A | Observatory implementer | `components/PolarObservatoryDome.jsx`, `lib/polar-dome-lattice.js`, dome verifiers | `IglooScene.jsx`, `globals.css` |
| B | Northeast implementer | `components/PolarStationMechanismsNE.jsx`, `lib/polar-station-mechanisms.js`, NE verifier | `IglooScene.jsx`, `polar-station-personality.js` |
| C | Southwest implementer | `components/PolarStationMechanismsSW.jsx`, `lib/polar-station-mechanisms-sw.js`, SW verifier | `IglooScene.jsx`, `IglooHud.jsx` |
| D | Root integrator | Gate, camera, halo, HUD, postprocessing, shared scene wiring, canonical authority | all lane files until lanes stop |

Maximum live topology is root plus three implementation agents. Review agents run only after the implementation agents stop.

---

### Task 1: Freeze the visual contracts and baseline evidence

**Files:**
- Modify: `scripts/check-station-personality-worlds.mjs`
- Modify: `scripts/check-polar-camera-composition.mjs`
- Modify: `scripts/check-polar-gate.mjs`
- Create: `.verification/eight-station/baseline-manifest.md`

**Interfaces:**
- Consumes: `STATION_PERSONALITY_ORDER`, `STATION_PERSONALITY_PROFILES`, `STATION_WORLD_SCHEMA`.
- Produces: executable macro-scale, gate, halo, exclusivity, and motion contracts used by every lane.

- [ ] **Step 1: Record the baseline without changing production code**

  Capture the current gate and eight docked stations at 1600×1000 High into `.verification/eight-station/baseline/`. In `baseline-manifest.md`, record route, viewport, quality, docked station ID, visible sibling count, and screenshot path.

- [ ] **Step 2: Add failing macro-scale assertions**

  Extend the personality verifier with one frozen scale contract per station:

  ```js
  const EXPECTED_HERO_SCALE = {
    "observatory-plaque": [3.8, 0.42, 0.68],
    "s2-kernel-core": [3.0, 0.42, 0.68],
    "manifold-reactor": [3.0, 0.42, 0.68],
    "field-chamber-coils": [3.0, 0.42, 0.68],
    "qpu-ice-bridge": [3.0, 0.42, 0.68],
    "upstream-radio-mast": [4.0, 0.42, 0.68],
    "topology-archive-wall": [3.0, 0.50, 0.68],
    "assembly-tool-locker": [3.0, 0.42, 0.68],
  };
  ```

- [ ] **Step 3: Add failing motion-language assertions**

  Require named, bounded motion contracts: `damped-brick-lift`, `counter-rotating-containment`, `seed-energy-cycle`, `thermal-compression`, `nanite-reconstruction`, `bearing-scan`, `archive-aperture`, and `assembly-proof-cycle`.

- [ ] **Step 4: Run the contracts and confirm RED**

  Run:

  ```powershell
  node scripts\check-station-personality-worlds.mjs
  node scripts\check-polar-camera-composition.mjs
  node scripts\check-polar-gate.mjs
  ```

  Expected: at least one failure for each missing visual contract; no syntax or module-resolution failure.

- [ ] **Step 5: Commit only the contract changes**

  ```powershell
  git add scripts/check-station-personality-worlds.mjs scripts/check-polar-camera-composition.mjs scripts/check-polar-gate.mjs .verification/eight-station/baseline-manifest.md
  git commit -m "test: freeze eight-station visual contracts"
  ```

---

### Task 2: Rebuild the opening gate as a black stellar threshold

**Files:**
- Modify: `components/AntarcticSplashShader.jsx`
- Modify: `components/SdfSealSplash.jsx`
- Modify: `app/globals.css`
- Test: `scripts/check-polar-gate.mjs`

**Interfaces:**
- Consumes: `active: boolean` in `AntarcticSplashShader`, render-permission callbacks in `SdfSealSplash`.
- Produces: black fallback field, white star points, four independent phase-negating wave families, and a `#39FF14` primary action.

- [ ] **Step 1: Verify the gate test fails for the exact visual language**

  Require source tokens `starField`, `electricBlueWave`, `devilLettuceWave`, `hotPinkWave`, `amberWave`, `phaseNegation`, `#39FF14`, and the exact CTA label. Forbid `sdf-art-dome`, `sdf-dome-shell`, and `sdf-dome-tile`.

- [ ] **Step 2: Make the shader fallback correct before WebGL**

  Append the final cascade at the true end of `globals.css`:

  ```css
  body .sdf-seal-splash {
    background-color: #020308;
    color: #f8fbff;
  }

  body .sdf-seal-splash .sdf-render-button {
    min-height: 56px;
    background: #39ff14;
    color: #020308;
    box-shadow: 0 0 0 1px #0c7a13, 0 0 32px rgb(57 255 20 / 38%);
  }
  ```

- [ ] **Step 3: Implement four independent bounded shader waves**

  Keep each wave in a separate GLSL function. Combine them over `vec3(0.005, 0.007, 0.012)`, preserve black between bands, and clamp the summed luminance before dithering so phase crossings do not wash the screen white.

- [ ] **Step 4: Preserve the safe interaction path**

  Keep capability probing, fullscreen request, wake lock, safe fallback, keyboard activation, and the evidence-index escape. The CTA text is exactly `Start the adventure into Seal's Topological Land`; secondary copy is `Scroll left if boring`.

- [ ] **Step 5: Prove hydration and the user gesture**

  In Playwright, listen for `pageerror` and `console`, reload, click the CTA, and assert the gate leaves `idle` without a hydration error. Assert the shader canvas backing resolution is larger than 300×150 at a 1600×1000 viewport.

- [ ] **Step 6: Verify GREEN and capture two frames**

  ```powershell
  node scripts\check-polar-gate.mjs
  node scripts\check-gpu-lifecycle.mjs
  ```

  Capture frames 1.5 seconds apart. Reject if the background is pale, the button is amber, the old dome exists, or all four waves are visually static.

- [ ] **Step 7: Commit**

  ```powershell
  git add components/AntarcticSplashShader.jsx components/SdfSealSplash.jsx app/globals.css scripts/check-polar-gate.mjs
  git commit -m "feat: rebuild the stellar topology gate"
  ```

---

### Task 3: Finish Observatory scale, collider, and Igloo-style brick interaction

**Files:**
- Modify: `components/PolarObservatoryDome.jsx`
- Modify: `lib/polar-dome-lattice.js`
- Test: `scripts/check-dome-crystal-material.mjs`
- Test: `scripts/check-polar-dome-lattice.mjs`
- Test: `scripts/check-igloo-reference-effects.mjs`

**Interfaces:**
- Consumes: `pointerInteractionEnabled`, `reducedMotion`, `quality`, and canonical Observatory personality.
- Produces: one scaled observatory root, collider-matched lattice, and instanced `instanceHover` displacement.

- [ ] **Step 1: Extend the failing reference-effect contract**

  Assert dock-only pointer activation, 0.12–0.18 world-unit direct lift, first-ring 35–65%, second-ring 10–25%, damped return, and reduced-motion freeze.

- [ ] **Step 2: Keep hover data on the existing instanced draw**

  Use one dynamic instanced attribute and update values only when they change:

  ```js
  const lift = direct ? 1 : firstRing ? 0.5 : secondRing ? 0.18 : 0;
  next[index] = THREE.MathUtils.damp(next[index], lift, 12, delta);
  ```

  The vertex shader moves each block along its normalized dome radial normal by `instanceHover * 0.15`.

- [ ] **Step 3: Align collision and visible scale**

  Apply the same world scale to the visual lattice, airlock, collision envelope, contact shadow, and pointer raycast space. Preserve the airlock corridor opening.

- [ ] **Step 4: Verify focused contracts**

  ```powershell
  node scripts\check-dome-crystal-material.mjs
  node scripts\check-polar-dome-lattice.mjs
  node scripts\check-dome-performance.mjs
  node scripts\check-igloo-reference-effects.mjs
  ```

- [ ] **Step 5: Capture interactive proof**

  Capture rest, direct-hover, and recovered frames. Reject if only emissive glow changes, if the igloo is smaller than 42% viewport width, or if the seal appears building-sized.

- [ ] **Step 6: Commit**

  ```powershell
  git add components/PolarObservatoryDome.jsx lib/polar-dome-lattice.js scripts/check-dome-crystal-material.mjs scripts/check-polar-dome-lattice.mjs scripts/check-igloo-reference-effects.mjs
  git commit -m "feat: articulate the observatory ice lattice"
  ```

---

### Task 4: Recompose the Northeast station family at architectural scale

**Files:**
- Modify: `components/PolarStationMechanismsNE.jsx`
- Modify: `lib/polar-station-mechanisms.js`
- Test: `scripts/check-polar-station-mechanisms-ne.mjs`

**Interfaces:**
- Consumes: `exclusiveStationId`, `quality`, `reducedMotion`, `safeMode`, traversal pose, and canonical profiles.
- Produces: pooled S2, Aether, Field, and QPU resources with unique geometry and motion states.

- [ ] **Step 1: Add RED geometry and motion assertions**

  Require these frozen contracts:

  ```js
  const NE_HERO_CONTRACTS = {
    "s2-kernel-core": { widthInSeals: 5, motion: "counter-rotating-containment" },
    "manifold-reactor": { widthInSeals: 5, motion: "seed-energy-cycle" },
    "field-chamber-coils": { widthInSeals: 6, motion: "thermal-compression" },
    "qpu-ice-bridge": { widthInSeals: 7, motion: "nanite-reconstruction" },
  };
  ```

- [ ] **Step 2: Build S2 as a long CERN containment chamber**

  Extend the cryostat longitudinally, repeat magnetic collars, add service rails, and move a cyan diagnostic pulse along the axis. Counter-rotate inner and outer containment rings. The core remains enclosed and readable.

- [ ] **Step 3: Build Aether around a dominant golden seed**

  Use abyss blue for the holder and base; replace thin spikes with a suspended golden sphere/seed, orbital arcs, caustic ribbons, and deterministic gold motes. Shields part on approach. The energy loop is closed: particles leave, orbit, and return.

- [ ] **Step 4: Enlarge Field into a nuclear heater chamber**

  Lengthen the graphite cage to 4–6 seal widths, contain an orange-white core, compress opposed coils, and use bounded vertex displacement for heat shimmer. Remove ice objects from its ownership set.

- [ ] **Step 5: Rebuild QPU as a suspended inverse bridge**

  Float the span 1–2 seal heights above ground; mirror supports above and below; make the bridge 5–7 seal widths long. Reuse pooled segment instances for a deterministic disassemble/rebuild wave. Never allocate nanite geometry in `useFrame`.

- [ ] **Step 6: Implement quality and reduced-motion variants**

  Low reduces segment/mote counts but preserves silhouette. Medium preserves motion at lower density. High uses full authored density. Reduced motion freezes continuous rotation and nanites at a readable completed pose while retaining emission and identity.

- [ ] **Step 7: Verify and capture all four stations**

  ```powershell
  node scripts\check-polar-station-mechanisms-ne.mjs
  node scripts\check-station-personality-worlds.mjs
  node scripts\check-render-budget.mjs
  ```

  For each station, capture two frames 1.5 seconds apart. Reject if the building is seal-sized, flat black, visually interchangeable, or static.

- [ ] **Step 8: Commit**

  ```powershell
  git add components/PolarStationMechanismsNE.jsx lib/polar-station-mechanisms.js scripts/check-polar-station-mechanisms-ne.mjs
  git commit -m "feat: rebuild northeast station monuments"
  ```

---

### Task 5: Recompose the Southwest station family as inhabited regions

**Files:**
- Modify: `components/PolarStationMechanismsSW.jsx`
- Modify: `lib/polar-station-mechanisms-sw.js`
- Test: `scripts/check-polar-station-mechanisms-sw.mjs`

**Interfaces:**
- Consumes: the Southwest mechanism state machine, `exclusiveStationId`, quality, reduced motion, archive evidence state, and canonical profiles.
- Produces: Upstream harbor, Archive canyon, and Tooling gantry with repeating authored motion.

- [ ] **Step 1: Add RED scale and cycle assertions**

  Require Upstream `bearing-scan`, Archive `archive-aperture`, Tooling `assembly-proof-cycle`, docked scale ranges, and repeatable reduced-motion terminal states.

- [ ] **Step 2: Enlarge Upstream and place it behind the seal**

  Set dish diameter to 2–3 seal widths and mast height to 4–5 seal heights. Animate bearing scan ±7°, expanding radio rings, packet launches, and beacon response. Coral structure and mint signal light must remain readable.

- [ ] **Step 3: Replace Archive slabs with a relational canyon**

  Create tall staggered walls with real apertures, a visible central aisle, cyan provenance paths, and magenta record strata. The station occupies at least half the docked frame and never blocks the archive action dock.

- [ ] **Step 4: Turn Tooling into a moving computational-archaeology workshop**

  Scale the purple basalt gantry to workshop size. Cycle parts through rise → align → lock → prove → hold → disassemble. Move ochre glyphs across the gantry during proof instead of using static decoration.

- [ ] **Step 5: Verify and capture all three stations**

  ```powershell
  node scripts\check-polar-station-mechanisms-sw.mjs
  node scripts\check-station-personality-worlds.mjs
  node scripts\check-render-budget.mjs
  ```

  Reject if Archive reads as a black box, Tooling appears static, Upstream is not behind the seal, or any monument is visually equal to the seal.

- [ ] **Step 6: Commit**

  ```powershell
  git add components/PolarStationMechanismsSW.jsx lib/polar-station-mechanisms-sw.js scripts/check-polar-station-mechanisms-sw.mjs
  git commit -m "feat: rebuild southwest station regions"
  ```

---

### Task 6: Solve crown halo and docked camera composition

**Files:**
- Modify: `components/TopologicalSealMascot.jsx`
- Modify: `lib/polar-camera-composition.js`
- Modify: `components/IglooScene.jsx`
- Test: `scripts/check-seal-manifold.mjs`
- Test: `scripts/check-polar-camera-composition.mjs`

**Interfaces:**
- Consumes: `resolveStationHaloPresentation(stationId)`, physical dock ID, viewport, quality, reduced motion, station bounds.
- Produces: one crown halo above/behind the head and per-station hero framing.

- [ ] **Step 1: Add failing crown geometry assertions**

  Assert halo center Y is above the head, diameter is 0.7–0.9 head widths, station colors come from the authority, and reduced motion freezes rotation without hiding the halo.

- [ ] **Step 2: Anchor the halo to the seal head**

  Use a head-local group offset rather than world-ground coordinates. Keep one halo mesh; change rotation, color, and pulse by station profile.

- [ ] **Step 3: Extend the camera solver with station envelopes**

  Add station-specific monument envelopes to `MECHANISM_VERTICAL_ENVELOPES`. Score candidate views against 42–68% monument width, 10–16% seal width, HUD exclusion, and silhouette overlap. Do not enlarge the world to solve framing.

- [ ] **Step 4: Keep travel framing distinct from dock framing**

  `resolvePolarTravelComposition` remains restrained and may show bounded landmarks. `solvePolarCameraComposition` receives the physically docked station and chooses the hero view only after arrival.

- [ ] **Step 5: Verify and capture**

  ```powershell
  node scripts\check-seal-manifold.mjs
  node scripts\check-polar-camera-composition.mjs
  node scripts\check-polar-traversal.mjs
  ```

  Reject if the halo intersects the ground, trails behind the seal, covers its eyes, or the active building does not dominate.

- [ ] **Step 6: Commit**

  ```powershell
  git add components/TopologicalSealMascot.jsx lib/polar-camera-composition.js components/IglooScene.jsx scripts/check-seal-manifold.mjs scripts/check-polar-camera-composition.mjs
  git commit -m "feat: frame station heroes and crown the seal"
  ```

---

### Task 7: Integrate exclusive station environments, HUD, and truthful copy

**Files:**
- Modify: `components/IglooScene.jsx`
- Modify: `components/IglooWorld.jsx`
- Modify: `components/IglooHud.jsx`
- Modify: `components/PolarBiomeWorld.jsx`
- Modify: `components/AdaptivePolarWorldDressing.jsx`
- Modify: `components/PolarSemanticParticles.jsx`
- Modify: `lib/polar-biome-fields.js`
- Modify: `lib/polar-semantic-particles.js`
- Test: `scripts/check-station-personality-worlds.mjs`
- Test: `scripts/check-hud-accessibility.mjs`
- Test: `scripts/check-user-facing-copy.mjs`

**Interfaces:**
- Consumes: physical `traversalPresentation.dockedStationId` only.
- Produces: exactly one station-owned environment and truthful edge HUD.

- [ ] **Step 1: Assert the ownership invariant before integration**

  For every station, `resolveLocalWorldOwnership(position, null, { exclusiveStationId })` returns only that station. During travel, it returns at most two IDs.

- [ ] **Step 2: Wire all scene consumers to one dock ID**

  Pass `dockedStationId` into mechanism layer, biome, dressing, semantic particles, artifact filtering, lighting, HUD, and halo. Never use selected destination or historical dock evidence as live ownership.

- [ ] **Step 3: Remove center-screen route text**

  Route status belongs in an edge HUD. The visual focal area contains only the world, seal, monument, and intentional diegetic labels.

- [ ] **Step 4: Make Archive actions permanent and usable**

  When physically docked at Archive, show `Enter topology archive` and `Stay in polar world` as separate keyboard-focusable controls, each at least 44×44 px, never clipped by the station card or viewport edge.

- [ ] **Step 5: Audit user-facing claims**

  Remove invented metrics and stale station copy. Source project counts and GitHub activity from actual data. Every label must describe current state, an available action, or verifiable evidence.

- [ ] **Step 6: Verify**

  ```powershell
  node scripts\check-station-personality-worlds.mjs
  node scripts\check-polar-biome-world.mjs
  node scripts\check-polar-semantic-particles.mjs
  node scripts\check-hud-accessibility.mjs
  node scripts\check-user-facing-copy.mjs
  ```

- [ ] **Step 7: Commit**

  ```powershell
  git add components/IglooScene.jsx components/IglooWorld.jsx components/IglooHud.jsx components/PolarBiomeWorld.jsx components/AdaptivePolarWorldDressing.jsx components/PolarSemanticParticles.jsx lib/polar-biome-fields.js lib/polar-semantic-particles.js scripts/check-station-personality-worlds.mjs scripts/check-hud-accessibility.mjs scripts/check-user-facing-copy.mjs
  git commit -m "feat: integrate exclusive station micro-worlds"
  ```

---

### Task 8: Tune cinematic postprocessing without destroying silhouettes

**Files:**
- Modify: `components/RetroCinematicPostProcess.jsx`
- Modify: `components/PolarAtmosphereField.jsx`
- Modify: `components/IglooScene.jsx`
- Test: `scripts/verify-cinematic-render.mjs`
- Test: `scripts/check-render-budget.mjs`

**Interfaces:**
- Consumes: color target, depth texture, quality, reduced motion, station palette.
- Produces: quality-scaled depth fog, dithering, quantization, edge lines, restrained chromatic aberration, scanlines, vignette, and fisheye.

- [ ] **Step 1: Add failing effect-budget assertions**

  Require High to enable the complete effect chain, Medium to reduce samples and aberration, Low to keep quantization/edge identity only, Contrast to preserve legibility, and reduced motion to freeze temporal noise.

- [ ] **Step 2: Make depth fog station-aware**

  Reconstruct linear depth and blend the active station fog color subtly. Fog must separate foreground seal, hero monument, and horizon; it must not bleach the screen.

- [ ] **Step 3: Use Gaussian-assisted hand-drawn edges**

  Use a small separable or cross-sampled blur before depth/luma edge comparison. Quantize edge confidence and mix the personality ink at a restrained strength.

- [ ] **Step 4: Bound screen effects**

  Chromatic aberration remains subpixel except at extreme edges. Fisheye preserves HUD-safe composition. Scanlines and vignette must not obscure the seal eyes or monument silhouette.

- [ ] **Step 5: Verify performance and visuals**

  ```powershell
  node scripts\verify-cinematic-render.mjs
  node scripts\check-render-budget.mjs
  node scripts\check-gpu-lifecycle.mjs
  ```

- [ ] **Step 6: Commit**

  ```powershell
  git add components/RetroCinematicPostProcess.jsx components/PolarAtmosphereField.jsx components/IglooScene.jsx scripts/verify-cinematic-render.mjs scripts/check-render-budget.mjs
  git commit -m "feat: tune station-aware cinematic rendering"
  ```

---

### Task 9: Lifecycle, accessibility, and responsive completion

**Files:**
- Modify: `components/PortfolioPage.jsx`
- Modify: `components/IglooWorld.jsx`
- Modify: `components/IglooScene.jsx`
- Modify: `app/globals.css`
- Test: `scripts/check-gpu-lifecycle.mjs`
- Test: `scripts/verify-portal-gpu-suspension.mjs`
- Test: `scripts/verify-hud-accessibility.mjs`

**Interfaces:**
- Consumes: world visibility, archive transition, quality, reduced motion, contrast, viewport size.
- Produces: suspended renderer outside the topology world and complete desktop/mobile access.

- [ ] **Step 1: Assert renderer suspension**

  When the user scrolls away from Topology Land or enters the archive, stop the RAF loop, release transient render targets, and retain only recoverable state. Returning recreates the view without losing the Observatory.

- [ ] **Step 2: Enforce resource bounds**

  Cap DPR per quality, reuse geometry/material pools, dispose only on ownership/lifecycle change, and ensure no per-frame React state updates.

- [ ] **Step 3: Complete reduced motion and contrast**

  Reduced motion preserves station form, lighting, halo color, archive actions, and navigation while freezing loops at authored poses. Contrast mode preserves outlines and text separation for every palette.

- [ ] **Step 4: Complete mobile routing**

  At 390×844, station taps route the seal, HUD remains reachable, no card covers the monument, and all actions meet 44 px minimum target size.

- [ ] **Step 5: Verify**

  ```powershell
  node scripts\check-gpu-lifecycle.mjs
  node scripts\verify-portal-gpu-suspension.mjs
  node scripts\verify-hud-accessibility.mjs
  node scripts\check-hud-accessibility.mjs
  ```

- [ ] **Step 6: Commit**

  ```powershell
  git add components/PortfolioPage.jsx components/IglooWorld.jsx components/IglooScene.jsx app/globals.css scripts/check-gpu-lifecycle.mjs scripts/verify-portal-gpu-suspension.mjs scripts/verify-hud-accessibility.mjs
  git commit -m "fix: complete polar world lifecycle and access"
  ```

---

### Task 10: Visual matrix, independent review, and release proof

**Files:**
- Create: `.verification/eight-station/final-manifest.md`
- Create: `.superpowers/sdd/eight-station-progress.md`
- Modify only if a consolidated fix is required: files named by review findings.

**Interfaces:**
- Consumes: the complete branch diff and all focused verifier outputs.
- Produces: screenshot matrix, reviewer findings, consolidated fixes, and release-ready proof.

- [ ] **Step 1: Capture the required matrix**

  For all eight stations capture:

  - 1920×1080 High
  - 1366×768 Medium
  - 390×844 mobile with reduced motion
  - High Contrast
  - travelling, approaching, docking, docked, and leaving where state changes are visible
  - two docked frames 1.5 seconds apart for authored motion

- [ ] **Step 2: Run pixel-level rejection checks**

  Reject any screenshot containing a sibling monument, center-screen route text, flat-black geometry, blank horizon, clipped panel, hidden action, ground halo, seal-sized building, pale gate, amber gate CTA, or decorative particle noise without semantic motion.

- [ ] **Step 3: Dispatch three independent reviewers**

  Reviewer 1 checks specification and station identity. Reviewer 2 checks Three.js resource lifecycle, shader safety, and render budget. Reviewer 3 checks accessibility, copy truth, responsive layout, and reduced motion. Reviewers are read-only and report Critical/Important findings with exact file and line evidence.

- [ ] **Step 4: Apply one consolidated fix wave**

  Stop reviewers before edits. The root integrator resolves all Critical and Important findings without reopening parallel shared-file editing.

- [ ] **Step 5: Run the complete final gate**

  ```powershell
  npm run lint
  npm run build
  node scripts\check-station-personality-worlds.mjs
  node scripts\check-polar-rescue.mjs
  node scripts\check-render-budget.mjs
  node scripts\verify-cinematic-render.mjs
  node scripts\verify-hud-accessibility.mjs
  node scripts\verify-portal-gpu-suspension.mjs
  ```

  Expected: every command exits 0. Do not replace `npm run build` with `next build` because the package build includes the required contract matrix.

- [ ] **Step 6: Compare baseline and final evidence**

  `final-manifest.md` must link every final screenshot to its baseline counterpart and record the observable change in scale, silhouette, motion, environment, halo, and HUD.

- [ ] **Step 7: Finish the branch only after proof**

  Use `superpowers:verification-before-completion`, then `superpowers:requesting-code-review`, then `superpowers:finishing-a-development-branch`. Push only after the user approves the final visual matrix.

---

## Agentic Execution Schedule

### Wave 0 — Root only

Complete Task 1. Freeze contracts and baseline evidence before any further visual edits.

### Wave 1 — Four non-overlapping lanes

- Root: Task 2, then wait at the shared-file boundary.
- Agent A: Task 3 only.
- Agent B: Task 4 only.
- Agent C: Task 5 only.

Each agent must return: files changed, focused commands, outputs, screenshot paths, self-review, and unresolved risks. No agent edits another lane's files.

### Wave 2 — Root integration

Stop all implementation agents. Root reviews the combined diff and completes Tasks 6–9 sequentially because they share `IglooScene.jsx`, `IglooWorld.jsx`, and `globals.css`.

### Wave 3 — Independent review

Run the three read-only reviewers from Task 10 in parallel. Do not permit reviewer edits.

### Wave 4 — Consolidated fixes and release

Root applies all accepted findings, reruns the full matrix, captures final evidence, and presents the visual proof before push.

## Completion Definition

The plan is complete only when all eight docked stations are exclusive and unmistakable without HUD; every monument is architecturally larger than the seal; every station visibly moves in its own semantic way; the halo is a station-colored crown; the gate is black with white stars, four colored phase waves, and a devil-lettuce green CTA; the archive action is obvious and accessible; and the full production build plus visual matrix pass without weakened checks.
