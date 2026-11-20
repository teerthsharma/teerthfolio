# Architecture

This file describes the site as it is at commit `4665f65` on branch `feat/missing-occlusion-features-73446b`, the HEAD this file was written against. Every claim names its source: a file with a line number, a commit, or a command. Numbers from measurements carry the build and commit they were taken on. Sentences about the baked backgrounds describe a plan and say so.

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
- `components/world/Controller.jsx` owns input and calls `warmTick` (line 103). It fires an arrival within `APPROACH_REACH = 7` m of a place (`Controller.jsx:43`).

### 1.2 Cutscene engine

- `lib/anime/live.js` is the one switch. It has no imports. `ENGINE_DOCKS` (line 4) lists 27 ids, `ENGINE_LIVE` (lines 5 to 8) the 15 approved to play on the engine. `engineOwns(id)` (line 13) answers for an arrival; `engineActive(id, fail)` (line 21) is what every R3F consumer reads. The query `?engine=<id>[,<id>]`, `?engine=all` and `?engine=none` overrides the list.
- `lib/anime/cutscenes/index.js` is the lazy registry. `DOCKS` (line 4) lists 25 ids, `hasCut` (line 68) and `loadCut` (line 72) are the entry points. Each dock is two dynamic imports, `scene.js` and `build.js`, so a broken dock rejects only its own promise.
- `lib/anime/engine.js` is `AnimeEngine`, the renderer and composer. It takes its tier table from `lib/world/quality.js` (`engine.js:11`).
- `lib/anime/prep.js` is framework-free preparation: prefetch, the resident engine, the prepared player, and take and release (section 3).
- `components/anime/EngineCut.jsx` is the host. `Scene.jsx:250` mounts it once. At module scope it configures `prep.js` (`EngineCut.jsx:28-44`) and registers the engine's job with the prewarm queue (`EngineCut.jsx:49-66`). It plays an arrival under an iris.

Two ids are in `ENGINE_DOCKS` but not in the 25-dock registry: `p-asmodeus` (no place on the island) and `the-loop`. `lib/anime/cutscenes/the-loop/` exists and is not listed in `DOCKS`.

### 1.3 Pages and SEO

- Routes at HEAD: `/` (`app/page.jsx`), `/projects/[id]` (`app/projects/[id]/page.jsx`), `/privacy`, and `/lab/anime`. The tracked `app/lab/` holds `layout.jsx` and `anime/page.jsx` and nothing else (`find app/lab -type f`).
- `app/lab/layout.jsx` sets `robots: { index: false, follow: false }` (line 2). `scripts/lab-routes.mjs` writes one dev-only page per cutscene under `app/lab/cut/<name>/page.jsx` and one per hero look under `app/lab/hero/<id>/page.jsx`. Those folders are untracked, so a fresh checkout has neither. The query route to a cutscene is `/lab/anime?cut=<dock>&t=<s>` (`lib/anime/cutscenes/index.js:3`). The 32-and-32 folder count this file carried before is not reproduced at HEAD and is not a tracked fact.
- `app/robots.js` disallows `/lab/`. `app/sitemap.js` lists the home URL and `/projects/<id>` for every place except home.
- `lib/site.js:2` sets `SITE_URL`. `lib/jsonld.js:1-2` imports it and `PROFILE` from `lib/world/places.js`.
- `app/layout.jsx:42` mounts `Clarity`. The Cloudflare beacon (`app/layout.jsx:43-46`) uses `strategy="lazyOnload"`.
- `next.config.mjs`, the `headers()` function, sets the cache rules: `/plates/f/:file` immutable for a year, `/plates/m/:file` for five minutes with stale-while-revalidate, `/org/:file` and `/fonts/:file` for one day.

## 2. Import rules

Measured by a node script that walks `lib/` and `components/` (1,785 files, 4,487 import edges; relative and dynamic specifiers resolved, bare package names skipped). Layers: world is `lib/world` plus `components/world`; anime is `lib/anime` plus `components/anime`; quality is `lib/quality`; shared is everything else. The script was run when this file described `7d949add`. It was not re-run for this edit, so the counts are the `7d949add` counts; the edges that changed since are named in items 2 and 3.

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
2. The host reaches back only for the place list, the store and the prewarm registry. `EngineCut.jsx` imports `lib/world/places.js`, `lib/world/store.js`, `lib/world/quality.js` (line 12, for `classify`, added by `ac2e401`) and `components/world/cutscene/prewarm.js`. The prewarm module never imports the engine; the seam is a registry, `registerEngineProvider` (`prewarm.js:34`), that the host calls at load time.
3. The engine core reads the tier table, not the modes. `lib/anime/engine.js:11` and `lib/anime/governor.js:15` import `lib/world/quality.js`. `lib/quality/modes.js` is imported by `EngineCut.jsx:11` (`modeForTier` for the engine's mode) and by three world land components: `components/world/land/GoogleRange.jsx`, `IceDam.jsx` and `SaltFlat.jsx`.
4. Cutscene content reads world geometry. The 120 static anime-to-world edges sit almost all in `lib/anime/cutscenes/<dock>/world/island.js` and `cast/pup.js`. They import `lib/world/terrain.js`, `places.js`, `land.js`, `river.js`, `highwayCars.js`, `lib/world/cutscene/clock.js`, `components/world/seal/variants/D-parts.js`, and the parts under `components/world/land/parts/` and `components/world/monuments/parts/`.
5. `lib/quality/modes.js` and `lib/anime/live.js` import nothing, so either side may import them without pulling in three.js or React.
6. Shared code touches the world in two places. `lib/jsonld.js` imports `lib/world/places.js`. `lib/world/places.js`, `lib/world/awakening.js` and `components/world/Hud.jsx` import `data/showcase.json`, which the script counts as shared.

Edges the graph contains but the production path does not use:

- 68 anime-to-shared edges go to `scripts/cut-cap.mjs` (27), `scripts/cut-lock.mjs` (26) and `scripts/cut-serve.mjs` (15). They come from the capture harness `lib/anime/tools/cuts/*/livecam.mjs` and `lib/anime/kit/bg/bg-cost.mjs`.
- 20 relative specifiers in `lib/anime/layers/`, `lib/anime/poly/` and `lib/anime/tools/` name paths that do not exist on disk. For example `lib/anime/tools/jjk/define.js` imports `./tools/jjk/index.js`. The script does not say whether any of them runs at boot or at arrival. They were not traced or repaired here.

## 3. The loading path

Each stage names its source. Numbers marked `beff5e24` are from that commit, not from HEAD; sections 3.4 and 3.5 hold the measurements taken since.

### 3.1 Stages

0. Document. One HTML document of 18.6 KB gzip, one blocking stylesheet of 10.4 KB, and initial scripts of 449 KB gzip (`.oneshot/warp/LOAD-ANALYSIS.md`, section 2; measured at `beff5e24`). The initial scripts include the HUD: `SealGame.jsx:10` imports `Hud`, and `Hud.jsx:21` now imports `replayArrival` from `components/world/replay.js:44`, not from `Controller.jsx`. `replay.js` states it has no three or R3F imports (line 2). three.js still reaches the initial chunk through two HUD parts: `components/world/ui/Bubbles.jsx:15` and `ui/AwakeningLayer.jsx:14` import `Vector3` from `three`. The 235 KB gzip of three.js in the `beff5e24` figure is not re-measured at HEAD.
1. Scene chunk. `SealGame.jsx:12` fetches it after hydration: 657 KB gzip, 2,016 KB raw at `beff5e24`. It holds the island, Look and post-processing. The 25 R3F arrival moves are not in it: `components/world/cutscene/moves/index.js` imports each move with a dynamic `import()` (lines 6 to 32), and no move file is imported statically. The exceptions are the p-caustic parts that `cutscene/kit.jsx:25` and `cutscene/PupUpright.jsx:12` import, which are not move files.
2. Mount and curtain. `Scene.jsx` mounts the Canvas (line 206). `FirstFrame` (lines 110 to 160) runs the boot compile (lines 135 to 150): `gl.compileAsync` (line 145), capped at 8 s (line 147). The curtain lifts once the program count has been still for 700 ms and `warmPending()` is false, or at the 14 s cap (line 155). The comment above that line (line 152) still says 10 s; the code uses 14 s. The tier audition is capped at `WARMUP_MS = 6000` (line 106). `components/world/Look.jsx:209` mounts `N8AO` when `rung.ao && (ready || tierFrom === "guess")`: after ready, or before ready while the rung is only a guess. A pinned or remembered rung waits for ready.
3. Prewarm queue. `Controller.jsx:103` calls `warmTick` on every tick (every 0.1 s, per `prewarm.js:3-4`). `warmTick` (`components/world/cutscene/prewarm.js:117`) runs at most one unit of work per call. `warmStep` (`prewarm.js:176`) first starts every eligible lazy move chunk (line 178; `startLoad`, line 163, runs the import asynchronously, so it never takes the tick). It then collects three kinds of job, sorts them by deadline (line 203), and runs the first that takes the tick:
   - a dock's R3F world, built by a `registerWarm` builder (`prewarm.js:26`). A dock the seal has seen, or the engine owns, is skipped (line 186). Twenty move files call `registerWarm` at module scope; `p-faraday.jsx:30` is guarded by `APPROVED`.
   - a lazy move chunk, through `registerLoader` (`prewarm.js:30`). `components/world/cutscene/moves/index.js:43` registers 23 of the 25 loaders, every id whose card has no `plays`. `pr-mujoco-warp-1541` and `pr-mujoco-3450` play Mount MujoRush's scene through `pr-mujoco-3396` (`lib/world/cutscene/cards/pr-mujoco-warp-1541.js:5`, `pr-mujoco-3450.js:5`), so they register no loader. `cardFor` is `lib/world/cutscene/cards/index.js:70`.
   - an engine job, through `registerEngineProvider` (`prewarm.js:34`). It is skipped for a seen dock (line 196). It yields while another due, unfinished engine job is already started (line 199), so one prepare runs at a time.

   `eligible` (`prewarm.js:131`) is the one test for both a loader's start (line 178) and the curtain hold (line 219). The deadline is `deadlineS` in `lib/world/cutscene/deadline.js`: the seconds for the seal to reach the dock's arrival ring at 15 m/s, which is `MOTION.maxSpeed` (10) times `MOTION.boost` (1.5) from `lib/world/motion.js:21-22`. The window is `CRITICAL_S = 1.6` before ready (`deadline.js:7`; `SPAWN_CRITICAL_S = 12` for the spawn statue, line 8), `HORIZON_S = 8` after ready (line 9), and `DROP_S = 12` to dispose a built world (line 10). `warmPending()` (`prewarm.js:209`) holds the curtain while a critical dock is unfinished (lines 213 to 218) or an eligible lazy chunk is still to load (line 219), and only for `PENDING_MS = 8000` after navigation start (`prewarm.js:22`). Engine jobs never hold it (comment at line 208).
4. Engine job. Before ready, the engine job calls `prep.preload()` (registry, framework and engine modules) and answers idle (`EngineCut.jsx:55`). After ready it calls `prep.prepare(dock)` (`EngineCut.jsx:60`), which runs `run` in `lib/anime/prep.js:79`:
   - `prefetch` imports the dock's `scene.js` and `build.js` (`prep.js:32`);
   - `spin` creates the resident engine on a detached 1x1 canvas (`prep.js:48`), only when `hotAllowed` holds (`prep.js:10`): `deviceMemory` is at least `HOT_MIN_MEMORY_GB = 4` or unreported, `saveData` is off, and `?hot=off` is absent. The same `off` input is also set for a GPU that classifies as low mode (`EngineCut.jsx:29`, `modeForTier(classify(window.__world?.gpu)) === "low"`), so a low-mode GPU spins no resident engine. That check is commit `ac2e401`; the measured trees in section 3.5 predate it;
   - the player's `initSteps` run in slices of at most `SLICE_MS = 50` (`prep.js:7`, `sliced` at line 131);
   - `compile` links the programs with `compileAsync` (`EngineCut.jsx:38`).
   `run` returns null, and the arrival takes the cold path, when `deps.modeOf(engine)` is `low` (`prep.js:84`; `modeOf` is `EngineCut.jsx:41`).
   A failed prepare sets `engineFail[place]` at once (`EngineCut.jsx:60`, `markEngineFail` at line 76), so the R3F move can start warming while the seal walks.
5. Arrival. `Cutscene.jsx:38-39` mounts an R3F move only when `engineActive` is false. `EngineRun` (`EngineCut.jsx:78`) calls `prep.take(dock)` (`EngineCut.jsx:99`; `prep.js:105`). A null result runs the cold path: a new engine, a new player, `init`, and `compileAsync` (`EngineCut.jsx:107-116`). `ENGINE_START_MS = 8000` (`EngineCut.jsx:20`) bounds the wait for a first frame; the guard at line 93 calls `fail` (lines 84 to 92), which hands the dock to its R3F move. The iris opens as a `clip-path` on the host (`EngineCut.jsx:129`). `live.engineCover` is set once the iris is fully open (`EngineCut.jsx:130`), and `FrameGuard.jsx:404-405` skips its foreground and occlusion probes while the flag is set.
6. End. `release(dock)` (`prep.js:115`) disposes the player and resizes the resident engine back to 1x1, keeping its context (`EngineCut.jsx:149`). The cold path disposes the player and forces context loss (`EngineCut.jsx:151-152`).

Fallback chain, checked at every arrival: a prepared player; a cold engine start; the R3F move for docks that have one; nothing for the two engine-only docks, `pr-anyps5-12609` and `pr-tensorflow-128930` (their entries in `lib/anime/cutscenes/index.js:29-30` read "engine-only arrival, no R3F move").

### 3.2 Module contracts

- `lib/world/cutscene/deadline.js`: `deadlineS(seal, dock)` and the constants above. Pure.
- `components/world/cutscene/prewarm.js`: `registerWarm`, `takeWarm`, `warmTick`, `warmPending`, and the seams `registerLoader(id, load)` and `registerEngineProvider(p)`.
- `components/world/cutscene/moves/index.js`: `getMove(id)`, `loadMove(id)`, and the module-scope loop that registers the loaders (line 43). The table of 25 imports is `LOAD` (line 6) and is not exported.
- `components/world/replay.js`: `replayArrival(id)` (line 44), `playsAs`, `seeAll`, `saveSeen`. Data and store access only.
- `lib/anime/prep.js`: `configure`, `status`, `readiness`, `preload`, `prefetch`, `spin`, `prepare`, `take`, `release`, `drop`.
- `components/anime/EngineCut.jsx`: the `EngineCut()` export and `markEngineFail(place)` (line 76).

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

The gate for these numbers is in `docs/TESTING.md`, section "Load gate" (line 12). Its targets T1 to T19 are listed with every row marked "pending". Sections 3.4 and 3.5 hold the measurements taken after this table.

### 3.4 Measured at 43f71f7 and at dc2677d

Sources, all under `verification/topo/` in the `missing-occlusion-features-73446b` worktree:

- `e0-base/E0.md`: clean build `TwQyQTfPSElzAK7Sre8bB`, commit `43f71f7`.
- `e0-after/E0.md`: clean build `xl95r3TCKX4PmaI3iCtFd`, merged tree `dc2677d`.
- `e0-base-walk2/E0.md`: walk only, commit `43f71f7`.
- `e0-after-walk2/E0.md`: walk only, commit `8f14a0b`. Its `components`, `lib` and `app` files are identical to those of `dc2677d`; the commits between them touch no file under those three folders.
- `e0-b5/E0.md`: clean build `OXWyqefPtAVV6yagI47h8`, commit `f2f2911`, a trial with one more change. It is not merged and is not an ancestor of HEAD.

The app code differs between `43f71f7` and `dc2677d` by these commits, which the before and after rows therefore measure together: the lazy move loaders (`0bed069`, `fb49afc`), `replayArrival` moved out of `Controller.jsx` (`10694e0`), `CRITICAL_S` from 3 to 1.6 (`e29b554`), N8AO mounted after ready (`e07f96a`, `59d00cb`), the shared prewarm queue with loaders started first and one eligibility test (`3586131`, `29fc0d5`), and `p-faraday` on the queue (`2027a83`).

Each boot row is three cold launches per adapter. Each walk row is `perf-frames --phase memory --secs 20`, the walk that holds every dock seen. The walk table prints p95 as a median over runs with the min-max range in brackets; p50, p99 and max are single values as printed. Intel UHD (integrated/low, fill-bound) and RTX 4060 Laptop (discrete/high) are never compared with each other; each row names its adapter string.

Curtain lift and programs at ready (`readyMs` median and min-max; programs at ready median and min-max; measured, 3 cold launches each):

| Build | Adapter | Control | Curtain lift, ms | Programs at ready |
|---|---|---|---|---|
| `43f71f7` | ANGLE (Intel, Intel(R) UHD Graphics (0x0000A788) Direct3D11 vs_5_0 ps_5_0, D3D11) | default | 13511 (13369-14216) | 144 (144-144) |
| `43f71f7` | ANGLE (Intel, Intel(R) UHD Graphics (0x0000A788) Direct3D11 vs_5_0 ps_5_0, D3D11) | `?hud=off` | 8567 (8539-9049) | 90 (90-111) |
| `43f71f7` | ANGLE (Intel, Intel(R) UHD Graphics (0x0000A788) Direct3D11 vs_5_0 ps_5_0, D3D11) | E0c delta, default minus `?hud=off` | +4944 | +54 |
| `43f71f7` | ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Laptop GPU (0x000028E0) Direct3D11 vs_5_0 ps_5_0, D3D11) | default | 13796 (13549-13884) | 138 (138-138) |
| `43f71f7` | ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Laptop GPU (0x000028E0) Direct3D11 vs_5_0 ps_5_0, D3D11) | `?hud=off` | 8656 (8523-8662) | 102 (102-123) |
| `43f71f7` | ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Laptop GPU (0x000028E0) Direct3D11 vs_5_0 ps_5_0, D3D11) | E0c delta, default minus `?hud=off` | +5140 | +36 |
| `dc2677d` | ANGLE (Intel, Intel(R) UHD Graphics (0x0000A788) Direct3D11 vs_5_0 ps_5_0, D3D11) | default | 11685 (11531-12139) | 109 (109-109) |
| `dc2677d` | ANGLE (Intel, Intel(R) UHD Graphics (0x0000A788) Direct3D11 vs_5_0 ps_5_0, D3D11) | `?hud=off` | 8576 (8542-8990) | 90 (90-90) |
| `dc2677d` | ANGLE (Intel, Intel(R) UHD Graphics (0x0000A788) Direct3D11 vs_5_0 ps_5_0, D3D11) | E0c delta, default minus `?hud=off` | +3109 | +19 |
| `dc2677d` | ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Laptop GPU (0x000028E0) Direct3D11 vs_5_0 ps_5_0, D3D11) | default | 11656 (11485-12030) | 124 (124-124) |
| `dc2677d` | ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Laptop GPU (0x000028E0) Direct3D11 vs_5_0 ps_5_0, D3D11) | `?hud=off` | 8594 (8415-9248) | 102 (102-105) |
| `dc2677d` | ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Laptop GPU (0x000028E0) Direct3D11 vs_5_0 ps_5_0, D3D11) | E0c delta, default minus `?hud=off` | +3062 | +22 |
| `f2f2911` (trial, not merged) | ANGLE (Intel, Intel(R) UHD Graphics (0x0000A788) Direct3D11 vs_5_0 ps_5_0, D3D11) | default | 11618 (11509-11793) | 99 (99-101) |
| `f2f2911` (trial, not merged) | ANGLE (Intel, Intel(R) UHD Graphics (0x0000A788) Direct3D11 vs_5_0 ps_5_0, D3D11) | `?hud=off` | 8748 (8680-8808) | 80 (80-80) |
| `f2f2911` (trial, not merged) | ANGLE (Intel, Intel(R) UHD Graphics (0x0000A788) Direct3D11 vs_5_0 ps_5_0, D3D11) | E0c delta, default minus `?hud=off` | +2870 | +19 |
| `f2f2911` (trial, not merged) | ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Laptop GPU (0x000028E0) Direct3D11 vs_5_0 ps_5_0, D3D11) | default | 11583 (11075-11776) | 114 (114-114) |
| `f2f2911` (trial, not merged) | ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Laptop GPU (0x000028E0) Direct3D11 vs_5_0 ps_5_0, D3D11) | `?hud=off` | 8464 (8384-8726) | 92 (92-95) |
| `f2f2911` (trial, not merged) | ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Laptop GPU (0x000028E0) Direct3D11 vs_5_0 ps_5_0, D3D11) | E0c delta, default minus `?hud=off` | +3119 | +22 |

Walk (20 s window, one key cycle W D S A; four walk batches and the trial):

| Build (file) | Adapter | Frames in 20 s | p50, ms | p95, ms (median, min-max) | p99, ms | max, ms | linked during walk |
|---|---|---|---|---|---|---|---|
| `43f71f7` (`e0-base`) | ANGLE (Intel, Intel(R) UHD Graphics (0x0000A788) Direct3D11 vs_5_0 ps_5_0, D3D11) | 981 | 18.2 | 24.4 (24.4-36.3) | 42.5 | 84.8 | 0 |
| `dc2677d` (`e0-after`) | ANGLE (Intel, Intel(R) UHD Graphics (0x0000A788) Direct3D11 vs_5_0 ps_5_0, D3D11) | 853 | 24.2 | 30.3 (30.3-30.4) | 36.4 | 96.9 | 0 |
| `43f71f7` (`e0-base-walk2`) | ANGLE (Intel, Intel(R) UHD Graphics (0x0000A788) Direct3D11 vs_5_0 ps_5_0, D3D11) | 1018 | 18.2 | 24.3 (24.3-24.3) | 30.1 | 103.0 | 0 |
| `8f14a0b` (`e0-after-walk2`) | ANGLE (Intel, Intel(R) UHD Graphics (0x0000A788) Direct3D11 vs_5_0 ps_5_0, D3D11) | 1072 | 18.2 | 24.3 (24.3-30.2) | 30.3 | 102.9 | 0 |
| `f2f2911` (trial, `e0-b5`) | ANGLE (Intel, Intel(R) UHD Graphics (0x0000A788) Direct3D11 vs_5_0 ps_5_0, D3D11) | 836 | 24.2 | 30.3 (30.3-30.4) | 36.4 | 96.8 | 0 |
| `43f71f7` (`e0-base`) | ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Laptop GPU (0x000028E0) Direct3D11 vs_5_0 ps_5_0, D3D11) | 40 | 472.6 | 5084.1 (4841.8-5187.2) | 5805.3 | 5805.3 | 138 |
| `dc2677d` (`e0-after`) | ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Laptop GPU (0x000028E0) Direct3D11 vs_5_0 ps_5_0, D3D11) | 39 | 551.5 | 5847.7 (5296.2-6035.5) | 6526.3 | 6526.3 | 140 |
| `43f71f7` (`e0-base-walk2`) | ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Laptop GPU (0x000028E0) Direct3D11 vs_5_0 ps_5_0, D3D11) | 38 | 381.6 | 5284.0 (4987.1-5314.3) | 5859.8 | 5859.8 | 140 |
| `8f14a0b` (`e0-after-walk2`) | ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Laptop GPU (0x000028E0) Direct3D11 vs_5_0 ps_5_0, D3D11) | 39 | 381.8 | 5641.5 (4320.5-5756.7) | 5877.8 | 5877.8 | 140 |
| `f2f2911` (trial, `e0-b5`) | ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Laptop GPU (0x000028E0) Direct3D11 vs_5_0 ps_5_0, D3D11) | 38 | 545.5 | 5671.8 (5065.8-6132.4) | 6484.0 | 6484.0 | 140 |

Reading the tables:

- Curtain lift falls from 13.5 s to 11.7 s on Intel and from 13.8 s to 11.7 s on RTX between `43f71f7` and `dc2677d`. Programs at ready fall from 144 to 109 on Intel and from 138 to 124 on RTX. The `?hud=off` control is 8.6 s on both adapters in both builds, at 90 programs on Intel and 102 on RTX.
- The E0c delta falls from +4944 ms and +54 programs to +3109 ms and +19 programs on Intel, and from +5140 ms and +36 programs to +3062 ms and +22 programs on RTX. The trial `f2f2911` reads +2870 ms and +19 programs on Intel and +3119 ms and +22 programs on RTX. It is not part of the change.
- The `?hud=off` control is the arm the E0 runner uses, and the E0 files and section 3.3 call the delta the prewarm queue's cost. The code read for this section does not show `?hud=off` switching the queue off. `components/world/SealGame.jsx:174` sets a `data-hud` attribute, and `Controller.jsx:201` says that no arrival fires under it. The E0c delta is therefore the difference between the two URLs, not a measured queue cost.
- Intel walk p50 is 18.2 ms in three of the four walk batches and 24.2 ms in `e0-after`. The `dc2677d` files and the `8f14a0b` repeat have the same app files and give 24.2 and 18.2 ms, so a 6 ms gap between two walks of one app state is measurement spread. The gap between `43f71f7` and `dc2677d` in Intel p50 is no larger than that spread. Intel p95 medians are 24.3 to 30.3 ms in all four batches and in the trial.
- The RTX walk rows are a stall, not a steady walk. They record 38 to 40 frames in the 20 s window, so p50 (382 to 552 ms) and p95 (5084 to 5848 ms) measure stalled frames. They link 138 to 140 programs in the window; the Intel walk links none. The E0 files do not record when in the window the stalls fall.

### 3.5 Resident engine A/B at 8000dd5

Measured, 3 runs each, same commit `8000dd5`. The arms are `?play` (engine on) and `?play&hot=off` (engine off), run by `verification/topo/m0.sh` through `scripts/topo-run.ps1 -Phases fresh,load,walk`. The `fresh` phase opens with no seen docks (`scripts/perf-frames.mjs:413`, `seen: false`), so it is the first-time visitor. The `walk` phase opens with every dock seen (`perf-frames.mjs:218`). Raw files are `verification/topo/m0-engine-on/raw/` and `m0-engine-off/raw/`, keys `fresh`, `load` and `walk`.

`8000dd5` has the same app files as `dc2677d`. It predates three later commits: `ac2e401` (no resident spin on a low GPU), `3c91fbb` (engine jobs skip seen docks) and `6959948` (count only engine jobs due this tick). So the Intel rows describe the engine before the low-GPU skip, and the RTX rows describe it before the queue changes. The two arms were built separately (clean builds `V4XnZ1oT8ibvEAIeT05FK` for on and `dy7vtCWNkSEsHKLUKKOjl` for off), so the arms differ by the query string and by the separate build.

First-time visitor on the RTX 4060 Laptop (`fresh` phase; ms; adapter ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Laptop GPU (0x000028E0) Direct3D11 vs_5_0 ps_5_0, D3D11)):

| Arm | Run | Curtain lift, ms | Frames in window | p50 | p95 | max | mean | Longest frame, first 4 s after ready |
|---|---|---|---|---|---|---|---|---|
| engine on | r1 | 11185 | 22 | 133.2 | 3999.5 | 4556.8 | 968.2 | 30.3 |
| engine on | r2 | 11987 | 23 | 133.2 | 3957.0 | 4314.5 | 897.1 | 30.4 |
| engine on | r3 | 11401 | 25 | 121.3 | 3969.0 | 4326.6 | 1082.0 | 30.4 |
| engine off (`?hot=off`) | r1 | 11526 | 776 | 24.2 | 36.4 | 193.9 | 25.9 | 54.5 |
| engine off (`?hot=off`) | r2 | 11629 | 805 | 24.2 | 36.2 | 169.7 | 25.0 | 60.6 |
| engine off (`?hot=off`) | r3 | 11506 | 819 | 24.2 | 30.5 | 175.6 | 24.6 | 48.4 |

Stalls of 1 s or more in the on runs, as `ms (programs linked)`:

- engine on r1: 3963 (26), 4556.8 (0), 3817.5 (26), 3072.2 (0), 3999.5 (51)
- engine on r2: 3957 (26), 4314.5 (0), 3708.5 (26), 2981.5 (0), 3781.3 (51)
- engine on r3: 3799.4 (25), 4326.6 (25), 2908.7 (0), 3684.4 (73), 3720.8 (1), 3969 (40), 2266.3 (0)

First-time visitor on Intel UHD (`fresh` phase; ms; adapter ANGLE (Intel, Intel(R) UHD Graphics (0x0000A788) Direct3D11 vs_5_0 ps_5_0, D3D11)):

| Arm | Run | Curtain lift, ms | Frames in window | p50 | p95 | max | mean | Longest frame, first 4 s after ready |
|---|---|---|---|---|---|---|---|---|
| engine on | r1 | 11145 | 785 | 24.2 | 36.2 | 212.3 | 25.7 | 575.6 |
| engine on | r2 | 10771 | 786 | 24.2 | 36.3 | 175.8 | 25.6 | 539.3 |
| engine on | r3 | 11066 | 784 | 24.2 | 36.2 | 199.8 | 25.7 | 557.5 |
| engine off (`?hot=off`) | r1 | 11175 | 755 | 24.3 | 36.4 | 175.8 | 26.7 | 66.7 |
| engine off (`?hot=off`) | r2 | 11054 | 793 | 24.2 | 36.3 | 151.4 | 25.4 | 48.5 |
| engine off (`?hot=off`) | r3 | 11064 | 782 | 24.2 | 36.4 | 169.7 | 25.8 | 91.0 |

Finding (measured, 3 runs each, same commit `8000dd5`):

- With the resident engine on, a first-time visitor on the RTX 4060 Laptop gets 22 to 25 frames in the 20 s window, against 776 to 819 frames with `?hot=off`. Each on-run has five to seven stalls of 1 s or more (listed above). Stalls of 3 s or more run from 3.1 to 4.6 s; ten of the fourteen link 25 to 73 programs each, three link none and one links one.
- On Intel the longest frame in the first 4 s after ready is 539.3 to 575.6 ms with the engine on and 48.5 to 91.0 ms with it off. The `fresh` phase of every off-run on both adapters has no frame over 200 ms.
- The walk phase in the same arms, where every dock is seen, also stalls with the engine on: 17 to 18 frames on RTX against 382 to 489 with it off, and a walk p95 of 5187 to 5460 ms. So the stall is not limited to a first visit in these runs.
- At HEAD the Intel adapter classifies as tier 1 (`lib/world/quality.js:47`, `/intel.*(hd|uhd)/i`), which is low mode (`lib/quality/modes.js:3`), so `EngineCut.jsx:29` no longer spins the resident engine on it. The Intel engine-on rows describe `8000dd5`, before that change, and do not describe HEAD.

### 3.6 What the measurements do not cover

The numbers come from one machine: a hybrid laptop with an Intel UHD and an RTX 4060 Laptop GPU, the same 16 GB box as section 3.3. The boot rows are three cold launches per adapter, which is a small sample. The browser is a headless real Chrome: `scripts/perf-frames.mjs:76` and `scripts/cut-load.mjs:243` launch `chromium` with `executablePath` set to the installed `chrome.exe` and `headless: true`. The walk rows hold every dock seen (`perf-frames.mjs:218` and `:382`), so a first-time visitor's own builds are not in them; only the `fresh` phase covers a first visit, and it is measured only in the A/B of section 3.5. Nothing here covers a second device, a second GPU vendor, a slower network, or a longer session than the 20 s walk.

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
- The engine prepares a dock only above LOW. `prep.js` `run` returns null when `deps.modeOf(engine) === "low"` (`prep.js:84`), so T0 and T1 take the cold path at arrival. `modeOf` is `modeForTier(engine.tier)` (`EngineCut.jsx:41`). Since `ac2e401`, `EngineCut.jsx:29` also skips the resident spin when the GPU classifies as low, before any engine exists.
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

Packages are named in `.oneshot/warp/ARCHITECTURE-PLAN.md` section 5. "Done in code" means the code path exists at `4665f65`; it does not mean the target was measured. Section 3.4 and 3.5 hold the measurements, and neither says that a target was met.

| Package | State at `4665f65` | Where |
|---|---|---|
| WP1 deadline queue, measuring tool | Done in code | `lib/world/cutscene/deadline.js:7-10`, `components/world/cutscene/prewarm.js:117-221`, `scripts/cut-load.mjs` |
| WP2 prep, resident engine, start guard | Done in code. The per-layer table that decides `LEVEL_1` is empty. The low-GPU skip is `components/anime/EngineCut.jsx:29` (`ac2e401`) | `lib/anime/prep.js:8` (`LEVEL_1`), `components/anime/EngineCut.jsx:20, 49-66, 93` |
| WP3 R3F moves out of the scene chunk | Done in code. 23 of the 25 move loaders are registered through `registerLoader`; the two `plays` cards load through `pr-mujoco-3396`. Measured as part of the change from `43f71f7` to `dc2677d` (section 3.4) | `components/world/cutscene/moves/index.js:6-43`, `lib/world/cutscene/cards/index.js:70` |
| WP4 island stops raycasting under engine cover | Done in code. The frameloop pause in `NEEDS-FROM-ISLAND.md` is not done | `components/world/cutscene/FrameGuard.jsx:404-405`, flag at `components/anime/EngineCut.jsx:130` |
| WP5 headers, robots, beacon | Done in part. `public/llms.txt` changed by 4 lines in `7d949add` | `next.config.mjs` headers (lines 6 to 13), `app/robots.js:4`, `app/layout.jsx:43-46`, `app/lab/layout.jsx:2` |
| WP6 the awakening as an engine cutscene | Not done. `the-loop` is in `ENGINE_DOCKS` (`live.js:4`) and not in `ENGINE_LIVE` (`live.js:5-8`) or in `DOCKS` (`lib/anime/cutscenes/index.js:4`) | `lib/anime/cutscenes/the-loop/` exists |
| WP7 generated lab routes as dynamic routes | Not done. `scripts/lab-routes.mjs` still writes one folder per cutscene and per hero look under `app/lab/` (dev only, untracked). The query route `/lab/anime?cut=<id>` is the one tracked path | `scripts/lab-routes.mjs`, `app/lab/anime/page.jsx`, `lib/anime/cutscenes/index.js:3` |
| WP8 registries, check repair, docs | Partly. The doc gate table is in `docs/TESTING.md` | `docs/TESTING.md:12` onward |
| Bake packages B1 to B8 | Not started in `lib/` | section 5 |

## 7. Notes for a later reader

- The baseline in section 3.3 is from `beff5e24`. The measurements in sections 3.4 and 3.5 come from `43f71f7`, `dc2677d`, `8f14a0b`, `f2f2911` and `8000dd5`, and each table names its own. HEAD is `4665f65`. Re-measure with `node scripts/cut-load.mjs` before quoting any number from this file as current. This edit did not run it.
- The lab counts differ by source. The build at `beff5e24` emitted 38 hero routes and 70 lab routes (`LOAD-ANALYSIS.md` section 2; `ARCHITECTURE-PLAN.md` T19). The tracked tree at HEAD has no generated hero or cut folders; `scripts/lab-routes.mjs` writes them on demand (section 6, WP7).
- This file replaces the 68-line version committed earlier in `7d949add`. Its "Cutscene loading" content is now sections 3.1 and 3.2. Its line that said `moves/index.js` exports `MOVE_LOADERS` described WP3; at HEAD WP3 is in code (section 6), and the table is `LOAD` at `moves/index.js:6`, not exported.
- Uncommitted items in this worktree when this file was written: `scripts/bake-plates.mjs`, `scripts/jolly.mjs`, `public/plates/`, `undefined/` and the modified `scripts/cut-cap.mjs`. The commit for this file does not include them. The `undefined/` folder at the worktree root looks like a path built from an unset value; no code read here refers to it.
- For checks, see [TESTING.md](TESTING.md). The import graph in section 2 came from a one-off node script over `lib/` and `components/`; it is not committed.
