# Anime-Soft Polar Rescue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the existing WebGL-first portfolio as a bright anime-soft Antarctic object world with a functional five-state seal guide, spatial navigation, and a lightweight depth-aware hand-drawn post stack.

**Architecture:** Keep `IglooWorld` as the render/input policy boundary and `IglooScene` as the R3F boundary. Add two pure shared contracts for palette/motion and guide-state derivation, then adapt the existing scene, mascot, safe gate, HUD, and one-pass postprocessor around those contracts. A new static/behavior verifier protects the rescue requirements without weakening the existing three gates.

**Tech Stack:** Next.js 16, React 19, React Three Fiber 9, Three.js 0.178, CSS, Node assertion scripts, Playwright render verifier.

## Global Constraints

- Preserve `?safe=1`, Start exploring, WebGL probing, diagnostics, and fatal-render fallback.
- Preserve WASD-only movement, arrow-key teaching behavior, touch station routing, and the horizontal evidence/archive fallback.
- Preserve low/medium/high quality and high-contrast controls.
- Preserve reduced-motion information parity and keyboard/focus accessibility.
- Keep the project frontend-only, Vercel-hostable, and free of new runtime infrastructure or copied reference assets.
- Keep geometry bounded and perform no unbounded per-frame allocation.
- The world/safe gate must not use pure black; `evidenceMagenta #D8478F` remains archive-only.
- Default medium quality must be bright and anime-soft, not a dark VHS/CRT treatment.
- Existing verifier assertions may be extended or updated to the new exact contract, never deleted merely to pass.
- Implementation follows `docs/superpowers/specs/2026-07-11-anime-polar-rescue-design.md` exactly.

---

## File Structure

- Create `lib/polar-art-direction.js`: exact scene palette, station palette, camera, motion, and post budgets.
- Create `lib/seal-guide-state.js`: pure five-state priority function used by UI and tests.
- Create `scripts/check-polar-rescue.mjs`: behavior and source-contract gate added to `npm run build`.
- Modify `package.json`: expose `check:polar-rescue` and include it in the build gate.
- Modify `components/IglooScene.jsx`: gradient sky, camera composition, light rig, expedition scale anchor, guide-state plumbing.
- Modify `components/IglooTerrain.jsx`: clean toon snow and mountain materials.
- Modify `components/PolarObservatoryDome.jsx`: light ice faces and sides, thin indigo structure/contact, warm airlock.
- Modify `components/IglooArtifacts.jsx`: exact station colors and active physical accents.
- Modify `components/IglooWorld.jsx`: derive and publish the guide state without moving input/render policy.
- Modify `components/SealAvatar.jsx`: recognizable seal silhouette and five state-linked poses.
- Modify `components/SdfSealSplash.jsx`: lightweight seal mark and safe/probing/error state parity.
- Modify `components/RetroCinematicPostProcess.jsx`: bounded anime depth/edge/AA/quantization stack.
- Modify `components/IglooHud.jsx`: retain all affordances while reducing persistent chrome.
- Modify `app/globals.css`: bright world/safe-gate tokens and responsive HUD treatment.
- Modify `scripts/check-render-budget.mjs`: update exact material/post contracts while retaining the count/budget checks.
- Modify `scripts/verify-cinematic-render.mjs`: require a materially brighter desktop world in addition to existing bounds.
- Modify `README.md`: replace the obsolete dark-world direction with the implemented bright anime-soft contract.

---

### Task 1: Executable Art-Direction and Guide-State Contracts

**Files:**
- Create: `lib/polar-art-direction.js`
- Create: `lib/seal-guide-state.js`
- Create: `scripts/check-polar-rescue.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `POLAR_PALETTE`, `STATION_PALETTE`, `CAMERA_COMPOSITION`, `MOTION_TIMINGS`, `POST_PROCESS_BUDGET`.
- Produces: `SEAL_GUIDE_STATES` and `deriveSealGuideState({ bridgeActive, hasRenderError, moving, rendererMode, stationDistance }): SealGuideState`.
- Produces: `npm run check:polar-rescue`.

- [ ] **Step 1: Add the failing rescue gate**

Create `scripts/check-polar-rescue.mjs` so it imports the two not-yet-created modules, asserts the exact state order and palette values, and reads the integration files for required profile strings. The behavior assertions are:

```js
assert.equal(deriveSealGuideState({ hasRenderError: true, moving: true, rendererMode: "webgl", stationDistance: 1 }), "error");
assert.equal(deriveSealGuideState({ bridgeActive: true, rendererMode: "probe" }), "probing");
assert.equal(deriveSealGuideState({ moving: true, rendererMode: "webgl", stationDistance: 3.8 }), "docking");
assert.equal(deriveSealGuideState({ moving: true, rendererMode: "webgl", stationDistance: 3.81 }), "moving");
assert.equal(deriveSealGuideState({ moving: false, rendererMode: "webgl" }), "idle");
```

Add `"check:polar-rescue": "node scripts/check-polar-rescue.mjs"` to `scripts` and insert it before `next build` in the existing build command.

- [ ] **Step 2: Run the gate and verify RED**

Run: `npm run check:polar-rescue`

Expected: exit `1` with `ERR_MODULE_NOT_FOUND` for `lib/polar-art-direction.js` or `lib/seal-guide-state.js`.

- [ ] **Step 3: Add the exact palette and budgets**

Create `lib/polar-art-direction.js` with frozen objects. The key values must be literal and testable:

```js
export const POLAR_PALETTE = Object.freeze({
  polarIvory: "#F6F1E7",
  glacierWhite: "#EDF6F9",
  abetoTeal: "#65C1BC",
  dawnCyan: "#8FD0E0",
  skyMint: "#A7E5DF",
  horizonBlue: "#78C9D2",
  horizonIndigo: "#33406E",
  animeInk: "#34384F",
  animeShadow: "#71839B",
  emberAmber: "#E2B86A",
  evidenceMagenta: "#D8478F",
  kelpChartreuse: "#C4D64B",
});

export const CAMERA_COMPOSITION = Object.freeze({
  desktopFov: 39,
  portraitFov: 46,
  restHeight: 1.48,
  positionDamping: 5.5,
  lookDamping: 7,
  observatoryVisualHomeX: -2.35,
});

export const MOTION_TIMINGS = Object.freeze({
  worldRevealMs: 500,
  stationRevealMs: 200,
  stationStaggerMs: 120,
  probingPulseMs: 900,
  idleBreathMs: 2400,
  blinkMs: 120,
  dockingNodMs: 300,
  waddleHz: 2.2,
  waddleDegrees: 6,
});
```

Include all eight station surface/accent pairs and the low/medium/high post values from the design spec.

- [ ] **Step 4: Add the pure guide-state priority function**

Create `lib/seal-guide-state.js`:

```js
export const SEAL_GUIDE_STATES = Object.freeze(["idle", "probing", "moving", "docking", "error"]);

export function deriveSealGuideState({
  bridgeActive = false,
  hasRenderError = false,
  moving = false,
  rendererMode = "gated",
  stationDistance = Number.POSITIVE_INFINITY,
} = {}) {
  if (hasRenderError || rendererMode === "fallback") return "error";
  if (bridgeActive || rendererMode === "probe") return "probing";
  if (moving && stationDistance <= 3.8) return "docking";
  if (moving) return "moving";
  return "idle";
}
```

- [ ] **Step 5: Run focused and existing static gates**

Run: `npm run check:polar-rescue && npm run check:teerth && npm run check:render-budget`

Expected: all commands exit `0`; render-budget still reports its full check count.

- [ ] **Step 6: Commit the contract**

```powershell
git add package.json lib/polar-art-direction.js lib/seal-guide-state.js scripts/check-polar-rescue.mjs docs/superpowers/specs/2026-07-11-anime-polar-rescue-design.md docs/superpowers/plans/2026-07-11-anime-polar-rescue.md
git commit -m "docs: freeze anime polar rescue contract"
```

---

### Task 2: Bright Physical World and Camera Composition

**Files:**
- Modify: `components/IglooScene.jsx`
- Modify: `components/IglooTerrain.jsx`
- Modify: `components/PolarObservatoryDome.jsx`
- Modify: `components/IglooArtifacts.jsx`
- Modify: `scripts/check-polar-rescue.mjs`
- Modify: `scripts/check-render-budget.mjs`

**Interfaces:**
- Consumes: palette/camera objects from Task 1.
- Produces: `POLAR_SKY_SHADER_PROFILE`, `ANIME_TERRAIN_SHADER_PROFILE`, and the existing `SCENE_LIGHT_BUDGET` with the new physical values.

- [ ] **Step 1: Extend the gate for scene requirements**

Add source assertions for:

```js
expectIncludes("components/IglooScene.jsx", [
  "POLAR_SKY_SHADER_PROFILE",
  "ForegroundExpeditionKit",
  "CAMERA_COMPOSITION.desktopFov",
  "fogExp2",
]);
expectIncludes("components/IglooTerrain.jsx", ["ANIME_TERRAIN_SHADER_PROFILE", "MeshToonMaterial"]);
expectIncludes("components/PolarObservatoryDome.jsx", ["DOME_ANIME_ICE_PROFILE", "POLAR_PALETTE.horizonIndigo", "POLAR_PALETTE.dawnCyan"]);
```

Update only the exact render-budget expectations that encode obsolete colors/post strings; keep every count, geometry, collision, DPR, and allocation assertion.

- [ ] **Step 2: Run the gate and verify RED**

Run: `npm run check:polar-rescue`

Expected: exit `1`, naming `POLAR_SKY_SHADER_PROFILE` as missing from `components/IglooScene.jsx`.

- [ ] **Step 3: Add the gradient sky and 40 mm rest camera**

In `IglooScene.jsx`, import the Task 1 contract, set `OBSERVATORY_VISUAL_HOME_X` from it, switch Canvas FOV to `desktopFov`, and update the camera projection on portrait transitions:

```js
useEffect(() => {
  const nextFov = size.width < 900 ? CAMERA_COMPOSITION.portraitFov : CAMERA_COMPOSITION.desktopFov;
  if (camera.fov !== nextFov) {
    camera.fov = nextFov;
    camera.updateProjectionMatrix();
  }
}, [camera, size.width]);
```

Add an inward-facing sphere shader with exact zenith/middle/horizon tokens. Home framing uses rest camera height `1.48`, distance `7.2 / 8.25 / 9.8` for desktop/portrait/compact, and damping rates `5.5/7.0`. Station framing uses `6.25–6.7 / 7.85–8.35 / 9.65` by quality and breakpoint so the complete station/guide silhouette survives narrow screens.

- [ ] **Step 4: Add the physical light rig and scale anchor**

Replace the old background/fog and light literals with:

```jsx
<fogExp2 attach="fog" args={[POLAR_PALETTE.fog, 0.018]} />
<ambientLight intensity={0.34} />
<hemisphereLight color="#F8FAF2" groundColor="#71839B" intensity={0.72} />
<directionalLight castShadow color="#FFFDF7" intensity={2.15} position={[4.8, 7.2, 5.4]} />
<directionalLight color="#8FD0E0" intensity={0.72} position={[-5.4, 3.6, -4.2]} />
<pointLight color="#FFE3A8" intensity={0.68} position={[-4.2, 2.4, 3.8]} />
```

Implement `ForegroundExpeditionKit` at `[-4.1, 0.08, 3.7]` using a crate, mug, rope torus, and a soft indigo contact ellipse.

- [ ] **Step 5: Convert terrain and dome to clean anime materials**

Use one memoized 4-pixel `DataTexture` gradient for terrain `MeshToonMaterial`, set terrain color `#F6F1E7`, normal scale `(0.0025, 0.0025)`, and mountains `#A6D7E4` with shadow-side `#71839B`.

In the dome, retain the existing geometry/collision and PBR maps, but replace row/Y tinting with continuous world-`XZ` fields. Use the shared two-sample XZ noise primitive for irregular frost/cream/teal/sage/warm lobes, four low-pass vertex fBm octaves (`gain 0.35`, `lacunarity 2.0`), derivative-normal Fresnel/scattering, and tiered displacement `0 / 0.012 / 0.02`. Compile low quality to zero fragment noise and interpolated normals while preserving the same XZ palette geography. Keep side tints luminous, and restrict `#33406E` to thin ribs, the doorway inset, and one solid, geometrically thin contact disk. Airlock metal remains metalness `0.72`, roughness `0.38`. Add a warm interior light `#FFE3A8` and keep saturated station color on thin rims only.

- [ ] **Step 6: Apply exact station colors**

Replace the eight `IGLOO_ARTIFACTS` color/accent pairs with `STATION_PALETTE` values. The archive is the only station whose accent resolves to `#D8478F`.

- [ ] **Step 7: Verify scene contracts**

Run: `npm run check:polar-rescue && npm run check:render-budget && npm run lint`

Expected: all commands exit `0`, with no shader/source warning.

- [ ] **Step 8: Commit the physical world**

```powershell
git add components/IglooScene.jsx components/IglooTerrain.jsx components/PolarObservatoryDome.jsx components/IglooArtifacts.jsx scripts/check-polar-rescue.mjs scripts/check-render-budget.mjs
git commit -m "feat: rebuild the bright anime polar world"
```

---

### Task 3: Five-State Seal Guide and Safe-Gate Parity

**Files:**
- Modify: `components/IglooWorld.jsx`
- Modify: `components/IglooScene.jsx`
- Modify: `components/SealAvatar.jsx`
- Modify: `components/SdfSealSplash.jsx`
- Modify: `app/globals.css`
- Modify: `scripts/check-polar-rescue.mjs`

**Interfaces:**
- Consumes: `deriveSealGuideState`, `SEAL_GUIDE_STATES`, `MOTION_TIMINGS`.
- Produces: `data-seal-guide-state` on the world and matching `guideState` props for the R3F seal and safe gate.

- [ ] **Step 1: Add failing integration assertions**

Require `deriveSealGuideState`, `data-seal-guide-state`, `guideState={sealGuideState}`, all five literal state names in `SealAvatar.jsx`, and `.sdf-gate-seal` in the splash/CSS.

- [ ] **Step 2: Run the gate and verify RED**

Run: `npm run check:polar-rescue`

Expected: exit `1`, naming the missing `data-seal-guide-state` integration.

- [ ] **Step 3: Derive state at the policy boundary**

In `IglooWorld`, calculate loop-aware station distance from axis/depth targets, detect fatal GPU diagnostics, and call:

```js
const sealGuideState = deriveSealGuideState({
  bridgeActive: worldLoadBridgeActive,
  hasRenderError,
  moving: Math.abs(axisVelocity) + Math.abs(depthVelocity) > 0.025,
  rendererMode,
  stationDistance,
});
```

Publish it as a section data attribute and pass it through `IglooScene` and `SdfSealSplash`. Do not move key handlers, render-gate policy, or station-target refs.

- [ ] **Step 4: Rebuild the seal's visual hierarchy**

Keep the collision body and station bearing, but change the visible hierarchy: shorten the torso to scale `[0.82, 0.42, 0.48]`; enlarge/lift the head to `[0.40, 0.38, 0.38]`; lighten skin to `#AEBAB7`; use `#34384F` for outline/eyes; add an ivory muzzle and chartreuse scarf; lower faceplate/dorsal-instrument opacity below `0.16`.

Drive state pose in the existing `useFrame` without allocation:

```js
const waddle = reducedMotion || guideState !== "moving"
  ? 0
  : THREE.MathUtils.degToRad(6) * Math.sin(t * Math.PI * 2 * 2.2);
const breath = reducedMotion || guideState !== "idle"
  ? 1
  : 1 + 0.015 + Math.sin(t * Math.PI * 2 / 2.4) * 0.015;
```

Use a static `8°` probing lean, one damped docking nod, `15°` error tilt, and a `120 ms` eyelid close every deterministic `4–7 s` interval. Reduced motion uses the final pose with no oscillation.

- [ ] **Step 5: Add the lightweight gate seal**

Add `.sdf-gate-seal` markup inside `sdf-splash-art` and style it from simple ellipses/pseudo-elements. `data-guide-state` selects idle/probing/error pose and halo. Keep `role="dialog"`, the button, diagnostics, fullscreen/wake-lock/WebGL probe, and archive wording unchanged.

- [ ] **Step 6: Verify behavior and accessibility contracts**

Run: `npm run check:polar-rescue && npm run check:teerth && npm run lint`

Expected: all commands exit `0`; the five pure state cases remain green.

- [ ] **Step 7: Commit the guide**

```powershell
git add components/IglooWorld.jsx components/IglooScene.jsx components/SealAvatar.jsx components/SdfSealSplash.jsx app/globals.css scripts/check-polar-rescue.mjs
git commit -m "feat: make the seal a five-state world guide"
```

---

### Task 4: Anime Depth Postprocess and Quiet Bright HUD

**Files:**
- Modify: `components/RetroCinematicPostProcess.jsx`
- Modify: `components/IglooHud.jsx`
- Modify: `app/globals.css`
- Modify: `scripts/check-polar-rescue.mjs`
- Modify: `scripts/check-render-budget.mjs`

**Interfaces:**
- Consumes: `POST_PROCESS_BUDGET` and `POLAR_PALETTE`.
- Produces: the existing `RetroCinematicPostProcess` component with a new `GLOBAL_ANIME_POST_PROFILE` alias and unchanged mount point.

- [ ] **Step 1: Add failing post/HUD assertions**

Require `gaussianEdgeConfidence`, `depthEdgeConfidence`, `chromaticEdgeAA`, `toonQuantize`, `uFisheyeStrength`, `uScanlineStrength`, `uInkStrength`, `uGradeBase`, `uGradeCurve`, `DepthTexture`, and the exact profile text `anime-soft depth pixel fog`.

Require CSS world tokens `--polar-ivory`, `--abeto-teal`, `--anime-ink`, `--evidence-magenta`; reject `#000000`, `#010304`, `#020607`, and `#060b0c` in the world/dome/seal/post/splash files.

- [ ] **Step 2: Run the gate and verify RED**

Run: `npm run check:polar-rescue`

Expected: exit `1`, naming `gaussianEdgeConfidence` as missing.

- [ ] **Step 3: Rewrite the single fullscreen shader**

Keep the existing render target, depth texture, orthographic quad, disposal, and priority-1 `useFrame`. Implement the ordered pass from the design spec with these caps:

```js
const qualityBudget = {
  low: { scale: 0.82, fisheye: 0, chroma: 0, ink: 0.08, scanline: 0, pixel: 1.0, quantize: 0.12, gradeBase: 0.36, gradeCurve: 0.40 },
  medium: { scale: 0.94, fisheye: 0.003, chroma: 0.55, ink: 0.14, scanline: 0.004, pixel: 1.7, quantize: 0.18, gradeBase: 0.49, gradeCurve: 0.40 },
  high: { scale: 1, fisheye: 0.005, chroma: 0.8, ink: 0.18, scanline: 0.007, pixel: 2.2, quantize: 0.24, gradeBase: 0.52, gradeCurve: 0.40 },
};
```

Depth pixel fog begins at `0.54`, Gaussian luma uses nine taps, depth edge uses four taps, neighbor AA is capped at `0.18`, dither amplitude is `0.0025`, and vignette is capped at `0.08`. Chromatic offsets are multiplied by edge confidence and outer-screen mask so no free-standing RGB fringe appears. The declared final paper-grade curve uses the tiered `gradeBase` and fixed `gradeCurve`; it remains arithmetic inside this one pass, not another renderer or target.

- [ ] **Step 4: Convert HUD/safe surfaces to bright paper glass**

Add the polar tokens to `:root`. For `.igloo-world`, `.sdf-seal-splash`, `.igloo-topnav`, `.igloo-readout`, `.igloo-live-strip`, `.station-profile-rail`, and `.igloo-controls`, use polar-ivory translucent surfaces and anime-ink text. Remove the dark world pseudo-element washes; keep a maximum `8%` CSS vignette. Preserve pointer-event behavior, control dimensions, and responsive positions.

Hide no controls. Lower the live strip's visual opacity, keep one evidence signal, and limit the readout to `270×150 px` desktop.

- [ ] **Step 5: Verify shader and static budgets**

Run: `npm run check:polar-rescue && npm run check:render-budget && npm run lint`

Expected: all commands exit `0`; no obsolete post profile or banned pure-black source remains in scoped files.

- [ ] **Step 6: Commit the look**

```powershell
git add components/RetroCinematicPostProcess.jsx components/IglooHud.jsx app/globals.css scripts/check-polar-rescue.mjs scripts/check-render-budget.mjs
git commit -m "feat: add the anime depth and ink finish"
```

---

### Task 5: Rendered Quality Loop, Verifier Strengthening, and Documentation

**Files:**
- Modify: `scripts/verify-cinematic-render.mjs`
- Modify: `README.md`
- Modify: any Task 2–4 file only when a captured visual failure identifies the exact cause

**Interfaces:**
- Consumes: complete integrated world.
- Produces: fresh desktop/mobile/station/safe/reduced-motion screenshots and a stronger render contract.

- [ ] **Step 1: Add a failing brightness requirement**

For the `desktop` world case, append a failure when `canvasSample.averageLuminance < 118`. Keep the existing nonblank, tonal range, overexposure, movement, bounds, and console checks intact.

- [ ] **Step 2: Run the old visual state and verify RED or capture the new baseline**

Run: `npm run verify:render`

Expected before visual tuning: either exit `1` with desktop average luminance below `118`, or exit `0` only if Tasks 2–4 already exceed the new brightness gate. Record the numeric sample in the task report.

- [ ] **Step 3: Inspect the mandatory screenshot set**

Inspect these generated files at original resolution:

```text
verification/screenshots-cinematic-render/desktop.png
verification/screenshots-cinematic-render/mobile.png
verification/screenshots-cinematic-render/ipad.png
verification/screenshots-cinematic-render/ipad-landscape.png
verification/screenshots-cinematic-render/field-docking-desktop.png
verification/screenshots-cinematic-render/safe-gate.png
verification/screenshots-cinematic-render/reduced-motion.png
```

For each failure, name one cause before editing: camera, silhouette, material value, light separation, HUD collision, shader overstrength, or stale render.

- [ ] **Step 4: Tune only evidence-backed failures**

Allowed tuning bands are: desktop camera height `1.40–1.62`, desktop FOV `38–41°`, fog density `0.014–0.020`, post ink `0.10–0.18`, vignette `0.04–0.08`, and HUD surface alpha `0.58–0.78`. Values outside these bands require changing the design spec first.

Re-run `npm run verify:render` after each coherent tuning batch. Do not alter verifier thresholds to accommodate a worse frame.

- [ ] **Step 5: Update README to the shipped direction**

Replace dark-world wording with the exact implemented contract: bright anime-soft polar field, Abeto-style fullscreen stream, Junni-style functional guide, Bruno-style spatial navigation, depth-aware ink/quantization finish, and unchanged safe/evidence fallbacks.

- [ ] **Step 6: Run the full fresh verification suite**

Run:

```powershell
npm run lint
npm run check:teerth
npm run check:render-budget
npm run check:polar-rescue
npm run verify:render
npm run build
```

Expected: every command exits `0`; render verification reports `20 viewports`; build completes successfully.

- [ ] **Step 7: Commit the verified rescue**

```powershell
git add README.md scripts/verify-cinematic-render.mjs components app/globals.css
git commit -m "chore: verify the anime polar rescue"
```

---

## Plan Self-Review

- Spec coverage: palette, camera, lighting, physical form, five guide states, WASD/touch parity, loading, post effects, HUD restraint, safe gate, reduced motion, evidence fallback, performance, Vercel, and rendered QA each map to a task.
- Placeholder scan: the plan contains no deferred implementation marker or undefined value.
- Type consistency: `deriveSealGuideState`, `SEAL_GUIDE_STATES`, `POLAR_PALETTE`, `STATION_PALETTE`, `CAMERA_COMPOSITION`, `MOTION_TIMINGS`, and `POST_PROCESS_BUDGET` retain one spelling across all tasks.
- Scope: all work serves the current rescue goal; no unrelated archive, data, backend, or routing redesign is included.
