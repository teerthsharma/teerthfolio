# Polar station mechanism layer — Main integration packet

Status: isolated and verified. Do not wire until Main releases the scene files.

## Runtime contract

`PolarStationMechanismLayer` reads canonical traversal XZ from `traversalPoseRef` and mounts no more than one mechanism family:

- northeast: S2, Aether, Field, QPU;
- southwest: Upstream, Topology, Assembly;
- Plaque or outside every station's authored far radius: no family;
- safe mode or offscreen: no family.

A family swap first fades the current root through the still-mounted base monument silhouette, then mounts the next family. The two families never overlap. Selection runs in one allocation-free `useFrame`; the one mounted family owns the only mechanism simulation `useFrame`.

Maximum incremental render cost is 12 draws / 3 programs / 0 textures at high or medium, 4 / 2 / 0 at low, and 0 / 0 / 0 in safe mode.

## Scene wiring

Add `liveSummary` and `projects` to the `IglooScene` props passed by `IglooWorld`. Create the caller-owned mechanism, ritual, and evidence refs/callback at the scene/world boundary. Mount after `IglooArtifacts` and before `RetroCinematicPostProcess`:

```jsx
<PolarStationMechanismLayer
  traversalPoseRef={traversalPoseRef}
  activeArtifactId={activeArtifact.id}
  quality={quality}
  reducedMotion={reducedMotion}
  safeMode={!renderEnabled}
  visible={worldActive}
  liveSummary={liveSummary}
  projects={projects}
  mechanismStateRef={mechanismStateRef}
  ritualStateRef={ritualStateRef}
  onEvidenceReady={handleMechanismEvidenceReady}
/>
```

The layer passes `liveSummary` unchanged to the Upstream mechanism, preserving `live-github` versus `research-snapshot`. It derives the Topology barcode and Assembly evidence list only from the supplied `projects`; it invents no repositories, categories, or URLs. `onEvidenceReady` is rejected unless the selected station's existing physical state machine reports `evidenceReady === true`.

After integration, add `node scripts/check-polar-station-mechanism-layer.mjs` to the build gate.

## Generic base motion to disable

Keep every distant monument's `physical-station-subject`, `StationGridPedestal`, `StationSurfaceMaterial`, stream reveal, pointer focus, and evidence affordance.

For the seven mechanism station IDs, disable these generic motions in `IglooArtifacts.jsx`:

1. Remove or gate every `StationInteractionRig`. Its arbitrary spin/pulse duplicates the deterministic mechanism motions for S2, Aether, Field, QPU, and Upstream.
2. Stop `ArtifactMesh`'s perpetual sine bob for the seven mechanism station groups. Keep reveal lift and fixed authored Y.
3. Stop `ArtifactMesh`'s perpetual `rotation.y += ...` for the seven mechanism station groups. Keep a fixed authored yaw.

Topology and Assembly have no `StationInteractionRig`, but their parent bob/yaw still must stop. Do not remove the base geometry: it is the distant silhouette and the visual bridge during family handoff.
