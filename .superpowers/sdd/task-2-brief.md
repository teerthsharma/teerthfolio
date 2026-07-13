### Task 2: Modern Antarctic Ground, Palette, and Local Biome Fields

**Agent skills:** investigator, uplifting-webgl-colors, active-theory-cinematic-shader, igloo-antarctic-object-world, anti-slop, superpowers:test-driven-development.

**Files:**
- Modify: `components/PolarBiomeWorld.jsx`
- Modify: `lib/polar-biome-fields.js`
- Modify: `components/IglooTerrain.jsx`
- Modify: `scripts/check-polar-biome-world.mjs`
- Modify: `scripts/check-polar-color-continuity.mjs`
- Test: `scripts/verify-polar-biome-visuals.mjs`

**Interfaces:**
- Consumes: avatar XZ, nearest/destination station, quality tier, reduced motion.
- Produces: neutral polar base plus clamped local station influence.

- [ ] **Step 1: Capture the reported QPU ground failure**

Use the supplied frame as RED evidence: purple high-frequency facets dominate, the right highlight clips, and QPU influence floods the full scene.

- [ ] **Step 2: Add failing field and color assertions**

Require every station field to define `centerXZ`, `radius`, `falloff`, `accent`, `shadow`, and `weatherVector`; assert combined influence is clamped and black/highlight ratios remain bounded.

Run: `node scripts/check-polar-biome-world.mjs && node scripts/check-polar-color-continuity.mjs`

- [ ] **Step 3: Rebuild macro/micro terrain hierarchy**

Use two or three low-frequency drift/path signals for macro form. Compress micro noise below hero contrast. Blend stations by normalized XZ distance and keep a neutral warm polar base.

Implement the invariant:

```js
const influence = smoothstep(radius, radius * falloff, distanceXZ);
const total = Math.min(1, localInfluences.reduce((sum, value) => sum + value, 0));
```

- [ ] **Step 4: Finalize palette**

Use warm off-white snow, cool cyan/lavender shadows, navy anchors, and small local coral/yellow/green/magenta accents. Reduce global magenta contamination, retain snow detail, and separate horizon with atmosphere rather than gray fog.

- [ ] **Step 5: Verify five representative stations**

Capture Plaque, S2, QPU, Topology, and Assembly at 1440×900 plus QPU mobile. Expected GREEN: no clipped focal highlight, no full-screen station wash, ground remains subordinate, and runtime has zero shader errors.

