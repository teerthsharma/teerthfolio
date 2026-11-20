# Photography (the engine's director of photography)

Every cutscene is lit. With no data at all the engine runs the `auto` rig: a key from the scene light, a rim whose colour is taken from what is behind the seal, fill and bounce taken from the colours above and below it, one focal pool of value, a little glow and dust. A dock asks for a mood, or tunes any part of one, in `scene.js`:

```js
look: { photo: "night-red" }                                        // a named mood
look: { photo: { preset: "night-red", rim: { amt: 1.8 },            // a mood, then your keys over it
  shots: [{ t: [9.1, 12], value: { darks: 0.12 }, glow: { amt: 0.8 } }],     // per-shot override, by clock window
  beats: [{ t: 9.7, dur: 0.3, flash: 1, col: "#ffd8c8" }] } }          // a flash that blooms, on a beat
look: { photo: false }                                              // off (the pre-photography frame)
```

Moods: `auto` (default), `night-red` (a domain: black masses, red veins, embers), `noon-desert`, `blue-void`, `storm`, `none`. A mood is complete; your keys are merged over it one level deep, arrays replace. Lab: `&photo=<mood>` on `_key`, engine switch `off=photo` to ablate everywhere.

## The rig, key by key (defaults in `lib/anime/render/photo-presets.js`)

Directions are in VIEW space (x right, y up, z toward the lens), so a mood works from any camera; `space: "world"` makes them world directions. A direction points from the subject toward the light.

| key | fields | what it does |
|---|---|---|
| `key` | `dir` (null = the scene's `uLightDir`), `col`, `amt`, `hard` 0..1, `reach` m, `contact` 0..1, `sync` | the hard terminator, and a screen-space contact-shadow march along the key (the brow shadows the eye, the nose the cheek, the hair the forehead, a pillar the floor). `sync: true` also drives `engine.shared.uLightDir` and the material rim so the cel shading and the cast shadow agree with the photography |
| `rim`, `rim2` | `dir`, `col` or `"auto"`, `amt`, `w` px at 1080, `gain` | a coloured edge light on the silhouette facing `dir`, a gradient `w` px wide. `"auto"` = the colour of the set behind the seal, lifted to a visible value. The rim is capped by the hero luma law (0.92) |
| `fill`, `bounce` | `col` or `"auto"`, `amt` | sky colour into the shadow side; ground colour into the underside |
| `shadow` | `col`, `amt` | what the unlit side multiplies to (a saturated colour, never black) |
| `value` | `darks` 0..1, `hero` 0..1, `contrast`, `vig`, `r`, `at` | the value pattern: everything but emissive pixels is multiplied toward `darks` away from one focal pool of radius `r` (frame heights) round the hero (or `at: [u, v]`); `hero` is the share of that the seal takes (0 keeps it fully lit); `contrast` an S-curve on the set |
| `halo` | `col`, `amt`, `r` | light behind the hero, added to the set only |
| `haze` | `col` or `"auto"`, `k`, `start`, `max`, `sky` | depth haze in a colour, over the whole composite (layer 1 included) |
| `mist` | `col`, `y`, `h`, `amt`, `scale`, `wind`, `speed` | a floor of mist: height fog below `y` + `h` metres with a drifting noise field, lit by the key |
| `motes` | `col`, `amt`, `n`, `size`, `rise` (negative falls) | embers, dust or snow in three depth layers, hidden where nearer geometry stands (the hero occludes the far ones, the near layer is bokeh) |
| `shafts` | `col`, `amt`, `at: [u, v]` | god rays from a point (default above the hero), occluded by depth |
| `glow` | `thr`, `amt`, `col`, `wide` | halation: everything above `thr` bleeds over three scales, tinted; the seal takes 22% of it |
| `dof` | `amt` | auto depth of field focused on the hero when the shot sets none |
| `paint` | `grain`, `hatch`, `hatchCol` | brushed grain on the set; manga hatching in its deep shadow |
| `grade` | `exposure`, `sat`, `contrast`, `sh`, `mid`, `hi`, `tone`, `harmony: { hues: [deg...], amt, hero }` | the colour script: three-way tint and a harmony that pulls every hue toward the nearest of 2 to 4 hues (the seal keeps `hero` of it) |
| `hit` | `flash`, `ca`, `blow`, `col` | the lens answers a hit: a flash that blooms, a chromatic split of `ca` px, a blown frame. Driven by the `shake` beat's amplitude, `impact` frames and `photo.beats`, no extra data |

## Tiers

Tier 0 and 1: no contact shadows, no hatching, two mote layers, a three-level glow. Tier 2: contact shadows at 12 steps, shafts at 14 taps, hatch, three mote layers. Tier 3 and 4: 20 steps, 24-tap shafts. The look holds at tier 1: the rim, the value pattern, haze, mist, halo, grade and the hit response are tier-free.

## What to do in a dock

1. Pick the mood nearest the moment. Do not write GLSL for light.
2. Keep sets dark and let the value pattern work: a plate painted at full brightness fights it. A hot thing (a vein, a lantern, the sun) is written above 1.0 so it glows and escapes the darkening.
3. Put the key where the story's light is (`key.dir`, `sync: true`) and the rim on the side the opposing light comes from. One warm and one cool light is the cheapest way to look expensive.
4. Do not apply `frame.haze` on top of a kit set that paints its own aerial perspective; `photo.haze` is separate and can be `amt` 0.

## Second pass additions (2026-11-15)

- `veins`: `{ col, amt, n, flow, speed }`. Ridged noise in polar flow round the hero, jagged by a warp, drawn on the set above 1.0 so halation takes it. `night-red` 0.9, `blue-void` 0.7, `storm` 0.5, others 0. Tier 1 drops the warp.
- `hero`: `{ cap, floor, floorAmt, tint, desat }`. The seal's own value shaping: highlights shoulder above `cap`, darks lifted toward a coloured `floor` along the key (fold light), highlights tinted by the key and desaturated by `desat` (a grey face, a navy coat).
- `rim` is weighted by the edge normal and a slow noise along the edge, so it breaks up and is no longer a sticker outline; `rim2` in `night-red` is violet, the cool counter-colour.
- `grade.harmony.hues: "auto"` is the default: hues pull toward the colour round the hero (0.35, hero 0).
- `auto` now chooses a mood by sampling the probe every 12 frames (`moodFor` in photo-presets.js; two agreeing samples switch it): red gives `night-red`, yellow-orange `noon-gold`, blue `blue-void`, low saturation or bright stays neutral. Auto never turns veins on. An explicit preset or any `look.photo.preset` is never overridden.
- New mood `noon-gold`. Defaults: darks 0.62, vignette 0.38, hatch 0.12, hit flash 0.8 and split 4.

## Third pass: one picture pipeline (2026-11-15)

The photography owns one value budget per shot (`value`: `darks`, `ceil`, `sat`, `lift`, `r`, and now `body`, `thin`). The background kit paints inside it, the effects draw inside it, the grade holds it.

- **Power is thin.** After the set is darkened, a bright set or effect pixel keeps its value only if it is a thin line: the ring 1.3% of the frame height round it is mostly dark (`uThin` in `LIGHT_FS`, 8 taps at tier 2 and up, 4 below). A broad bright body from any layer (a burst blob, a white wall, a field of light, even one written above 1.0) is held to `value.body` (0.5 by default, 0.42 in a hold, 0.6 for flat looks). Veins, slash cores, lanterns and sparks pass. `value: { thin: 0 }` opts out.
- **Effects light the seal.** `shared.uFxRim` (rgb and strength) is written by `scene.cel` (kit/fx/cel.js) and, for a dock with no `scene.cel`, by the framework from each impact and shake beat's light colour. The rim takes that colour and its width follows the effect's strength, not the hero's size; the shaded half takes it as fill.
- **`photo: false` is the value law** (`PRESETS.law`), not black: set pulled down, face lifted, bodies capped; no colour, air, rim, glow, hatch or blur. `photo: "none"` turns every pass off. A style with `fill.flat` of 0.5 or more and no named mood gets `PRESETS.flat` (same budget, no blur, flat colours kept).
- **Night-red is navy and crimson**, not violet: rim 11 px, a crimson second rim, navy fill and floor, so the coat reads navy and the edge red.
- **The hold** (`withMenace`) is on by default at the biggest burst; see CONTRACT.md "The hold". It lowers the body cap to 0.42, DoF behind to 0.7, and keeps a floor of the power's rim on the seal.
- Lab switches for a before and after on any dock: `&photo=none` (every pass off), `&bg=off`, `&hold=0` (no default hold), `&menace=1` (every shot a hold).

Before and after, one line of data each: `look: { photo: "night-red" }` takes a dock from the neutral dark rig to a red-key night (rim, navy fill, veins, grade); `bg: "red-domain"` repaints the set (dark foot, lit windows, a pool of light that follows the seal). Pairs: verification/picture/p2/.
