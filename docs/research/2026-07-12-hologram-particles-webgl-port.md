# Hologram Particles → teerthfolio WebGL Port Record

## Source and permission

- Local study source: `donotcommit/hologram-particles`
- Upstream author/repository: `cortiz2894/hologram-particles`
- Upstream concept credit: Igloo Inc.
- The user states that the author granted permission to use the implementation and that the repository is open source.
- The checked-out study does not include a standalone license file. This rescue therefore keeps explicit attribution, copies no GLB assets, and ports mathematical/interaction concepts into original code rather than pasting the WebGPU/TSL implementation.

## Compatibility boundary

The donor targets Three.js r182, WebGPU, TSL nodes, storage buffers, and compute dispatch. teerthfolio targets Three.js r178 through React Three Fiber and WebGL. TSL node graphs, WebGPU storage buffers, compute kernels, renderer setup, and GLB assets cannot be copied directly.

The bounded WebGL adaptation in `lib/polar-semantic-particles.js` and `components/PolarSemanticParticles.jsx` transfers these behaviors:

1. deterministic surface-biased distribution;
2. per-particle local offsets, velocities, seeds, and station identity;
3. traveler-distance pusher;
4. near-critical analytic return envelope;
5. three-octave low-pass fractal displacement at gain `0.35`;
6. wrapped diffuse sprite lighting;
7. displacement glow;
8. Fresnel edge containment;
9. quality-tier counts and a static reduced-motion state;
10. bounded ellipsoid containment and a deform → morph → reform station handoff;
11. dual sprite/surface normal lighting;
12. one shared draw/program across all eight station languages.

## Donor feature coverage map

| Donor system | Production adaptation | Boundary |
| --- | --- | --- |
| GLB `MeshSurfaceSampler` | deterministic, surface-biased sampling over station-authored parametric bounds and the shared dome lattice | No donor GLB is copied. Dome cells become the authoritative sampling surface after Wave D. |
| WebGPU storage buffers | immutable WebGL `BufferAttribute` streams for center, local point, bounds, color, seed, velocity, station, and behavior | Counts are intentionally bounded at 96/224/448 rather than 60k. |
| TSL compute dispatch | vertex-shader procedural motion with one shared draw | Stateful per-particle compute is replaced by analytic motion and a uniform spring envelope. |
| Dual source/current normals | blended point-sprite and parametric surface normals | Used for readable soft volume without a normal texture. |
| Wrapped diffuse | wrapped key-light term in the semantic particle fragment shader and dome crystal shader | Maintains anime-soft light on back-facing/edge regions. |
| Fractal noise displacement | three/four octave low-pass FBM with gain `0.35` | High-frequency noise is subordinate to macro form. |
| Cursor/pusher | canonical traveler-XZ Gaussian pusher | The seal, not an arbitrary cursor, supplies meaningful world interaction. Dome bricks keep their own bounded pointer hover because they are directly inspectable architecture. |
| Spring-damper return | near-critical impulse-age envelope plus the dome's weighted near-critical spring | No accumulating CPU particle simulation or second traversal filter. |
| Displacement glow | pusher/morph glow varied into the shared optical pass | Remains bounded and local; no global bloom wash. |
| Camera spring | existing `CameraRig` frame-rate-independent position/look damping | Kept in the single camera authority rather than duplicated in particles. |
| Deform → morph → reform | station-change `uMorphPhase` sine envelope | Disabled under reduced motion. |
| Cylinder Fresnel/collision | ellipsoid containment plus Fresnel sprite edge | Station volumes stay bounded; no leaking cloud across the map. |
| Rings and reference grid | authored station mechanisms, route network, halo, and lattice ribs | Existing world semantics own these shapes; particles do not add generic rings. |
| Bloom/bright-pass | existing bounded pointer bright-pass in `RetroCinematicPostProcess` | Reused instead of introducing a second compositor. |
| Debug modes/controls | low/medium/high, reduced motion, safe mode, DOM diagnostics, kill switches | Production-safe and verifier-readable. |

## Semantic station map

| Station | Particle meaning |
| --- | --- |
| Plaque | frost-memory motes settling over the observatory |
| S2 | interrupted state sparks closing inward |
| Aether | circulating phase beads |
| Field | compressed flux dust |
| QPU | coherence packets crossing paired endpoints |
| Upstream | directional source pulses |
| Topology | relational trace points |
| Assembly | inspection/proof fragments |

This is deliberately not a universal snow or confetti layer. Distance and active-station state reveal only the local field, so the particles strengthen one place without making the whole map visible.
