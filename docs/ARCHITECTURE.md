# Architecture

This file describes the site as it is on branch `warp/joined` at commit `7d949add`. Every claim names its source: a file with a line number, a commit, or a command. Numbers from measurements carry the build and commit they were taken on. Sentences about the baked backgrounds describe a plan and say so.

## 1. The layers

| Layer | Files | What it owns |
|---|---|---|
| World island | `lib/world/`, `components/world/` | The island, the places, the seal, the camera, the HUD, and the arrival shell in `components/world/cutscene/` |
| Cutscene engine | `lib/anime/`, `components/anime/` | The anime-style cutscene: the engine, its preparation, 25 dock scenes, and the host that plays them over the island |
| Quality | `lib/world/quality.js`, `lib/quality/modes.js` | Five device tiers (T0 to T4) and four render modes |
| Pages and SEO | `app/`, `lib/site.js`, `lib/jsonld.js`, `lib/clarity.js`, `components/Clarity.jsx`, `next.config.mjs` | Routes, metadata, sitemap, robots, JSON-LD, cache headers, and the `/lab` harness pages |
| Data | `data/showcase.json` | The words. `lib/world/places.js:15` imports it; the places are one home, 14 upstream contributions (`lib/world/places.js:122-136`) and 11 lab projects (`lib/world/places.js:141-153`) |

### 1.1 World island

- `components/world/SealGame.jsx:12` loads the 3D scene with `next/dynamic` and `ssr: false`, so the scene chunk is fetched after hydration. `app/page.jsx` renders `SealGame`.
- `components/world/Scene.jsx` only composes the island. Its header (lines 3 to 13) lists the parts, one file each. It mounts one group per place (`Scene.jsx:75-99`); lab sculptures are scaled by `LAB_SCALE = 1.7` (`Scene.jsx:73`).
- Places are data in `lib/world/places.js`: `PLACES` (line 292), `PLACE_BY_ID`, `DISTRICTS` (line 303), `districtAt` (line 307), and `dockPoint` (line 321), the point in front of a building where the seal parks.
- `components/world/Controller.jsx` owns input and calls `warmTick` (line 156). It fires an arrival within `APPROACH_REACH = 7` m of a place (`Controller.jsx:43`).

### 1.2 Cutscene engine

- `lib/anime/live.js` is the one switch. It has no imports. `ENGINE_DOCKS` (line 4) lists 27 ids, `ENGINE_LIVE` (lines 5 to 8) the 15 approved to play on the engine. `engineOwns(id)` (line 13) answers for an arrival; `engineActive(id, fail)` (line 21) is what every R3F consumer reads. The query `?engine=<id>[,<id>]`, `?engine=all` and `?engine=none` overrides the list.
- `lib/anime/cutscenes/index.js` is the lazy registry. `DOCKS` (line 4) lists 25 ids, `hasCut` (line 68) and `loadCut` (line 72) are the entry points. Each dock is two dynamic imports, `scene.js` and `build.js`, so a broken dock rejects only its own promise.
- `lib/anime/engine.js` is `AnimeEngine`, the renderer and composer. It takes its tier table from `lib/world/quality.js` (`engine.js:11`).
- `lib/anime/prep.js` is framework-free preparation: prefetch, the resident engine, the prepared player, and take and release (section 3).
- `components/anime/EngineCut.jsx` is the host. `Scene.jsx:250` mounts it once. At module scope it registers the engine's job with the prewarm queue (`EngineCut.jsx:47`) and configures `prep.js` (`EngineCut.jsx:26-42`). It plays an arrival under an iris.

Two ids are in `ENGINE_DOCKS` but not in the 25-dock registry: `p-asmodeus` (no place on the island) and `the-loop`. `lib/anime/cutscenes/the-loop/` exists and is not listed in `DOCKS`.

### 1.3 Pages and SEO

- Routes at HEAD: `/` (`app/page.jsx`), `/projects/[id]` (`app/projects/[id]/page.jsx`), `/privacy`, and `/lab/*`.
- `app/lab/layout.jsx` sets `robots: { index: false, follow: false }`. The lab tree has 32 page folders under `app/lab/cut/`, 32 under `app/lab/hero/` and one `app/lab/anime` page (counted with `find app/lab -name page.jsx`).
- `app/robots.js` disallows `/lab/`. `app/sitemap.js` lists the home URL and `/projects/<id>` for every place except home.
- `lib/site.js:2` sets `SITE_URL`. `lib/jsonld.js:1-2` imports it and `PROFILE` from `lib/world/places.js`.
- `app/layout.jsx:42` mounts `Clarity`. The Cloudflare beacon (`app/layout.jsx:43-46`) uses `strategy="lazyOnload"`.
- `next.config.mjs`, the `headers()` function, sets the cache rules: `/plates/f/:file` immutable for a year, `/plates/m/:file` for five minutes with stale-while-revalidate, `/org/:file` and `/fonts/:file` for one day.

## 2. Import rules

Measured by a node script that walks `lib/` and `components/` (1,785 files, 4,487 import edges; relative and dynamic specifiers resolved, bare package names skipped). Layers: world is `lib/world` plus `components/world`; anime is `lib/anime` plus `components/anime`; quality is `lib/quality`; shared is everything else.

| From to | Static edges | Dynamic edges |
|---|---|---|
| anime to world | 120 | 6 |
| anime to shared | 59 | 9 |
| world to anime | 9 | 0 |
| world to quality | 3 | 0 |
| anime to quality | 1 | 0 |
| world to shared | 3 | 0 |
| shared to world | 1 | 0 |

The graph shows these rules.

1. The world reaches the engine through two doors. Eight world files import `lib/anime/live.js`: `components/world/CameraRig.jsx`, `cutscene/Cutscene.jsx`, `cutscene/FrameGuard.jsx`, `cutscene/prewarm.js`, `Hud.jsx`, `seal/variants/D.jsx`, `Seal.jsx` and `Sound.jsx`. `Scene.jsx:42` imports `components/anime/EngineCut.jsx`. No other world file imports anime code.
2. The host reaches back only for the place list, the store and the prewarm registry. `EngineCut.jsx` imports `lib/world/places.js`, `lib/world/store.js` and `components/world/cutscene/prewarm.js`. The prewarm module never imports the engine; the seam is a registry, `registerEngineProvider` (`prewarm.js:34`), that the host calls at load time.
3. The engine core reads the tier table, not the modes. `lib/anime/engine.js:11` and `lib/anime/governor.js:15` import `lib/world/quality.js`. `lib/quality/modes.js` is imported by `EngineCut.jsx:11` (`modeForTier` for the engine's mode) and by three world land components: `components/world/land/GoogleRange.jsx`, `IceDam.jsx` and `SaltFlat.jsx`.
4. Cutscene content reads world geometry. The 120 static anime-to-world edges sit almost all in `lib/anime/cutscenes/<dock>/world/island.js` and `cast/pup.js`. They import `lib/world/terrain.js`, `places.js`, `land.js`, `river.js`, `highwayCars.js`, `lib/world/cutscene/clock.js`, `components/world/seal/variants/D-parts.js`, and the parts under `components/world/land/parts/` and `components/world/monuments/parts/`.
5. `lib/quality/modes.js` and `lib/anime/live.js` import nothing, so either side may import them without pulling in three.js or React.
6. Shared code touches the world in two places. `lib/jsonld.js` imports `lib/world/places.js`. `lib/world/places.js`, `lib/world/awakening.js` and `components/world/Hud.jsx` import `data/showcase.json`, which the script counts as shared.

Edges the graph contains but the production path does not use:

- 68 anime-to-shared edges go to `scripts/cut-cap.mjs` (27), `scripts/cut-lock.mjs` (26) and `scripts/cut-serve.mjs` (15). They come from the capture harness `lib/anime/tools/cuts/*/livecam.mjs` and `lib/anime/kit/bg/bg-cost.mjs`.
- 20 relative specifiers in `lib/anime/layers/`, `lib/anime/poly/` and `lib/anime/tools/` name paths that do not exist on disk. For example `lib/anime/tools/jjk/define.js` imports `./tools/jjk/index.js`. The script does not say whether any of them runs at boot or at arrival. They were not traced or repaired here.

## 3. The loading path

Each stage names its source. Numbers in the table are from the build measured at commit `beff5e24`, not from HEAD.

### 3.1 Stages

0. Document. One HTML document of 18.6 KB gzip, one blocking stylesheet of 10.4 KB, and initial scripts of 449 KB gzip (`.oneshot/warp/LOAD-ANALYSIS.md`, section 2). About 235 KB gzip of three.js sits in the initial scripts, because `components/world/Hud.jsx:21` imports `replayArrival` from `Controller.jsx`, which imports react-three-fiber and three.
1. Scene chunk. `SealGame.jsx:12` fetches it after hydration: 657 KB gzip, 2,016 KB raw at `beff5e24`. It holds the island, Look and post-processing, and the 25 R3F arrival moves. At HEAD `components/world/cutscene/moves/index.js` still imports all 25 statically (section 6).
2. Mount and curtain. `Scene.jsx` mounts the Canvas (line 206). `FirstFrame` (lines 110 to 160) compiles every program behind the curtain (`gl.compileAsync`, capped at 8 s, line 147). The curtain lifts once the program count has been still for 700 ms and `warmPending()` is false, or at the 14 s cap (line 155). The tier audition is capped at `WARMUP_MS = 6000` (line 106).
3. Prewarm queue. `Controller.jsx:156` calls `warmTick` on every tick, and `warmTick` (`components/world/cutscene/prewarm.js:117`) runs at most one unit of work per call. `warmStep` (`prewarm.js:166`) collects three kinds of job and sorts them by deadline:
   - a dock's R3F world, built by a `registerWarm` builder; skipped when the engine owns the dock (`prewarm.js:175`);
   - a lazy move chunk, through `registerLoader` (`prewarm.js:30`); no caller exists at HEAD;
   - an engine job, through `registerEngineProvider` (`prewarm.js:34`).
   The deadline is `deadlineS` in `lib/world/cutscene/deadline.js`: the seconds for the seal to reach the dock's arrival ring at 15 m/s, which is `MOTION.maxSpeed` (10) times `MOTION.boost` (1.5) from `lib/world/motion.js:21-22`. The window is `CRITICAL_S = 3` before ready (`SPAWN_CRITICAL_S = 12` for the spawn statue), `HORIZON_S = 8` after ready, and `DROP_S = 12` to dispose a built world (`deadline.js`). `warmPending()` (`prewarm.js:202`) holds the curtain only while a critical dock is unfinished, and only for `PENDING_MS = 8000` after navigation start (`prewarm.js:22`).
4. Engine job. Before ready, the engine job calls `prep.preload()` (registry, framework and engine modules) and yields idle (`EngineCut.jsx:53`). After ready it calls `prep.prepare(dock)` (`EngineCut.jsx:58`), which runs `run` in `lib/anime/prep.js:79`:
   - `prefetch` imports the dock's `scene.js` and `build.js` (`prep.js:32`);
   - `spin` creates the resident engine on a detached 1x1 canvas (`prep.js:48`), only when `hotAllowed` holds (`prep.js:10`): `deviceMemory` is at least `HOT_MIN_MEMORY_GB = 4` or unreported, `saveData` is off, and `?hot=off` is absent;
   - the player's `initSteps` run in slices of at most `SLICE_MS = 50` (`prep.js:7`, `sliced` at line 131);
   - `compile` links the programs with `compileAsync` (`EngineCut.jsx:36`).
   A failed prepare sets `engineFail[place]` at once (`EngineCut.jsx:58`, `markEngineFail` at line 74), so the R3F move can start warming while the seal walks.
5. Arrival. `Cutscene.jsx:38-39` mounts an R3F move only when `engineActive` is false. `EngineRun` (`EngineCut.jsx:76`) calls `prep.take(dock)` (`prep.js:105`). A null result runs the cold path: a new engine, a new player, `init`, and `compileAsync`. `ENGINE_START_MS = 8000` (`EngineCut.jsx:18`) bounds the wait for a first frame; past it the dock fails to its R3F move (`EngineCut.jsx:91`). The iris opens as a `clip-path` on the host (`EngineCut.jsx:127`). `live.engineCover` is set once the iris is fully open (`EngineCut.jsx:128`), and `FrameGuard.jsx:404-405` skips its foreground and occlusion probes while the flag is set.
6. End. `release(dock)` (`prep.js:115`) disposes the player and resizes the resident engine back to 1x1, keeping its context (`EngineCut.jsx:147`). The cold path disposes the player and forces context loss (`EngineCut.jsx:149-150`).

Fallback chain, checked at every arrival: a prepared player; a cold engine start; the R3F move for docks that have one; nothing for the two engine-only docks, `pr-anyps5-12609` and `pr-tensorflow-128930` (their entries in `lib/anime/cutscenes/index.js` read "engine-only arrival, no R3F move").

### 3.2 Module contracts

- `lib/world/cutscene/deadline.js`: `deadlineS(seal, dock)` and the constants above. Pure.
- `components/world/cutscene/prewarm.js`: `registerWarm`, `takeWarm`, `warmTick`, `warmPending`, and the seams `registerLoader(id, load)` and `registerEngineProvider(p)`.
- `lib/anime/prep.js`: `configure`, `status`, `readiness`, `preload`, `prefetch`, `spin`, `prepare`, `take`, `release`, `drop`.
- `components/anime/EngineCut.jsx`: the `EngineCut()` export and `markEngineFail(place)`.

### 3.3 Measured baseline (commit `beff5e24`, build `azo1Wp8Ep9_EweAZ7x_x3`)

Source: `.oneshot/warp/LOAD-ANALYSIS.md` section 2 and `.oneshot/warp/ARCHITECTURE-PLAN.md` section 1. Three runs per adapter, real Chrome, cold cache, 16 GB hybrid laptop with about 35% background CPU. Intel and RTX figures are never compared with each other.

| Metric | Intel UHD | RTX 4060 |
|---|---|---|
| Curtain lift (`__world.ready`), median of 3 | 17.0 s | 16.3 s |
| Programs linked at ready | 180, 181 | 190, 192 |
| Curtain lift with the whole queue off (`?hud=off`) | 5.40 s, 5.53 s (112 programs) | not run |
| Key to the engine's first frame, `home` | 3.50 s, 2.62 s | 5.46 s, 5.81 s |
| Engine chunks after the arrival fires | 20 requests, 519,623 B gzip | same |
| Arrival frame p95 | 83.2 ms | 33.4 ms |

The gate for these numbers is in `docs/TESTING.md`, section "Load gate" (line 12). Its targets T1 to T19 are listed with every row marked "pending". No HEAD measurement is recorded in the repository.

## 4. The render modes

`lib/world/quality.js` holds the five tiers: `TIERS` (line 28), each with a pixel budget `mpx`. `classify(renderer)` (line 54) guesses the tier from the WebGL renderer string and returns 2 when nothing matches. `lib/quality/modes.js` maps each tier to one of four modes (`BY_TIER`, line 3) and lists what each mode enables (`FEATURES`, lines 5 to 10).

| Tier | Name in `quality.js` | Mode | Pixel budget | plates | shaders | heavy | live |
|---|---|---|---|---|---|---|---|
| T0 | potato | low | 0.6 Mpx | yes | no | no | no |
| T1 | weak iGPU | low | 0.9 Mpx | yes | no | no | no |
| T2 | good iGPU | good | 2.2 Mpx | yes | yes | no | no |
| T3 | discrete mid | medium | 5.2 Mpx | yes | yes | yes | no |
| T4 | top | best | 9 Mpx | yes | yes | yes | yes |

Notes on the modes:

- The `plates` flag has no reader in `lib/` or `components/` at HEAD. The only plate switch in the engine is per dock: `engine.composer.plates = data.plates !== false` (`lib/anime/cutscenes/framework.js:144`).
- The engine prepares a dock only above LOW. `prep.js` `run` returns null when `deps.modeOf(engine) === "low"`, so T0 and T1 take the cold path at arrival. `modeOf` is `modeForTier(engine.tier)` (`EngineCut.jsx:39`).
- `Scene.jsx` may step a tier down during the first-frame audition (`Scene.jsx:123-133`).

## 5. Baked backgrounds: a plan, not built

`.oneshot/warp/BAKE-DESIGN.md` is a design. Nothing in this section is built at HEAD.

The plan, as the design states it:

- Bake the held-shot world, not the whole cutscene. 11 of the 16 target docks hold the camera in every shot (`BAKE-DESIGN.md` verdict, item 1).
- A plate is three files: colour as AVIF at quality 55 in 4:4:4, and id with lines and depth as lossless WebP (verdict items 2 and 3).
- Two sets: `s` at 960x540 for LOW (T0, T1) and `h` at 1920x1080 for GOOD, MEDIUM and BEST (section 2.4).
- Budget: 80 MB for `public/plates`, 1.2 MB per dock for `s` and 3.5 MB per dock for `h` (section 7).
- The loader never blocks. A missing or late plate runs the live bake, as today (verdict item 5, section 5.3).
- Default for LOW: an engine cutscene plays only when its baked coverage is at least 0.90; the constant is `COVERAGE_MIN` in `lib/anime/bake/coverage.js` (verdict, last paragraph).

Status at HEAD:

- `lib/anime/bake/` does not exist. No file in `lib/` or `components/` defines or reads `bakedPlateKey` or `applyBaked`.
- In this worktree `public/plates/` (with `manifest.json`), `scripts/bake-plates.mjs` and `scripts/cut-cap.mjs` (modified) are uncommitted. They are output of work in progress. They are not a loader.

## 6. The plan against the code at HEAD

Packages are named in `.oneshot/warp/ARCHITECTURE-PLAN.md` section 5. "Done in code" means the code path exists at `7d949add`; it does not mean the target was measured.

| Package | State at `7d949add` | Where |
|---|---|---|
| WP1 deadline queue, measuring tool | Done in code | `lib/world/cutscene/deadline.js`, `components/world/cutscene/prewarm.js:117-212`, `scripts/cut-load.mjs` |
| WP2 prep, resident engine, start guard | Done in code. The per-layer table that decides `LEVEL_1` is empty | `lib/anime/prep.js:8` (`LEVEL_1`), `components/anime/EngineCut.jsx:18, 47-64, 91` |
| WP3 R3F moves out of the scene chunk | Not done | `components/world/cutscene/moves/index.js` imports 25 moves statically; `registerLoader` has no caller |
| WP4 island stops raycasting under engine cover | Done in code. The frameloop pause in `NEEDS-FROM-ISLAND.md` is not done | `components/world/cutscene/FrameGuard.jsx:404-405`, flag at `EngineCut.jsx:128` |
| WP5 headers, robots, beacon | Done in part. `public/llms.txt` changed by 4 lines in `7d949add` | `next.config.mjs` headers, `app/robots.js`, `app/layout.jsx:43-46`, `app/lab/layout.jsx` |
| WP6 the awakening as an engine cutscene | Not done | `lib/anime/cutscenes/the-loop/` exists; it is not in `DOCKS` (`lib/anime/cutscenes/index.js:4`); `live.js` has no alias |
| WP7 generated lab routes as dynamic routes | Not done | 32 `cut` and 32 `hero` page folders remain under `app/lab/` |
| WP8 registries, check repair, docs | Partly. The doc gate table is in `docs/TESTING.md` | `docs/TESTING.md:12` onward |
| Bake packages B1 to B8 | Not started in `lib/` | section 5 |

## 7. Notes for a later reader

- The baseline in section 3.3 is from `beff5e24`. HEAD is `7d949add`, and the plan was written against `92b05e49`. Re-measure with `node scripts/cut-load.mjs` before quoting any number from this file as current.
- The lab counts differ by source. The build at `beff5e24` emitted 38 hero routes and 70 lab routes (`LOAD-ANALYSIS.md` section 2; `ARCHITECTURE-PLAN.md` T19). The tree at HEAD has 32 hero folders.
- This file replaces the 68-line version committed earlier in `7d949add`. Its "Cutscene loading" content is now sections 3.1 and 3.2. Its line that said `moves/index.js` exports `MOVE_LOADERS` described WP3, which is not in the code.
- Uncommitted items in this worktree when this file was written: `scripts/bake-plates.mjs`, `scripts/jolly.mjs`, `public/plates/`, `undefined/` and the modified `scripts/cut-cap.mjs`. The commit for this file does not include them. The `undefined/` folder at the worktree root looks like a path built from an unset value; no code read here refers to it.
- For checks, see [TESTING.md](TESTING.md). The import graph in section 2 came from a one-off node script over `lib/` and `components/`; it is not committed.
