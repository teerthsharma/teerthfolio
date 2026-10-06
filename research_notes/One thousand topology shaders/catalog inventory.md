# Anime shader catalog inventory (toward 1000 distinct modules)

Scope: Cutscenes / AnimeEngine only. Branches read: `engine/cutscenes` at `teerthfolio-wt/engine-cuts`, toolsmith A `engine/anime` at `teerthfolio-wt/engine`, toolsmith B `engine/artist3` at `teerthfolio-wt/engine-3`, and sampled `teerthfolio-shader-{gold,myth,rumbling,school,shonen}` worktrees. Distinct means a different invariant or construction, not a recolor ([discover-topology](file:///C:/Users/seal/.claude/skills/discover-topology/SKILL.md)).

## What is COUNT today? How many unique GLSL programs vs wrappers/styles?

### Takeaway
Official first-party shader COUNT is **110** on `engine/anime` against the owner's **~250** bar (140 short of the bar). Toolsmith B adds **41** character/mesh modules, not GLSL. `engine/cutscenes` has **no** `catalog.js`. Another **599** vendor wrappers exist but are excluded from COUNT and should not pad a 1000-distinct-maths target.

### Cited Findings
- Toolsmith A's catalog header states `COUNT` is "module files in the toolkit (the owner's bar: ~250)". — [engine/lib/anime/catalog.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine/lib/anime/catalog.js)
- `catalog.check.mjs` executed 2026-10-06 printed: `catalog: 110 modules registered; module files 110 (tools 47, style 12, sky 14, fx 30, post 7); GLSL symbols 392` and `PASS`. — [engine/lib/anime/catalog.check.mjs](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine/lib/anime/catalog.check.mjs)
- `CATALOG` is the concatenation of adopted legacy tools + `PRIMITIVES` + `STYLE` + `SKY` + `FX` + `POST`. Vendor dirs are not imported here. — [engine/lib/anime/catalog.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine/lib/anime/catalog.js)
- Legacy `TOOLS` on A is 21 names: `noise blend storm lightning puffs grunge glow mist grade kuwahara flare cel ink huegrade veins starfield nebula burst lensing orb glassfloor`. — [engine/lib/anime/tools/index.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine/lib/anime/tools/index.js)
- `PRIMITIVES` is 26 defineModule files: `hash perlin simplex worley fbm domain-warp curl sdf2d sdf3d colour tonemap dither shaping sdf-curves scatter2d glyph-gen rings hex-grid uv-warp crack-tree fresnel-film bump sample-kernels blend-modes brush-stroke kana-sfx`. 21 + 26 = 47 tools files, matching the check. — [engine/lib/anime/tools/primitives.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine/lib/anime/tools/primitives.js)
- Style LIST is 11 (`style-scene cel-ramp cel-ramp-texture shadow-hue rim-strip spec-sliver star-glint-spec hull-taper ink-edge-post line-colour line-boil`) plus lead `blob-shadow` = 12. — [engine/lib/anime/style/list.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine/lib/anime/style/list.js); [engine/lib/anime/style/list-lead.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine/lib/anime/style/list-lead.js)
- Sky LIST is 11 (`sky-dir sky-gradient sky-bands sun-disc moon-disc cumulus-cel cumulus-painted cirrus-streaks cloud-sea cloud-split storm-city-lit`) plus lead `multiplane ken-burns matte-card` = 14. — [engine/lib/anime/sky/list.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine/lib/anime/sky/list.js); [engine/lib/anime/sky/list-lead.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine/lib/anime/sky/list-lead.js)
- FX is 8 energy + 7 world + 15 lead = 30 (`impact-frame impact-starburst speed-lines-radial speed-lines-parallel focus-lines smear afterimage time-stop-invert`; `particle-cells rain-streaks rain-ripples rain-sheet snowfall embers ash-fall`; `menacing-sfx impact-sfx shockwave-ring shockwave-dome sonic-ring aura-flame aura-outline fire-sheet soul-flame lightning-fork railgun-beam energy-beam impostor impact-backdrop smear-sweep`). — [engine/lib/anime/fx/list-energy.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine/lib/anime/fx/list-energy.js); [engine/lib/anime/fx/list-world.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine/lib/anime/fx/list-world.js); [engine/lib/anime/fx/list-lead.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine/lib/anime/fx/list-lead.js)
- Post is 4 + 3 = 7 (`kawase-blur gaussian-blur bloom-kawase bloom-selective`; `reveal-mask hold-frame cut-transition`). — [engine/lib/anime/post/list.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine/lib/anime/post/list.js); [engine/lib/anime/post/list-lead.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine/lib/anime/post/list-lead.js)
- Toolsmith B catalog is 41 `[kind, name, loader]` tuples, all `character`. Check printed `41/41 modules build (catalog total 41)`. Kinds include garments/hats, not GLSL chunks. `COUNT` is a function `() => CATALOG.length`. — [engine-3/lib/anime/catalog.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine-3/lib/anime/catalog.js); [engine-3/lib/anime/catalog.check.mjs](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine-3/lib/anime/catalog.check.mjs)
- Artist3 has 57 `characters/*.js` files vs 41 catalog lines (helpers such as `seal-core`, `pieces`, costume presets are not COUNT). `kit` has 6 files. Dirs `crowds`, `sets`, `materials` named in `toolkit.js` are absent. — [engine-3/lib/anime/toolkit.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine-3/lib/anime/toolkit.js)
- `engine-cuts` has no `lib/anime/catalog.js`. Its tools registry is 17 files: the 15 classic tools plus `brushgrass` and `blobshadow` (artist-3 comment). No `defineModule` calls on this branch. — [engine-cuts/lib/anime/tools/index.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine-cuts/lib/anime/tools/index.js)
- A PowerShell scan of `engine-cuts/lib/anime/**/*.js` found **307** `ShaderMaterial(` constructors, **31** `glslFor(` calls, **2** `onBeforeCompile`, **0** `RawShaderMaterial`, **0** `defineModule`.
- `styles.js` on the cutscene branch is a **uniform recipe** system (`applyStyle` writes shared uniforms; "no shader compile"). Eight inline styles plus three world recipes (`jjk`, `frieren`, `your-name`). These are wrappers, not GLSL programs. — [engine-cuts/lib/anime/styles.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine-cuts/lib/anime/styles.js)
- Vendor pile on A: **599** `.js` files under `vendor-modules/` (blend 31, colour 103, distortion 21, easing 31, fire 9, hatching 7, lighting 94, materials 6, maths 32, noise 15, outline 5, post 84, sdf 1, sky 2, tonemap 29, transitions 125, water 4). Not in `CATALOG`. — directory listing of [engine/lib/anime/vendor-modules](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine/lib/anime/vendor-modules)
- A typical colour vendor file is one pairwise space map (`cs-hcy-to-hsl`) split from GLSL-Color-Spaces, prefixed for paste-safety. — [engine/lib/anime/vendor-modules/colour/cs-hcy-to-hsl.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine/lib/anime/vendor-modules/colour/cs-hcy-to-hsl.js)
- A typical transition vendor file wraps gl-transitions `fade.glsl` as `defineModule({ name: "glt-fade" ...})` but is still not registered in `CATALOG`. — [engine/lib/anime/vendor-modules/transitions/glt-fade.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine/lib/anime/vendor-modules/transitions/glt-fade.js)
- `lib/anime/topology.js` on the cutscene branch is CPU-side H0 superlevel persistence (CSR, elder rule, Betti proxy), not a catalog GLSL module. — [engine-cuts/lib/anime/topology.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine-cuts/lib/anime/topology.js)
- Sampled shader worktrees (`shader/gold`, `shader/rumbling`, `shader/shonen`) ship the same 17-tool `tools/index.js` as `engine-cuts` and the same two-line `NEEDS.md`. No `catalog.js` on `teerthfolio-shader-gold`. — [teerthfolio-shader-gold/lib/anime/tools/index.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-shader-gold/lib/anime/tools/index.js); [teerthfolio-shader-shonen/lib/anime/cutscenes/NEEDS.md](file:///C:/Users/seal/Documents/GitHub/teerthfolio-shader-shonen/lib/anime/cutscenes/NEEDS.md)

### Inferences
- The live COUNT the owner asked about is **110 registered first-party shader modules** on `engine/anime`, not 250, not 1000, and not the 307 dock `ShaderMaterial` sites.
- Arithmetic of the 110: 21 legacy + 26 primitives + 12 style + 14 sky + 30 fx + 7 post. That is a rendering toolkit (noise, cel, sky plates, sakuga FX, blur/bloom), not 110 topological invariants.
- Rough distinct-maths triage of those 110 (construction, not file count):
  - **Keep as distinct (~80–95):** hash (Hoskins sine-free), Perlin/simplex/worley/fbm/domain-warp/curl, sdf2d/sdf3d/sdf-curves, kuwahara, cel-ramp (n-tone + shadowShift), ink-edge-post, line-boil, storm/puffs/veins/nebula/lensing, aura-flame (4-drawing tongue field), railgun-beam (taper SDF + travelling head), shockwave-dome, bloom-kawase (soft-knee excess + dual pyramid), impostor sphere-normal cards, time-stop-invert, particle-cells, crack-tree, fresnel-film, glyph-gen, kana-sfx.
  - **Family / near-duplicate (~10–15):** `cel` vs `cel-ramp` vs `cel-ramp-texture`; `rain-streaks` / `rain-sheet` / `rain-ripples`; `speed-lines-radial` / `speed-lines-parallel` / `focus-lines`; `shockwave-ring` / `sonic-ring`; `aura-flame` / `aura-outline` / `soul-flame` / `fire-sheet`; `lightning` / `lightning-fork`; `energy-beam` / `railgun-beam`; `kawase-blur` / `gaussian-blur` / `bloom-kawase` / `bloom-selective`; `smear` / `smear-sweep` / `afterimage`.
  - **Compositor / camera wrappers, not new invariants (~8–12):** `style-scene`, `ken-burns`, `multiplane`, `matte-card`, `hold-frame`, `cut-transition`, `reveal-mask`, `impostor` as an object factory wrapping the sphere construction already counted.
- Styles (8+3 recipes) and artist3 clothes (41) are **not** GLSL programs. Counting them toward 1000 would be a category error.
- Vendor 599 is a paste library. Colour (103) is mostly pairwise maps of one construction; transitions (125) are wipe/fade variants. Treat as **0** toward distinct maths unless a later pass names a new invariant per file (it should not).

### Gaps
- Unique dock-local GLSL program count (hash of fragment bodies after stripping uniforms) was not computed. 307 `ShaderMaterial(` sites is an upper bound; shared chunks (`NOISE`, `SKY`, `VERT`/`paintLit`) mean unique programs are lower.
- Full file-by-file diff of all five `teerthfolio-shader-*` trees vs `engine-cuts` was not completed. Sampled toolkit surfaces match `engine-cuts`; no evidence they already hold the 110-module catalog.
- Whether the 599 vendor `defineModule` files are planned to merge into `CATALOG` later is not stated in `catalog.js`.

## How are modules composed (defineModule, glslFor, world/cast/fx topology)?

### Takeaway
Two parallel catalogs, two contracts. Toolsmith A: `defineModule` GLSL/pass/object chunks composed by `glslFor` (deps first, each once). Toolsmith B: lazy `[kind, name, loader]` mesh factories via `toolkit.js`. Cutscenes compose three isolated layers (`world` / `cast` / `fx`) and may import shared tools but must not import another dock.

### Cited Findings
- A's module shape: `defineModule({ name, kind, tags, doc, cost, params, deps, glsl, uniforms?, demo, create? })`. Kinds: `"glsl"` (pasteable functions), `"pass"` (render targets), `"object"` (THREE Object3D). `glslFor` walks deps, emits each module once. Duplicate names throw. — [engine/lib/anime/tools/define.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine/lib/anime/tools/define.js)
- Pre-toolkit tools are `adopt`ed into the same registry without changing their GLSL. — [engine/lib/anime/tools/define.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine/lib/anime/tools/define.js); [engine/lib/anime/catalog.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine/lib/anime/catalog.js)
- A's catalog.check requires: meta, kind in {glsl,pass,object}, tags, doc, `create`, `cost.alu`, param defaults/docs/ranges, a demo for glsl kinds, no colliding top-level GLSL symbols across modules. — [engine/lib/anime/catalog.check.mjs](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine/lib/anime/catalog.check.mjs)
- Example composition: `aura-flame` deps `[hash, sdf2d]`; documented maths is a vertically stretched value-noise tongue field, 3 cel bands + outline, 4 drawings on twos. Tags include dock ids (`mwarp`, `nemo`, `highway`, `m3396`). — [engine/lib/anime/fx/aura-flame.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine/lib/anime/fx/aura-flame.js)
- Example composition: `railgun-beam` deps `[sdf2d, fbm, lightning-fork]`; "the toolkit's point" is composing those primitives. Tags include `faraday`. — [engine/lib/anime/fx/railgun-beam.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine/lib/anime/fx/railgun-beam.js)
- Example object module: `impostor` reconstructs sphere normals from quad UV (`n = (q, sqrt(1-|q|^2))`), two-tone cel, ink rim; Rule 7 cheap trick. — [engine/lib/anime/fx/impostor.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine/lib/anime/fx/impostor.js)
- Example pass module: `bloom-kawase` is excess-above-threshold (Unity soft knee) then dual Kawase pyramid; lit luma ≤ 0.92 is out of bloom. — [engine/lib/anime/post/bloom-kawase.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine/lib/anime/post/bloom-kawase.js)
- Cutscene-branch `glslFor` is the older tools registry (17 names), same dep-first concat, no `defineModule`. — [engine-cuts/lib/anime/tools/index.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine-cuts/lib/anime/tools/index.js)
- CONTRACT: a cutscene is data + three layers. `world` = set/sky/plates (layer 0), `cast` = victims/props (layer 1), `fx` = energy/beams (layer 1). Layers never import each other; talk through `ctx` and `cue`. Imports allowed: `lib/anime/{tools,kit,sky,post,pup,sdf,paint,kit3d,material,sakuga}`, `framework.js`, own folder. No shader link during playback. — [engine-cuts/lib/anime/cutscenes/CONTRACT.md](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine-cuts/lib/anime/cutscenes/CONTRACT.md)
- 25 docks in `DOCKS` (plus `_template`). — [engine-cuts/lib/anime/cutscenes/index.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine-cuts/lib/anime/cutscenes/index.js)
- B's contract: `export const meta` + `export default function create(engine, params) -> { group, update, dispose }`. Painted attrs merge into one mesh via `mergePainted`. — [engine-3/lib/anime/toolkit.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine-3/lib/anime/toolkit.js)
- Dock world example (Rumbling): sky/terrain/harbour/district/wall/rank/embers built in isolated try/catch; 960 impostor titans in one draw. — [engine-cuts/lib/anime/cutscenes/pr-mujoco-3396/world/index.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine-cuts/lib/anime/cutscenes/pr-mujoco-3396/world/index.js)
- Dock fx example (Gate of Babylon): portals/volley/gate/enuma/easter/finale in a seal-local frame, each muted on throw. — [engine-cuts/lib/anime/cutscenes/pr-polychrom-79/fx/index.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine-cuts/lib/anime/cutscenes/pr-polychrom-79/fx/index.js)

### Inferences
- New topology shaders should land as A's `defineModule` units (kind `glsl` unless they own a target or a mesh), with a maths comment, `cost.alu`, demo, and tags — then get listed in the domain `list*.js`. Do not invent a second renderer.
- Dock-local GLSL that already documents an invariant (bullseye rings, Susanoo fresnel-fire, Hollow Purple posterised sphere) is a **promotion candidate** into the catalog, not a rewrite, per RULEBOOK reuse-first.
- World/cast/fx topology is isolation for agents, not a shader algebra. A module is shared if it lives under `lib/anime/{tools,style,sky,fx,post}`; it is dock-private if it lives under `cutscenes/<dock>/{world,cast,fx}`.
- `ctx.tools.glslFor` on the cutscene branch cannot yet see A's 110 until consolidate merges `engine/anime` into `engine/cutscenes`. RULEBOOK already tells builders to adapter-wrap toolsmith-only modules with `// TOOLKIT: <branch>:<path>`.

### Gaps
- No automated map of which of the 110 catalog names each dock actually imports (vs reimplements). 31 `glslFor(` sites on `engine-cuts` is the only reuse metric counted.
- A's `catalog.js` comment says domains add via their `index.js` without touching catalog.js; B's catalog is append-only tuples. Merge conflict policy after both land on `engine/cutscenes` is not written down beyond RULEBOOK Rule 2.

## Which docks already have naming shaders, which are thin?

### Takeaway
Most of the 25 docks already author a named look in-folder (documented GLSL with a construction). The thin/problematic set is not "no shader files" — it is **shared-mountain clones**, **unpromoted dock GLSL**, and a few docks whose naming shader exists but the live picture still fails the director ledger (magenta plate, type-led purple).

### Cited Findings
- 25 production docks + `_template`. Anime assignment per dock is in `ANIME`. Protected looks: Aizen (`pr-xnnpack-10801`), Sukuna (`pr-triton-kernels-22`), Madara blue Susanoo (`p-caustic`). — [engine-cuts/lib/anime/cutscenes/index.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine-cuts/lib/anime/cutscenes/index.js); [engine-cuts/lib/anime/cutscenes/CONTRACT.md](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine-cuts/lib/anime/cutscenes/CONTRACT.md)
- **p-aether-lang (naming):** Hollow Purple sphere is 4 posterised `ndv` bands + ink swirl `sin(4 ang + 16(1-ndv) - 5t)` + flare/halo/tunnel. — [engine-cuts/lib/anime/cutscenes/p-aether-lang/fx/purple.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine-cuts/lib/anime/cutscenes/p-aether-lang/fx/purple.js)
- **p-caustic (naming, protected):** single-pass Susanoo: fresnel `fr=(1-|N.V|)^1.6`, scrolling fire `vn*vn`, SDF seam lines, protected blue palette. — [engine-cuts/lib/anime/cutscenes/p-caustic/fx/susanoo.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine-cuts/lib/anime/cutscenes/p-caustic/fx/susanoo.js)
- **pr-tensorflow-124410 (naming):** shared `world/glsl.js` documents bullseye sky (8 rings × 6°, sheared fbm storm, diagonal cut `fract(s)>0.66`) and Araki set shading. These two are the only NEEDS.md rows. — [engine-cuts/lib/anime/cutscenes/pr-tensorflow-124410/world/glsl.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine-cuts/lib/anime/cutscenes/pr-tensorflow-124410/world/glsl.js); [engine-cuts/lib/anime/cutscenes/NEEDS.md](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine-cuts/lib/anime/cutscenes/NEEDS.md)
- **p-nerve (naming):** night-cloud ceiling uses `stormDensB` + 4-band `celStep` ramp + 1 px iso edge; skyline card has window-cell lighting. Maths written beside the GLSL. — [engine-cuts/lib/anime/cutscenes/p-nerve/world/glsl.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine-cuts/lib/anime/cutscenes/p-nerve/world/glsl.js)
- **p-tangle (naming):** one `paintLit` construction for the whole set (2-tone cel, magenta-violet shade, silhouette, hard rim, exp haze). — [engine-cuts/lib/anime/cutscenes/p-tangle/world/materials.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine-cuts/lib/anime/cutscenes/p-tangle/world/materials.js)
- **pr-openxla-46539 (naming):** large `fx/shaders.js` (billboard cylindrical/spherical cards + hashed fire). — [engine-cuts/lib/anime/cutscenes/pr-openxla-46539/fx/shaders.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine-cuts/lib/anime/cutscenes/pr-openxla-46539/fx/shaders.js)
- **pr-polychrom-79 (authored, picture thin):** fx index lists 90+200 portals, volley, Key of the Heavens, Enuma spiral. Director epic still records 3 s and 8 s as exact `rgb(155,25,89)` — "a magenta card, not a sky of gates." — [engine-cuts/lib/anime/cutscenes/pr-polychrom-79/fx/index.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine-cuts/lib/anime/cutscenes/pr-polychrom-79/fx/index.js); [docs/superpowers/specs/2026-10-05-director-epic-design.md](file:///C:/Users/seal/Documents/GitHub/teerthfolio/docs/superpowers/specs/2026-10-05-director-epic-design.md)
- **pr-mujoco-3396 (naming):** fresco dome, painted ground, Wall plates, 960 impostor rank. — [engine-cuts/lib/anime/cutscenes/pr-mujoco-3396/world/index.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine-cuts/lib/anime/cutscenes/pr-mujoco-3396/world/index.js)
- **pr-mujoco-warp-1541 (naming, not a mountain clone):** Namek 5-band dome, 12 cumuli, 3 suns, 484-cell coral floor, 22 ajisa trees. — [engine-cuts/lib/anime/cutscenes/pr-mujoco-warp-1541/world/index.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine-cuts/lib/anime/cutscenes/pr-mujoco-warp-1541/world/index.js)
- **pr-mujoco-3450 (naming):** wasteland + split cloud deck + shaft. Director epic still groups the three Mujo docks as "same mountain / same miss" on the *island* walk, not as identical cutscene GLSL. — [engine-cuts/lib/anime/cutscenes/pr-mujoco-3450/world/index.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine-cuts/lib/anime/cutscenes/pr-mujoco-3450/world/index.js); [director-epic-design.md](file:///C:/Users/seal/Documents/GitHub/teerthfolio/docs/superpowers/specs/2026-10-05-director-epic-design.md)
- **home (naming):** watercolor dock — bleed, pigment bloom, rain, runoff, beacon flames; explicitly no impact/speedlines. — [engine-cuts/lib/anime/cutscenes/home/fx/index.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine-cuts/lib/anime/cutscenes/home/fx/index.js)
- INDEX ranking (worst gap first) still lists Rumbling / Frieza / OPM / spawn / Railgun / Gilgamesh as XL work even though those docks have local shaders. Gap is "literal anime vs current build," not "missing files." — [teerthfolio-wt/scripts/INDEX.md](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/scripts/INDEX.md)
- `p-topological-ml-toolkit/world/geo.js` is a geometry accumulator (`Acc`), not a shader. The dock's look lives in `materials.js` / `sky.js`. — [engine-cuts/lib/anime/cutscenes/p-topological-ml-toolkit/world/geo.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine-cuts/lib/anime/cutscenes/p-topological-ml-toolkit/world/geo.js)

### Inferences
Naming-shader docks (local construction exists; promote or keep): `p-aether-lang`, `p-caustic`, `p-epsilon-hollow`, `p-faraday`, `p-monodromy`, `p-nerve`, `p-resolvent`, `p-separatrix`, `p-tangle`, `home`, `spawn-seal`, `pr-mujoco-3396`, `pr-mujoco-warp-1541`, `pr-mujoco-3450`, `pr-openxla-46539`, `pr-polychrom-79`, `pr-tensorflow-124410`, `pr-triton-kernels-22`, `pr-xnnpack-10801`, `pr-nemo-relay-481`, `pr-highway-3244`, `pr-pyrefly-4180`, `pr-topograph-432`, `p-planimeter`.

Thin in the sense that matters for 1000:
- **Unpromoted:** Araki bullseye + set shader (already specified in NEEDS.md) and most other dock GLSL are not catalog modules.
- **Picture-thin:** `pr-polychrom-79` (magenta plate), `p-aether-lang` (type-led, not flood/core per director epic).
- **Shared-look risk:** island MujoRush trio, not the three cutscene world files (those three worlds are different constructions).
- **`_template`:** stub only.

### Gaps
- Per-dock unique fragment-hash table was not built. A later pass should hash `fragmentShader` / `fs` / `FRAG` strings per dock to mark recolors.
- `pr-highway-3244`, `pr-pyrefly-4180`, `pr-topograph-432`, `p-planimeter`, `p-epsilon-hollow` were tree-listed (they have dedicated glsl/fx files) but their fragment maths was not fully read.

## What does NEEDS.md and RULEBOOK demand?

### Takeaway
RULEBOOK is the builder law: search existing modules first (this branch, then `engine/anime`, then `engine/artist3`), reuse or adapter-wrap, log misses to NEEDS.md, write maths + `fwidth` + luma ≤ 0.92, stay inside one dock layer, cutscenes only. NEEDS.md is almost empty (2 rows) and does not reflect the INDEX bible gap list or the docks' unpromoted shaders.

### Cited Findings
- Rule 1 search order: this branch `lib/anime/{tools,kit,fx,sky,post,style,characters,crowds,sets,materials}` and `catalog.js`; then `git … engine/anime`; then `git … engine/artist3`. Two toolsmiths "adding about 500 modules." — [engine-cuts/lib/anime/cutscenes/RULEBOOK.md](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine-cuts/lib/anime/cutscenes/RULEBOOK.md)
- Rule 2: import if on this branch; if only on a toolsmith branch, write a thin adapter with `// TOOLKIT: <branch>:<path>`; do not copy. Prefer composing noise/SDF/blend/cel/ink/glow/grade. — [RULEBOOK.md](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine-cuts/lib/anime/cutscenes/RULEBOOK.md)
- Rule 3 NEEDS line format: `<module-name> | <dock> | <layer> | <one-line spec> | <S|M|L>`. Canonical names from `scripts/INDEX.md`. — [RULEBOOK.md](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine-cuts/lib/anime/cutscenes/RULEBOOK.md)
- Rule 4 hygiene: maths comment on every shader; AA with `fwidth`; no `#000` ink (use style ink); lit luma ≤ 0.92; expose `meta.params`; one file per element. — [RULEBOOK.md](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine-cuts/lib/anime/cutscenes/RULEBOOK.md)
- Rules 5–8: write only in own dock/layer; never edit `components/world/seal/*`; cameras authored/fixed; seals are chubby pears via `kit/costumed-seal-kit.js` + `pup.js`. — [RULEBOOK.md](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine-cuts/lib/anime/cutscenes/RULEBOOK.md)
- NEEDS.md contents (entire file, 2 lines): `araki-set-shader | pr-tensorflow-124410 | world | 3-step cel + hard diagonal … | M` and `bullseye-sky | pr-tensorflow-124410 | world | 8 rings x 6 deg … | S`. — [engine-cuts/lib/anime/cutscenes/NEEDS.md](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine-cuts/lib/anime/cutscenes/NEEDS.md)
- INDEX "shared modules to build once" still asks for many names that now exist on A (`aura-flame`, `railgun-beam`, `shockwave-dome`, `fire-sheet`, `soul-flame`, `impact-frame`, `time-stop-invert`, `sonic-ring`, `storm-city-lit` as `storm-city-lit`, `cloud-sea`) and B (`costumed-seal`, `anime-eye-decal`, `hair-clump-kit`). Still missing from both catalogs: `susanoo-spirit`, `titan-march-impostor`, `weapon-volley`, `meteor-impact`, `portal-ring`, `stage-crumble`, `glass-shatter-wipe`, `shard-shatter`, `panel-border-tear`, `magic-circle`, `sigil-ring`, `cartoon-bg-painter`, `stand-body`, `jojo-hatch-ink`, `mirror-water-plane`, `field-lines`, `comet-rainbow-tail`, `chess-overlay`, plus the S-list (`heat-shimmer`, `coin-streak`, `tomoe-moon`, `petrify-gradient`, `gold-leaf-matcap`, …). — [teerthfolio-wt/scripts/INDEX.md](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/scripts/INDEX.md)
- INDEX cross-cutting bugs: milky seal (luma > 1), L6b small silhouettes, pocket fog `#d9e7f6`, home restyling the locked hero. — [INDEX.md](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/scripts/INDEX.md)
- CONTRACT owner laws: hero is locked pup; victims are costumed seals; luma ≤ 0.92; protected Aizen / Sukuna / blue Susanoo. — [CONTRACT.md](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine-cuts/lib/anime/cutscenes/CONTRACT.md)
- discover-topology distinctness: name the object (filtration, cover, sheaf, spectrum, …) and the invariant; reject if the proxy only tracks norm/recency or is a recolor. — [discover-topology/SKILL.md](file:///C:/Users/seal/.claude/skills/discover-topology/SKILL.md)

### Inferences
- RULEBOOK's "about 500 modules" from two toolsmiths is an aspiration, not a current COUNT. A=110 shaders, B=41 meshes, together 151 registered units, plus 599 unregistered vendor files.
- NEEDS.md is not a usable backlog. A later fill pass should treat INDEX's L/M/S list + unpromoted dock shaders as the real need list, then append NEEDS lines as RULEBOOK requires.
- Hygiene rules (maths comment, `fwidth`, luma cap, `meta.params`) are the acceptance gate for both the 300 scratch modules and the old-module fill.

### Gaps
- `teerthfolio-wt/scripts/INDEX.md` "canonical names" vs actual catalog names were matched by eye, not a scripted join. A few aliases (`storm-sky-city-lit` vs `storm-city-lit`, `rain-streak` vs `rain-streaks`, `speed-lines` vs two modules) need a name map before fill work.
- RULEBOOK lists `fx/`, `style/`, `characters/`, `crowds/`, `sets/`, `materials/` as search roots on "this branch"; on `engine-cuts` those toolkit dirs (except `kit` and `styles`) are missing.

## After 300 new from scratch, how many old modules still need fill/fix to reach 1000 distinct maths?

### Takeaway
**About 590–620 old modules still need fill or fix** after 300 brand-new distinct constructions. The 110 existing catalog entries are the only official old COUNT; ~15–25 of them are wrappers/families and should be fixed or merged rather than counted again. Vendor 599 and artist3 41 must not be used to close the gap. The first 140 of the old-fill are simply the walk from 110 to the owner's 250 bar.

### Cited Findings
- Owner bar ~250 is written on A's catalog and check. Current registered = 110. Gap to bar = 140. — [engine/lib/anime/catalog.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine/lib/anime/catalog.js); [catalog.check.mjs](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine/lib/anime/catalog.check.mjs)
- 1000 is the assigned distinct-maths target (this research brief). Distinct = different invariant or construction. — assignment; [discover-topology/SKILL.md](file:///C:/Users/seal/.claude/skills/discover-topology/SKILL.md)
- INDEX still lists ~10 L + ~30 M + ~20 S shared names to build once, after aliasing the ones that already exist on A/B. That is a **floor** for old-module fill, not 590. — [INDEX.md](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/scripts/INDEX.md)
- NEEDS.md contributes only 2 named fills, both already implemented dock-locally in `pr-tensorflow-124410`. — [NEEDS.md](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine-cuts/lib/anime/cutscenes/NEEDS.md)
- 41 artist3 modules are mesh factories (`kind: "character"`), verified by headless mesh/bounds checks, not GLSL uniqueness. — [engine-3/lib/anime/catalog.check.mjs](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine-3/lib/anime/catalog.check.mjs); [engine-3/lib/anime/characters/costumed-seal.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine-3/lib/anime/characters/costumed-seal.js)
- 599 vendor files include systematic recolors / inverses (103 colour-space pairs, 125 gl-transitions). Example fade is a `mix` of from/to. — [cs-hcy-to-hsl.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine/lib/anime/vendor-modules/colour/cs-hcy-to-hsl.js); [glt-fade.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine/lib/anime/vendor-modules/transitions/glt-fade.js)
- Cutscene-branch dock GLSL already carries named constructions that are **old code to promote** (Hollow Purple posterise, Susanoo fresnel-fire, bullseye rings, paintLit, Namek bands, fresco rank). Those reduce new-from-scratch demand if they pass a distinctness review. — files cited in the docks section above
- `topology.js` already implements one topological object (H0 superlevel filtration, elder rule, significant Betti). It is not in COUNT and has no GLSL twin. — [engine-cuts/lib/anime/topology.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio-wt/engine-cuts/lib/anime/topology.js)

### Inferences
Arithmetic for a later pass (do not treat vendor/styles/clothes as COUNT):

| Quantity | N | Role |
|---|---|---|
| Target distinct maths | 1000 | assigned |
| Scratch-new (this campaign) | 300 | new invariants / constructions |
| Must come from old pipeline | 700 | 1000 − 300 |
| Official old shader COUNT | 110 | `engine/anime` CATALOG |
| Keepable distinct among those 110 | ~85–95 | after dropping wrappers/families |
| Old still to fill/fix | **590–620** | 700 − keepable |
| of which: gap to owner bar | 140 | 250 − 110 |
| of which: beyond the bar | ~450–480 | 700 − 250, ± wrapper discount |
| INDEX-named missing (aliases stripped) | ~50–70 | first concrete fill list |
| Unpromoted dock naming shaders | unknown, order 20–80 | promote-before-rewrite |
| Vendor files usable as distinct | ~0 | recolor / conversion families |
| Artist3 clothes toward 1000 shaders | 0 | meshes |

Recommended fill order:
1. Promote dock naming shaders that already state a construction (bullseye, Susanoo, Hollow Purple, paintLit, Namek bands, fresco, nerve ceiling) into `defineModule` + list files.
2. Close INDEX L/M/S names that are still missing (`susanoo-spirit`, `portal-ring`, `jojo-hatch-ink`, `meteor-impact`, …).
3. Fix wrappers in the 110 (merge `cel`/`cel-ramp` docs, split only when the construction differs: LUT vs analytic ramp is a real split; `glt-fade` vs `glt-fadecolor` is not).
4. Then add the 300 scratch modules as **new constructions** (filtrations, covers, Reeb/Mapper plates, spectral ramps, sheaf consistency, transport maps) hosted by AnimeEngine, not a second renderer.
5. Remaining old-fill after (1–3) is still hundreds — that is the honest leftover to 1000.

Worked example: if promotion yields 40 dock constructions already distinct, keepable old becomes ~130, and old-still-to-fill drops from ~600 to **~570**. It does not remove the need for the 300 scratch modules.

### Gaps
- Exact keepable-old integer depends on a construction-by-construction review of all 110 + every dock fragment. This note only triaged families.
- Unique dock-local program count (needed to turn "unpromoted" from a range into a number) was not hashed.
- No written owner ruling that vendor-modules are excluded from COUNT; exclusion is inferred from `catalog.js` not importing them and from the distinctness rule.
