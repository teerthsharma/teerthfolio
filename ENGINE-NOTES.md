# Anime engine notes (engine/anime)

The engine is a WebGL2 cutscene renderer for teerthfolio, kept separate from the roaming island. Lab route: `/lab/anime?demo=seal|rimuru|ainz|styles&style=<id>`. It is served by `next dev -p 3801` from this worktree. Production builds 404 the route (`VERCEL_ENV === "production"`).

## Platform decision: WebGL2, not WebGPURenderer/TSL

- Every demo runs as three r178 `ShaderMaterial` GLSL on WebGL2.
- WebGPURenderer cannot run the site's existing GLSL kit (`onBeforeCompile`, postprocessing, r3f materials). Adoption would mean a second shader language.
- iPad Safari only gained WebGPU in Safari 26. Its WebGL2 fallback in three is a separate node-compiled backend, with its own compile hitches.

## Architecture and API (`lib/anime/`)

| File | Role |
|---|---|
| `engine.js` | `new AnimeEngine(canvas, {style, tier})` owns the renderer, the shared uniforms, the `Composer`, the style, `Impact`, `Trauma` and `Governor`. Methods: `resize(cssW, cssH, dpr)`, which uses the pixel budget from `lib/world/quality.js`; `setStyle(id)`; `figure(geo, {head, ink, lineMul, constant})`, which returns a surface plus an ink hull with shared morph and smear uniforms; `prop(geo, id)`; `syncFaces(root)`; `frame(scene, camera, t, dt, rect?)`; `observe(ms, t)` (T3). |
| `material.js` | One uber-program, `animeMaterial(shared)`, plus `hullMaterial`. See the shading list below. |
| `sdf.js` | The SDF modeller: `ell` and `cone` primitives with polynomial smooth-min; `polygonize`, by surface nets with exact SDF normals and a Newton snap. It bakes per-vertex `aCol`, `aShade`, `aXrd` (bias, line width, material id) and SDF AO with 3 Laplacian passes (the A2 baseline). `blobify` adds the slime-morph target. `painted(geo, paint)` gives any geometry the program's attributes. |
| `pup.js` | **The locked kawaii pup:** a pear SDF, the crown tuft, hugging fore-flippers, fanned rear flippers. Cream belly and muzzle are analytic decals (`uDecA` and `uDecB`) and so stay crisp, plus blush. Eyes are layered discs with 2 highlights. Nose and the "w" mouth are drawn as shapes; whiskers are constant-pixel ribbons (`lineMaterial`). The ink outline is `#4a3f3c` at 3 px per 800 px of height, a constant pixel width. `groundShadow()` is a multiply ellipse that keeps the id alpha. |
| `models.js` | Rimuru (SDF; **needs a rebuild**, see below), `ainzExtra()` (cloak and gold collar prims on the pup), `staff()`, `buildFigure()`, and `BLOB` (the shared morph blob). |
| `sky.js` | Painted sky: a three-stop gradient, posterised clouds, and an emissive sun disc (the only thing that blooms). Id 0. |
| `meadow.js` | Instanced grass blade cards (a painted gradient, sway, id 0.99 so they get no set lines), and teal water with horizontal streaks. |
| `post.js` | `Composer`. The scene renders to a HalfFloat target (colour plus id in alpha) with a depth texture. Then: a dual-Kawase pyramid (rgb = emissive excess `max(c-1,0)`, a = luma for diffusion); half-res shafts; a quarter-res DOF blur; and ONE fused final pass. That final pass does shockwave warp, misregistration and impact aberration, set lines (depth Laplacian plus id edges, nearer side only), DOF, shafts, bloom, diffusion, palette quantise, grading with lift locked at 0, paper/plaster/woodgrain, posterise, focus and speed lines, impact frames, IGN grain, vignette, and sRGB. |
| `styles.js` | 8 presets: modern-anime, western-cartoon, bleach-ink, renaissance-fresco, spider-verse-comic, ukiyo-e, watercolour, cel-90s. `applyStyle()` writes uniforms only, so it never triggers a recompile. |
| `sakuga.js` | `step(t, fps)` (twos and threes); `Impact` (frame-locked two-tone, inverted and swapped); `Trauma`; `energyMaterial` (posterised 3-tone with an ink edge, re-randomised per step); `bolt` and `boltGeometry` (midpoint displacement); `snowMaterial`. |
| `topology.js` | A Yuddh-Niti H0 port: `h0Superlevel` on any CSR graph (elder rule, optional member tracking), `significantBetti`, `noiseMass`, `hilbertSeries`, `TopologicalConvergence`, and **T1** `bakeShadowBias(geo, Lobj, tau)`. |
| `governor.js` | **T3**, the topology-aware tier governor. |
| `demos.js` | `seal` (the painted world), `rimuru` (seal to slime to human morph), `ainz` (western cartoon), and `board` (the style grid). |

### Shading in `material.js`

The program applies, in order:
- half-Lambert;
- an Xrd bias from `aXrd.x`;
- `mix(authored shadow, lit albedo)`, with lit luma clamped to ≤ 0.92 so only `uEmit` can bloom;
- analytic Genshin face shadows (id 2);
- a Kajiya–Kay angel ring (id 1);
- a thin hard rim;
- tone modes, all screen-space: Ben-Day, manga screentone, watercolour granulation and hatching;
- decals, brush/moss rocks and green bounce;
- vertex morph and smear;
- a T6 mask view (`?mask`).

### How a scene adopts a style

Use `engine.setStyle("ukiyo-e")`, or the `?style=` query. Every mesh made through `engine.figure()` or `engine.prop()` reads the shared style uniforms. An r3f scene would build its meshes with `animeMaterial(engine.shared)` and call `engine.frame` from a priority-1 `useFrame`.

## What works

- **Programs.** One surface program and one hull program for every mesh. A style switch costs uniform writes only.
- **Frame time.** Seal demo, 1180×820 at DPR 1, on the RTX 4060 (ANGLE D3D11): p50 6.1 ms, p95 6.2 ms. The 8-tile style grid: p50 6.1 ms, p95 12.2 ms. **Intel UHD has not been measured yet**; the harness supports `--gpu intel`.
- **SDF meshes.** They are watertight (χ = 2) with 100% consistent winding (checked).
- **Bake times on the RTX laptop CPU (Chrome):** T1 at 46–92 ms per character mesh; seal-scene pup 50.8 ms.
- **Capture harness.** `scripts/anime-cap.mjs` uses real Chrome, pins the adapter by LUID, and reports `__anime.stats()` with the adapter string and frame-time p50/p95.

## What looks bad, and why (from the last capture, `engine-shots/demo-seal-t-2.png`)

1. **Seal scene: the pup is mostly in shadow.**
   - The cream belly renders lavender: it uses `uDecShade`.
   - The key light (−0.55, 0.78, 0.30) is too far behind the pup's facing. It needs to come from the camera-left front, or use a softer, smaller shadow shape (the locked design is "almost flat").
2. **Seal scene: the foreground grass is a wall.**
   - 70 blades at 0.035 m width, too close to the camera, cover the pup.
   - DOF only blurs pixels whose own depth is out of focus, so a blurred blade never bleeds over the in-focus pup.
   - Needs fewer, larger blades at the frame edges only, plus a gathered DOF (or blurred foreground plates, per the cutscene doctrine).
3. **Seal scene: the ledge reads as a flat green lawn.** The moss threshold covers the whole top; it needs a higher `uBrush.w` and visible rock faces. The camera is too low and close for the reference's three-quarter composition.
4. **Rimuru is a box stack**, per the owner. It needs a rebuild at 7 heads: layered tapered hair clumps, anime eyes (iris, highlight, lash), a nose stroke and mouth, a white shirt, and a black coat with fur trim. The current hair is SDF cones that merge into slabs.
5. **The styles change the paper more than the characters** in about 6 of 8 panels. Per-style character transforms are still owed: line weight and colour, the fill model, shadow shape and timing.
6. **The energy orb** is posterised noise. It needs bigger, cleaner flame shapes (lower frequency, 2 octaves) and a stable silhouette.
7. **The Rimuru morph** has not yet been visually checked mid-transition. Folded vertices are mitigated by the hull fade and the slime blob stand-in.

## Gates so far

**T1** (persistence-simplified shadow bias; `node lib/anime/topology.check.mjs`):
- The ported Yuddh-Niti H0 tests pass: single peak, elder rule, four peaks give three bars, τ = 0.1, and convergence after 2 rounds.
- On a lumpy sphere (6,252 vertices, a Lambert plus noise bias), lit and shadow regions fall from **14 to 4**, which meets the ≤ 4 gate. Bake time is 16–19 ms (Node, laptop CPU).
- Deviation from the port: the simplification scale is the field range, `max(longest finite bar, essential − min)`, not the longest finite bar alone. On a lit sphere every finite bar is a speck, so the plain-port threshold removed nothing (14 → 14).
- Runtime cost is 0: the result is written into the existing `aXrd.x` channel.
- **Not yet measured:** β₀^0.1 on the real pup against the baselines (raw, AO, random, T1), and the 5° light-stability gate. The harness hooks exist (`?bias=raw|ao|random|t1`, `?mask`, which encodes the pre-threshold field in R and the character mask in B), but the PNG-side H0 scorer (T6) is not yet written.

**T3** (governor; `node lib/anime/governor.check.mjs`, synthetic traces, against two baselines):
- **RTX with prewarm hitches** (900, 1500, 600, 400, 1200, 300 and 250 ms):
  - topo stays at ≥ T3 (minimum T3);
  - the drei-like mean-fps baseline drops to **T1**, which reproduces the "Auto saved T0 on an RTX" bug class;
  - the p99 baseline reaches T1 and thrashes, with 4 changes in 10 s.
- **Intel overload:** topo settles at T1 in **2.95 s** with one jump. The mean baseline takes 7.6 s over 3 steps and ends at T0.
- **Intel borderline:** topo makes 0 changes, while the mean and p99 baselines both drop to T0.
- All topo runs make ≤ 1 change per 10 s.
- The governor is wired into `AnimeEngine.observe`; the lab feeds it unless `?fixed`.

**T2, T4, T5 and T6:** not started (T6 is partially started, as the mask view only).

## Planned next steps

1. **The seal scene to the reference.**
   - Key light from the front-left; the cream belly lit.
   - Edge-only foreground blades; a gathered DOF or foreground plate.
   - A rock with visible faces and moss only on top.
   - The camera at three-quarter, with the pup at 55% of the frame height and the eyes on the upper third.
2. **The cutscene doctrine.**
   - Static-world plates rendered once per shot (background, middle ground, foreground), with a Kuwahara and edge-aware posterise pass on the plates only.
   - The character layer at 12 Hz in its own target, composited over the parallaxed plates at the display rate.
3. **T6:** port `h0_superlevel` to the harness on `?mask` PNGs. Measure β₀^0.1 and noise mass per character for raw, AO, random and T1, plus the 5° stability test.
4. **Rimuru rebuild** (see above), then per-style character transforms, a cleaner energy orb, and Intel UHD numbers.
5. **Swap contract** with the site pup at the pocket boundary: copy the world position, yaw and pose phase, and hide/show on the same frame.

The references in `../engine-ref/` are never committed.
