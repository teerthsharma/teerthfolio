# Task 11 report: mathematical igloo lattice and structural dome authority

Status: **IMPLEMENTED_UNVERIFIED — source contracts and deferred checks are written; execution remains reserved for Wave E**

## Scope and constraints

Task 11 owns `lib/polar-dome-lattice.js`, the lattice/skeleton-facing portions of `components/PolarObservatoryDome.jsx`, and `scripts/check-polar-dome-lattice.mjs`. The controller explicitly prohibited tests, lint, builds, servers, and browser work in this wave, so none were run. Existing crystal shader, hover/glow work, dome public props, reduced-motion behavior, traversal handoff, and Task 6 world collision/camera ownership were preserved.

Task 3 had already selected and implemented **Dawn ice passage** after comparing the polar field manual, aurora transit map, and dawn passage concepts. Task 11 consumes that opening decision unchanged: the mathematical dome remains the home-observatory threshold within the selected dawn route and does not introduce a second opening-theme authority.

## Exact attributable diff

### `lib/polar-dome-lattice.js`

- Added one frozen rendered-airlock authority containing its component-local position, Y rotation, local extrusion axis, tangent, inner/outer arch radii, depth, and spring height. Doorway exclusion, doorway arch geometry, and collision use this same authority.
- Added deterministic upper-ellipsoid latitude rings for low, medium, and high tiers. Course boundaries use stable weighted latitude bands; azimuth counts derive from each ring's elliptical circumference and target apparent cell width; alternate rings receive an exact half-cell stagger.
- Each cell exposes the required `ringIndex`, `cellIndex`, `position`, `tangent`, `bitangent`, `normal`, `scale`, `weight`, and `doorwayExcluded` contract, plus deterministic frost/facet/bevel seeds and inspectable mass/support fields.
- Cell frames are a right-handed tangent/bitangent/outward-normal basis on the shared ellipsoid. Projected cell extents are tested along the airlock tangent, vertical, and extrusion axes, so exclusion covers bricks whose oriented volume intersects the arched doorway—not only cells whose center happens to fall inside it.
- Added a shared structural skeleton with quality-budgeted radial ribs, two doorway buttresses, ring seams, a doorway-gapped base compression ring, and a rendered-airlock-aligned arch. The rib gap is derived from deterministic surface/envelope intersection sampling, keeping both doorway shoulders clear without assuming the airlock is radial.
- Added an upper-ellipsoid collision-shell authority with a single clear arched corridor matching the rendered inner airlock opening. Point classification and segment tracing distinguish passable doorway crossings from blocked shell crossings outside the doorway.
- Added root-heavy/crown-flex response. Interaction weights combine geodesic angular falloff, structural support, doorway buttress influence, and ring mass; base cells carry greater mass/support and crown cells retain more visual response.
- Replaced integration-sensitive recoil with an analytic near-critical damped spring, including bounded displacement, invalid-state fallback, frame-delta capping, and clamp windup protection.
- Added frozen generated quality metadata for ring columns and total/excluded/visible cell counts. Medium/high rendering profiles now consume these generated counts rather than a historical fixed block total.

### `components/PolarObservatoryDome.jsx`

- Consumes one memoized shared lattice per normalized quality tier. The instanced shell iterates `lattice.visibleCells` and builds every block transform directly from each cell's tangent/bitangent/normal frame and scale.
- Publishes generated low/medium/high lattice metadata and retains the legacy `DOME_RIB_COUNT` export as a compatibility alias to the high-tier structural count.
- Medium/high quality now renders one real instanced crystalline shell using generated visible-cell counts. Its continuous geometry is only a plain inner weather shell; it does not draw shader-faked masonry below the instances. No image texture, normal map, displacement map, or second component-local brick lattice remains.
- Per-brick hover retains the controller's glow/crystal shader work while distributing response through the shared geodesic/root-heavy cell weights. Airlock-block hover retains its bounded per-instance behavior.
- Replaced component-local meridian math with one merged skeleton geometry built from shared ribs, ring seams, base ring, and doorway arch. The skeleton remains inspectable even on low quality and stays one draw call.
- The rendered airlock position, rotation, radii, depth, and spring line consume the shared authority, aligning it with cell exclusion and collision instead of maintaining parallel constants.
- Root metadata exposes the exact lattice version, quality, visible/excluded counts, and component-local collision contract. Existing public props, root transform flow, shader updates, reduced-motion reset, and bounded contact optics remain intact.
- Dome translation/tilt return now delegates to the shared analytic spring while preserving the controller's impulse scale, reduced-motion branch, hard limits, and crystal-material compression signal.

### `scripts/check-polar-dome-lattice.mjs`

The deferred Wave E checker now specifies:

- repeat-generation determinism and exact exported count/profile agreement;
- circumference-derived ring columns, alternate half-cell stagger, tier budgets, and strictly increasing visible detail;
- unique cell identities/positions, positive scale, unit frames, all pairwise orthogonality, right-handedness, outward normals, and exact ellipsoid placement;
- oriented doorway-extent exclusion with no visible overlap;
- rib/seam/base shell placement, doorway gaps, two buttresses, and airlock-axis/tangent arch alignment;
- collision point classification, a passable rendered-doorway crossing, and a blocked continuous-shell crossing elsewhere;
- bounded mass/support/response, root-heavy/crown-flex ordering, and geodesically local hover response;
- bounded, nearly non-oscillatory, frame-rate-stable analytic spring return;
- static component consumption of the shared lattice, generated profile counts, structural skeleton, airlock authority, weighted hover, and collision metadata;
- rejection of duplicated surface-frame math, the old fixed `104`-block profile, a second component-local brick generator, and texture-faked dome masonry.

## Deferred Wave E execution

No command below was run in Wave C. Wave E should execute:

```powershell
node scripts/check-polar-dome-lattice.mjs
```

Wave E should then include the lattice contract in its normal lint/build/runtime sequence and visually inspect low/medium/high at desktop and portrait sizes. The browser pass should specifically inspect the two doorway shoulders, absence of blocks inside the arch, skeleton continuity, instanced block orientation at the crown and base, hover falloff, bounded contact recoil, and shader/page errors.

## Remaining concerns for Wave E

- Runtime JSX/Three.js geometry construction and GLSL compilation remain intentionally unverified.
- The shared airlock/corridor alignment is source-authoritative, but only a settled browser frame can confirm the chosen clearances read cleanly at all camera angles and quality tiers.
- `scripts/check-dome-performance.mjs` and `scripts/check-render-budget.mjs` still contain historical fixed-course/fixed-`104` source expectations outside Task 11 ownership. Wave E must replace those stale expectations with the generated tier metadata before treating the aggregate verifier as authoritative.
- Task 6 retains world-space seal collision/camera authority. Task 11 exposes the dome-local mathematical shell/corridor contract for integration and does not silently rewrite that separate controller during this scoped wave.
