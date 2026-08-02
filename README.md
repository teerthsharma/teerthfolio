# Seal's Topology Land

Teerth Sharma's portfolio is a WebGL-first polar research world: a bright anime-soft Antarctic observatory, a WASD-piloted functional seal guide, topology stations, live GitHub radar, and source-backed project evidence.

The site is built to stay Vercel-hostable while still feeling like an object-world rather than a normal resume page. The first screen gates the heavy renderer, then the user can enter the world and move through stations for Seal OS, Aether-Lang, fixed-point field physics, QPU verification, upstream work, topology archives, and systems tooling.

## Direction

The shipped contract is a bright anime-soft polar field, an Abeto-style fullscreen stream, a Junni-style functional guide, Bruno-style spatial navigation, a depth-aware ink/quantization finish, and unchanged safe/evidence fallbacks.

- Abeto Messenger style: broad ivory, teal, and cyan field masses delivered as an in-place fullscreen WebGL world stream.
- Bruno Simon style: WASD and station-tap exploration through physical space, with the horizontal evidence index still directly reachable.
- Junni style: the seal is a five-state functional guide, not decoration.
- Anime-soft finish: one depth-aware fullscreen pass provides bounded pixel fog, edge AA, quantization, indigo ink, dither, and a restrained vignette.
- Wodniack/Rogier/Gregory style: dense technical archive and sparse project indexing.

The observatory dome studies Igloo Inc.'s material and construction language. Its block topology, shaders, interaction, and assets are original to this repository; no Igloo Inc. production asset is copied. The bounded semantic particle system adapts transferable mathematical ideas from Cortiz's `cortiz2894/hologram-particles` study with user-supplied author permission and explicit credit; WebGPU/TSL source and GLB assets are not copied into the production WebGL renderer. The compatibility record lives in `docs/research/2026-07-12-hologram-particles-webgl-port.md`.

## Grand System Plan

This repository is the operating plan for a private, high-ambition portfolio: one that reads as Seal's Topology Land first, then reveals Teerth Sharma through source-backed systems work. The site should feel like a serious Antarctic research object-world, not a template with effects added on top.

### North Star

The first screen must communicate a controlled render system:

- A lightweight Antarctic shader gate loads immediately.
- `Start exploring` is the user gesture that requests browser rendering privileges where available, probes WebGL, and only then mounts the heavy world.
- The dome is the central physical object: a polar science station, not a decorative icon.
- The seal is the guide and input body: it moves with WASD, docks at project stations, and makes topology visible through motion.
- Every technical claim must connect to project evidence, live GitHub radar, or the mined repository corpus.

### Website Design Language

The visual system has four layers:

1. **Object-world:** one memorable polar object per view. On the first screen this is the dome; in the world it is the dome plus the seal; in the archive it is the black-hole/topology wall.
2. **Anime-soft polar atmosphere:** bright, low-noise ivory and teal masses finished by bounded depth pixel fog, edge ink, quantization, and a maximum eight-percent vignette.
3. **Research instrumentation:** sparse labels, station rails, source radar, and proof snippets. Text should read like field instrumentation, not marketing copy.
4. **Evidence index:** projects, commits, repos, and upstream work must remain inspectable even if WebGL is unavailable or low-quality mode is selected.

The world palette stays bright and technical: polar ivory, glacier white, Abeto teal, dawn cyan, and indigo anime ink. Saturated magenta, violet, yellow, mint, and coral remain station-scale evidence accents rather than full-screen washes.

### Render System Architecture

The render stack is split into four bounded modes:

| Mode | Purpose | Budget |
| --- | --- | --- |
| `safe` | First paint, shader splash, diagnostics, no heavy world | raw WebGL quad, capped DPR, 30 fps |
| `probe` | User clicked Start exploring, WebGL scene compiling | low quality, diagnostics visible |
| `webgl` | Full R3F world after first rendered frame | bounded terrain/window, quality controls |
| `fallback` | Honest degraded state when GPU path fails | source index remains readable |

The key rule: public UI may only claim the world is active after the first rendered WebGL frame. A context existing is not enough. This prevents the site from lying when the GPU is compiling, blocked, or unstable.

### Systems Design Rules

- **Bound the world logically, not visually.** The world can feel infinite, but only a finite render window exists near the current axis position.
- **Separate intent from render state.** User input requests motion; scene readiness confirms rendering; diagnostics record failures.
- **One user gesture owns browser access.** `Start exploring` is responsible for fullscreen, wake lock, WebGL probing, and renderer activation. No automatic heavy permission-like behavior should happen on page load.
- **Best-of-two navigation.** The world loads in-place like Abeto: the document does not advance the hero while the renderer compiles. Bruno-style exploration owns station travel, while the horizontal Work/Archive axis remains a readable evidence fallback.
- **Render quality is a control loop.** Low, medium, and high quality change DPR, object counts, snow, terrain chunks, and shader pressure.
- **No unbounded per-frame allocation.** Materials, geometries, textures, and shader programs must be shared, memoized, or disposed.
- **Every expensive subsystem needs a QA kill switch.** Debug query flags must be able to disable dome, veil, terrain, signals, smashables, snow, topology, seal, and artifacts independently.
- **Verification must sample pixels.** DOM attributes alone do not prove GL works; canvas sampling and screenshots are required.

### Component Boundaries

| Boundary | Owns | Must not own |
| --- | --- | --- |
| `IglooWorld` | render gate, safe/probe/webgl state, input model, station selection | mesh geometry, shader internals |
| `SdfSealSplash` | user gesture, browser rendering access, safe diagnostics | heavy world scene |
| `AntarcticSplashShader` | lightweight raw WebGL background for the gate | station state, R3F scene objects |
| `IglooScene` | R3F canvas, camera, lights, scene composition | safe-mode policy |
| `PolarObservatoryDome` | PBR dome object and impact behavior | global input or route state |
| `SealAvatar` | mascot form, guide state, station bearing | world navigation policy |
| `IglooHud` | readable instrumentation and controls | render lifecycle decisions |
| `EvidenceArchive` / `ProjectIndex` | source-backed readable proof | WebGL dependency |

### Interaction Model

- The page scroll axis is horizontal for evidence sections, not for the primary world loader.
- WASD moves the seal and wakes the world.
- Arrow keys do not move the seal; they teach the user to use WASD.
- Mouse does not steer the seal.
- Station taps are allowed as navigation shortcuts, especially on mobile.
- During `probe`, the open-world loading bridge must sit over the first viewport and settle away after the first WebGL frame has visibly landed.
- The seal and dome spawn separately so the dome remains a destination and the seal remains a guide.
- Collision and smashable elements may exist, but only inside active movement and bounded object counts.

### Data And Evidence Model

The site must never feel generic. Content comes from:

- `data/teerth-content.json` for profile, station copy, typography, and links.
- `data/project-intelligence.json` for mined repository evidence.
- `lib/github-live.js` for live GitHub radar with snapshot fallback.
- Station objects in `components/IglooArtifacts.jsx` for world placement and topology language.

Each station needs:

- One-line purpose.
- Source evidence.
- Repo or upstream link.
- Topology/math metaphor.
- Visual object role in the world.

### Quality Gates

Before any major visual claim is accepted:

```bash
npm run check:teerth
npm run check:render-budget
npm run check:polar-rescue
npm run verify:render
npm run lint
npm run build
```

The render verifier must cover:

- Safe gate on desktop, iPad, iPad landscape, and mobile.
- Start exploring transition from `safe` to `probe` to `webgl`.
- Shader splash canvas nonblank and contrast-bearing.
- Full WebGL canvas nonblank and not overexposed.
- WASD movement works; arrow keys only show the hint.
- Station rail and readout do not overlap on tablet and mobile.
- Project and archive sections remain readable without depending on the 3D scene.

### Implementation Roadmap

1. **Stabilize the render gate.** Keep the shader splash light, make Start exploring own browser access, and keep diagnostics readable.
2. **Upgrade the object-world.** Make the dome read as a premium Antarctic science station using warped tiles, PBR texture discipline, and controlled glow.
3. **Make the seal alive.** Improve silhouette, motion, station bearing, and bounded collision play without increasing baseline load.
4. **Expand the world through recycling.** Use repeated terrain chunks and logical station placement instead of unique infinite geometry.
5. **Deepen source personalization.** Add stronger repo-specific station evidence, upstream contribution trails, and topology hall-of-fame copy.
6. **Polish responsive composition.** Treat desktop and iPad landscape as first-class cinematic views, not scaled mobile layouts.

### Non-Negotiables

- No page may be considered complete because it merely passes build.
- No visual addition is allowed if it breaks safe mode or makes the browser unstable.
- No feature should make the site less Teerth-specific.
- No “fallback” should look like unfinished CSS art; degraded states must still look intentional.
- The private repo README is the source of truth for this plan until a separate public design document replaces it.

## Current Interaction Contract

- `Start exploring` is the user gesture for browser rendering access: fullscreen where available, wake lock where available, WebGL capability probing, then renderer activation.
- `W`, `A`, `S`, `D` are the only seal movement controls.
- Arrow keys do not move the seal; they show a WASD hint.
- Mouse input does not steer the seal.
- The station rail remains directly clickable and keyboard accessible; station taps drive the same movement and docking targets as WASD.
- Graphics quality can be switched between low, medium, and high.
- `?safe=1` boots the shader-backed safe gate first, then waits for Start exploring before probing the GPU renderer and printing diagnostics.
- `?qa-sdf=1` forces the render gate open for verification.

## Stack

- Next.js App Router
- React 19
- Three.js and React Three Fiber
- Drei
- Howler
- Local JSON research corpus and live GitHub fallback logic
- Procedural geometry, shader-space material structure, and bounded instanced buffers; the dome, seal, and semantic particles require no downloaded textures or GLBs

## Important Paths

| Path | Purpose |
| --- | --- |
| `app/` | Next.js pages and global CSS |
| `components/IglooWorld.jsx` | Top-level render gate, input model, safe mode, station state |
| `components/IglooScene.jsx` | WebGL scene orchestration |
| `components/PolarObservatoryDome.jsx` | Lattice-driven instanced crystal-brick observatory with weighted interaction |
| `components/TopologicalSealMascot.jsx` | Procedural topology seal guide with five states, breathing, glumph travel wave, eyes, and semantic halo |
| `components/PolarSemanticParticles.jsx` | One-draw bounded semantic particle/hologram field for all eight stations |
| `components/IglooArtifacts.jsx` | Project station objects |
| `data/teerth-content.json` | Profile, live copy, station copy, links |
| `data/project-intelligence.json` | Mined Teerth GitHub corpus |
| `lib/github-live.js` | Live GitHub summary with snapshot fallback |
| `lib/polar-dome-lattice.js` | Deterministic rings, cells, frames, doorway exclusion, collision, and interaction weights |
| `lib/polar-semantic-particles.js` | Station particle language, quality budgets, and shared WebGL shader math |
| `scripts/check-teerth.mjs` | Teerth content and contract checks |
| `scripts/check-render-budget.mjs` | Render budget guardrails |

## Admin Status

`/admin` is intentionally disabled for v1. The old template admin, upload APIs, editable JSON store, and unrelated maker-scene assets were removed so the release stays focused on Teerth's source-backed observatory world. Public content is driven from repository data files and the live GitHub radar.

## Local Development

```bash
npm install
npm run dev -- -H 127.0.0.1 -p 5173
```

Open:

```txt
http://127.0.0.1:5173
```

Useful debug URLs:

```txt
http://127.0.0.1:5173/?safe=1
http://127.0.0.1:5173/?qa-sdf=1
http://127.0.0.1:5173/?qa-low=1&qa-sdf=1
```

## Checks

```bash
npm run lint
npm run check:teerth
npm run check:render-budget
npm run check:polar-rescue
npm run verify:render
npm run build
```

`npm run build` runs the Teerth contract, render-budget, and polar-rescue checks before `next build`.
`npm run verify:render` starts an isolated local dev server on `127.0.0.1:5273` when needed, captures desktop, iPad, and mobile screenshots, and checks the WebGL gate plus WASD-only seal movement.

### The check/verify boundary

`check:*` scripts are browser-free and run inside `npm run build`. `verify:*`
scripts drive Playwright and must not, because a build agent has no GPU and the
readings would be meaningless. `scripts/check-ci-browser-boundary.mjs` enforces
the split and pins the membership of `verify:ci-browser`, so a browser-driven
gate cannot drift into the build chain unnoticed.

```bash
npm run verify:ci-browser
```

That is the render suite: `verify:biome-shaders` (every biome program compiles
and links), `verify:render-frame` (a 12x8 luminance grid at the home dock), and
`verify:station-frames` (a 10x6 grid at each of the eight stations, reached the
way a visitor reaches them, by selecting the station in the HUD). Run it against
a production build on `:3100`. Both frame gates take `--update` to rewrite their
reference; do that only alongside a deliberate visual change and say so in the
commit. They refuse to write a reference from a run that never reached WebGL.

Why two frame gates: `verify:render-frame` guards one camera position, which
covers the observatory and nothing else. Seven other buildings could stop
drawing and every contract in the repository would still pass — the blind spot
that let two optimisations on this branch measure large wins on a scene whose
terrain had silently broken.

## Render Evidence

Seventeen probes under `scripts/probe-*.mjs`, each answering one question and
writing to `verification/`. They are not gates and nothing runs them
automatically; they exist so a claim about performance can be checked instead of
argued.

| Question | Command |
| --- | --- |
| Where does a cold visit spend its time? | `npm run probe:render-timeline` |
| Which GL calls block, and for how long? | `npm run probe:gl-cost` |
| Which shader programs cost the link time? | `npm run probe:link-timeline`, `probe:shader-blame` |
| What does each subsystem cost per frame? | `npm run probe:gpu-time`, `probe:frame-ablation` |
| Is the cost CPU or GPU? | `npm run probe:cpu-frame`, `probe:stall` |
| How many times is each pixel shaded? | `npm run probe:overdraw`, `probe:fill-calibration` |
| Are frames evenly paced, or just fast on average? | `npm run probe:pacing` |
| What do the CSS compositing layers cost? | `npm run probe:blur-surfaces`, `probe:composite` |
| How does each station look and cost? | `npm run probe:station-survey`, `probe:station-contrast`, `probe:station-frame-cost` |
| Does the mascot read against the snow? | `npm run probe:mascot-contrast` |

### Read every frame number with its tier

The quality ladder is a resolution ladder: at a 1440x900 window the drawing
buffer is 1.3 Mpx at `high`, 1.05 Mpx at `medium` and 0.73 Mpx at `low`. Frame
time tracks pixel count almost exactly — 1.8x fewer pixels buys 1.76x the frame
rate — so the world is fill-bound and the tier is the only lever that moves it
much. Ablated at locked `high` on integrated graphics, no single pass dominates:
dome 5.6ms, grade chain 4.6ms, ground sheet 3.9ms, sky 1.6ms, against a 28.6ms
frame.

That is why the ladder exists and why `probe:*` and both frame gates pin a tier
before they measure. A frame rate quoted without its tier says nothing, and two
runs that settled on different tiers are not comparable — which happened once
and made an ambient change look like a regression.

Two rules these probes were built the hard way to satisfy, both worth keeping:

**Use real Chrome.** Every probe launches `channel: "chrome", headless: false`.
Playwright's bundled Chromium software-rasters, which reported a 40x regression
that did not exist.

**Measure in pairs.** A nine-case run of `probe:gpu-time` drifted 2.5ms from
first case to last as the machine warmed, which is larger than most of what it
measures. Each case is now taken immediately after its own fresh baseline,
against a null-control pair that must read 0.00ms, and the first pair is
discarded because browser warm-up puts several milliseconds into it.

## Deployment

This repository is ready for Vercel through GitHub. The GitHub workflows live in `.github/workflows`.

Required GitHub Actions secrets for automated Vercel deploys:

```txt
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
```

If those secrets are missing, CI can still pass while deploy is skipped.

## Asset Notes

The hero dome, topology seal, and semantic particle language are generated from authored geometry and shader math. Donor-study GLBs and the `donotcommit/` research checkout must never be staged. Any legacy PBR files under `public/assets/pbr` remain optional for non-hero surfaces; production must not depend on unlicensed or ignored local assets. Generated build folders, logs, local uploads, and verification screenshots are ignored.

## Performance Rules

- Keep world rendering bounded around the current axis position.
- Do not allocate infinite geometry for the open world.
- Prefer repeated chunks and instanced/simple geometry over large unique meshes.
- Keep safe mode cheap enough to mount before probing WebGL.
- Treat WASD input as the only seal movement source.
