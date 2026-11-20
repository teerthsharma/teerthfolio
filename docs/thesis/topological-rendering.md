# Topological Probabilistic Rendering on a Seal-Centred World

Certainty fields, route heat and persistence-filtered chunks: thesis, evidence and programme.

Ideas: Teerth Sharma, owner of the repository. Formalisation and evidence audit: Dr House pass, 2026-11-20. The occluder leap: Dr House.

Repository `teerthfolio`. Evidence branch `exp/topology-field-and-load`, commit `51acb97`; "HEAD" in this document means that commit. The experiments, results, verification outputs and measurement notes cited by path live on that branch, and repository paths in the text are relative to it. Main contains this document only. A later commit on that branch, `74a41f7`, adds the route-heat research record and design spec (`docs/superpowers/specs/2026-11-20-route-heat-chunking-*.md`) and renumbers the section cited here as ARCHITECTURE section 3.5b to section 3.7; every citation in this document of section 3.5a or 3.5b refers to commit `51acb97`.

## Vision

The world revolves around the seal. A field around the viewer decides what is baked and what is live, and render work should change only when the topology of that field changes: a component appears, vanishes, merges or splits. This is Teerth Sharma's idea. This document states it exactly, tests it against the repository, and records where it held and where it did not.

## Abstract

Thesis: rendering work on a viewer-centred world need change only when the topology of a field around the viewer changes, so persistence-filtered superlevel components of a seal-centred field can replace fixed chunks. The cost of such a schedule is the field's rate of critical events, which the stability theorem bounds in size but not in count.

- On hexagonal cells the rule is exact (Lemma T, derived here), and computing the field is cheap (E2: 0.0977 ms p95 per frame against a 0.5 ms bar).
- A per-frame field driven by movers fails as an event economy: pre-registered E1 is DEAD at 0.1396 events per frame, and the faithful post-hoc counter gives 1.941 events/s against 0.755 chunk crossings/s, where the bar was 0.1 times.
- Moving the field onto the pup's occluders gives 0.43 to 0.49 times the crossing rate with a shuffled control of only 2.59x (UNRESOLVED).
- A slowly varying route-heat field is 8 to 20 times calmer on the same path, yet 1.4 to 1.5 times over the bar on synthetic routes, and after ready it can only reorder a queue that already admits 27 of 27 docks. The program-count lever is small: dock-only programs are 14.5 to 16.5 percent of programs at ready.
- The measured wins of this repository came from the load path, not from topology. What survives is a route prior that is stable by theorem, and its value hangs on one unmeasured number: the cold-arrival rate at HEAD.

## Contents

[Status labels](#how-to-read-the-status-labels) · [Credit](#credit) · [Sources](#sources) · [Pipeline figure](#the-pipeline-in-one-figure) · [1 Setting and notation](#1-setting-and-notation) · [2 Prior art](#2-prior-art-by-claim) · [3 The framework](#3-the-framework) (D1 to D8) · [4 Propositions](#4-propositions-what-is-proved) (P0 to P10) · [5 Experiments](#5-what-the-experiments-did-to-the-thesis) (ledger, RT1 to RT6) · [6 The programme](#6-the-programme) (H0 to H4, O1 to O4, hypotheses A to C) · [7 Lean lemmas](#7-formalisation-three-lean-4-lemmas) · [8 Limits](#8-limits) · [Appendix A: number ledger](#appendix-a-number-ledger) · [Appendix B: glossary](#appendix-b-glossary)

## How to read the status labels

Every proposition, experiment and hypothesis carries one label. The owner is Teerth Sharma.

| label | meaning |
|---|---|
| THEOREM | a published result, cited by source row in §2; used here without reproof |
| DERIVED | proved or sketched in this document, or in the research notes from a cited theorem; "DERIVED here" means this document |
| CONJECTURE | stated, not proved; names the test that decides it |
| HYPOTHESIS | a programme item (§6) with its cheapest test and kill criterion |
| MEASURED | a figure read from a run on this repository, with the run named |
| SUPPORTED | the bar was met, or, where no bar exists, the measurement backs the claim |
| REFUTED | the evidence contradicts the claim as stated: a pre-registered DEAD, or a direct measurement against it |
| UNRESOLVED | neither the pass bar nor the kill condition was met, or the bar was set after the numbers were seen |
| UNTESTED | no run exists |
| NOT TRIGGERED | a kill criterion that was checked and did not fire |

Source flags in §2: "read" means the page or PDF was read; [hl] means search-highlight excerpts of the real page; [2nd] means a third-party write-up; "search-only" means a snippet only; UNVERIFIED means no source was fetched.

## Credit

- Topological Probabilistic Rendering: certainty field, three states, two thresholds, the topology rule, one program per region type, hexagonal cells, HexPlane fill, cave cells, the governor, the island-first test. Teerth Sharma.
- Route heat ("the world revolves around the seal"), shaders baked around the heat map, chunking made topological. Teerth Sharma.
- Topology already in the repository: the Yuddh-Niti H0 port (`lib/anime/topology.js`), T1 persistence-simplified shadow bias, T3 topology-aware tier governor. Teerth Sharma [EN].
- The occluder field weighted by H0 persistence of a 32x32 screen mask: the occluder leap, Dr House [OT-P].
- Lemma T, P5, P9, the sharpened P6, the programme bars and the Lean statements: this document.

## Sources

[TF-P] `experiments/topo-field/PREREGISTRATION.md`. [TF-R] `experiments/topo-field/out/results.md` (HEAD bb9a446, run 2026-11-20T09:11Z). [OT-P] `experiments/occluder-topology/PREREGISTRATION.md`. [OT-R] `experiments/occluder-topology/out/results.md` (HEAD d318826, run 2026-11-20T10:28Z). [E0b] `verification/topo/e0-base/E0.md` (commit 43f71f7). [E0a] `verification/topo/e0-after/E0.md` (merged tree dc2677d). [ARCH] `docs/ARCHITECTURE.md`: §3.3, §3.4, §3.5a "Resident engine A/B at 8000dd5" (line 180) and §3.5b "The first-time-visitor window" (line 225; the file carries two sections numbered 3.5). [TOPO] `lib/anime/topology.js`. [EN] `ENGINE-NOTES.md`.

[R1], [R2], [R3] are research notes (R1 the shader-prewarm prior-art survey, R2 the stability derivations, R3 the route-heat scripts `heat.mjs` and `deadline_cover.mjs` with their outputs). They are consolidated, with their URLs and verified flags, in `docs/superpowers/specs/2026-11-20-route-heat-chunking-research.md` on the evidence branch (commit `74a41f7`); the scripts `heat.mjs`, `summ.mjs` and `deadline_cover.mjs` are not committed.

Line numbers in Appendix A refer to the files as read on 2026-11-20 at commit 0e90810, an ancestor of 51acb97.

## The pipeline in one figure

The figure restates §3 and §6 and adds nothing to them.

```
 seal path gamma(t)
        |
        v
 heat field H_t        D5: H_{t+dt} = e^(-lambda dt) H_t + dt rho K(x - gamma(t))
        |
        v
 persistence filter    D4: keep components of S_tau(H) with p >= tau > s and p - s >= delta
        |
        v
 chunks                one chunk per kept component
        |
        v
 manifest M(C)         D6: programs and world builds owned by the docks inside chunk C
        |
        v
 prewarm queue         HEAD: earliest deadlineS first (EDF); H3 tests the heat-reordered key
```

## 1 Setting and notation

- World. The island disc Ω of radius R = 84 m (NORTH_RIM; the HEAD island is 116 m) [TF-R G1]. Dock points beyond r = 83 m are clamped to r = 83; 4 places lie beyond 84 m, up to 111.4 m [R3 §3].
- Hexagonal grid. G_h = (V, E): cell centres on a hexagonal lattice of spacing h. Each interior cell has 6 neighbours at distance h; |V| = 6,409, 1,615 and 397 for h = 2, 4 and 8 m [TF-R]. E is the triangular lattice, so two consecutive neighbours of a cell are adjacent to each other. One 6-adjacency serves a set and its complement; [TF-P] names this absence of a connectivity paradox as the reason for hexagonal cells.
- Fields. A field is f : V → ℝ. It extends to edges and triangles by the minimum of its vertex values, so a simplex lies in S_τ(f) = {f ≥ τ} if and only if all its vertices do [R2 §7].
- Persistence. The H0 superlevel filtration sweeps values from high to low. Each local maximum is born; when two components meet, the elder rule keeps the one born higher and the younger dies at the joining value. A bar is (b, d) with persistence b − d, and D(f) is the diagram. `h0Superlevel` [TOPO:40] computes it on any CSR graph by union-find. Bars with b ≥ τ > d, plus the essential class, correspond one to one with the components of S_τ(f); the check gave 0 mismatches over 122 sampled frames per run [R3 §3].
- Norms. ‖f − g‖∞ = max over v of |f(v) − g(v)|; d_B is the bottleneck distance between diagrams.
- Events. Components of a tracked set at consecutive samples are matched by overlap (`diffComponents`, `experiments/topo-field/cc.mjs:39`). A birth has no predecessor, a death no successor, a merge two or more predecessors, a split two or more successors. Hole open and hole close concern complement components that do not touch the border ring [TF-R].
- Walk. A nearest-neighbour tour of the dock points at 15 m/s (MOTION.maxSpeed 10 × boost 1.5), then a 60 s seeded roam, sampled at 60 Hz: 121.78 s and 7,307 counted transitions per seed, with 3 seeds sharing one tour [TF-P, TF-R].
- B1. Chunk-boundary crossings per second for 16 m square chunks inside a 48 m window, on the same walk: 0.788, 0.690 and 0.788 /s for seeds 1 to 3, pooled 0.755 /s [TF-R]. The economy bar used throughout is 0.1 × B1 = 0.0788, 0.0690 and 0.0788 /s, which is 4.7, 4.1 and 4.7 per minute.

Why it matters: every rate below is quoted against B1, and every economy bar is 0.1 × B1, so this section fixes what each number means.

## 2 Prior art, by claim

Rows 26 to 28 carry no URL and are flagged. Flags are explained in the legend above.

| # | claim it bears on | source | URL | flag |
|---|---|---|---|---|
| 1 | diagrams are stable in sup norm | Cohen-Steiner, Edelsbrunner, Harer, DCG 37(1):103-120, 2007 | https://link.springer.com/article/10.1007/s00454-006-1276-5 ; text https://pub.ista.ac.at/~edels/Papers/2007-01-StabilityPersistenceDiagrams.pdf | read, SCG'05 version; journal not opened (R2) |
| 2 | PL stability, vineyards, O(n) per transposition | Cohen-Steiner, Edelsbrunner, Morozov, SCG 2006 | https://pub.ista.ac.at/~edels/Papers/2006-04-VinesVineyards.pdf | read (R2) |
| 3 | merge trees are stable (interleaving) | Morozov, Beketayev, Weber | https://mrzv.org/publications/interleaving-distance-merge-trees/manuscript | read, preprint; venue and numbering unchecked (R2) |
| 4 | choose τ in the persistence gap; basins are unstable (Fig. 4) | Chazal, Guibas, Oudot, Skraba, SCG 2011; J. ACM 60(6) 2013 | https://geometry.stanford.edu/lgl_2024/papers/cgos-pbcrm-11/cgos-pbcrm-11.pdf ; https://hal.archives-ouvertes.fr/inria-00389390 | SCG text read; JACM not opened; Thm 4.8/4.9 numbering unverified (R2) |
| 5 | significance band 2c_n for diagram points | Fasy et al., Ann. Statist. 42(6) 2014 | https://ar5iv.arxiv.org/html/1303.7117 | first 100k characters read (R2) |
| 6 | worst-case event bound E ≤ k² (3D space plus time) | Edelsbrunner, Harer, Mascarenhas, Pascucci, Snoeyink | https://pub.ista.ac.at/~edels/Papers/2008-03-TimeVaryingReebGraphs.pdf | read, 2006 report (R2) |
| 7 | tracking graphs are threshold-sensitive | Lukasczyk et al., CGF 36(3) 2017 | https://dav.lbl.gov/vignettes/NestedTrackingGraphs.html | read (R2) |
| 8 | simplification by persistence | Edelsbrunner, Letscher, Zomorodian, DCG 28(4) 2002 | https://link.springer.com/doi/10.1007/s00454-002-2885-2 | abstract only (R2) |
| 9 | forward decay equals backward decay | Cormode, Shkapenyuk, Srivastava, Xu, ICDE 2009 | https://www.cs.ox.ac.uk/people/graham.cormode/pubs/papers/fwddecay.pdf | read (R2) |
| 10 | persistence on a trajectory density (road graph) | Dey, Wang, Wang, SoCG 2018 | https://arxiv.org/pdf/1803.05093 | abstract and introduction read (R2) |
| 11 | two density thresholds as spatial tiers | Chen, Dobra, Ann. Appl. Stat. 2020 | https://doi.org/10.1214/19-aoas1311 | highlights only (R2) |
| 12 | influence maps with decay | gamedev.net; Game AI Pro 2 ch. 30 | https://gamedev.net/tutorials/programming/artificial-intelligence/the-core-mechanics-of-influence-mapping-r2799 ; https://www.gameaipro.com/GameAIPro2/GameAIPro2_Chapter30_Modular_Tactical_Influence_Maps.pdf | search-only, page 403 (R2) |
| 13 | fixed-grid streaming baseline | Unreal Engine World Partition, UE 5.9 | https://dev.epicgames.com/documentation/en-us/unreal-engine/world-partition-in-unreal-engine | read (R2) |
| 14 | corridor prefetch ordered by predicted entry time | WorldStream, arXiv 2610.28827 | https://arxiv.org/abs/2610.28827 | fetched; preprint dated 2026-10-20, review status unchecked (R1) |
| 15 | transition-graph prefetch with threshold and aging | Padmanabhan, Mogul 1996 | http://ccr.sigcomm.org/archive/1996/jul96/ccr-9607-mogul-padmanabhan.pdf | [hl] (R1) |
| 16 | next-route probability prefetch | Guess.js | https://web.dev/articles/predictive-prefetching ; https://github.com/guess-js/guess | [hl] (R1) |
| 17 | velocity ring around the player | Minecraft render distance; Cinevva blog | https://minecraft.wiki/w/Options ; https://app.cinevva.com/blog/2026-02-25-open-world-browser-part-04-streaming-before-fancy | WebFetch; [hl] (R1) |
| 18 | shader caches partitioned by level or region | UE bundled PSO cache (usage mask); UE FShaderCache (streaming key) | https://dev.epicgames.com/documentation/en-us/unreal-engine/manually-creating-bundled-pso-caches-in-unreal-engine ; https://dev.epicgames.com/documentation/en-us/unreal-engine/fshadercache-in-unreal-engine | WebFetch; [hl], likely legacy (R1) |
| 19 | compile order by use count | UE MostToLeastUsed | https://imzlp.com/posts/24336/ ; https://tqjxlm.dev/unreal-engine-pso-cache-mechanism-usage-and-optimization/ | [2nd, hl]; enum unverified (R1) |
| 20 | precompile at component load | UE PSO precaching | https://dev.epicgames.com/documentation/en-us/unreal-engine/pso-precaching-for-unreal-engine | fetched, cut at the validation section (R1) |
| 21 | recorded pipelines replayed to warm a driver | Valve Fossilize | https://github.com/ValveSoftware/Fossilize | read (R1) |
| 22 | generic program first, specialised later | Dolphin ubershaders | https://dolphin-emu.org/blog/2017/07/30/ubershaders/ | about 12k characters plus [hl] (R1) |
| 23 | non-blocking link status in WebGL | KHR_parallel_shader_compile | https://registry.khronos.org/webgl/extensions/KHR_parallel_shader_compile/ | read (R1) |
| 24 | three.js asynchronous precompile | WebGLRenderer.compileAsync | https://threejs.org/docs/pages/WebGLRenderer.html | WebFetch (R1) |
| 25 | per-link cost on ANGLE and three.js | Electron PR 54113 (about 15 ms per ANGLE link, Iris Xe); three.js PR 19752 (49 ms first getProgramInfoLog) | https://releases.electronjs.org/pr/54113 ; https://github.com/mrdoob/three.js/pull/19752 | [hl] (R1) |
| 26 | visibility changes only at critical events | aspect graphs (Koenderink, van Doorn 1979; Plantinga, Dyer 1990); visibility complex; stochastic transparency (Enderton et al. 2010); zigzag persistence (Carlsson, de Silva 2010) | none | recalled in [OT-P], NOT verified |
| 27 | factored space-time fill for the baked state | HexPlane (Cao, Johnson, CVPR 2023), the owner's citation | none fetched | UNVERIFIED this session |
| 28 | volume cells joined by portals ("cave cells") | no source fetched | none | UNVERIFIED |

What exists. Stability of diagrams and merge trees is theorem (rows 1 to 3), and so is the persistence-gap rule for τ (row 4), whose own Fig. 4 shows basin identity is unstable. Shader caches partitioned by region exist, chosen by the developer per level, not by route (rows 18, 19). Prefetch from a predicted path exists for streaming, not for shader compilation (rows 14 to 17). Persistence on a trajectory density exists for road-graph extraction (row 10).

Searched and NOT found (R1 "What is NOT found"; R2 §9):
- a visitation heat map, or a topological or graph chunking of the world, used to schedule shader or program compilation;
- compile order conditioned on the visitor's own route within one session, and shader preparation by graph distance on a place graph;
- any GDC talk or paper that predicts the player's path in order to compile shaders (path prediction appears for asset streaming only);
- persistence or merge trees used to partition a game world or drive streaming, and Mapper on trajectories used to partition space;
- a published bound on the topology events of a slowly varying 2D field over time, a Lipschitz-in-time statement for decayed KDE on a grid, a two-threshold hysteresis theory for persistence-based regions, and a history-dependent cell setting in Unreal.
- Search scope: web and exa only, no paywalled ACM or IEEE search, no Unreal or Unity source grep. Absence of evidence is not proof of absence.

Novelty, bounded by that search. Every component exists separately. The combination was not found: persistence-filtered superlevel components of a seal-centred decayed route field, used as the unit of world and program preparation, with two-threshold hysteresis. The only first-party argument found against predicting shaders is Dolphin's unbounded configuration space (R1); it does not transfer to 26 docks whose programs are known statically.

Why it matters: the novelty claim is exactly as wide as the search that bounds it, and rows 26 to 28 are unverified.

## 3 The framework

Definitions D1 to D8. "(owner)" marks an idea credited to Teerth Sharma.

**D1 Certainty field (owner).** A field c_t : V → [0, 1]. Near 1 the baked result is used; near 0 the cell is computed live. The tested form [TF-R]: c(x) = smoothstep(6, 24, |x − seal|) · (1 − m(x)), with mover influence m = max over movers of 1 − smoothstep(1.5, 3.0, d_i) [TF-R G2], and a water annulus r ≥ 76 m held at c = 0 [TF-R G3].

**D2 Three states with hysteresis (owner).** Thresholds τ_lo = 0.35 < τ_hi = 0.65, gap g = 0.30 [TF-P]. A per-cell latch s turns live when c < τ_lo, turns off only when c > τ_hi, and holds in between. A cell renders live if s is live, baked if s is off and c > τ_hi, and band otherwise. In the band a pixel renders live with probability 1 − c, dithered across frames and accumulated over time: the owner's "Schrödinger's cat zone".

**D3 Topology rule (owner).** The live set L_t = {v : s_t(v) live} is a shape. Shaders and batches depend on the region type only, so they change only at topology events of L_t (birth, death, merge, split, hole open, hole close). Those occur only at critical cells (Lemma T). Hence one program per region type is compiled once.

**D4 Topological chunk.** For a field H, threshold τ and persistence floor δ, a chunk is a component of S_τ(H) whose diagram point (p, s), peak height p and merge height s, satisfies p ≥ τ > s and p − s ≥ δ. With hysteresis, membership uses the D2 latch with the pair (τ_lo, τ_hi).

**D5 Seal-centred route heat (owner's second idea, formalised).** H_{t+Δ}(x) = e^{−λΔ} H_t(x) + Δ ρ K(x − γ(t)), where γ is the seal's path and K(u) = exp(−|u|²/(2σ²)) is truncated at 3.5σ. R3 used σ = 6 m, half-life 90 s (λ = ln 2/90 ≈ 0.00770 per second) and ρ = 1, so H is measured in seconds of dwell [R3 §3]. The world revolves around the seal: heat accrues only where the seal goes. A straight pass at speed v deposits at most ρσ√(2π)/v on its centre line, which is 1.00 dwell-second at 15 m/s (DERIVED). An absolute τ above 1.0 therefore excludes pure fly-by trails.

**D6 Manifest and the out-of-heat rule (owner).** M(C) is the set of programs and world builds owned by the docks whose arrival points lie in chunk C. The owner's rule: while γ stays inside chunks whose manifests are compiled, no shader needs to be made, and new work is due only when the seal goes "majorly outside the heat map". For H4 this document fixes that condition: H_t(γ(t)) < τ_lo for at least 2 s, or γ(t) more than 24 m from every compiled chunk. M is new data: the three prewarm registries are keyed by dock id and carry no program list per dock [R3 §5].

**D7 Occluder field (the occluder leap, Dr House).** Each frame, a 32x32 mask over the pup's screen box marks every cell where something is at least 0.5 m nearer than the pup. The occluded set is distance-transformed exactly, and each occluder component gets p = max EDT − 0.5 [OT-R D3]. Response classes: p < 1 draws the pup over the occluder; 1 ≤ p ≤ 3 is the band, where the pup shows through with probability (3 − p)/2, dithered across frames; p > 3 stays solid, and only events of the solid set reach FrameGuard's 0.25 s hold [OT-P].

**D8 Supporting pieces (owner; untested here).**
- Hexagonal cells: six equidistant neighbours. The densest disc packing has density π/(2√3) ≈ 0.9069 on the hexagonal lattice and π/4 ≈ 0.7854 on the square lattice (DERIVED, elementary), matching the owner's 90.7 and 78.5 percent.
- HexPlane fills the baked state (row 27).
- Cave cells: volume buckets joined by portals, and invisible cells are skipped (row 28).
- Governor: a feedback controller on frame time that raises or lowers τ_lo and τ_hi. The T3 tier governor [EN] is the existing controller of the same shape.
- First test on the island: static geometry baked; water and the cursor region live.

Why it matters: D1 to D3 are the owner's thesis as he stated it; D5 and D6 formalise his route-heat idea; D4 and D7 are the objects the tests measure.

## 4 Propositions: what is proved

Labels: THEOREM (cited), DERIVED (proved or sketched here or in R2 from a cited theorem), CONJECTURE.

| id | name | label | tested or used by |
|---|---|---|---|
| P0 | Lemma T, the discrete topology rule | DERIVED here | known-answer tests K1 to K4 and K7 [TF-R] |
| P1 | Stability of diagrams | THEOREM (row 1; PL version row 2) | Lean 7b (interleaving step) |
| P2 | Merge-tree stability | THEOREM (row 3) | Lean 7b (interleaving step) |
| P3 | Chunk-count margin | DERIVED (R2 §7.2) | Lean 7b (interleaving step) |
| P4 | Flip set | DERIVED (trivial) | P8 |
| P5 | Schmitt-trigger flip bound | DERIVED here | Lean 7a |
| P6 | Decayed-heat speed | DERIVED (R2 §4, sharpened here) | Lean 7c |
| P7 | Hysteresis dwell | DERIVED (R2 §7.4) | H2 settings |
| P8 | Event count | DERIVED (weak) | none; the bound is useless as a rate |
| P9 | Monotone heat | DERIVED here | H2b |
| P10 | Separated route diagrams | CONJECTURE | H2 |

**P0, Lemma T: the discrete topology rule (DERIVED here).** Let S ⊆ V and let v be a cell off the border ring, with neighbours n_0, ..., n_5 in cyclic order (consecutive neighbours adjacent). Call v simple for S when the in-set neighbours N(v) ∩ S, with v itself excluded, are nonempty, are not all six, and form one cyclic arc.
- (i) Adding a simple v ∉ S leaves the components of S and of its complement unchanged, except that one component of S gains v and one complement component loses v.
- (ii) Removing a simple v ∈ S is the mirror case.
- (iii) Flipping a non-simple cell changes the number of components of S or of its complement. No in-set neighbour gives a birth (a death on removal); all six give a hole close (a hole open on removal); two or more arcs give a merge of S, or a split of S on removal, or the matching change in the complement.
- Sketch. An arc is connected through consecutive-neighbour adjacency, so v touches exactly one component of S. The complementary arc is connected in the complement, so a complement path through v reroutes along it. In case (iii), two arcs that lie in one component of S close a cycle around a complement arc, which separates it by planar duality on the triangulated disc.
- Consequence: the owner's rule, made exact. A run of simple flips that leaves every component overlapping its predecessor produces no event, and every event needs a critical cell. The known-answer tests K1 to K4 and K7 pass on the implementation [TF-R], consistent with the lemma. The lemma is not machine-checked.

**P1 Stability (THEOREM; row 1, PL version row 2).** For tame f, g on a triangulable space, d_B(D(f), D(g)) ≤ ‖f − g‖∞ in every homology dimension. It applies to a heat field through f = −H with the minimum extension of §1, which is tame and 1-Lipschitz [R2 §7]. The paper states that critical points and critical pairs are not stable; only the diagram is.

**P2 Merge-tree stability (THEOREM; row 3).** d_I(T_f, T_g) ≤ ‖f − g‖∞ (Thm 2) and d_B(Dgm_0 f, Dgm_0 g) ≤ d_I (Thm 3). The nesting of components across all thresholds is ε-stable, not only the counts.

**P3 Chunk-count margin (DERIVED, R2 §7.2).** Let ε = ‖H − H′‖∞ and N(τ, δ) the number of chunks (D4).
- N′(τ, δ) ≥ #{(p, s) ∈ D(H) : p ≥ τ + ε, s < τ − ε, p − s ≥ δ + 2ε}.
- For δ > 2ε, N′(τ, δ) ≤ #{(p, s) : p ≥ τ − ε, s < τ + ε, p − s ≥ δ − 2ε}.
- So the count can change only if a diagram point lies in the margin: p or s within ε of τ, or persistence within 2ε of δ. The ToMATo gap rule and the Fasy 2c_n rule (rows 4, 5) say the same with ε as noise.

**P4 Flip set (DERIVED, trivial).** Only cells with |H(x) − τ| ≤ ε can change membership in S_τ.

**P5 Schmitt-trigger flip bound (DERIVED here; Lean lemma 7a).** For one cell with samples x_0, ..., x_n, let the state turn on when x ≥ τ_hi, turn off when x ≤ τ_lo, and hold otherwise; g = τ_hi − τ_lo. Then flips × g ≤ TV + g, where TV = Σ |x_{k+1} − x_k|. If every step satisfies |x_{k+1} − x_k| ≤ L, two consecutive flips are at least g/L samples apart, and flips ≤ nL/g + 1. Proof: consecutive flips alternate direction, so between them the signal travels at least g, over disjoint index intervals. For D2 the roles are mirrored and the bound is identical.

**P6 Decayed-heat speed (DERIVED; R2 §4, sharpened here; Lean lemma 7c).** For D5 with H_0 = 0:
- ‖H_t‖∞ ≤ ρK(0)/λ for all t.
- ∂H/∂t(x) = ρK(x − γ(t)) − λH(x) lies in [−λH(x), ρK(0)] ⊆ [−ρK(0), ρK(0)]. So ‖∂H/∂t‖∞ ≤ ρK(0). R2's bound 2ρK(0) comes from the triangle inequality; the two terms have opposite signs, which halves it.
- The update is a sup-norm contraction with factor e^{−λΔ} between two fields fed the same deposits.
- In R3's units (ρK(0) = 1, half-life 90 s): ‖H‖∞ ≤ 90/ln 2 ≈ 129.8 dwell-seconds. The field moves at most 1 dwell-second per second, 0.0167 per 60 Hz frame and 1.0 per 1 Hz sample.

**P7 Hysteresis dwell (DERIVED, R2 §7.4).** By P1 and P6, diagram coordinates move at speed at most L = ρK(0), and persistence at most 2L. A chunk born at τ_hi cannot die at τ_lo sooner than g/L. The bound is weak at these parameters: g = 10 dwell-seconds buys at least 10 s per born-then-died cycle of one diagram point. Rarity must come from the route, not from this bound.

**P8 Event count (DERIVED, weak).** Frames carrying any event ≤ Σ_v flips(v) ≤ Σ_v (TV_v/g + 1), by Lemma T and P5, and only cells in the P4 margin contribute. The factor |V| (1,615 at h = 4) makes this useless as a rate bound. No sharper published bound exists for slowly varying 2D fields (R2 §9). The bound E ≤ k² of row 6 is worst-case combinatorial.

**P9 Monotone heat (DERIVED here).**
- (i) If deposits are nonnegative and decay is suspended within a session (λ = 0 inside the session, decay applied between sessions), H_t is pointwise non-decreasing. Then S_τ(H_t) at any fixed absolute τ is nested increasing, so no death and no split of S occur within the session. Merges ≤ births + (initial components) − 1 while the set is nonempty, so H0 events ≤ 2 × births + initial components − 1.
- (ii) With λ > 0, the forward-decay identity (row 9) gives S_τ(H_t) = S_{τ·e^{λt}}(G_t), where G_t = e^{λt} H_t is non-decreasing. When events are counted separately across the decay half-step and the deposit half-step (R3's update already applies them in that order), every death and split comes from decay, a rising effective threshold, and every birth and merge comes from deposits. Normalising τ to the current maximum adds a second rising threshold.
- Evidence that the split matters: R3's dock-seeking seed 1 at 60 Hz, τ = 25 percent of the current maximum, counted birth 1, death 15, merge 2 and split 17. 32 of the 35 events are deaths or splits [R3 §3b].

**P10 Separated route diagrams (CONJECTURE; tested by H2).** For goal-seeking routes, D(H) at the end of a tour is (d_1, d_2)-separated, with a gap wide enough that an absolute τ inside it gives at least two chunks, none holding all 26 docks, at no more than 0.1 × B1 events per minute sampled at 1 Hz.

NOT guaranteed by any of the above (R2 §7):
- Component identity or membership. Critical points and critical pairs are unstable (row 1); a basin flips under an arbitrarily small perturbation (row 4, Fig. 4); two peaks within ε of each other can swap which one is the elder.
- Boundary position where H is flat near τ: a shift of up to ε/|∇H|.
- Any bound on the number of events over time: a point hovering within ε of τ flickers.
- Stability across a change of λ or σ, and the identity of any single H1 hole.

Why it matters: the diagram and the merge tree are stable, so a schedule can lean on them; identity and the count of events over time are not guaranteed, so the route has to supply rarity and the programme (§6) tests it.

## 5 What the experiments did to the thesis

The experiment ledger. Each claim, the test that bears on it, the bar fixed before the run, the result, and the status.

| claim | test | pre-registered bar | result | status |
|---|---|---|---|---|
| Q1: live-region events are rare under seal motion (per-frame field with movers) | E1, SIMPLIFIED, h = 4, N = 20, 3 seeds [TF-R] | PASS: median ≤ 1/s and ≤ 0.1 × B1; DEAD above 0.1 events per frame | 3,060 events over 21,921 frames = 0.1396 per frame; this counter is defective (no frame memory; it can exceed RAW: 127 against 121 at h = 8, seed 1, 5 s roam) | REFUTED (pre-registered DEAD) |
| same, faithful lineage-latched counter | SIMP-H, post hoc, same bed [TF-R] | same bars, applied after the numbers were seen | 1.782, 2.045, 1.995 /s (pooled 1.941) against B1 0.788, 0.690, 0.788 (pooled 0.755); median 2/s against ≤ 1 | UNRESOLVED by the letter; 2.57 events per chunk crossing |
| the detector can see events | K5 shuffled control [TF-R] | ≥ 20× | 182.65× (SIMPLIFIED), 788.26× (SIMP-H) | SUPPORTED |
| Q2: c(x) is cheap | E2, Node, h = 4, N = 20 [TF-R] | p95 ≤ 0.5 ms per frame | core p95 0.0977 ms; with events, p95 0.2334 ms; GPU read-back not measured | SUPPORTED |
| Q3: baking the static island can shrink the program set | E0 ownership audit [E0b, E0a] | kill if ≥ 80 percent of programs are owned by live, post or cutscene | upper bound 79.0 to 79.6 percent at 43f71f7 and 73.4 to 76.6 percent at dc2677d; static-only 29 programs = 20.4 to 21.0 percent (43f71f7) and 23.4 to 26.6 percent (dc2677d) | NOT TRIGGERED; the lever left is a fifth to a quarter of programs |
| Q4: band edges show no ghosting | needs the renderer | none | not run | UNTESTED |
| occluder events are rare (D7) | E3, filtered p > 3, 3 seeds [OT-R] | PASS ≤ 0.1 × B1 on all seeds and control ≥ 20×; DEAD ≥ B1 on any seed | 0.3433, 0.2951, 0.3825 /s = 0.44, 0.43, 0.49 × B1; control 2.59× (LATCHED 2.43×); known-answer gate PASS, 11 tests | UNRESOLVED; the event half is dropped by its own LEAD |
| stateless see-through band 1 ≤ p ≤ 3 | needs the renderer | none | not run | UNTESTED |
| route-heat topology is calm (synthetic) | R3 `heat.mjs`, τ = 25 percent of the current maximum [R3 §3b] | 0.1 × B1 = 4.7, 4.1, 4.7 per minute (borrowed; not pre-registered for R3) | dock-seeking at 1 Hz: raw 13.3 to 14.8 per minute, persistence-filtered 6.4, 5.9, 6.9 (1.4 to 1.5× the bar); wanderer 1.0 to 3.4 filtered; certainty field SIMP-H 107 to 123 per minute | UNRESOLVED |
| route heat concentrates on the visited docks | R3 §3a | none fixed in advance (R3 §4.7 states "≥ 2 components, none holding all 26 docks" afterwards) | τ = 10 percent: 1 component holding 26 of 26; τ = 25 percent: top component holds 23 of 26 for the tour, then 3, 7 and 1 after a 60 s roam, inside the wanderer range 0 to 7; τ = 50 percent: per-dock specks | UNRESOLVED (the tour visits every dock by construction) |
| a heat prior adds candidates after ready | R3 `deadline_cover.mjs` [R3 §1] | none | from spawn 27 of 27 docks are within the 8 s horizon; from a dock point min 18, median 24, max 27 | REFUTED for admission; reordering UNTESTED |
| a first-visit prior beats distance | R3 §1, §3 | none | the only first-visit prior is the static layout, whose nearest docks to spawn are deadlineS's 5 critical docks; the layout field does carry clusters (6, 12 and 18 components at τ = 10, 25 and 50 percent) | REFUTED for a distance-shaped prior; UNTESTED for a cluster-shaped one |
| real routes concentrate | none possible: no position or visit event is collected anywhere; `seal:seen` is sessionStorage [R3 §2] | none | no data | UNTESTED |
| the load path can be made fast (engineering, not topology) | E0 boots and the `fresh` phase [ARCH §3.4, §3.5a, §3.5b] | the load-gate targets in `docs/TESTING.md` are marked pending | curtain lift 13.5 to 11.7 s (Intel), 13.8 to 11.7 s (RTX); programs at ready 144 to 109 and 138 to 124; the RTX first-visit window went from 22 to 25 frames (resident engine on, 8000dd5; each stall 3.1 to 4.6 s, linking 26 to 73 programs in one task) to 826 to 833 after the staggered compile and 844 to 999 at cca8ba2; first key-press frame 115 to 145 ms down to 24 to 36 ms; longest prewarm tick 89 to 92 ms down to 37 to 40 ms; the baseline control at 43f71f7 shows the same 4.0 to 4.1 s stalls (23, 28, 27 frames), so the stall predates the load work | SUPPORTED (measured) |
| FrameGuard's whole-scene raycasts dominate the render loop | CPU profile of one steady 3.5 s window of the island follow, development build, Intel UHD, one run [ARCH §3.5b] | none | the figure "FrameGuard is 79 percent of the render loop" is documented at `docs/ARCHITECTURE.md` section 3.5 (3.5b) at 51acb97: `FrameGuard.useFrame` 2209 ms of the 2789 ms of the render loop, the foreground grid `front` 1544 ms, the occlusion probe 591 ms, the WebGL render 262 ms. The earlier report added that frame time halved with FrameGuard off. Commit 1e5dfe0 (island follow casts 2 grid rays instead of 6, probe every 2nd frame) is an ancestor of 51acb97 | MEASURED (development build, one run, one adapter); production-build confirmation on both adapters is test O4 |

**Why E1 died, in the language of §4.** Every mover drives c to 0 at its centre [TF-R G2]. So every live mover disc passes any persistence filter, and its contacts with the seal's clearing and with the water annulus are genuine saddles (Lemma T, case iii). At h = 2 the SIMP-H counts hold no births or deaths at all, only merges and splits: 55/53, 74/75 and 76/77 [TF-R]. Even with no movers, the clearing meeting the water annulus gives 0.172, 0.123 and 0.156 events/s at h = 4, which is 1.8 to 2.2 times the bar [TF-R]. With the water off at N = 20 the pre-registered count rises to 9.952 to 10.239 events/s, from 7.801 to 8.786 with it on. The events are not low-persistence noise that filtering could remove; they are high-persistence features moving independently.

**Why the occluder test is unresolved.** With static occluders only, the filtered totals are 27, 29 and 36, against 35, 31 and 40 with 20 walkers [OT-R]. The events come from the camera and the pup moving past static geometry, and an occluder that crosses the box costs one birth and one death. Visual events are intrinsic to camera motion. That is the regime where a per-shot bake (O2) applies, not an event filter.

**The revised thesis the evidence allows.**
- RT1. The topology rule is exact on hexagonal cells (Lemma T). The evidence refutes the scene assumption, not the rule. On this island a per-frame field with independent movers changes topology 2.57 times per chunk crossing (1.941 against 0.755 per second). As an event-economy mechanism, the per-frame mover-driven certainty field is REFUTED on this bed, and persistence filtering cannot rescue it.
- RT2. The premise that program and batch rebuilds are the cost is weak here. A manifest can move at most 18 dock-only programs (14.5 to 16.5 percent of programs at ready), and a bake of the static island at most 29 static-only programs (23.4 to 26.6 percent) [E0a]. The owner's "one program per region type" already exists in his anime engine: one surface program and one hull program for every mesh, with a style switch costing only uniform writes [EN]. It is a lever of material architecture, not of scheduling.
- RT3. The slowly varying route-heat field is stable by theorem (P1, P2; P6 bounds its motion at 1 dwell-second per second). It is 8 to 20 times calmer than the certainty field on the same path, but 1.4 to 1.5 times over the event bar after filtering. Its concentration is made by a tour that visits every dock, and it fades after a 60 s roam. Most counted events are deaths and splits (32 of 35 on seed 1), which P9 attributes to decay and to normalisation, and which cost no compile work in a cache that only grows.
- RT4. After ready the heat prior can only reorder the queue, since the 8 s horizon admits 27 of 27 docks from spawn. Its leverage is limited to returning visitors (a persisted field, which does not exist) or a baked global prior (which needs real visitor data, of which there is none). It reaches first visits only if cold arrivals exist at HEAD, and that is unmeasured.
- RT5. The measured wins were engineering on the load path (the load-path row of the ledger). They are real and they are not topological.
- RT6. Topology keeps three jobs where its guarantees match the need. First, simplification baked at build: T1 cut lit and shadow regions from 14 to 4 on a 6,252-vertex lumpy sphere at 0 runtime cost [EN]. Second, decisions on slowly varying signals with hysteresis: T3 made at most 1 tier change per 10 s on synthetic traces, and settled an Intel overload at T1 in 2.95 s where the mean baseline took 7.6 s [EN]; P5 bounds any such latch. Third, stateless per-pixel response classes from occluder persistence (D7, untested).
- Surviving thesis: route-heat topology is a stable prior for ordering work and for a cache that only grows. On this scene it is not an event economy for per-frame rendering.

Why it matters: the rule survives and the scene assumption does not, and the repository's measured gains are on the load path.

## 6 The programme

Every bar and kill below is fixed by this document before any of these tests runs. Bed, script and arms for H0 to H4 follow the table.

| test | question | PASS bar | KILL criterion |
|---|---|---|---|
| H0 cold-arrival gate | do cold arrivals exist at HEAD? Runs first and gates H3 and H4 | PROCEED: at least 1 cold arrival per launch on either adapter, and an arm-A arrival-frame p95 of at least 1.5 times arm B's on that adapter. Anything else is UNRESOLVED and reruns with 5 launches | 0 cold arrivals in arm A over 3 launches on each of 2 adapters. Route-heat compile scheduling then has nothing to fix on this site, and H3 and H4 close |
| H1 route concentration | does heat predict the next dock better than distance? Needs real routes | heat hit-rate at 3 minus EDF hit-rate at 3 ≥ 0.15 | the difference is ≤ 0.05; heat then adds nothing over distance |
| H2 stability of the chunk diagram | does an absolute τ with hysteresis give few events? Offline on R3's scripts, the cheapest test after H0 | one setting gives at most 0.1 × B1 events (4.7, 4.1, 4.7 per minute) on all 3 dock-seeking seeds, with at least 2 chunks at the end of the tour and none holding all 26 docks, and the control runs at least 20 times the real rate | DEAD: every setting exceeds 0.3 × B1 (14.2, 12.4, 14.2 per minute) on some seed. Anything else is UNRESOLVED. H2b is judged by the same bars |
| H3 compile saving | does the heat-reordered queue cut cold arrivals? Runs only if H0 says PROCEED | the heat arm cuts cold arrivals by at least 50 percent against EDF on both adapters, with no regression past the cca8ba2 numbers in [E0a] and [ARCH §3.5b]: readyMs ≤ 11,685 (Intel) and ≤ 11,656 (RTX); programs at ready ≤ 109 and ≤ 124; first-visitor window ≥ 938 (Intel) and ≥ 844 (RTX) frames; longest prewarm tick ≤ 37 and ≤ 40 ms; first key-press frame ≤ 36.4 ms | a cut below 20 percent, or any regression. The ceiling, stated now: a manifest can move at most 18 programs on either adapter (18 of 124 on RTX, 18 of 109 on Intel) [E0a] |
| H4 out-of-heat handling | what happens when the seal leaves the heat map ("unless the seal goes majorly outside the heat map")? | with the fallback, no out-of-heat arrival takes the cold path where HEAD does not, and its arrival frame is no worse than HEAD's on the same script | either arm takes a cold path that HEAD avoids, in any of 3 runs |
| O1 readback cost | can an async 32x32 id readback plus `h0Superlevel` run within budget? (annex of [OT-P]) | none stated | p95 exceeds 0.5 ms on Intel UHD in real Chrome; FrameGuard's rays then stay |
| O2 aspect-graph bake | in cutscenes the camera is a law and the moves are authored, so can the occlusion timeline be baked per shot? (annex of [OT-P]) | none stated | two `__replay` runs of one dock disagree on any block onset by more than 1 frame |
| O3 band ghosting (Q4) | does the stateless band of D7, with dithering and temporal accumulation in the island follow camera, leave a trace? | none stated | a trace of the occluder persists more than 8 frames after it leaves the pup's box in any of 3 runs, judged by a frame difference of the box against a replay with no occluder |
| O4 FrameGuard cost at HEAD | how much main-thread frame time does FrameGuard take? Profile a production build on both adapters; this also confirms or retires the 79 percent figure of the ledger on a production build | none stated | FrameGuard takes at most 20 percent of main-thread frame time on both adapters: O1 then has no budget to win and closes |

**H0, the cold-arrival gate.**
- Bed: a production build of HEAD in real Chrome through the existing harness (`scripts/perf-frames.mjs`), each adapter named by its ANGLE string, 3 cold launches per adapter, `fresh` phase (no docks seen).
- Script: at ready the seal follows the topo-field nearest-neighbour dock order from spawn at 15 m/s without idling, the worst case the queue can face. Each arrival records the dock's `window.__warm` state and its `window.__warmLog` entries, whether `prep.take` returned null (the cold path), and the arrival frame time.
- Arms: A starts the script at ready. B, the control, starts it 30 s after ready, with the queue drained.
- A cold arrival is an arrival whose dock is not in state "compiled", or whose world is not built, at the arrival event.

**H1, route concentration.** It needs real routes, so it needs the owner's decision on a logger.
- Logger: local only. Cells at 1 Hz go to sessionStorage, and to localStorage only when Do Not Track and GPC are off, using the gate copied from `lib/clarity.js:6-8` [R3 §2]. The privacy page gets one sentence.
- Bed: at least 20 recorded sessions (the owner and testers), each at least 60 s long.
- Arms: predict the next dock with the top 3 heat docks; with the 3 earliest `deadlineS` docks (EDF); and with a wanderer-heat control. The baked global prior is scored leave-one-session-out.

**H2, stability of the chunk diagram.**
- Bed: R3 `heat.mjs` walks, 3 dock-seeking seeds and wanderer seeds 100 to 129, plus H1 routes when they exist.
- Changes: absolute τ in dwell-seconds, a hysteresis pair, persistence floor δ = 3 dwell-seconds (more than 2ε, since ε ≤ 1 at 1 Hz by P6), sampled at 1 Hz. Six pre-declared settings (τ_hi, τ_lo): (2, 1.5), (2, 1), (5, 4), (5, 2.5), (10, 8), (10, 5).
- Arms: RAW; filtered; filtered with hysteresis; H2b, the monotone field of P9 (λ = 0 within the walk). The control teleports the seal to a uniform random point of the disc every second, with the same deposit.
- Known answer: in H2b deaths and splits must be exactly 0 (P9); any nonzero count is a detector bug and voids the run.

**H3, compile saving.**
- Bed: H0's bed and script, plus H1 routes replayed.
- Arms: EDF (HEAD); the heat-reordered key s/(ε_0 + p), where p is the dock's normalised heat [R3 §1]; a random-order control.

**H4, out-of-heat handling.**
- Bed: H3's build with the heat manifest. Script: a 60 s dwell in one district, then a straight run to the farthest unvisited dock. Out-of-heat is as fixed in D6.
- Arms: the heat manifest alone; the heat manifest with an EDF fallback inside the 8 s horizon (HEAD's behaviour).
- Reading fixed now: the owner's rule can hold only as heat plus fallback. Heat alone is a regression whenever the route leaves the map.

**Hypotheses**, each labelled with its cheapest test.

| id | origin | statement | cheapest test | PASS and KILL |
|---|---|---|---|---|
| HYPOTHESIS A | P9 | in a compile cache that only grows within a session, deaths and splits cost nothing; the cost metric is manifest growth, a dock entering any chunk for the first time, which is at most 26 per session | recount R3's events into growth and free events, an offline rerun of `heat.mjs` taking minutes | KILL if growth events exceed the 0.1 × B1 bar on any dock-seeking seed |
| HYPOTHESIS B | RT2 | porting one static owner class onto the anime engine's `animeMaterial` collapses its programs | a branch that moves island-static (12 exclusive programs [E0a]) | PASS: programs at ready fall by at least 10 on both adapters, with the owner's visual sign-off. KILL: a fall of fewer than 5 |
| HYPOTHESIS C | row 26 and O2 | for authored shots, visibility topology is a function of shot time alone, so its events can be baked like an aspect graph | O2 | as O2 |

Why it matters: each test can end its line of work, and H0 comes first because it gates H3 and H4.

## 7 Formalisation: three Lean 4 lemmas

Core Lean 4 only, no Mathlib, toolchain 4.36.0. Each statement below is exact. Names may change; content may not.

**7a Schmitt-trigger flip bound (for P5).**
- Model: `lo hi : Int` with `lo < hi`; `g := (hi - lo).toNat`. `step lo hi (s : Bool) (x : Int) : Bool := if hi ≤ x then true else if x ≤ lo then false else s`.
- `flips lo hi s [] = 0`, and `flips lo hi s (x :: xs) = (if step lo hi s x ≠ s then 1 else 0) + flips lo hi (step lo hi s x) xs`.
- `tv [] = 0`, `tv [x] = 0`, and `tv (x :: y :: r) = (y - x).natAbs + tv (y :: r)`.
- Theorem: for all `s` and `xs`, `flips lo hi s xs * g ≤ tv xs + g`.
- Corollary 7a′: if every successive difference has `natAbs ≤ L`, then `tv xs ≤ L * (xs.length - 1)`, so `flips * g ≤ L * (xs.length - 1) + g`.
- Hint: first prove a witness form. If `w` is the sample of the last flip (`hi ≤ w` when `s = true`, `w ≤ lo` when `s = false`), then `flips s xs * g ≤ dist w xs + tv xs`, where `dist w [] = 0` and `dist w (x :: _) = (x - w).natAbs`. Each flip pays g out of the distance travelled since the witness, by the triangle inequality. The `+ g` in the theorem pays for the first flip, which has no witness.

**7b Inclusion induces a map of components (the interleaving step behind P1 to P3).**
- Model: vertices `Nat`; `adj : Nat → Nat → Prop`; a set is `S : Nat → Prop`. `inductive Reach (adj) (S) : Nat → Nat → Prop` has constructors `refl : S u → Reach adj S u u` and `step : Reach adj S u w → adj w v → S v → Reach adj S u v`.
- (i) Endpoints: `Reach adj S u v → S u ∧ S v`.
- (ii) Equivalence on S: if `adj` is symmetric, `Reach` is symmetric and transitive. Components are then its classes.
- (iii) Monotonicity: `(∀ v, S v → T v) → Reach adj S u v → Reach adj T u v`. So inclusion sends a component of S into one component of T, and the map on classes is well defined.
- (iv) Sup-norm inclusion: for `f g : Nat → Int` and `ε τ : Int`, `(∀ v, f v - ε ≤ g v) → ∀ v, τ ≤ f v → τ - ε ≤ g v`. That is, {f ≥ τ} ⊆ {g ≥ τ − ε}.
- (v) Interleaving: if `∀ v, f v - ε ≤ g v ∧ g v - ε ≤ f v`, then both `Reach adj {f ≥ τ} u v → Reach adj {g ≥ τ - ε} u v` and `Reach adj {g ≥ τ - ε} u v → Reach adj {f ≥ τ - 2ε} u v` hold, and so does their composite `Reach adj {f ≥ τ} u v → Reach adj {f ≥ τ - 2ε} u v`. Both maps come from (iii) and (iv), no sign condition on ε is needed, and the composite equals the direct inclusion map, so the square commutes.

**7c The decayed heat update is a contraction with bounded steps (for P6).**
- Model: `a b : Int` with `0 ≤ a`, `a ≤ b`, `0 < b` (the decay factor is a/b); fields `H G D : Nat → Int`. The update is written without division: `b * H' v = a * H v + b * D v` and `b * G' v = a * G v + b * D v`, with the same D for both.
- (i) Contraction: `(∀ v, -M ≤ H v - G v ∧ H v - G v ≤ M) → ∀ v, -(a * M) ≤ b * (H' v - G' v) ∧ b * (H' v - G' v) ≤ a * M`.
- (ii) Step bound: `(∀ v, -M ≤ H v ∧ H v ≤ M) → (∀ v, -K ≤ D v ∧ D v ≤ K) → ∀ v, -((b - a) * M + b * K) ≤ b * (H' v - H v) ∧ b * (H' v - H v) ≤ (b - a) * M + b * K`.
- (iii) Invariant: `(∀ v, 0 ≤ D v ∧ D v ≤ K) → (∀ v, 0 ≤ H v ∧ (b - a) * H v ≤ b * K) → ∀ v, 0 ≤ H' v ∧ (b - a) * H' v ≤ b * K`.
- (iv) Sharp step at the invariant: under the hypotheses of (iii), `∀ v, -K ≤ H' v - H v ∧ H' v - H v ≤ K`. This is the discrete form of ‖∂H/∂t‖∞ ≤ ρK(0) in P6. Proof: `b * (H' v - H v) = (a - b) * H v + b * D v`, whose first term lies in [−bK, 0] and second in [0, bK]; divide by b.
- Note: the products of variables put these goals outside `omega`. Use the core lemmas `Int.mul_le_mul_of_nonneg_left`, `Int.mul_nonneg` and `Int.le_of_mul_le_mul_left`.

Why it matters: 7a and 7c turn P5 and P6 from sketches into machine-checked statements, and 7b does the same for the interleaving step behind P1 to P3. Lemma T (P0) is not covered by them and stays a sketch (§4).

## 8 Limits

Every number in §5 comes from one hybrid laptop (Intel UHD and RTX 4060 Laptop, never compared with each other), headless real Chrome, and three runs per arm, or from single-thread Node on the same machine. The walk is a scripted nearest-neighbour tour plus a seeded roam, with no collisions and with all seeds sharing the tour. Movers are seeded random walkers, not the real penguins. The grid excludes the 4 places beyond 84 m. The occlusion term of the certainty field is not modelled, because the camera never rotates in E1. E1's pre-registered counter is defective and the faithful one is post hoc. The R3 route-heat numbers are synthetic, were not pre-registered, borrow E1's bar, and use one σ (6 m), one half-life (90 s) and one cell spacing (h = 4). No real visitor route exists. The cold-arrival rate, the queue drain time and the arrival-frame cost at HEAD are unmeasured. The 79 percent FrameGuard figure comes from one development-build profile of one steady 3.5 s window on Intel UHD; the production-build profile on both adapters (O4) is not run. Lemma T, P5, P9 and the sharpened P6 are proved here only as sketches until the §7 lemmas check. Rows 26 to 28 of §2 are unverified, and the prior-art search covered web and exa only. R1 to R3 are consolidated on the evidence branch at commit `74a41f7`; the route-heat scripts they describe (`heat.mjs`, `summ.mjs`, `deadline_cover.mjs`) are not committed.

## Appendix A: number ledger

Each figure used above, with the place it can be re-read. Line numbers refer to the files as read on 2026-11-20 at commit 0e90810, an ancestor of 51acb97.

| figure | value | where |
|---|---|---|
| E1 pre-registered verdict | DEAD, 3,060 events / 21,921 frames = 0.1396 per frame | [TF-R] lines 7-11 |
| SIMP-H rates, h = 4, N = 20 | 1.782, 2.045, 1.995 /s; medians 2/s | [TF-R] lines 28-30 |
| RAW, SIMP-H, B1 pooled | 1.946, 1.941, 0.755 /s | [TF-R] lines 75-78 |
| B1 per seed | 0.788, 0.690, 0.788 /s | [TF-R] lines 75-77; per minute 47.3, 41.4, 47.3 in [R3] §3b |
| SIMP-H kinds, h = 4, N = 20 | birth/death/merge/split 47/50/59/61, 51/54/69/75, 47/44/76/76 | [TF-R] lines 54-56 |
| N = 0 floor, h = 4 | 0.172, 0.123, 0.156 /s | [TF-R] lines 51-53 and 120-122 |
| h = 2, N = 20, SIMP-H | merges/splits 55/53, 74/75, 76/77; no births or deaths | [TF-R] lines 45-47 |
| water off against on, SIMPLIFIED | 10.198, 10.239, 9.952 against 8.540, 8.786, 7.801 /s | [TF-R] lines 191-196 |
| defect witness | RAW 121, SIMPLIFIED 127 (h = 8, N = 20, seed 1, 5 s roam) | [TF-R] line 35 |
| K5 ratios | 182.65× SIMPLIFIED, 788.26× SIMP-H | [TF-R] lines 26, 141 |
| E2 | core p95 0.0977 ms; full p95 0.2334 ms (pooled) | [TF-R] line 182 |
| known-answer tests | K1-K4, K6-K13 pass | [TF-R] lines 87-102 |
| occluder filtered rates | 0.3433, 0.2951, 0.3825 /s; 0.44, 0.43, 0.49 × B1 | [OT-R] lines 7-9, 29-35 |
| occluder controls | 2.59× filtered, 2.43× LATCHED; bar 20× | [OT-R] lines 43-44 |
| occluder N = 0 totals | 27, 29, 36 against 35, 31, 40 | [OT-R] lines 29-35, 53-55 |
| Q3 at 43f71f7 | 142 and 138 programs; static-only 29 (20.4, 21.0 percent); upper 79.6, 79.0 percent | [E0b] lines 77, 79 |
| Q3 at dc2677d | 109 and 124 programs; static-only 29 (26.6, 23.4 percent); dock-only 18 (16.5, 14.5 percent); upper 73.4, 76.6 percent | [E0a] lines 77, 79 |
| curtain lift, programs at ready | 13,511 → 11,685 ms and 144 → 109 (Intel); 13,796 → 11,656 ms and 138 → 124 (RTX) | [ARCH] lines 138-149 |
| RTX resident-engine stall | 22, 23, 25 frames on; 776, 805, 819 off; stalls 3.1-4.6 s linking 26-73 programs | [ARCH] lines 190-201, 216 |
| first-visitor window after the fixes | RTX 833, 828, 826 then 999, 845, 844; Intel 838, 940, 814 then 981, 987, 938 frames | [ARCH] lines 233-237 |
| key-press frame, prewarm tick | 133.2, 121.0, 133.2 → 36.4, 24.4, 30.4 ms (RTX); 145.3, 115.1, 115.0 → 36.3, 36.4, 36.4 ms (Intel); tick 92 → 40, 89 → 37 ms | [ARCH] lines 233-237 |
| baseline control at 43f71f7 | 23, 28, 27 frames with 4.0-4.1 s stalls | [ARCH] line 244 |
| FrameGuard profile | `FrameGuard.useFrame` 2209 ms of 2789 ms in the render loop; `front` 1544 ms; occlusion probe 591 ms; WebGL render 262 ms; one steady 3.5 s window, development build, Intel UHD | [ARCH] §3.5b, at 51acb97 |
| T1, T3 | 14 → 4 regions on 6,252 vertices, bake 16-19 ms; ≤ 1 tier change per 10 s; Intel overload at T1 in 2.95 s against 7.6 s | [EN] lines 72-87 |
| anime engine programs | one surface and one hull program for every mesh | [EN] line 49 |
| horizon coverage | 27 of 27 from spawn; min 18, median 24, max 27 from a dock point; 5 critical from spawn | [R3] lines 18-21 |
| route-heat events | dock-seeking 1 Hz raw 13.3-14.8, filtered 6.4, 5.9, 6.9 per minute; wanderer filtered 1.0-3.4 | [R3] lines 120-131 |
| route-heat kinds, seed 1 | birth 1, death 15, merge 2, split 17 | [R3] line 127 |
| route-heat concentration | 23 of 26 docks at the end of the tour; 3, 7, 1 after the roam; wanderer 0-7 | [R3] lines 85-115 |
| decayed KDE bound in R2 | ‖dH/dt‖∞ ≤ 2ρK(0), sharpened to ρK(0) in P6 | [R2] lines 47-51 |

## Appendix B: glossary

- Bar (b, d): a persistence interval; b is the birth value, d the death value, persistence b − d (§1).
- B1: chunk-boundary crossings per second for 16 m square chunks inside a 48 m window on the same walk; the economy bar is 0.1 × B1 (§1).
- Chunk: a component of S_τ(H) whose diagram point has p ≥ τ > s and p − s ≥ δ (D4).
- Cold arrival: an arrival whose dock is not in state "compiled", or whose world is not built, at the arrival event (H0).
- Critical cell: a non-simple cell, the only kind whose flip changes the number of components of a set or its complement (Lemma T).
- Dwell-second: the unit of H, which is measured in seconds of dwell (D5).
- EDF: the queue order of HEAD, the earliest `deadlineS` docks first (H1, H3).
- Elder rule: when two components meet, the one born higher survives and the younger dies at the joining value (§1).
- FrameGuard: the component whose whole-scene raycasts are profiled in the ledger and in O4, and whose 0.25 s hold takes the solid-set events (D7).
- Hysteresis: two thresholds, τ_lo below τ_hi, with a latch that holds its state between them (D2).
- Interleaving distance d_I: the distance between merge trees bounded by the sup norm of the field difference (P2).
- Manifest M(C): the programs and world builds owned by the docks inside chunk C (D6).
- Out-of-heat: H_t(γ(t)) < τ_lo for at least 2 s, or γ(t) more than 24 m from every compiled chunk (D6).
- RAW: the unfiltered event count; SIMPLIFIED: the pre-registered, defective counter; SIMP-H: the faithful lineage-latched counter (§5).
- Simple cell: a cell whose in-set neighbours are nonempty, not all six, and form one cyclic arc (Lemma T).
- Superlevel set S_τ(f): {f ≥ τ} (§1).
