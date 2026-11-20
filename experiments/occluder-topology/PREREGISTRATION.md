Proposed after the topo-field result, before any code or number exists. Not run. Every claim is a hypothesis; the prior-art list is recalled, not verified. The bars below are fixed now.

# Dr House, ticket 19 (every claim here is HYPOTHESIS)

## The leap: move c(x) onto the pup's occluders and weight it by their persistence

**What to change.** Drop the field centred on the viewer. Each frame, build a 32x32 mask over the pup's screen box that marks every pixel where something is nearer than the pup. Distance-transform the occluded set, then run `h0Superlevel` on `csrGrid(32,32)`. That gives each occluder component a persistence p, which is its largest inradius in mask pixels. The thresholds are fixed now:
- p < 1: the pup draws over the occluder (grass blades).
- 1 <= p <= 3: the band. The pup shows through with probability (3 - p)/2, dithered across frames, so TAA produces the partial occlusion that DOF cannot (ENGINE-NOTES item 2).
- p > 3: the occluder stays solid. Only topology events of this significant set reach FrameGuard's 0.25 s hold.

**Why it gets past the cause of death.** E1's events come from independent movers colliding:
- h=4: 0.12-0.17/s with no movers, 1.78-2.06/s with N=20, about 5.6-6.4/s with N=60.
- h=2: zero births or deaths, so no grid aliasing (a 2.08 m live disc is smaller than the 2.31 m hex circumradius at h=4). The rate is still 0.90-1.29/s, above B1.

One pup against static occluders has no N term: a mover counts only while it is inside the short camera-to-pup segment. The events also now drive a visible response, not program builds, and Q3 showed program builds are not the cost (about 21% static, NOT TRIGGERED).

**RED test.**
- **Bed.** The topo-field walk (3 seeds, 121.78 s, N=20 movers as 0.4 m cylinders), plus:
  - the island follow camera, with offset and damping read from the rig;
  - dock buildings and the plateau as solids;
  - grass cards at `meadow.js` density.
- **Arms.**
  - RAW occlusion events (no filter).
  - Filtered events (p > 3), counted with the existing `diffComponents` kinds.
  - Shuffled control: occluders re-randomised every frame.
  - Known answer: one pole swept across the pup gives exactly 1 birth and 1 death.
- **Bar.**
  - PASS: filtered events <= 0.1 x B1 (0.069-0.079/s) on all 3 seeds, and the control rate >= 20x the real rate.
  - DEAD: filtered events >= that seed's B1 (0.69-0.79/s) on any seed.
  - Anything between: UNRESOLVED.

## Annex, as the ticket asks
- **H0 on the id or depth buffer instead of FrameGuard's rays.** This is the detector inside the leap, not a separate leap. Kill it if an async 32x32 id readback plus `h0Superlevel` has p95 > 0.5 ms on Intel UHD in real Chrome; then keep the rays.
- **Aspect-graph bake.** In cutscenes the camera is a law and the moves are authored, so the pup's occlusion is the same on every run of a shot. That means an occluder timeline can be baked per shot at build, and FrameGuard becomes a lookup. Kill it if two `__replay` runs of one dock disagree on any block onset by more than 1 frame.
- **Topology-gated program or batch rebuilds, on any object.** Dead. Q3 shows that work is not the cost, so changing the object does not rescue it.

## Prior art (recalled, NOT verified this session; no web search was run)
- Visual events and aspect graphs (Koenderink and van Doorn 1979; Plantinga and Dyer, IJCV 1990): visibility topology changing only at critical events is decades old.
- The visibility complex: Pocchiola and Vegter; Durand, Drettakis and Puech.
- Stochastic transparency: Enderton, Sintorn, Shirley and Luebke, I3D 2010.
- Zigzag persistence: Carlsson and de Silva, 2010. The SIMP-H lineage latch is a crude version of it.

Possibly new (unverified): using occluder persistence as the per-pixel switch between dithered see-through and the director's response, in a browser toon renderer.

LEAD: run the RED test above. It dies if persistence-filtered pup-occlusion events reach that seed's B1 (0.69-0.79/s) on any seed. If the rate lands above 0.1 x B1 (UNRESOLVED), drop the event half and keep only the stateless band.
