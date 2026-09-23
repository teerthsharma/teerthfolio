<h1 align="center">Seal's Topology Land</h1>

<p align="center">
  <b>A Bruno-Simon-style portfolio game</b><br/>
  <i>Invented by <a href="https://teerthsharma.github.io/">Teerth Sharma</a> · teerths57@gmail.com</i>
</p>

A seal slides around an ice island. Every building and landmark on it is one
of Teerth's projects; the Igloo in the middle is how to get in touch. Sliding up to one opens
its panel. Built with Next.js App Router, React Three Fiber and Drei.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run check    # layout + motion assertions (lib/world), no browser
npm run build    # next build
```

Screenshot the running site in real Chrome (Playwright's bundled Chromium
has no GPU on this machine and renders WebGL in software):

```bash
node scripts/shot.mjs --url "http://localhost:3000/?spawn=aether" --out verification/shot.png
```

Flags: `--w`/`--h` for a viewport size, `--keys "KeyW:800,KeyD:400"` to hold
keys in order, `--click "Projects"` to click a button or link by accessible
name, `--start` to dismiss the intro, `--wait` to pad before capture.

URL params the game itself reads:

| Param | Effect |
| --- | --- |
| `?spawn=<place id>` | start the seal parked at that building's dock, intro skipped |
| `?play` | skip the intro card |
| `?zoom=<factor>` | scale the camera distance, for close-up captures |

## Layout

```
lib/world/places.js        PLACES data: every building's id, position, radius, copy, links
lib/world/motion.js        pure XZ physics — collisions, the island rim, props
lib/world/store.js         shared React + per-frame state (useUi, live)
components/world/          the scene: Island, Seal, CameraRig, Hud, SealGame (page shell)
components/world/buildings/  one file per place (building or landmark)
```

**One file per place.** `components/world/buildings/index.js` maps each
`place.id` to its component; `Scene.jsx` places it at `[place.x, 0, place.z]`
inside an error boundary. `Placeholder.jsx` is the box every new building
starts from.

## Add a place

1. Add an entry to `PLACES` in `lib/world/places.js` — id, name, kind, tier
   ("building", 4-9 m tall, or "landmark", 2-5 m), color,
   x/z, radius, hook, proof, body, links. `npm run check` fails if it
   overlaps a neighbour, hangs off the island, or its dock is unreachable.
2. Copy `components/world/buildings/Placeholder.jsx` to
   `<Name>.jsx` and wire it into `components/world/buildings/index.js` by id.
   Local space: origin is the footprint centre on the snow, `+z` faces the
   camera and the dock.
3. `npm run check`, then `node scripts/shot.mjs --url "http://localhost:3000/?spawn=<id>"` and look at the PNG.

## Legacy

`components/*.jsx` and `lib/*.js` at the top level (not under `world/`) are
the previous, unused version — tagged `legacy/polar-observatory`.
