# Teerthfolio AnimeEngine versus live player

Checkout context (read-only git): branch `local/grade`, HEAD `e58077b` (`e58077b Put Unlimited Void on black-blue space and give every dock a flipper sign.`). Working tree is dirty with untracked `lib/anime/cutscenes/`, `research_notes/`, and `.donotcommit/`. Issue #12’s Chrome probe is SHA `460bafd`, not this HEAD. Do not treat `460bafd` numbers as this tree’s live pixels.

## protocol.js STASH, LUMA_MAX 0.92, INK, blends

### Takeaway
This checkout already names a five-stash compositor (WORLD → CAST → FX → OCCLUDE → GRADE) with Rec.709 luma cap 0.92, indigo ink lift off `#000`, and four legal blends. Those laws are data and CPU helpers; no WebGL2 player in `app/` samples them.

### Cited Findings
- `LUMA_W` is Rec.709 `[0.2126, 0.7152, 0.0722]`; `LUMA_MAX` is `0.92`; `INK` is `[0.08, 0.09, 0.18]`. — [protocol.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/layers/protocol.js)
- `BLENDS` is frozen `["replace", "multiply", "screen", "add-clamped"]`; `WHENS` is `["build", "shot", "frame"]`. — [protocol.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/layers/protocol.js)
- `STASH.WORLD`: order 0, blend `replace`, when `shot` (compiled at `build(ctx)`, redrawn on shot change). — [protocol.js L13–20](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/layers/protocol.js)
- `STASH.CAST`: order 1, blend `replace`, when `frame` (low-poly; time stepped, not interpolated). — [protocol.js L21–27](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/layers/protocol.js)
- `STASH.FX`: order 2, blend `add-clamped`, when `frame` (energy / particles / lettering; glow only through `uEmit`). — [protocol.js L28–34](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/layers/protocol.js)
- `STASH.OCCLUDE`: order 3, blend `multiply`, when `frame` (screen-glued invert / halo / tear; “never covers the hero seal”). — [protocol.js L35–41](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/layers/protocol.js)
- `STASH.GRADE`: order 4, blend `replace`, when `frame` (print / night / gold / invert remap; last; luma police after). — [protocol.js L42–48](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/layers/protocol.js)
- `STASHES` order is WORLD, CAST, FX, OCCLUDE, GRADE. `composeStashes` sorts by `order`, rejects colliding ids/orders and unknown blend/when. `COMPOSE` is the default frozen list. — [protocol.js L51–82](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/layers/protocol.js)
- `lumaOf` is the Rec.709 dot; `lumaCap` scales RGB by `min(1, LUMA_MAX / max(L, 1e-4))`. Comment: “Lit luma never above 0.92.” — [protocol.js L84–93](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/layers/protocol.js)
- `inkLift` is a per-channel `max` against `INK` so crushed ink leaves `#000`. — [protocol.js L95–102](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/layers/protocol.js)
- `emitGate` adds `glow * uEmit` then `lumaCap`. — [protocol.js L104–112](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/layers/protocol.js)
- `lib/anime/layers/stack.js` implements the same four blends in JS (`multiply`, `screen`, `add-clamped` via `lumaCap`, else replace) then `lumaCap(inkLift(...))`. Pipe is `["shader", "poly", "graphic", "stash", "luma"]`. — [stack.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/layers/stack.js)
- Issue #12 restates the same five jobs as a TV compositor and says live Stage still paints a night hex. — [issue #12](https://github.com/teerthsharma/teerthfolio/issues/12)
- The quality-gap note maps those stashes to “have vs see”: WORLD = Stage `voidMaterial` night hex; CAST = island pear; FX = DOM line + glow / caption kills; OCCLUDE almost none; GRADE law exists but not applied per-studio. — [anime-quality-gap.md](file:///C:/Users/seal/Documents/GitHub/teerthfolio/research_notes/anime-quality-gap.md)

### Inferences
- Protocol is a contract, not a running compositor. Sibling files (`graphic-stack.js`, `stack.js`, `stack/law.js`) reuse the same ids; `app/` has no consumer.
- JJK kit’s `JJK_CAP = 0.92` and `JJK_LUMA` are the GLSL twin of `LUMA_MAX` / `LUMA_W`, not a second law.

### Gaps
- No file in this checkout named `Stage.jsx` or exporting `voidMaterial` was found; #12’s “live Stage paints a night hex” is a claim about SHA `460bafd` / the shipped player, not a module on `e58077b`.
- No evidence here that `composeStashes` / `lumaCap` run on the island Three.js path.

## jjk kit: JJK_LUMA, JJK_CAP, jjkEye, jjkCover, stitch beats, 3.0 / 6.4, jjkHalt, jjkPurple bands

### Takeaway
`jjkKit` is a reusable MAPPA Limitless / Unlimited Void fragment grammar: Rec.709 cap 0.92, indigo lift, ellipse hole, cover-gated pear, Infinity halt rings, and 4-band Hollow Purple. `jjkStitch` / `jjkStitchTimed` already encode the three stills #12 wants. Named pack count is 36 plus the kit.

### Cited Findings
- Kit header: “Any dock may import jjkKit. Aether is a consumer, not the owner.” Laws: luma ≤ 0.92, indigo ink never `#000`, `fwidth` AA, glow via mix not bloom. — [kit.glsl.js L1–3](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/jjk/kit.glsl.js)
- `JJK_LUMA = vec3(0.2126, 0.7152, 0.0722)`; `JJK_CAP = 0.92`. — [kit.glsl.js L8–9](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/jjk/kit.glsl.js)
- Ink/void palette (not `#000`): `JJK_INK (0.055, 0.072, 0.110)`, `JJK_VOID (0.035, 0.055, 0.095)`, `JJK_DEEP (0.022, 0.038, 0.070)`. Blue/cyan/red/flare/purple/violet/glass/patch/cloth/skin constants follow. Centers: `JJK_C = (0.84, 0.30)`, `JJK_EYE = (0.48, 0.54)`. — [kit.glsl.js L10–26](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/jjk/kit.glsl.js)
- `jjkLuma` = Rec.709 dot of `max(c, 0)`; `jjkLift` = `max(c, JJK_INK)`; `jjkCap` = scale by `min(1, JJK_CAP / max(L, 1e-4))`; `jjkOut` = `jjkCap(jjkLift(c))`. — [kit.glsl.js L28–31](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/jjk/kit.glsl.js)
- `jjkCover`: `q = p - JJK_C`; `jjkAA(0.13 - dot(q, q), 0.0)` — a disk of radius `sqrt(0.13)` around the hero. `jjkNdL` lifts a z from the same `0.13` disk and dots a fixed key. — [kit.glsl.js L46–51](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/jjk/kit.glsl.js)
- `jjkEyeD`: ellipse SDF `length((p - JJK_EYE) / vec2(0.56, 0.66)) - 1.0`. `jjkEye` fills that well with deep void, darker inner, glass/cyan accretion rings at r 0.55 and 0.78. Comment: “Core ≥ 40% of frame. No purple.” — [kit.glsl.js L99–114](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/jjk/kit.glsl.js)
- `jjkPatches` draws hollow information frames receding toward `JJK_EYE`, then multiplies by `(1.0 - jjkCover(p))` so cards do not sit on the pup. — [kit.glsl.js L77–97](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/jjk/kit.glsl.js)
- `jjkDomain` = `jjkSpace` + two faint galaxies + `jjkEye` + glass patches, then `jjkOut`. Comment: “Ethereal black-blue. White dots. No purple hall.” — [kit.glsl.js L56–66, L116–124](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/jjk/kit.glsl.js)
- `jjkHalt(p, c, rad)` = two ring lines at `rad` and `0.72*rad`. `jjkAura` uses halt + held-frame dust (`jjkHold(t, 12)`) outside the sphere. Comment: “Infinity halt: particles stop at a sphere. Not a Fresnel wash.” — [kit.glsl.js L126–141](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/jjk/kit.glsl.js)
- `jjkPurple`: `ndv = clamp(1 - length(q)*2.6, 0, 1)`; `band = floor(ndv * 4.0) / 4.0`; four posterised bands `JJK_PURPLE*0.45 / JJK_PURPLE / JJK_VIOLET / JJK_FLARE`; swirl `sin(4*ang + 16*(1-ndv) - 5*t)` mixed toward ink. — [kit.glsl.js L155–164](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/jjk/kit.glsl.js)
- `jjkKillOn` places Blue at mid+(-0.10,0.02), Red at mid+(0.10,-0.02), Purple mass at mid `(0.42, 0.46)`, all gated by `(1.0 - jjkCover)` so the pear stays. — [kit.glsl.js L260–271](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/jjk/kit.glsl.js)
- `jjkStitch(p, t, beat)`: always starts `jjkDomain`; if `beat < 0.5` return flood; else `jjkHeroOn`; if `beat < 1.5` return domain+hero; else `jjkKillOn`. Comment: “beat 0 flood, 1 domain+hero, 2 kill.” — [kit.glsl.js L274–281](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/jjk/kit.glsl.js)
- `jjkStitchTimed`: `ht = jjkHold(t, 12.0)`; `beat = ht < 3.0 ? 0.0 : (ht < 6.4 ? 1.0 : 2.0)`. Kit `demo` returns `jjkStitchTimed`. — [kit.glsl.js L282–296](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/jjk/kit.glsl.js)
- Same file’s comment on L274 says “Timed stitch uses hold(t)/8.2”; the executable clock is 12 fps holds with thresholds 3.0 and 6.4, not a divide-by-8.2. — [kit.glsl.js L274–285](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/jjk/kit.glsl.js)
- Named stitch wrappers: `jjkStitchFlood` (beat 0), `jjkStitchDomain` (1), `jjkStitchKill` (2), `jjkBeatClock` (`jjkStitchTimed`). — [stitch.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/jjk/stitch.js)
- Hollow family (8): `jjkLapseBlue`, `jjkReversalRed`, `jjkPurpleCore` (4 ndv bands, no caption), `jjkPurpleCollide`, `jjkPurpleTunnel`, `jjkPurpleFlare`, `jjkBlueBolt`, `jjkHollowKill` (= `jjkKill`). — [hollow.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/jjk/hollow.js)
- `JJK_SHADERS = VOID + LIMITLESS + HOLLOW + SIXEYES + STITCH`; `JJK_SHADER_COUNT = 36`; `JJK_TOOLS = [jjkKit, ...JJK_SHADERS]`. — [jjk/index.js L14–20](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/jjk/index.js)
- Issue #12’s worked Void example matches those beats: t < 3 domain/flood, t < 6.4 hero+halt, then kill; GRADE last. — [issue #12](https://github.com/teerthsharma/teerthfolio/issues/12)

### Inferences
- The 3 s still is beat 0 (`jjkDomain` / flood): ellipse hole + white frames, no hero, no purple.
- The 8 s still is beat 1 then 2: cover-gated gakuran pear, Six Eyes, Gojo mudra, halt, then Blue+Red collision left of the pear.
- Thresholds 3.0 / 6.4 are hold-time seconds at 12 fps, not the director card’s 8.2 s `LENGTH`.

### Gaps
- No automated test in this pass measured whether the ellipse actually occupies ≥ 40% of a 16:9 frame; the “≥ 40%” claim is a kit comment and an #12 acceptance line, not a measured pixel share on `e58077b`.
- Comment L274 (`hold(t)/8.2`) contradicts the `jjkHold(t, 12.0)` implementation; the implementation is what a fragment would run.

## Aether 20 slots all alias jjkStitch — intended vs live 3D Stage

### Takeaway
Intended: `p-aether-lang`’s 20 named slots are aliases of the three stitch beats (plus two grade remaps and one worm mix). Live-on-#12: the 3D player ignores the kit and shows a type-led purple domain (mean RGB 45,18,57 on `460bafd`). This checkout has the alias pack and no `Stage.jsx`; an untracked Three.js `core.js` still is a hole/disk billboard, not `jjkStitchTimed`.

### Cited Findings
- Pack header: “p-aether-lang consumes jjkKit. Every slot is a beat of one stitch.” Every module `deps: ["jjkKit"]`. `CUT_SHADER_COUNT = 20`. — [cuts/p-aether-lang/index.js L1–8, L116–119](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/cuts/p-aether-lang/index.js)
- Beat-0 aliases (`jjkStitch(..., 0.0)`): `worldPlate`, `worldHatch`, `voidFlood`. — [p-aether-lang/index.js L10–16, L89–91](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/cuts/p-aether-lang/index.js)
- Beat-1 aliases (`jjkStitch(..., 1.0)`): `castSkin`, `castCloth`, `castInk`, `fxLetter`, `domainFloor`, `sixEyes`; `occludeSeal` / `lapseBlue` / `reversalRed` start from beat 1 then add a rim or one orb. — [p-aether-lang/index.js L18–47, L75–99](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/cuts/p-aether-lang/index.js)
- Beat-2 aliases (`jjkStitch(..., 2.0)`): `fxEnergy`, `fxImpact`, `hollowPurple`. — [p-aether-lang/index.js L30–36, L71–73](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/cuts/p-aether-lang/index.js)
- Timed aliases (`jjkStitchTimed`): `stillPlate`; `occludeInvert` (luma-safe invert, pup restored via `jjkCover`); `gradePrint` / `gradeNight` remap the timed stitch. — [p-aether-lang/index.js L49–69, L101–103](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/cuts/p-aether-lang/index.js)
- `purpleTunnel` is the only slot that is not a pure alias: `mix(jjkWorm, jjkStitch(..., 0.0), jjkAA(length(p - JJK_EYE), 0.28))`. — [p-aether-lang/index.js L105–108](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/cuts/p-aether-lang/index.js)
- Issue #12 control table: “Aether consumption: all 20 Aether slots alias those three beats.” Acceptance row 4: “Live player shows `jjkStitchTimed`. 3 s hole ≥ 40%. 8 s drawable domain.” Have column: “type-on-purple. T78/T93 fail. Kit exists; Stage ignores it.” 3 s RGB `45,18,57`. — [issue #12](https://github.com/teerthsharma/teerthfolio/issues/12)
- Director epic on the same probe: `p-aether-lang` play P, 3 s mean `45,18,57`, “purple domain, still type-led. Not flood/core.” — [2026-10-05-director-epic-design.md L52](file:///C:/Users/seal/Documents/GitHub/teerthfolio/docs/superpowers/specs/2026-10-05-director-epic-design.md)
- Issue #12: “A dock that ships 20 named slots that all draw the same wash is 20 ugly cards. Aether’s 20 slots already alias three beats on purpose. That is the pattern.” Also: “Until that tree samples the stitch (fullscreen plate) or rebuilds WORLD/CAST/FX to the same composition, every kit is invisible.” — [issue #12](https://github.com/teerthsharma/teerthfolio/issues/12)
- `app/` contains only `page.jsx` (island `SealGame`), `layout.jsx`, `opengraph-image.jsx`, `globals.css`, `icon.svg`. No lab route, no Stage. — [app/page.jsx](file:///C:/Users/seal/Documents/GitHub/teerthfolio/app/page.jsx)
- Grep of `*.{js,jsx}` found zero `voidMaterial` and zero `Stage.jsx`. Island `Aether.jsx` is the carousel *building* on snow, not a Void pocket. — [Aether.jsx L3–15](file:///C:/Users/seal/Documents/GitHub/teerthfolio/components/world/monuments/Aether.jsx)
- Untracked `lib/anime/cutscenes/p-aether-lang/scene.js` is a 3D *direction* card: `far: 900`, `plates: true`, `look: "p-aether-lang"`, and bubbles including `HOLLOW PURPLE!` at 18.05–18.7 s plus the two Gojeal koan lines. Stage actors: mahito / hanami / jogo / toji, Blue/Red orbs. — [scene.js L48–111, L297–301](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/cutscenes/p-aether-lang/scene.js)
- Untracked `world/core.js` draws a camera-facing `PlaneGeometry` burst: hole `1 - smoothstep(0.42, 0.58, q)`, disk and rings; palette from `shared.js` (`#061018` / `#7ec8ff`), not `jjkStitch` / `jjkKit`. Emit clamps RGB to 1.4, not `JJK_CAP`. — [core.js L21–40](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/cutscenes/p-aether-lang/world/core.js); [shared.js L79–84](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/cutscenes/p-aether-lang/world/shared.js)
- Kit / pack comments forbid VOID type and put purple on the kill only; `scene.js` still authors the shout caption. — [kit.glsl.js L1–3](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/jjk/kit.glsl.js); [scene.js L1–3, L300](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/cutscenes/p-aether-lang/scene.js)

### Inferences
- On this tree, the *intended* Aether still is one program (`jjkStitchTimed`) consumed twenty times. That is kit consumption, not twenty cards.
- The *user-visible* Aether still #12 graded is a different tree: 3D Stage / type-led purple. This checkout cannot re-grade those pixels; it can only confirm the kit exists and Stage is absent.
- The untracked `cutscenes/p-aether-lang` folder is a third object: Three.js direction + hole billboard, still caption-led, still not sampling `jjkStitchTimed`.

### Gaps
- No `moves/p-aether-lang/` or `Stage.jsx` here, so grey-pup / purple-void / type-card visuals cannot be cited from this checkout’s renderer — only from #12 / the director spec on `460bafd`.
- Whether production currently mounts the untracked `core.js` billboard is unknown; the folder is untracked on `local/grade`.

## Other cut packs: 16 × 20 = 320; which 10 script docks have no pack

### Takeaway
`CUTS_A` (8 folders × 20 = 160) plus `CUTS_D` (8 × 20 = 160) is 320 named slots across 16 folders. Ten director-script docks have no 20-slot pack. Non-Aether packs are mostly unique plate+overlay GLSL via `cutKit`, not stitch aliases.

### Cited Findings
- `CUTS_A_DOCKS`: `_template`, `home`, `p-aether-lang`, `p-caustic`, `p-epsilon-hollow`, `p-faraday`, `p-monodromy`, `p-nerve`. `CUTS_A_COUNT = 160`. — [indexA.js L23–48](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/cuts/indexA.js)
- `CUTS_D_DOCKS`: `p-planimeter`, `p-separatrix`, `p-tangle`, `pr-highway-3244`, `pr-pyrefly-4180`, `pr-tensorflow-124410`, `pr-xnnpack-10801`, `spawn-seal`. `CUTS_D_COUNT = 160`. — [indexD.js L22–50](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/cuts/indexD.js)
- `CUTS = CUTS_A + CUTS_D`; `CUTS_COUNT = CUTS_A_COUNT + CUTS_D_COUNT` (160+160 = 320); `CUTS_DOCKS` concatenates both dock lists (16 ids). `cutGlslFor` prepends `jjkKit` or `cutKit` from `mod.deps`. — [cuts/index.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/cuts/index.js)
- Issue #12 control: “2D cut packs on this tree: CUTS_A 160 + CUTS_D 160 = 320 named slots across 16 folders (20 each).” Script docks with no 20-slot pack: `p-resolvent`, `p-topological-ml-toolkit`, `pr-mujoco-3396` / `#1541` / `#3450`, `pr-nemo-relay-481`, `pr-openxla-46539`, `pr-polychrom-79`, `pr-topograph-432`, `pr-triton-kernels-22` (**10**). — [issue #12](https://github.com/teerthsharma/teerthfolio/issues/12)
- Those 10 ids are present as stack/family records in `docks.js` `FAM` (26 docks including `_template`) but have no `lib/anime/tools/cuts/<id>/`. — [docks.js L16–43, L223](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/stack/docks.js)
- Non-Aether example `home`: unique Vinland zenith/horizon watercolor, not `jjkStitch`. — [cuts/home/index.js L6–13](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/cuts/home/index.js)
- Non-Aether example `p-caustic`: unique ash/war plate; file comment still says “Madara blue Perfect Susanoo (PROTECTED look)” while #12 retargets the dock to Sukuna LOW / manhwa. — [cuts/p-caustic/index.js L1–11](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/cuts/p-caustic/index.js); [issue #12](https://github.com/teerthsharma/teerthfolio/issues/12)
- `p-planimeter` pack authors Class 1-D fluoro/board/dusk plates via `cutKit` (`defineCut`), not `classroom-kit`. School library is a separate 50-shader pack + `classroom-kit`. — [cuts/p-planimeter/index.js L1–18](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/cuts/p-planimeter/index.js); [school/index.js L28–36](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/school/index.js)
- Issue #12: “Existing packs are mostly plate+overlay, not a stitch. Aether is the only full alias-to-kit dock.” School kit “exists, unwired.” — [issue #12](https://github.com/teerthsharma/teerthfolio/issues/12)
- Director 24 plays (Mujo ×3 counts as one play in the epic; three ids in the table) plus spawn Tensura is the #12 parity set. — [issue #12](https://github.com/teerthsharma/teerthfolio/issues/12); [director-epic-design.md L45–63](file:///C:/Users/seal/Documents/GitHub/teerthfolio/docs/superpowers/specs/2026-10-05-director-epic-design.md)

### Inferences
- 16 folders includes `_template` (not a script dock). Script-facing packs are 15. The 10 missing are exactly the #12 list.
- Consuming kits rather than 20 cards means: family owns stitch functions; dock 20-slot pack aliases beats (Aether pattern). Shipping 20 unique washes without a stitch is the anti-pattern #12 names.

### Gaps
- This pass did not line-diff all 15 non-Aether packs for accidental `jjkStitch` imports; grep showed `jjkStitch` only under `jjk/` and `cuts/p-aether-lang/`.
- Distinct-maths COUNT vs 320 aliases: #12 says first-party catalog was 110 on 2026-10-06 and summing pack headers over-counts. This research did not re-count the first-party catalog on `e58077b`.

## Camera: SEAL_CAMERAS Aether from:1 d:900 vs issue #10 PULL_FAR=44 and θ=2arctan(84/d)

### Takeaway
AnimeEngine’s camera *card* for Aether is already `from: 1` (180°), `d: 900`, `eyeH: 0.4`, look `out-through-flood`. Issue #10’s live island pull on the probed SHA is `PULL_FAR = 44` with island radius 84, θ ≈ 125°. This checkout has `ISLAND_RADIUS = 84` and no `PULL_FAR` / no `lib/world/cutscene/camera.js`.

### Cited Findings
- `SEAL_CAMERAS["p-aether-lang"]`: `from: 1`, `eyeH: 0.4`, `d: 900`, `fov: [28, 44]`, `look: "out-through-flood"`, `thirds: "hole-center hero-lower-right"`. File comment: `from` is yaw in turns (1 = 180°); `d` in metres; island roam never uses this. — [seal-camera.js L1–12](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/kit/seal-camera.js)
- `cameraFor(dock)` falls back to `from: 0.2`, `eyeH: 0.85`, `d: 420`, `fov: [32, 44]`, `look: "into-seal"`. Other named docks in the card table use `d` 380–500, not 44. — [seal-camera.js L13–51](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/kit/seal-camera.js)
- `ISLAND_RADIUS = 84` in `places.js`. Aether lab sits at `[-44, -26]`. — [places.js L26, L112](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/world/places.js)
- Issue #10 title: “Director epic: six workstreams (camera, beauty, hideout, fountain, 24 docks, Band 1000)”, state OPEN. — [issue #10](https://github.com/teerthsharma/teerthfolio/issues/10)
- Local #10 spec: live grammar claimed in `lib/world/cutscene/camera.js`; default `PULL_FAR = 44`; “That is a step back on the dock. It is not out of the world.” Formula `θ = 2 arctan(R/d)`, `R = 84`. Table: d=44 → 125° “a shrug”; d=420 → 23° minimum left; d=900 → 11° “coin.” T08 fail: `PULL_FAR = 44`. Island θ = 2 arctan(84/44) ≈ 125°. Aether row wants `d ≥ 900`, FOV 28→44; “Live pull 18 m is a miss.” — [director-epic-design.md L318–323, L386, L613–630](file:///C:/Users/seal/Documents/GitHub/teerthfolio/docs/superpowers/specs/2026-10-05-director-epic-design.md)
- Issue #12: “Camera cards: SEAL_CAMERAS Aether from: 1, d: 900, eyeH: 0.4, look out-through-flood. Live pull on #10 is still PULL_FAR = 44 (θ ≈ 125°).” — [issue #12](https://github.com/teerthsharma/teerthfolio/issues/12)
- Grep of this checkout’s `*.{js,jsx}` found **no** `PULL_FAR`. `lib/world/` has no `cutscene/` directory (files: terrain, motion, river, land, places, heroMoves, store, looks, moments). — [lib/world listing](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/world)
- Untracked Aether `scene.js` sets `far: 900` on the direction card and shot 1 at `az: Math.PI`, `r: 14`, `elev: 0.4` (metres-scale orbit around a 3D set, not the 900 m island pull). — [scene.js L83, L113–125](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/cutscenes/p-aether-lang/scene.js)
- Island follow uses `NEAR_PULL = 0.35` in `CameraRig.jsx` (fraction toward a place), unrelated to `PULL_FAR`. — [CameraRig.jsx](file:///C:/Users/seal/Documents/GitHub/teerthfolio/components/world/CameraRig.jsx)

### Inferences
- Two camera systems: (1) AnimeEngine card `SEAL_CAMERAS` already encodes #10’s Aether law; (2) the live island cutscene pull #10 failed is a missing module on this grade tree.
- θ=2arctan(84/44) is the island angular diameter under the spec’s own R and d; 900 m is the Engine card and the spec’s myth-dock prefer.

### Gaps
- Cannot confirm live `PULL_FAR = 44` on `e58077b` because the symbol and `camera.js` are absent. The #10 fail is evidenced for `460bafd` / the spec, not re-measured here.
- Spec’s “live pull 18 m” for Aether vs `PULL_FAR = 44` are different numbers in the same document; this research did not find an 18 constant in JS.

## stack/genshin.glsl.js and ALU_BUDGET

### Takeaway
Both exist. `ALU_BUDGET = 64` drops lowest-priority lighting chunks. `GENSHIN_GLSL` is analytic half-Lambert / 5-row ramp / face SDF / Sobel rim / outline — a CAST lighting kit, not a Void plate and not a city renderer.

### Cited Findings
- `STASH_IDS = ["WORLD","CAST","FX","OCCLUDE","GRADE"]`; `ALU_BUDGET = 64`; `PREFETCH_BUDGET = 24`; `CORE_CHUNKS = ["outline","ramp","faceSdf","rimEdge","hold","print"]`. Chunk cost 1..32 ALU. `holdTime(t, fps=12) = floor(t*fps+1e-5)/fps`. — [stack/law.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/stack/law.js)
- `pickChunks` takes `must` first, then priority, drops when `cost + c.cost > budget`; throws if must exceeds budget. Default budget `ALU_BUDGET`. — [stack/load.js L18–52](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/stack/load.js)
- `planDock` concatenates `CORE_CHUNKS` + paper/hairRing + family extras; Aether extras are `["night","emit","invert"]`; `budget: opts.budget ?? ALU_BUDGET`. — [stack/plan.js L20, L52–61](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/stack/plan.js)
- `stack/index.js` re-exports `ALU_BUDGET` and `GENSHIN_GLSL`; `stackForDock` returns `{ plan, packed }`. — [stack/index.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/stack/index.js)
- `genshin.glsl.js`: “Analytic Genshin lighting chunks. No miHoYo textures.” `gsHalfL` = 0.5+0.5 N·L; `gsRamp3` three plates with row-shifted thresholds; `gsFaceLit` cheek-u vs light XZ; `gsRimSobel` = `fwidth(cover)*10`; `gsHullW` constant-px indigo analogue; `gsStackCast` mixes paper plate with covered body. Requires `LY_STASH_KIT`. — [genshin.glsl.js L1–74](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/stack/genshin.glsl.js)
- `docks.js` assigns Aether family `"myth"`, Genshin row 1 (cloth), look string “Unlimited Void: giant eye, white patches, Infinity halt”, extra graphics `mappaDiff` + `smearImpact`. `DOCK_IDS.length` must be 26. — [docks.js L19, L49, L78, L148, L223](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/stack/docks.js)
- Issue #12 competitor table: copy Genshin feature-flag chunks; do not copy a second PBR city or lathe human. Pocket budget ≤ 8 draws, ≤ 12k env tris, ≥ 1 naming shader, 0 extra MeshStandard cities. — [issue #12](https://github.com/teerthsharma/teerthfolio/issues/12)

### Inferences
- ALU stack is how CAST lighting keywords permute per dock. It does not replace `jjkStitchTimed` as WORLD.
- Aether’s planned extras (`night`, `emit`, `invert`) match OCCLUDE/GRADE flavour, not 20 unique WORLD cards.

### Gaps
- Whether `stackForDock("p-aether-lang")` is ever compiled into a GPU program on this tree was not traced to a canvas. `layers/index.js` exports it as an API for a parent that is not in `app/`.

## placeSeal / AnimeLab: does /lab/anime exist (app/ has no lab)

### Takeaway
`/lab/anime` does not exist in this checkout. `app/` has no `lab` segment. `placeSeal` and `AnimeLab` are not modules here. Comments and #12 still *require* that lab after the shader wave.

### Cited Findings
- `app/` files: `globals.css`, `page.jsx`, `icon.svg`, `layout.jsx`, `opengraph-image.jsx`. Home page mounts `SealGame` only. — [app/page.jsx](file:///C:/Users/seal/Documents/GitHub/teerthfolio/app/page.jsx)
- Glob `**/lab/**/*.{js,jsx,tsx}` returned 0 files.
- Grep for `placeSeal`, `AnimeLab`, `lab/anime` in `*.{js,jsx}` hits only comments: `lib/anime/tools/occlude/index.js` L7 “Lab after that: `/lab/anime?tool=sealEllipse` or `?tool=all`”; `lib/anime/tools/space/index.js` L5 “`/lab/anime?tool=<name>`”.
- Issue #12 law: verify assembled docks in in-app `/lab/anime` (paused 3 s + 8 s + play). Acceptance: “In-app lab stills at those times match, if `/lab/anime` is up.” Wiring acceptance: `/lab/anime?cut=<id>`. — [issue #12](https://github.com/teerthsharma/teerthfolio/issues/12)
- User rule / #12: do not assemble every dock in the lab until ≥ 750 named shaders. Wave target remains ≥ 750 named. — [issue #12](https://github.com/teerthsharma/teerthfolio/issues/12)
- `SEAL_SIGNS["p-aether-lang"] = SIGN.gojo`. Issue #12 gap: “Live `placeSeal` does not hold the sign through the domain.” No `placeSeal` symbol exists in this tree’s JS. — [seal-signs.js L16–19](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/kit/seal-signs.js); [issue #12](https://github.com/teerthsharma/teerthfolio/issues/12)
- `SEAL_LOOKS["p-aether-lang"]` dresses CAST: high collar `#19171f`, white hair, cyan iris, sign `gojo`. — [seal-looks.js L88–95](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/kit/seal-looks.js)

### Inferences
- Lab assemble cannot be performed on this checkout; the route is absent. Kit maths can still be inventoried as source.
- `placeSeal` in #12 is a live-player gap name, not a file here. Signs exist as a table only.

### Gaps
- Unknown whether `/lab/anime` exists on `origin/main` or SHA `460bafd`; this research only inspected `e58077b` `app/`.
- `layers/index.js` comment forbids editing `engine.js / material.js / catalog.js / cutscenes / tools` from that file; those parent engine files were not located as a running lab in this tree.

## Island LOOK_BY_ID p-aether-lang = flame must stay

### Takeaway
`LOOK_BY_ID["p-aether-lang"]` is `"flame"` and is the island visitor mutation, not the cutscene CAST dress. #12 and this assignment forbid restyling it.

### Cited Findings
- `LOOK_BY_ID` maps radioactive areas to homage looks used by `Outfit.jsx` when the roaming seal has no named gear. `"p-aether-lang": "flame"` shares flame with `p-topological-ml-toolkit` and `p-nerve`. Comment: same-look areas sit ≥ 62 m apart. — [looks.js L1–10](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/world/looks.js)
- `Outfit.jsx` imports `LOOK_BY_ID` and picks `EXPLICIT[district.id] ?? POOL[LOOK_BY_ID[district.id] ?? "spikes"]`. — [Outfit.jsx](file:///C:/Users/seal/Documents/GitHub/teerthfolio/components/world/seal/Outfit.jsx)
- Issue #12: “There is no island restyle, no new LOOK_BY_ID… Island roam: LOOK_BY_ID[p-aether-lang] = flame … Unchanged.” Acceptance 6: island roam look for that place is unchanged. Earn #11: CAST dress via `SEAL_LOOKS` + sign held; island `LOOK_BY_ID` untouched. — [issue #12](https://github.com/teerthsharma/teerthfolio/issues/12)
- Quality-gap seal-dress law: island / follow visitor pear never restyled; cutscene hero is founder dress on CAST only. — [anime-quality-gap.md L11–19](file:///C:/Users/seal/Documents/GitHub/teerthfolio/research_notes/anime-quality-gap.md)

### Inferences
- Flame on the island and gakuran / Six Eyes on CAST are different tables (`LOOK_BY_ID` vs `SEAL_LOOKS`). A theoretical WebGL plate must not write `LOOK_BY_ID`.

### Gaps
- None on the stored value: it is `"flame"` at looks.js L9.

## What ours can be theoretically: fullscreen WebGL2 sampling kits vs a RAGE-like city

### Takeaway
#12’s own theory: the still is a short program. A tab can raster a city (playgta5.com citation), but teerthfolio’s job is whether a 3 s still names the show. The cheap theoretical renderer is a fullscreen WebGL2 fragment that samples `jjkStitchTimed` (and sibling kits) as the plate the Stage already is — not a rebuilt open-world city.

### Cited Findings
- Issue #12: browser is no longer the limiter; unofficial GTA V tab proved a city can raster; remaining problem is “whether a 3 s still names the show.” Playgta5 is cited as capability + takedown, “not a method.” — [issue #12](https://github.com/teerthsharma/teerthfolio/issues/12)
- Issue #12 Active Theory row: pocket material *is* the shader; copy `voidMaterial` / hull + fragment; do not copy a MeshStandard hall per dock. FX / pocket sky: “almost none (a hull) … the place: flood, iris, gates, tear.” — [issue #12](https://github.com/teerthsharma/teerthfolio/issues/12)
- Issue #12 wire step: “The 2D stitch is not the live picture. The live picture is the 3D Stage / engine cutscene tree. Until that tree samples the stitch (fullscreen plate) or rebuilds WORLD/CAST/FX to the same composition, every kit is invisible.” Aether earn: “Live player shows `jjkStitchTimed`.” — [issue #12](https://github.com/teerthsharma/teerthfolio/issues/12)
- Issue #12 acceptance 1: “One composed stitch (WORLD + CAST + optional FX kill + GRADE). Not 20 disconnected cards.” Kit functions live in the family; the dock consumes. — [issue #12](https://github.com/teerthsharma/teerthfolio/issues/12)
- Quality-gap next-20 row 4: Aether poly = “one flood hull, no city”; stash = WORLD flood + FX HP + OCCLUDE glass; shader = `voidMaterial` flood/core; HP is FBO collision. — [anime-quality-gap.md L306](file:///C:/Users/seal/Documents/GitHub/teerthfolio/research_notes/anime-quality-gap.md)
- `jjkKit.demo` is already `vec3 demo(vec2 p, float t) { return jjkStitchTimed(p, t); }` — a full-frame `p,t` program. — [kit.glsl.js L296](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/jjk/kit.glsl.js)
- `cutGlslFor` concatenates kit GLSL + module GLSL, i.e. the string a WebGL2 fragment would compile. — [cuts/index.js L12–22](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/cuts/index.js)
- Untracked `core.js` is the opposite shape: Three.js mesh + custom fragment that does *not* include `KIT_GLSL`. — [core.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/cutscenes/p-aether-lang/world/core.js)
- #12 forbids a new renderer and a new `LOOK_BY_ID`. Industry hybrid already locked in #10. — [issue #12](https://github.com/teerthsharma/teerthfolio/issues/12)

### Inferences
- “Ours can be” = treat Stage as a fullscreen quad whose fragment is the kit stitch (Aether: `jjkStitchTimed`; school: `classroom-kit`; etc.), optionally with a pear silhouette / one kill hull on top. Information density is in the short program (ellipse hole, 4-band purple, halt rings), not in a city mesh.
- Rebuilding a RAGE-like city would solve a problem #12 says is already solved by the browser and would miss the still-naming problem.
- Consuming kits rather than 20 cards: compile `jjkKit` once; bind time; pick beat via `jjkStitchTimed` or an explicit beat uniform. The 20 Aether names are documentation aliases, not 20 programs.

### Gaps
- No WebGL2 compile/draw of `jjkStitchTimed` exists in `app/` on this HEAD, so “ours can be” is a design inference from #12 + kit source, not a running demo.
- Shader-wave gate (≥ 750 named, pretty school included) still blocks lab assemble of all 24; this inventory does not re-count toward 750.

## Issue #12 / #10 scope versus this HEAD

### Takeaway
#12 is anime parity for all 24 director docks plus spawn (craft/stills, not a second T01–T100). #10 is the director epic (camera, beauty, hideout, fountain, 24 docks, Band 1000). This `local/grade` tree holds the maths #12 says already shipped, and lacks the live player modules #12 says fail.

### Cited Findings
- #12 title: “Anime parity for all 24 cutscenes (script stills, not playback)”, state OPEN. Relates to #10. Does not reopen #7 or #9. Probe `460bafd` 2026-10-05: 24 started, 0 black-void, score 4.8/10 (48 pass / 52 fail on #10 ledger). `origin/main` at issue open `a476f70`. — [issue #12](https://github.com/teerthsharma/teerthfolio/issues/12)
- #10 title/state as above. Local spec is `docs/superpowers/specs/2026-10-05-director-epic-design.md`. — [issue #10](https://github.com/teerthsharma/teerthfolio/issues/10)
- This HEAD `e58077b` is not `460bafd` and not `a476f70`. — git `rev-parse` on `local/grade`
- Draft body matching #12 also lives at `.donotcommit/issue-anime-parity.md` (untracked). — [issue-anime-parity.md](file:///C:/Users/seal/Documents/GitHub/teerthfolio/.donotcommit/issue-anime-parity.md)

### Inferences
- A report that says “the repo already has X” must cite `lib/anime/**` on this HEAD. A report that says “the live player shows Y” must cite #12 / #10 / the director spec on `460bafd`, and must say those player files are missing here.

### Gaps
- No fresh Chrome stills were taken for this research (notes-only). Live RGB `45,18,57` is #12’s `460bafd` number, not `e58077b`.
