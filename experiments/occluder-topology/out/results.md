# Occluder-topology results (E3, pre-registered in PREREGISTRATION.md)

Env: HEAD d318826ca4cac1e38ff9e90c756781b3d9ef4959, node v25.8.1, CPU Intel(R) Core(TM) i7-14700HX (28 logical cores), 2026-11-20T10:28:55.798Z.

## Verdict
Filtered column (the pre-registered one): **UNRESOLVED**
- seed 1: filtered 0.3433/s, B1 0.7883/s, 0.1 x B1 0.0788/s: between.
- seed 2: filtered 0.2951/s, B1 0.6897/s, 0.1 x B1 0.0690/s: between.
- seed 3: filtered 0.3825/s, B1 0.7883/s, 0.1 x B1 0.0788/s: between.
- control ratio 2.5943x is below the 20x bar, so PASS is blocked even if every seed is under 0.1 x B1.
The bars, verbatim from the prereg:
- PASS: filtered events <= 0.1 x B1 (0.069-0.079/s) on all 3 seeds, and the control rate >= 20x the real rate.
- DEAD: filtered events >= that seed's B1 (0.69-0.79/s) on any seed.
- Anything between: UNRESOLVED.

## LATCHED reading
LATCHED: specified before the run, not pre-registered. This never replaces the verdict above.
LATCHED column: **UNRESOLVED**
- LATCHED: seed 1: filtered 0.4022/s, B1 0.7883/s, 0.1 x B1 0.0788/s: between.
- LATCHED: seed 2: filtered 0.3142/s, B1 0.6897/s, 0.1 x B1 0.0690/s: between.
- LATCHED: seed 3: filtered 0.4208/s, B1 0.7883/s, 0.1 x B1 0.0788/s: between.
- LATCHED: control ratio 2.4322x is below the 20x bar, so PASS is blocked even if every seed is under 0.1 x B1.

## Per-seed table
Events per second are counted transitions over 60. Ratio to B1 is events/s over B1/s. Excluded and invalid share are per seed; the invariant column tests the column against its bound.
| seed | column | birth | death | merge | split | total | events/s | B1/s | 0.1 x B1/s | ratio to B1 | excluded | invalid share | invariant |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | RAW | 37 | 37 | 1 | 2 | 77 | 0.755 | 0.788 | 0.079 | 0.96 | 11 | 16.02% | - |
| 1 | filtered (pre-registered) | 19 | 16 | 0 | 0 | 35 | 0.343 | 0.788 | 0.079 | 0.44 | 7 | 16.02% | holds |
| 1 | LATCHED (not pre-registered) | 19 | 19 | 1 | 2 | 41 | 0.402 | 0.788 | 0.079 | 0.51 | 5 | 16.02% | holds (frame0Births 0) |
| 2 | RAW | 33 | 34 | 0 | 0 | 67 | 0.638 | 0.690 | 0.069 | 0.92 | 5 | 13.51% | - |
| 2 | filtered (pre-registered) | 16 | 15 | 0 | 0 | 31 | 0.295 | 0.690 | 0.069 | 0.43 | 5 | 13.51% | holds |
| 2 | LATCHED (not pre-registered) | 16 | 17 | 0 | 0 | 33 | 0.314 | 0.690 | 0.069 | 0.46 | 3 | 13.51% | holds (frame0Births 0) |
| 3 | RAW | 34 | 38 | 3 | 5 | 80 | 0.765 | 0.788 | 0.079 | 0.97 | 10 | 13.83% | - |
| 3 | filtered (pre-registered) | 16 | 17 | 3 | 4 | 40 | 0.383 | 0.788 | 0.079 | 0.49 | 10 | 13.83% | holds |
| 3 | LATCHED (not pre-registered) | 16 | 20 | 3 | 5 | 44 | 0.421 | 0.788 | 0.079 | 0.53 | 8 | 13.83% | holds (frame0Births 0) |

## K control
Known-answer gate (known.test.mjs): PASS, 11 tests.
Shuffled control: occluders re-randomised every frame; the ratio is shuffled events per counted transition over real events per counted transition.
| column | real events per counted transition | shuffled events per counted transition | controlRatio | 20x bar |
|---|---|---|---|---|
| filtered (pre-registered) | 0.00567 | 0.01471 | 2.59 | NOT met |
| LATCHED (not pre-registered) | 0.00631 | 0.01535 | 2.43 | NOT met |

## Sensitivities
Not judged. Each row is one seed of a non-judged variant.
| sensitivity | seed | RAW total | filtered total | LATCHED total | filtered events/s | B1/s |
|---|---|---|---|---|---|---|
| envelope: lab sculptures as cylinders of height 12 m (upper bound) | 1 | 92 | 48 | 53 | 0.471 | 0.788 |
| envelope: lab sculptures as cylinders of height 12 m (upper bound) | 2 | 84 | 42 | 48 | 0.400 | 0.690 |
| envelope: lab sculptures as cylinders of height 12 m (upper bound) | 3 | 89 | 45 | 51 | 0.430 | 0.788 |
| N=0: static occluders only | 1 | 67 | 27 | 33 | 0.265 | 0.788 |
| N=0: static occluders only | 2 | 65 | 29 | 31 | 0.276 | 0.690 |
| N=0: static occluders only | 3 | 76 | 36 | 40 | 0.344 | 0.788 |
| pOffset=0: p = max(EDT) | 1 | 77 | 35 | 41 | 0.343 | 0.788 |
| pOffset=0: p = max(EDT) | 2 | 67 | 31 | 33 | 0.295 | 0.690 |
| pOffset=0: p = max(EDT) | 3 | 80 | 40 | 44 | 0.383 | 0.788 |

## Invariants
Witnesses are written out, not fixed.
Every cell holds plain <= raw and latched <= raw + frame0Births.
Frames with a birth and a death in the same frame (judged cells, tracking breaks): seed 1: 14; seed 2: 14; seed 3: 14.

## Interpretation
- D1 Grass term dropped: The island's only grass is the Covenant meadow, centred (102, 22) radius 11 (+2) (`places.js:95`; `terrain.js:432-440`), 220 tufts of three 0.34 m cones and 220 flower cups (`components/world/land/Covenant.jsx:195-205,211-212`), plus flat turf facets. The walk never gets there (docks clamp to r 83, roam bounces at 80: `path.mjs:8,9`; the meadow starts at x = 89), so a grass term would be an empty set. The pre-registered bed loses by this: the p < 1 "draw over" class (grass blades) has no real occupant, so thin-occluder flicker is exercised only by the movers; the class is tested only by known-answer masks.
- D2 Movers: 20 seeded walkers from `makeField` (topo-field), not penguins, because real penguins flee the seal and are not deterministic (`Penguins.jsx:226-265`); the prereg fallback is used.
- D3 p definition: `p = max(EDT over the component) - 0.5`, not the prereg "largest inradius in mask pixels", because the exact EDT gives every occluded pixel a distance of at least 1 and p < 1 could never occur. The pOffset0 sensitivity uses `p = max(EDT)`.
- D4 Events: the four `diffComponents` kinds (birth, death, merge, split) from `topo-field/cc.mjs`; no hole kinds.
- D5 Physically impossible frames: the path has no collisions, so a frame is invalid when the pup is within 0.9 m of a building, collider or mountain it cannot stand on. Transitions touching an invalid frame, and the seam into frame 3707, are excluded and reported, not counted.
- D6 Outcomes: PASS, DEAD and UNRESOLVED as the prereg states them; INVALID is added for a failed known-answer gate, which the prereg does not cover.
- D7 Mask: 32x32 rays over the pup's measured screen rect, not FrameGuard's 24-ray whole-frame grid; the prereg asks for the 32x32 box mask.
- D8 Not ported: dock lean and per-place zoom, camera shake, the litTint cutaway (buildings are treated as opaque solids, as the prereg says) and plinthLift in the camera focus.
- D9 LATCHED column: specified before any run, so it is not post-hoc, but it is not the pre-registered column and never replaces the verdict.

## Limits
Limits. Lab and upstream-place sculpture heights are unknown: the nominal bed models none, and envelope is only an upper bound. Roofs and the igloo tunnel are ignored. Toy heights are assumed to be 2 x radius. Cutaway and heading lag are not modelled. The path has no collisions, so excluded frames are reported rather than removed from the walk. Cars and the real penguin flock are not modelled. Mask-space tracking by overlap breaks when relative image motion per frame exceeds a component width (boost, near occluders). The p offset and the 32 px resolution place the thresholds. Timing is Node on one machine only. The annex kills (async 32x32 readback p95 on Intel UHD; two `__replay` runs) are not run. Q3 and E0 are not covered.

