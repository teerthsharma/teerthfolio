### Task 12: Wave D — Brick-by-Brick Crystal Dome and Pixel Finish

**Agent skills:** active-theory-cinematic-shader, igloo-antarctic-object-world, extract-repo-math, discover-topology, anti-slop.

**Files:**
- Consume: `lib/polar-dome-lattice.js`
- Modify: brick/material/interaction portions of `components/PolarObservatoryDome.jsx`
- Create or modify: focused dome shader module(s)
- Consume read-only: `donotcommit/hologram-particles/`

**Interfaces:**
- Consumes deterministic lattice cells from Task 11.
- Produces one instanced brick shell, arched entrance, high-poly optical read, cursor displacement, and quality-tiered shader profile.

- [ ] **Step 1: Extract only transferable repo math**

Read the local repo license/README and the actual particle/hologram shader sources. Port concepts—not WebGPU-only syntax or copied assets—to current Three.js WebGL: surface sampling, wrapped diffuse, low-pass fractal displacement, dual-normal blending, cursor force, spring return, displacement glow, Fresnel containment, and deform/morph/reform phase logic.

- [ ] **Step 2: Place every brick on the Wave C lattice**

Use one or a bounded number of instanced draws. Align every brick to its tangent frame; give it softened bevel geometry, thickness, joint spacing, slight deterministic scale/rotation variation, and stable contact at the base/doorway. No flat texture pretending to be bricks.

- [ ] **Step 3: Build the high-poly crystal illusion**

Combine smooth macro displacement with restrained frost microstructure, recomputed or blended normals, warm/cool wrapped light, edge Fresnel, internal cyan depth, and weight-aware cursor deformation. Bricks must read as individual crystalline blocks and as one coherent dome.

- [ ] **Step 4: Add pixel-level cinematic finish**

Use shader-space detail and bounded post hooks for stable antialiasing, subtle dither/quantization, distant depth pixelation/fog, and hand-drawn edge signal. Do not add generic particles yet; that is Wave F. Keep post removable and preserve a strong raw dome.

- [ ] **Step 5: Record Wave E proof requirements**

Record exact expected captures: raw shell, final medium/high, doorway, touch, weighted return sequence, collision, mobile, reduced motion, and draw/program/texture counts. Do not start the Node server or execute tests in Wave D.

