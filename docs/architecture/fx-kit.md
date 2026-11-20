# Drawn effects: `lib/anime/kit/fx/cel.js`

Power in anime is drawn, not simulated: flat shapes, a hard edge, an ink line, two or three tones, redrawn on twos, one frame of overshoot at the hit. `cel.js` is that vocabulary. Every factory is `makeX(engine, opts) -> { group, update(ts, cue), set(patch), dispose() }`, one draw call, no textures, screen space. Add `group` to the fx layer, call `update(t, cue)` with the fx layer's stepped time `t`.

Coordinates: a position is a frame fraction `[u, v]` from the top-left (`where` for a point, `from`/`to` for a chord); a size is in frame heights (`size: 0.3` is 30% of the frame height). `at` is the start time in scene seconds. `events: [{ at, ...overrides }]` fires many from one mesh (18 slashes, 20 veins). `loop: s` re-fires every `s` seconds with a fresh drawing. `hole: [x, y, z, r]` cuts a world sphere (the seal) out so the effect passes behind it. `engine.tier <= 1` halves counts. Defaults are exported (`CRESCENT`, `BURST`, ...); every option below is a key of them.

| call | what it draws | the one line |
|---|---|---|
| `makeVeins` | branching angular lightning: three branch orders, white core, coloured body, ink edge, far branches fade to a dark tone, a new drawing every other frame | `makeVeins(engine, { from: [0.5, 0], to: [0.55, 0.9], at: t })` |
| `veinField` | the red field of the reference: veins from every border toward the middle, depth by width | `makeVeins(engine, { events: veinField({ count: 18, loop: 0.8 }) })` |
| `makeField` | the red energy that IS the background of the show frame: a stepped dark vignette and halo discs, three depths of ragged flame ribbons (far dark fill, mid body, near thick with a lit edge and a hot seam), embers; the middle stays clear (`clear: [u, v, r]`); `.level(ts)` is its 0..1 strength | `makeField(engine, { at: t, until: t2, near: "#d0182c" })` |
| `makeCrescent` | the slash: a white crescent smear with a coloured edge, ghost afterimages, full length in one frame with a thick first frame, then the tail eats it | `makeCrescent(engine, { from: [0.1, 0.8], to: [0.9, 0.2], bend: 0.2, at: t })` |
| `makeBurst` | the impact drawing: spikes, splat blobs, speed lines, hot centre; `bgFrames: 3` burns it into flat colour (white on ink, then inverted) | `makeBurst(engine, { where: [0.5, 0.5], size: 0.4, bgFrames: 3, at: t })` |
| `makeRing` | hard-edged broken shock ring, ellipse (`squash` lays it on the ground), thinning, expanding on twos | `makeRing(engine, { where: [0.5, 0.8], radius: 0.8, rings: 3, at: t })` |
| `makeCracks` | ground cracks that run: ink body, hot seam, branching, `hold: Infinity` keeps them | `makeCracks(engine, { where: [0.5, 0.85], count: 8, at: t })` |
| `makePlume` | ball-and-tail smoke: shadow tone, lit crescent, one ink outline, boils on twos | `makePlume(engine, { where: [0.3, 0.95], size: 0.15, at: t })` |
| `makeDebris` | angular chunks on ballistic arcs, motion smear, a few big near ones | `makeDebris(engine, { where: [0.5, 0.7], count: 24, at: t })` |
| `makeAura` | flame tongues round an ellipse (the figure) in three tones, embers; `aura.drive(ts)` is a 0..1 number for hair and cloth sway; `follow: (age) => [u, v, rx, ry]` tracks a moving figure | `const a = makeAura(engine, { where: [0.5, 0.6], size: [0.2, 0.34], hole }); hero.set({ sway: a.drive(t) })` |
| `makeSpeedLines` | tapered radial lines, redrawn on twos; `in: false` points them away | `makeSpeedLines(engine, { focus: [0.5, 0.5], dur: 0.5, at: t })` |
| `makeFlat` | a full-frame flat colour for a few frames (the silhouette frame); `pattern: [1, 0, 1]` blinks | `makeFlat(engine, { col: "#fff", dur: 1 / 24, at: t })` |
| `makeCel` | the escape hatch: `draw(B, ts, A)` with `B.tri/strip/fan/rect/ribbon(pts, widths, rgb)` | see `_fx/hits.js` `shrineDraw` |

Timing shape: a hit effect should be fired on a `ones` window (24 fps) so its first frame is the thick overshoot frame; ambient ones (veins field, plume, aura) read best at the layer's 12. `sakuga.js` has the envelopes the factories use: `overshoot(k)`, `anticipate(k)`, `envelope(age, attack, hold, tau)`, `drawnFrame(age, fps)`.

Draw order is `order` (default 1002); within a factory the passes run far to near and every shape draws its ink first. Use `order` to put a flat under veins under slashes under bursts.

Cost (CPU generation, mean per drawn frame, node, tier 3 counts): veins 0.08 ms and 360 triangles, a field of 16 4,100 triangles, crescent 420, burst 230, ring 440, cracks 1,800, plume 420, debris 240, aura 1,200, speed lines 140. One draw call each, no fill-rate cost beyond the shapes. At tier 0 and 1 counts halve and branch orders drop to 2.

Gallery: `?fx=cel&cel=all|veins|crescent|burst|ring|cracks|plume|debris|aura|speed` in `_fx`, and `?fx=cel&cel=sukuna` the three hits of the Sukuna cutscene (slashes 0.5 to 2.6 s, Cleave 3.2 s, shrine rising 5.6 s). Clips: `node scripts/cut-clip.mjs _fx 0.4 2.8 out.gif 24 640 "fx=cel&cel=sukuna"`.

## From data: `scene.cel` (no code)

Put a list in scene.js and the framework builds it into the fx layer, on the fx clock (so a `ones` window steps it at 24) and below the dock's own overlays. Each entry is `{ kind, at, ...the factory's options }`; kinds are the factories above (`field veins crescent burst ring cracks plume debris aura speed flat`) and three macros that build a whole hit:

| kind | what | the one line |
|---|---|---|
| `hit` | crescent chord, the impact drawing one frame later, debris; `big: true` adds the flash frame, the burned-in silhouette, a ground ring, speed lines and a 12-frame burst; `slash: false` drops the crescent | `{ kind: "hit", at: 12.0, big: true, where: [0.5, 0.5] }` |
| `slashes` | a barrage: one small hit per time, chords from a seeded rule or `chords: [[from, to, bend], ...]` | `{ kind: "slashes", times: [9.7, 9.95, 10.2] }` |
| `quake` | the ground takes it: cracks, three rings, a row of plumes, debris | `{ kind: "quake", at: 3.4 }` |

Everything draws BEHIND the seal by depth (an exact silhouette, no cut-out disc, and the face is never crossed). `front: true` on an entry draws it over the seal with `hole: "seal"` cutting it out. `tier: 2` on an entry runs it at tier 2 and up. `rim: "#ff2030"` on any entry lights the figure: while a `field` or `aura` is up the layer sets `engine.shared.uRimCol` / `uRimDir` (the engine's rim) and writes `uAura` (vec4, x = strength) and `uFxRim` (rgb + strength) for the hero shaders. A macro's meshes are shared by kind, so 17 slashes cost 4 draw calls.

Palette: a macro or factory takes `edge`, `body`, `tone`, `lit`, `seam`, `near`, `mid`, `far` colours, so a gold, magenta or blue cutscene recolours the same drawings: `{ kind: "field", near: "#e8b020", mid: "#6a4a0c", far: "#2e2008", hot: "#fff0b0" }`.

## Third pass: effects inside the value budget (2026-11-15)

- **Body below 1.0, core above.** `emit` (2.6) lifts only the thin cores; every body, edge and lit-near colour is plain. The photography now enforces this for any layer: a broad bright body is held to `look.photo.value.body` (0.5; 0.42 in a hold) and only thin lines keep their value (docs/site/photography.md, "Power is thin"). A burst blob of white therefore reads as a coloured mass with a bright ring and cracks, not a white hole.
- **Effects light the seal.** `scene.cel` writes `shared.uFxRim` from its first entry's colour (`rim: "#hex"` to choose, `rim: false` to opt out). A dock with no `scene.cel` gets the same from the framework, from each impact and shake beat. The rim's width follows the effect's strength, not the seal's size.
- **The painted sky is not covered.** `FIELD.dark` (the stepped dark vignette of the `field` kind) is 0.15, was 0.3: the set's painted sky shows through; the photography darkens the set, the field no longer does it twice.
- Thin forked lightning for a frame: `{ kind: "veins", events: veinField({ count: 34, seed: 4, loop: 1.5, width: [0.0025, 0.012] }), body: "#d8141c", core: "#ffd9cf" }` (the `_key` lab).
