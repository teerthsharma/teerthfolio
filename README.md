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

### The quality ladder

The ladder picks a tier by measuring the frame, and it controls content as well
as resolution — falling a tier costs the distant geography, the tunnel arch, the
drift detail and two thirds of the dome's masonry, not just sharpness. That is
why its four behaviours are all about deciding carefully rather than quickly.

| Behaviour | What it does | Measured |
| --- | --- | --- |
| Step down | Samples 90 frames or 2600ms, whichever comes first, and steps when the median is over the tier's ceiling | Sustained 20x CPU throttling reaches `low` in 18.9s |
| Confirm | A median within 5ms of the ceiling asks for a second window 1.4s later and steps only if both agree | An 8x stall across one window takes the tier without this, keeps it with |
| Re-check | A healthy window re-arms 24s later instead of concluding | 30s healthy then sustained throttling steps down at 21.3s; previously stranded forever |
| Restore | Once per session, steps back up when the tier above is predicted to hold | Busy at load then clearing: `high→medium→low`, then `low→medium` at 55s |

The frame-count bound matters because a window counted only in frames runs
90/fps seconds and so gets longer exactly as the machine gets worse — 1.5s at
60fps but 10s at 9fps. The wall-clock bound is what keeps the rescue fast for the
machines that need rescuing.

Restore predicts from this machine's own history rather than a constant: the cost
recorded on arrival at the tier above, scaled by how much the current tier has
improved since. It is capped at one per session, so the worst case is a single
up-and-down cycle. On integrated graphics it correctly never fires — `high`
measured 28.9ms against a 19ms ceiling, and no amount of idle time changes that.

`check-polar-rescue` pins every one of these.

### Known: the first visit freezes for about four seconds

A cold visit composes the world in 527ms after the entry click, and then stops
for about 3.9 seconds at t+3s. This is measured, understood, and not fixed.

It is one program link. `polar-biome-world-solid` takes 2,570ms to link on a
cold GPU program cache, and the terrain cannot draw until it does. Warm visits
never see it, because Chrome caches the linked program — so it lands only on
first-time visitors, which is exactly who it should not land on.

Everything cheap has been tried and measured:

**Read the attempt table below with a caveat that was found after it was
written.** Chrome's `--disable-gpu-program-cache` does not make a run cold: ANGLE
translates GLSL through HLSL to D3D bytecode and Windows caches the result
system-wide, outside any browser profile. After enough runs on one machine the
links become free — `probe:shader-blame` on this machine now reports 0 blocking
links and 0ms blocked, against 6,905ms earlier the same day, with no code change
between. The figures below were taken as that cache warmed, so the differences
between rows are not safely attributable to the changes in them. Reproducing any
of this needs the machine's D3D shader cache cleared, not just a fresh profile.

| Attempt | Result |
| --- | --- |
| Admitting sky and terrain a bucket apart | 5.4s → 3.9s measured, but see the caveat above; shipped because two links sharing a frame is worth avoiding regardless |
| `gl.compileAsync` in the warmup | No change. three.js resolves the link synchronously at first use |
| Warming before the bucket that draws it | Same size, moved into first paint, more total stall |
| Deleting the 3x3 Worley loop | 6%. There is no hot spot to remove |

Two ways out were offered here before either was thought through, and one of
them does not work.

Specialising the biome program per quality tier, the way `BIOME_ROLE_SKY`
specialises it per role, cannot help. The world opens at `high` — the tier is a
`deviceMemory` guess made before a frame exists, and the measured ladder only
steps down afterwards — so the expensive program is compiled at the top tier
whatever the tiers below it contain. Worse, the shader policy budgets two
compiled programs; a per-tier define makes the tier a third axis, so every step
down would compile a *new* program and add a link stall where there is currently
none. It would trade one freeze for several.

That leaves the honest one. Holding the loading bridge until the terrain program
has linked replaces the freeze with a progress state, at the cost of taking
time-to-world from 0.5s to roughly 4.5s. It is not taken here, because the
requirement this branch was built against is that the igloo renders in under two
seconds, and it does: the freeze arrives after the world is on screen, so the
current behaviour satisfies that requirement and the alternative does not. A
frozen world does look worse than a loading screen, so this is worth revisiting
if the priority ever changes — but it is a change of priority, not a fix.

A third option exists but is larger than it first appears. The entry screen is
dead time the driver could be using: counted directly, **1 of 77 WebGL programs
exist before the visitor clicks**, and the other 76 are created after. Moving the
terrain link into that window would hide it from anyone who reads for longer than
the link takes, and cost nothing to anyone who clicks immediately.

It is not a matter of rendering one frame behind the splash, which is what this
section said before the count was taken. `IglooScene` is a dynamic import gated
on `gpuStageMounted`, so before entry there is no world canvas at all — the
measurement above reports `no canvas`, and the single program belongs to the
splash's own surface. Doing this means mounting the GPU stage during the entry
screen: fetching the chunk, building the scene graph and drawing a frame, all
while the splash animates. That is a real change with a real cost to the entry
screen, not a free win.

It is also unverifiable here. This machine's shader cache is warm, so the
difference it would make is no longer observable — shipping it would mean
shipping a change whose effect cannot be measured, and reporting it as a fix
would be reporting a warm cache as a result.

### What is known about phones, and what is not

No measurement here comes from real mobile hardware. Playwright emulates the
viewport, the device pixel ratio and touch, but the drawing is still done by this
desktop's GPU, so a frame rate measured that way is not a phone's frame rate and
is not quoted as one. CPU throttling is the usual stand-in for a phone's
processor and it is used below on that understanding: it models a slower main
thread, not a slower GPU.

What the emulation does establish is how much work a phone is asked to do, which
is a property of the viewport and the tier tables rather than of the hardware.

| Case | Result |
| --- | --- |
| 390x844, CPU 4x | settles on `high`, never steps, buffer 585x1266 = 0.74 Mpx |
| 390x844, CPU 20x | `high→medium` at 10s, `medium→low` at 20s, buffer 292x633 = 0.18 Mpx |

A phone reaching the top tier is not a mistake. `high` clamps the device pixel
ratio at 1.5, so a 390pt viewport asks for 0.74 Mpx — the same pixel count this
desktop draws at its `low` tier. The fill work is comparable; whether a phone's
GPU holds it is a question about that GPU, and if it does not, the ladder steps
down exactly as it does here.

The second row shows the ladder's boundary. It trades resolution, which helps a
frame limited by fill. Under 20x CPU throttling the frame stays at 41.5ms even
after dropping to 0.18 Mpx — a quarter of the pixels — because the bottleneck is
the main thread and no amount of resolution buys it back. A device that is CPU
bound is not something this ladder can rescue.

### Read every frame number with its tier

The quality ladder is a resolution ladder: at a 1440x900 window the drawing
buffer is 1.3 Mpx at `high`, 1.05 Mpx at `medium` and 0.73 Mpx at `low`. Frame
time tracks pixel count almost exactly — 1.8x fewer pixels buys 1.76x the frame
rate — so the world is fill-bound and the tier is the only lever that moves it
much. Ablated at locked `high` on integrated graphics, no single pass dominates:
dome 5.6ms, grade chain 4.6ms, ground sheet 3.9ms, sky 1.6ms, against a 28.6ms
frame.

Measured across all eight stations at tier `medium`, docking at each the way a
visitor does, the presented frame runs 13.5-15.0ms — 67 to 74fps with a 1.5ms
spread, GPU time 6.4-7.6ms. The world is uniformly fast rather than fast where
you happen to spawn, and every station's median sits clear of medium's 21ms
step-down ceiling, so arriving at a building cannot cost the visitor the tier.

Read the GPU column, not the presented one, when comparing two runs. An earlier
sweep of the same eight stations read 15.8-17.7ms presented against 6.4-7.5ms
GPU: the GPU cost did not move, and the presented frame did, because the machine
was busier. Presented frame is what a visitor feels and GPU time is what the code
controls.

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
