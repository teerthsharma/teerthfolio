# Seal's Topology Land

Teerth Sharma's portfolio is a WebGL-first polar research world: a dark Antarctic observatory, a WASD-piloted seal mascot, topology stations, live GitHub radar, and source-backed project evidence.

The site is built to stay Vercel-hostable while still feeling like an object-world rather than a normal resume page. The first screen gates the heavy renderer, then the user can enter the world and move through stations for Seal OS, Aether-Lang, fixed-point field physics, QPU verification, upstream work, topology archives, and systems tooling.

## Direction

- Igloo/Active Theory style: cinematic object-world, dark shader atmosphere, PBR material language, minimal interface.
- Bruno Simon style: WASD exploration through a world instead of page-only scrolling.
- Junni style: mascot as guide, not decoration.
- Wodniack/Rogier/Gregory style: dense technical archive and sparse project indexing.

## Grand System Plan

This repository is the operating plan for a private, high-ambition portfolio: one that reads as Seal's Topology Land first, then reveals Teerth Sharma through source-backed systems work. The site should feel like a serious Antarctic research object-world, not a template with effects added on top.

### North Star

The first screen must communicate a controlled render system:

- A dark Antarctic shader gate loads immediately.
- `Start exploring` is the user gesture that requests browser rendering privileges where available, probes WebGL, and only then mounts the heavy world.
- The dome is the central physical object: a polar science station, not a decorative icon.
- The seal is the guide and input body: it moves with WASD, docks at project stations, and makes topology visible through motion.
- Every technical claim must connect to project evidence, live GitHub radar, or the mined repository corpus.

### Website Design Language

The visual system has four layers:

1. **Object-world:** one memorable polar object per view. On the first screen this is the dome; in the world it is the dome plus the seal; in the archive it is the black-hole/topology wall.
2. **Cinematic shader atmosphere:** dark, low-noise, scanline-free enough to stay premium, with shader motion used as depth rather than decoration.
3. **Research instrumentation:** sparse labels, station rails, source radar, and proof snippets. Text should read like field instrumentation, not marketing copy.
4. **Evidence index:** projects, commits, repos, and upstream work must remain inspectable even if WebGL is unavailable or low-quality mode is selected.

The palette stays cold and technical: black water, deep teal, icy white, muted cyan, and occasional violet for topology/QPU accents. Bright cyan is a signal color, not the whole brand.

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

- The page scroll axis is horizontal.
- WASD moves the seal and wakes the world.
- Arrow keys do not move the seal; they teach the user to use WASD.
- Mouse does not steer the seal.
- Station taps are allowed as navigation shortcuts, especially on mobile.
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
- The station rail is a passive readout. The active station follows the seal's axis position.
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
- PBR texture assets under `public/assets/pbr`

## Important Paths

| Path | Purpose |
| --- | --- |
| `app/` | Next.js pages and global CSS |
| `components/IglooWorld.jsx` | Top-level render gate, input model, safe mode, station state |
| `components/IglooScene.jsx` | WebGL scene orchestration |
| `components/PolarObservatoryDome.jsx` | PBR Antarctic science dome with bounded curved tile geometry |
| `components/SealAvatar.jsx` | Seal guide mascot |
| `components/IglooTerrain.jsx` | Repeating polar floor and terrain window |
| `components/IglooArtifacts.jsx` | Project station objects |
| `data/teerth-content.json` | Profile, live copy, station copy, links |
| `data/project-intelligence.json` | Mined Teerth GitHub corpus |
| `lib/github-live.js` | Live GitHub summary with snapshot fallback |
| `public/assets/pbr/` | Ground, dome, and seal material textures |
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
npm run verify:render
npm run build
```

`npm run build` runs the Teerth contract and render-budget checks before `next build`.
`npm run verify:render` starts an isolated local dev server on `127.0.0.1:5273` when needed, captures desktop, iPad, and mobile screenshots, and checks the WebGL gate plus WASD-only seal movement.

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

The PBR textures in `public/assets/pbr` are committed because the dome, floor, and seal material language depends on them. Generated build folders, logs, local uploads, and verification screenshots are ignored.

## Performance Rules

- Keep world rendering bounded around the current axis position.
- Do not allocate infinite geometry for the open world.
- Prefer repeated chunks and instanced/simple geometry over large unique meshes.
- Keep safe mode cheap enough to mount before probing WebGL.
- Treat WASD input as the only seal movement source.
