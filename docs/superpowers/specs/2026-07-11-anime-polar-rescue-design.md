# Anime-Soft Polar Object World Design

**Status:** Approved for implementation by the user on 2026-07-11.

**Goal:** Turn Teerth Sharma's technically complete portfolio into a bright, anime-soft Antarctic object world whose physical scene, seal guide, and spatial navigation carry the first viewport without depending on HUD text.

**Scope:** Frontend-only Next.js, React Three Fiber, Three.js, procedural geometry, committed local textures, CSS, and browser APIs. No backend, database, native runtime, copied reference asset, or new infrastructure.

## 1. Evidence and direction

The current verified desktop render passes 20 viewport checks but still fails the art-direction bar: the near-black sky occupies roughly the upper third; the dome's dark tile sides dominate its ice faces; the seal reads as a metallic capsule; the terrain is a low-contrast cyan sheet; and five simultaneous HUD zones compete with the scene.

Live reference captures were made at 1440×900 before this design was frozen:

- `next.junni.co.jp`: a fullscreen WebGL composition with a fixed orthographic grid, sparse monochrome geometry, a small corner guide, and wheel-driven state changes while document `scrollY` remains `0`. Its palette is 78.55% black in the sampled frame. We borrow its spatial discipline, fixed world ownership, and guide behavior, not its darkness.
- `messenger.abeto.co`: a fullscreen cel-shaded world. The start screen is 70.99% sampled turquoise `#65C1BC`, with cream `#EDF2E4`, gray-green `#A6AC9F`, dark green `#4B6455`, and mustard interaction. The entered world uses broad white negative space, gray ink, restrained cyan, and desaturated object colors. We borrow its bright field, outlined material separation, world-stream reveal, and large quiet color masses.
- User palette atlas: the sampled families are indigo `#3E3E9E`, acid yellow `#DBC44D`, green `#4BC076`, magenta `#A62182`, teal `#1C6059`, warm brown `#9A6144`, and charcoal `#424041`. We use these as station accents, never as full-screen neon wash.

The final direction is therefore: **Abeto brightness + Junni spatial discipline + the user's saturated station colors + the existing Antarctic identity.**

## 2. Global constraints

- Preserve `?safe=1`, the explicit Start exploring render gesture, GPU diagnostics, and fatal-render fallback.
- Preserve WASD-only movement; arrow keys remain instructional only.
- Preserve low/medium/high quality controls and high-contrast control.
- Preserve the horizontal evidence/archive route and WebGL-independent project access.
- Preserve touch station routing, keyboard accessibility, focus states, and reduced-motion information parity.
- Preserve Vercel deployment and frontend-only operation.
- Preserve and strengthen verifier scripts; never reduce a threshold to hide a visual regression.
- Keep world geometry bounded and avoid per-frame object, material, texture, or array allocation.
- No new binary asset is required. All new visuals are shader, primitive, or CSS based.

## 3. Palette contract

No pure black is permitted in the world, seal, dome, terrain, safe gate, or world HUD. `#000000` may remain only inside unrelated legacy evidence media if removal would alter source evidence.

| Token | Hex | Role |
| --- | --- | --- |
| `polarIvory` | `#F6F1E7` | foreground snow, paper-like UI surfaces |
| `glacierWhite` | `#EDF6F9` | sky zenith, ice highlight |
| `abetoTeal` | `#65C1BC` | primary bright atmosphere and active world field |
| `dawnCyan` | `#8FD0E0` | sky middle, snow shadow, subsurface ice |
| `skyMint` | `#A7E5DF` | sky transition and depth fog |
| `horizonBlue` | `#78C9D2` | horizon band; intentionally lighter than the old indigo horizon |
| `horizonIndigo` | `#33406E` | linework, far silhouettes, high-contrast ink only |
| `animeInk` | `#34384F` | hand-drawn edges and primary dark text |
| `animeShadow` | `#71839B` | contact shadows and secondary geometry sides |
| `emberAmber` | `#E2B86A` | dock confirmation and warm interior light |
| `evidenceMagenta` | `#D8478F` | archive station and archive affordances only |
| `kelpChartreuse` | `#C4D64B` | seal scarf and a small guide accent |
| `signalCobalt` | `#3E5BC7` | S2 station |
| `aetherViolet` | `#8D69D6` | language/runtime station |
| `fieldYellow` | `#F4C84E` | physics station |
| `qpuMint` | `#4BC076` | QPU station |
| `upstreamCoral` | `#F47D69` | upstream station |

Station surfaces use soft, lighter local colors while rims use saturated accents:

| Station | Surface | Accent |
| --- | --- | --- |
| Observatory | `#F4F8ED` | `#65C1BC` |
| S2 Core | `#A6DFF4` | `#3E5BC7` |
| Aether | `#D9C2FF` | `#8D69D6` |
| Field | `#FFE37A` | `#F29C46` |
| QPU | `#BFF4D9` | `#4BC076` |
| Upstream | `#FFB0AF` | `#4BC076` |
| Archive | `#F2D4E8` | `#D8478F` |
| Tooling | `#DDE4E9` | `#73809E` |

## 4. First-viewport spatial contract

### 4.1 Camera

- Desktop lens: vertical FOV `39°`, equivalent to a restrained 40–45 mm full-frame view at this aspect ratio.
- Portrait lens: vertical FOV `46°` to retain both dome and seal.
- Near/far: `0.1 / 94` world units.
- Rest camera height: `1.48` world units; look target height: `0.74`; resulting pitch is approximately `-4°`.
- Rest camera distance: `7.2` desktop, `8.25` portrait, and `9.8` compact so the dome/guide relationship remains complete rather than cropping into disconnected halves.
- Active-station distance: `6.25–6.7` desktop by quality, `7.85–8.35` portrait, and `9.65` compact. A restrained three-quarter lateral offset keeps the station housing and guide in the same frame.
- Camera position damping: `rate = 5.5 s⁻¹`; look-target damping: `rate = 7.0 s⁻¹`; frame-rate independent alpha is `1 - exp(-rate * delta)`.
- Reduced motion: camera snaps to the target in one frame while keeping the same framing.

### 4.2 Composition

- Move the physical observatory home to `x = -2.35`; keep the logical observatory station at `x = 0`. This places the dome at the upper-left rule-of-thirds region while the seal remains lower-right and still navigates the original axis.
- Dome projected height must be between `2.3×` and `2.8×` the seal projected height at rest.
- The seal faces inward toward the dome until movement supplies a heading.
- Keep the upper-right 20–25% of the viewport as bright sky negative space.
- Add a foreground expedition kit at approximately `[-4.1, 0.08, 3.7]`: one half-buried crate, one enamel mug, and a rope coil. It provides human scale without becoming another station.

### 4.3 Sky, terrain, and light

- Sky shader vertical stops: zenith `#F8FAF2` at normalized height `0.82`; middle `#A7E5DF` at `0.48`; horizon `#78C9D2` at `0.12`.
- Fog: exponential color `#B8E2DF`, density `0.018`. The post stack adds a separate depth-pixel fog only after `54%` linear depth.
- Terrain base: `#F6F1E7`; shadow tint `#A6D7E4`; texture normal scale no greater than `(0.0025, 0.0025)`.
- Key: cold `#FFFDF7`, intensity `2.15`, position `[4.8, 7.2, 5.4]`, shadow map `1024²`.
- Fill: warm `#FFE3A8`, intensity `0.68`, position `[-4.2, 2.4, 3.8]`.
- Rim: cyan `#8FD0E0`, intensity `0.72`, position `[-5.4, 3.6, -4.2]`.
- Hemisphere: sky `#F8FAF2`, ground `#71839B`, intensity `0.72`.
- Ambient: `0.34`. Ambient light may not be the primary form-defining source.

## 5. Surface shader contract

Every material family must be identifiable in a static frame through value response, not only hue.

- **Snow/terrain:** three-band toon response with broad cream highlight, cyan half-tone, and blue-violet shadow. Roughness is visually high; normal contrast stays subordinate.
- **Dome face ice:** one continuous world-`XZ` geographic field crosses every brick; color must never be derived from world `Y`. Irregular frost `#EDF6F9`, cream `#F6F1E7`, teal `#65C1BC`, sage `#B9D8B1`, and warm `#F2C98B` lobes sit under a three-step wrapped diffuse response. A four-octave vertex fBm uses lacunarity `2.0` and aggressive gain `0.35`; derivative normals drive Schlick Fresnel with `F0 = 0.018` and edge scattering. Face roughness remains `0.56–0.68`; no metallic response.
- **Dome tile sides/structural metal:** tile sides are luminous blue ice (`#C8E0E5/#D6E9EA`); `horizonIndigo` is restricted to thin ribs, the doorway inset, one solid contact underside, and a single plinth contour ring that survives mobile downsampling. Airlock metal uses metalness `0.72`, roughness `0.38`; it must not share the ice response.
- **Seal:** three-band toon skin, warm ivory belly/cheeks, charcoal-violet outline and thin solid contact ellipse, matte flippers, small chartreuse scarf. Remove the visual priority of dorsal instrumentation and glass faceplates.
- **Station glass/signal:** transparent surfaces keep smooth gradients; signal rings remain emissive and are the only additive family.
- **Fabric/props:** high roughness `0.82–0.94`, no metallic response, saturated color lower than signal rims.

No per-object custom renderer is added. `POLAR_XZ_NOISE_GLSL` and `POLAR_XZ_SHADER_POLICY` are the reusable station/pillar contract: shared palette-uniform roles, two fragment noise samples plus derivative normals on medium/high, and a zero-noise/interpolated-normal low tier. Vertex displacement is `0 / 0.012 / 0.02` for low/medium/high. Shared toon gradients and the existing single post pass keep the shader/program count bounded.

## 6. Seal guide state machine

The single source of truth is a pure `deriveSealGuideState` function with exactly five outputs:

| State | Priority and trigger | Visible behavior |
| --- | --- | --- |
| `error` | safe/fallback after renderer failure, or explicit safe state | body settles `0.08` lower, head/body tilt `15°`, amber halo holds steady; safe gate repeats the state in its lightweight seal mark |
| `probing` | renderer mode `probe` or world bridge active | `8°` forward lean and cyan halo pulse every `900 ms`; reduced motion uses a static 20% halo |
| `docking` | moving and station distance `≤ 3.8` units | gaze/heading turns to station; one `300 ms` nod; active rim anticipates arrival |
| `moving` | velocity magnitude `> 0.025` or tap route still converging | body roll `±6°` at `2.2 Hz`; heading leads travel vector by `10°` |
| `idle` | all other cases | breath scale `1.00 → 1.03 → 1.00` over `2400 ms`; blink lasts `120 ms` every `4–7 s` |

State priority is `error > probing > docking > moving > idle`. Motion uses frame-rate-independent damping. Reduced motion disables breathing, pulsing, nod tween, and waddle but preserves pose, heading, selected station, and navigation.

## 7. Navigation and loading

- WASD continues to update target refs; visible axis/depth values damp toward the targets.
- Clicking/tapping a station uses the same target refs and therefore drives the same moving/docking states as WASD.
- Station selection changes the station's physical rim, scene fill accent, seal bearing, label/readout, and evidence source simultaneously.
- The evidence rail remains directly clickable and keyboard accessible. It is not hidden behind movement mastery.
- World stream order after Start exploring: sky/fog/seal silhouette `<200 ms`; dome `500 ms` using `cubic-bezier(0.33, 0, 0.2, 1)`; terrain `300 ms`; station groups `200 ms` each with `120 ms` stagger.
- Reduced motion renders the final world state on first paint with no stagger.

## 8. Lightweight anime post stack

The existing single fullscreen render target and camera depth texture remain. The pass order is fixed:

1. Very slight radial fisheye before sampling: coefficient `0 / 0.003 / 0.005` for low/medium/high.
2. Linear depth reconstruction from `DepthTexture`.
3. Depth pixel fog begins at `0.54` linear depth and reaches full mask at `0.96`; the image UV snaps by at most `1.0 / 1.7 / 2.2` pixels with final mix capped at `0.10`.
4. Gaussian 3×3 luminance blur (nine taps) plus four depth neighbors produces line confidence. Luma thresholds are `0.020–0.105`; depth thresholds are `0.0015–0.018`.
5. Chromatic edge AA uses the edge confidence and outer-screen mask. RGB offsets are capped at `0 / 0.55 / 0.8` texels. Neighbor-average AA blend is capped at `0.18`; it must soften jagged edges rather than create visible RGB split.
6. Color quantization uses `10` luminance bands and `24` channel levels, mixed back into the original at `0.12 / 0.18 / 0.24` for low/medium/high.
7. Stable interleaved-gradient dither amplitude is `0.0025`; reduced motion freezes all temporal seeds.
8. Hand-drawn ink is `#33406E`, opacity `0.08 / 0.14 / 0.18`; depth edges receive `1.15×` confidence.
9. Scanline modulation is static and capped at `0 / 0.004 / 0.007`.
10. Wide vignette begins at squared radius `0.50`, ends at `1.45`, and reaches at most `8%`; it tints toward indigo instead of crushing to black.
11. A final paper-grade curve is part of the same fullscreen pass: `color *= gradeBase + 0.40 * color`, with `gradeBase = 0.36 / 0.49 / 0.52` for low/medium/high. The low tier restores shadow readability after reduced-resolution sampling; medium/high retain progressively brighter snow.

Render target scale becomes `0.82 / 0.94 / 1.0`. Low quality removes fisheye, chromatic offset, and scanlines first. Medium remains the default. High may use 2× render-target samples on WebGL2; no mode exceeds the existing DPR cap.

## 9. HUD and safe gate

- World UI uses translucent polar ivory with anime ink, not dark glass panels.
- Keep four permanent affordances only: name/identity, Work–Archive–Contact, station rail, quality/contrast controls.
- The live strip drops to secondary opacity. The center/right station readout remains evidence-backed but occupies no more than `270×150 px` desktop.
- The safe gate becomes a bright poster: ivory field, teal polar plane, lightweight CSS seal silhouette, amber Start exploring control, and renderer diagnostics. It retains its dialog semantics and explicit user gesture.
- The seal mark reflects `idle`, `probing`, or `error` through pose/halo without speech bubbles.

## 10. Verification and completion gates

Required commands:

```powershell
npm run lint
npm run check:teerth
npm run check:render-budget
npm run check:polar-rescue
npm run verify:render
npm run build
```

Rendered inspection must include desktop, iPad portrait, iPad landscape, mobile, reduced motion, safe gate, and one non-observatory station. Completion additionally requires:

- No shader compile error, WebGL context loss, blank canvas, or uncaught console error.
- First desktop viewport is predominantly light: median sampled luminance `≥ 0.48` and blown-highlight fraction remains below the existing verifier cap.
- Dome silhouette is left of viewport center; seal silhouette is right of dome center in the rest frame.
- Canvas still communicates polar world + dome + seal when HUD is mentally removed.
- Low quality remains usable and does not substitute heavy pixelation for missing resolution.
- Existing evidence/archive pages remain readable without WebGL.

## 11. Rejected approaches

- **Dark Junni reproduction:** rejected because the user explicitly selected a bright anime-soft palette. Junni contributes composition and guide behavior only.
- **Multi-pass effect composer with normal pre-pass and bloom chain:** rejected because it increases render targets, GPU bandwidth, and context-loss risk. Depth plus luma edges are sufficient for this scene.
- **Imported anime models or textures:** rejected because the identity must remain Teerth's procedural polar world and copying reference assets is prohibited.
- **HUD-first redesign:** rejected because the physical 3D still frame must carry the experience.
