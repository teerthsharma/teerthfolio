# Seal's Topology Land

Teerth Sharma's portfolio is a WebGL-first polar research world: a dark Antarctic observatory, a WASD-piloted seal mascot, topology stations, live GitHub radar, and source-backed project evidence.

The site is built to stay Vercel-hostable while still feeling like an object-world rather than a normal resume page. The first screen gates the heavy renderer, then the user can enter the world and move through stations for Seal OS, Aether-Lang, fixed-point field physics, QPU verification, upstream work, topology archives, and systems tooling.

## Direction

- Igloo/Active Theory style: cinematic object-world, dark shader atmosphere, PBR material language, minimal interface.
- Bruno Simon style: WASD exploration through a world instead of page-only scrolling.
- Junni style: mascot as guide, not decoration.
- Wodniack/Rogier/Gregory style: dense technical archive and sparse project indexing.

## Current Interaction Contract

- `Start exploring` enables the WebGL renderer.
- `W`, `A`, `S`, `D` are the only seal movement controls.
- Arrow keys do not move the seal; they show a WASD hint.
- Mouse input does not steer the seal.
- The station rail is a passive readout. The active station follows the seal's axis position.
- Graphics quality can be switched between low, medium, and high.
- `?safe=1` boots a basic safe page first, then probes the GPU renderer and prints diagnostics.
- `?qa-sdf=1` forces the render gate open for verification.

## Stack

- Next.js App Router
- React 19
- Three.js and React Three Fiber
- Drei
- Howler
- Local JSON research corpus and live GitHub fallback logic
- PBR texture assets under `public/assets/pbr`

## Important Paths

| Path | Purpose |
| --- | --- |
| `app/` | Next.js pages and global CSS |
| `components/IglooWorld.jsx` | Top-level render gate, input model, safe mode, station state |
| `components/IglooScene.jsx` | WebGL scene orchestration |
| `components/IglooDome.jsx` | Antarctic observatory dome |
| `components/SealAvatar.jsx` | Seal guide mascot |
| `components/IglooTerrain.jsx` | Repeating polar floor and terrain window |
| `components/IglooArtifacts.jsx` | Project station objects |
| `data/teerth-content.json` | Profile, live copy, station copy, links |
| `data/project-intelligence.json` | Mined Teerth GitHub corpus |
| `lib/github-live.js` | Live GitHub summary with snapshot fallback |
| `public/assets/pbr/` | Ground, dome, and seal material textures |
| `scripts/check-teerth.mjs` | Teerth content and contract checks |
| `scripts/check-render-budget.mjs` | Render budget guardrails |

## Local Development

```bash
npm install
npm run dev -- -H 127.0.0.1 -p 5173
```

Open:

```txt
http://127.0.0.1:5173
```

Useful debug URLs:

```txt
http://127.0.0.1:5173/?safe=1
http://127.0.0.1:5173/?qa-sdf=1
http://127.0.0.1:5173/?qa-low=1&qa-sdf=1
```

## Checks

```bash
npm run lint
npm run check:teerth
npm run check:render-budget
npm run build
```

`npm run build` runs the Teerth contract and render-budget checks before `next build`.

## Deployment

This repository is ready for Vercel through GitHub. The GitHub workflows live in `.github/workflows`.

Required GitHub Actions secrets for automated Vercel deploys:

```txt
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
```

If those secrets are missing, CI can still pass while deploy is skipped.

## Asset Notes

The PBR textures in `public/assets/pbr` are committed because the dome, floor, and seal material language depends on them. Generated build folders, logs, local uploads, and verification screenshots are ignored.

## Performance Rules

- Keep world rendering bounded around the current axis position.
- Do not allocate infinite geometry for the open world.
- Prefer repeated chunks and instanced/simple geometry over large unique meshes.
- Keep safe mode cheap enough to mount before probing WebGL.
- Treat WASD input as the only seal movement source.
