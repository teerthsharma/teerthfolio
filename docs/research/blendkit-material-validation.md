# BlendKit Material Validation

Date: 2026-07-01

## Candidate

- Candidate id: `blendkit-material-d8b9892d`
- Provided asset base id: `d8b9892d-0f4b-493f-8f69-e072d3353b24`
- User intent: use the material as the igloo/PBR material reference.

## Rubric

- [x] Identify whether the public page gives a direct asset payload that can be safely checked into the site.
- [x] Identify whether the material can be represented without runtime third-party fetches.
- [x] Avoid copying proprietary reference-site assets.
- [x] Keep the site free-hostable and deterministic on Vercel.
- [x] Record the exact asset id for later replacement if the user downloads it through the BlenderKit add-on.

## Assessment

The public acquisition page points to BlenderKit add-on access rather than a stable direct web texture payload. BlenderKit documents that it serves PBR materials and has RF/CC0 license classes, but the exact material-license confirmation is normally exposed in the asset interface/add-on. For this frontend pass, the site does not ship downloaded BlenderKit binary files.

Implementation uses a procedural local PBR approximation: generated roughness and normal maps, clearcoat, transmission, thickness, and ceramic/ice color response. The asset id is recorded in `components/PolarObservatoryDome.jsx` as the visual reference.

Disposition: `deferred` for shipping the exact external asset; `accepted` for procedural PBR implementation.
