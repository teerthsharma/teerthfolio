### Task 6: Plaque Dome, Seal Locomotion, XZ Composition, and Collision

**Agent skills:** igloo-antarctic-object-world, junni-mascot-guide, bruno-open-world-navigation, discover-topology, webgl-smoothness, superpowers:test-driven-development.

**Files:**
- Modify: `components/PolarObservatoryDome.jsx`
- Modify: `components/TopologicalSealMascot.jsx`
- Modify: `lib/seal-manifold.js`
- Modify: `lib/polar-camera-composition.js`
- Modify: `lib/polar-station-world.js`
- Modify: focused dome/seal/camera checks

- [ ] **Step 1: Contract distinct XZ layout and local camera**

Assert all station pairs have meaningful XZ separation and different approach azimuths. At a settled station show one hero, one route lead, and at most one distant promise; never the whole map.

- [ ] **Step 2: Complete brick-by-brick procedural dome**

Keep instanced geometry, but give every visible brick a dome-tangent transform, softened bevel/highlight, joint line, stable base, and weighted mouse displacement. Interaction may flex and glow; collision must prevent the seal entering the shell.

- [ ] **Step 3: Add seal travel wave**

Preserve permanent breathing. Layer a front-to-back glumph wave, small lift, and gaze/halo change from canonical speed and station state. Clamp traversal near 3–4 world metres/second and prevent double smoothing.

- [ ] **Step 4: Implement render-space fisheye/local reveal**

Use camera composition and bounded post distortion to create circular-world presence without corrupting XZ collision/docking. Raise the seal slightly during travel and settle continuously.

- [ ] **Step 5: Verify**

Capture Plaque idle/touch/collision/return, one travel midpoint, all eight settled camera frames, and mobile routing. Run dome, seal, camera, and traversal checks.

