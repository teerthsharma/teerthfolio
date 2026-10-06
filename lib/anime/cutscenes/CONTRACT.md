> READ FIRST: lib/anime/cutscenes/RULEBOOK.md (keep looking for new shaders; reuse first; log needs).

# Cutscene contract

A cutscene is DATA plus three LAYERS, composed by one build file, played by one framework. Change a file and nothing else breaks.

```
lib/anime/cutscenes/
  framework.js          the player, composeLayers, ctx (this document)
  framework/            director.js (camera law) seal.js overlay.js sakuga-api.js plates.js
  index.js              lazy registry: DOCKS, loadCut(id)
  _template/            the stub every dock starts from
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
- `update(t, dt, cue)`: `t` is STEPPED time `floor(t fps)/fps` (twos or threes): animate characters and fx from it. `cue.t` is the display-rate clock (use it only for things that must stay smooth, such as a camera-facing billboard). `dt` is real seconds.
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
| `sakuga` | `impact(t, seq?)`, `speedLines({ t, dur, kind, at, strength, col })`, `shock({ t, dur, at, amp, r1 })`, `trauma(a)` |
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

`t`, `ts` (stepped t), `dt`, `duration`, `fps`, `aspect`, `shot` (compiled shot), `shotN`, `shotU` (0..1 across the shot), `law` (`wide|arc|kill|home|free`), `cut` (true on the first frame of a shot), `fired` (beats crossed this frame), `active` (beats whose window holds t), `seal`.
Methods: `on(name)`, `beat(name)`, `k(name)` (0..1 across the beat's `dur`), `arg(name, key, default)`, `since(name)` (seconds since it last started, Infinity before), `done(name)` (1 once started).

### Beat names

Reserved, handled by the player (a layer may still read them to sync motion):

| name | args | effect |
|---|---|---|
| `impact` | `seq?` `[[mode, frames@24]...]` (default 2 two-tone, 1 inverted, 2 swapped) | impact frames |
| `speedlines` | `dur, kind:"radial"|"speed", at:[u,v], strength, col` | focus or speed lines |
| `shock` | `dur, at:[u,v], amp, r1` | warp ring |
| `trauma` | `amount` | camera shake, decays |
| `pose` | `pose, dur, hold, out, k` | seal pose |

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
  palette: { ...hex strings },
  seal: { at:[x,y,z], yaw, scale, moves:[{ t:[a,b], to:[x,y,z], yaw? }], track:[{ t, pose, dur?, hold?, out?, k? }] },
  shots: [ ...see Shots ],
  beats: [ { t, name, dur?, ...args } ],
  bubbles: [ { t:[a,b], text | pool:"lines", who:"seal"|"foe"|"narr", side:"l"|"c"|"r", tone:"say"|"think"|"shout", y? } ],
  lines: [ ...15 character-voiced lines ],
  sfx: [ { t:[a,b], text, at:[u,v], size, rot, col, ink, font } ],
  credit: { t:[a,b], text },
}
```

Bubbles sit in the lower half, one at a time, and slide off the seal. The credit plays inside the pocket. SFX lettering is placed off the seal. No explanatory text in the world.

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
| `ease` | `smooth linear in out snap` | smooth / smooth / snap / smooth |
| `eye`, `lookAt` | `free` only: world-space `[from, to]` | |
| `dof` | `[focusMetres, strength, 1]` | off |
| `minFrac` | smallest seal height as a share of frame height | 0.05 wide, 0.14 otherwise |
| `cutAz` | the azimuth jump of an auto-cut | 0.4 |

The director then keeps the seal in frame: it pulls the eye in until the seal is at least `minFrac` of the frame (L1), and slides the aim toward the chest if the chest leaves 62% of the half-fov (L1, L2). Stage scenes around the law: move the subject, never the lens.

## Plates (painted far layers)

- `ctx.bake.plateLayer(glsl, o)`: a fullscreen painting at the far plane. GLSL `vec3 paint(vec2 p)`, p in height units, y up, values above 1 bloom. `o.tools` lists tool names, `o.uniforms` extra uniforms.
- `ctx.bake.sky(glsl, o)`: a dome baked over the az/el window the shots can see. GLSL `vec3 sky(float az, float el)`.
- `ctx.bake.card(glsl, o)`: a painted card in the world (mountains, a skyline, cloud banks): GLSL `vec4 paint(vec2 p)` with coverage in alpha. `o: { w, h, size:[m, m], billboard }`.
- Layer 0 re-bakes only when the shot changes, and every 1/12 s while a shot moves the camera. Anything animated goes on layer 1.

## Shared kit

- `costumedSeal(engine, spec)`: a small seal with the locked proportions, in a costume (data-driven cloth layers, hat, hair, accessories, weapon), cached per costume. Handle: `{ group, place(x,y,z,yaw), setPose(name,k), expression(name,k), react(kind,k), tint(col,k), update(ts), dispose() }`. Reactions: `recoil kneel blown terror petrified cower bow fallen stagger`. Victims and extras are ALWAYS costumed seals (L6b), never silhouettes.
- `eyePair(head, o)` / `eyeDecal(o)`: the anime eye (iris gradient, pupil kinds, two highlights, lashes, lid), expressions `neutral calm terror rage sad smug petrified shut awe`.
- `hairClumps(spec)` / `hairMesh(engine, spec, head)`: hard-edged tapered clumps with the highlight cut; presets `spiky swept long bob ponytail twintail forelock slick mohawk bald`.
- Impact frames and speed lines: a beat in scene.js, or `ctx.sakuga` from code. Both are pure functions of the clock, so scrubbing equals playing.

## Owner laws in force

The hero seal is the locked design. Victims and extras are small costumed seals. The seal wields the power and is in every frame, never covered, never milky (lit luma <= 0.92, excluded from bloom). Lines and the credit play inside the pocket, lower half, one bubble at a time. Show, don't tell. Protected looks: Aizen (`pr-xnnpack-10801`), Sukuna (`pr-triton-kernels-22`), Madara's blue Susanoo (`p-caustic`).
