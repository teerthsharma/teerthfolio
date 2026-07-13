# Polar biome compositor — Main integration handoff

The isolated compositor implements the approved eight-zone field system without modifying the current scene, traversal, terrain, mascot, monuments, postprocess, or package scripts.

## Mount API

```jsx
import PolarBiomeWorld from "./PolarBiomeWorld";

<PolarBiomeWorld
  axisX={renderPose.x}
  depthZ={renderPose.z}
  travelerRef={traversalRenderPoseRef}
  quality={quality}
  reducedMotion={reducedMotion}
  safeMode={rendererMode === "safe"}
  simulationPaused={!worldVisible || documentHidden}
  visible={worldVisible}
  onBiomeChange={handleVisualBiomeChange}
/>
```

- `travelerRef.current` may expose `{x,z}` and takes precedence over scalar props. It lets the shader track the per-frame canonical render pose without React state churn.
- `axisX` and `depthZ` are the scalar fallback. They are canonical world units. Do not apply `STATION_DEPTH_SCALE`, wrapping, or a visual-home offset.
- `onBiomeChange` fires only when the nearest visual field changes. It reports `{id, proximity, secondaryId}` and must not activate evidence before traversal docks.
- `visible={false}` and `safeMode={true}` unmount the GPU stage so its geometries and materials dispose. `simulationPaused` freezes time without unmounting, avoiding resume fast-forward.

## Scene order

Mount the compositor behind the monuments and seal but before postprocessing. It owns the recyclable floor, sky, and nearest local geography. Do not leave a second opaque terrain floor or generic sky mounted beneath it; transition those systems explicitly to avoid z-fighting and doubled draw cost.

The nearest local geography changes only when the nearest station changes. The two field weights, color, light, fog, and singular weather owner update from the render pose every frame without React state or per-frame object allocation.

## Resource contract

| Mode | Terrain | Sky | Local geography | Draws | Programs | Textures | Weather |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| High | 96×96 segments | 48×24 | 32 instances | 3 | 2 | 0 | nearest only |
| Medium | 64×64 | 32×16 | 24 instances | 3 | 2 | 0 | nearest only |
| Low | 32×32 | 24×12 | off | 2 | 2 | 0 | off |
| Reduced motion | selected quality | selected quality | static | same | 2 | 0 | off; time frozen |
| Safe / invisible | unmounted | unmounted | unmounted | 0 | 0 | 0 | off |

Terrain is a one-instance `THREE.InstancedMesh`; local geography is another `THREE.InstancedMesh`. Both share the solid program. The sky owns the second program. This avoids the hidden third Three.js program that would result from mixing a regular terrain mesh with an instanced geography mesh.

## Verification commands

```powershell
node scripts/check-polar-biome-world.mjs
node scripts/verify-polar-biome-shader-compile.mjs
npx eslint components/PolarBiomeWorld.jsx lib/polar-biome-fields.js scripts/check-polar-biome-world.mjs scripts/verify-polar-biome-shader-compile.mjs
```

The WebGL verifier compiles and links the actual shared shader source in Chromium for both runtime variants: `solid-instanced` and `sky`.
