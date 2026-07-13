# One-Hour Award-Quality Rescue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce an award-submission-quality bright anime-soft Three.js object world whose gate, ground, camera, seal, HUD, and eight station monuments are visually authored enough to outperform the cited reference set while remaining production-safe.

**Architecture:** Keep `lib/polar-traversal.js` as the single semantic authority and `lib/polar-station-world.js` as the canonical XZ world schema. Render each station through the existing split mechanism layer, but give every station a distinct silhouette, material response, interaction, and local biome field. Use explicit quality/reduced-motion modes and evidence/archive fallbacks rather than allowing visual work to bypass safety contracts.

**Tech Stack:** Next.js 16, React 19, Three.js, React Three Fiber, WebGL shaders, Playwright verifiers, Node static contracts, Vercel.

## Global Constraints

- Do not remove the safe gate, WASD movement, quality/render modes, evidence archive, verifier scripts, reduced-motion path, keyboard/mobile access, or Vercel deployability.
- Do not weaken a verifier to obtain green output.
- Keep canonical traversal in stable XZ coordinates; apply fisheye/curvature only in render space.
- Keep all public GitHub requests bound to the hard-coded portfolio handle `teerthsharma`; show an honest fallback.
- Preserve the seal's permanent breathing and five functional states.
- Avoid downloaded seal/building assets; use authored topology, procedural geometry, instancing, and licensed mathematical techniques.
- Give snow, ice, glass, metal, fabric/fur, and signal materials different optical behavior, not hue swaps.
- Every building must look high-poly even when its runtime geometry is economical: use curved or compound silhouettes, bevel-driven highlights, smooth/weighted normals, real thickness, layered shells, instanced micro-detail, shader-computed surface structure, and convincing contact. Flat boxes, untouched primitives, and visible faceting fail.
- Keep the palette bright anime-soft with dark anchors; reject full-screen red/purple/blue washes and clipped snow.
- Do not commit during the shared one-hour rescue; the controller will review the complete dirty worktree first.
- Keep the Node server off and defer test/browser execution through Waves B–D. Wave E designs the complete verification specification; final execution happens only after Wave F so particles are included in proof.

## One-hour execution waves

| Window | Parallel lanes | Exit gate |
| --- | --- | --- |
| Wave B | Tasks 2, 4, 5, 6 | Every region/building has mature personality, distinct local shader, high-poly appearance, and local-world composition |
| Wave C | Task 3 plus Task 11 | Opening theme is chosen against Wave B personalities; igloo lattice, entrance, vertices, normals, collision, and interaction weights are mathematically sound |
| Wave D | Task 12 | Igloo is assembled brick-by-brick on the lattice and receives repo-derived pixel/displacement/crystal shading |
| Wave E | Task 13 | Complete functional, visual, performance, accessibility, and production test specification is frozen while the server remains off |
| Wave F | Task 14 | Bounded repo-derived particles/holograms are added to every station as semantic state, not generic decoration |
| Final proof | Tasks 7–10 | Full Wave E specification runs after Wave F; debugger is clean; only then publish |

## File ownership map

| Lane | Exclusive files during its task |
| --- | --- |
| State/HUD | `lib/polar-traversal.js`, `components/IglooWorld.jsx`, `components/IglooHud.jsx`, HUD/traversal checks |
| Ground/color | `components/PolarBiomeWorld.jsx`, `lib/polar-biome-fields.js`, `components/IglooTerrain.jsx`, biome/color checks |
| Gate | `components/AntarcticSplashShader.jsx`, `components/SdfSealSplash.jsx`, gate-only CSS selectors/checks |
| NE monuments | `components/PolarStationMechanismsNE.jsx`, `lib/polar-station-mechanisms.js`, NE checks |
| SW monuments | `components/PolarStationMechanismsSW.jsx`, `lib/polar-station-mechanisms-sw.js`, SW checks |
| Plaque/seal/camera | `components/TopologicalSealMascot.jsx`, `lib/seal-manifold.js`, `lib/polar-camera-composition.js`, `lib/polar-station-world.js`, focused checks |
| Igloo lattice (Wave C) | `lib/polar-dome-lattice.js`, skeleton-facing portions of `components/PolarObservatoryDome.jsx`, lattice checks (written now, run in Wave E) |
| Igloo finish (Wave D) | brick/material/interaction portions of `components/PolarObservatoryDome.jsx`, dome crystal shader modules, Wave D evidence notes |
| Particles (Wave F) | new bounded particle/hologram modules, station integration points after B–D owners finish |
| Integration | `components/IglooScene.jsx`, `components/RetroCinematicPostProcess.jsx`, `components/PolarStationMechanismLayer.jsx`, `lib/polar-station-world.js`, `lib/github-live.js`, `components/LiveRadar.jsx`, package/check wiring |

---

### Task 1: Canonical Travel, HUD Truth, and Rail Synchronization

**Agent skills:** investigator, superpowers:systematic-debugging, superpowers:test-driven-development, junni-mascot-guide, bruno-open-world-navigation.

**Files:**
- Modify: `lib/polar-traversal.js`
- Modify: `components/IglooWorld.jsx`
- Modify: `components/IglooHud.jsx`
- Modify: `scripts/check-polar-traversal.mjs`
- Modify: `scripts/check-hud-accessibility.mjs`
- Test: `scripts/verify-hud-accessibility.mjs`

**Interfaces:**
- Consumes: canonical `positionXZ`, `velocityXZ`, station coordinates, selected destination.
- Produces: one presentation snapshot with `destinationId`, `dockedStationId`, `nearestStationId`, `phase`, `progress`, and `isArrived`.

- [ ] **Step 1: Reproduce the reported QPU/Plaque mismatch**

Run the app at QPU and capture the screenshot where the QPU monument is centered while the card, route title, selected rail item, and radar still say Plaque. Record every consumer that disagrees.

- [ ] **Step 2: Write the failing semantic contract**

Add assertions equivalent to:

```js
assert.equal(enRoute.destinationId, "qpu-ice-bridge");
assert.equal(enRoute.dockedStationId, "observatory-plaque");
assert.equal(enRoute.phase, "moving");
assert.equal(arrived.destinationId, "qpu-ice-bridge");
assert.equal(arrived.dockedStationId, "qpu-ice-bridge");
assert.equal(arrived.phase, "arrived");
```

Run: `node scripts/check-polar-traversal.mjs && node scripts/check-hud-accessibility.mjs`

Expected RED: at least one consumer still derives Plaque directly from stale `activeArtifact` or selection mutates focus before arrival.

- [ ] **Step 3: Implement one derived presentation snapshot**

Create or complete a pure selector with this shape:

```js
export function deriveTraversalPresentation(snapshot, stations) {
  return {
    destinationId: snapshot.destinationId,
    dockedStationId: snapshot.dockedStationId,
    nearestStationId: snapshot.nearestStationId,
    phase: snapshot.phase,
    progress: snapshot.progress,
    isArrived: snapshot.phase === "arrived",
  };
}
```

Feed the same snapshot to HUD, station rail, radar, camera intent, and seal halo. Show `EN ROUTE → QPU` before arrival without presenting QPU evidence as docked.

- [ ] **Step 4: Center the selected station rail item**

On destination/arrival change, scroll the active rail button into the nearest centered position using reduced-motion-aware behavior. Preserve keyboard focus.

- [ ] **Step 5: Make the black-hole transition explicit**

Reproduce the current source path where `activeArtifactId === "topology-archive-wall"` immediately sets `blackHoleActive`. Replace that proximity/active-station side effect with explicit intent: arriving at Topology may expose a seal-guided “Launch into the archive?” bubble, but the portal opens only after a confirm action. Provide cancel/dismiss, preserve direct Archive access, and never force Tooling/Assembly navigation through the portal.

Add a contract equivalent to:

```js
assert.equal(nearTopology.blackHoleActive, false);
assert.equal(nearTopology.portalOfferVisible, true);
assert.equal(confirmArchiveLaunch.blackHoleActive, true);
assert.equal(selectTooling.blackHoleActive, false);
```

- [ ] **Step 6: Verify travel, arrival, return, portal intent, and mobile**

Run:

```powershell
node scripts/check-polar-traversal.mjs
node scripts/check-hud-accessibility.mjs
node scripts/verify-hud-accessibility.mjs
```

Expected GREEN: every semantic consumer agrees at moving/docking/arrival boundaries; Plaque return restores the dome.

### Task 2: Modern Antarctic Ground, Palette, and Local Biome Fields

**Agent skills:** investigator, uplifting-webgl-colors, active-theory-cinematic-shader, igloo-antarctic-object-world, anti-slop, superpowers:test-driven-development.

**Files:**
- Modify: `components/PolarBiomeWorld.jsx`
- Modify: `lib/polar-biome-fields.js`
- Modify: `components/IglooTerrain.jsx`
- Modify: `scripts/check-polar-biome-world.mjs`
- Modify: `scripts/check-polar-color-continuity.mjs`
- Test: `scripts/verify-polar-biome-visuals.mjs`

**Interfaces:**
- Consumes: avatar XZ, nearest/destination station, quality tier, reduced motion.
- Produces: neutral polar base plus clamped local station influence.

- [ ] **Step 1: Capture the reported QPU ground failure**

Use the supplied frame as RED evidence: purple high-frequency facets dominate, the right highlight clips, and QPU influence floods the full scene.

- [ ] **Step 2: Add failing field and color assertions**

Require every station field to define `centerXZ`, `radius`, `falloff`, `accent`, `shadow`, and `weatherVector`; assert combined influence is clamped and black/highlight ratios remain bounded.

Run: `node scripts/check-polar-biome-world.mjs && node scripts/check-polar-color-continuity.mjs`

- [ ] **Step 3: Rebuild macro/micro terrain hierarchy**

Use two or three low-frequency drift/path signals for macro form. Compress micro noise below hero contrast. Blend stations by normalized XZ distance and keep a neutral warm polar base.

Implement the invariant:

```js
const influence = smoothstep(radius, radius * falloff, distanceXZ);
const total = Math.min(1, localInfluences.reduce((sum, value) => sum + value, 0));
```

- [ ] **Step 4: Finalize palette**

Use warm off-white snow, cool cyan/lavender shadows, navy anchors, and small local coral/yellow/green/magenta accents. Reduce global magenta contamination, retain snow detail, and separate horizon with atmosphere rather than gray fog.

- [ ] **Step 5: Verify five representative stations**

Capture Plaque, S2, QPU, Topology, and Assembly at 1440×900 plus QPU mobile. Expected GREEN: no clipped focal highlight, no full-screen station wash, ground remains subordinate, and runtime has zero shader errors.

### Task 3: Premium Fullscreen Render Gate

**Agent skills:** investigator, igloo-antarctic-object-world, junni-mascot-guide, uplifting-webgl-colors, anti-slop, superpowers:test-driven-development.

**Files:**
- Modify: `components/AntarcticSplashShader.jsx`
- Modify: `components/SdfSealSplash.jsx`
- Modify: splash-specific selectors in `app/globals.css`
- Create or modify: `scripts/check-polar-gate.mjs`

**Interfaces:**
- Preserve: existing safe-gate callbacks and `Start Exploring` contract.
- Produce: truthful loading state, memorable dome/seal composition, accessible CTA.

- [ ] **Step 1: Add a failing gate contract**

Assert the gate preserves safe mode, reduced motion, a real loading/status region, one primary action, keyboard activation, and no timer-only fake completion.

- [ ] **Step 2: Redesign the frame**

Replace the pale teal poster hierarchy with one physical polar place: foreground snow/contact, midground procedural dome and seal, background atmosphere. Reduce headline competition, remove pasted memo-card clutter, and make the CTA part of the route into the world.

- [ ] **Step 3: Author desktop/mobile/reduced-motion layouts**

Keep the focal dome/seal visible at 1440×900 and 390×844. Under reduced motion, preserve state changes without idle camera/field oscillation.

- [ ] **Step 4: Verify**

Run the gate check, lint the two components, and capture settled desktop/mobile frames with zero shader/runtime errors.

### Task 4: S2, Aether, Field, and QPU — Four Distinct NE Monuments

**Agent skills:** igloo-antarctic-object-world, active-theory-cinematic-shader, uplifting-webgl-colors, extract-repo-math, frontend-extreme-loop, superpowers:test-driven-development.

**Files:**
- Modify: `components/PolarStationMechanismsNE.jsx`
- Modify: `lib/polar-station-mechanisms.js`
- Modify: `scripts/check-polar-station-mechanisms-ne.mjs`
- Test: `scripts/verify-polar-station-mechanisms.mjs`

**Interfaces:**
- Consume: station transform/state, source-backed evidence readiness, quality tier.
- Preserve: shared instanced resources and mechanism diagnostics.

- [ ] **Step 1: Write silhouette/material/interaction contracts**

Require each station to expose a different physical function:

```js
{
  "s2-kernel-core": ["split kernel shell", "state planes", "interrupt pulse"],
  "manifold-reactor": ["sister loop manifold", "persistent cycle", "phase beads"],
  "field-chamber-coils": ["contained field chamber", "coil compression", "flux skin"],
  "qpu-ice-bridge": ["stepped coherence span", "paired endpoints", "verification beam"]
}
```

Assert each family has its own geometry pool, material signature, state motion, and local interaction. Hue-only variation fails.

- [ ] **Step 2: Make S2 and Aether sister buildings**

Share a mature design grammar—contained core, readable frame, layered computation—but invert topology: S2 is a disciplined cobalt kernel citadel that closes state inward; Aether is a violet translucent manifold sanctuary that circulates phase outward. Give both real support/contact and remove generic planet/ring silhouettes.

- [ ] **Step 3: Rebuild Field and QPU**

Give Field an amber/mint contained-field laboratory with a chamber boundary and compressed coil field. Give QPU a jade/cyan coherence causeway with paired verification sanctums—a traversable architectural span, not floating rings/plates. Use bounded Fresnel/noise/wrapped diffuse math from the local hologram research without copying WebGPU-only code or assets.

- [ ] **Step 4: Add meaningful interaction**

Drive one state-specific response from proximity/hover: kernel interrupt, phase filtration, coil compression, or coherence verification. Preserve mass and return with spring damping.

- [ ] **Step 5: Verify all four**

Run NE checks and capture HUD-hidden settled/interaction frames. Each silhouette must remain distinguishable in grayscale thumbnail and must read as a compound, high-finish architectural object rather than low-poly primitives.

### Task 5: Upstream, Topology, and Assembly — Three Distinct SW Monuments

**Agent skills:** igloo-antarctic-object-world, active-theory-cinematic-shader, uplifting-webgl-colors, anti-slop, frontend-extreme-loop, superpowers:test-driven-development.

**Files:**
- Modify: `components/PolarStationMechanismsSW.jsx`
- Modify: `lib/polar-station-mechanisms-sw.js`
- Modify: `scripts/check-polar-station-mechanisms-sw.mjs`
- Test: `scripts/verify-polar-station-mechanisms.mjs`

- [ ] **Step 1: Write distinct-function contracts**

Require:

```js
{
  "upstream-radio-mast": ["bearing dish", "source packet", "signal rings"],
  "topology-archive-wall": ["archive wall", "persistent trace", "category reconfiguration"],
  "assembly-tool-locker": ["gantry", "inspection backplane", "proof/tool mass"]
}
```

- [ ] **Step 2: Replace repeated primitive reads**

Build coherent architectural masses with support/contact and detail hierarchy. Make Upstream a coral signal harbor/satellite tower that is airy and directional; Topology a magenta relational archive canyon/wall; and Assembly a warm ochre/steel tool yard with heavy gantry and inspection mass.

- [ ] **Step 3: Differentiate optical response**

Use signal emission and metallic bearing for Upstream, translucent relational surfaces for Topology, and matte metal/proof light for Assembly. Local station color may amplify near the monument but must not tint the whole world.

- [ ] **Step 4: Connect real evidence state**

Drive packet/pulse, topology category, and inspection proof only from supplied GitHub/project data. Keep fallback honest.

- [ ] **Step 5: Verify all three**

Run SW checks and capture HUD-hidden desktop/mobile frames plus one interaction state per monument. Reject any building that still reads as a doorframe, poles, disks, or boxes without a layered high-poly appearance.

### Task 6: Plaque Dome, Seal Locomotion, XZ Composition, and Collision

**Agent skills:** igloo-antarctic-object-world, junni-mascot-guide, bruno-open-world-navigation, discover-topology, webgl-smoothness, superpowers:test-driven-development.

**Files:**
- Modify: `components/TopologicalSealMascot.jsx`
- Modify: `lib/seal-manifold.js`
- Modify: `lib/polar-camera-composition.js`
- Modify: `lib/polar-station-world.js`
- Modify: focused dome/seal/camera checks

- [ ] **Step 1: Contract distinct XZ layout and local camera**

Assert all station pairs have meaningful XZ separation and different approach azimuths. At a settled station show one hero, one route lead, and at most one distant promise; never the whole map.

- [ ] **Step 2: Define the dome collision and camera handoff**

Keep dome rendering untouched for the sequential Wave C/D owners. Define the stable world-space collision boundary, doorway approach, camera safe volume, and seal docking pose that `polar-dome-lattice.js` must satisfy. Collision must prevent the seal entering the shell while preserving a reachable entrance.

- [ ] **Step 3: Add seal travel wave**

Preserve permanent breathing. Layer a front-to-back glumph wave, small lift, and gaze/halo change from canonical speed and station state. Give Aether a violet-gold halo and QPU a jade-gold halo as a restrained “holy seal” visual joke; keep the halo semantic and elegant, not cartoon text. Clamp traversal near 3–4 world metres/second and prevent double smoothing.

- [ ] **Step 4: Implement render-space fisheye/local reveal**

Use camera composition and bounded post distortion to create circular-world presence without corrupting XZ collision/docking. Raise the seal slightly during travel and settle continuously.

- [ ] **Step 5: Verify**

Capture Plaque idle/touch/collision/return, one travel midpoint, all eight settled camera frames, and mobile routing. Run dome, seal, camera, and traversal checks.

### Task 11: Wave C — Opening Theme and Mathematical Igloo Lattice

**Agent skills:** superpowers:brainstorming, superpowers:writing-plans, active-theory-cinematic-shader, igloo-antarctic-object-world, discover-topology, discover-systems-theory.

**Files:**
- Consume Task 3 opening-theme decision and implementation
- Create: `lib/polar-dome-lattice.js`
- Modify: skeleton/lattice-facing portions of `components/PolarObservatoryDome.jsx`
- Create: `scripts/check-polar-dome-lattice.mjs` (write in Wave C, execute in Wave E)

**Interfaces:**
- Produces: deterministic dome rings, brick cells, doorway exclusion, tangent frames, outward normals, collision shell, interaction weights, and quality-tier counts.
- Preserves: Task 6 world-space collision/camera handoff and existing dome public props.

- [ ] **Step 1: Compare opening themes against Wave B regions**

Task 3 must compare at least three openings: luminous observatory stream, seal-guided polar signal arrival, and crystalline topology field. Score each against the eight region personalities, first-10-second comprehension, mobile composition, safe-gate truth, and originality. Select one theme and record the decision before implementation.

- [ ] **Step 2: Define the dome lattice contract**

Use a hemisphere parameterization with staggered latitude rings. For each cell produce:

```js
{
  ringIndex,
  cellIndex,
  position,
  tangent,
  bitangent,
  normal,
  scale,
  weight,
  doorwayExcluded
}
```

Derive azimuth count from ring circumference so cells keep a consistent apparent width. Offset alternate rings by half a cell. Exclude cells whose projected center/extent intersects the arched doorway volume.

- [ ] **Step 3: Build a crystalline structural skeleton**

Create stable radial ribs, ring seams, doorway arch, base compression ring, and outer collision shell from shared mathematical parameters. Keep the skeleton visually inspectable without final bricks. No decorative particles in Wave C.

- [ ] **Step 4: Define interaction and collision weights**

Compute each cell's cursor-response weight from angular/geodesic distance, structural support, and ring mass. Lower/base cells remain heavy; crown cells flex more. Return uses a critically damped or near-critically damped spring. Ensure the seal cannot cross the shell outside the doorway.

- [ ] **Step 5: Write deferred Wave E checks**

Write assertions for deterministic counts, unit/outward normals, tangent orthogonality, no doorway overlap, no duplicate cells, collision continuity, bounded displacement weights, and low/medium/high tier budgets. Do not run them until Wave E.

### Task 12: Wave D — Brick-by-Brick Crystal Dome and Pixel Finish

**Agent skills:** active-theory-cinematic-shader, igloo-antarctic-object-world, extract-repo-math, discover-topology, anti-slop.

**Files:**
- Consume: `lib/polar-dome-lattice.js`
- Modify: brick/material/interaction portions of `components/PolarObservatoryDome.jsx`
- Create or modify: focused dome shader module(s)
- Consume read-only: `donotcommit/hologram-particles/`

**Interfaces:**
- Consumes deterministic lattice cells from Task 11.
- Produces one instanced brick shell, arched entrance, high-poly optical read, cursor displacement, and quality-tiered shader profile.

- [ ] **Step 1: Extract only transferable repo math**

Read the local repo license/README and the actual particle/hologram shader sources. Port concepts—not WebGPU-only syntax or copied assets—to current Three.js WebGL: surface sampling, wrapped diffuse, low-pass fractal displacement, dual-normal blending, cursor force, spring return, displacement glow, Fresnel containment, and deform/morph/reform phase logic.

- [ ] **Step 2: Place every brick on the Wave C lattice**

Use one or a bounded number of instanced draws. Align every brick to its tangent frame; give it softened bevel geometry, thickness, joint spacing, slight deterministic scale/rotation variation, and stable contact at the base/doorway. No flat texture pretending to be bricks.

- [ ] **Step 3: Build the high-poly crystal illusion**

Combine smooth macro displacement with restrained frost microstructure, recomputed or blended normals, warm/cool wrapped light, edge Fresnel, internal cyan depth, and weight-aware cursor deformation. Bricks must read as individual crystalline blocks and as one coherent dome.

- [ ] **Step 4: Add pixel-level cinematic finish**

Use shader-space detail and bounded post hooks for stable antialiasing, subtle dither/quantization, distant depth pixelation/fog, and hand-drawn edge signal. Do not add generic particles yet; that is Wave F. Keep post removable and preserve a strong raw dome.

- [ ] **Step 5: Record Wave E proof requirements**

Record exact expected captures: raw shell, final medium/high, doorway, touch, weighted return sequence, collision, mobile, reduced motion, and draw/program/texture counts. Do not start the Node server or execute tests in Wave D.

### Task 13: Wave E — Complete Verification Specification

**Agent skills:** investigator, superpowers:systematic-debugging, superpowers:writing-plans, codex-security:validation only for actual candidate security findings, superpowers:verification-before-completion.

**Files:**
- Create: `docs/superpowers/specs/2026-07-12-wave-e-verification-spec.md`
- Create: `.verification/wave-e/manifest.json`
- Modify: focused verifier scripts only to add missing coverage; never weaken thresholds

- [ ] **Step 1: Derive the requirement ledger**

Map every explicit requirement in the goal, this plan, and the user's reported screenshots to authoritative evidence. Mark functional state, visual still-frame, motion, interaction, performance, accessibility, fallback, mobile, live data, build/deploy, and source/license requirements separately.

- [ ] **Step 2: Define the capture and trace matrix**

Specify gate desktop/mobile; all eight stations HUD-on/HUD-off; grayscale silhouettes; Plaque/QPU/Assembly mobile; every station approach/dock/arrival; portal offer/cancel/confirm; archive direct path; dome raw/final/touch/return/collision; quality tiers; reduced motion; safe fallback; offscreen suspension; particle tiers; and ten-minute soak.

- [ ] **Step 3: Define objective visual checks**

For every building require silhouette/compound form, high-poly illusion, material specificity, contact/scale, local-region personality, and Bruno-style local-world composition. Define pixel checks for clipping, banding, black voids, global tint contamination, edge crawl, temporal shimmer, UI overlap, and focal hierarchy.

- [ ] **Step 4: Define commands and expected outputs**

List every static check, lint/build command, production server command, browser verifier, runtime metric, accessibility audit, and GitHub live/fallback trace. Keep the Node server off while writing the specification.

- [ ] **Step 5: Freeze the spec before Wave F**

Wave F may add implementation and tests required by this specification, but may not weaken the spec. Final execution of the full matrix occurs only after Wave F.

### Task 14: Wave F — Semantic Particle and Hologram Language

**Agent skills:** extract-repo-math, active-theory-cinematic-shader, uplifting-webgl-colors, igloo-antarctic-object-world, webgl-smoothness, investigator.

**Files:**
- Consume read-only: `donotcommit/hologram-particles/`
- Create: bounded shared WebGL particle/hologram module(s)
- Modify: station integration points only after their Wave B owners finish
- Modify: Wave E verifier scripts only to add particle coverage

**Interfaces:**
- Consumes canonical station phase/proximity, quality tier, reduced motion, local material palette, and source-backed state.
- Produces instanced/GPU-driven particles with bounded counts, shared programs, deterministic fallback, and station-specific semantics.

- [ ] **Step 1: Verify source and compatibility**

Record license, attribution, source files, transferable formulas, and incompatibilities between Three.js r182 WebGPU/TSL and this app's Three.js r178 R3F/WebGL. Do not copy GLB assets or paste incompatible TSL.

- [ ] **Step 2: Build one shared bounded engine**

Port surface sampling, per-particle velocity/offset, cursor pusher, spring-damper return, wrapped diffuse, fractal displacement, displacement glow, and Fresnel containment to shared WebGL buffers/uniforms. Use explicit low/medium/high counts and zero or static motion under reduced motion.

- [ ] **Step 3: Give every region semantic particles**

Use one meaningful particle behavior per station: frost-memory motes at Plaque, interrupted state sparks at S2, circulating phase beads at Aether, compressed flux dust at Field, coherence packets across QPU, directional source pulses at Upstream, relational trace points at Topology, and inspection/proof fragments at Assembly. Particle color, direction, density, and response follow local state; no generic snow/confetti overlay.

- [ ] **Step 4: Integrate dome pixels without duplication**

Reuse Wave D math/modules where appropriate. Do not create a second competing cursor simulation, glow pipeline, or noise implementation.

- [ ] **Step 5: Hand off to final proof**

Record program/draw/texture deltas, count ceilings, reduced-motion behavior, suspension behavior, and station state mapping. Then start final Tasks 7–10 and run the frozen Wave E specification.

### Task 7: Solo Integrated Investigator — Smoothness, Post, Live Data, and Pixel Audit

**Agent skills:** investigator, superpowers:systematic-debugging, webgl-smoothness, anti-slop, active-theory-cinematic-shader, superpowers:test-driven-development.

**Files:** Read the whole repo; edit only the smallest root-cause files named in the report after checking task ownership has ended.

- [ ] **Step 1: Freeze the integrated build and reproduce**

Record URL, commit/worktree state, browser, viewport, DPR, quality tier, console/page/shader errors, network failures, draw/program/texture counts, and frame-time samples.

- [ ] **Step 2: Audit every prior complaint**

Check QPU/Plaque semantics, rail centering, Plaque return/dome remount, teleport/glue movement, seal breathing/wave/region halo, XZ layout, whole-map camera, gate quality, all eight monument silhouettes/materials/personalities, ground clipping/noise, global color wash, GitHub `teerthsharma` identity, archive/safe/reduced-motion/mobile paths, explicit portal intent, portal/offscreen suspension, and post duplication. Explicitly compare the world-navigation read against the Bruno law: a static frame must show a character exploring one local place, not the complete map with stations scattered like game props. Reject any monument whose economical mesh still looks visibly low-poly, flat-sided, thin, primitive-built, or differentiated mainly by color.

- [ ] **Step 3: Produce a ranked root-cause report**

For every Critical/Important issue, cite file/line, reproducible action, exact pixel/state symptom, root cause, smallest fix, and covering verifier.

Use a five-criterion visual validation rubric for every settled building: silhouette/compound form, surface continuity/high-poly illusion, material specificity, contact/scale, and local-world composition. A building must pass all five; average score cannot hide one failed category.

- [ ] **Step 4: Apply only confirmed fixes**

Write a failing focused contract for each functional fix. Make one variable change at a time. Re-capture the exact frame after each visual fix.

- [ ] **Step 5: Finalize global color and post**

Tune post only after raw frames pass. Keep chromatic AA, depth pixel/fog, dither/quantization, Gaussian edge line, scanline, fisheye, and vignette subtle, modular, and quality-tiered. Remove duplicate CSS/shader treatments.

### Task 8: Integrated Production Proof and Independent Review

**Agent skills:** superpowers:verification-before-completion, superpowers:requesting-code-review, investigator.

**Files:**
- Modify: `package.json` only for missing check wiring
- Modify: stale verifier expectations only when production code proves the new contract
- Create: `.verification/one-hour-rescue/report.json`

- [ ] **Step 1: Run focused static checks**

```powershell
node scripts/check-polar-traversal.mjs
node scripts/check-hud-accessibility.mjs
node scripts/check-polar-biome-world.mjs
node scripts/check-polar-color-continuity.mjs
node scripts/check-polar-station-mechanisms-ne.mjs
node scripts/check-polar-station-mechanisms-sw.mjs
node scripts/check-dome-crystal-material.mjs
node scripts/check-polar-camera-composition.mjs
node scripts/check-gpu-lifecycle.mjs
npm run lint
```

- [ ] **Step 2: Run the clean production build**

Run: `npm run build`

Expected: exit 0 with no missing module, hydration, shader, or verifier failure.

- [ ] **Step 3: Capture the evidence matrix**

Capture gate desktop/mobile; all eight stations desktop; Plaque/QPU/Assembly mobile; travel/docking/arrival; dome touch/collision; reduced motion; low/medium/high; portal suspension; archive/fallback.

Include HUD-hidden grayscale thumbnails for all eight monuments and an anonymized contact sheet. The award claim fails if any building remains identifiable mainly by color or text rather than silhouette and material behavior.

- [ ] **Step 4: Run an independent review**

Give a fresh reviewer the plan, current diff, before/after frames, and report. Require separate spec-compliance and quality verdicts. Fix Critical/Important findings and re-review.

- [ ] **Step 5: Make the award claim honestly**

Do not call the goal complete unless the current frames no longer show the reported structural defects and the production evidence proves every preserved contract. If the hour ends first, report exact achieved work and remaining named gaps without claiming perfection.

### Task 9: Post-Production Debugger

**Agent skills:** investigator, superpowers:systematic-debugging, superpowers:test-driven-development, superpowers:verification-before-completion.

**Files:** Read-only first. Edit only a confirmed smallest root-cause file after Task 8 produces its frozen production evidence.

- [ ] **Step 1: Re-open the frozen production build**

Use a fresh browser profile and capture console, page errors, first-party network failures, shader diagnostics, WebGL context events, frame-time samples, and geometry/material/texture counts.

- [ ] **Step 2: Re-run the highest-risk traces**

Exercise gate → Plaque → QPU → Assembly → Plaque, archive return, portal suspension, reduced motion, low quality, mobile routing, and GitHub fallback. Compare every semantic label, camera, visible hero, seal halo/state, and evidence payload at each boundary.

- [ ] **Step 3: Produce a final incident verdict**

Return either `CLEAN` with direct evidence or a ranked Critical/Important/Minor report with reproduction, root cause, and covering test. Do not call a screenshot preference a runtime bug.

- [ ] **Step 4: Fix only confirmed blockers**

For a Critical/Important defect, write the failing focused contract, patch the source, rerun the exact trace, rerun the production build, and update the frozen evidence report.

### Task 10: Verified GitHub Publication

**Agent skills:** github:yeet, superpowers:finishing-a-development-branch, superpowers:verification-before-completion.

**Files:** Git index, current `codex/open-world-loading-navigation` branch, configured `origin`.

- [ ] **Step 1: Confirm publish authority and scope**

Verify `git status`, `git diff --stat`, remote URL, active branch, and that no unrelated user files or `donotcommit/` assets will be staged.

- [ ] **Step 2: Require proof before staging**

Require Task 8 GREEN evidence and Task 9 `CLEAN`. If either is absent, do not push.

- [ ] **Step 3: Stage intentional rescue files**

Use explicit paths rather than `git add -A`. Review the staged diff for secrets, generated browser profiles, large artifacts, and unintended source assets.

- [ ] **Step 4: Commit and push**

```powershell
git commit -m "feat: complete anime-soft polar object-world rescue"
git push -u origin codex/open-world-loading-navigation
```

- [ ] **Step 5: Verify remote state**

Use `gh` to confirm the remote branch SHA and CI/check status. If a PR already exists, report its URL and checks; otherwise create a PR only when requested or already part of the repository workflow.
