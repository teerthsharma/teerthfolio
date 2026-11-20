# Route-heat chunking: research record

Date 2026-11-20. Basis: three research reports (R1 prior art, R2 theory, R3 repo grounding at HEAD 0e90810, branch `exp/topology-field-and-load`) plus the READMEs of `experiments/topo-field` and `experiments/occluder-topology`. This is a record, not advocacy. Every statement carries a tag: SOURCE (read in an external page), MEASURED (run in the repo, file named), DERIVED (algebra or inference from a cited result), HYPOTHESIS (untested).

## 1 Question and scope

- Question: does a heat field built from the seal's own route, cut into persistence-filtered superlevel components (chunks), give a better order or set for preparing shaders and worlds than the current deadline queue?
- The proposal is route-heat chunking: the seal's route accumulates heat H over hex cells; components of {H >= tau} with persistence >= delta are the chunks; chunks decide which docks' shaders and worlds are prepared.
- In scope: what the repo does now, prior art for route-conditioned preparation, stability theory for the chunking, first offline numbers on synthetic routes, and the list of measurable conditions.
- Out of scope: any real visitor data (none exists), in-browser timing, any implementation, any privacy decision.
- [HYPOTHESIS] Heat-ordered preparation beats the current earliest-deadline-first queue; nothing in this record shows it.

## 2 What this repo already does (R3)

Queue, `components/world/cutscene/prewarm.js` unless noted. All MEASURED by reading the code at HEAD 0e90810.
- Priority is earliest deadline first. `deadlineS(seal, dock)` (`lib/world/cutscene/deadline.js:12-15`) is the seconds to reach the dock's arrival ring at `V_FAST` 15 m/s (`MOTION.maxSpeed` 10 x boost 1.5, `motion.js:21-22`): `max(0, dist - radius - APPROACH(7) - sealRadius(0.9)) / 15`. A lower bound on arrival time, not a probability.
- A job key is `travelling(x,z) ? -1000 : s` (`prewarm.js:188`, engine job `:200`). `travelling` (`:125`) = dock within `TRAVEL_M` 12 m of `live.target`. The click or list intent already overrides any prior.
- `cands.sort((a,b)=>a.key-b.key)` then `cands.find(c => c.run())` (`:203-204`). `worldStep` returns false while a compile is in flight (`:160`). One build step or one compile root per 0.1 s tick (`Controller.jsx:101-104`, `prewarm.js:116`): 10 units per second.
- Membership is a window: `inWindow` (`:127`) = `travelling || (ready ? s <= HORIZON_S(8) : s <= criticalS)`; `CRITICAL_S` 1.6 s, `SPAWN_CRITICAL_S` 12 s, `DROP_S` 12 s (`deadline.js:7-10`). `eligible` (`:131`) gates lazy move chunks; `warmPending` (`:209-221`) holds the curtain on critical docks.
- Engine jobs: one prepare at a time (`:199`), seen docks skipped (`:196`), `q.p.drop` when `s > DROP_S` (`:195`). `live.seen` (`store.js:78`) is a Set of dock ids in `sessionStorage["seal:seen"]` (`replay.js:22-33`): a 26-bit visit record that dies with the tab.
- Window coverage, MEASURED with `deadline_cover.mjs` (27 docks = 26 places + spawn statue play):

| seal at | s <= 1.6 s (before ready) | s <= 8 s (after ready) | s <= 12 s |
|---|---|---|---|
| spawn (0, 9) | 5 | 27 | 27 |
| a dock point, 26 places | min 1, median 4, max 8 | min 18, median 24, max 27 | not run |

- [DERIVED] After ready the 8 s horizon (120 m) admits all 27 docks from spawn; a heat prior can only reorder, e.g. `key = s / (eps + p)` (R3's example, HYPOTHESIS), and reordering matters only while the queue has not drained.
- [DERIVED] Marking cold regions lazy narrows `inWindow` and moves build and link cost onto the arrival frame, which stage 3 of `docs/ARCHITECTURE.md` section 3.1 was built to avoid.
- [DERIVED] Before ready, the critical set is the 5 docks within 1.6 s of spawn; a distance-based first-visitor prior is `deadlineS` already.
- [DERIVED] Draining 27 world builds plus compile roots needs at least (27 + distinct materials) ticks; docks own 71 meshes (`e0-after/E0.md`), so about 100 ticks, about 10 s, as an upper-bound inference from tick cadence. Drain time is not measured; probes `window.__warm` and `window.__warmLog` (`prewarm.js:19,121`) exist.
- Program ownership, MEASURED (`verification/topo/e0-after/E0.md`, Q3, RTX 4060 default URL, clean build `dc2677d`, median of 3): 124 programs at ready = static-only 29 (23.4%), live-only 37 (29.8%), dock-only 18 (14.5%), mixed 9 (7.3%), unattributed 31 (25.0%). Intel default: 109 total, dock-only 18 (16.5%). Before the load work (`e0-base`, `43f71f7`): dock-only 29 (21.0% RTX, 20.4% Intel) of 138 and 142. `?hud=off`: 0 dock-only. Ceiling of a per-chunk dock-program manifest: 18 programs.
- Load baseline, MEASURED: curtain lift 11,685 ms (Intel), 11,656 ms (RTX), median of 3, `dc2677d`. First-time-visitor window 826 to 833 frames (RTX) after staggered compile, 844 to 999 after audio-at-idle and the yielding `pr-xnnpack-10801` build (`ARCHITECTURE.md` section 3.5, second table); longest prewarm tick 92 ms then 40 ms (RTX); first key-press frame 24.4 to 36.4 ms (RTX).
- Repo topology experiments (about the tool, not this idea):
  - MEASURED `experiments/topo-field/out/results.md`: moving certainty field, 20 walkers: E1 DEAD (SIMPLIFIED 0.1396 events per frame, bar 0.1); post-hoc SIMP-H UNRESOLVED, 1.78 to 2.05 per second against 0.1 x B1 = 0.069 to 0.079; E2 PASS, core p95 0.0977 ms per frame at h=4 (bar 0.5 ms); K5 shuffled control 182.65x (bar 20x).
  - R3 gives the N=0 floor as 0.107 to 0.172 per second; the topo-field README gives 0.123 to 0.172 (SIMP-H). The two differ in the lower end; the column behind R3's figure is not stated.
  - MEASURED `experiments/occluder-topology/out/results.md`: filtered events 0.43 to 0.49 x B1, UNRESOLVED; shuffled control 2.59x (bar 20x).
  - Neither tests a slowly varying accumulated field. Reusable tooling: `hexgrid.mjs`, `cc.mjs` (`makeLabeler` `:4`, `diffComponents` `:39`), `path.mjs`, `lib/anime/topology.js:40` (`h0Superlevel`).
- Data a route heat map could use, MEASURED by grep: seal position `live.seal.x/.z` (`store.js:36`, mutable object, stepped in sub-steps of at most 1/120 s, `Controller.jsx:149`); `warmTick` samples at 10 Hz. Click target `live.target`/`live.travelTo` (`store.js:39,41`); arrivals `live.arrival` (`store.js:64,67`).
  - No position, dock-visit or custom event leaves the browser; `clarityEvent` (`lib/clarity.js:16`) has zero callers; no PostHog. No cross-session visit history exists. Clarity loads only if `NEXT_PUBLIC_CLARITY_ID` is set and DNT/GPC are off (`lib/clarity.js:6-8`); Cloudflare beacon at `app/layout.jsx:44`.
  - A client-side field would be a `Float32Array(1615)` (6.5 KB) or 26 counters plus a timestamp. The privacy page (`app/privacy/page.jsx:30-37`) says "no cookies of its own" and does not mention `localStorage`.

## 3 Prior art (R1)

Flags: F = page fetched and read; H = read only as a search highlight (an excerpt of the real page); 2 = third-party write-up of a primary source not opened. All rows SOURCE.

| # | system | recorded / prefetched / stated limits | flag | URL (page title) |
|---|---|---|---|---|
| 1 | UE PSO Precaching 5.x | Nothing recorded; PSOs derived at component PostLoad from material + vertex factory + mesh-pass processors, compiled async; kept only in driver cache ("hundreds of megabytes or even gigabytes" otherwise); first driver-cache retrievals "can take a few milliseconds"; up to 2 GB per compile thread; empty-cache initial compile "less than a minute on medium spec CPUs"; stats Missed/Too late/Hit | F (cut at validation section) | https://dev.epicgames.com/documentation/en-us/unreal-engine/pso-precaching-for-unreal-engine ("PSO Precaching for Unreal Engine", UE 5.9) |
| 2 | UE bundled (recorded) PSO cache | Run with `-logPSO`, play "as many paths as possible", `rec.pipelinecache` merged into one `.stable.upipelinecache`; per-PSO game usage mask (example "up to 60 maps"); modes Paused/Fast/Background/Precompile; "single monolithic file", splitting into chunks "is hard"; graphics PSOs manual only, no D3D11 | F + H (usage mask) | https://dev.epicgames.com/documentation/en-us/unreal-engine/manually-creating-bundled-pso-caches-in-unreal-engine ("Manually Creating Bundled PSO Caches", UE 5.7) and the same page under `/documentation/unreal-engine/...?lang=en-US` |
| 3 | UE tech blog | Precache subset at load; Fortnite Battle Royale "compiles about 30,000 PSOs for a match and uses about 10,000", out of "millions" | H | https://www.unrealengine.com/en-US/tech-blog/game-engines-and-shader-stuttering-unreal-engines-solution-to-the-problem ("Game engines and shader stuttering: Unreal Engine's solution to the problem") |
| 4 | UE compile order by use count | Recorded cache keeps first-frame-used and use counts; order Default / FirstToLatestUsed / MostToLeastUsed; sorting "can reduce situations where PSOs aren't compiled in time" | 2 + H | https://imzlp.com/posts/24336/ ("UE项目优化：PSO Cache"); https://tqjxlm.dev/unreal-engine-pso-cache-mechanism-usage-and-optimization/ ("Unreal Engine PSO Cache: Mechanism, Usage and Optimization") |
| 5 | UE legacy FShaderCache | Draw states logged (`r.UseShaderDrawLog`), each tied to a streaming key (`FShaderCache::SetStreamingKey`); "Region/Stream Batching ... limits predrawing to only those draw states required by the active streaming key"; logging "adds noticeable fixed overhead"; OpenGLDrv and MetalRHI only (likely legacy; no version stamp) | H | https://dev.epicgames.com/documentation/en-us/unreal-engine/fshadercache-in-unreal-engine (FShaderCache page) |
| 6 | Valve Fossilize | Vulkan layer `VK_LAYER_fossilize` serialises samplers, layouts, render passes, shader modules, pipelines to `.foz`; `fossilize-replay` warms a driver cache; format survives abrupt cutoff; `FOSSILIZE_DUMP_SYNC=1` "likely very slow" | F | https://github.com/ValveSoftware/Fossilize ("ValveSoftware/Fossilize: A serialization format for various persistent Vulkan object types") |
| 7 | Steam shader pre-caching | Fossilize data crowd-sourced, replayed locally before launch; replay output driver-specific, "invalidated by driver updates"; Valve's own FAQ fetch returned empty | H | https://github.com/ValveSoftware/steam-for-linux/issues/8570 ("Is shader pre-caching GPU independent ?"); https://github.com/ValveSoftware/steam-for-linux/issues/7533 ("shadercache disk usage ... bigger than reported"); https://www.gamingonlinux.com/2020/05/steam-beta-adds-vulkan-shader-processing/ ("Steam Beta adds Vulkan shader processing") |
| 8 | Dolphin async compile + ubershaders | UID cache of shaders seen in play; hybrid mode renders with a precompiled ubershader while the specialised one compiles; ubershaders "much slower"; exclusive mode "incredibly demanding"; hybrid can still stutter on NVIDIA GL ("GL_LINK_STATUS is checked ... on the main thread"); threads "only scale up to a certain point" | F (about 12k chars) + H | https://dolphin-emu.org/blog/2017/07/30/ubershaders/ ("Ubershaders: A Ridiculous Solution to an Impossible Problem"); https://github.com/dolphin-emu/dolphin/pull/5702 ("Ubershaders 2.0"); https://eng.dolphin-emu.org/docs/guides/performance-guide/ ("Performance Guide") |
| 9 | Unity ShaderVariantCollection | Editor "can track which variants your application uses when it runs"; `WarmUp()`; page states no costs; sister page: on DX12/Metal/Vulkan a variant warmed without exact vertex layout and render state may be "inaccurate" | F + H | https://docs.unity.com/en-us/engine/current/manual/materials-and-shaders/shaders/shader-troubleshooting/shader-reduce-stalling/shader-variant-collections ("Create a shader variant collection", Unity 6.6); https://docs.unity3d.com/2021.3/Documentation/Manual/shader-loading.html ("How Unity loads and uses shaders") |
| 10 | Unity GraphicsStateCollection | `BeginTrace`/`EndTrace` to `.graphicsstate`, development builds only; `WarmUp` or `WarmUpProgressively`; "On the Web platform, shader compilation is always performed synchronously"; one collection per API and platform | H | https://docs.unity3d.com/Manual/shader-pso-trace.html ("Trace and manage PSO data collections"); https://docs.unity.com/en-us/engine/7000.0/script-reference/unityengine/rendering/graphicsstatecollection/warmup ("WarmUp, GraphicsStateCollection"); https://docs.unity.com/en-us/engine/7000.0/manual/materials-and-shaders/shaders/shader-troubleshooting/shader-reduce-stalling/shader-prevent-stutter/shader-pso-trace-warming/shader-prewarm ("Warm up PSOs") |
| 11 | KHR_parallel_shader_compile | Adds `COMPLETION_STATUS_KHR` for a non-blocking poll; "without this extension, there is no way for a user to check compile/link status without potentially blocking and stalling"; with it programs "are likely to take the same total wall time to link"; "Never check compile status unless subsequent linking fails"; no timings | F | https://registry.khronos.org/webgl/extensions/KHR_parallel_shader_compile/ ("WebGL KHR_parallel_shader_compile Extension Specification", rev 6, 2020-11-24) |
| 12 | three.js compileAsync | Promise resolves "when the given scene can be rendered without unnecessary stalling due to shader compilation"; uses the extension; `compile()` synchronous; `checkShaderErrors` "may be useful to disable this check in production for performance gain" | F + H | https://threejs.org/docs/pages/WebGLRenderer.html ("WebGLRenderer - Three.js Docs"); https://threejs.org/docs/pages/WebGLRenderer |
| 13 | three.js r178 WebGLProgram | `getProgramInfoLog`/`LINK_STATUS` run in `onFirstUse` only if `debug.checkShaderErrors`; `isReady()` polls `COMPLETION_STATUS_KHR`; comment "It may cause a stall when it's first used"; blocking behaviour inferred, summary is a model summary of the file | F (summary) | https://raw.githubusercontent.com/mrdoob/three.js/r178/src/renderers/webgl/WebGLProgram.js |
| 14 | three.js link blocking | PR 19745: link "is forced to block ... the first time information about that program is queried"; PR 19752: a first `getProgramInfoLog()` took 49 ms, under 2 ms after precompile; Discourse 41069: delay "is mostly the time waiting for the compile/link to complete" | H | https://github.com/mrdoob/three.js/pull/19745 ; https://github.com/mrdoob/three.js/pull/19752 ; https://discourse.threejs.org/t/getprograminfolog-performance-issue/41069 ; https://github.com/mrdoob/three.js/issues/16321 |
| 15 | ANGLE / Chrome shader cache | Binary cache reused on `LinkProgram`, falls back to normal link on load failure; ESSL-to-HLSL makes compiles costlier; "most of the time in a compile is spent in the D3D compiler itself which we cannot avoid"; Electron PR measured 31 ANGLE links of about 15 ms each (about 480 ms serialised) on Intel Iris Xe, D3D11, first raster | H | https://github.com/microsoft/angle/wiki/Caching-compiled-program-binaries ("Caching compiled program binaries"); https://chromium.googlesource.com/angle/angle/+/refs/heads/main/extensions/ANGLE_program_cache_control.txt ; https://chromium.googlesource.com/angle/angle/+/refs/heads/main/extensions/ANGLE_blob_cache.txt ; https://groups.google.com/g/angleproject/c/V8YL8qfnh88 ("Angle Shader Compile Issues In Windows."); https://releases.electronjs.org/pr/54113 ("PR #54113 / Electron Releases"); https://groups.google.com/a/chromium.org/g/graphics-dev/c/X-NY0T_FsdY ("What is GrShaderCache?") |
| 16 | WorldStream (arXiv 2610.28827) | Position + velocity; plans and world "compilation" (world build, not shaders) along the predicted corridor; bands required/preferred/speculative; order by predicted entry time eta(i); on 100 replayed route traces directional prefetch "reduces total route waiting to 3.52 s"; recent preprint dated 2026-10-20, review status unchecked | F (abstract, 4.1, 4.2, 6.2) | https://arxiv.org/abs/2610.28827 ("WorldStream: Streaming Interactive 3D Worlds ...") |
| 17 | Velocity-based chunk prefetch | Ring around player, d = v * t_load; Minecraft render distance default 16, range 2 to 32; Cinevva "pre-fetch 2 chunks ahead ... at walking speed" | F + H | https://minecraft.wiki/w/Options ("Options"); https://app.cinevva.com/blog/2026-02-25-open-world-browser-part-04-streaming-before-fancy ("Building an open world in the browser, part 4") |
| 18 | Prediction-based prefetch, remote rendering | Movement history, motion model vs spatial locality; prediction beat locality by about 35% (random walk) and 17% (circular) hit ratio; locality wins by 5% in low-detail worlds | H | https://eprints.cs.vt.edu/archive/00000984/01/PredictionPrefetch-TR.pdf ("Prediction-Based Prefetching for Remote Rendering Streaming in Mobile Virtual Environments") |
| 19 | Walkthrough frequent traversal | Disk blocks laid out and prefetched from mined frequent traversal paths; abstract claims better prefetch accuracy; no numbers read | H | https://onlinelibrary.wiley.com/doi/10.1002/cav.149 ("Using prefetching to improve walkthrough latency") |
| 20 | AppStreamer | File-read traces from many users, continuous-time Markov chain; storage cut 87% (Dead Effect 2) and 86% (Fire Emblem Heroes) | H | https://ewsn.org/file-repository/ewsn2020/037_048_theera-ampornpunt.pdf ("AppStreamer") |
| 21 | Patent US 12555182 | Per-shader "frequency of usage" recorded during pre-compilation; installs pre-compiled shaders partially "based on the usage frequency" (install-time, not route) | H (mirror page) | https://exa.ai/library/legal/patent/90bfsbl5l24 ("Pre-processing system and method thereof (US Patent 12555182)") |
| 22 | Game-analytics heat maps | Counts per cell or trajectories, for design review, nothing prefetched; heatmaps "ignore directional and temporal information" | H | https://andersdrachen.com/wp-content/uploads/2014/07/spatialgameanalytics_cig2013.pdf ("Spatial Game Analytics and -Visualization"); https://andersdrachen.com/wp-content/uploads/2014/07/beyondheatmapsspatiotemporalclusteringusingbehaviorbasedpartionioningofgamelevels_ieeecig2014.pdf ("Beyond Heatmaps") |
| 23 | Guess.js | Analytics navigation report mapped to webpack chunks; next-page probability model; prefetches top-N by probability; "mapping ... is the most fragile part of the entire process" | H | https://web.dev/articles/predictive-prefetching ("Faster web navigation with predictive prefetching"); https://github.com/guess-js/guess ; https://blog.mgechev.com/2018/05/09/introducing-guess-js-data-driven-user-experiences-web/ |
| 24 | quicklink | Nothing recorded; prefetches in-viewport links when idle; "< 2KB minified/gzipped" | F (README) | https://github.com/GoogleChromeLabs/quicklink ("GoogleChromeLabs/quicklink") |
| 25 | Next.js prefetching | Nothing recorded; viewport, hover/touch intent, newer request replaces older, off-screen discarded; production only; static client cache TTL 5 min | F | https://nextjs.org/docs/app/guides/prefetching ("Prefetching") |
| 26 | Padmanabhan and Mogul 1996 | Dependency graph of file accesses in lookahead window w; prefetch B when arc weight (count of B within w after A / count of A) exceeds threshold p; weights need aging and pruning ("we have ignored these issues") | H | http://ccr.sigcomm.org/archive/1996/jul96/ccr-9607-mogul-padmanabhan.pdf ("Using Predictive Prefetching to Improve World Wide Web Latency") |

Closest precedents (R1's ranking, SOURCE-based judgement):
1. Travel-time deadline ordering is the shape of WorldStream's eta(i) ordering; the geometry prior is prior art, not novel.
2. A probability prior over a transition graph with threshold and aging is Padmanabhan-Mogul and Guess.js; a per-visitor heat map feeding it is an application, not a new class.
3. Use-count ordering of a pipeline cache exists in Unreal (via secondary sources); partitioning by level or region exists in Unreal (usage mask, streaming key) and Unity (one collection per platform and API).
4. Generic-then-specialised exists in Dolphin (hybrid ubershader); it costs GPU time and only works when the ubershader exists.

Searched and not found (exa web search; no ACM/IEEE paywalled search, no Unreal or Unity source grep; absence is not proof of absence):
- Queries: "precompile shaders based on predicted player route heat map visit frequency shader warmup order"; "precompile shaders for adjacent rooms or nearby levels graph adjacency warm up next area before player arrives"; "three.js compile materials ahead of player movement progressive compileAsync nearby objects distance priority"; "visit frequency heat map of player locations used to prioritize asset streaming OR shader precompilation"; "predicting player path to prefetch assets streaming open world trajectory prediction"; "GDC talk streaming open world predict player path prefetch ... shader compilation hitches".
- No source uses a visitation heat map or topological/graph chunking of the world to schedule shader or program compilation. Nearest: Unreal usage masks and streaming keys (static, developer-chosen), Unreal use-count ordering (recorded runs, not route-conditioned), a patent selecting shaders by usage frequency (install-time).
- No source conditions compile order on the visitor's own route in one session; per-session adaptation appears only for streaming (WorldStream, Cinevva).
- No source prepares shaders by graph distance on a place graph. Dolphin argues against predicting shaders ("past configurations don't tell us anything about future configurations", read on the blog page); its configuration space is unbounded, 26 docks with statically known programs is a different regime (R1's reading; the only first-party counter-argument found).
- No GDC talk or paper on predicting the path to compile shaders; path or velocity prediction exists for asset streaming only.
- No heat map used to order web-route prefetch; Guess.js uses aggregate analytics probabilities.
- No measurement of about 150 ms per D3D11/ANGLE link, or of getProgramInfoLog at about a quarter of first-second time. Nearest numbers: 49 ms for one getProgramInfoLog (three.js PR 19752, driver and scene unknown) and about 15 ms per ANGLE link on Intel Iris Xe (Electron PR 54113).

## 4 Theory (R2)

Setup (DERIVED, R2 section 7): cells are vertices of the hex-adjacency graph (about 1,600 vertices); H : V -> R extended to edges and triangles by min of vertex values, so a simplex is in {H >= tau} iff all its vertices are. Let f = -H with simplex value = max of vertex values; sublevel sets of f are the superlevel complexes of H; f is PL on a finite complex, hence tame. For two heat fields, eps = ||H - H'||_inf bounds ||f - f'||_inf (min and max are 1-Lipschitz in sup norm).

Stability theorem (SOURCE: Cohen-Steiner, Edelsbrunner, Harer, "Stability of persistence diagrams", Discrete Comput Geom 37(1):103-120, 2007; text read is the SCG 2005 version):
- Bottleneck Stability: X triangulable, f, g : X -> R continuous and tame, then d_B(D(f), D(g)) <= ||f - g||_inf, in every homology dimension. d_B is the infimum over bijections of the supremum over points of the L-infinity distance, diagonal included with infinite multiplicity. PL functions on finite complexes are tame.
- The paper states that critical values, critical points and critical-point pairs are NOT stable; only the diagram is.
- Superlevel sets: apply the theorem to -f (R2's trivial step).
- Related, all SOURCE: elementary PL proof along the straight-line homotopy, with O(n) update per transposition (Cohen-Steiner, Edelsbrunner, Morozov, "Vines and vineyards by updating persistence in linear time", SCG 2006); merge tree d_I(T_f, T_g) <= sup |f - g| (Thm 2) and d_B(Dgm0(f), Dgm0(g)) <= d_I(T_f, T_g) (Thm 3), Morozov, Beketayev, Weber (preprint manuscript); significance rule "lifetime exceeds 2 c_n" for density superlevel sets (Fasy et al., Ann. Statist. 42(6):2301-2339, 2014; by analogy in the density case).

Choosing the threshold (SOURCE: Chazal, Guibas, Oudot, Skraba, "Persistence-Based Clustering in Riemannian Manifolds", SCG 2011; J. ACM 60(6), art. 41, 2013, venue from a search result):
- ToMATo: mode seeking on a neighbourhood graph, merging by persistence with union-find and the elder rule; peaks with prominence < tau merge into a peak of prominence >= tau. tau = +infinity returns the 0-dimensional diagram.
- Pick tau from the diagram: a gap between k prominent points and the rest gives exactly k clusters for tau anywhere in the gap; automatic rule: largest drop of sorted prominences (compared to the eigengap). Without a gap, the diagram gives the cluster count as a function of tau.
- Thm 4.8 (full version): if D0(f) is (d1,d2)-separated, for tau in [d1 + O(eps), d2 - O(eps)] the cluster count equals the number of peaks with prominence >= tau, with probability >= 1 - exp(-Omega(n)). Thm 4.9: only the top parts of basins are stable. Figure 4: a perturbation tiny against the prominence gap moves a whole ascending region between basins, so component identity is not stable.

Derived consequences (DERIVED by R2, sections 4 and 7; no source states them):
- Diagram bound: each diagram point (peak height p, merge height s, persistence p - s) moves by at most eps per coordinate, up to matching with the diagonal.
- Chunk count: components of {H >= tau} correspond to diagram points with p >= tau > s (elder rule). With N(tau, delta) the number with p - s >= delta: N' >= #{points of D(H): p >= tau + eps, s < tau - eps, p - s >= delta + 2 eps}; N' <= #{points of D(H): p >= tau - eps, s < tau + eps, p - s >= delta - 2 eps}, needing delta > 2 eps. N cannot change unless a diagram point lies within eps of tau (by p or s) or within 2 eps of delta in persistence.
- Cell flips: only cells with |H(x) - tau| <= eps can change membership of {H >= tau}.
- The merge tree, hence the nesting hierarchy across thresholds, is eps-stable (Morozov et al. Thm 2).
- Field speed bound (DERIVED): for H_t(x) = sum_i w_i K(x - x_i) exp(-lambda (t - t_i)), between deposits ||H_{t+D} - H_t||_inf <= lambda D ||H_t||_inf (Lipschitz, L = lambda ||H||_inf). A deposit of weight w jumps the field by at most w K(0). With continuous deposit at rate rho, dH/dt = rho K(x - gamma(t)) - lambda H, H <= rho K(0)/lambda, so ||dH/dt||_inf <= 2 rho K(0), independent of lambda; per frame at most about 2 rho K(0) dt. The decay update rule (multiply the sum by the decay factor, add the new arrival) is SOURCE (Cormode, Shkapenyuk, Srivastava, Xu, "Forward decay", ICDE 2009).
- Hysteresis speed bound (DERIVED): the diagram path moves at speed <= L per coordinate (<= 2L in persistence). Two thresholds tau_lo < tau_hi separated by g: a chunk cannot be born at tau_hi and die at tau_lo faster than g / L.

Not guaranteed (R2):
- Component identity or membership: the diagram is stable, the map peak -> region is not (CEH; ToMATo Fig. 4). Two peaks within eps of each other can swap which is the elder, so chunk labels can flip.
- Boundary location: where H is flat near tau a boundary can move up to eps / |grad H| in the smooth picture (mean value theorem).
- Any bound on the number of events over time: a point hovering at tau - eps flickers. Worst-case counts (at most C(N,2), about 1.28M for N = 1,600, vertex-order swaps under a straight-line homotopy; time-varying Reeb graph E <= k^2, a 3D-plus-time worst case, Edelsbrunner et al.) are too loose to use.
- Stability across a change of decay or bandwidth (different fields), and the identity of an H1 hole (its diagram is stable, a given hole is not).

Theorem ledger (R2): theorems found: CEH bottleneck stability; PL stability (vines); interleaving implies d_B for H0 (attributed to Chazal et al., original not read); merge-tree stability; d_B(Dgm0) <= d_I; ToMATo Thm 4.8 and 4.9. Conjectures for this proposal, unproven (HYPOTHESIS): route-heat fields change slowly enough that events are rare in practice; two-threshold hysteresis plus delta removes flicker (only the dwell-time inequality is derived); chunk identity can be made stable by a tracking rule; any bound on total chunk events per session.

Nearest prior art on trajectory density persistence (SOURCE, R2 section 5):
- Dey, Wang, Wang, "Graph reconstruction by discrete Morse theory", SoCG 2018, https://arxiv.org/pdf/1803.05093: GPS trajectories to a density field, persistence-guided Morse cancellation extracts the road graph; extracts a graph, not chunks; no time decay.
- Chen, Dobra, Ann. Appl. Stat. 2020, https://doi.org/10.1214/19-aoas1311 (highlights only): KDE of GPS locations, activity space {p >= tau1} and anchor locations {p >= tau2}, tau1 < tau2; thresholds are spatial tiers, not temporal hysteresis; the raw KDE is shown not to be stable.
- Pokorny, Goldberg, Kragic, ICRA 2016: clusters whole trajectories by homotopy class, not space.
- Tracking: Lukasczyk et al., "Nested tracking graphs", CGF 36(3):12-22, 2017: a tracking graph covers one threshold, small threshold changes can look very different; remedy is a nesting hierarchy. This is a published statement of the failure hysteresis targets.
- Engine baseline (Unreal World Partition, UE 5.9 docs): regular grid cells, loaded set = cells intersecting a streaming source's range (sphere, radius = Loading Range; doc example 256 m cells, 768 m range, not defaults); cell membership never depends on history; no hysteresis or unload-delay setting was read (not proof it does not exist).
- Not found: persistence or merge trees used to partition a game world or drive streaming; Mapper on trajectories; a published bound on events of a slowly varying 2D scalar field; a published Lipschitz-in-time statement for exponentially decayed KDE on a grid; a published two-threshold hysteresis theory for persistence regions; an Unreal setting equivalent to history-dependent cells.

## 5 First offline numbers (R3): SYNTHETIC routes, not visitors

All MEASURED in simulation (scripts `heat.mjs`, `summ.mjs` and `deadline_cover.mjs`, not committed); no visitor was observed.
- Setup: `makeHexGrid(84, 4)` = 1,615 cells (NORTH_RIM radius 84 m; HEAD island 116 m). 5 of 26 dock points lie beyond r = 83 and are clamped to 83; 4 places have centres beyond 84 m (up to 111.4 m), so the grid cannot represent them.
- Heat: per frame (60 Hz, 7,308 frames = 121.8 s) `H *= exp(-ln2 * dt / 90)` then `H += dt * exp(-d^2 / (2 * 6^2))` within 3.5 sigma of the seal. Units: seconds of dwell in a 6 m Gaussian. The 90 s half-life barely acts in 122 s (x0.63 at 60 s).
- Dock-seeking route: `makePath(seed)`, nearest-neighbour tour of the 26 dock points at boost speed (61.78 s = 3,707 frames), then a 60 s seeded roam. The tour is identical for all seeds; a tour visiting every dock makes "all docks are in the heat" true by construction.
- Control: uniform wanderer with the same speed trace per frame (same length and time), heading random walk 1.2 rad per sqrt(s), reflected at r = 80, no dock seeking; seeds 1 to 3, plus 30 more (100 to 129).
- Topology: components of {H >= tau} by `makeLabeler` (6-neighbour); persistence by `h0Superlevel(H, g)` (`lib/anime/topology.js:40`); cross-check bars with birth >= tau > death plus the essential class equals the labeler count in 122 of 122 sampled frames per run (0 mismatches). tau = 10, 25, 50 percent of the current maximum; simplified = persistence at least 10 percent of the maximum.
- Area, components, docks in the top component, end of tour (frame 3,707, 61.8 s); components shown as raw (simplified); docks as top (any component):

| route | tau | area H>=tau | components | docks of 26 |
|---|---|---|---|---|
| dock-seeking tour | 10% | 48.4% | 1 (1) | 26 (26) |
| dock-seeking tour | 25% | 23.7% | 2 (1) | 23 (23) |
| dock-seeking tour | 50% | 2.0% | 2 (2) | 2 (3) |
| wanderer seeds 1,2,3 | 10% | 30.2, 33.3, 30.6% | 1, 1, 1 | 5, 8, 13 |
| wanderer seeds 1,2,3 | 25% | 21.6, 20.9, 20.7% | 1, 1, 1 | 4, 7, 7 |
| wanderer seeds 1,2,3 | 50% | 5.0, 6.3, 5.5% | 3, 3, 4 | 1, 1, 1 (2, 3, 2) |
| wanderer, 30 seeds | 10% | median 28.6% (19.9 to 40.4) | 1 | median 7 (3 to 13) |
| wanderer, 30 seeds | 25% | median 17.3% (6.6 to 30.0) | median 1 (1 to 5) | median 3 (0 to 10) |
| wanderer, 30 seeds | 50% | median 5.6% (2.2 to 11.8) | median 2 (1 to 6) | median 0 (0 to 2) |

- End of walk (122 s: tour then 60 s roam), seeds 1, 2, 3: dock-seeking tau 10%: area 27.7, 44.0, 27.0%, components 7, 2, 6, simplified 1, 1, 2, docks in top 10, 25, 4, bar persistence (seed 1) 0.058 0.049 0.041 0.039 0.024 of max. Dock-seeking 25%: 10.9, 21.5, 9.7%; 2, 1, 3; docks 3, 7, 1. Dock-seeking 50%: 4.1, 11.0, 2.2%; 2, 1, 1; docks 1, 3, 0. Wanderer 10%: 45.2, 52.8, 23.8%; 1, 1, 1; docks 11, 12, 10. Wanderer 25%: 22.1, 24.5, 9.2%; 3, 3, 2 (simplified 3, 2, 2); docks 6, 6, 4; 30 seeds median area 25.5% (12.6 to 30.0), median 2 components (1 to 4), median 5 docks (0 to 7). Wanderer 50%: 5.1, 4.7, 3.2%; 4, 4, 1; docks 0, 1, 2.
- Static layout prior (first-visitor case; same 6 m Gaussian summed at the 26 dock points, no route): tau 10%: 35.2% of area, 6 components, 2 docks in the top, all 26 in some component; 25%: 20.1%, 12 components; 50%: 6.3%, 18 components (17 after the 10% filter). Jaccard overlap of the route's {H >= 25%} with the prior's: dock-seeking tour end 0.423; wanderer tour end 0.112, 0.165, 0.176; end of walk dock-seeking 0.113, 0.129, 0.032; wanderer 0.152, 0.127, 0.118.

The tau band problem (MEASURED, R3's reading):
- tau 10%: the top component is one blob (24 to 53% of area) holding all 26 docks for the full tour and 10 to 13 for a wanderer; one chunk with most docks is today's behaviour (build everything), so no chunking.
- tau 50%: components cover 2 to 11% of area and hold 0 to 3 docks: per-dock chunking, the same information as `live.seen`.
- tau about 25%: a dock-seeking tour gives one dominant component holding 23 of 26 docks in 23.7% of area; a wanderer a median of 3 (0 to 10) in 17.3%. The separation exists because the tour visits every dock by construction; after a 60 s roam the dock-seeking top component holds 3, 7 and 1 docks, inside the wanderer's 0 to 7 range.
- The persistence filter matters: at tau 10% a 7-component end-of-walk field collapses to 1; small bars are 0.02 to 0.06 of max.

Topology events at tau = 25% of max over the walk (events; per minute; walk 2.03 min):

| variant | dock-seeking seeds 1,2,3 | wanderer seeds 1,2,3 |
|---|---|---|
| relative tau, 60 Hz, raw | 35, 34, 40; 17.2, 16.7, 19.7 | 6, 28, 19; 3.0, 13.8, 9.4 |
| relative tau, 1 Hz, raw | 27, 28, 30; 13.3, 13.8, 14.8 | 2, 10, 17; 1.0, 4.9, 8.4 |
| 1 Hz, persistence >= 10% of max | 13, 12, 14; 6.4, 5.9, 6.9 | 2, 5, 7; 1.0, 2.5, 3.4 |
| absolute tau = 25% of final max, 60 Hz, raw | 16, 27, 11; 7.9, 13.3, 5.4 | 11, 29, 18; 5.4, 14.3, 8.9 |

- Kinds, dock-seeking seed 1, 60 Hz relative: birth 1, death 15, merge 2, split 17.
- Yardstick (`topo-field/out/results.md`, same path code): B1 chunk-boundary crossings 0.788, 0.690, 0.788 per second = 47.3, 41.4, 47.3 per minute; 0.1 x B1 = 4.7, 4.1, 4.7 per minute.
- Dock-seeking at 1 Hz: raw 0.28 to 0.31 x B1; filtered 0.135 to 0.146 x B1 (5.9 to 6.9 per minute), 1.4 to 1.5x the 0.1 x B1 bar. 8 to 20 times below the certainty-field SIMP-H rate (107 to 123 per minute, 1.78 to 2.05 per second): an accumulated field is calmer than a moving one and still above the bar.
- 60 Hz counts are 20 to 35% above 1 Hz (threshold flicker); evaluation would need about 1 Hz or hysteresis (certainty design: 0.35 and 0.65).
- Control: the wanderer gives fewer events at 1 Hz (1.0 to 8.4 per minute vs 13.3 to 14.8) but with the absolute threshold the two overlap (5.4 to 14.3 vs 5.4 to 13.3); normalising to the current maximum is itself a source of events. Event counts say how often a manifest would be recomputed, not whether a recomputation changes the compile order.
- Cost: whole section about 5 s wall-clock in one Node 25 process; one dock-seeking plus one wanderer seed (4 passes of 7,308 frames) 0.9 to 1.1 s, about 0.04 ms per frame-pass; a mean over a mixed workload, not a p95, not the kernel alone. Earlier bar p95 0.5 ms per frame; a browser version would run at the 10 Hz `warmTick`.
- Limits of these numbers: R = 84 m grid excludes 4 places; h=4 only (h=2, h=8 not run); sigma 6 m and 90 s half-life not swept; H0 only, no H1; 10% filter not swept; speed trace shared between routes controls length, not the slowdown near places; real visitors may idle, click-travel, use the Projects list, stay in one district or leave in under 20 s.

## 6 What would have to be true (R3, each measurable)

1. The queue does not drain before arrival: time from ready until every in-window dock is `compiled` (`window.__warm`) against earliest arrival; if drained within 8 s after ready, reordering gains 0. Number to beat: 0 cold arrivals today (not measured; no cold-arrival rate exists).
2. Cold arrivals exist and cost frames: arrivals with warm state not `compiled`, and arrival-frame p95. Baseline 83.2 ms Intel, 33.4 ms RTX at `beff5e24` (`ARCHITECTURE.md` section 3.3), measured before the lazy loaders; no HEAD number.
3. Heat predicts the next dock better than nearest-first: top-K heat hit-rate vs K earliest `deadlineS` docks on recorded real routes. On the synthetic tour EDF is the oracle by construction, so no synthetic result can show a gain.
4. The static layout prior predicts first arrivals better than `deadlineS` from spawn (only overlap numbers exist: 0.112 to 0.176 wanderers, 0.423 full tour).
5. The manifest has something to move: dock-only programs 18 of 124 (14.5%) RTX, 18 of 109 (16.5%) Intel; 71 dock meshes. At a synchronous 150 ms per D3D11 link (from the brief, not a repo file) the dock-only set is 2.7 s; at 30 to 90 ms per world build (from the brief) 27 builds is 0.8 to 2.4 s. A real first visit must save a measurable part of that.
6. Chunk topology is stable enough to recompute rarely: events <= 0.1 x B1 = 4.1 to 4.7 per minute. Synthetic: 13.3 to 14.8 raw and 5.9 to 6.9 filtered per minute (fail by 1.4 to 3.5x); wanderer 1.0 to 8.4 and 1.0 to 3.4.
7. Chunks are non-degenerate: at least two components at the working tau, none holding all 26 docks. Synthetic: tau 10% gives 1 component with 26/26 (degenerate), 50% gives 2 to 4 tiny ones; only 25% is between, with 23/26 in its top component.
8. No runtime cost: heat update plus labelling at or under p95 0.5 ms per frame (earlier core p95 0.0977 ms); first-visitor window at least 826 frames (RTX) and 938 (Intel), longest prewarm tick at most 40 ms (RTX) and 37 ms (Intel), first key-press frame at most 36.4 ms (`ARCHITECTURE.md` section 3.5, second table).
9. The curtain is not slowed: readyMs at most 11,685 ms (Intel) and 11,656 ms (RTX); programs at ready at most 109 and 124 (`e0-after/E0.md`); a prior before ready has no history and must not enlarge the `CRITICAL_S` set of 5 docks.
10. A persisted field is acceptable: client-side only, DNT/GPC respected, privacy page updated, no network call. A decision, not a measurement.

## 7 Unverified and open

Deduplicated from the three reports' "could not verify" and "not covered" lists.
- Real data: no real visitor route exists; every section 5 number is synthetic. Cold-arrival rate, queue drain time, compile and build cost per chunk and arrival-frame cost at HEAD are unmeasured (no browser was used); 150 ms per link and 30 to 90 ms per build come from the brief.
- A per-chunk program manifest would be new data: the registries (`registerWarm`, `registerLoader`, `registerEngineProvider`, `prewarm.js:20-21,26-36`) are keyed by dock id with no program list; not examined further.
- `docs/ARCHITECTURE.md` has two sections numbered 3.5 (lines 180 and 225); not edited.
- Unreal: the `MostToLeastUsed` / `FirstToLatestUsed` enum and `SortOrder` key come from two third-party blogs, not from engine source or an Epic page; the FShaderCache page has no version stamp; the PSO precaching fetch stopped at the validation section.
- Steam: Valve's own FAQ fetch returned empty; Steam statements rest on issue threads and GamingOnLinux.
- Unity: "Graphics Settings: Shader loading" (auto-tracking steps) not read.
- Dolphin: the blog past about 12k characters was not fetched (HTTP 403 via WebFetch and curl); hybrid and exclusive text and PR 5702 come from highlights.
- Chromium: the `shader_disk_cache.cc` highlight is an old trunk copy; current cache keying not verified. ANGLE_blob_cache says only the application defines the cache.
- three.js: compileAsync polling without the extension (Discourse says it resolves instantly) not read in r178 source; the WebGLProgram.js statement is a model summary, to be rechecked before quoting.
- GDC "Marvel's Spider-Man: A Technical Postmortem" and Guerrilla "Streaming the World of Horizon Zero Dawn": only abstracts or transcript fragments seen; path prediction not confirmed.
- Padmanabhan-Mogul result numbers not read. WorldStream is a preprint dated 2026-10-20, review status unchecked, read only in part.
- Theory: the SCG'05 text of CEH was read, not the 2007 journal PDF (numbering may differ); JACM 60(6) article 41 and Thm 4.8/4.9 numbering come from the SCG'11 text and a search result; arXiv 1107.5058 is not the ToMATo paper; Morozov-Beketayev-Weber final venue and theorem numbers unchecked; the interleaving-implies-bottleneck theorem is attributed to Chazal et al. and the original was not read.
- Carr-Snoeyink-Axen complexity bound not re-derived (commonly cited O(n log n + N alpha(N)), search-only); Edelsbrunner-Letscher-Zomorodian full text and Edelsbrunner-Morozov-Pascucci persistence-sensitive simplification are leads only; Chen-Dobra, Pokorny et al., Heine et al. survey (tracking section unconfirmed) read at highlight or abstract level; the 2026-dated arXiv papers on football and tennis TDA were not opened; Fasy et al. last 28k characters not read; the gamedev.net influence-map page returned 403 (search summary only); the Zhu et al. recursive KDE hits and the Fortnite 128 m / 256 m World Partition figure (community guide) are search-only.
- The min-extension of edge values in section 4 relies on the vines paper statement that PL and piecewise-constant maps with the same vertex values have equal diagrams, applied via negating H.
- Open modelling: persistence is H0 superlevel only; h=2 and h=8, sigma and half-life sweeps, and the 10% filter were not run; events were counted, not weighted by manifest-change cost.
- Report vs README: R3 gives the N=0 floor as 0.107 to 0.172 per second, the topo-field README as 0.123 to 0.172; unreconciled.

## 8 Sources

- R1 (section 3): every R1 URL appears once, in the URL cell of its row in the section 3 table, with page title.
- R2, theory and tracking:
  - https://link.springer.com/article/10.1007/s00454-006-1276-5 (abstract page, "Stability of persistence diagrams", DCG 37(1), 2007)
  - https://pub.ista.ac.at/~edels/Papers/2007-01-StabilityPersistenceDiagrams.pdf (SCG'05 text of the same paper)
  - https://pub.ista.ac.at/~edels/Papers/2006-04-VinesVineyards.pdf ("Vines and vineyards by updating persistence in linear time", SCG 2006)
  - https://mrzv.org/publications/interleaving-distance-merge-trees/manuscript (Morozov, Beketayev, Weber, "Interleaving distance between merge trees", preprint; Thm 1 to 3)
  - https://ar5iv.arxiv.org/html/1303.7117 (Fasy et al., "Confidence sets for persistence diagrams", Ann. Statist. 2014)
  - https://geometry.stanford.edu/lgl_2024/papers/cgos-pbcrm-11/cgos-pbcrm-11.pdf (Chazal, Guibas, Oudot, Skraba, "Persistence-Based Clustering in Riemannian Manifolds", SCG 2011)
  - https://hal.archives-ouvertes.fr/inria-00389390 (same work, INRIA report RR-6968; J. ACM 60(6) venue from search result)
  - https://www.cs.ubc.ca/sites/default/files/tr/1999/TR-99-09_0.pdf (Carr, Snoeyink, Axen, contour trees in all dimensions, tech report)
  - https://link.springer.com/doi/10.1007/s00454-002-2885-2 (Edelsbrunner, Letscher, Zomorodian, "Topological persistence and simplification", abstract only)
  - https://pub.ista.ac.at/~edels/Papers/2008-03-TimeVaryingReebGraphs.pdf (time-varying Reeb graphs, 2006 report; E <= k^2)
  - https://pub.ista.ac.at/~edels/Papers/2006-05-PersistenceSensitiveSimplification.pdf (persistence-sensitive simplification, lead only)
  - https://dav.lbl.gov/vignettes/NestedTrackingGraphs.html (Lukasczyk et al., "Nested tracking graphs")
  - https://diglib.eg.org/handle/10.1111/cgf12933 (Heine et al., survey of topology-based methods in visualization, abstract level)
- R2, decay, trajectories, engine baseline:
  - https://www.cs.ox.ac.uk/people/graham.cormode/pubs/papers/fwddecay.pdf (Cormode et al., "Forward decay", ICDE 2009)
  - https://gamedev.net/tutorials/programming/artificial-intelligence/the-core-mechanics-of-influence-mapping-r2799 (influence maps with decay, search summary only)
  - https://www.gameaipro.com/GameAIPro2/GameAIPro2_Chapter30_Modular_Tactical_Influence_Maps.pdf (Game AI Pro 2 ch. 30, search-only)
  - https://arxiv.org/pdf/1803.05093 (Dey, Wang, Wang, "Graph reconstruction by discrete Morse theory", SoCG 2018)
  - https://doi.org/10.1214/19-aoas1311 (Chen, Dobra, activity spaces from GPS data, Ann. Appl. Stat. 2020)
  - https://goldberg.berkeley.edu/pubs/icra2016-final-topo-traj-clustering.pdf (Pokorny, Goldberg, Kragic, topological trajectory clustering, ICRA 2016)
  - https://dev.epicgames.com/documentation/en-us/unreal-engine/world-partition-in-unreal-engine (UE 5.9, World Partition)
  - https://dev.epicgames.com/documentation/en-us/unreal-engine/world-partition---hierarchical-level-of-detail-in-unreal-engine (World Partition HLOD, search snippet)
- Repo files (R3 and context): `components/world/cutscene/prewarm.js`, `lib/world/cutscene/deadline.js`, `components/world/Controller.jsx`, `lib/clarity.js`, `app/privacy/page.jsx`, `docs/ARCHITECTURE.md`, `verification/topo/e0-after/E0.md`, `experiments/topo-field/README.md` and `out/results.md`, `experiments/occluder-topology/README.md`.
