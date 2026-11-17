# Testing

Checks are plain Node scripts with no test framework. Run them from the repository root.

| Check | Guards |
|---|---|
| `node lib/anime/live.check.mjs` | the engine switch: live docks are engine docks, approved and loadable; `the-loop` stays on the live awakening |
| `node scripts/cutscene-isolation.mjs` | a cutscene imports only the shared engine and its own folder |
| `node scripts/cutscene-smoke.mjs` | every approved cutscene plays in real Chrome |
| `node scripts/check-world.mjs` | the island, its moves and the cutscene timeline |

## Load gate

The load gate measures how fast the cutscene path is ready: the curtain, the first frame of the engine, and the bytes
the engine does not use. It is run against a production build (`next build`, then `next start -p 3114`) in real Chrome,
one GPU adapter at a time, cold cache, fresh browser context per run, with at least 3 GB of RAM free.

Every number carries its commit, its adapter and its command. Intel UHD and RTX 4060 are never compared with each
other. Run 0 of a browser launch is reported apart.

Baseline: commit `beff5e24`, build `azo1Wp8Ep9_EweAZ7x_x3`, 3 runs per adapter, 16 GB hybrid laptop with about 35%
background CPU. Source: `LOAD-ANALYSIS` section 2. Intel: `ANGLE (Intel, Intel(R) UHD Graphics (0x0000A788) Direct3D11)`.
RTX: `ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Laptop GPU (0x000028E0) Direct3D11)`.

| # | Metric | Baseline (Intel UHD / RTX 4060) | Target | Command | Measured after |
|---|---|---|---|---|---|
| T1 | Curtain lift (`__world.ready`), median of 3 | 17.0 s / 16.3 s | <= 7.0 s | `node scripts/cut-load.mjs --phase boot --gpu intel --runs 3` | pending WP1 |
| T2 | Curtain lift, RTX | 16.3 s | <= 7.0 s | `... --gpu nvidia` | pending WP1 |
| T3 | Programs linked at ready | 181 / 190 | <= 125 | `--phase boot` (reads `renderer.info.programs`) | pending WP1 |
| T4 | Engine-owned R3F worlds built before the first arrival | 4 (nerve, tf-124410, openxla, home) | 0 | `--phase boot --dump-warm` | pending WP1 |
| T5 | Pup latency after a key at ready + 2 s | 177 to 214 ms (Intel), 163 to 168 ms (RTX) | <= 250 ms | `--phase boot` | pending WP1, WP2 |
| T6 | `home` key to the engine's first frame, Intel | 2.62 to 3.50 s | <= 1.5 s | `--phase arrival --dock home --gpu intel` | pending WP2 |
| T7 | `home` key to the engine's first frame, RTX | 5.46 to 5.81 s | <= 3.0 s | `--phase arrival --dock home --gpu nvidia` | pending WP2 |
| T8 | Arrival to first frame after an 8 s walk, Intel | not measured (`home` alone: 1.73 to 2.58 s) | <= 0.6 s (level 2), <= 1.5 s (level 1) | `--phase arrival --dock <id> --after-walk 8` | pending WP2 |
| T9 | Engine chunks requested after the arrival fires | 20 requests, 519,623 B gz | 0 | `--phase arrival` (resource timing) | pending WP2 |
| T10 | Arrival frame time p95, Intel | 83.2 ms | <= 50 ms | `node scripts/perf-frames.mjs --phase arrival --gpu intel` | pending WP4 |
| T11 | Arrival frames over 100 ms, Intel | 14, 18 | <= 6 | same | pending WP4 |
| T12 | Main-thread task over 100 ms, ready to first key, engine resident | not measured | none over 100 ms; p95 <= 33.4 ms | `perf-frames.mjs --phase walk` on both adapters | pending WP2 |
| T13 | Memory after 5 arrivals | n/a | JS heap growth < 20 MB; geometries and textures back to the `spin()` value | `perf-frames.mjs --phase memory` | pending WP2 |
| T14 | Scene chunk, gz | 657 KB | <= 597 KB | `--phase chunks` (sums `.next/static` gz) | pending WP3 |
| T15 | Scene chunk done on slow 4G | 7.0 s | <= 6.3 s | `--phase net --net slow4g --gpu intel` | pending WP3 |
| T16 | Revalidating requests on a repeat visit | 11 | 0 | `--phase repeat` | pending WP5 |
| T17 | `llms.txt` entries for the 14 upstream docks | 12 | 14 | `curl -s :3114/llms.txt` | pending WP5 |
| T18 | Engine failure at an arrival: the old move on screen | not tested | <= 8 s, no uncaught error | `--engine-fault hang`, then `scripts/cutscene-smoke.mjs` | pending WP2 |
| T19 | `/lab/*` routes in the build | 70 | <= 6 | route table of `next build` | pending WP7 |

Frame control: stills of three docks at three times each, on the NVIDIA adapter at tier 4, before and after a package.
The mean absolute difference per channel must stay at or below 0.3.
