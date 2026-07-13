### Task 11: Wave C — Opening Theme and Mathematical Igloo Lattice

**Agent skills:** superpowers:brainstorming, superpowers:writing-plans, active-theory-cinematic-shader, igloo-antarctic-object-world, discover-topology, discover-systems-theory.

**Files:**
- Consume Task 3 opening-theme decision and implementation
- Create: `lib/polar-dome-lattice.js`
- Modify: skeleton/lattice-facing portions of `components/PolarObservatoryDome.jsx`
- Create: `scripts/check-polar-dome-lattice.mjs` (write in Wave C, execute in Wave E)

**Interfaces:**
- Produces: deterministic dome rings, brick cells, doorway exclusion, tangent frames, outward normals, collision shell, interaction weights, and quality-tier counts.
- Preserves: Task 6 world-space collision/camera handoff and existing dome public props.

- [ ] **Step 1: Compare opening themes against Wave B regions**

Task 3 must compare at least three openings: luminous observatory stream, seal-guided polar signal arrival, and crystalline topology field. Score each against the eight region personalities, first-10-second comprehension, mobile composition, safe-gate truth, and originality. Select one theme and record the decision before implementation.

- [ ] **Step 2: Define the dome lattice contract**

Use a hemisphere parameterization with staggered latitude rings. For each cell produce:

```js
{
  ringIndex,
  cellIndex,
  position,
  tangent,
  bitangent,
  normal,
  scale,
  weight,
  doorwayExcluded
}
```

Derive azimuth count from ring circumference so cells keep a consistent apparent width. Offset alternate rings by half a cell. Exclude cells whose projected center/extent intersects the arched doorway volume.

- [ ] **Step 3: Build a crystalline structural skeleton**

Create stable radial ribs, ring seams, doorway arch, base compression ring, and outer collision shell from shared mathematical parameters. Keep the skeleton visually inspectable without final bricks. No decorative particles in Wave C.

- [ ] **Step 4: Define interaction and collision weights**

Compute each cell's cursor-response weight from angular/geodesic distance, structural support, and ring mass. Lower/base cells remain heavy; crown cells flex more. Return uses a critically damped or near-critically damped spring. Ensure the seal cannot cross the shell outside the doorway.

- [ ] **Step 5: Write deferred Wave E checks**

Write assertions for deterministic counts, unit/outward normals, tangent orthogonality, no doorway overlap, no duplicate cells, collision continuity, bounded displacement weights, and low/medium/high tier budgets. Do not run them until Wave E.

