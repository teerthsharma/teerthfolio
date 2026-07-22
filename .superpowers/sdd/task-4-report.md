# Task 4 Report — Northeast Monument Rebuild

## Status

Production implementation complete. Execution is intentionally deferred to Wave E per the active rescue sequence: no Node server, static check, lint, build, browser session, or screenshot capture was started in this task.

## Files owned and changed

- `components/PolarStationMechanismsNE.jsx`
- `lib/polar-station-mechanisms.js`
- `scripts/check-polar-station-mechanisms-ne.mjs`
- `.superpowers/sdd/task-4-report.md`

## Physical rebuild

- **S2 Kernel Core:** replaced the small shell/box composition with a grounded cobalt kernel citadel. Its merged frame has a double plinth, twin architectural arches, buttresses, crown, and central support. Two smooth partial-sphere shells carry their own ribs and real state-plane thickness. Proximity closes those weighted shells inward; docking aligns the proof state and raises the interrupt light.
- **Aether:** replaced nested flat rings with a translucent violet sanctuary. Crossed pavilion arches and a real plinth frame three non-planar Catmull-Rom tube manifolds. Seven phase jewels circulate through the persistent cycle. It shares S2's contained-core/frame grammar but inverts the topology by expanding and circulating outward.
- **Field:** replaced opposed torus primitives with an amber/mint containment chamber. Four bowed tube ribs, two elliptical compression rings, crown and foundation contain two actual 4.25-turn helical coils. Signed arrival current compresses the helices and strengthens the bounded flux skin; four directional packets keep the field state legible.
- **QPU:** replaced plates/poles with a traversable coherence causeway. Two thick jade endpoint sanctums, curved twin rails, piers and under-girder establish architecture before the five beveled coherence plates rise. A shared capsule-conduit pool renders five nodes plus one finite verification beam.

## High-finish and shader work

- All twelve high/medium draws are instanced pools: three distinct pools per monument. Low quality retains one compound frame per monument (four draws); safe mode retains zero.
- Geometry is procedural and texture-free. Curved silhouettes use smooth sphere, tube, rounded-box, cylinder and torus components baked into bounded merged geometries. Signals, jewels and packets provide instanced micro-detail without generic particle fields.
- One shared `MeshStandardMaterial` shader contract adds donor-inspired gain-`0.35` low-pass macro structure, wrapped diffuse fill and restrained Fresnel containment. Materials vary through uniforms rather than separate shader programs.
- Cobalt ceramic-metal, violet glass-metal, mint containment metal, amber coils, jade support, cyan ice and warm proof lights have separate metalness/roughness/emissive responses rather than hue-only variation.
- Every foundation reaches the ground and high/medium architectural surfaces cast or receive contact shadows.

## State authority

`lib/polar-station-mechanisms.js` remains the deterministic fixed-step authority. It now exposes frozen `NE_MONUMENT_CONTRACTS` plus bounded render-facing values:

- `shellClosure`
- `circulationPhase` / `sanctuaryBloom`
- `compression` / `fluxSkin`
- `sanctumPulse`

These values derive only from canonical traversal proximity, velocity, route progress and dock state. Existing evidence readiness, ritual output, reduced-motion behavior and safe state remain intact.

## Deferred Wave E proof

The checker was upgraded before production code to reject the old primitive names, thin debug-line silhouettes, hue-only contracts, fewer than three unique geometry pools, and missing high-finish shader/contact tokens. Wave E must execute:

1. `node scripts/check-polar-station-mechanisms-ne.mjs`
2. `node scripts/verify-polar-station-mechanisms.mjs` with the four NE station ids
3. lint and clean production build
4. HUD-hidden and grayscale settled/interaction captures for S2, Aether, Field and QPU at low/medium/high
5. renderer program/draw/texture telemetry and reduced-motion/safe-mode traces

## Risks requiring rendered inspection

- The custom `onBeforeCompile` surface patch and merged non-indexed geometry are code-reviewed but deliberately not compiled yet; Wave E must catch a shader-chunk or merge incompatibility.
- Camera framing and overlap with the smaller legacy `IglooArtifacts` core subjects need HUD-hidden still-frame review. The new compound frames are sized to dominate and reinterpret those cores, but this cannot be approved from source alone.
- Transparent Aether depth ordering, QPU rail/plate alignment, S2 shell seam spacing and Field coil contact require desktop/mobile screenshots before any award-quality claim.
- Real program count may be below the declared ceiling of three; it must never exceed the ceiling.
