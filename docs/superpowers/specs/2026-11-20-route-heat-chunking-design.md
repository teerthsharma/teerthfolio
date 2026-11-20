# Route-heat chunking: design spec (pre-registration, written before any code)

Status: design only. Repo state read: branch `exp/topology-field-and-load` at commit 51acb97 (measurements cited below are from the commits named beside each number). Sources: R1 (prior art), R2 (stability theory) and R3 (repo grounding), recorded in the companion document `2026-11-20-route-heat-chunking-research.md`.

## 1. Summary and non-goals

The seal's route builds a heat field on the island's hex grid. The persistence-filtered superlevel components of that field are the chunks. A chunk's manifest lists the dock worlds and programs near it. The prewarm queue (`components/world/cutscene/prewarm.js`) gives the docks in hot manifests a bounded priority bonus. When the seal leaves the hot set, the queue falls back to the current deadline order.

Non-goals:
- Not a renderer rewrite. Nothing drawn changes. Only the order of preparation work, and which docks receive a priority bonus, change.
- No change to window membership: `inWindow`, `CRITICAL_S` 1.6 s, `SPAWN_CRITICAL_S` 12 s, `HORIZON_S` 8 s, `DROP_S` 12 s (`lib/world/cutscene/deadline.js:7-10`) stay as they are. `warmPending` (the curtain hold) is unchanged. A `travelling` dock (within `TRAVEL_M` of `live.target`) keeps key -1000 and beats any heat.
- The deadline queue stays as the fallback and as the whole behaviour of a first visit. Before `ready` the heat is not consulted.
- No server, no transmitted data, no baked prior in this spec's build scope (section 5).

## 2. Honest premise

Each line is a fact from the repo or the research, with its source.
- From spawn the 8 s horizon already admits all 27 docks (26 PLACES plus the spawn statue play). From a dock point it admits 18 to 27 (median 24). Before `ready` the critical set is 5 docks from spawn (R3 section 1, `deadline_cover.mjs`). The heat therefore cannot add or remove candidates after `ready`; it can only reorder them.
- The queue works one unit per 0.1 s tick (one world build step or one compile root, `prewarm.js:116`, `Controller.jsx:101-104`): 10 units per second. Whether the queue drains before the seal arrives anywhere is not measured in the repo (R3 section 4, item 1). If it drains first, reordering gains nothing on any metric. Phase 1 measures this before the policy is built (gate G1, section 11).
- A first visitor's prior equals the static layout, and the nearest docks to spawn under that prior are the 5 critical docks, which `deadlineS` already puts first (R3 section 1, point 3). A first visit gains nothing from heat.
- No position or visit data exists anywhere today (R3 section 2). `live.seen` is a 26-bit `sessionStorage` set (`replay.js:22-33`). `clarityEvent` has zero callers (`lib/clarity.js:16`). No cross-session behaviour record exists.
- The program audit bounds the reachable share. Dock-only programs at ready: 18 of 124 (14.5%) on RTX 4060 Laptop and 18 of 109 (16.5%) on Intel UHD (`verification/topo/e0-after/E0.md`, Q3 table, default URL, median of 3, clean build `dc2677d`). Static 29, live 37 and mixed 9 programs on RTX are boot-time and not heat-dependent. Before the load work (`43f71f7`) dock-only was 29 of 138 and 29 of 142.
- The leverage therefore sits with returning visitors or a baked global prior, and with the ordering of 18 programs plus the dock world builds. Intel and RTX numbers are never compared with each other.

Prior art (R1): ordering by predicted entry time is WorldStream's and the existing `deadlineS`'s shape; a frequency prior over a route graph is Padmanabhan-Mogul 1996 and Guess.js; use-count ordering and per-region partition exist in Unreal. No source found conditions shader or program preparation on a persistence-filtered visitation heat field. Absence in a web search is not proof of absence (R1, "What is NOT found").

## 3. Definitions

Constants marked FIXED are the pre-registered defaults. They are tunable only before the first measurement of H1; after it they never change, and a change requires a new pre-registration version that names the failing numbers.

| Symbol | Definition | Value (FIXED) |
|---|---|---|
| Grid | Hex grid, centre spacing h, disc radius R, built by `makeHexGrid(R, h)` (`experiments/topo-field/hexgrid.mjs`), 6-neighbour CSR (`off`, `adj`) | h = 4 m, R = 84 m, n = 1,615 cells |
| H | Heat field, `Float32Array(1615)`, units of seconds of dwell inside the kernel | zero at session start |
| Kernel | Gaussian `K(d) = exp(-d^2 / (2 sigma^2))`, K(0) = 1, cut at 3.5 sigma | sigma = 6 m |
| Update | `H <- lambda * H + dt * K(|cell - seal|)`, `lambda = 2^(-dt / T_half)` | T_half = 90 s (continuous rate mu = ln2 / 90 = 0.0077 per s) |
| Normalisation | `Hn = H / M`, M = running maximum of `max(H)` over the session (monotone, never below 1e-9) | M persisted with the field |
| tau_hi, tau_lo | Hysteresis thresholds on Hn | 0.30 and 0.20 |
| delta | Persistence floor on Hn, from `h0Superlevel(Hn, g)` (`lib/anime/topology.js:40`) | 0.05 |
| Hot component (chunk) | A connected component C of `{Hn >= tau_lo}` (labelled by `makeLabeler`, `cc.mjs:4`) that contains a peak p with `Hn(p) >= tau_hi` and persistence(p) >= delta; the global maximum has infinite persistence | see rule |
| Hot set | Union of chunks | |
| Dilated chunk | Chunk plus every cell adjacent to it in the CSR (one ring, 4 m) | 1 ring |
| Chunk graph | Merge tree of Hn restricted to levels >= tau_lo, simplified at delta; its roots are the chunks | |
| Manifest(chunk) | The set of dock worlds whose dock cell lies in the dilated chunk, and the programs those docks own (owner map below) | |
| Cadence | Heat update at the `warmTick` cadence (10 Hz, `Controller.jsx:101-104`, dt from the caller); chunk recompute at 1 Hz | FIXED |
| Dock cell | Nearest grid cell to the dock point; a dock beyond R has Hn = 0 | |

Derived facts that follow from the constants (algebra, no measurement):
- A lone deposit gives a hot disc of radius 9.3 m at tau_hi and 10.8 m at tau_lo (`6 * sqrt(2 ln(1/tau))`: 6 * sqrt(2.408) and 6 * sqrt(3.219)). The dilated chunk adds 4 m.
- Delta never removes a chunk. The highest peak of a component of `{Hn >= tau_lo}` dies below tau_lo, so its persistence is at least `tau_hi - tau_lo = 0.10 > delta = 0.05`. Delta only prunes secondary peaks inside a chunk: the peak count and the chunk graph's nodes.
- With no deposit a peak falls from 1.0 to tau_lo in `90 * log2(5) = 209 s`, and an 8-bit quantised value reaches zero after 8 half-lives (720 s, `2^-8 = 0.0039`).
- Steady-state bound: with continuous deposit at rate rho = 1 per s, `H <= rho K(0) / mu = 129.8` s.

Owner map. `scripts/topo-audit.mjs` returns `programs[]` with `owners`, `class` and `dockIds` per linked program, and `dockEntries` (lines 157-171). The map is generated once per build by that script and committed as `lib/world/heat/owners.json` (dock id to program names and classes). It is new data: the prewarm registries are keyed by dock id with no program list (R3 section 5, `prewarm.js:20-21,26-36`). Programs of static, live and mixed owners are boot-time; they carry no dock id and are outside every manifest. At runtime the policy needs only the dock set; the program list serves instrumentation (phase 1) and the H3 accounting.

## 4. Policy

Applies after `ready` only, per candidate in `warmStep` (`prewarm.js:176-205`), for both world jobs and engine jobs.

1. Key. `key(dock) = s` if `s <= CRITICAL_S` (critical docks are never delayed). Otherwise `key(dock) = max(CRITICAL_S, s - beta * Hn(dock))` for docks in some hot manifest, and `key = s` for docks in no manifest. `s = deadlineS(seal, dock)`, `beta = 2 s` (FIXED). Ties break to the smaller `s`. `travelling` docks keep -1000. The existing `cands.sort` and `cands.find(c => c.run())` are unchanged.
2. Window. Membership and disposal are decided by the existing tests. A dock outside every manifest is prepared by the same queue when its deadline reaches the window, as today ("on demand" means no earlier deferral than the present behaviour).
3. Exit rule. When the seal's cell is outside the dilated hot set for more than 5 s (FIXED), the heat is ignored for ordering (`Hn = 0` for every dock) until the seal's cell is inside the dilated hot set again. The deposit keeps running, so a new chunk forms where the seal now dwells.
4. Empty heat. No hot component, or heat unavailable (DNT/GPC with no in-RAM field, or a restore failure): the queue is exactly the current one.

## 5. Data and privacy

- The field lives in RAM (`live`-side object, not React state). It is client-side only and never transmitted; no network call is added.
- Persistence: `localStorage` key `seal:heat` (one tab: `sessionStorage`), holding Hn quantised to 8 bits (1,615 bytes; the float32 form is 6,460 bytes, about 6.5 KB), plus M as float32, a wall-clock timestamp and a version byte. `restore(bytes, ageS)` multiplies by `2^(-ageS / 90)`.
- Gate: persistence is off when Do Not Track or Global Privacy Control is on, copying the predicate in `shouldLoadClarity` (`lib/clarity.js:6-8`: `doNotTrack` "1"/"yes"/true on `navigator` or `window`, `msDoNotTrack`, `globalPrivacyControl === true`). The gate applies to persisting, not to the in-RAM field. A stored field is cleared when the gate turns on.
- `app/privacy/page.jsx` (lines 30-37) lists what is measured and does not mention `localStorage`; one sentence is added before phase 2 ships behind its flag. The page's wording is the owner's.
- Consequence of the 90 s half-life, stated plainly: a persisted field carries a visit across a reload or a tab revisit of a few minutes (below tau_lo after 209 s). It carries nothing across days. A cross-day returning-visitor prior needs a second, slow field with a half-life in days. That field is outside this spec's constants; it is open decision D1 for the owner, default: not built.
- Baked global prior: optional, a build-time 16 x 16 coarse count map of dock-visit positions. It is not built until at least 100 real opt-in sessions exist. Today the count is 0, and no collection path exists (R3 section 2); defining one is a separate privacy decision not specified here.

## 6. Interfaces (names and signatures only)

New files under `lib/world/heat/` (each module with a docstring, no comments for what the code says):
- `field.js`: `HeatField`
  - `update(x: number, z: number, dt: number): void`
  - `snapshot(): Uint8Array | null` (null when the privacy gate is on)
  - `restore(bytes: Uint8Array, ageS: number): void`
  - read-only `hn(x, z): number`, `max: number`
- `chunks.js`: `ChunkSet`
  - `from(heat: HeatField): Chunk[]` where `Chunk = { id, cells: Int32Array, peak: number, persistence: number, area: number }`; reuses `h0Superlevel` and `makeLabeler`
  - `events(prev: Chunk[], next: Chunk[]): { birth, death, merge, split }`; reuses `diffComponents` (`cc.mjs:39`)
- `manifest.js`: `Manifest`
  - `for(chunk: Chunk): { docks: Set<string>, programs: Set<string> }`; reads `owners.json`
- `policy.js`: `PrewarmPolicy`
  - `key(dock, heat): number`; holds the exit-rule timer
- `owners.json`: generated by `scripts/topo-audit.mjs`.

Hook: one change in `components/world/cutscene/prewarm.js`, the two `key:` expressions at lines 188 and 200 (`travelling(...) ? -1000 : s`) call `PrewarmPolicy.key`, and `warmTick` calls `HeatField.update` and the 1 Hz chunk recompute. `experiments/topo-field/{hexgrid,cc}.mjs` are experiment-side; production copies of `makeHexGrid`, `makeLabeler` and `diffComponents` move to `lib/world/heat/` (the experiment files stay as the pre-registered tooling). The engine keeps its import rules (`docs/ARCHITECTURE.md` section 2); `lib/world/heat/` imports nothing from React or three.

## 7. Theory the design relies on (from R2)

THEOREM (bottleneck stability; Cohen-Steiner, Edelsbrunner, Harer, Discrete Comput Geom 37(1):103-120, 2007). For tame continuous f, g on a triangulable space, `d_B(D(f), D(g)) <= ||f - g||_inf`, in every homology dimension. Applied to `f = -H` on the hex complex with simplex value = max of vertex values, so superlevel sets of H are sublevel sets of f. `R2` read the SCG'05 version, not the journal PDF.

THEOREM (merge-tree stability; Morozov, Beketayev, Weber, preprint manuscript, Thm 2 and 3): `d_I(T_f, T_g) <= sup|f - g|` and `d_B(Dgm0 f, Dgm0 g) <= d_I`. Venue and numbering not verified.

DERIVED (R2 section 7, from the first theorem; elementary):
- Chunk-count margin. Let `eps = ||H - H'||_inf`. The number of chunks N(tau, delta) cannot change unless a diagram point of H has a peak within eps of tau, a merge height within eps of tau, or a persistence within 2 eps of delta (needs delta > 2 eps).
- Flip set. Only cells with `|H(x) - tau| <= eps` can change membership in `{H >= tau}`.
- Field speed. Between deposits `||H_{t+D} - H_t||_inf <= mu D ||H_t||_inf`. With continuous deposit, `||dH/dt||_inf <= 2 rho K(0)`, independent of mu (a sharper `rho K(0)` follows from the same equation and is not used). A per-frame deposit jumps the field by at most `dt K(0)`. Normalisation by the monotone M adds at most `Hn * rho K(0) / M`.
- Hysteresis dwell. A cell that reached tau_hi and leaves the hot condition (Hn below tau_lo) needs at least `g / L` seconds, `g = tau_hi - tau_lo = 0.10`, `L` the Lipschitz constant of Hn. With `L <= 3 rho K(0) / M`, the dwell is at least `0.033 M` s (M = 130 gives 4.3 s).

NOT GUARANTEED (R2 section 7): chunk identity or membership (the diagram is stable, the peak-to-region map is not; two peaks within eps can swap elder); boundary location where H is flat near tau; any bound on the number of events over a session (stability bounds perturbation size, not crossing counts; the combinatorial bounds `C(N,2)` and `E <= k^2` are too loose to use); stability across a change of sigma or half-life.

CONJECTURE (unproven; tested in H2): that route-heat fields change slowly enough that events are rare; that two thresholds plus delta remove flicker (only the dwell inequality is proved); that chunk identity can be made stable by overlap tracking.

Prior numbers that frame H2 (R3 section 3, synthetic routes only, relative tau = 25% of the current max, no hysteresis): 13.3 to 14.8 events per minute raw at 1 Hz and 5.9 to 6.9 per minute with a 10% persistence filter, for a dock-seeking tour, against `0.1 x B1` = 4.1 to 4.7 per minute (B1 = 41.4 to 47.3 per minute). That is 1.4 to 3.5 times over the bar before hysteresis, and 8 to 20 times below the moving certainty field (107 to 123 per minute, `experiments/topo-field/out/results.md`).

## 8. Pre-registered tests (fixed bars, written before code)

All offline tests (H1, H2) use one synthetic-visitor generator, `experiments/route-heat/visitors.mjs`. Fixed parameters: seeds 1 to 200 (`mulberry32`, `experiments/topo-field/field.mjs`); seed s is goal-seeking when `s mod 5` is 1, 2 or 3 and a wanderer otherwise (120 and 80 visitors, the 60/40 mixture). A goal-seeking visitor picks k uniform in 3 to 8 docks at random from the 26 PLACES dock points (clamped to r = 83 as in `experiments/topo-field/path.mjs`), visits them nearest-neighbour from spawn with the `path.mjs` kinematics (boost 15 m/s, slow-down near places), dwells 10 s at each, then roams (heading random walk 1.2 rad per sqrt(s), reflected at r = 80) to a fixed total of 180 s; an unfinished tour is truncated at 180 s. A wanderer is the roam law for 180 s from spawn at cruise 10 m/s (`MOTION.maxSpeed`), no dock seeking. Frame rate 60 Hz; the field is fed at 10 Hz, the chunks recomputed at 1 Hz. Dwell, 180 s and 10 m/s are pre-registered defaults, tunable only before the first run. The known-answer tests (K1 static, K2 split, K3 smooth, from `experiments/topo-field/test/known.test.mjs`) must pass on the new detector before H2 is believed.

### H1: route concentration (offline)
- Input: the 200 visitors; the field and chunks as in sections 3 and 4.
- Procedure: at route end compute the hot components at tau_hi (the same hysteresis rule). For each goal-seeking visitor take the top component (the one holding the global maximum). Visit mass = share of the 10 Hz route samples whose cell lies in that component; area = its cells / 1,615.
- Output: per visitor, mass share and area share; also, non-gating, the same for the union of all hot components.
- Bar: the top component holds at least 80% of visit mass within at most 25% of the island area, on at least 70% of the goal-seeking visitors.
- Kill criterion: below 70% of goal-seeking visitors, the design is DEAD (no leverage); nothing downstream runs.
- Files: `experiments/route-heat/h1.mjs`, `experiments/route-heat/out/h1.json`, `h1.md`.

### H2: stability (offline)
- Input: the 120 goal-seeking visitors.
- Procedure: events from `ChunkSet.events` between consecutive 1 Hz recomputes (birth, death, merge, split), with hysteresis and delta, per minute. B1 per visitor from `chunkCrossings` in `experiments/topo-field/baselines.mjs` (16 m square chunks inside a 48 m window; 41.4 to 47.3 per minute on the three R3 seeds). Sup-norm change: `max_x |Hn(t + 60) - Hn(t)|` over every 60 s window at 1 Hz, divided by `max Hn(t + 60)`.
- Bar (PASS): median over visitors of (events per minute / B1 per minute) at most 0.1, and median sup-norm change per 60 s at most 0.05.
- Kill criterion: median events above 0.5 x B1 is DEAD. Anything between is UNRESOLVED, reported as such.
- Prediction written before running: the sup-norm clause fails whenever the seal is away from a peak for 60 s, because decay alone changes a value by `1 - 2^(-60/90) = 0.370`. A failure of this clause alone with the event clause passing is UNRESOLVED, not DEAD. The clause stays as the pre-registered stability bar.
- Files: `experiments/route-heat/h2.mjs`, `out/h2.json`, `h2.md`.

### H3: compile saving (real build)
- Input: one production build; a recorded route replayed (the 3 goal-seeking visitors of seeds 1 to 3 converted to a route file); adapters named exactly, RTX 4060 Laptop and Intel UHD, never compared with each other.
- Procedure: `scripts/perf-frames.mjs --phase fresh` (first visit, `seen: false`, line 413) extended to 60 s and to a `--route <file>` driver (added in phase 1). Two arms from the same build, `?play` (deadline queue) and `?play&heat=on`; 3 runs per adapter per arm, medians. Metrics: (a) programs linked in the first 60 s after `ready` whose owning dock is not arrived at in those 60 s (from `owners.json` and `window.__warm`); (b) frames over 50 ms with a program link in the same frame (the `slow` list and `peakLinksPerSecond`, `perf-frames.mjs:444`).
- Bar: (a) at least 30% fewer than the deadline queue, and (b) not more numerous.
- Kill criterion: (a) saving under 10% is DEAD for compile saving.
- Expectation written before running: under reorder-only the saving can exceed 0 only if the queue has not drained by the 60 s mark; gate G1 (section 11) tests that first.
- Files: `experiments/route-heat/h3.mjs`, route file `experiments/route-heat/routes/`, output `verification/route-heat/h3/`.

### H4: out-of-heat arrival (real build)
- Input: same build, adapters and arms as H3.
- Procedure: with a hot chunk established, the seal list-travels (`live.travelTo`) to the dock in no manifest with the lowest Hn; 3 runs per adapter per arm. Metric: frames over 100 ms in the 2 s after arrival.
- Bar: not more numerous than the deadline-queue arm (median of 3, per adapter).
- Kill criterion: a failure sends the design back to the exit rule only: the 5 s dwell and the one-ring dilation are the only items that may change, as a logged new pre-registration version, and H4 re-runs.
- Files: `experiments/route-heat/h4.mjs`, output `verification/route-heat/h4/`.

Cost condition (not a numbered test): update plus 1 Hz recompute must meet the topo-field E2 bar, p95 at most 0.5 ms per call (`experiments/route-heat/cost.mjs`; the certainty field measured core p95 0.0977 ms at h = 4).

## 9. Risks and limits

Synthetic routes are not visitors. H1 and H2 use generated routes; no visitor was observed and no visitor route exists (R3 section 5). The goal-seeking generator visits docks nearest-neighbour, so concentration around docks is partly built in. H1 measures in-sample concentration, not prediction of the next dock; prediction hit-rate against the K earliest `deadlineS` docks needs recorded real routes and has no number in the repo.

The bar reading. H1's bar is written on the top component only. A tour of up to 8 docks with a 10 s dwell each splits visit mass over several docks, and transit trails sit near 0.1 of the maximum, below tau_lo, so the hot set fragments into one blob per dock. The literal bar may be dead for that reason and not because the heat carries no information. The union of components is reported beside it, non-gating; reading the bar as the union is open decision D2 for the owner, default: literal.

The threshold band is narrow. R3 measured, on a tour of all 26 docks, one blob holding all 26 docks at tau = 10% and 2 to 4 tiny components holding 0 to 3 docks at tau = 50%; only tau near 25% separates. tau_lo 0.20 and tau_hi 0.30 sit in that band and are fixed. Normalising to the running maximum is itself an event source (R3 section 3b).

First-visit gain is nil, and the gain for a returning visitor is limited by the 90 s half-life (section 5) and by the 18 dock-only programs (14.5 to 16.5% of programs at ready). Docks beyond R = 84 m (4 places have centres up to 111.4 m; 5 dock points clamp at r = 83 in the R3 path code) are outside the grid and get Hn = 0, so the heat never helps them.

A baked prior needs data that does not exist: 0 sessions today, no collection path, and an opt-in design that this spec does not contain.

Measurement limits. All adapter numbers come from one hybrid laptop (Intel UHD and RTX 4060 Laptop) in headless real Chrome (`docs/ARCHITECTURE.md` section 3.6). The 150 ms link and 30 to 90 ms build costs quoted in R3 section 4 item 5 come from the brief, not a repo file. Mixed and static programs are not attributed to positions by the audit (it records owners and dock ids, not mesh positions). R2 theorems were read at the SCG'05 and preprint level; the sup-norm clause of H2 is predicted to fail.

## 10. Formal verification

Three Lean 4 lemmas are checked separately, in a task outside this spec; this document only names them:
- L1, hysteresis flip bound: if `|Hn(t) - Hn(s)| <= L |t - s|` for every cell, a cell that entered the hot condition at tau_hi and leaves it below tau_lo needs at least `(tau_hi - tau_lo) / L` seconds.
- L2, interleaving of components under inclusion: if `||H - H'||_inf <= eps`, every component of `{H >= tau + eps}` lies in one component of `{H' >= tau}`, which lies in one component of `{H >= tau - eps}`.
- L3, contraction of the decayed update: for `0 < lambda < 1` and the same deposit d, `||(lambda H + d) - (lambda G + d)||_inf = lambda ||H - G||_inf`, so a wrong restored field is forgotten geometrically (after n updates the error is at most `lambda^n` of the initial error).

Results: pending

## 11. Rollout

- Phase 0, offline (no browser). `experiments/route-heat/` with `visitors.mjs`, H1, H2, the cost microbench. Entry: this document committed unchanged. Gate: H1 not DEAD and H2 not DEAD; either DEAD closes the design with the numbers published.
- Phase 1, instrumentation only (no behaviour change). Generate `owners.json`. Record per run, behind the existing probes: time from `ready` until every in-window dock is `compiled` (`window.__warm`), the count of cold arrivals (dock not `compiled` at arrival) and their arrival-frame p95 (R3 section 4 items 1 and 2), and programs linked but unused. Add the `--route` driver and the 60 s `fresh` window. Gate G1: if every in-window dock is compiled before the first arrival in all runs on both adapters, reordering has nothing to move, and the design stops at phase 1 with those numbers.
- Phase 2, policy behind `?heat=on`, default off. `lib/world/heat/`, the `prewarm.js` hook, the privacy-page sentence, the DNT/GPC gate. Run H3 and H4 and the cost condition. The first-visitor baselines the flag must not regress, from `docs/ARCHITECTURE.md` section 3.7: frames in the 20 s window at least 826 (RTX) and 938 (Intel), longest prewarm tick at most 40 ms (RTX) and 37 ms (Intel), first key-press frame at most 36.4 ms (RTX), curtain lift at most 11,685 ms (Intel) and 11,656 ms (RTX), programs at ready at most 109 and 124.
- Phase 3, default on only if H3 passes (at least 30% fewer unused programs, link-stall frames not more numerous) and H4 passes. Otherwise the flag stays off or the code is removed, and the result is recorded as a negative.

Constants fixed in this document: h 4 m, R 84 m, n 1,615, sigma 6 m, T_half 90 s, tau_hi 0.30, tau_lo 0.20, delta 0.05, one-ring dilation, beta 2 s, exit dwell 5 s, update 10 Hz, recompute 1 Hz, 8-bit quantisation; synthetic visitors 200 (seeds 1 to 200, 120 goal-seeking, 80 wanderers, k 3 to 8, dwell 10 s, T 180 s); H1 80% / 25% / 70%; H2 0.1 x B1, 0.5 x B1, 0.05; H3 30% / 10% / 50 ms / 3 runs; H4 100 ms / 2 s; baked prior gate 100 sessions.
