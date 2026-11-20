Written before any result existed; committed unchanged. The results are in out/results.md.
# Topological probabilistic rendering: pre-registered test (written before any number exists)

Subject: the certainty-field design (c(x) on hex cells, baked / band / live, rebuild only on topology events).
Scene: the island at HEAD 43f71f7 (worktree missing-occlusion-features-73446b).

## What the bet rests on (the design's own open questions)
Q1  Topology events of the live region are rare under real seal motion.      <- E1, offline, no renderer
Q2  Computing c(x) costs less than it saves.                                  <- E2, CPU microbench only (GPU side deferred)
Q3  A small fixed set of programs covers the island.                          <- E0, program ownership audit on a real build
Q4  Band edges show no ghosting.                                              <- needs the renderer, NOT tested here

## E1: topology events on a recorded seal walk (offline)
Field: hex cells, centre spacing h in {2, 4, 8} m over the island disc (radius 84 m). 6-neighbour adjacency
for BOTH the live set and its complement (hex grids have no connectivity paradox: that is the reason to use them).
c(x) = smoothstep(r_near, r_far, |x - seal|) * (1 - m(x)); r_near=6, r_far=24 m. Near the seal c is low = live.
m(x) = mover influence (N random-walk movers at 1 m/s, radius 3 m, N in {0, 20, 60}). Water = fixed live annulus (static, so no event source).
Occlusion term c_occ is NOT modelled (camera never rotates; stated as a limit, not a pass).
Live set L_t = { c < tau_low }, tau_low = 0.35. Band = [0.35, 0.65]. Hysteresis: a cell leaves live only above 0.65.
Path: all PLACES docks visited nearest-neighbour at boost speed (MOTION.maxSpeed*MOTION.boost = 15 m/s, slow to 0.5 inside approach),
then 60 s roam, 3 seeds. 60 Hz. Motion law from lib/world/motion.js constants (plain kinematics is enough; no collisions).
Events counted per frame: birth, death, merge, split of live components; hole open/close (baked component not touching the border).
Counted twice: RAW (any component) and SIMPLIFIED (component kept only if it dips >= 0.10 below tau_low, i.e. persistence >= 0.10 of the [0,1] range;
this is the existing h0Superlevel idea from lib/anime/topology.js applied to -c).
Baselines on the same path: (B1) chunk-boundary crossings/s for 16 m square chunks inside a 48 m window;
(B2) baked<->live tag flips/s per cell without hysteresis.

Known-answer tests (the detector must pass all before any walk number is believed):
K1 static disc: 0 events.            K2 disc that splits in two at frame 100: exactly 1 split.
K3 disc growing then shrinking smoothly (no split): 0 events.   K4 disc with a baked island opening inside it at frame 100: exactly 1 hole-open.
K5 negative control: same walk with mover positions re-randomised every frame: events/frame must be at least 20x the real walk (shows the detector can see events).

PASS bar (fixed now): SIMPLIFIED topology events median <= 1 per second AND <= 0.1 x B1 chunk crossings per second, at h=4, N=20, on all 3 seeds.
DEAD if SIMPLIFIED events > 1 per 10 frames at h=4, N=20. Anything between is reported as unresolved, not as a pass.
Report every cell of the {h} x {N} sweep, RAW next to SIMPLIFIED, with the seeds. No cherry-picked cell.

## E2: cost of c(x) (CPU)
Node microbench: time to update c on all hex cells (h=4 m) + tag + component count per frame, median/p95 over the E1 walk.
Bar: p95 <= 0.5 ms CPU per frame. The GPU read-back of baked data is NOT measured here.

## E0: baseline and program audit on a real build (HEAD)
Real Chrome, production build, cold cache, adapter named (RTX 4060 Laptop and Intel UHD, never compared with each other), 3 runs each.
Numbers: curtain lift (__world.ready), programs at ready, time to first frame, frame time p50/p95/max over a 20 s walk.
Control to beat (E0c): the same build with the dock prewarm queue off (?hud=off), already known 5.40 s / 112 programs at beff5e24: remeasure at HEAD.
Program ownership: for every linked program, owner = island-static / buildings / props+toys+penguins / water+sea / seal / post stack / cutscene docks.
Q3 reading: how many programs belong to owners whose material is STATIC (could be a baked read) vs LIVE (seal, water, movers, post).
The field only has to beat E0c; if the two-stage boot alone gets most of the way, the field's marginal value is what is left.

## What would change my mind
- E1 dead -> the field is a per-frame heuristic with no topological economy on this scene; stop at E1.
- E1 pass but E0 shows >= 80% of programs owned by live/post/cutscene -> baking the static island cannot shrink programs enough; the value is elsewhere (boot order, lazy docks).
- Everything passes -> build the renderer slice (island-only) against E0c.
