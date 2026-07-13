# Task 5 — Southwest Monument Production Pass

## Status

Implementation and static source audit are complete inside the four-file Task 5 boundary. No test, server, browser, screenshot, lint, shader, or build command was run, per controller instruction.

The requested `crafting-award-3d-object-worlds` skill is an unfinished placeholder with no actionable guidance. The implementation therefore uses the complete Antarctic object-world, cinematic shader, uplifting color, and anti-slop playbooks as its operative quality gate.

## Before

- Upstream was seven cylinder instances beneath a cropped sphere. Its rings sat on the ground rather than on the dish bearing axis, and the packet fell vertically.
- Topology was one thin horizontal row of box bars with no wall thickness, canyon, or continuous footing.
- Assembly was a base box, back box, and four bars arranged as a doorframe.
- All three shared a generic low-metalness surface recipe, so identity relied heavily on hue.

## Exact production diff

### `lib/polar-station-mechanisms-sw.js`

- Added frozen `SW_MECHANISM_VISUAL_CONTRACTS` with the required functions:
  - Upstream: bearing dish, source packet, signal rings.
  - Topology: archive wall, persistent trace, category reconfiguration.
  - Assembly: gantry, inspection backplane, proof/tool mass.
- Defined distinct silhouette, material, contact, high-poly, and station-local color contracts for all three.
- Added source-authoritative palette tokens:
  - coral/bearing-metal/mint for Upstream;
  - magenta/layered-pink/cool-trace for Topology;
  - warm ochre/cool steel/proof gold for Assembly.
- Changed Assembly’s mechanism accent from generic blue-gray `#73809E` to local ochre `#B78343` while retaining steel shadow and bounded proof light.
- Deep-froze nested palette/visual records.
- Routed ritual halo and edge colors through each profile rather than duplicated literals.
- Preserved the fixed 120 Hz authority, canonical XZ inputs, GitHub-only live pulse claim, deterministic category barcode, inspection tolerance proof, reduced-motion states, safe fallback, and evidence-ready timing.

### `components/PolarStationMechanismsSW.jsx`

- Preserved eight instanced draws plus one trace draw, three shared material programs, zero textures, one frame loop, quality tiers, and resource disposal.
- Replaced raw `BoxGeometry` and `SphereGeometry` use. The only cylinder left is the functional four-pin locator pool.
- Added three quality-tiered extruded geometries with real depth, bevel segments, rounded/chamfered shoulders, and recomputed smooth normals.
- Added a closed-profile `LatheGeometry` bearing dish with visible shell thickness and smooth radial continuity.
- Kept all surface materials on one shared `MeshStandardMaterial` program family while differentiating metalness, roughness, emissive response, opacity, and local palette.
- Kept signal/proof parts on one bounded `MeshBasicMaterial` program and the persistent trace on one vertex-colored line program.

Upstream is now a coral directional signal harbor:

- One broad ground plinth and three snow-contact footings anchor the object at world ground `y = -0.22`.
- Three splayed legs, base ties, bearing hub, crossbar, angled cradle, collar, axle wings, and rear brace create an airy compound tower rather than poles.
- The dish is a thick lathed shell, not a spherical cap.
- Dish, signal rings, and source packet share the same bearing/elevation vector.
- Rings animate only for a source-verified live GitHub signal; fallback does not masquerade as a live pulse.
- The received packet travels inward along the beam lane instead of falling vertically.

Topology is now a magenta relational archive canyon:

- Twenty source-derived thick beveled slabs form two opposing longitudinal walls around a central walkable aperture.
- Six additional instanced surfaces create continuous twin plinths, layered wall rails, and end foundations.
- Panel heights still derive from normalized real source/category identity.
- Source path extrusions push traced slabs inward; docking opens the canyon through the existing bounded aperture state.
- The persistent vertex-colored trace now follows the actual opposing wall coordinates and honors source-derived path order.
- Semi-translucent magenta relational surfaces have a distinct optical response from both metal families.

Assembly is now a heavy ochre-steel tool yard:

- A broad die bed and four load footings make physical snow contact.
- Two 12-segment beveled arch ribs form a compound curved gantry at front and rear, replacing the doorframe.
- The arch span/rise compresses only from the existing inspection-driven arm progress.
- Two layered backplanes provide inspection mass behind four typed moving tool parts.
- Locator pins retain proximity indexing; parts retain tolerance-gated seating; the proof ring appears only after the existing proof state.
- Warm ochre is mixed with cool steel in the structural material, while proof light remains a small local gold accent.

### `scripts/check-polar-station-mechanisms-sw.mjs`

- Added exact distinct-function assertions and frozen visual-contract coverage.
- Added checks for three unique silhouette/material/contact families and station-local-only color scope.
- Added exact palette assertions and the new ochre Assembly ritual expectation.
- Added required custom geometry, bevel/lathe, smooth-normal, curved-gantry, canyon, footing, backplane, packet, ring, trace, and disposal tokens.
- Added negative assertions against raw boxes, spherical-cap dishes, old mast/doorframe names, asset/texture loading, random motion, and scene-level lights/fog/background color ownership.
- Preserved all state-machine, source honesty, deterministic topology, tolerance proof, fixed-step, reduced-motion, safe-mode, draw/program/texture, and pooling assertions.

## Static audit evidence

- Eight `<instancedMesh>` declarations remain.
- One `<lineSegments>` declaration remains.
- Geometry families are `ExtrudeGeometry`, `LatheGeometry`, `CylinderGeometry` for functional pins, `TorusGeometry` for verified rings/proof, and `IcosahedronGeometry` for the received packet.
- Material program families remain `MeshStandardMaterial`, `MeshBasicMaterial`, and `LineBasicMaterial`.
- Every created geometry, material, trace buffer, packet, and torus is disposed on resource replacement/unmount.
- No `Math.random`, React state loop, downloaded asset, texture loader, scene light, scene fog, or global background ownership was introduced.

## Deferred proof

Wave E must run:

```powershell
node scripts/check-polar-station-mechanisms-sw.mjs
node scripts/verify-polar-station-mechanisms.mjs
```

Required captures: HUD-hidden desktop/mobile settled and interaction frames for Upstream, Topology, and Assembly; grayscale silhouette thumbnails; browser console/page errors; failed requests; WebGL context/shader diagnostics; low/medium/high and reduced-motion paths.

The production pass still requires rendered approval. Static structure cannot prove camera framing, silhouette overlap, transparent-slab sorting, or whether the segmented gantry reads as one continuous curve. If a visual gate fails, tune geometry/material/camera evidence; do not weaken the verifier.
