# Systems Render Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Optimize the current Seal's Topology Land website as a stable bounded frontend system before adding any new feature. The site should stop overloading Chrome, preserve the current visual direction, keep the dome/seal/world intact, and make performance predictable on desktop, iPad, and mobile.

**Architecture:** Treat the site as a closed-loop render system with explicit budgets: input gate, renderer activation, moving-world simulation, static object-world display, atmosphere canvas, R3F scene, PBR assets, DOM overlays, and QA validation. Use systems theory to reduce uncontrolled feedback loops, remove redundant allocations, cap active work by state, and keep visual fidelity inside a finite render window over a larger logical world.

**Tech Stack:** Next.js app in `C:\Users\seal\Desktop\teerth-peak-frontend-portfolio\site`, React, Three.js, React Three Fiber, Drei, CSS modules/global CSS, Node scripts, npm build/lint/check commands.

## Global Constraints

- Do not add user-facing features, stations, project copy, new sections, social links, or new visual concepts.
- Do not add npm dependencies.
- Preserve the gated renderer behavior in `C:\Users\seal\Desktop\teerth-peak-frontend-portfolio\site\components\IglooWorld.jsx`.
- Preserve `?safe=1`, `?qa-low=1`, `?qa-sdf=1`, and existing `qa-no-*` debug flags.
- Preserve the current seal, dome, black-hole transition, archive, station index, live radar, and evidence data.
- Optimize only by bounding work, sharing resources, reducing overdraw/allocation, improving responsive budgets, and making validation stricter.
- Keep Vercel deployability. No native binaries, no Blender runtime dependency, no filesystem runtime reads from the browser.
- The current local folder may not be a git repository. Do not initialize git or push during this optimization pass unless the executor is explicitly working inside a cloned `Debyte404/teerthfolio` repository.
- Completion is not valid until `npm run check:teerth`, `npm run lint`, `npm run build`, and browser checks pass.

---

## Task 1: Add A Render-Budget Contract Before Further Optimization

**Purpose:** Convert the system constraints into a static contract so performance regressions are caught before browser testing.

**Files:**

- `C:\Users\seal\Desktop\teerth-peak-frontend-portfolio\site\scripts\check-render-budget.mjs`
- `C:\Users\seal\Desktop\teerth-peak-frontend-portfolio\site\package.json`

**Steps:**

- [ ] Create `scripts/check-render-budget.mjs` with this exact script:

```js
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const files = {
  world: readFileSync(join(root, "components", "IglooWorld.jsx"), "utf8"),
  scene: readFileSync(join(root, "components", "IglooScene.jsx"), "utf8"),
  dome: readFileSync(join(root, "components", "PolarObservatoryDome.jsx"), "utf8"),
  seal: readFileSync(join(root, "components", "SdfSealMascot.jsx"), "utf8"),
};

const checks = [
  {
    name: "safe mode keeps WebGL unmounted",
    file: files.world,
    pattern: /safe=1/,
  },
  {
    name: "WASD activates renderer without arrow activation",
    file: files.world,
    pattern: /WASD_KEYS\s*=\s*new Set\(\["w", "a", "s", "d"\]\)/,
  },
  {
    name: "renderer has explicit start function",
    file: files.world,
    pattern: /startExplorationRender/,
  },
  {
    name: "quality debug flag still supports low mode",
    file: files.world,
    pattern: /qa-low/,
  },
  {
    name: "debug flags can remove expensive subsystems",
    file: files.world,
    pattern: /qa-no-dome[\s\S]*qa-no-veil[\s\S]*qa-no-terrain[\s\S]*qa-no-signals[\s\S]*qa-no-smashables/,
  },
  {
    name: "world uses bounded render-window note",
    file: files.scene,
    pattern: /WORLD_RENDER_WINDOW_NOTE/,
  },
  {
    name: "terrain chunk count remains bounded",
    file: files.scene,
    pattern: /TERRAIN_CHUNK_COUNT\s*=\s*7/,
  },
  {
    name: "terrain chunk length remains finite",
    file: files.scene,
    pattern: /TERRAIN_CHUNK_LENGTH\s*=\s*24/,
  },
  {
    name: "ground PBR material set is shared",
    file: files.scene,
    pattern: /useGroundPbrMaterialSet/,
  },
  {
    name: "smashable density is quality bounded",
    file: files.scene,
    pattern: /quality === "low" \? 8 : quality === "medium" \? 12 : 18/,
  },
  {
    name: "smashables only render during active movement",
    file: files.scene,
    pattern: /renderEnabled && moving && !debugFlags\.noSmashables/,
  },
  {
    name: "dome tiles remain finite by row",
    file: files.dome,
    pattern: /DOME_TILE_COLUMNS_BY_ROW\s*=\s*\[4, 6, 8, 10, 12, 14, 16\]/,
  },
  {
    name: "seal shader remains a single SDF-style material path",
    file: files.seal,
    pattern: /shaderMaterial|ShaderMaterial/,
  },
];

let failed = false;

for (const check of checks) {
  if (!check.pattern.test(check.file)) {
    failed = true;
    console.error(`render-budget check failed: ${check.name}`);
  }
}

if (failed) {
  process.exit(1);
}

console.log(`render-budget contract passed: ${checks.length} checks`);
```

- [ ] Add a package script in `package.json`:

```json
"check:render-budget": "node scripts/check-render-budget.mjs"
```

- [ ] Update the existing `check:teerth` script only if it already aggregates checks. If it is a single script, leave it unchanged and run `npm run check:render-budget` separately.
- [ ] Run:

```powershell
npm run check:render-budget
```

- [ ] The first valid outcome is either a pass or a specific static contract failure. Fix only contract wording if it does not match current intended architecture. Do not change visuals in this task.

---

## Task 2: Bound The Non-WebGL Control Loops

**Purpose:** Stop the page from doing unlimited canvas and React work while the renderer is idle or static.

**Files:**

- `C:\Users\seal\Desktop\teerth-peak-frontend-portfolio\site\components\IglooWorld.jsx`

**Steps:**

- [ ] Add frame-budget constants near the top-level constants:

```js
const ATMOSPHERE_FRAME_MS = 1000 / 30;
const IDLE_WORLD_FRAME_MS = 1000 / 20;
const ACTIVE_WORLD_FRAME_MS = 1000 / 60;
```

- [ ] In `useAtmosphereCanvas`, replace the uncapped high-quality DPR cap with:

```js
const maxDpr = quality === "high" ? 1.25 : 1;
const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
```

- [ ] In the atmosphere animation callback, gate drawing by elapsed time:

```js
let lastFrame = 0;

const render = (time = 0) => {
  frame = requestAnimationFrame(render);

  if (time - lastFrame < ATMOSPHERE_FRAME_MS) {
    return;
  }

  lastFrame = time;
  const elapsed = time * 0.001;
  drawAtmosphereFrame(ctx, canvas, elapsed, quality, reducedMotion);
};
```

- [ ] If the current code draws inline inside `render`, extract that body into:

```js
function drawAtmosphereFrame(ctx, canvas, elapsed, quality, reducedMotion) {
  // Move the existing drawing body here without changing colors, shape counts, text, or composition.
}
```

- [ ] In the main movement loop, avoid React state churn when the world is idle. Keep refs updated every frame, but call `setAxis`, `setAxisDepth`, `setMoving`, and `setActiveStationIndex` only when the next value differs from the current rendered value.
- [ ] Use the existing `moving` and `sdfRenderEnabled` state to pick a loop cadence:

```js
const targetFrameMs = movingRef.current || sdfRenderEnabledRef.current
  ? ACTIVE_WORLD_FRAME_MS
  : IDLE_WORLD_FRAME_MS;
```

- [ ] Gate the body of the world loop by elapsed time using the same pattern as the atmosphere loop.
- [ ] Do not change input behavior. WASD still starts exploration. Arrow keys still show the existing hint.
- [ ] Run:

```powershell
npm run check:render-budget
npm run check:teerth
```

---

## Task 3: Share Terrain And Station Primitive Resources

**Purpose:** Reduce material and geometry churn in the finite world window without changing the world layout.

**Files:**

- `C:\Users\seal\Desktop\teerth-peak-frontend-portfolio\site\components\IglooScene.jsx`

**Steps:**

- [ ] Keep the existing bounded constants:

```js
const WORLD_AXIS_WIDTH = 14.8;
const TERRAIN_CHUNK_LENGTH = 24;
const TERRAIN_CHUNK_COUNT = 7;
const WORLD_RENDER_WINDOW_NOTE = "Pokemon-style bounded render window over an infinite logical polar field";
```

- [ ] Add a primitive cache hook next to `useGroundPbrMaterialSet`:

```js
function useTerrainPrimitiveCache() {
  return useMemo(() => {
    const box = new THREE.BoxGeometry(1, 1, 1);
    const cone = new THREE.ConeGeometry(0.08, 0.34, 4);
    const rail = new THREE.BoxGeometry(1, 1, 1);
    const marker = new THREE.CylinderGeometry(0.045, 0.045, 1, 10);

    const railCyan = new THREE.MeshBasicMaterial({
      color: "#58fff0",
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    });
    const railViolet = new THREE.MeshBasicMaterial({
      color: "#b4a7ff",
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    });
    const markerMaterial = new THREE.MeshBasicMaterial({
      color: "#9ff8ff",
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });

    return {
      geometries: { box, cone, rail, marker },
      materials: { railCyan, railViolet, markerMaterial },
    };
  }, []);
}
```

- [ ] Replace repeated terrain `<boxGeometry args={[...]}/>` calls in `IceAxisTerrain` with shared geometry plus `scale`.
- [ ] Replace repeated `<coneGeometry args={[0.08, 0.34, 4]}/>` calls with the shared cone geometry plus `scale`.
- [ ] Replace repeated inline rail materials with `primitiveCache.materials.railCyan` and `primitiveCache.materials.railViolet`.
- [ ] Do not reduce visible chunks below `TERRAIN_CHUNK_COUNT = 7`.
- [ ] Do not alter station positions, station order, label copy, camera position, fog color, or background color.
- [ ] Run:

```powershell
npm run check:render-budget
npm run check:teerth
```

---

## Task 4: Make The Observatory Dome Cheaper Without Changing Its Silhouette

**Purpose:** Keep the dome as the hero object while reducing CPU/GPU cost from duplicate geometries and hidden diagnostics.

**Files:**

- `C:\Users\seal\Desktop\teerth-peak-frontend-portfolio\site\components\PolarObservatoryDome.jsx`
- `C:\Users\seal\Desktop\teerth-peak-frontend-portfolio\site\components\IglooScene.jsx`

**Steps:**

- [ ] Keep `DOME_TILE_COLUMNS_BY_ROW = [4, 6, 8, 10, 12, 14, 16]`. Do not add rows or increase panel count in this optimization pass.
- [ ] In `PolarObservatoryDome.jsx`, group generated panel geometry creation behind `useMemo` keyed only by the current geometry parameters. The memo output must contain stable arrays for panels, seams, ribs, entrance segments, and plaque anchors.
- [ ] Ensure procedural PBR textures are created once per material set and not inside render loops.
- [ ] Keep panel material variation by assigning existing materials from a fixed material array instead of creating a new material per tile.
- [ ] Keep the dome entrance, dome shell, row seams, latitude rings, and plaque visible in all quality modes.
- [ ] If a diagnostic label or decorative micro-marker is not needed to understand the dome at first glance, render it only in `quality === "high"` and keep the high-quality appearance unchanged.
- [ ] Do not change the dome shape, color palette, copy, or station meaning.
- [ ] Run:

```powershell
npm run check:render-budget
npm run check:teerth
```

---

## Task 5: Keep The Seal Shader Alive But Bound Its DOM And Probe Cost

**Purpose:** Preserve the mathematical seal as the mascot while preventing labels/probes from bloating the active scene.

**Files:**

- `C:\Users\seal\Desktop\teerth-peak-frontend-portfolio\site\components\SdfSealMascot.jsx`
- `C:\Users\seal\Desktop\teerth-peak-frontend-portfolio\site\components\IglooScene.jsx`

**Steps:**

- [ ] Keep the SDF shader path. Do not replace the seal with CSS, SVG, or static image.
- [ ] Keep the existing PBR texture loading path for the seal surface.
- [ ] Add a derived boolean in `SdfSealMascot.jsx`:

```js
const showSealDiagnostics = quality === "high" && !reducedMotion;
```

- [ ] Use `showSealDiagnostics` to gate nonessential floating formula labels, probe ticks, and small HTML annotations. The body, head, flippers, eyes, outline, and movement remain visible in every quality mode where the seal is awake.
- [ ] Ensure no new `Html` nodes are created per frame.
- [ ] Keep seal spawn behavior unchanged: the seal appears after WASD/exploration activation, not on initial safe arrival.
- [ ] Run:

```powershell
npm run check:render-budget
npm run check:teerth
```

---

## Task 6: Set Device Budgets Without Adding UI

**Purpose:** Make the same site behave predictably on desktop, iPad, and mobile by choosing safer defaults while preserving manual quality controls.

**Files:**

- `C:\Users\seal\Desktop\teerth-peak-frontend-portfolio\site\components\IglooWorld.jsx`
- `C:\Users\seal\Desktop\teerth-peak-frontend-portfolio\site\app\globals.css`

**Steps:**

- [ ] Add a device-quality helper in `IglooWorld.jsx`:

```js
function getInitialRenderQuality() {
  if (typeof window === "undefined") {
    return "medium";
  }

  const params = new URLSearchParams(window.location.search);
  if (params.has("qa-low")) {
    return "low";
  }

  const memory = navigator.deviceMemory || 8;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const smallViewport = window.innerWidth < 720;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reducedMotion || smallViewport || memory <= 4) {
    return "low";
  }

  if (coarsePointer) {
    return "medium";
  }

  return "medium";
}
```

- [ ] Use `getInitialRenderQuality()` only for the initial state. Existing quality buttons still override it.
- [ ] In `globals.css`, verify overlays do not force huge paint regions on mobile. Restrict expensive blur/backdrop-filter effects to containers that need them.
- [ ] Do not add a new quality selector or onboarding copy.
- [ ] Run:

```powershell
npm run check:render-budget
npm run check:teerth
```

---

## Task 7: Validate Failure Isolation With QA Flags

**Purpose:** Prove the page can isolate expensive subsystems when Chrome becomes unstable.

**Files:**

- `C:\Users\seal\Desktop\teerth-peak-frontend-portfolio\site\components\IglooWorld.jsx`
- `C:\Users\seal\Desktop\teerth-peak-frontend-portfolio\site\components\IglooScene.jsx`

**Steps:**

- [ ] Start the dev server:

```powershell
npm run dev -- --host 127.0.0.1
```

- [ ] Verify `http://127.0.0.1:5173/?safe=1` loads without mounting the WebGL canvas.
- [ ] Verify `http://127.0.0.1:5173/?qa-sdf=1&qa-low=1&qa-no-dome=1` loads the world without the dome.
- [ ] Verify `http://127.0.0.1:5173/?qa-sdf=1&qa-low=1&qa-no-smashables=1` loads the world without smashables.
- [ ] Verify `http://127.0.0.1:5173/?qa-sdf=1&qa-low=1&qa-no-signals=1` loads the world without signal pylons.
- [ ] If any URL crashes Chrome, the failing subsystem is the first optimization target. Do not upscale graphics until that subsystem passes.
- [ ] Stop the dev server only after browser checks are complete.

---

## Task 8: Build And Browser Verification Gate

**Purpose:** Confirm the optimized system works as a portfolio page, not only as isolated code.

**Files:**

- No code files should change in this task unless a verification failure exposes a bug in earlier tasks.

**Steps:**

- [ ] Run:

```powershell
npm run check:render-budget
npm run check:teerth
npm run lint
npm run build
```

- [ ] Browser-check desktop at `1440x900`:
  - `http://127.0.0.1:5173/?safe=1`
  - `http://127.0.0.1:5173/?qa-sdf=1&qa-low=1`
  - `http://127.0.0.1:5173/`
- [ ] Browser-check iPad portrait at `768x1024`:
  - `http://127.0.0.1:5173/?safe=1`
  - `http://127.0.0.1:5173/?qa-sdf=1&qa-low=1`
- [ ] Browser-check iPad landscape at `1024x768`:
  - `http://127.0.0.1:5173/?safe=1`
  - `http://127.0.0.1:5173/?qa-sdf=1&qa-low=1`
- [ ] Browser-check mobile at `375x667`:
  - `http://127.0.0.1:5173/?safe=1`
  - `http://127.0.0.1:5173/?qa-sdf=1&qa-low=1`
- [ ] In each browser check, confirm:
  - First load does not crash Chrome.
  - Safe mode is readable.
  - SDF mode shows a nonblank canvas.
  - Text does not overlap the quality controls, station rail, live radar, or active station panel.
  - WASD starts exploration on desktop.
  - Arrow keys show the existing hint without activating exploration.
  - Quality buttons still work.
  - The dome remains visible and recognizable in normal render mode.
  - The seal remains visible after activation.
- [ ] Capture screenshots only after the page is stable for at least 10 seconds.

---

## Task 9: Final Systems Review

**Purpose:** Decide whether the current system is ready for visual upscaling later.

**Files:**

- `C:\Users\seal\Desktop\teerth-peak-frontend-portfolio\site\docs\superpowers\plans\2026-07-01-systems-render-optimization.md`

**Steps:**

- [ ] Record the final command results in the implementation notes when this plan is executed.
- [ ] Record the exact failing subsystem if any QA isolation URL crashes.
- [ ] Do not add new graphics, new physics, new stations, or new copy until this optimization plan passes.
- [ ] A valid finish state is:
  - `npm run check:render-budget` passes.
  - `npm run check:teerth` passes.
  - `npm run lint` passes.
  - `npm run build` passes.
  - Desktop, iPad, and mobile browser checks pass without Chrome crash.

## Systems-Theory Rationale

The current site behaves like an overloaded feedback system: visual ambition increases object count, object count increases GPU/CPU work, crashes trigger more visual patching, and patching increases complexity again. The optimization pass breaks that loop by defining bounded subsystems and contracts.

- **Bounded context:** A finite render window represents a larger world. The world can feel bigger later, but the renderer should never allocate an unbounded world.
- **Backpressure:** WASD activation and safe mode prevent immediate heavy WebGL work on arrival.
- **Observability:** QA flags isolate dome, seal, terrain, signals, smashables, and veil so crashes can be attributed.
- **Resource sharing:** Shared geometries/materials reduce heap churn and GPU uploads.
- **Rate limiting:** Atmosphere and idle world loops stop doing 60 FPS work when the user is not interacting.
- **Graceful degradation:** Low and medium quality reduce diagnostic/decorative cost while preserving core identity.
- **Stability before scale:** The site should become measurable and stable before adding larger open-world features.

## Execution Notes

- Added `scripts/check-render-budget.mjs` as a static stability contract and wired it into `npm run build`.
- Bounded the active terrain window to quality-aware chunks while preserving the recursive Antarctic floor material.
- Darkened the terrain material and R3F lighting budget under `SCENE_LIGHT_BUDGET = "dark-pbr-igloo"` to reduce washout and overdraw pressure.
- Kept the seal gated behind explicit wake/render activation and added snow resource cleanup on unmount.
- Verified `npm run check:render-budget`, `npm run check:teerth`, `npm run lint`, and `npm run build`.
- Browser-verified safe mode, active low mode, normal active mode, and subsystem isolation URLs with screenshots under `verification/screenshots-systems-igloo/`.
