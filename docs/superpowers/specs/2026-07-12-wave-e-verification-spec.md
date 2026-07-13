# Wave E Verification Specification — Polar Object-World Rescue

Status: **DRAFT — NOT YET FROZEN**  
Execution boundary: write and review during Wave E; execute the full matrix only after Wave F integration.  
Server boundary: the shared Node server remains off until post-Wave-F execution begins.

## 1. Release claim

The release may be described as an award-grade candidate only when the evidence in `.verification/wave-e/manifest.json` is complete, the independent visual reviewer passes every monument, the production build is green, and the post-production Investigator verdict is `CLEAN`. Passing source-string checks alone is insufficient.

The release must preserve:

- safe render gate and truthful loading state;
- WASD movement and a composed mobile route path;
- low, medium, high, contrast, reduced-motion, and safe/fallback modes;
- complete evidence/archive access without control mastery;
- canonical XZ traversal, real arrival semantics, and distinct station places;
- hard-coded public GitHub identity `teerthsharma` with honest fallback;
- Vercel compatibility and every existing verifier unless a stricter replacement is documented.

## 2. Requirement ledger

| ID | Requirement | Authoritative evidence | Failure condition |
| --- | --- | --- | --- |
| F-01 | Gate is one fullscreen polar place with dome, seal, truthful loading, and one primary CTA | gate desktop/mobile/reduced-motion captures + gate contract | poster/card collage, fake timer completion, missing safe path, or unclear CTA |
| F-02 | Canonical traversal snapshot drives destination, dock, route, rail, camera, halo, and evidence | traversal static contract + Plaque→QPU→Assembly→Plaque trace | any semantic consumer names another station |
| F-03 | Selection does not become evidence/docked state before physical arrival | en-route and arrival trace | QPU monument with Plaque card, or selected evidence before dock |
| F-04 | Rail centers destination/arrival and remains keyboard usable | desktop/mobile trace + accessibility verifier | active station offscreen, focus loss, or jump to wrong station |
| F-05 | Archive portal requires explicit confirm; Tooling/Assembly never force it | offer/cancel/confirm/direct-archive traces | proximity or station selection opens black hole |
| F-06 | Returning to Plaque restores dome and home composition | round-trip trace | missing dome, stale station, stale shader field, or remount error |
| F-07 | Seal breathes permanently and uses a front-to-back glumph travel wave without teleporting | idle/travel 60 fps clips + sampled pose trace | frozen breath, double smoothing, >0.45 m one-frame step, or route snap |
| F-08 | Seal has five functional states and semantic station halo | state contact sheet + Aether/QPU frames | decoration-only mascot, speech-heavy guidance, or non-semantic halo |
| F-09 | Eight stations occupy distinct XZ places and different approach azimuths | world schema contract + eight approach traces | collinear rail, repeated approach, overlap, or one-axis layout |
| F-10 | Camera shows one local world: hero, route lead, and at most one distant promise | eight HUD-hidden frames | whole map visible or stations read as scattered game props |
| F-11 | Every monument passes high-poly illusion and material-specific response | grayscale/HUD-hidden contact sheet + independent rubric | flat primitives, thin boxes/poles/disks, visible faceting, hue-only identity |
| F-12 | Plaque dome uses a deterministic lattice, true instanced bricks, doorway exclusion, collision, and weighted return | lattice contract + raw/final/touch/return/collision captures | texture-faked bricks, shell overlap at door, glue-through collision, or uniform wobble |
| F-13 | Ground is a calm warm polar base with bounded local biome influence | five-station and mobile captures + color contract | clipped highlight, full-screen tint, muddy high-frequency facets, or hero competition |
| F-14 | Snow, ice, glass, metal, fabric/fur, fog, and signal optics remain distinguishable without labels | close material crops + grayscale review | same shader with palette swaps |
| F-15 | Chromatic AA, depth pixel/fog, dither/quantization, edge line, scanline, fisheye, and vignette remain subtle and modular | raw/post A/B captures + post contract | obvious RGB fringe, banding, edge crawl, crushed vignette, or unreadable UI |
| F-16 | Semantic particles strengthen each region with one shared bounded engine | eight particle-state captures + particle contract | generic snow/confetti, eight duplicate programs, unbounded counts, or whole-map clutter |
| F-17 | World simulation and particles suspend when the portfolio world is offscreen/portal-hidden | lifecycle trace | RAF/GPU work continues after leaving the world |
| F-18 | GitHub radar fetches `teerthsharma` and labels live/fallback truthfully | intercepted live and forced-failure traces | another username, invented activity, or fallback labeled live |
| F-19 | Evidence archive is complete and reachable in safe/reduced-motion/mobile modes | archive matrix | missing projects or 3D-only lockout |
| F-20 | Production build, hydration, shader compilation, context lifecycle, and Vercel output are clean | clean build log + browser console/network/GPU logs | missing module, hydration warning, shader error, context loss, or ignored runtime asset |
| F-21 | Settled navigation obeys the Bruno local-world law | route/topology static contract + eight HUD-hidden frames | route exceeds `7.5 m`, more than two station promises or one connecting topology edge render, or full C8 map appears |
| F-22 | `PolarStationMechanismLayer` exclusively owns the seven non-Plaque monument visuals | mechanism-layer contract + runtime report `legacyOverlapContract` | legacy `physical-station-subject`, pedestal, surface material, point light, or interaction rig renders beneath a mechanism |
| F-23 | Mechanism telemetry is family- and tier-authoritative | low/medium/high mechanism runtime reports | NE reports anything except `12/3/0`, `12/3/0`, `4/2/0`; SW reports anything except `9/3/0`, `9/3/0`, `4/1/0` |
| F-24 | The guide gives sparse, actionable discovery hints without becoming speech-heavy | 45-second arrived/idle trace + movement/portal/offscreen suppression trace + accessibility log | hint appears before settled arrival, repeats sooner than `15 s`, fails to alternate neighboring `A`/`D` routes (tap copy on coarse pointers), remains after movement/portal/offscreen, lasts outside the authored `3.8 s` window, animates under reduced motion, blocks input, or floods announcements |
| F-25 | Opening stream, route state, evidence state, and source labels never fabricate progress | gate/load/arrival/live-fallback trace | fake timer completion, source snapshot labeled live, or loading bridge survives after scene ready |
| F-26 | Donor mathematics is adapted with attribution and renderer compatibility documented | particle/dome source-credit contract + Task 12/14 reports | copied GLB, pasted WebGPU/TSL into WebGL, missing Cortiz/Igloo credit, or undocumented license gap |
| F-27 | No previously reported crash identifier/module regression returns | clean build + console trace + targeted source contracts | missing `PolarObservatoryDome`, undefined movement setter/speed constant, uncaught ReferenceError, or blank canvas |
| F-28 | The topology world releases GPU resources after document scroll, not just behind the portal | offscreen trace + canvas/resource counters | main canvas remains mounted/drawing after release delay or seal/particles keep advancing offscreen |
| F-29 | The topology-built seal remains authored, readable, and asset-independent | seal manifold contract + face/idle/travel closeups | downloaded seal asset, absent eyes, clipped face, lost permanent breathing, or halo unrelated to nearby station |
| F-30 | Eight local regions remain bright anime-soft with dark anchors, not globally dark or PS1-flat | all-station raw contact sheet + palette/pixel audit | dominant muddy gray, global red/purple/blue wash, clipped snow, unlit facets, or color alone defining a region |

### Reported-symptom regression map

The following concrete complaints are release blockers, not subjective polish notes:

- QPU pose with Plaque readout/rail/route state → `F-02`, `F-03`.
- Assembly rail button failing to center/arrive → `F-04`.
- Tooling selection opening the black hole → `F-05`.
- Dome disappearing after returning to Plaque → `F-06`, `F-12`.
- Seal stepping several coordinates per frame or visually teleporting → `F-07`.
- S2, Aether, Field, QPU, Upstream, Topology, and Assembly exposed together as primitives → `F-10`, `F-11`, `F-21`, `F-22`.
- Purple/red noisy ground, clipped white patch, and muddy world wash → `F-13`, `F-30`.
- Basic smooth dome, fake brick texture, glue-through shell, and uniform wobble → `F-12`.
- Gate reading as a pale poster with pasted cards → `F-01`, `F-25`.
- GitHub message/profile not bound to the portfolio owner → `F-18`.
- Missing module, `AXIS_HOLD_SPEED`, and missing setter runtime failures → `F-27`.
- Topology land continuing to render after document scroll → `F-17`, `F-28`.

## 3. Monument visual rubric

Score each category `0`, `1`, or `2`. Every category must score `2`; averages cannot hide a failed category.

1. **Silhouette / compound form** — identifiable as its physical function in solid black without text or color.
2. **Surface continuity / high-poly illusion** — curved or compound mass, bevel highlights, smooth/weighted normals, real thickness, and no untouched primitive read.
3. **Material specificity** — optical behavior communicates ice, glass, metal, field, signal, or tool mass rather than a hue swap.
4. **Contact / scale** — believable footings, shadow/contact, human or seal scale cue, and no floating assembly.
5. **Local-world composition** — camera, foreground, route lead, atmosphere, terrain, and dressing form one region rather than exposing the map.

Required personality verdicts:

- Plaque — ice-home observatory and strongest focal architecture.
- S2 — disciplined cobalt kernel citadel closing state inward.
- Aether — violet translucent manifold sanctuary circulating phase outward; sister grammar with S2, not a clone.
- Field — amber/mint contained-field chamber with compressive energy.
- QPU — jade/cyan coherence causeway with paired verification sanctums.
- Upstream — coral directional signal harbor/satellite tower.
- Topology — magenta relational archive canyon/wall.
- Assembly — warm ochre/steel tool yard with heavy gantry and inspection mass.

## 4. Capture matrix

All captures use a clean production build, browser cache state recorded, browser console/network/shader errors attached, and deterministic `qa` state where available.

### Gate

- `gate-desktop-1440x900.png`
- `gate-mobile-390x844.png`
- `gate-reduced-motion-1440x900.png`
- `gate-keyboard-focus.png`
- 3-second settled gate motion trace

### Station worlds

For all eight stations:

- HUD-on settled frame at `1440×900`;
- HUD-hidden settled frame at `1440×900`;
- grayscale silhouette thumbnail;
- approach, docking, and arrived semantic snapshots;
- one interaction/ritual state;
- particle-disabled and particle-enabled A/B frames.
- local-world inventory recording visible monument promises, topology nodes/edges, and rendered route-lead length.

Additional mobile frames: Plaque, QPU, and Assembly at `390×844`.

For the seven mechanism-owned stations, record low/medium/high runtime reports and confirm the source/runtime `legacyOverlapContract`: the `IglooArtifacts` branch is a zero-opacity, `colorWrite=false`, `depthWrite=false`, `depthTest=false` navigation volume and contributes no visible subject, pedestal, station material, interaction rig, or point light.

### Traversal and intent traces

- Gate → Plaque → QPU → Assembly → Plaque.
- Plaque → Aether and Plaque → QPU halo transitions.
- Topology approach → portal offer → cancel.
- Topology approach → portal offer → confirm → archive → return.
- Direct Archive navigation without entering the world.
- Tooling/Assembly navigation without portal.
- WASD diagonal hold, reversal, and release.
- Mobile station route selection and drag/tap composition.
- 45-second arrived/idle hint cadence with announcement timestamps; repeat while moving, portal-active, and document-offscreen to prove suppression and cleanup.
- Settled local-world count at every station: at most one hero, one route lead, two station promises, two topology nodes, and one connecting topology edge.

### Dome

- lattice/skeleton only;
- raw instanced shell without post;
- medium and high final shell;
- doorway macro crop;
- cursor/touch compression;
- six-frame weighted return sequence;
- seal collision and doorway entry;
- Plaque return/remount;
- low/reduced-motion fallback;
- draw/program/texture diagnostic snapshot.

### Modes and fallbacks

- low, medium, high, and contrast at the same QPU pose;
- reduced motion at Plaque and during route selection;
- safe render fallback with archive access;
- GitHub live API response and forced failure fallback;
- portal-hidden and document-scrolled-offscreen GPU suspension.
- clean reload after each quality change to prove geometry/material disposal and program plateau.

## 5. Objective pixel checks

Apply to raw and post frames separately:

- no single station accent may wash more than `35%` of the frame outside its local influence region;
- snow highlight clipping above normalized `0.995` must remain below `1%` of non-UI pixels;
- near-black voids below normalized `0.01` must remain below `0.5%` outside intended apertures/ink;
- no one-pixel bright edge crawl or unstable RGB split across a ten-frame stationary sequence;
- no full-frame banding introduced by quantization; dither remains sub-focal at 100% scale;
- UI cannot intersect the seal face, hero silhouette, active route control, or quality controls;
- HUD-hidden grayscale frames must retain a clear focal hierarchy and station identity;
- post A/B must show improved focus/depth without becoming the source of form or hiding raw defects.
- rendered route lead must not exceed `7.5 m`; a settled frame may expose at most two station promises, two topology nodes, and one connecting topology edge;
- no visible legacy station subject may remain when `qa-no-mechanisms=1`; the station hero must disappear while the transparent navigation volume remains interactive;
- the active monument must occupy a materially larger focal region than either distant promise, and no promise may intersect the HUD readout or seal face.

## 6. Motion and traversal thresholds

- intended seal cruise speed: `3–4 world metres/second`;
- maximum ordinary one-frame displacement at 60 fps: `0.12 m`;
- no teleport step above `0.45 m` except an explicitly labeled safe reset;
- arrival cannot occur outside the station dock threshold;
- permanent breathing amplitude remains visible but below travel-lift amplitude;
- travel wave propagates front-to-back and settles without a second position filter;
- camera and seal settle monotonically enough to avoid visible rubber-banding; no repeated overshoot after `1.2 s`;
- reduced motion uses immediate or short opacity/state transitions and no idle camera/particle oscillation.
- route hints start only while arrived and idle, recur no faster than once per `15 s`, remain visible for `3.8 s`, alternate the neighboring `A`/`D` destination, and use composed tap language on coarse pointers.

## 7. Performance and lifecycle budgets

Reference desktop viewport: `1440×900`, DPR bounded by the app quality profile.

| Tier | Particle ceiling | Settled p95 frame time | Travel p95 frame time | Total draw ceiling |
| --- | ---: | ---: | ---: | ---: |
| Low | 96 | 20 ms | 25 ms | 72 |
| Medium | 224 | 25 ms | 33 ms | 104 |
| High | 448 | 33 ms | 40 ms | 144 |

Mechanism-family ceilings within those totals:

| Family | Low | Medium | High |
| --- | --- | --- | --- |
| Northeast | `4 draws / 2 programs / 0 textures` | `12 / 3 / 0` | `12 / 3 / 0` |
| Southwest | `4 draws / 1 program / 0 textures` | `9 / 3 / 0` | `9 / 3 / 0` |

Additional gates:

- semantic particles add exactly one draw and one shared shader program;
- no texture is introduced by the dome or semantic particle system;
- program count does not grow after three complete station loops;
- geometries, materials, and textures return to the same bounded plateau after portal/archive return;
- no WebGL context loss or uncaught RAF error;
- ten-minute navigation soak grows JS heap and renderer resources by less than `10%` after warm-up;
- offscreen/portal-hidden state produces no continuous world RAF and no particle time advancement;
- production first gate becomes actionable within `2.5 s` on the recorded desktop run and `5 s` on the recorded mobile emulation, excluding intentionally throttled network evidence.

## 8. Accessibility gates

- primary CTA, global nav, rail, quality controls, archive, portal confirm/cancel, and evidence links are keyboard reachable;
- focus remains visible and returns to the launcher after portal cancellation;
- active station is exposed with semantic text independent of color/3D;
- status changes use an appropriate live/status region without flooding announcements;
- reduced-motion preference is honored before the first animated frame;
- safe fallback preserves all evidence and contact access;
- contrast mode meets text/control contrast requirements and does not rely on shader output;
- mobile targets are at least `44×44 CSS px` where space permits and do not overlap system-safe areas.
- discovery hints announce no more than once per `15 s`, are dismissible/non-modal, never seize focus from movement or station controls, clear on movement/portal/offscreen, use tap language for coarse pointers, and render without transition animation under reduced motion.

## 9. Source, license, and deploy gates

- `GITHUB_HANDLE` is exactly `teerthsharma`; both API requests use that handle.
- Successful API fixtures surface `live-github`; failed/non-OK/invalid responses surface `research-snapshot` and do not invent name or public-repo counts.
- Dome/particle reports identify the exact donor files read, Cortiz/Igloo inspiration, WebGPU/TSL incompatibilities, and the WebGL concepts reimplemented. No donor GLB or binary asset may enter the staged diff.
- `donotcommit/`, browser profiles, generated screenshots, reports, and local `.vercel/` state must not be staged.
- `npm run build` is the local Vercel compatibility gate. If the configured GitHub/Vercel integration produces a preview, its deployment URL and status become mandatory publication evidence; absence of an integration must be reported rather than fabricated.

## 10. Deferred execution commands

Do not run these until Wave F integration is complete and this document is marked `FROZEN`.

Static contracts, individually and in this order:

```powershell
node scripts/check-teerth.mjs
node scripts/check-render-budget.mjs
node scripts/check-polar-gate.mjs
node scripts/check-polar-rescue.mjs
node scripts/check-hud-accessibility.mjs
node scripts/check-station-world-schema.mjs
node scripts/check-station-world-integration.mjs
node scripts/check-polar-traversal.mjs
node scripts/check-polar-camera-composition.mjs
node scripts/check-world-cadence.mjs
node scripts/check-seal-manifold.mjs
node scripts/check-polar-travel-debris.mjs
node scripts/check-polar-biome-world.mjs
node scripts/check-polar-station-mechanisms-ne.mjs
node scripts/check-polar-station-mechanisms-sw.mjs
node scripts/check-polar-station-mechanism-layer.mjs
node scripts/check-station-shader-family.mjs
node scripts/check-polar-dome-lattice.mjs
node scripts/check-dome-crystal-material.mjs
node scripts/check-dome-performance.mjs
node scripts/check-gpu-lifecycle.mjs
node scripts/check-polar-semantic-particles.mjs
node scripts/check-igloo-reference-effects.mjs
node scripts/verify-github-live-fallback.mjs
npm run lint
npm run build
```

After `npm run build` succeeds, start the production server in Terminal A and leave it attached:

```powershell
$env:PORT="3000"
npm run start
```

In Terminal B, wait until `http://127.0.0.1:3000` responds, then run the browser proofs individually:

```powershell
$env:VERIFY_RENDER_URL="http://127.0.0.1:3000"
node scripts/verify-cinematic-render.mjs
node scripts/verify-hud-accessibility.mjs
node scripts/verify-polar-biome-shader-compile.mjs
node scripts/verify-polar-biome-visuals.mjs
node scripts/check-polar-color-continuity.mjs

$env:VERIFY_QUALITY="low"
$env:VERIFY_OUTPUT_DIR="wave-e/mechanisms-low"
node scripts/verify-polar-station-mechanisms.mjs

$env:VERIFY_QUALITY="medium"
$env:VERIFY_OUTPUT_DIR="wave-e/mechanisms-medium"
node scripts/verify-polar-station-mechanisms.mjs

$env:VERIFY_QUALITY="high"
$env:VERIFY_OUTPUT_DIR="wave-e/mechanisms-high"
node scripts/verify-polar-station-mechanisms.mjs

node scripts/verify-polar-travel-debris.mjs
node scripts/verify-dome-crystal-live.mjs
node scripts/probe-dome-draw-calls.mjs
node scripts/verify-portal-gpu-suspension.mjs
node scripts/verify-polar-semantic-particles.mjs
```

`verify-polar-biome-visuals.mjs` writes `.verification/biome-live`; `check-polar-color-continuity.mjs` consumes that directory by default. The mechanism output variables are relative to `.verification/`. Clear `VERIFY_QUALITY` and `VERIFY_OUTPUT_DIR` after the three tier runs. Stop Terminal A only after every browser process has closed and all evidence files have flushed.

Every command log, exit code, browser console, network failure, shader diagnostic, capture checksum, and performance sample must be linked from the manifest. The raw/post A/B driver and ten-minute performance/soak driver remain freeze dependencies; their exact commands must be inserted before this document can become `FROZEN`.

## 11. Freeze dependencies

This draft is structurally ready but must remain `DRAFT — NOT YET FROZEN` until all rows below are resolved.

| Dependency | Owner evidence required | Freeze effect |
| --- | --- | --- |
| Task 11 Wave C | lattice report, opening-theme decision, collision/doorway contract | source report present; execution baseline remains deferred to the frozen matrix |
| Task 12 Wave D | brick/material report, raw/post capture hook, donor compatibility/credit | blocks dome and post A/B matrix |
| Task 14 Wave F | particle counts, suspension semantics, source-credit report | blocks particle and ten-minute-soak baselines |
| Family telemetry | runtime canvas reports NE `12/3/0`, SW `9/3/0`, low tier variants | blocks seven-station performance evidence |
| Performance driver | ten-minute settled/travel/resource/offscreen trace implementation | blocks lifecycle and leak sign-off |
| Raw-post switch | deterministic post-disabled capture path or verifier-owned equivalent | blocks pixel/post modularity verdict |

No dependency may be resolved by deleting a check, lowering a threshold, relabeling missing evidence as manual approval, or reusing a pre-integration screenshot.

## 12. Freeze and sign-off

Before changing status to `FROZEN`:

1. Task owners confirm B–D ownership has ended.
2. All explicit complaints and hard requirements appear in the ledger.
3. Wave F cannot lower any threshold or remove a capture.
4. The controller records the exact worktree SHA/status and spec hash.
5. A post-Wave-F Investigator executes the matrix, then an independent reviewer scores the contact sheets.
6. Publication is blocked unless production proof is green and the final debugger verdict is `CLEAN`.
