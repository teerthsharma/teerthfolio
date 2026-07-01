# Igloo + Active Theory Faithful Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the rejected Antarctica/seal portfolio hero with a single polar object-world that is faithful to Igloo's physical scene language and Active Theory's dark cinematic shader language.

**Architecture:** Build a new React/R3F world under `.igloo-*` components and CSS, then swap it into `PortfolioPage`. Remove the vanilla DOM controller and update the contract so the old seal/Antarctica direction cannot pass checks.

**Tech Stack:** Next.js, React 19, Three.js, React Three Fiber, Drei, GSAP already present, plain CSS.

## Global Constraints

- Igloo defines the physical polar world: terrain, observatory object, ice/frost/graphite material, sparse edge labels.
- Active Theory defines the cinematic layer: fullscreen dark atmosphere, shader veil, restrained chrome, slow stateful motion.
- No Igloo or Active Theory proprietary assets, exact copy, audio, geometry, routes, or brand structure.
- The seal identity is infrastructure/authorship, not a cute mascot.
- No old `.antarctica-*`, `.css-seal-*`, `.world-node`, `.station-dock`, `.observatory-shader-canvas`, `autoDock`, or `drive the seal` public implementation remains.
- WebGL failure must still show a strong nonblank polar poster/fallback.
- Desktop, tablet, and mobile screenshots are required before completion is claimed.

---

## File Structure

- Create `components/ActiveTheoryVeil.jsx`: R3F shader plane and atmospheric particles.
- Create `components/IglooArtifacts.jsx`: artifact data mapping and 3D artifact meshes.
- Create `components/IglooHud.jsx`: sparse edge UI, artifact readout, quality controls, source mode.
- Create `components/IglooScene.jsx`: R3F world scene, terrain, observatory object, camera drift, artifact focus.
- Create `components/IglooWorld.jsx`: client wrapper, reduced motion, keyboard cycling, quality state.
- Modify `components/PortfolioPage.jsx`: swap world component and pass `projects`.
- Modify `app/layout.jsx`: remove `/teerth-world.js` injection and update metadata copy.
- Modify `data/teerth-content.json`: remove rejected "drive the seal" language.
- Modify `scripts/check-teerth.mjs`: make the new direction contractual and ban old world artifacts.
- Modify `app/globals.css`: remove old world CSS namespaces and add `.igloo-*` styles.
- Delete `public/teerth-world.js` and `public/assets/antarctic-seal.svg`.

## Task 1: Contract And Integration Boundary

**Files:**
- Modify: `scripts/check-teerth.mjs`
- Modify: `components/PortfolioPage.jsx`
- Modify: `app/layout.jsx`
- Modify: `data/teerth-content.json`
- Delete: `public/teerth-world.js`
- Delete: `public/assets/antarctic-seal.svg`

**Interfaces:**
- Produces: public shell expects `IglooWorld({ content, liveSummary, projects, stations })`.
- Produces: contract requires `.igloo-world`, `.igloo-scene`, `.igloo-artifact`, `.igloo-hud`, and `.active-theory-veil`.

- [ ] Step 1: Update the public shell to import `IglooWorld` and pass `projects`.
- [ ] Step 2: Remove the vanilla `/teerth-world.js` script from `app/layout.jsx`.
- [ ] Step 3: Update metadata to "Teerth Sharma - Seal Topology Observatory" with polar observatory and cinematic shader language.
- [ ] Step 4: Delete `public/teerth-world.js` and `public/assets/antarctic-seal.svg`.
- [ ] Step 5: Rewrite `scripts/check-teerth.mjs` assertions so old world names are banned and new Igloo/Active Theory files are required.
- [ ] Step 6: Run `npm run check:teerth`.
- Expected before Task 2: it fails because new components/CSS do not exist yet.

## Task 2: Igloo World Component Scaffold

**Files:**
- Create: `components/IglooWorld.jsx`
- Create: `components/IglooHud.jsx`
- Create: `components/IglooReducedMotion.jsx` if needed.

**Interfaces:**
- Consumes: `content.profile`, `liveSummary`, `projects`, `stations`.
- Produces: `activeArtifact`, `setActiveArtifact`, `quality`, `setQuality`, keyboard artifact cycling.

- [ ] Step 1: Implement `useReducedMotion()` with `window.matchMedia("(prefers-reduced-motion: reduce)")`.
- [ ] Step 2: Define `iglooArtifacts` from station/project data with ids: `observatory-plaque`, `s2-kernel-core`, `manifold-reactor`, `field-chamber-coils`, `qpu-ice-bridge`, `upstream-radio-mast`, `topology-archive-wall`, `assembly-tool-locker`.
- [ ] Step 3: Add keyboard left/right cycling and number-key artifact selection.
- [ ] Step 4: Render `IglooScene` for motion-enabled users and a nonblank fallback poster for reduced motion.
- [ ] Step 5: Render `IglooHud` with top-right `Work`, `Archive`, `Contact`, active artifact copy, source mode, and quality controls.

## Task 3: R3F Scene And Active Theory Veil

**Files:**
- Create: `components/IglooScene.jsx`
- Create: `components/IglooArtifacts.jsx`
- Create: `components/ActiveTheoryVeil.jsx`

**Interfaces:**
- Consumes: `artifacts`, `activeArtifactId`, `onSelectArtifact`, `quality`, `reduced`.
- Produces: R3F `Canvas` scene with `.igloo-scene` class and clickable artifacts.

- [ ] Step 1: Build a terrain group: ice shelf plane, distant ridge meshes, fog, snow/pressure particles.
- [ ] Step 2: Build a fractured observatory dome from repeated block meshes around a half sphere, with a glowing S2 core.
- [ ] Step 3: Build physical artifacts as unique meshes around the observatory.
- [ ] Step 4: Add `ActiveTheoryVeil`: fullscreen shader plane, dark gradient, scan/fog distortion, and low-frequency time uniform.
- [ ] Step 5: Add camera drift and artifact focus interpolation with `useFrame`.
- [ ] Step 6: Make artifact meshes clickable and keyboard state visible through active material/emissive changes.
- [ ] Step 7: Add WebGL fallback loading text that is sparse and non-card.

## Task 4: CSS Replacement

**Files:**
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `.igloo-world`, `.igloo-hud`, `.igloo-artifact-readout`, `.active-theory-veil`, `.igloo-fallback`.
- Produces: no public `.antarctica-*`, `.css-seal-*`, `.world-node`, `.station-dock`, `.observatory-shader-canvas`, or "Shader restart" CSS.

- [ ] Step 1: Remove all old world CSS blocks for `.antarctica-*`, `.world-*` hero controls, `.css-seal-*`, `.seal-*`, `.topology-plate`, `.station-dock`, `.observatory-shader-canvas`.
- [ ] Step 2: Add `.igloo-world` fullscreen base with black/graphite background, pale ice gradients, and no card hero.
- [ ] Step 3: Add `.igloo-hud` edge chrome, top-right nav, source readout, active artifact label, quality controls.
- [ ] Step 4: Add mobile styles for 375x667 where the observatory remains visible and readout does not bury it.
- [ ] Step 5: Add reduced-motion styles for static fallback.

## Task 5: Verification Loop

**Files:**
- Use: `verification/screenshots-igloo-active-theory/**`

**Interfaces:**
- Consumes: running local app at `http://127.0.0.1:5173/`.
- Produces: screenshots and metric results.

- [ ] Step 1: Run `npm run check:teerth`.
- [ ] Step 2: Run `npm run lint`.
- [ ] Step 3: Run `npm run build`.
- [ ] Step 4: Capture browser screenshots at `1440x900`, `768x1024`, and `375x667`.
- [ ] Step 5: Verify canvas/WebGL nonblank pixels.
- [ ] Step 6: Verify central observatory visible, active artifact readable, no text overlap, and old seal/Antarctica selectors absent.
- [ ] Step 7: Fix visual failures and rerun screenshots until the first viewport reads as Igloo + Active Theory faithful.

## Self-Review

- Spec coverage: Igloo physical world, Active Theory cinematic layer, edge UI, project artifacts, reduced motion, verification, and old-world removal all map to tasks.
- Placeholder scan: no TBD/TODO/fill-in steps remain.
- Type consistency: `IglooWorld`, `IglooScene`, `IglooArtifacts`, `IglooHud`, and `ActiveTheoryVeil` are the only new public component names used across tasks.
