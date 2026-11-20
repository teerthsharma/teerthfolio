# Baked backgrounds

The baked backgrounds are the still painted world behind each cutscene: the sky, far plates, terrain and light that sit on layer 0. This document says which of them are baked, which are not, and why. It covers the 15 docks on the live engine list in `lib/anime/live.js`. Where the design, the prototype runner and the code disagree, the disagreement is stated in the section where it matters.

Status on 2026-11-17, branch `warp/joined`, HEAD `7d949add`: the design is written, one prototype runner exists as an untracked file, and no plate is loaded by the site. Nothing in `lib/anime/bake/` or `public/plates/` exists yet. The first measurement of the full pipeline is still pending.

## 1. Verdict

1. The bake covers the held shots. A shot whose camera does not move gets one plate, and the runner keeps a few extra frames only where the world animates. Moving-camera shots are not baked in v1. Source: `.oneshot/warp/BAKE-DESIGN.md` lines 5-7.
2. A plate is three files, not one picture: colour (AVIF), an aux file (id, plate ink line, HDR scale) and depth (lossless WebP). Source: `BAKE-DESIGN.md` lines 8 and 117-125.
3. The budget is 80 MB for `public/plates`, with 1.2 MB per dock for the small set and 3.5 MB per dock for the high set. These are plan figures, see section 8.
4. The loader never blocks. A missing, late or stale plate runs the live bake for that key, which is today's behaviour. Source: `BAKE-DESIGN.md` lines 11 and 229.
5. Two docks, `home` and `p-planimeter`, move the camera in nearly every shot. They get no baked coverage in v1 and keep the live bake until their shots are re-authored (work package B8).

## 2. Scope

The 15 docks are the entries of `ENGINE_LIVE`:

- `lib/anime/live.js` lines 5-8 list 15 ids: `pr-triton-kernels-22`, `pr-pyrefly-4180`, `pr-mujoco-3396`, `pr-openxla-46539`, `p-planimeter`, `p-nerve`, `home`, `pr-highway-3244`, `p-caustic`, `p-tangle`, `pr-nemo-relay-481`, `pr-polychrom-79`, `pr-anyps5-12609`, `pr-tensorflow-124410`, `pr-tensorflow-128930`.
- `BAKE-DESIGN.md` line 1 and the table at lines 19-36 plan for 16 docks above 50. The sixteenth, `p-asmodeus` (score 52), is not on `ENGINE_LIVE`. Adding it is one line in `live.js` (`BAKE-DESIGN.md` line 43). This document follows the 15-dock scope. The bake list in `BAKE-DESIGN.md` line 321 keeps `p-asmodeus` in the bake order.
- `the-loop` (61) is excluded. The loop is a minigame and the live awakening plays (`BAKE-DESIGN.md` line 44).
- `pr-mujoco-3396` carries mujoco-3450 and mujoco-warp-1541 as one grand scene. There are no separate chunks (`BAKE-DESIGN.md` line 46).

## 3. What a plate is

Layer 0 is the world. Layer 1 holds the seal, the cast and the effects.

- The contract: `lib/anime/cutscenes/framework.js` line 19 names the plate as layer 0, baked per shot, and the characters as layer 1, redrawn per step. Line 51 says the same for a dock's `build(ctx)`: world is layer 0, cast and fx are layer 1.
- Helpers: `lib/anime/cutscenes/framework/plates.js` lines 26-30 (`plateLayer`) and 32-36 (`bakeSky`) set `userData.layer = 0`. `bakeCard` (lines 38-68) sets the layer from `o.layer ?? 0`.
- The composer: `lib/anime/post.js` line 426 compares `keys.plate` with `this.plateKey`. When they differ, line 429 calls `camera.layers.set(0)` and line 432 renders layer 0 into `plateRT`. `plateRT` is created at line 349 with a `DepthTexture`. The colour derived from it is `plateCol`, read by COMP at line 357.

So the three buffers the composer reads are colour with an id in alpha, a depth texture, and the plate line pass (`BAKE-DESIGN.md` lines 52-58). Baking the plate means baking the output of that one branch. Per-layer files are not needed. The design renders the bake at tier 4, so the weakest device shows the top-tier world (`BAKE-DESIGN.md` line 60).

The plate key is per shot. `framework.js` line 313 sets `engine.plateTag` from `shotPlateKey`, and `plates.js` lines 71-74 return the shot index alone for a still shot and the shot index plus a frame index for a moving one.

## 4. What is baked

Rule for the runner: a shot is baked when `s.hold || !s.moving`. The prototype runner computes this at `scripts/bake-plates.mjs` line 30, with the comment that hold freezes the camera and that the engine re-keys the plate per frame only when the camera moves.

The design adds the following (`BAKE-DESIGN.md` sections 2.3, 4.1, 4.5):

- One chunk is one dock, one shot, one set (`pr-triton-kernels-22/s07.h`).
- Frames are keyed `<dock>|<shot.i>|<grid>|<n>`. A held shot uses `n = 0`.
- Frames of a held shot are thinned. Consecutive frames that differ by less than a threshold `T` collapse onto the last kept frame. `T` starts at 1.0 and rises by 0.5 until the dock fits its byte cap. A chunk ships only when its error is at most 2.0.
- Objects tagged `userData.bake` as `"shader"`, `"heavy"` or `"live"` are left out of the plate and drawn live at the matching tier. Untagged objects are baked. Every current dock is untagged, so every current object is baked (`BAKE-DESIGN.md` lines 66-77).

## 5. What is not baked

- **The seal, the cast and the effects.** Layer 1 is redrawn each step: the seal, the cast shadow, the cel and its lines, bloom, lens, iris, grain, impact frames, speed lines, lettering, balloons and the credit (`BAKE-DESIGN.md` section 2.2, `lib/anime/cutscenes/framework/overlay.js`).
- **Moving-camera shots.** A plate depends on the camera, so a moving shot needs a new plate every 1/12 s. `home` has 363 such frames and `p-planimeter` has 303, which would be 46 MB and 38 MB at the `h` frame size (`BAKE-DESIGN.md` section 4.6). The runner marks them `skipped` (`scripts/bake-plates.mjs` line 90). The bake for these two docks waits for work package B8, which re-authors slow dollies as overscan pans. That is a visible change to those cutscenes, so the owner checks it before it ships (`BAKE-DESIGN.md` line 194).
- **Tagged world objects** (`shader`, `heavy`, `live`), when the design's tags are added. None exist today.
- **Any shot the loader cannot use.** The loader does not exist yet (section 9), so today every shot runs the live bake.

## 6. The 15 docks

Source for every number: `BAKE-DESIGN.md` section 1, table lines 19-36. Scores are out of 100, the best total on the faithful or new-dock review sheets. Shots and camera come from `CameraDirector(scene).shots` run on the tree the design was written against (`BAKE-DESIGN.md` line 38). This document did not re-run that count.

| Dock | Best score | Shots | Camera | Plate keys at 12 fps (upper bound) | In `bake-detached.ps1` list |
|---|---|---|---|---|---|
| pr-triton-kernels-22 | 83 | 17 | all held, animated world | 352 | yes |
| pr-pyrefly-4180 | 79 | 17 | all held, animated world | 341 | yes |
| p-planimeter | 74 | 49 | 48 moving (25.2 s) | 326 | no |
| pr-mujoco-3396 | 73 | 19 | all held, animated world | 353 | yes |
| pr-openxla-46539 | 73 | 13 | all held, animated world | 299 | yes |
| p-nerve | 69 | 18 | all held, animated world | 372 | yes |
| home | 68 | 17 | 17 moving (30.2 s) | 363 | no |
| pr-highway-3244 | 67 | 20 | all held, animated world | 310 | yes |
| p-caustic | 66 | 16 | all held, animated world | 270 | yes |
| p-tangle | 65 | 14 | 4 moving (4.0 s) | 344 | yes |
| pr-nemo-relay-481 | 64 | 16 | all held, animated world | 310 | yes |
| pr-anyps5-12609 | 63 | 9 | 1 moving (0.5 s) | 144 | yes |
| pr-polychrom-79 | 62 | 17 | 1 static, 16 held animated | 292 | yes |
| pr-tensorflow-128930 | 58 | 14 | all static | 14 | yes |
| pr-tensorflow-124410 | 57 | 18 | all held, animated world | 209 | yes |

The "In `bake-detached.ps1` list" column is from `.oneshot/warp/bake-detached.ps1` line 9 (the `$docks` string), which holds 13 docks. It leaves out `p-planimeter` and `home`, the two docks whose camera moves in nearly every shot.

Counts from the design (`BAKE-DESIGN.md` line 7 and the table): 11 docks hold the camera in every shot. Three more hold all but 0.5 to 4 s: `pr-anyps5-12609` and `p-tangle` are in scope, and `p-asmodeus` is outside it. `home` and `p-planimeter` move in almost every shot. The design's work package B7 says "14 held-camera docks" (`BAKE-DESIGN.md` line 317). That number is the 16 minus `home` and `p-planimeter`, so it includes `p-asmodeus`.

Coverage figures for LOW mode, from `BAKE-DESIGN.md` line 318: `p-tangle` 0.86, `p-asmodeus` 0.77, `pr-anyps5-12609` 0.96. These are design numbers and were not re-derived here. A dock below 0.90 plays the old R3F move on LOW until its shots are re-authored.

The bake order from `BAKE-DESIGN.md` line 321 is: triton, pyrefly, mujoco, openxla, nerve, highway, caustic, tangle, nemo, anyps5, polychrom, tf-128930, tf-124410. `p-planimeter` and `home` come after B8. `PROTECTED` docks (triton with Sukuna, caustic with Madara) are baked but not edited. The bake reads them.

## 7. Format and measured sizes

Measured: six 1280x720 stills from `verification/` (p-aether-lang, p-caustic, p-planimeter, p-resolvent, and p-nerve twice). Machine: this Windows 11 box, sharp 0.34.5 with libvips 8.17.3, decode in headless Chrome 157, 30 samples, median. Source: `BAKE-DESIGN.md` lines 92-104.

| Format | KB per frame (average of 6) | Decode median ms |
|---|---|---|
| PNG (source files) | 592 | 11.6 |
| JPEG q85 | 100 | 10.8 |
| WebP q80 effort 4 | 63 | 12.9 |
| AVIF q55 4:4:4 effort 4 (chosen) | 45 | not run; q50 and q65 bracket it at 11.8 and 13.5 |

Decode time does not separate the formats; size does. 4:4:4 chroma costs 8 KB over 4:2:0 and is chosen because flat anime bands bleed at colour edges. That risk is not measured here; the control is check 6.2(c) in `BAKE-DESIGN.md` (section 11 of this document lists it as pending).

Estimated: the 1920x1080 size is 45 x 2.25 = about 101 KB, by pixel count. No 1080p still exists to measure (`BAKE-DESIGN.md` line 106).

Not measured: KTX2 (no `toktx` on the box, and it needs a runtime transcoder), thinning on real shots, the Intel adapter, the depth file size on real depth (the 117 KB figure is a proxy from a smooth ramp, `BAKE-DESIGN.md` lines 110-115).

The three files per plate, from `BAKE-DESIGN.md` lines 119-125:

- `<hash12>.c.avif`: colour, sRGB, RGBM-style with the max channel stored in `(m - 1) / 3` in the aux file.
- `<hash12>.a.webp`: R = id, G = plate ink line, B = HDR scale. Lossless.
- `<hash12>.d.webp`: depth, 16-bit in two 8-bit channels, lossless.

The id is kept out of the AVIF alpha because lossy alpha can move 0.99 across the 0.98 threshold in satsuei.

## 8. Budget

| Item | Figure | Source |
|---|---|---|
| Cap for `public/plates` | 80 MB | plan figure: `BAKE-DESIGN.md` line 290, marked "design" |
| Per dock, set `s` | 1.2 MB | `BAKE-DESIGN.md` line 291, marked "design" |
| Per dock, set `h` | 3.5 MB | `BAKE-DESIGN.md` line 292, marked "design" |
| 16 docks, both sets, at cap | 75.2 MB | `BAKE-DESIGN.md` line 293 (16 x (1.2 + 3.5)) |
| Vercel CLI source upload | 100 MB Hobby, 1 GB Pro | cited in `BAKE-DESIGN.md` line 295 to vercel.com/docs/limits, fetched 2026-11-17 by the design's author. Not re-fetched here |

The 80 MB figure is a plan figure written by the design, not a measured limit. The Vercel limit was cited by the design and was not checked for this document.

The caps are enforced by the runner's thinning. Without thinning, the prototype runner's own PNG output would exceed them. At the measured PNG average of 592 KB per 1280x720 frame (`BAKE-DESIGN.md` line 96), `pr-triton-kernels-22` with 17 held shots would produce about 10 MB, nearly three times the 3.5 MB cap for set `h`. This is arithmetic on the design's numbers, not a measured bake.

## 9. The runner

### 9.1 As built: `scripts/bake-plates.mjs`

The file is untracked in the worktree (`git status` shows `??`). It is a first prototype and differs from the design in several ways.

- Command: `node scripts/bake-plates.mjs [--docks a,b] [--out public/plates] [--max-minutes 8] [--dry-run]` (`scripts/bake-plates.mjs` lines 1-2 and 16-22). The design's command set (`--dock`, `--shard`, `--assemble`, `--stale`, `--report`, `BAKE-DESIGN.md` lines 164-168) is not implemented.
- Dock list: `ENGINE_LIVE` by default (line 18), all 15.
- Shots: each still shot is baked at its middle time `t` (line 29). The output is one PNG per shot at `public/plates/<dock>/<i>.png` (lines 79, 99), not the three files of section 7.
- The shot itself: `shoot()` (lines 46-66) takes a lock per shot with `withGpuLock`, opens the lab page at `t=... &paused`, seeks, hides the seal and the groups named `cast` and `fx` (lines 55-57), and returns `window.__cut.grab().png`. `grab` calls `player.draw(player.t, 0)` and then snaps the canvas (`components/anime/CutCore.jsx` line 83). So the prototype does not select layer 0. It hides three named groups and takes a full draw. Whether the overlays and frame-law passes appear in those files was not checked.
- Manifest: `public/plates/manifest.json`, one entry per dock and shot, with `status` set to `done`, `failed` or `skipped` (lines 87-115). It is rewritten after each shot. Resume is by checking `status === "done"` and that the file exists (line 100).
- Missing from the prototype: AVIF and WebP encoding, depth and aux files, thinning, the determinism control, claims and sharding, a per-dock index the loader reads, the coverage figure, and any free-RAM check before Chrome opens. `scripts/bake-plates.mjs` has no reference to free memory (grep for `freemem`, `RAM` and `layers` finds nothing).

### 9.2 As designed

`BAKE-DESIGN.md` section 4.3 describes the target: each chunk runs inside `withGpuLock`, opens the lab page with `&bake=1&tier=4`, calls a new `window.__cut.dumpPlate()` for each grid frame, encodes with sharp, thins, writes `*.tmp` files and renames them, and writes the done record last. Two machines can share work through atomic claims in `<repo>/.plate-claims/` or through `--shard i/N`. The determinism control bakes the first frame of each chunk twice (`BAKE-DESIGN.md` lines 159-175).

`dumpPlate` and `lib/anime/bake/` do not exist in the worktree. A grep for `bakedPlateKey`, `applyBaked`, `dumpPlate`, `bake.js` and `bake=` over the repository finds no match.

### 9.3 Runtime, once built

The loader is designed to read `public/plates/m/<dock>.<set>.json` and `f/<hash>.*` (`BAKE-DESIGN.md` lines 136-141). `next.config.mjs` lines 8-9 already set the cache headers for `/plates/f/*` (immutable, one year) and `/plates/m/*` (five minutes, stale-while-revalidate), committed in `7d949add`. The loader itself, the seam in `post.js` and the `EngineCut` wait are work packages B3 and B6 (`BAKE-DESIGN.md` lines 211-217, 313, 316).

## 10. Resource sharing with the documentation workflow

Two workflows share this PC: the bake, and the documentation writer that produced this file. The allocation is done by three mechanisms and one gap.

1. **Shared RAM reading.** `.oneshot/warp/resource-monitor.ps1` writes `.oneshot/warp/resources.json` every 30 seconds (`Start-Sleep -Seconds 30`), with `freeRamGB`, `totalRamGB`, `freeDiskGB`, `nodeProcesses` and `ramFloorGB: 3`. It stops when `RESOURCE-STOP` exists. At the reading used for this document (`resources.json` updated `2026-11-17T18:18:48`) the values were 7.17 GB free of 15.71 GB total and 32.2 GB free disk.
2. **Documentation side waits on the floor.** The documentation writer reads `resources.json` before starting. While `freeRamGB` is below 3, it waits 60 seconds and reads again, up to 30 times. It starts no build, lint or test process.
3. **Bake side takes GPU slots.** `scripts/cut-lock.mjs` `withGpuLock` (line 42) holds 3 slots by default (`CUT_GPU_SLOTS`). Each slot is an atomic `mkdir` under `os.tmpdir()`, with a heartbeat every 30 seconds and staleness after 10 minutes. Slot 0 is always taken. Slots 1 and 2 are taken only when `os.freemem()` is at least 2.5 GB (`CUT_GPU_HEADROOM_GB`). The documentation writer takes no GPU slot. The two workflows never wait on each other's GPU.
4. **Bake slices.** `.oneshot/warp/bake-detached.ps1` runs `node scripts/bake-plates.mjs` in slices of at most 8 minutes, outside Claude Code, and records each slice in `bake-detached.log` and `BAKE-STATUS.json`. It stops after three slices with no new plate files, or when `BAKE-STOP` exists. The prototype takes the GPU lock per shot, so no slot is held between shots.

The gap: the bake does not read `resources.json`. The design requires a 3 GB free-RAM check before each Chrome opens, retried for 15 minutes (`BAKE-DESIGN.md` line 174). The prototype does not have it. The first GPU slot is taken without any RAM check. Only the extra slots check headroom. So the one-way allocation is: the documentation side yields to low RAM, and the bake side never yields to it. Adding a check to `scripts/bake-plates.mjs` before `launchChrome()` would close the gap. That change is not made by this document.

## 11. Measured, estimated, pending

| Item | State | Where |
|---|---|---|
| Format sizes and decode times (six 720p stills) | measured | section 7, `BAKE-DESIGN.md` lines 94-104 |
| 1080p plate size (101 KB) | estimated, by pixel count | `BAKE-DESIGN.md` line 106 |
| Depth file size | proxy, from a smooth ramp | `BAKE-DESIGN.md` lines 110-115 |
| Thinning capacity (about 22 kept frames per dock) | estimated | `BAKE-DESIGN.md` lines 183-190 |
| Bake time (10 to 15 minutes per dock per set) | estimated | `BAKE-DESIGN.md` lines 177-179 |
| LOW coverage (tangle 0.86, asmodeus 0.77, anyps5 0.96) | design figures | `BAKE-DESIGN.md` line 318 |
| Shot and camera counts | design figures, from `CameraDirector` | `BAKE-DESIGN.md` section 1 |
| B1: real size of three chunks, real thinning | pending | `BAKE-DESIGN.md` line 311 |
| B5: `bake-check` against live, both adapters | pending | `BAKE-DESIGN.md` section 6, line 315 |
| Frame time with and without plates | not measured, no number promised | `BAKE-DESIGN.md` lines 282-284 |
| KTX2 | not measured | `BAKE-DESIGN.md` line 108 |

No pixel comparison between a baked plate and a live frame exists yet. The check in `BAKE-DESIGN.md` section 6 defines the tolerances before any run: whole-frame mean difference at most 2.0, pixels differing by more than 16 at most 1.0 percent, and the same two numbers inside the seal box (3.0 and 2.0 percent). The determinism floor is 0.3. These are the bar, not results.

## 12. Notes for a later reader

- The design's base is commit `beff5e2409f6` (`BAKE-DESIGN.md` line 3). HEAD is `7d949add`, which adds the cut-load tool and the prewarm changes. Re-check any file path or line number against HEAD before use.
- `BAKE-DESIGN.md` lives under `.oneshot/warp/`. `git log -- .oneshot/warp/BAKE-DESIGN.md` prints nothing, so no commit in this history touches it. The file is the source for every design figure in this document.
- The prototype runner is untracked. The detached driver expects its CLI (`--docks`, `--out`, `--max-minutes`). A rewrite to the design's CLI breaks the driver.
- The design counts 16 docks and the live list has 15. Adding `p-asmodeus` to `ENGINE_LIVE` changes the bake set by one dock. That decision belongs to the build workflow, as the design says (`BAKE-DESIGN.md` line 43).
- `public/plates/` and `lib/anime/bake/` do not exist. No plate is loaded at runtime, so the live bake is what plays on every dock today.
- The documentation writer and the bake share the PC through `resources.json` and the GPU slot lock only. There is no shared queue.
