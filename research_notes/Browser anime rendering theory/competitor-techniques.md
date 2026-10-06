# Competitor techniques for teerthfolio cutscenes

Research date: 2026-10-06. Scope: named techniques and math only (no meshes, no piracy). Every Cited Finding has a URL. Observation vs sourced fact is labeled. Feeds [teerthsharma/teerthfolio#12](https://github.com/teerthsharma/teerthfolio/issues/12).

## ArcSys: Base/SSS/ILM channels, inverse hull, dual normals, square UV

### Takeaway
Strive paints cel behavior into four maps, not a Lambert lobe: Base albedo + shininess, SSS as authored shadow color, ILM as four independent control channels (R highlight intensity, G shade threshold, B highlight power, A inner line), plus an outline-bleed map. Outline is the back-face / inverse-outer method; a second normal set lives in tangents so extrusion does not fight the lighting normals.

### Cited Findings
- The community Arc System Works Modding Book page “Functions of Base/SSS/ILM textures” (author @muuyo, labeled a preliminary draft) is the live channel table for Guilty Gear Strive. — [ASW Modding Book: texture images](https://muuyo.github.io/asw-modding-book/modding-texture/texture-images.html)
- `CHR_base` is the character’s base color. Its **alpha** “decides how shiny the material is.” — [ASW Modding Book: texture images](https://muuyo.github.io/asw-modding-book/modding-texture/texture-images.html)
- `CHR_Sss` is “the shadow color of your character — this game has no shadow lighting handling (mostly).” SSS **alpha** selects material-driven gradients: **0.3** → Asano gradient (usually hair); **0.7** → Taste color; those gradients live in the material, not in the texture, so the alpha is usually left black unless instancing. — [ASW Modding Book: texture images](https://muuyo.github.io/asw-modding-book/modding-texture/texture-images.html)
- `CHR_decal` overlays a “transparent” texture onto the base (small text). Grey means transparent; values lighter or darker become visible. — [ASW Modding Book: texture images](https://muuyo.github.io/asw-modding-book/modding-texture/texture-images.html)
- `CHR_olm` (only on some characters) “defines how much of the SSS bleeds into the outline.” Black → black outlines. Brighter → outline picks up SSS color. Full white is believed to glow. — [ASW Modding Book: texture images](https://muuyo.github.io/asw-modding-book/modding-texture/texture-images.html)
- `CHR_Detail` is small lines / scrapes / folds **overlaid onto Base** (distinct from decal islands). — [ASW Modding Book: texture images](https://muuyo.github.io/asw-modding-book/modding-texture/texture-images.html)
- `CHR_ILM` must be edited in **Photoshop channels mode**. Each channel is a different job: — [ASW Modding Book: texture images](https://muuyo.github.io/asw-modding-book/modding-texture/texture-images.html)
  - **R** “stores how bright highlights are — e.g. how bright the shiny part of shiny materials is.”
  - **G** “defines when something becomes shaded.” Book thresholds: **G < 0.1** permanently very dark; **G < 0.25** permanently shaded; **G = 0.5** baseline (usual); **G = 1** permanently **unshaded**.
  - **B** “is how powerful that part is highlighted.” Book default **0.5**; darker or brighter applies more “highlight” (parts become brighter). The book’s wording is **power/amount**, not explicitly “size.”
  - **A** “manually draws outlines onto the model at that spot no matter what”; unlike Detail, OLM is applied and it “works entirely like” a true outline.
- The same book’s Mesh/Model TOC names two outline chapters: “Setting up outlines (read this first)” and “Setting up **tangent-based** outlines.” Those chapter titles are the book’s own evidence that Strive stores a second outline-normal set in the tangent stream. Direct URLs for those chapters 404’d when fetched as `/modding-model/setting-up-outlines.html` on 2026-10-06. — [ASW Modding Book TOC](https://muuyo.github.io/asw-modding-book/modding-texture/texture-images.html)
- Official ASW Academy slide deck **“Guilty Gear Toon Line Control Techniques [ENG ver.]”** (Docswell, listed 2025-11-28) is tagged `#インバース・アウター・メソド` (inverse-outer method), `#トゥーンシェーディング`, `#アウトライン描画`. Author account: アークシステムワークス株式会社 / @ASW_Academy. — [Docswell 5LVY67-GG-Toonline-Eng](https://www.docswell.com/s/ASW_Academy/5LVY67-GG-Toonline-Eng)
- The Japanese sibling deck **CEDEC2024 ギルティギアトゥーンライン制御テクニック** (KVP3QE) states they chose **背面法** (back-face method) for the Guilty Gear series from **Guilty Gear Xrd** onward. DuckDuckGo’s indexed snippet of that deck: “ギルティギアシリーズで背面法を選んだ理由 「GUILTY GEAR Xrd」以降のアークシステムワークスの3D格闘ゲーム.” — [Docswell KVP3QE-GG-Toonline](https://www.docswell.com/s/ASW_Academy/KVP3QE-GG-Toonline); [Docswell ASW_Academy profile](https://www.docswell.com/user/ASW_Academy)
- Converted slide metadata for the same CEDEC deck: “「ギルティギア」のビジュアルで使用される「背面法アウトライン」の制御技術を紹介します。特にトゥーン表現において重要な「輪郭線」に焦点を当てて解説.” — [convert.docswell KVP3QE](https://convert.docswell.com/s/ASW_Academy/KVP3QE-GG-Toonline.md)
- A public talk recording of the same line-control session exists: “How to Draw Beautiful Lines in 3D: Guilty Gear Series Toon Line Control” (2025-04-30). — [YouTube g4lQR4ivWWg](https://www.youtube.com/watch?v=g4lQR4ivWWg)
- Inverse-hull / back-face outline is the industry-standard extrusion \(P' = P + n\,w\) with front faces culled so only the extruded shell’s inward faces remain as a silhouette ring. Unity’s widely cited walkthrough implements exactly that (second pass, invert cull, extrude along normals). — [Roystan: Outline Shader](https://roystan.net/articles/outline-shader/)
- Issue #12’s craft brief already encodes the Strive map as the thing this site **copies the jobs of**, not the Strive mesh: “ILM green = shadow threshold, red = highlight intensity, blue = highlight size, alpha = inner line. Inverse-hull outline with a *second* normal set stuffed in tangents… Square UVs so inner lines stay infinite-resolution.” — [teerthfolio issue-anime-parity](file:///C:/Users/seal/Documents/GitHub/teerthfolio/.donotcommit/issue-anime-parity.md)

### Inferences
- **ILM as a 4-channel ALU, not a color.** A typical Strive shade test (reconstructed from the book’s G thresholds, not from leaked HLSL) is a **quantizer offset by G**:
  \[
  s = \mathrm{step}\bigl(t_{\mathrm{shade}}(G),\; N\cdot L\bigr)
  \]
  with \(G=0.5\) as the identity threshold, \(G\to 1\) forcing lit, \(G\to 0\) forcing shade. R then scales a specular/shine lobe’s **intensity**; B scales how readily that lobe turns on (book: “powerful”; #12’s “size” is the same knob if the lobe is a `smoothstep` width). A is a **texture-space inner line** composited like the geometric outline (OLM-aware).
- **Why a second normal in tangents.** Lighting normals on Xrd/Strive are **hand-authored** so \(N\cdot L\) bands read as ink, not as a sculpted nose. Inverse-hull extrusion needs a **continuous outward field** or the outline tears at hard edges and cusps. Packing \(n_{\mathrm{outline}}\) into the tangent (or tangent.xyz + a sign) lets one vertex stream carry both: \(P' = P + n_{\mathrm{outline}}\,w\), while the pixel shader still uses \(n_{\mathrm{light}}\). The book’s dedicated “tangent-based outlines” chapter is the operational proof of that split, even though the chapter HTML 404’d this session.
- **Screen-space width.** Production hulls usually scale \(w\) by view depth (\(w \propto |P_{\mathrm{view}}.z|\) or `clip.w`) so the ring is constant in pixels. ASW Academy’s talk is specifically about **controlling** that ring (where it thickens, where it dies). The Docswell tags name the method; the PDF pages were not text-extractable in this pass.
- **Square UV / “infinite-resolution” inner lines.** ILM.A and Detail are **UV-space** strokes. If UV islands are unique, large, and **square** (uniform texel aspect), a 1-texel line has constant thickness and does not shear with the mesh. Thresholding a high-contrast channel (`step` / `smoothstep` on A) keeps the stroke a hard ink edge rather than a bilinear grey ribbon — that is the “infinite” claim in #12, not a true infinite texture. **Not verified from the Docswell PDF this session**; treat as inference from ILM.A’s job + the line-control talk’s existence.
- **Vertex colors as threshold overrides** (named in #12) are consistent with G being a per-texel threshold: a vertex color can shift the same \(t_{\mathrm{shade}}\) without a second ILM.

### Gaps
- The Docswell ENG/CEDEC decks are slide viewers; this pass could not extract the slide bodies (no usable `.md` dump, embed is JS). Exact ASW formulas for \(w\), dual-normal packing (which tangent components, handedness), and “square UV infinite lines” therefore lack a primary-quote this session.
- Book outline chapters exist in the TOC but the guessed mdbook path 404’d. Need the real HTML path (likely under `modding-mesh/` or `print.html`).
- GDC 2015 “Guilty Gear Xrd’s Art Style / Blending of 2D and 3D” is the historical primary for authored lighting normals; it was not re-fetched here. Do not treat GDC slide numbers as verified in this file.
- Blue-channel nuance: book = highlight **power**; #12 = highlight **size**. Same artist knob, two names. No official ASW shader comment was retrieved to break the tie.

## Genshin: face SDF lookup, ramp quantizer, feature-flag chunks → defineModule/glslFor

### Takeaway
Hoyo face lighting is a **2D angle lookup**, not \(N\cdot L\) on a sculpted nose: each face texel stores the light angle at which that texel enters shadow. Body lighting is a **1D ramp** (half-Lambert → quantized plates, row-selected). Features (ramp, rim, outline, face, hair) are a **chunk stack** — the same composition law as `defineModule` + `glslFor` (deps first, each chunk once).

### Cited Findings
- ReefSnax’s 2026 baker (credits akasaki1211 + nagakagachi) states the Hoyo law in one sentence: “Genshin Impact, Honkai, and most games chasing that look don't compute face shadows from geometry at runtime. The face gets a **single grayscale texture where each pixel stores the light angle at which that texel enters shadow**.” Hoyo’s official maps are **hand-authored**; a physical bake is only an input. — [ReefSnax/blender-sdf-face-shadow-baker](https://github.com/ReefSnax/blender-sdf-face-shadow-baker)
- Bake pipeline (technique, not a game file): a sharp sun sweeps **0° (front-lit) → 180° (back-lit)**; each step bakes direct diffuse to UV and thresholds to a binary mask; `ShadowThresholdMap.exe` interpolates the mask sequence into the final SDF via signed-distance fields. Runtime import (Unity/Poiyomi): **single-channel, sRGB off**, `Light Map Mode → SDF`, then set face **forward/right axes**. — [ReefSnax README](https://github.com/ReefSnax/blender-sdf-face-shadow-baker); [akasaki1211/sdf_shadow_threshold_map](https://github.com/akasaki1211/sdf_shadow_threshold_map)
- Art-direction override is explicit: “Hoyo and ArcSys both keep zones like the under-eye area lit past the angle where geometry says shadow.” — [ReefSnax README](https://github.com/ReefSnax/blender-sdf-face-shadow-baker)
- Ben Ayers’ Genshin recreation (EEVEE, fan work, disclaims miHoYo IP) lists the **named elements**: cel-shaded real-time shadow; **hand-painted** contact shadows; **no self-shadowing** on the character; **no partial lighting** (fully in or fully out of a large world shadow); **artificial SSS** as a gradient on either side of the terminator, driven in-engine by **per-character shadow ramps**; metal **matcap** + real-time spec; hair shine as a **mask for a real-time specular**; **geometric outline** (Solidify / second material); rim that is **even thickness, both sides, does not conform to the mesh** (closer to a composite Sobel than Fresnel); face “snap” is **“a custom light map… that shifts and mirrors itself based on the direction the character is facing relative to [the light]”** — explicitly **not** custom normals. — [Ben Ayers: Recreating the Genshin Impact Shader](https://www.bjayers.com/blog/9oOD/blender-npr-recreating-the-genshin-impact-shader)
- Colin Leung’s URP toon example (7.8k stars) is the widely cited **open lighting equation** for this family: a custom lit shader + outline pass, not Unity Standard. It is **not** a dump of miHoYo shaders. — [ColinLeung-NiloCat/UnityURPToonLitShaderExample](https://github.com/ColinLeung-NiloCat/UnityURPToonLitShaderExample)
- Adrian Mendez’s URP breakdown is another reputable recreation (ArtStation), found via search; page body was not fully extracted this pass. — [ArtStation wJZ4Gg](https://adrianmendez.artstation.com/projects/wJZ4Gg)
- This tree already encodes the Hoyo grammar as analytic chunks (no miHoYo textures): half-Lambert → **5-row ramp** (`lightmap.a` analogue, rows 0–4 = skin/cloth/metal/hair/leather); face = `F·L` vs cheek **u**, not Lambert facets; rim = `fwidth(cover)` Sobel, not Fresnel; outline = constant-px indigo hull. — [lib/anime/stack/genshin.glsl.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/stack/genshin.glsl.js)
- `gsRamp3` is a **1D quantizer**: two thresholds \(t_0,t_1\) that **shift with material row**, mixing fill/mid/key through `lyAA` (fwidth step). — [genshin.glsl.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/stack/genshin.glsl.js)
- `gsFaceLit(u, Lxz)` is `smoothstep` of cheek coordinate times light sign — a 2D lookup stand-in for the SDF compare. — [genshin.glsl.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/stack/genshin.glsl.js)
- `gsHairMix` is a Kajiya–Kay-style strand highlight: tangent \(T\) from up minus \(N_y\), shifted by strand, then \(\sin\theta = \sqrt{1-(T'\cdot H)^2}\) raised to a power and stepped. — [genshin.glsl.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/stack/genshin.glsl.js)
- Stack kits expose those functions as separately named modules (`gsOutline`, `gsRamp`, `gsFaceSdf`, `gsRimEdge`, `gsHairRing`, `gsHold`, …) with `deps` on `genshinKit`. — [lib/anime/stack/kits.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/stack/kits.js)
- `glslFor` on this tree is a **dep-first concat**: walk `deps`, emit each module **once**, join GLSL. That is the feature-flag stack. — [lib/anime/tools/sakuga/index.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/sakuga/index.js); [catalog inventory](file:///C:/Users/seal/Documents/GitHub/teerthfolio/research_notes/One%20thousand%20topology%20shaders/catalog%20inventory.md)
- `defineModule` is a named record `{ name, doc, deps, glsl, uniforms?, demo }` — a chunk, not an uber-shader. — [lib/anime/tools/jjk/define.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/jjk/define.js)
- Issue #12: “Chunks load; the look is the *sum of flags*, not one uber-shader. Stack named GLSL chunks (`defineModule` + `glslFor`).” — [issue-anime-parity](file:///C:/Users/seal/Documents/GitHub/teerthfolio/.donotcommit/issue-anime-parity.md)

### Inferences
- **Face SDF math (runtime).** With a grayscale map \(S(u,v)\in[0,1]\) storing the **entry angle** and a head-space light \(L_{xz}\):
  \[
  \theta = \operatorname{atan2}(L_x, L_z),\quad
  u' = \operatorname{sign}(L_x)\,u,\quad
  \mathrm{lit} = \mathbf{1}\bigl[S(u',v) > t(\theta)\bigr]
  \]
  Equivalently ReefSnax/Poiyomi: compare SDF to a remapped \(\mathrm{F}\cdot L\) and **flip U** when the light crosses the face sagittal plane. This is a **2D lighting LUT**. Geometry \(N\cdot L\) is not consulted for the cheek.
- **Ramp math (body).** Half-Lambert \(h = \tfrac12 + \tfrac12 N\cdot L\), then a **1D sample** `ramp.sample(h, row)` or an analytic 3-plate `mix` of fill/mid/key. Row comes from a lightmap/ID channel (`lightmap.a` / `gsRow`). That is quantization: a continuous cosine becomes two or three printed plates plus a thin SSS band (Ayers).
- **Feature flags as ALU.** Unity `shader_feature` / Hoyo multi_compile strips unused passes. `glslFor(['gsFaceSdf','gsRimEdge','gsOutline'])` is the same algebra: only the named chunks’ ALU lands in the program; `cost.alu` on catalog modules is the budget knob. Do **not** ship a second PBR city or a lathe human under `MeshStandard` — #12 forbids it; fail the 32 px silhouette test → 2D.
- **Rim is coverage Sobel, not Fresnel.** Ayers: even thickness, both sides, ignores mesh. This tree: `gsRimSobel = clamp(fwidth(cover)*10)`. Mapping is already written.

### Gaps
- No miHoYo shader source was opened (constraint). Channel packing of official lightmaps (which atlas row is skin vs cloth; exact `lightmap.rgb` jobs) is only inferred from recreations.
- NiloCat README body did not render in the GitHub snapshot (JS). Lighting-equation HLSL raw URL did not load in the browser this pass.
- Official Hoyo docs do not exist for this; all public math is reverse-engineering / recreation. Label runtime formulas as **recreation-grade**, not vendor-grade.

## MAPPA JJK Unlimited Void: information flood, Infinity halt, Hollow Purple, camera grammar

### Takeaway
Lore: Unlimited Void is an **information flood** (infinite sensory data), not a blast; Hollow Purple is **Lapse Blue (pull) + Reversal Red (push)** colliding into an imaginary mass. Picture (observation): exterior black sphere, interior ethereal black-blue + white card frames receding into a black-hole vanishing point. Purple is the **kill only**. A purple hall is the miss.

### Cited Findings
- Fan-guide lore (not MAPPA production notes): Unlimited Void (無量空処, *Muryōkūsho*) “fills the target's mind with everything… Infinite sensory information, infinite knowledge, infinite perception, all at once.” “No fire, no slashing, no monsters, just too much consciousness.” — [jjk.guide: Unlimited Void](https://www.jjk.guide/techniques/unlimited-void)
- Same guide: vs Jogo the domain ended the fight instantly; in Shibuya Gojo “threaded it precisely,” full effect on curses, fragments on civilians at the edge; vs Sukuna it is barrier domain vs barrierless shrine — “Infinite information against infinite cutting.” — [jjk.guide: Unlimited Void](https://www.jjk.guide/techniques/unlimited-void)
- Hollow Technique: Purple (虚式「茈」, *Kyoshiki・Murasaki*): “**Blue pulls. Red pushes. Purple erases.**” It “combines attraction and repulsion into an **imaginary mass** that removes anything it touches from existence.” Firing it requires channeling positive and negative cursed energy simultaneously through Limitless. — [jjk.guide: Hollow Technique Purple](https://www.jjk.guide/techniques/hollow-technique-purple)
- Fandom wiki pages exist (`Unlimited Void`, `Domain Expansion`) but Cloudflare-blocked this session; treat jjk.guide as a secondary fan compilation of manga/anime canon, not a production art book. — [Fandom Unlimited Void](https://jujutsu-kaisen.fandom.com/wiki/Unlimited_Void)
- **No MAPPA compositor PDF, no official art-book quote on particle-card construction, was found** in a 2026-10-06 search for “Unlimited Void MAPPA compositing production notes.” Results were lore pages and edits, not staff interviews. — [DuckDuckGo search](https://duckduckgo.com/?q=Jujutsu+Kaisen+Unlimited+Void+MAPPA+compositing+production+notes+domain+expansion)
- This tree’s JJK kit states the **picture law** in comments and GLSL: “MAPPA digital space, not a purple hall”; “Ethereal black-blue. White dots. No purple hall”; “White information frames recede toward the eye. Hollow cards, not stickers”; “Black hole. Thin white accretion. Core ≥ 40% of frame. No purple”; “Infinity halt: particles stop at a sphere. Not a Fresnel wash”; “Kill sits LEFT of the hero… Blue and Red still parent the collide.” — [lib/anime/tools/jjk/kit.glsl.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/jjk/kit.glsl.js); [lib/anime/tools/jjk/void.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/jjk/void.js)
- Encoded domain math already in-tree (analytic, not a copied frame):
  - Space: hash-cell stars `step(0.993)` / `step(0.9982)` on a 140×80 grid over a black-blue lift. — [kit.glsl.js `jjkSpace`](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/jjk/kit.glsl.js)
  - Cards: rounded-box SDF frames whose centers `mix` from screen corners **toward `JJK_EYE`** with increasing mix factors (0.04 → 0.78) and shrinking radii — a **perspective stack into a vanishing point**. — [`jjkPatches`](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/jjk/kit.glsl.js)
  - Eye / hole: ellipse SDF, fill dark, thin glass accretion rings at r=0.55 and 0.78. — [`jjkEye`](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/jjk/kit.glsl.js)
  - Exterior barrier: `length((p-c)/radii)-1` dark sphere; interior is `jjkDomain`. — [`jjkBarrierD`](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/jjk/kit.glsl.js)
  - Infinity halt: particles only where \(r > r_0\) (`outside = 1 - fill(r-rad)`), plus two shell lines at `rad` and `0.72 rad`. — [`jjkHalt` / `jjkAura`](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/jjk/kit.glsl.js)
  - Purple: 4 posterised `ndv` bands + angular swirl; Blue/Red are separate disks that **parent** the collide. — [`jjkBlue`/`jjkRed`/`jjkPurple`/`jjkKillOn`](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/jjk/kit.glsl.js)
- Director script camera for `p-aether-lang`: pull \(d\ge 900\); into **180°**, eye 0.4 m, looking **out** through the flood; fog off; 3 s must show flood or core ≥ 40%; kill = Hollow Purple collision, not a caption. Hue 256. Purple stays on the kill. — [anime-quality-gap.md](file:///C:/Users/seal/Documents/GitHub/teerthfolio/research_notes/anime-quality-gap.md); [2026-10-05-director-epic-design.md](file:///C:/Users/seal/Documents/GitHub/teerthfolio/docs/superpowers/specs/2026-10-05-director-epic-design.md)
- Issue #12 compositor stack for this dock: beat0 WORLD flood; beat1 CAST Six Eyes + FX Infinity halt; beat2 FX Blue+Red collide; GRADE last. “Type is not the subject. Purple lives on the kill only.” — [issue-anime-parity](file:///C:/Users/seal/Documents/GitHub/teerthfolio/.donotcommit/issue-anime-parity.md)

### Inferences
- **Information-flood as particle cards into a vanishing point.** Observation of MAPPA’s TV stills (S1 Jogo domain; S2 Shibuya) plus the kit’s `mix(corner, JJK_EYE, t)` construction: white rectangular **billboards** (not a volume of glyphs) shrink and converge on a dark well. That is a **projective stack**, not a purple volume. Compositor analogue: cards in 2.5D, motion toward a single vanishing point, additive-clamped.
- **Infinity halt.** Lore Infinity stops attacks at a radius. Picture: dust exists **outside** a sphere and dies at the shell (`step` + ring). It is a **radial gate**, not a Fresnel rim. Six Eyes are luminous cyan irises on the figure, not the domain’s subject.
- **Blue+Red→Purple as colliding fields.** Canon: attraction + repulsion → imaginary mass. Picture: two parent orbs, overlap region posterised purple. A single magenta sphere with a caption is not the technique. #12 / T93: the collision must be drawable.
- **Camera grammar of the domain.** Exterior: black sphere (barrier). Interior: you are **inside**, looking out through the flood (180°, eye 0.4 m). The hole occupies ≥ 40% so the still names the domain. Pull \(d\ge 900\) is the cut into the barrier; it is not a hallway dolly.
- **What is *not* a purple hall.** The domain’s plate is **black-blue + white + a hole**. Purple hue on the WORLD plate, VOID type-on-purple, or a magenta room are the current miss (`rgb(45,18,57)`, T78/T93). Purple is FX kill only.

### Gaps
- No official MAPPA / *Jujutsu Kaisen Key Animation Book* quote on card counts, sphere radius, or Six Eyes composite was retrieved. Visual construction above is **observation + this repo’s encoding**, not a staff paper.
- jjk.guide is a fan site (© Gege Akutami / Shueisha / MAPPA disclaimer). Prefer manga chapter quotes if the report writer can open official volumes; this pass did not.

## Ufotable: bloom, impact frames, dirt/gold value ladder (Fate)

### Takeaway
Ufotable’s still is a **compositor stack** (glow, haze, lens, 3D camera through a built set, 2D characters) with energy as **painted shafts**, not Lambert bloom-as-the-look. Fate’s readable ladder is **dirt road / warm dust / gold treasure / one saturated red** — value and metal, not a magenta card.

### Cited Findings
- Hozuna (2026-07-11, editor-bylined, secondary): “Compositing is where drawn characters, backgrounds, lighting, **glow, haze, and lens effects** are assembled into the finished image. At most studios, it functions as a quiet final pass. Ufotable puts it [in front].” Environments are built in **3D**, a virtual camera moves through them, then 2D characters are combined — “the impossible camera.” Fate/Zero and Kara no Kyoukai established the reputation before Demon Slayer. — [Hozuna: The Ufotable Look](https://hozuna.com/deep-dives/the-ufotable-look)
- NamuWiki history page (secondary, 2026-08-27 snippet): “the true value of Fate/Zero is its **directing**… the drawing was also supported.” Not a shader paper. — [NamuWiki: ufotable/history](https://en.namu.wiki/w/ufotable/%EC%97%AD%EC%82%AC)
- Official studio site exists; it is news/shop, not a technique manual. — [ufotable.com](https://www.ufotable.com/en)
- This tree’s Ufotable family is **shafts as geometry**: hard-edged painted bands, warm gold, `fwidth` lips; dust motes **only inside** the shaft; night-fight warm rim + indigo fill **without** shafts. — [lib/anime/tools/sakuga/ufotable.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/sakuga/ufotable.js)
- Highway pack: WORLD “Ufotable road: `#2a241f` dirt, bruise sky, gold dust hinge”; CAST “hull `#221818`, 2.0px, cape never blooms”; GRADE “warm dust, cape red is the only sat.” — [lib/anime/tools/cuts/pr-highway-3244/index.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/cuts/pr-highway-3244/index.js)
- Director script: `pr-highway-3244` = Fate/Zero Gordius, Ufotable cinematic, road `#2a241f`, cape `#c3122e`, **not Rimuru**; `pr-polychrom-79` = Gilgamesh, Ufotable Fate gold `#d9a441`, stage `#c3122e`, gates as gold rings, Ea spiral only on kill. — [anime-quality-gap.md](file:///C:/Users/seal/Documents/GitHub/teerthfolio/research_notes/anime-quality-gap.md)
- Catalog already has a bloom pass as **excess-above-threshold** (Unity soft knee) + dual Kawase; “lit luma ≤ 0.92 is out of bloom.” That is the site’s bloom law: emit only, not the plate. — [catalog inventory / bloom-kawase](file:///C:/Users/seal/Documents/GitHub/teerthfolio/research_notes/One%20thousand%20topology%20shaders/catalog%20inventory.md)
- Issue #12 / Honkai-ZZZ line: “Bloom only on `uEmit` above the luma cap. Bloom as the look” is forbidden. — [issue-anime-parity](file:///C:/Users/seal/Documents/GitHub/teerthfolio/.donotcommit/issue-anime-parity.md)

### Inferences
- **Bloom.** Ufotable energy is a **thresholded highlight** (swords, gates, chariot sparks) plus shaft geometry, then a compositor glow. Math analogue: `softKnee(luma - T)` → Kawase pyramid → add, with \(T\) high enough that dirt/skin stay out. This site’s `LUMA_MAX 0.92` + `uEmit` isolation is the correct port. Blooming the albedo plate is the magenta-card failure on Polychrom.
- **Impact frames.** Industry term: 1–3 frames of flattened, high-contrast graphic (white flash, ink smash, inverted plate) on the hit. Ufotable Fate/Demon Slayer uses them as **held beats** inside the composite, not as a continuous filter. This pass found no official Ufotable PDF defining the frame count. Treat as **observation**. Site analogue: OCCLUDE invert / FX one-hull kill, held on twos — not a 60 fps smear.
- **Dirt/gold value ladder (Fate).** Observation of Fate/Zero / UBW stills + this script’s locked hexes, not an art-book table:
  | rung | job | hex in-script |
  |---|---|---|
  | dirt | road / temple stone | `#2a241f` |
  | ink hull | figure edge | `#221818` |
  | gold | treasure / dust hinge | `#d9a441` |
  | cape/blood sat | the only high chroma | `#c3122e` |
  The ladder is **value then one sat**, not a hue wash. Polychrom stuck at `rgb(155,25,89)` at 3 s **and** 8 s is the ladder collapsed into magenta.

### Gaps
- No Ufotable compositing paper, BD booklet quote, or official “impact frame” spec was found. Hozuna/NamuWiki are secondary.
- “Dirt/gold value ladder” is the user’s / script’s name; it is not a published Ufotable term. Do not attribute the table to the studio.
- Filament / Unity official toon docs were not fetched this pass for Ufotable (they do not document Ufotable).

## Live2D: barycentric mesh deform, no lighting equation

### Takeaway
Live2D Cubism is a **drawn ArtMesh** whose vertices move. Official docs name **warp / rotation deformers** and **linear interpolation between keyforms** — not a lighting BRDF. GPU rasterization of each triangle is ordinary barycentric interpolation of those deformed verts. There is no \(N\cdot L\).

### Cited Findings
- Official Cubism Editor manual (updated **2026-04-07**): “Cubism allows you to deform objects by moving individual **mesh vertices**… it is very time-consuming to manually move the ve[rtices]” — deformers exist to move many verts at once. — [Live2D: About Deformers](https://docs.live2d.com/en/cubism-editor-manual/deformer/)
- **Warp deformer:** “Deforming a deformer with a mesh in a warp deformer also deforms the mesh inside. Size and opacity can also be adjusted.” — [About Deformers](https://docs.live2d.com/en/cubism-editor-manual/deformer/)
- **Rotation deformer:** mesh is rotated by a specified angle; size and opacity adjustable. — [About Deformers](https://docs.live2d.com/en/cubism-editor-manual/deformer/)
- **Linear interpolation:** “the interpolation of two points with different coordinates by connecting them with a straight line.” Large rotations through linear keyform interpolation **shrink** because each vertex travels a chord, not an arc. Extended interpolation is the official fix. — [About Deformers](https://docs.live2d.com/en/cubism-editor-manual/deformer/)
- ArtMeshes are generated as triangulated meshes (auto or manual). Auto generator (updated **2026-03-03**) sets point density in **pixels at a 1024 texture**; a value of 10 at 2048 px becomes a 20 px margin. Alpha threshold decides what is transparent. — [Live2D: Automatic Mesh generator](https://docs.live2d.com/en/cubism-editor-manual/mesh-edit/)
- Issue #12: Live2D/Spine “reads as anime because it *is* drawn.” Copy: guest that fails Genshin → 2D card. Do **not** replace the 3D pear with a Live2D human. — [issue-anime-parity](file:///C:/Users/seal/Documents/GitHub/teerthfolio/.donotcommit/issue-anime-parity.md)

### Inferences
- **Barycentric deform.** Official docs never say “barycentric.” The math is still mandatory for a triangulated ArtMesh: for triangle \(ABC\) with barycentric \((\lambda_a,\lambda_b,\lambda_c)\), \(\lambda_a+\lambda_b+\lambda_c=1\), \(\lambda_i\ge 0\):
  \[
  P = \lambda_a A + \lambda_b B + \lambda_c C,\quad
  uv = \lambda_a\,uv_A + \lambda_b\,uv_B + \lambda_c\,uv_C
  \]
  Warp deformers typically place the child in a **lattice**; interior verts are bilinear/barycentric in lattice cells, then the ArtMesh triangles rasterize with the formula above. Keyform blend is **linear in vertex position** (the official “linear interpolation”), which is why large rotations collapse — that is the chord vs arc problem they document.
- **No lighting equation.** There is no \(N\), no \(L\), no ramp. Color is the **PSD texel**. Clip masks and blend modes are compositing. That is why a Live2D guest “reads as anime”: it is the drawing. A 3D pear under `MeshStandard` is the opposite failure mode.

### Gaps
- English URL `.../warp-deformer/` 404’d (2026-10-06) even though the deformer index links it. Japanese same slug also 404’d. The warp-deformer **page body** (lattice division, bezier vs linear) was not retrieved — only the index summary.
- Cubism Native/Web SDK source (barycentric in the runtime) was not opened. Official docs do not name the word; do not claim Live2D published a barycentric paper.

## Shared: 3-tone cel `step(N·L)`, back-face hull, hold on twos

### Takeaway
The shared toon kernel is three cheap operators: **quantize** the Lambertian cosine, **extrude a back-face hull** for ink, **hold time at 12 fps** so drawings do not swim. lilToon is that kernel plus a VTuber feature stack (ramp, rim, matcap, outline, emission) with editor-time flag stripping.

### Cited Findings
- Cel shading’s textbook operator is a **quantized \(N\cdot L\)**: one or more thresholds turn a smooth cosine into flat plates. Wikipedia’s article (standard reference) describes the discrete shading / highlight / outline triad. — [Wikipedia: Cel shading](https://en.wikipedia.org/wiki/Cel_shading)
- Inverse-hull outline (shared with ArcSys / Genshin / lilToon): second pass, cull front, \(P' = P + n\,w\). — [Roystan: Outline Shader](https://roystan.net/articles/outline-shader/); [ASW Academy 背面法](https://www.docswell.com/s/ASW_Academy/KVP3QE-GG-Toonline)
- Traditional animation “on twos” = one drawing held for **two frames of 24 fps** = **12 fps**. This tree encodes it as `skTwos(t) = skHold(t, 12.0)` with `skHold = floor(t*fps)/fps`, and locks grain/tooth to that held time so texture does not swim. — [lib/anime/tools/sakuga/kit.glsl.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/sakuga/kit.glsl.js); [lib/anime/tools/sakuga/hold.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/sakuga/hold.js); JJK kit uses the same `jjkHold(..., 12.0)` — [kit.glsl.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/jjk/kit.glsl.js)
- This tree’s 3-tone: `jjkCel3` / `gsRamp3` / `skCel3` = two `smoothstep`/`lyAA` thresholds mixing dark/mid/lit. Equivalent to
  \[
  c = \mathrm{mix}\bigl(\mathrm{mix}(c_0,c_1,\mathrm{step}(t_1,N\cdot L)),\, c_2,\,\mathrm{step}(t_2,N\cdot L)\bigr)
  \]
  with fwidth AA. — [kit.glsl.js `jjkCel3`](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/tools/jjk/kit.glsl.js); [genshin.glsl.js `gsRamp3`](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/stack/genshin.glsl.js)
- lilToon (lilxyzw, MIT, 2020–present): “feature-rich shaders for avatars”; Japanese copy: presets, **anti-aliased shading** so anime fills stay smooth, **editor rewrites the shader to toggle features off** (minimum ALU / build size), white-clip prevention, refraction-leak prevention, all Unity lights, Standard-like brightness. Landing page does not publish the hull equation. — [lilToon docs](https://lilxyzw.github.io/lilToon/); [lilxyzw/lilToon](https://github.com/lilxyzw/lilToon)
- Issue #12: lilToon / Poiyomi / URP toon = “VTuber stack: ramp, rim, matcap, outline, emission.” Copy the **functions**, do not ship a Unity preset into WebGL and call it a dock. — [issue-anime-parity](file:///C:/Users/seal/Documents/GitHub/teerthfolio/.donotcommit/issue-anime-parity.md)
- Genshin hold kit already exists: `gsHold` uses `lyHold(t, 12.0)` then jitters UV per held frame. — [kits.js](file:///C:/Users/seal/Documents/GitHub/teerthfolio/lib/anime/stack/kits.js)

### Inferences
- **3-tone as `step(N·L)`.** One threshold = 2-tone (shadow/lit). Two thresholds = 3-tone (fill/mid/key). Half-Lambert before the step (`0.5+0.5 N·L`) is the Hoyo/lilToon variant so the terminator sits on the cheek, not at the terminator of a hard sphere. AA must be `fwidth`, not a wide `smoothstep`, or the plate turns into a gradient (the “not anime” fail).
- **Outline as back-face hull.** Shared operator: \(P' = P + n_{\mathrm{out}} w_{\mathrm{px}}(z)\). Genshin/lilToon colorize the hull from albedo; Strive uses OLM to bleed SSS into it; this site uses indigo ink + concave thicken (`gsHullW`). Screen-space Sobel rim is a **second**, cheaper edge (FX), not a replacement for the hull on CAST.
- **Hold on twos.** \(t' = \lfloor 24t\rfloor/24\) is on-ones; \(t' = \lfloor 12t\rfloor/12\) is on-twos. Grain, motes, and tooth must key off \(t'\), not \(t\), or the drawing boils. 8 fps (`jjkSignClap`) is a slower hold for a gag, not the default.
- **lilToon ↔ this tree.** lilToon’s editor-time flag strip = `glslFor` omitting unused names. Map: ramp → `gsRamp3` / `cel-quantize`; outline → `gsOutline`; rim → `gsRimSobel`; emission → `lyEmitOnly`; matcap → optional metal lobe, not a dock look.

### Gaps
- Filament’s official material docs were not fetched; Filament is PBR-first and is not a primary toon source. Do not cite Filament for cel math without a page.
- lilToon per-feature HLSL (exact hull width formula, ramp sampling) lives in the repo’s generated shaders; the landing page is marketing. Not opened this pass.
- Wikipedia cel-shading is a general reference, not a studio paper.

## Cross-map for issue #12 (what to write into each research paragraph)

| #12 name | Named technique | Math (portable) | Source grade |
|---|---|---|---|
| ILM G | shade threshold | \(s=\mathrm{step}(t(G), N\cdot L)\); G=0.5 identity | Book **fact** |
| ILM R | highlight intensity | scales shine/spec | Book **fact** |
| ILM B | highlight size/power | book = power; #12 = size | Book **fact**, name split |
| ILM A | inner line | UV-space outline, OLM-aware | Book **fact** |
| Inverse hull | 背面法 / inverse-outer | \(P'=P+n w\), cull front | Academy **fact** + Roystan |
| Dual normals | tangent-based outlines | \(n_{\mathrm{light}}\neq n_{\mathrm{out}}\) | TOC **fact**; packing **gap** |
| Square UV lines | uniform-aspect ILM.A | thresholded UV stroke | **Inference** / PDF gap |
| Face SDF | 2D angle LUT | \(\mathrm{lit}=[S(u',v)>t(\theta)]\) | ReefSnax/Ayers **recreation** |
| Ramp | 1D quantizer | `ramp(h, row)` or 2-step mix | Ayers + this tree |
| Feature flags | chunk stack | `glslFor` deps-first | this tree **fact** |
| Info-flood cards | projective billboards | `mix(corner, eye, t)` shrink | **Observation** + kit |
| Infinity halt | radial gate | particles only for \(r>r_0\) | **Observation** + kit |
| Hollow Purple | colliding fields | Blue pull + Red push → purple mass | jjk.guide **lore**; collision **observation** |
| Not a purple hall | plate ≠ kill | WORLD black-blue+hole; purple = FX | script **fact** |
| Ufotable bloom | emit threshold | Kawase of `luma-T`, not albedo | Hozuna secondary + catalog |
| Impact frames | 1–3 held graphics | OCCLUDE/FX hold | **Observation** |
| Fate dirt/gold | value ladder | dirt → gold → one sat | script hexes; **not** studio term |
| Live2D | mesh deform | barycentric raster; linear keyforms | Official deformer **fact** |
| 3-tone | `step(N·L)` | two thresholds, fwidth AA | Wikipedia + this tree |
| Hold on twos | 12 fps from 24 | \(\lfloor 12t\rfloor/12\) | this tree + animation practice |
