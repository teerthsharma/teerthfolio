# T5 pre-registration addendum: the renderer gate, neutral against off

Written and committed before the first measured run of T5; never edited after that run. A reading that a number suggests after the run is a new addendum for a new run, not an edit here. `PREREGISTRATION.md` and `PREREGISTRATION-T2.md` are unchanged.

## 1. The bars, verbatim

From the design report (`docs/topological-shader/README.md` on `release/seo-plus-load`), test table row T5:

| T5 renderer gate | production build through `scripts/perf-frames.mjs`, 3 runs per adapter, adapters named; arms: flag off and `?topo=neutral` | neutral-vs-off pixel difference <= 1/255 per channel on 3 held frames; programs at ready <= 109 (Intel) and <= 124 (RTX); first-visit window >= 938 and >= 844 frames; longest prewarm tick <= 37 and <= 40 ms; first key-press frame <= 36.4 ms (thesis H3 row); BAND ghosting no trace longer than 8 frames in any of 3 runs; BAND <= 0.25 of visible cells | KILL: any one bar | `neutral.mjs` |

The five bars this run measures, as strings the test suite checks against this file:

- neutral-vs-off pixel difference <= 1/255 per channel on 3 held frames
- programs at ready <= 109 (Intel) and <= 124 (RTX)
- first-visit window >= 938 (Intel) and >= 844 (RTX) frames
- longest prewarm tick <= 37 and <= 40 ms
- first key-press frame <= 36.4 ms
- KILL: any one bar

## 2. What is built, and what that means for the reading

1. `?topo=neutral` mounts `components/world/topo/TopoDriver.jsx` (lazy, only when the flag asks) on the island canvas. It runs the heat field, the latch (forced LIVE in neutral), the governor, the critical-cell classification at 1 Hz and the T_h pack, into one preallocated `Uint8Array` and one `DataTexture`. It publishes the GLSL chunk and the uniforms at `window.__world.topo`.
2. The chunk is wired in one place: the plate pass (`PLATE`) of the cutscene composer, `lib/anime/post.js`. The pass is rebuilt once with the chunk when `window.__world.topo` appears, and `topoOut(col, col, xz, ...)` runs with P = L = the painted plate, because no baked plate exists (T1 killed the route plates) and kappa and Lambda are reserved zeros, so a = 0. Neutral and off therefore differ in the program source of the plate pass only, and the picture must be identical.
3. The cutscene composer runs on its own `WebGLRenderer` (`lib/anime/engine.js`), so the island renderer's `gl.info.programs` does not see the plate pass, and the T_h texture is uploaded only by the engine's renderer. The island rows below (programs at ready, first-visit window, longest prewarm tick, first key-press frame) therefore measure what the neutral flag costs the island thread: the lazy chunk, the CPU loop and the texture object. They cannot move because of the shader. The pixel row is the only row that exercises the shader.

## 3. Readings fixed before the run

1. Build and server. One production build of the commit named in `out/t5.md`, made in a throwaway worktree by `scripts/topo-run.ps1` (`npm ci`, `npm run build`, `npm start`), one server for every arm and every run. Never the live site, never `next dev`.
2. Adapters. Intel UHD and RTX 4060 Laptop, each pinned by LUID (`scripts/gpu-adapter.mjs`) in real Chrome, headless, 1440 x 900 at DPR 2 for the island phases. The adapter string each run reports is written to `out/t5.json`; a run whose string does not match its adapter is void.
3. Runs and order. 3 runs per adapter per arm. Within one session the two arms are interleaved: per adapter and per run, both arms are measured before the next run starts. The order alternates by run: run 1 off then neutral, run 2 neutral then off, run 3 off then neutral. The order actually taken is written to `raw/order.txt` and copied into `out/t5.md`. The Intel adapter runs all 3 of its runs, then the RTX runs all 3 of its runs. Nothing else is running on the machine on purpose; free RAM is read before the build.
4. Programs at ready. `scripts/cut-load.mjs --phase boot --runs 1`, the `progs` field: `gl.info.programs.length` of the island renderer at the moment `window.__world.ready` first turns true. Neutral arm query `?topo=neutral`, off arm no query. The bar is the maximum over the 3 neutral runs.
5. First-visit window. `scripts/perf-frames.mjs --phase fresh,walk --secs 20`, the `fresh` phase (a first-time visitor: 12 s idle, W D S A key cycle, 4 s idle), field `fresh.frames`: the count of recorded frames after the mark. Queries `?play` (off) and `?play&topo=neutral`. The bar is the minimum over the 3 neutral runs.
6. Longest prewarm tick. The largest `ms` (index 3) of `fresh.warmLog` (`window.__warmLog`, which `components/world/cutscene/prewarm.js` appends to only for ticks over 30 ms). A run with no logged tick counts as 30 ms, which is below both limits, and is marked so in the table. The bar is the maximum over the 3 neutral runs.
7. First key-press frame. `walk.firstKey` of the `walk` phase: the longest of the first six frame deltas after the first key. The bar is the maximum over the 3 neutral runs.
8. Pixel arm. Production build, `/lab/anime?demo=world&style=<id>&paused&t=2` for the 3 worlds `jjk`, `frieren`, `your-name` (the 3 held frames; the plate path of the composer, `c.plates = true`), 1280 x 720 at DPR 1, navigation hidden, `seek(2)` twice 1.5 s apart, a PNG screenshot of the page. The off arm is the URL as given; the neutral arm adds `&topo=neutral`, which makes `AnimeLab.jsx` build the same core as the island (`createTopo("neutral")`, seal at the origin) and publish it. Per world and per run the pixel step takes the off frame, a second off frame (the control) and the neutral frame, three fresh page loads on the same adapter, and reports the maximum absolute difference over every pixel and every colour channel (0 to 255) for neutral against off and for the control against off.
9. Pixel void rules. The run is void, not killed, when any control difference exceeds 1, when the neutral arm's plate program does not contain `topoOut`, when the neutral composer has no `topo` set, or when the off arm carries the chunk or a topo object. A void run is repeated as a new run under a new addendum; it is not read as a pass.
10. Verdict. PASS only if every one of the five bars holds on both adapters on the neutral arm, as each row above states. KILL on any one failing row, with the row, the adapter and the number reported. The off arm is reported beside it as the control for session drift; if the off arm fails the same absolute bar in the same session, the neutral row still reports FAIL, and the table says that off failed too. No limit, run count, arm order or phase is changed to avoid a KILL.
11. Not run. The BAND rows of the design's T5 (no ghosting trace longer than 8 frames in any of 3 runs; BAND <= 0.25 of visible cells) are not measured here: neutral has no BAND cell, and `on` has no baked plate, so a BAND pixel cannot differ from a LIVE pixel. They are reported as NOT RUN, not as passed.
12. What the numbers are compared against. The limits are the numbers of the thesis H3 row and the architecture overview (`docs/architecture/overview.md` section 3.7: first-visit window 938 to 987 on Intel and 844 to 999 on the RTX, longest prewarm tick 37 and 40 ms, first key-press frame 36.3 to 36.4 and 24.4 to 30.4 ms at `cca8ba2`). The machine's timing varied by a factor of several on the same day before this run, which is why the off arm is interleaved with the neutral arm in one session.
