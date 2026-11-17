# Backgrounds: the kit that paints the set

`lib/anime/kit/bg/` fills a frame from far to near the way an anime background studio does: a sky with weight, air that thickens with distance, a city whose faces were painted (windows, signs, pipes, grime, a dark foot), a ground with wear, an interior with pools of light, silhouette rows, and a foreground that frames the shot. One call per element. Everything is a static set (baked per shot), so it may be heavy; the light version is the same picture with the expensive parts thinned (see Tiers).

```js
import { bg } from "../../kit/bg/index.js";   // from a cutscene's world/index.js
```

## 1. The look: one light for everything (call this first)

```js
const look = bg.look(ctx, {
  light: { dir: [0.35, 0.7, 0.6], col: "#ffb48a" },     // the key; written to engine.shared, so the cast is lit by it too; restored on look.dispose()
  shade: "#5a2a52",                                      // the cool authored shadow colour every kit surface multiplies its albedo by
  amb: "#7a2a48",                                        // sky bounce
  bands: [3, 0.05],                                      // how many painted tones the light is cut into, and edge softness
  base: { dark: 0.6, h: 9, grime: 0.5 },                 // the dark dirty foot: darkness 0..1 over h metres, grime-streak share
  haze: { col: "#4a1020", k: 0.0052, start: 14, h: 34, amt: 0.95 },   // aerial perspective: pales to col with distance, pooled low (h)
  rim: { dir: [0, 0.25, -1], col: "#ff5a30", k: 1.2 },   // a coloured edge light from behind
  pools: [{ at: [0, 3, -36], col: "#ff3a18", r: 34 }],   // up to 4 pools of light that fall off across every surface; look.pool(i, {...}) moves one
});
```

The look is the nuance: value design (the foot is dark, the top catches light, the far is pale), a light with a direction and a colour, a rim from behind, pools that make a focal area. Pass the same `look` to every kit call and the frame holds one colour harmony. `look.dispose()` in your world's `dispose`.

## 2. The calls

| call | what it makes |
|---|---|
| `bg.sky(ctx, preset, { az, el, ppr, sun, cover, scale, focus, flash, colors })` | a baked dome. Presets `day dusk night storm void domain` (the red domain: smoke masses, lightning veins that recede into black, embers). `az` is the window of the circle the shots can see (0 looks down -z, + toward +x): spend the texels there (`ppr` 420 default, 640 to 900 for a close shot) |
| `bg.city(ctx, look, { avenue: { half, z0, z1, hMin, hMax, rows }, blocks: [{x,z,w,d,h}], paint: { wall0, wall1, trim, litA, litB, litC, sign0, sign1, sign2, sky0, sky1, night, lit, signs, bay }, seed, ink })` | blocks along an avenue, each face painted by one facade shader: punched, ribbon, curtain-glass and balcony window styles; lit and dark floors; glass that reflects `sky0 -> sky1` with a diagonal sheen; sills, lintels, cornice, corner pilasters, pipes, AC units; vertical signs that glow and spill light on the wall; a lit shopfront with an awning at the foot; roofs with parapets and red aviation lights; setback crowns, tanks and antennas on tall blocks. `night` 0 (all glass reflects) to 1 (lit panes, glowing signs); `bay` scales window and floor size to your world's scale. Returns `{ group, specs }` |
| `bg.ground(ctx, look, { kind, size, puddles, scale, palette, road })` | `asphalt grass sand snow paving`. Asphalt: wear, patches, cracks, lane lines, kerbs, a zebra crossing (`road: { half, zebra: [z0, z1], stripe }`), puddles that mirror the look's pools (`puddles` 0..1) |
| `bg.water(ctx, look, { colors, scale, height, speed, glint })` | depth ramp, sky reflection through wave normals, banded glints, foam |
| `bg.stone(ctx, look, geo, { block: [w, h], chip, crack, moss, gloss, colors })`, `bg.wood(ctx, look, geo, { plank, grain, gloss, colors })` | masonry or flagstones (running bond, chipped edges, per-block value, cracks, damp foot, moss) or planks, on ANY geometry |
| `bg.room(ctx, look, { kind: "hall" \| "classroom", w, d, h, glow, lamps, stone, plaster, wood })` | a painted interior with lamps placed as the look's pools: a stone nave with columns, or a plaster classroom with a wainscot, plank floor, glowing window wall, board and desks |
| `bg.rank(ctx, look, kind, { k, at, size, w, h, dark, mid, rim, glow, density, lit, seed })` | a far row as a baked card, pulled toward the haze colour by `k` (0 near, 1 lost in the air): `skyline crowd pines rooftops mountains ruins shrine`. Stack two or three ranks with rising `k` |
| `bg.foreground(ctx, look, [{ shot, kind, side, size, dist }])` | a dark near piece at the edge of a named shot: `leaves branch rubble pillar cables ribs`, `side` `tl tr bl br l r t b`. Returns `{ group, update(t, dt, cue) }`: add the group to the world and call `update` |
| `bg.paintOver(root, look, { grit, brush, foot, footH, gradient, pools, cards, mode })` | repaints an existing set without changing a vertex or a draw call: grit and posterised brush on uber-material pieces, a dark foot (or haze, `mode: "haze"`), a top-lit gradient on the vertex colours of tall pieces, the look's first two pools as local glow lights, and the baked window cards swapped for the facade shader. `refresh()` re-reads the pools |
| `await bg.pick(need, text)` / `await bg.shader(pull)` | the 2,004-shader table by need (`sky water ground interior city atmosphere foreground light`) and by name; lazy |

Materials built by the kit are ordinary ShaderMaterials with the set id in alpha (`0.5`), so the plate bake, the haze and the line pass treat them as set. `bg.inkable(geo)` gives any geometry the attributes `engine.ink(mesh, w)` reads, for an outline.

## 3. Staging rules the kit assumes

- Light the frame once (`bg.look`) and pass it everywhere. A piece lit by its own hand breaks the harmony.
- Stack the far: sky, two or three `rank`s with rising `k`, then the city, then the ground, then a foreground piece at the edge. A frame with five of these reads as five layers.
- One focal pool (`pools[0]`) where the story is, brighter than the rest; the haze and the foot keep everything else down.
- The foot is dark and dirty, the top catches light: leave `base` on.
- Sky texels: set `az` to the shots' window; a full circle at 420 ppr is 2,700 px wide.
- The kit never edits `components/`, the island or the seal. `look.light` writes `engine.shared.uLightDir/uLightCol`; the world's `dispose` calls `look.dispose()` to restore them.

## 4. Tiers and cost

Everything in the kit is set (layer 0), baked once per shot, and identical at every tier. Tier 3 and above may add `bg.air`-style live overlays (none required). Measured cost per tier is in `.oneshot/engine/WOW-backgrounds.md`.

## 5. Shader table

The kit is also in the table: the `bg` pack (`await loadPack("bg")`) lists 21 tools (the painter's functions, the six sky presets, the seven silhouette cards and more) with demos. `docs/shaders/backgrounds.md` files 282 real tools from the other packs by background need. `lib/anime/kit/bg/bg.check.mjs` compiles every kit shader without a GPU.

## Third pass: the set paints inside the value budget (2026-11-15)

- The photography owns how dark the set goes (`look.photo.value`); the kit paints structure (foot, haze by distance, a rim, one pool bound to the seal) and never darkens on its own. A broad bright surface the kit paints is held to the body cap (0.5) by the photography whatever its value, so a wall painted white no longer outshines the face.
- A hard-edged dark silhouette at mid depth is what makes a set read as a place: the `_key` lab paints a roofed shrine into its sky plate (three eaves with lifted corners, side halls, a finial, a red glow behind it, a thin lit top edge); copy `shrine()` from `lib/anime/cutscenes/_key/build.js`, or use `bg.rank(ctx, look, "shrine" | "ruins" | "skyline", ...)`.
