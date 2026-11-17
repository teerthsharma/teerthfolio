> READ FIRST: lib/anime/cutscenes/RULEBOOK.md (keep looking for new shaders; reuse first; log needs).

# Cutscene contract

A cutscene is DATA plus three LAYERS, composed by one build file, played by one framework. Change a file and nothing else breaks.

```
lib/anime/cutscenes/
  framework.js          the player, composeLayers, ctx (this document)
  framework/            director.js (camera law) law.js (frame law) seal.js overlay.js sakuga-api.js plates.js
  index.js              lazy registry: DOCKS, loadCut(id)
  _template/            the stub every dock starts from
  _frame/               lab-only test card: every frame-law feature in one 12 s run (/lab/anime?cut=_frame)
  <dock>/               ONE cutscene. 25 of them.
    scene.js            DIRECTION agent: data only (shots, beats, bubbles, palette, seal track)
    build.js            DIRECTION agent: composeLayers(ctx, { world, cast, fx })
    world/index.js      WORLD agent:  the set, sky, far painted plates          (layer 0)
    cast/index.js       CAST agent:   victims, opponent, props the seal wields  (layer 1)
    fx/index.js         FX agent:     energy, beams, particles, flashes         (layer 1)
```

Lab: `/lab/anime?cut=<dock>&t=<s>` (add `&paused` to hold the frame, `&tier=n`). Each dock loads in its own error boundary; a layer that throws is muted and listed, the rest play.

## Modularity rules (hard)

1. A cutscene lives ONLY in `lib/anime/cutscenes/<dock>/`.
2. It imports only the shared engine (`lib/anime/{tools,kit,sky,post,pup,sdf,paint,kit3d,material,sakuga}`), `../framework.js` and its OWN folder. Never another cutscene.
3. During Build a layer agent writes only inside its own layer folder (`<dock>/world/`, `<dock>/cast/`, `<dock>/fx/`); the DIRECTION agent writes `scene.js` and `build.js`. Shared modules are not edited. A reusable helper goes in your layer folder; Consolidate promotes it.
4. Layers never import each other. They talk through `ctx` and `cue` only.

## Layer entry point

```js
export default function build(ctx) { ...; return { group, update(t, dt, cue), dispose() } }
```

- `group`: a THREE.Group. World is layer 0 (the plate, baked once per shot); cast and fx are layer 1 (redrawn every step). A subtree can override with `obj.userData.layer = 0 | 1` (an animated world object sets 1; a static far glow in fx sets 0).
- Layer 1 holds SOLIDS and OVERLAYS. A solid writes depth and puts its id in alpha: 1 for a character, 0.6 for a set piece (a set id of exactly 0.5, the default of `engine.prop` and `kit/surface.js`, is drawn at 0.75 on layer 1; an id below 0.5 does not show there). An overlay (light, glow, anything see-through) writes no depth and outputs premultiplied colour: `vec4(rgb * a, a)` with normal blending, or `vec4(rgb, 0)` with additive blending and `premultipliedAlpha: true`. Overlays are composited over the inked, photographed frame, so an overlay in front of a character covers its lines and colour by the overlay's alpha. Three's default additive (not premultiplied, opacity written to alpha) is not this contract and stays on the old path: the character's lines print over it and the set never hides it.
- An overlay lies over the whole plate and behind whatever cast is nearer than it (a veil). With `userData.plateDepth = true` on it or on any parent group it is in the world: set geometry nearer than it hides it. The kit's beam, bolt, slash, flame, sigil, echoes and smear set this themselves; pass `plateDepth: false` to keep one drawn over the set on purpose.
- A veil meant to sit behind the hero must be placed behind the hero in depth (farther from the lens); a veil in front of the hero covers it.
- `update(t, dt, cue)`: `t` is THIS LAYER'S stepped time, `floor(t fps + 1e-6)/fps` (twos or threes): animate characters and fx from it. Inside a `ones` window that names the layer it steps at 24; inside a `freeze` window that names it, it holds (see Frame law, Clock). `cue.t` is the display-rate clock (use it only for things that must stay smooth, such as a camera-facing billboard). `dt` is real seconds.
- `dispose()`: free geometry, materials, render targets.
- No shader programs may link during playback (F3): build every material inside `build(ctx)`. Reuse `engine.figure`, `engine.prop` and the shared tools so programs are shared.

## ctx fields

| field | what |
|---|---|
| `THREE` | the three namespace |
| `engine` | the `AnimeEngine`: `figure(geo, o)`, `prop(geo, id)`, `ink(mesh)`, `syncFaces(root)`, `shared` (uniforms), `renderer`, `composer`, `impact`, `trauma`, `sun` (set a Vector3 for light shafts), `tier` |
| `scene` | the scene.js data (read-only) |
| `palette` | `scene.palette` |
| `seal` | the hero seal handle (below) |
| `camera` | the camera-law director: `at(t, aspect)`, `shots`, `shot`, `report()` |
| `tools` | `{ glslFor, tool, TOOLS, uniformsFor }` from `lib/anime/tools` |
| `sakuga` | `impact(t, seq?, cols?)`, `speedLines({ t, dur, kind, at, strength, col, spokes, taper, converge })`, `shock({ t, dur, at, amp, r1 })`, `trauma(a)` |
| `tier` | the engine tier now, 0 to 4 (a getter: the governor may move it during play) |
| `atTier(n)` | true when the engine tier is at least n: the gate for an effect or surround shader that declares tier n (see Tiers) |
| `bake` | `plateLayer(body, o)`, `sky(body, o)`, `card(body, o)`, `painting(body, o)`, `dome(body, o)`: see Plates |
| `kit` | `costumedSeal`, `COSTUMES`, `COSTUME_LAYERS`, `HATS`, `ACCESSORIES`, `WEAPONS`, `REACTIONS`, `VICTIM_POSES`, `defineCostume`, `eyeDecal`, `eyePair`, `setEyeExpression`, `EXPRESSIONS`, `EYE_STYLES`, `faceOnHead`, `hairClumps`, `hairMesh`, `HAIR_PRESETS`, `defineHair`, `groundShadow` |
| `sdf` | `{ cone, ell, paint, painted, polygonize }` (the SDF modeller) |
| `rng(salt)` | a deterministic generator (mulberry32 seeded by `scene.seed`): use it, never `Math.random`, so a scrubbed frame equals a played one |
| `setLayer(obj, n)` | assign a subtree to layer 0 or 1 |
| `step(t)` | `floor(t fps)/fps` |
| `ease` | `{ smooth, ease3 }` |
| `fps` | the character timing (12 twos, 8 threes) |
| `root` | the THREE.Scene (add lights or fog here; the pocket owns its fog and background, never the island's) |
| `aspect()` | frame aspect now |
| `player` | the player (for `player.t`, `player.errors`) |

### The hero seal (`ctx.seal`)

The locked kawaii pup (`pup.js`, `engine-ref/locked-seal.png`), never restyled. `{ group, fig, body, at, yaw, scale, height, chest(out), anchors(), setPose(name, k), attach(obj, layer=1), update }`. `attach` parents a costume part to the seal's body so it moves with the pose; it never edits the pup mesh. Poses: `idle sign fist raise crouch sit point spin blown blink awe`, driven by `scene.seal.track` and `pose` beats. The seal is never emissive (`uEmit = 0`) and the shared lit-luma cap is 0.92, so it is out of bloom. Nothing may cover it: no prop, bubble or victim between lens and seal (the director also keeps it in frame).

## Cue object (`cue`, passed to every `update`)

`t`, `ts` (the stepped time of the layer being updated: the same value as its `update`'s `t`), `layer` (its name), `dt`, `duration`, `fps`, `aspect`, `shot` (compiled shot), `shotN`, `shotU` (0..1 across the shot, after `ease` and `step`), `law` (`wide|arc|kill|home|free`), `cut` (true on the first frame of a shot), `fired` (beats crossed this frame), `active` (beats whose window holds t), `seal`, `ones` (true inside any `ones` window), `pan` (`{ u, v, zoom }` during a 2D camera move, else null), `tier` (the engine tier).
Methods: `on(name)`, `beat(name)`, `k(name)` (0..1 across the beat's `dur`), `arg(name, key, default)`, `since(name)` (seconds since it last started, Infinity before), `done(name)` (1 once started), `frozen(layer)` (true while a `freeze` window holds that layer), `layerT(layer)` (that layer's stepped time now).

### Beat names

Reserved, handled by the player (a layer may still read them to sync motion). Every beat is `{ t, name, ...fields }`; `t` in seconds. Defaults in brackets.

| name | fields | effect |
|---|---|---|
| `impact` | `seq` `[[mode, frames@24]...]` [2 two-tone, 1 inverted, 2 swapped]; `cols: [light, dark]` [the style's pair] | impact frames: mode 1 two-tone, 2 inverted, 3 two-tone swapped, in any colour pair |
| `speedlines` | `dur` [0.6], `kind: "radial"|"speed"`, `at: [u, v]`, `strength`, `col`; radial only: `spokes` [160], `taper` 0..1 [0] (lines thin toward the centre), `converge: [u, v]` [= `at`] (the point the spokes aim at; the clear zone stays round `at`) | focus or speed lines |
| `shock` | `dur, at:[u,v], amp, r1` | warp ring |
| `trauma` | `amount` | camera shake, decays (stateful: not seek-exact; prefer `shake`) |
| `pose` | `pose, dur, hold, out, k` | seal pose |
| `iris` | `to` (required, a radius), `from` [the previous iris beat's `to`, else 1.4], `dur` [1], `at: "seal" | "chest" | [u, v]` ["seal" = the centre of the seal's screen box], `unit: "h" | "seal"` ["h"], `ease` ["smooth"], `ones` [false], `ring` [0] px, `ringCol` ["#f4ecd8"] | a circular mask in `frame.ink`. Radius in frame heights (`unit: "h"`: 0 closed, 1.4 or more = fully open, mask off) or in multiples of the seal's height on screen (`unit: "seal"`). The centre follows the live seal. The radius steps at the scene fps (`ones: true`: at 24). It HOLDS at `to` after the beat until the next `iris` beat, so `to: 0.09` holds a ring. `ring` draws an edge line that many px wide just inside the edge |
| `flat` | `frames` [1] or `dur`, `col` ["#ebebeb"], `bypass` [true], `bars: "keep" | "paint"` ["keep"] | the whole frame is one colour for those frames. `bypass: false` lets the grade and the grain act on it. `bars: "paint"` covers the letterbox too |
| `invert` | `frames` [1] or `dur`, `hold` [0] extra seconds, `bypass` [true] | `c' = 0.92 - c` for the window; with `bypass` the frame is inverted before the split tone and the grain |
| `ones` | `dur` [0.5], `layers` [`["cast", "fx"]`] | a 24 fps window: those layers step at 24; the cel layer, its lines, the cast shadow, a moving plate and the grain are redrawn at 24 for the window |
| `freeze` | `dur` [0.5], `layers` (required, e.g. `["world"]`) | a time stop: those layers' clock holds at the beat's `t` for the window while the rest keep moving; at the end it rejoins the clock |
| `grade` | `dur` [0.5], `split: { shadow, high, amt }`, `mono` 0..1, `amt`, `in` [0.25] s, `out` [= `in`] s, `ease` ["smooth"; "cut" is a hard swap], `hold` [false] | a timed grade over the shot's (see Grade rule). `hold: true` keeps it after `dur` |
| `box` | `on` [true], `slide` [0] frames, `ratio` [the current one] | letterbox on or off from this time, sliding over `slide` frames |
| `shake` | `amp` [0.0075] frame heights (max 0.04), `tau` [0.18] s, `hz` [12], `dx` [0.25] horizontal share, `seed` [0]; or `schedule: [{ t, amp }]` with `t` in cutscene seconds | damped 2D impulses on the finished frame, at display rate: `y = +-amp exp(-a / tau) cos(2 pi hz a)`, `x = dx amp exp(-a / tau) sin(...)`, a = seconds since the impulse. A schedule fires several from one beat (footfalls); the sign alternates per impulse from `seed`. Plate and cast move together; the bars and the iris do not |

A beat belongs to the frame law only in its reserved FORM: `iris` with a numeric `to`, `freeze` with `layers`, `grade` with `split`, `mono` or `amt`. Without those it stays a free cue (older docks use `freeze`, `iris` and `grade` that way).

`[u, v]` is always a point of the full frame, bars included: u 0..1 left to right, v 0..1 TOP to bottom. Colours are `"#rrggbb"`. Frame counts are 24 fps frames; write a frame time as `f / 24` (`193 / 24`, not `8.04`) so it lands on the frame. Ease names (beats and shots): `smooth linear in out snap inQuad outQuad inOutSine outBack cut`; `easeInCubic` = `in`, `easeOutCubic` = `out`, an `ease` prefix is ignored; `cut` is the end value from the first frame.

Any other name is a free cue for the layers, e.g. `{ t: 4.2, name: "beam", dur: 0.6, power: 1 }` read as `cue.k("beam")` in fx and `cue.on("beam")` in cast (victims react).

## scene.js schema

```js
export default {
  id, title, anime,
  style: "modern-anime",        // lib/anime/styles.js id
  look: { post:{}, lines:{}, fill:{} },   // merged over the style
  fps: 12,                      // 12 twos, 8 threes
  duration: 17,                 // s
  seed: 1,
  far: 1500,                    // camera far plane (optional)
  plates: true,                 // false: redraw everything each frame (costly)
  bg: "#000000",                // scene background (optional)
  frame: { ink, floor, lift, box, split, grain, haze },   // the frame law, all optional: see Frame law
  palette: { ...hex strings },
  seal: { at:[x,y,z], yaw, scale, moves:[{ t:[a,b], to:[x,y,z], yaw? }], track:[{ t, pose, dur?, hold?, out?, k? }] },
  shots: [ ...see Shots ],
  beats: [ { t, name, dur?, ...args } ],
  bubbles: [ { t:[a,b], text | pool:"lines", who:"seal"|"foe"|"narr", side:"l"|"c"|"r", tone:"say"|"think"|"shout"|"bar", y?, col? } ],
  lines: [ ...15 character-voiced lines ],
  sfx: [ { t:[a,b], text, at:[u,v], size, rot, col, ink, font } ],
  credit: { t:[a,b], text, sub?, style? },   // see Credit
}
```

Bubbles sit in the lower half, one at a time, and slide off the seal. A bubble with `tone: "bar"` is a bare caption inside the lower letterbox bar: no bubble, no tail, centred in the bar at `side`, in `col` (default `#f4ecd8`), 0.34 of the bar height (11 to 24 px). The credit plays inside the pocket. SFX lettering is placed off the seal. No explanatory text in the world.

### Credit

`credit: { t: [a, b], text }` alone is the plain card: one cream line, lower centre. With `sub` or `style` it is the styled credit:

| key | meaning | default |
|---|---|---|
| `text` | the main line (`\n` breaks it) | |
| `sub` | a second line under it, at `subSize` | none |
| `style.size`, `style.subSize` | text heights, in frame heights | 0.04, 0.6 x `size` |
| `style.col` | text colour | `#fff7e6` (on a card `#17141f`) |
| `style.fade` | fade in and out, seconds (0 = hard) | 0.25 |
| `style.y` | the block's centre line, share of the frame height, kept at 0.5 or lower in the frame (the lower half); or `"bar"`: centred in the lower letterbox bar | 0.86 |
| `style.x`, `style.align` | horizontal anchor 0..1 and what it anchors: `"center"`, `"left"` (x is the left edge) or `"right"` | 0.5, `"center"` |
| `style.card` | a plate behind the text: `{ bg, border, w, radius, pad }` | none; `{ "#f4ecd8", "#c9a24a", 2 px, 4 px, "10px 26px" }` |

### Shots (the camera law, L3)

Order: `wide` (pull back and up) -> `arc` (cut at the wide, arc into the seal) -> `kill` (the kill angle) -> `home` (the chase pose behind and above the seal, in open ground). `free` inserts are allowed anywhere. A cut at least every 5 s: a longer shot is auto-split and hard-cut to a new angle (and warned). Shots do not blend with each other; they cut.

Every shot is a spherical rig about the seal's chest in the seal's own frame (x right, y up, z forward; `seal.yaw` turns it). Each of `az r elev fov dutch look` is a number (held) or `[from, to]` (eased over the shot):

| field | meaning | default (wide / arc / kill / home) |
|---|---|---|
| `law` | `wide arc kill home free` | |
| `t` | `[t0, t1]` seconds | |
| `az` | azimuth off the seal's front, rad, + toward its left; pi = behind | 0.7 / [0.95, 0.45] / [-0.35, -0.6] / pi |
| `r` | horizontal distance, m (x seal.scale) | [4, 15] / [6.5, 2.7] / [2.7, 1.9] / [3.4, 3.8] |
| `elev` | eye height above the chest, m | [1, 9] / [3.5, 1.1] / [0.9, 0.75] / [2, 2.3] |
| `fov` | vertical degrees | [28, 42] / [38, 30] / [28, 24] / [36, 38] |
| `look` | aim offset from the chest, seal-local, m | [[0,.2,0],[0,1.2,0]] / [0,.05,0] / [0,.05,0] / [0,.2,3.2] |
| `dutch` | roll, degrees | 0 / 0 / [0, 6] / 0 |
| `ease` | `smooth linear in out snap inQuad outQuad inOutSine outBack cut`; `cut` puts the camera at the `to` values from the shot's first frame (a snap zoom is a short shot with `ease: "cut"`) | smooth / smooth / snap / smooth |
| `eye`, `lookAt` | `free` only: world-space `[from, to]` | |
| `dof` | `[focusMetres, strength, 1]` | off |
| `minFrac` | smallest seal height as a share of frame height | 0.05 wide, 0.14 otherwise |
| `cutAz` | the azimuth jump of an auto-cut | 0.4 |
| `hold` | `true`: the camera is frozen IN THE WORLD at the shot's start values for the whole shot. The rig is evaluated once, about the seal as it stood on the cut, so the seal can move through the frame and the plate is baked once. Exempt from the 5 s auto-cut | false |
| `step` | n: the move advances n times a second and holds between (`step: 4` = four held poses a second, `step: 12` = a camera on twos) | every display frame (24 for a 2D move) |
| `long` | `true`: exempt from the 5 s auto-cut | false |
| `overscan` | 1 to 2: this shot's plate is rendered once, that many frames wide and tall, from the shot's base camera (the start values; an overscan, pan or zoom shot is always held) | 1 |
| `pan` | `[[u0, v0], [u1, v1]]` (or one `[u, v]`, held): where the crop window sits in its travel inside the overscanned plate: 0 flush left / top, 1 flush right / bottom, 0.5 centred. It cannot leave the plate | `[0.5, 0.5]` |
| `zoom` | `[z0, z1]` (or one number): magnification against the shot's own framing: 1 is the base framing, `1 / overscan` shows the whole plate, above 1 pushes in | 1 |
| `grade` | `{ split: { shadow, high, amt }, mono, amt }`: the grade for this shot (see Grade rule) | none |

The director then keeps the seal in frame: it pulls the eye in until the seal is at least `minFrac` of the frame (L1), and slides the aim toward the chest if the chest leaves 62% of the half-fov (L1, L2). Stage scenes around the law: move the subject, never the lens.

A shot one frame long (`t: [a, a + 1 / 24]`) is legal. Shots never blend: `t[0]` is the first frame of the new shot, and on that frame the plate is re-rendered and the cel redrawn with the new camera, whatever the hero is doing. For the entrance (a hard cut from the wide to the hero shot while the seal performs its move) give the hero shot `hold: true`, so the camera does not chase the move.

### Held shots and 2D camera moves

The staging every dock uses: a WIDE (held, or a 2D pan or push over an oversized plate), a hard cut to the ENTRANCE, HELD hero shots, the kill angle (held, or a one-frame snap), then home. A true 3D move (`[from, to]` on `az r elev fov`) is a high-tier enhancement on a shot that also works held.

A 2D move is a lens shift, never a camera rotation. The base camera pose and field of view stay fixed for the shot; the plate is rendered ONCE at `overscan` and only cropped; the same crop window is applied to the projection of every layer (`camera.setViewOffset`). So the live cast and fx stay in exact registration with the plate, with no parallax, and a layer does nothing to follow the move: it keeps placing things in world space. `cue.pan = { u, v, zoom }` is there for code that wants the numbers. Screen-space fx authored in frame `[u, v]` stay with the lens (they do not pan). The move follows the shot's `ease` and `step` (24 Hz by default; each step redraws layer 1, never the world). The plate target is `overscan x max(zoom)` frames across, capped at 2, so a push stays sharp to that depth.

```js
{ n: 1, t: [0, 4], law: "wide", az: 0.6, r: 7, elev: 2.2, fov: 36, overscan: 1.25, pan: [[0, 0.5], [1, 0.5]], zoom: [1, 1.15], ease: "linear" },
```

## Plates (painted far layers)

- `ctx.bake.plateLayer(glsl, o)`: a fullscreen painting at the far plane. GLSL `vec3 paint(vec2 p)`, p in height units, y up, values above 1 bloom. `o.tools` lists tool names, `o.uniforms` extra uniforms.
- `ctx.bake.sky(glsl, o)`: a dome baked over the az/el window the shots can see. GLSL `vec3 sky(float az, float el)`.
- `ctx.bake.card(glsl, o)`: a painted card in the world (mountains, a skyline, cloud banks): GLSL `vec4 paint(vec2 p)` with coverage in alpha. `o: { w, h, size:[m, m], billboard }`.
- Layer 0 re-bakes only when the shot changes, and every 1/12 s while a shot moves the camera in 3D (1/24 s inside a `ones` window). A held shot, an `ease: "cut"` shot and a 2D pan or zoom bake it once. Anything animated goes on layer 1.

## Frame law

The frame furniture, the clock and the camera rules every dock needs, stated as DATA in scene.js: no per-dock shader work. All of it is a pure function of the clock (a seek draws what a play draws) and costs uniform writes only; a scene.js that uses none of these keys renders exactly as before. Maths: `framework/law.js`. Checks: `node lib/anime/cutscenes/frame-law.check.mjs` and the `frame` rule of `timing.check.mjs`. The test card `/lab/anime?cut=_frame` shows every feature in one 12 s run.

### scene.frame (per cutscene, all optional)

| key | meaning | default |
|---|---|---|
| `ink` | the dock's ink: the letterbox bars, the iris and the ink-floor lift. Also the default line ink (it stands in for `look.lines.ink` when the look names none) | studio ink `#0e0c16` |
| `floor` | the ink-floor lift colour alone, when it must differ from the bars | `ink` |
| `lift` | `[lo, hi]`: the lift curve, applied last: `c = mix(floor, c, smoothstep(lo, hi, Y))` | `[0.035, 0.08]` |
| `box` | `{ ratio, slide }`: letterbox from t = 0. Each bar is `(1 - aspect / ratio) / 2` of the frame height (132.2 px at 1280 x 800 for 2.39). `slide`: frames over which the bars come in | none; `ratio` 2.39, `slide` 0 |
| `split` | `{ shadow, high, amt }`: the split tone, `c = mix(c, mix(shadow, high, smoothstep(0.2, 0.8, Y)), amt)` | none; `amt` 0.35 |
| `grain` | `{ amt, luma, fps, ones }`: `amt` amplitude; `luma: 1` weights it by `(1 - Y)`, 0 leaves it even; `fps` the reseed rate; inside a `ones` window it reseeds at 24 unless `ones: false` | none (the style's grain, even); with the key: `luma` 1, `fps` the scene's |
| `haze` | `{ col, k, start, amt }`: distance haze painted into the plate (the sets of layer 0; never the sky, never layer 1): `c = mix(c, col, amt (1 - exp(-k max(z - start, 0))))`, z in metres from the lens. Needs `plates: true` | none; `k` 0.002, `start` 0, `amt` 1 |

`frame` wins over `look` and the style where both set the same thing (grain amount, bars, haze, line ink). The luma cap is law and has no key: Y709 <= 0.92, always, after everything else.

### The end of the composite (fixed order)

scene, glow, lens, the style's grade, speed lines, then: mono and split tone, grain, vignette, impact frames, invert frame, flat frame, iris, letterbox, luma cap 0.92 and ink-floor lift. A flat or invert frame with `bypass` (the default) takes the frame from before the split tone and the grain; nothing skips the cap. A two-tone impact frame is two flat colours, so it carries no grain and no split tone. Nothing in this list dims or covers the hero seal except the flat frame, the invert frame, the iris and the letterbox, which are frame-wide by design.

### Clock

- Every layer has its own stepped time, handed to its `update(t, dt, cue)` and readable as `cue.ts` during that update. Layer names are the keys given to `composeLayers` (`world`, `cast`, `fx`). The hero seal keeps the `cast` clock.
- Outside any window: `floor(t fps + 1e-6) / fps`, so a time exactly on a frame boundary lands on that frame.
- Inside a `ones` window the named layers step at 24. Inside a `freeze` window the named layers hold the drawing of the beat's `t`; the others keep moving; when the window ends the layer rejoins the clock.
- The engine follows: during a `ones` window the cel layer, its lines, the cast shadow, a moving plate and the grain are redrawn at 24.
- Layer 0 is a plate baked per shot, so a world freeze shows on what the world layer animates on layer 1 (`userData.layer = 1`) and on the uniforms it drives.
- `cue.ones`, `cue.frozen(layer)` and `cue.layerT(layer)` are for code that wants to know.
- Seek equals play for everything in this section, for held shots (the plate and its lines are the same whenever it is baked), for `ease: "cut"`, for 2D moves and for a 3D move with a `step` that divides the scene fps (`step: 12`, `step: 4`). Two older behaviours are not seek-exact: a 3D move with no `step` (the camera runs at the display rate and the cel is drawn on whichever display frame opens the step), and `trauma`.

### Grade rule

One rule, three levels, the later wins: `frame.split` (the dock's base), then the shot's `grade` (a hard swap on the cut, for the whole shot), then every `grade` beat in time order (blended in over `in` and out over `out`, or held). A level changes only what it names: a beat with `mono` alone keeps the split under it; `amt` alone changes the strength. `mono` is a desaturation 0..1 applied before the split tone. A persistent change is a beat with `hold: true`; a hard swap is `ease: "cut"`; a different in and out is `in` and `out`.

### Tiers

The world of every shot is a baked plate at every tier; the tiers differ in how much runs live on top. Every effect instance and surround shader declares the lowest tier it runs at and checks it with `ctx.atTier(n)`:

| declared tier | runs when `engine.tier` is | what belongs here |
|---|---|---|
| 0 | 0 to 4 (always) | the hero and cast, and whatever the story beat needs to read |
| 2 | 2, 3, 4 (medium and high) | the one or two live effects the moment cannot do without, and the shaders that carry the look |
| 3 | 3, 4 (high only) | heavy surround shaders (a living sky, an aura, atmosphere, water) and full particle counts |

Build everything in `build(ctx)` and gate it in `update`, because the tier can move during play: `obj.visible = ctx.atTier(obj.userData.tier)`. Use shared programs (`engine.prop`, `engine.figure`, the tools) for gated objects so nothing new links when one is first shown. The tier never changes staging, palette, timing or which set pieces exist; the moment must still read at tier 0. `ctx.tier` and `cue.tier` give the number. Lab: `&tier=n`.

### Worked example

```js
// scene.js: a 12 s dock on twos, held shots, a 24 fps kill window, the frame furniture as data
export default {
  id: "p-example", style: "modern-anime", fps: 12, duration: 12, seed: 7, plates: true,
  frame: {
    ink: "#1a120c",                                              // bars, iris, ink floor, default line ink
    box: { ratio: 2.39, slide: 11 },                             // bars slide in over 11 frames
    split: { shadow: "#22304a", high: "#ffe6c0", amt: 0.35 },
    grain: { amt: 0.03, luma: 1, fps: 12 },
    haze: { col: "#c29472", k: 0.002, start: 20 },
  },
  seal: { at: [0, 0, 0], yaw: 0, moves: [{ t: [2.5, 3.5], to: [0.8, 0, 0] }], track: [{ t: 2.5, pose: "spin", dur: 0.3, hold: 0.5, out: 0.2 }] },
  shots: [
    { n: 1, t: [0, 3], law: "wide", az: 0.6, r: 7, elev: 2.2, fov: 36, overscan: 1.25, pan: [[0.2, 0.5], [0.8, 0.5]], ease: "linear" }, // a 2D pan over an oversized plate
    { n: 2, t: [3, 8], law: "arc", hold: true, az: 0.45, r: 3.4, elev: 1.0, fov: 30 },                 // hard cut mid-move to the held hero shot
    { n: 3, t: [8, 193 / 24], law: "free", ease: "cut", az: 0.2, r: 1.5, elev: 0.6, fov: 18 },        // a one-frame snap zoom
    { n: 4, t: [193 / 24, 10], law: "kill", hold: true, grade: { split: { shadow: "#3a0a10", high: "#ffb070" }, amt: 0.45 } },
    { n: 5, t: [10, 12], law: "home", hold: true },
  ],
  beats: [
    { t: 0, name: "iris", dur: 11 / 12, from: 0, to: 1.4, at: "seal" },                               // open on the seal
    { t: 8, name: "ones", dur: 0.5, layers: ["cast", "fx"] },                                           // the kill on ones
    { t: 8, name: "flat", frames: 1, col: "#ebebeb", bars: "keep" },                                    // one white frame
    { t: 193 / 24, name: "invert", frames: 1 },
    { t: 194 / 24, name: "impact", seq: [[1, 2], [3, 2]], cols: ["#ff8a20", "#3a0a10"] },             // two-colour impact
    { t: 8, name: "freeze", dur: 0.5, layers: ["world"] },                                              // the world stops, the cast does not
    { t: 8.2, name: "shake", tau: 0.18, hz: 6, schedule: [{ t: 8.2, amp: 0.0075 }, { t: 9.0, amp: 0.005 }] },
    { t: 6, name: "grade", dur: 2, mono: 0.8, in: 0.5, out: 0 },                                        // drains to grey, snaps back on the kill
    { t: 11, name: "iris", dur: 1, to: 1.15, unit: "seal", at: "chest", ring: 3 },                      // closes to a ring round the seal and holds
  ],
  bubbles: [{ t: [1, 2.5], text: "a caption in the lower bar", tone: "bar" }],
  credit: { t: [10.2, 11.8], text: "owner/repo", sub: "merged", style: { size: 0.04, subSize: 0.024, y: "bar" } },
};

// fx/index.js: a tier-2 effect on its own clock
export default function build(ctx) {
  const sparks = makeSparks(ctx);                     // built at load, whatever the tier
  return {
    group: sparks.group,
    update(t, dt, cue) {                              // t is the fx layer's stepped time: at 24 inside the ones window
      sparks.group.visible = ctx.atTier(2);
      sparks.pose(t, cue.k("slash"));
    },
    dispose() { sparks.dispose(); },
  };
}
```

## Backgrounds (the painted set kit, `lib/anime/kit/bg/`)

A world is a painting, not a set of boxes: sky, air, city faces, ground, interior, silhouettes, a foreground. `import { bg } from "../../kit/bg/index.js"` and call one line per element; full table in `docs/BACKGROUNDS.md`, gallery at `/lab/anime?cut=_bg&gal=<shibuya|throne|day|night|classroom|hall|storm|sea>`.

```js
const look = bg.look(ctx, { light: { dir, col }, shade, amb, bands: [3, 0.05], base: { dark, h, grime }, haze: { col, k, start, h }, rim: { dir, col, k }, pools: [{ at, col, r }] });
group.add(bg.sky(ctx, "dusk" /* day dusk night storm void domain */, { az: [-1.2, 1.2] }));   // a baked dome over the az window the shots see
group.add(bg.rank(ctx, look, "skyline", { k: 0.6, at: [0, 24, -150], size: [420, 100] }));    // far rows pale into the haze: skyline crowd pines rooftops mountains ruins shrine
const city = bg.city(ctx, look, { avenue: { half: 10.5, z0: -90, z1: 14 }, paint: { night: 1, lit: 0.4 } }); group.add(city.group);
group.add(bg.ground(ctx, look, { kind: "asphalt", road: { half: 10.5, zebra: [-5, 3] }, puddles: 0.8 }));
const room = bg.room(ctx, look, { kind: "hall" }); const fg = bg.foreground(ctx, look, [{ shot: 3, kind: "leaves", side: "tl" }]);
bg.paintOver(existingGroup, look);   // repaint any set you already built: brush, dark foot, gradient, pooled light, lit window cards; geometry untouched
```

- Everything is set: layer 0, baked once per shot, the same picture at every tier. Call `look.dispose()` in the world's `dispose` (it restores the shared key light it wrote).
- One look for the whole frame. The foot of every surface is dark and dirty, the far is pale, one pool of light marks where the story is.
- **`scene.bg` (one line of data, the world is repainted after it builds).** `bg: "red-domain" | "night-city" | "dusk-city" | "day-city" | "throne" | "hall"` runs `bg.apply` (kit/bg/presets.js): a look, the paint-over (brush, dark foot, gradient, lit and dark window panes, pooled light), mist banks, and a focus mass plus one pool of light that follow the seal. `bg: { preset, look: {...}, paint: {...}, dress: { air: [...], fg: [{ shot, kind, side }] }, hero: false }` overrides any part. `bg: false` leaves the world as built. **No `bg` is the `auto` pass**: every dock's baked window cards get painted panes (frame, lamp gradient, sheen) and every prop material gets brush grit and a dark foot; geometry never changes. Preview any of it on a real dock without editing it: `&bg=off` and `&bg=<preset>` in the cut URL (`node scripts/cut-cap.mjs --shots "<dock>@<t>@bg=red-domain"`).
- A world that paints its own set with the kit sets `bg: false`.

## Photography (`look.photo`, docs/PHOTOGRAPHY.md)

Every cutscene is lit by the engine's rig, by data. No key: the `auto` rig (scene key, a rim coloured from what is behind the seal, fill and bounce from the colours round it, a focal pool of value, a little glow and dust). `look: { photo: "night-red" }` names a mood (`auto`, `night-red`, `noon-gold`, `noon-desert`, `blue-void`, `storm`, `none`; a dock that asks for nothing gets `auto`, which samples the colour round the seal and takes red as `night-red`, yellow-orange as `noon-gold`, blue as `blue-void`, grey and white stay neutral); `look: { photo: { preset, ...overrides, shots: [{ t: [a, b], ...overrides }], beats: [{ t, dur, flash, col }] } }` tunes it per shot and per beat; `photo: false` turns it off. Keys: `key` (hard terminator and contact shadows: the face takes brow and nose shadow), `rim` and `rim2` (coloured edge lights), `fill`, `bounce`, `shadow`, `value` (darks, one focal pool, contrast), `halo`, `haze`, `mist`, `motes` (embers, dust, snow), `shafts`, `glow` (halation), `dof`, `paint` (grain, hatching), `grade` (three-way tint, saturation, harmony hues), `hit` (flash, chromatic split, blown frame on every shake and impact), `hero` (`cap` shoulder on the seal's highlights, `floor` a coloured value under its darks so a coat is navy not black, `tint`, `desat`), `veins` (`col, amt, n, flow, speed`: hot ridged energy filaments converging on the seal, on the set only, above 1.0 so they glow; opt-in, 0 by default and in auto). `grade.harmony.hues: "auto"` (the default, 0.35) pulls set hues toward the colour round the seal. Directions are view-space (x right, y up, z to the lens). A pixel at or above 1.0 is emissive and is not darkened by the value pattern: write veins, lanterns and suns above 1.0. The hit response reads the `shake` beat and `impact` frames on its own. Lab proof: `_key` (`&photo=<mood>`, `&v=b`), the seal as Sukuna restaged from the owner's image.

## The hold (calm menace) and the value budget

A cutscene that asks for nothing already gets the look: the set is the dark mass, the seal's face is the lightest, clearest thing, power is hot but thin.
The photography owns ONE value budget per shot (`look.photo.value`): `darks` (the set's multiplier away from the face), `ceil` (the luma an effect body or
set surface may reach there, a soft knee), `sat` (the saturation a broad surface keeps), `lift` (the face's gain), `r` (the radius of the face's pool).
Everything above 1.0 passes untouched (a vein core, a slash core, a lantern): an effect's body stays below 1.0 and only its thin core goes above
(`cel.js` writes cores at `emit` 1.7, bodies plain). Any `scene.cel` entry lights the seal with its own colour (rim, fill) by default; `rim: false` opts out.

One line takes it further: `look: { photo: "night-red" }` (a mood) and `bg: "red-domain"` (a painted set). Before and after on a real dock: docs/PHOTOGRAPHY.md.

**The hold**, the calm-menace shot, is on by default. A scene whose shots name no `menace` gets one at its biggest burst: the director scores every `shake`, `impact` and `trauma` beat, takes the shot that holds the hardest (not before 0.4 s) and the shots after it until 1.2 s are held (at most three), and compiles them as the chest-up hold. The run's own camera numbers are replaced (the hold is a camera of its own: low, chest-up, the seal at 0.7 of the frame height); its `grade`, `pal` and beats are untouched. A builder takes it over by data:

| data | effect |
|---|---|
| nothing | the default hold at the biggest burst |
| `hold: false` on the scene | no default hold |
| `menace: false` on a shot | that shot is never picked or extended into |
| `menace: true` or `{ frac: 0.7, dark: 1, calm: 0.25 }` on a shot | your own hold on exactly that shot (then no default hold is added) |
| `&menace=1` in the lab URL | every shot as a hold, to preview |

In a hold the photography drops the set further (`dark` 0..1.5), tightens the face's pool, puts depth of field behind the seal (0.7), caps broad bodies at 0.6, widens the power's rim and holds a floor of it (the seal is lit by its power for the whole hold), and the frame shake is scaled by `calm` (0.25: the world shakes, the seal does not). Chaos runs behind it as usual: `scene.cel` and the beats are untouched. A shot of your own with `az r elev fov look` keeps them; only the default hold replaces them. Preview any dock: `&menace=1`.

**Power is thin, by default, for every effect.** After the set's darkening, any bright set or effect pixel (above the body cap, 0.7 by default, `look.photo.value.body`) keeps its value only if it is a thin line: the ring round it, 1.3% of the frame height away, is mostly dark. A broad bright body (a burst blob, a white wall, a field of light) is held to the body cap whatever drew it; a vein, a slash core, a lantern, a spark is untouched. So a cutscene needs no per-effect work: write the body below 1.0 and the thin core above and the grade keeps the rest. `value: { thin: 0 }` turns it off.

**Every dock lights the seal with its power.** A dock with `scene.cel` lights the seal from its first entry's colour (`rim: "#hex"` picks it, `rim: false` opts out). A dock without it takes the colour from each `impact` beat's light colour (or the palette's accent) and pulses the seal's rim and fill on every impact and shake beat; a hold keeps a floor of it.

**`photo: false` is the value law, not black.** A printed or flat look (a manga page) that turns the photography off still gets the value law alone (`PRESETS.law`: set pulled down, face lifted, bodies capped, no colour, air, rim, glow or blur). `photo: "none"` (or `&photo=none`) is the one that turns every pass off. A scene whose style has `fill.flat` of 0.5 or more and names no mood gets the `flat` preset (same budget, no blur, flat colours kept).

## Shared kit

- `costumedSeal(engine, spec)`: a small seal with the locked proportions, in a costume (data-driven cloth layers, hat, hair, accessories, weapon), cached per costume. Handle: `{ group, place(x,y,z,yaw), setPose(name,k), expression(name,k), react(kind,k), tint(col,k), update(ts), dispose() }`. Reactions: `recoil kneel blown terror petrified cower bow fallen stagger`. Victims and extras are ALWAYS costumed seals (L6b), never silhouettes.
- `eyePair(head, o)` / `eyeDecal(o)`: the anime eye (iris gradient, pupil kinds, two highlights, lashes, lid), expressions `neutral calm terror rage sad smug petrified shut awe`.
- `hairClumps(spec)` / `hairMesh(engine, spec, head)`: hard-edged tapered clumps with the highlight cut; presets `spiky swept long bob ponytail twintail forelock slick mohawk bald`.
- Impact frames and speed lines: a beat in scene.js, or `ctx.sakuga` from code. Both are pure functions of the clock, so scrubbing equals playing.

## Owner laws in force

The hero seal is the locked design. Victims and extras are small costumed seals. The seal wields the power and is in every frame, never covered, never milky (lit luma <= 0.92, excluded from bloom). Lines and the credit play inside the pocket, lower half, one bubble at a time. Show, don't tell. Protected looks: Aizen (`pr-xnnpack-10801`), Sukuna (`pr-triton-kernels-22`), Madara's blue Susanoo (`p-caustic`).

## Drawn effects (kit/fx/cel.js, docs/FX-KIT.md)

One-line factories for the effects a hit needs, in screen space, flat shapes with an ink pass, redrawn on twos: `makeVeins` (branching lightning, `veinField` for the red field), `makeCrescent` (the slash smear with afterimages), `makeBurst` (impact drawing; `bgFrames: 3` burns it into flat colour), `makeRing`, `makeCracks`, `makePlume` (ball-and-tail smoke), `makeDebris`, `makeAura` (`.drive(ts)` for hair and cloth), `makeSpeedLines`, `makeFlat`, and `makeCel({ draw })` for your own. Positions are frame fractions `[u, v]`, sizes frame heights, `at` seconds, `events: [...]` fires many from one mesh, `hole` cuts the seal out. Add `group` to the fx layer and call `update(t, cue)` with the layer's `t`. Fire them in a `ones` window on the hit. Proof: `_fx?fx=cel&cel=sukuna`.

**No code needed: `scene.cel`.** A list of `{ kind, at, ...options }` in scene.js is built into your fx layer by the framework (on the fx clock, so `ones` windows step it at 24; every effect draws behind the seal by depth, no cut-out disc). `kind: "field"` is the red energy that fills the frame behind the seal (set `near`, `mid`, `far`, `hot` for your palette), `"hit"` one drawn hit (`big: true` for the kill: flash frame, burned-in silhouette, ring, speed lines; `slash: false` for a blast with no blade), `"slashes"` a barrage (`times: [...]`), `"quake"` the ground taking it, and any factory name (`veins crescent burst ring cracks plume debris aura speed flat`) with its options. `rim: "#ff2030"` on an entry lights the figure with it. Example: Sukuna (`pr-triton-kernels-22/scene.js`, `cel:`). Full table in docs/FX-KIT.md.
