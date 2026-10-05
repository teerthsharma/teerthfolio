# Director epic — six workstreams, one issue

Supersedes [#9](https://github.com/teerthsharma/teerthfolio/issues/9) (grandify dump) and [#7](https://github.com/teerthsharma/teerthfolio/issues/7) (Band 1000 + graphic 67 history). Those threads are closed. This file is the demand.

No stills reskin. No new package. No copied face. `data/showcase.json` numbers stay. `plays: "pr-mujoco-3396"` stays for the three mountain docks. `?hud=off` never fires a cutscene. Igloo never switches dimension. Do not split MujoRush.

---

## Instrument (not a vibe)

**Score = 10.0 − 0.1 × (failed ticks).** One hundred authored ticks (T01–T100). Each 0.1 is a named, fail-able fact. There is no “feels better +0.3.”

**Live review**

| field | value |
|---|---|
| Date | 2026-10-05, 23:57 IST (Chrome observe finished 18:27 UTC) |
| Commit | `460bafd3253744f8f016f84276301107240d35fb` |
| Message | `test(cutscene): the smoke fails on ANGLE shader warnings and allows the zoom-out wide` |
| URL | `https://teerthfolio.vercel.app` (assumed = `origin/main`; confirm the Vercel SHA) |
| Probe | Playwright `channel: "chrome"`, 1280×800, `?play&spawn=<id>&debug`, stills at 3 s and 8 s, 2 workers |
| Report | `verification/observe-all/report.json` + 48 PNGs |
| Black-void | max(black-share) ≥ 0.72 |

**What changed since the old 7.5 review (same calendar day, older deploy):** that review had 2 black-voids (`p-aether-lang` 0.88/0.83, `pr-highway-3244` 8 s = 0.85). **This probe: 24 started, 0 black-voids, 0 console errors.** The owner’s “all 24 work” is true for *playback*. It is not a 10.0.

Mean RGB of each still (64×40 downsample) is the colour fact. `pr-polychrom-79` 3 s **and** 8 s are exactly `rgb(155, 25, 89)` — a magenta card, not a sky of gates.

The old **7.5** meant “a picture exists.” This ledger does not inherit it.

**How to read a row:** *why* = the miss. *fix* = camera / shader / poly / HUD / terrain / 2D. *earn* = the one change that flips FAIL→PASS.

**Targets:** 8.5 = ≤15 fails. 9.0 = ≤10 fails. 10.0 = 0 authored fails **and** every moderator tick the mod filled.

---

## Current score (`460bafd`)

**5.2 / 10.0** = 10.0 − 0.1 × 48 fails. (52 pass. Ledger below.)

Playback is fixed (T54–T77). The 48 left are: pull not out of the world, polychrom magenta plate, MujoRush banner field, statue/hideout not FLOOR, pocket MeshStandard cities, no Genshin figure law, fountain hills unread, Band 1000 still a bubble on a stage.

---

## Ledger T01–T100

`P` = pass now. `F` = fail now. Each row is **0.1**.

### W1 Director kit (T01–T15)

| id | now | why | fix | earn / math |
|---|---|---|---|---|
| T01 | P | — | — | Grammar `zoom out → switch → zoom in` exists in `camera.js` on this SHA. |
| T02 | P | — | — | `grammarFor("home")` is null. Igloo does not switch. |
| T03 | P | — | — | `\|into.from\| < 0.2` is forced off-axis. |
| T04 | P | — | — | Eye on pull never nearer than follow (`shot()`). |
| T05 | P | — | — | `?hud=off` returns no cutscene. |
| T06 | P | — | — | Skip / reduced-motion path exists (`still` two-shot). |
| T07 | P | — | — | Default `camFar` 1000; drawings may set their own. |
| T08 | F | `PULL_FAR = 44`. Island θ = 2 arctan(84/44) ≈ **125°**. Still the dock. | cam | Set pull `d ≥ 420` (θ ≤ 23°). Prefer 900 on myth docks. |
| T09 | F | Widest live pull is Mujo **70 m** (θ ≈ 100°). Aether pull is **18 m** (into the void, not out of the world). | cam | No card `pull.far < 420` except `home`. |
| T10 | F | FOV open is +8 to +16, not 28→40–48 on a *far* pull. | cam | `fov0=28`, `fov1≥40` while `d≥420`. |
| T11 | F | Switch does not happen on a coin. Smash cut is a shrug. | cam | Chrome still at bloom: island θ ≤ 23°. |
| T12 | F | Follow 35.5 m never enters fog 80–190. Fog exists and is wasted. | cam | Pull crosses fog far, or drawing owns fog and hands it back. |
| T13 | P | — | — | Per-card `fog` / `camFar` fields exist (W1 kit landed). |
| T14 | P | — | — | Topograph card `title` is `Throne Room of Nazarick` (HUD lie from the old review is gone in the card). |
| T15 | F | Default two-shot `EYE [-0.1, 0.85, 7.4]` still the reduced-motion picture. | cam | `still` mode uses the bent `into`, not the passport two-shot. |

W1 now: 10 P / 5 F → **1.0 / 1.5**

### W2 Beauty / cost (T16–T30)

| id | now | why | fix | earn |
|---|---|---|---|---|
| T16 | P | — | — | Island terrain is one mesh (`Terrain.jsx`). Bruno-ish. |
| T17 | P | — | — | Repeated props are `InstancedMesh`. |
| T18 | P | — | — | Seal already has a `ShaderMaterial` (`Seal.jsx`). |
| T19 | F | Pockets are MeshStandard sculpture museums. Cost is vertex count. | shader | Pocket ≤ 8 draws. Measure in `?debug`. |
| T20 | F | Env tris per pocket not budgeted. | poly | ≤ 12k environment tris in the stage. |
| T21 | F | Place is not named by a fragment. | shader | ≥ 1 shader whose still names the homage (void flood, Susanoo volume, cave pool). |
| T22 | F | Extra MeshStandard cities in the pocket. | shader | 0 extra PBR cities. Hull + fragment. |
| T23 | F | Rimuru / guests as stock-PBR humans. Owner: vomit. | shader+poly | Genshin test or 2D card. Ramp + face SDF or ink. No lathe+`MeshStandard`. |
| T24 | F | No bake (normal / ramp / ID) on hero guests. | shader | Frequency in maps, not extra loops. |
| T25 | F | Statue is not a Lusion material. Bowling-pin + stock light. | shader | Written bronze/toon. Rim `#c4a574`. |
| T26 | F | Hideout hill not a heightfield (place still a plaza). | terrain | Bruno: one terrain peak, not a second mountain mesh. |
| T27 | F | No AT FBO / volume for kills (Predator, Hollow Purple, Enuma). | shader | Kill is a fullscreen / FBO pass, not a new crowd mesh. |
| T28 | F | LOD: 35 m, FOV 28°, 2.6 m statue ≈ 4.3° ≈ 96 px. Extra tris past that are invisible. | poly | LOD contract: silhouette first. |
| T29 | F | No mobile quality drop (Bruno does this). | shader | Low preset drops bloom/shadow maps. |
| T30 | P | — | — | Sea / moat / snowfall already opt into custom shaders. Island side is not empty. |

W2 now: 4 P / 11 F → **0.4 / 1.5**

### W3 Epsilon hideout + SEAL SEAL (T31–T45)

Live `LAB_AT` is `S(18,30) = [27, 45]`, not `[18, 30]` and not the FLOOR `[48, 68]`.

| id | now | why | fix | earn |
|---|---|---|---|---|
| T31 | F | Not on the SE rim `[48, 68]`. | terrain | Move origin to `[48, 68]`. |
| T32 | F | No 14 m hill at `[48, 58]`. | terrain | Heightfield peak, r 11, rock `#3a3228`. |
| T33 | F | No Akatsuki mouth at `[44, 66]`. | poly+shader | Carved gate + instanced lanterns. |
| T34 | F | Interior is not hall `#1c1824` / cloud `#b3122a`. | shader | AT volume, not a white plaza. |
| T35 | F | Statue silhouette ≠ live pup (`A-body.js`). | poly | Same head-ball + flippers. |
| T36 | F | Height / plinth below FLOOR (≥ 3.4 m total). | poly | 2.6–3.0 m + 0.85 m plinth. |
| T37 | F | Plaque is a sign, not a stone 1.2×0.7 facing +z. | poly | Dressed granite `#9e928d`. |
| T38 | F | Cameo is not live `github.com/teerthsharma.png`. | shader | Fetch + CORS. Fallback bronze pup. |
| T39 | F | Lettering not two exact cut lines. | poly | `SEAL SEAL` / `founder of seal city`. |
| T40 | F | Clip-art plaza (benches, stanchion, toy globe as subject). | poly | Delete. Sphere wreck scale ≤ 0.45 if kept. |
| T41 | F | No second switch onto the statue. | cam | After Predator, LOW 20° west, eye 1.6 m on the plaque. |
| T42 | P | — | — | Tensura line plays: “Kwahaha! What does that one do?” (Chrome 3–8 s). |
| T43 | P | — | — | Card `into.from = 0.611` (35°). Not azimuth 0. |
| T44 | F | Pull `far = 22`. Opposite of out-of-world. | cam | Epsilon pull `d ≥ 900`. |
| T45 | F | HUD-off still does not name SEAL SEAL from silhouette. | poly+cam | HUD-off 3 s gate. |

W3 now: 2 P / 13 F → **0.2 / 1.5**

### W4 Fountain hills (T46–T53)

Place exists: district **The Fountain of Immortality**, dock `S(30,57) = [45, 85.5]`, `PEAK` top 21 m.

| id | now | why | fix | earn |
|---|---|---|---|---|
| T46 | P | — | — | Fountain district + `peak.js` exist on this SHA. |
| T47 | F | Hills are cone-sum. No two saddles. | terrain | ≥ 2 saddles on the ridge. |
| T48 | F | Path does not read from the dock (hairpins / ledge). | terrain | Three hairpins or a carved ledge in the still. |
| T49 | F | Fall / basin not the 3 s subject. | cam+shader | 3 s names water + ridge, not a card. |
| T50 | F | Polychrom 3 s mean RGB **(155, 25, 89)** = 8 s. Magenta plate. | shader+cam | Sky of gates. RGB must move between 3 s and 8 s. |
| T51 | F | Pull `far = 44`. | cam | `d ≥ 900`. |
| T52 | P | — | — | `into.from = −0.524` (30° east), elev −1.2 (basin look-up) is in the card. |
| T53 | F | Remade still is the same magenta. Death does not land on the basin. | shader+cam | Home still is the fountain, gold `#d9a441` / crimson `#c3122e`. |

W4 now: 2 P / 6 F → **0.2 / 0.8**

### W5 Twenty-four docks — playback + picture (T54–T85)

**Playback (T54–T77): one tick per id, PASS if the arrival starts and max black-share < 0.72.** Recheck 2026-10-05 18:27 UTC:

| id | black 3/8 | RGB 3s | now |
|---|---|---|---|
| T54 home | 0 / 0 | 156,147,153 | P |
| T55 p-aether-lang | 0.28 / 0.49 | 45,18,57 | P (was void 0.88; now a purple domain, still dark) |
| T56 p-caustic | 0 / 0 | 102,79,65 | P |
| T57 p-epsilon-hollow | 0 / 0 | 87,96,134 | P |
| T58 p-faraday | 0 / 0 | 95,138,163 | P |
| T59 p-monodromy | 0 / 0 | 173,153,118 | P |
| T60 p-nerve | 0.53 / 0.54 | 44,29,28 | P (dark on purpose) |
| T61 p-planimeter | 0 / 0 | 195,185,184 | P |
| T62 p-resolvent | 0 / 0 | 117,84,55 | P |
| T63 p-separatrix | 0 / 0 | 135,99,124 | P |
| T64 p-tangle | 0 / 0 | 145,99,135 | P |
| T65 p-topological-ml-toolkit | 0 / 0 | 139,159,194 | P |
| T66 pr-highway-3244 | 0.01 / 0.03 | 147,89,117 | P (**8 s was 0.85 black; fixed**) |
| T67 pr-mujoco-3396 | 0.01 / 0 | 107,80,45 | P |
| T68 pr-mujoco-warp-1541 | 0.01 / 0 | 107,81,47 | P (same mountain) |
| T69 pr-mujoco-3450 | 0.01 / 0.01 | 104,69,23 | P |
| T70 pr-nemo-relay-481 | 0 / 0 | 155,134,157 | P |
| T71 pr-openxla-46539 | 0.03 / 0.03 | 52,54,70 | P |
| T72 pr-polychrom-79 | 0 / 0 | **155,25,89** | P *playback* (colour fail is T50/T80) |
| T73 pr-pyrefly-4180 | 0.02 / 0.01 | 137,108,117 | P |
| T74 pr-tensorflow-124410 | 0 / 0 | 147,102,131 | P |
| T75 pr-topograph-432 | 0.18 / 0.31 | 67,44,54 | P |
| T76 pr-triton-kernels-22 | 0.05 / 0.25 | 116,101,97 | P |
| T77 pr-xnnpack-10801 | 0 / 0.11 | 169,164,166 | P |

**Picture quality (T78–T85):** the still names the homage with HUD ignored.

| id | now | why | fix | earn |
|---|---|---|---|---|
| T78 | F | Aether 3 s is still type-on-purple (mean 45,18,57). Not flood/core as the subject. | shader+cam | 3 s: flood or white-violet core occupies ≥ 40% of the frame. |
| T79 | F | Caustic 3 s is the hall (warm 102,79,65), not LOW Susanoo. | cam | 3 s is the LOW lens `eye [7.5, −3.4, 14]`. |
| T80 | F | Polychrom 3 s = 8 s = rgb(155,25,89). No gates. | shader | 3 s sky of gold rings `#d9a441`. Mean RGB must change by 3 s → 8 s. |
| T81 | F | MujoRush 3 s is a brown field + banner, not three faces filling the sky. | cam+poly | Wall Maria + three faces. Pup a speck. |
| T82 | P | Highway 8 s now has chroma (134,81,104), black 0.03. Race survived. | — | — |
| T83 | P | Topograph card title is Nazarick, not NVIDIA MOAT. | — | — |
| T84 | F | Epsilon 3 s is cave/orb (87,96,134), not the statue+plaque (HUD-off). | cam | Separate HUD-off still on SEAL SEAL. |
| T85 | F | Monodromy 3 s is palace wash, not the page-tear crack. | shader | 8 s crack reads as a torn page. |

W5 now: 26 P / 6 F → **2.6 / 3.2**

### W6 Band 1000 (T86–T93)

| id | now | why | fix | earn |
|---|---|---|---|---|
| T86 | P | — | — | 2D / bubble system plays on first arrival. |
| T87 | P | — | — | No copied face (house). |
| T88 | P | — | — | `?play` stills are 3D stages, not only DOM. |
| T89 | F | Most 3 s stills are one bubble, not two-voice in the *picture*. Faraday/Monodromy are the exceptions. | 2D | Silhouette in frame at 3 s on ≥ 20 of 24. |
| T90 | F | Guest is a 3D mesh, not silhouette + one prop. | 2D/shader | House rule enforced. |
| T91 | F | Bubble is the subject on polychrom (magenta + one line). | 2D+shader | Picture names the place if the bubble is ignored. |
| T92 | P | — | — | Lines sit on the claim (Gojeal, Kwahaha, Via Expugnatio, etc. live). |
| T93 | F | Aether 8 s is still a koan on dark purple, not a domain you could draw. | shader | Hollow Purple is visible as a collision, not a caption. |

W6 now: 4 P / 4 F → **0.4 / 0.8**

### Island leftover (T94–T100)

| id | now | why | fix | earn |
|---|---|---|---|---|
| T94 | P | — | — | Bruno first-read: avatar + world + name in one spawn still. |
| T95 | P | — | — | 12th PR `pr-polychrom-79` is a live place. |
| T96 | P | — | — | Fog colour `#cfe6f8` 80–190 exists. |
| T97 | F | Follow never enters the fog band. | cam | Same as T12. |
| T98 | F | Snowfall skips fog. | shader | Snowfall opts in (`UniformsLib.fog`). |
| T99 | P | — | — | Cream HUD chrome is not the grade. |
| T100 | F | Object-world stills without arrivals remain 67/100. Not this epic’s 10, but it caps the *site*. | terrain | Separate 67→100 work. This tick fails until that grade moves or is scoped out by a mod. |

Island now: 4 P / 3 F → **0.4 / 0.7**

### Sum

| band | pass | fail | points |
|---|---:|---:|---:|
| W1 kit | 10 | 5 | 1.0 / 1.5 |
| W2 beauty | 4 | 11 | 0.4 / 1.5 |
| W3 epsilon | 2 | 13 | 0.2 / 1.5 |
| W4 fountain | 2 | 6 | 0.2 / 0.8 |
| W5 docks | 26 | 6 | 2.6 / 3.2 |
| W6 punches | 4 | 4 | 0.4 / 0.8 |
| Island | 4 | 3 | 0.4 / 0.7 |
| **Total** | **52** | **48** | **5.2 / 10.0** |

Recount: 10+4+2+2+26+4+4 = 52 P. 5+11+13+6+6+4+3 = 48 F. 52+48=100.

**Score = 10.0 − 4.8 = 5.2 / 10.0.**

**5.2 is the ledger. 7.5 was the vibe. 24/24 working is T54–T77 only (2.4 of 10).**

To **8.5**: need 33 of the 48 fails flipped (15 fails left). Cheapest 33 are T08–T12 (cam pull), T50 T78–T81 T84–T85 (pictures), T19–T23 (shader law), T31–T41 (hideout+statue). That is W1+W2+W3+W5, not W6 first.

---

## Moderator ledger (author cannot fill)

Mod adds rows. Each filled row is **+0.1 on the denominator** and starts **F** until the mod marks P. The author does not write the *why*.

| id | now | why (mod) | fix | earn |
|---|---|---|---|---|
| M01 | — | | | |
| M02 | — | | | |
| M03 | — | | | |
| M04 | — | | | |
| M05 | — | | | |
| M06 | — | | | |
| M07 | — | | | |
| M08 | — | | | |
| M09 | — | | | |
| M10 | — | | | |
| M11 | — | | | |
| M12 | — | | | |
| M13 | — | | | |
| M14 | — | | | |
| M15 | — | | | |
| M16 | — | | | |
| M17 | — | | | |
| M18 | — | | | |
| M19 | — | | | |
| M20 | — | | | |

If the mod fills *k* rows, **Score = 10 × (pass) / (100 + k)**. A 10.0 on the authored ledger with 3 open M-fails is 10 × 100 / 103 ≈ 9.7.

---

## What 0.1 *is* (so the size stays huge and honest)

- **0.1** = one still, one number, or one law. Example: Highway 8 s going from black 0.85 → 0.03 earned **T66** only. It did not earn T08.
- **1.0** = ten such facts. W1 is 1.5. The whole hideout+statue is 1.5.
- **8.5** is not a mood. It is ≤15 open authored fails.
- Re-run the Chrome probe on a new SHA and re-mark the T-column. Do not edit *why* to match a feeling.

---

## Six workstreams (how to earn the fails)

| # | name | job |
|---|---|---|
| **W1** | Director kit | Zoom out of the world. Switch. Zoom into the seal. Nolan geography. Math for every lens. |
| **W2** | Beauty / cost floor | Bruno island, Active Theory pocket, Lusion statue, Genshin hybrid figure. |
| **W3** | Epsilon hideout + SEAL SEAL | Island-corner carve. Akatsuki mouth. Statue FLOOR. Plaque. Second switch. |
| **W4** | Fountain hills | Immortality peak that reads as hills, not a cone. Polychrom remade here. |
| **W5** | 24 dock dossiers | Hex, degree, death, 3 s / 8 s still. Every approved card. |
| **W6** | Band 1000 punches | 2D two-voice. Does not replace W5’s 3D picture. |

Build order: W1 → W2 → W3 and W4 in parallel → W5 (uses all four) → W6 last.

---

## W1 — Director kit (Nolan, with numbers)

The live grammar in `lib/world/cutscene/camera.js` is already **zoom out → switch → zoom into the seal**. Default `PULL_FAR = 44`. That is a step back on the dock. It is **not** out of the world.

Island radius `ISLAND_RADIUS = 84` (`places.js`). Follow sits ~35.5 m, FOV 28°. Fog is linear `C.sky` `#cfe6f8`, near 80, far 190 (`Island.jsx`). At 44 m the island still fills the frame and the pull never reaches fog.

**Out of the world** means the island’s angular diameter is a coin.

\[
\theta = 2\arctan\!\left(\frac{R}{d}\right),\quad R = 84
\]

| pull \(d\) (m) | \(\theta\) | what it looks like |
|---:|---:|---|
| 35.5 | 134° | follow. The dock is the world. |
| 44 (`PULL_FAR` today) | 125° | a shrug. Still the dock. |
| 190 (fog far) | 48° | island in haze. Not a coin. |
| 420 | 23° | land as a plate. Minimum “left.” |
| 900 | 11° | coin. The switch belongs here. |
| 1600 | 6° | speck. IMAX pull. Allowed. |

**Floor for the zoom-out (every dock except Igloo):**

- End of pull: \(d \ge 420\). Prefer 900 on myth docks (MujoRush, Caustic, Aether, Epsilon).
- `camera.far ≥ d + 80`. Fog near/far owned by the drawing; handed back on collapse.
- FOV 28° → 40–48° on the pull (lens opens; subject shrinks). This is a **zoom**, not only a dolly.
- Path of the eye: **back and up**, pitch ~14° as today (`WIDE_PITCH`), along the follow’s azimuth. Never nearer than follow. Never a +z push at the subject.
- Switch happens at the **wide**, on impact / bloom (~1.15–1.6 s). The pocket replaces the island while the island is small. That is the smash cut.
- Then zoom **into the seal** on an arc. `into.from` is radians off +z, **never 0**. `|from| < 0.2` is already forced off in `grammarFor`. Keep that. Unique degree is only this zoom-in.
- Kill may open a third angle. Still not azimuth 0.
- Home: zoom out of the dying pocket **or** shatter. Land on the real dock. Epsilon’s home is the **statue**, not the old globe.

**Nolan rules (teaching):**

1. **Geography.** The island is always “down” after the pull. The pocket has its own gravity. Never lose which world the lens is in.
2. **The line.** Dock +z is the 180°. Cross it only by *switching worlds*, not by sliding around the pup on the same dock.
3. **One image.** At 3 s a still names the place with HUD ignored. A bubble on a flat field is 7.5.
4. **Three scales.** Dock (human), island (god), pocket (myth). The pull visits god. The zoom-in visits myth. Home returns to human.
5. **Igloo.** No switch. A small fjord breath is allowed. Never a dimension slam.

Reduced motion / `still` keeps the old two-shot. Skip restores follow in ≤ 0.08 s.

---

## W2 — Beauty / cost floor

Someone said the cutscenes are costly: too many polygons, too little shader. That is true of the **pockets**. It is not “delete every triangle.”

Genshin, and every game that looks like a game, is a **hybrid**:

| layer | triangles do | shaders / maps do |
|---|---|---|
| Hero figure | silhouette, edge flow for outline | ramp / face SDF / rim / metal lobe / baked normal |
| World | instance, merge, LOD, one heightfield | fake light, palette, matcap or cheap GI |
| FX / pocket sky | almost none | FBO particles, fullscreen fragment, volume |

Stock `MeshStandardMaterial` on a lathe human is why the Rimuru body makes a person puke. More subdivisions make that worse. Genshin never puts a blob under film PBR.

**Industry jobs (not three skins to copy):**

| studio | owns | how |
|---|---|---|
| [Bruno](https://bruno-simon.com/) | **island** | low-poly, instance, merge, palette, baked/blob shadow. Hideout hill = heightfield, one draw. |
| [Active Theory](https://activetheory.net/) | **pocket** | material **is** a shader. They dropped Three’s lighting. Void / Susanoo / cave = hull + fragment. FBO particles, not a sculpted crowd. |
| [Lusion](https://lusion.co/) | **statue** | one object, expensive pass. Displacement, not more tris. SEAL SEAL must read as bronze/toon, not a bowling pin. |

**Budget (pocket):**

- ≤ 8 draw calls, ≤ 12k *environment* triangles, ≥ 1 shader that **names** the place, **0 extra MeshStandard cities**.
- One hero figure may sit above that budget (Genshin does this). A crowd of figures may not.
- Guest figure is allowed only if it passes the **Genshin test**: silhouette reads at 32 px; face is SDF or ink (no copied likeness); ramp shadow (painted hue, not `albedo * 0.2`); outline; one material family. Fail any line → 2D card / silhouette. No third option of “just add tris.”
- Seal / statue: same pup as `Seal.jsx` / `A-body.js`. Written shader (ramp + rim + metal). Not a lathe snowman. Not stock `MeshStandard` as the only light.

**Tensura:** the only 3D body in the pocket is the seal (Rimuru’s slime form). Veldora is the `#6b3fa0` shader orb. Great Sage is voice or 2D. A 3D human Rimuru that fails the Genshin test is below floor.

---

## W3 — Epsilon hideout + SEAL SEAL (FLOOR)

Move `p-epsilon-hollow` off `[18, 30]` to the **southeast rim**.

| piece | number |
|---|---|
| Place origin | `[48, 68]` |
| Hill peak (behind, −z) | `[48, 58]`, h 14 m, r 11 m |
| Dock (+z) | `[48, 72.6]` |
| Hideout mouth (terrace west corner) | `[44, 66]` |
| Sphere wreck (if kept) | `[51, 65]`, scale ≤ 0.45 of today’s globe |
| Radiation | 9 m |

Hill rock `#3a3228`, ice-edge `#9e928d`. Semi-terrain = heightfield in `terrain.js`. Semi-artificial = dressed gate, jambs, lanterns (instanced), interior hall.

Interior: Akatsuki. Stone `#1c1824`. Cloud `#b3122a` on `#1c1824`. Ember `#e0559b`. No white void plaza. No park bench. No stanchion. No toy Atomium as the skyline.

**Statue FLOOR** (if any line fails, it is still pathetic):

| part | must |
|---|---|
| Silhouette | Live pup. Head is a ball. Flippers read. |
| Height | 2.6–3.0 m bronze/toon on a 0.85 m plinth. Total ≥ 3.4 m. |
| Shader | Written metal/toon. Bronze `#6e5344`, rim `#c4a574`, eyes `#06b6d4`. metalness 0.55–0.7, roughness 0.32–0.4 if metal. Not stock-only `MeshStandard`. |
| Plinth | Granite `#9e928d` / `#6a625c`. |
| Plaque | Stone 1.2 × 0.7 m, facing +z. Not a sign on sticks. |
| Cameo | Live `https://github.com/teerthsharma.png`. CORS. Down → bronze pup face. Never a cartoon seal icon. Never a file in the repo. |
| Letters | Exact, two lines, fill `#1c1824` or `#06b6d4`: |

```
SEAL SEAL
founder of seal city
```

HUD-off 3 s: a visitor names SEAL SEAL / seal city from silhouette. The sphere is not what they name.

**Epsilon cutscene (new second switch):**

| t | lens |
|---|---|
| 0–1.6 s | Pull to \(d \ge 900\). Island is a coin. FOV 28→44. |
| 1.15–1.8 s | Switch. Tensura pocket. Cave pool `#1a1440`. Stage `#1fb8ff`. |
| 1.8 s → line A | Into: 35° off +z (`from ≈ 0.61`), eye 1.2 m, onto the seal. Veldora orb in the sky. |
| Kill | Predator. Maw `#0a0614`. |
| **Second switch** | Lens already on the statue, LOW, 20° west, eye 1.6 m, look at the plaque. |
| Home | Terrace + hill + mouth. Flex: “Bare metal x86_64. No POSIX. No libc…” |

Lines stay: “Kwahaha! What does that one do?” / “Oops. Wrong place.” / the bare-metal flex.

Do not eat Caustic `[54, 38]` or Monodromy `[0, 48]`. Do not add a second Rushmore.

---

## W4 — Fountain of Immortality hills

`pr-polychrom-79` remakes at the Fountain (`PEAK` on `origin/main`: `lib/world/peak.js`, `components/world/land/Fountain.jsx`). Live 3 s / 8 s is a magenta void. The hills are cone-sum backdrop: unwalkable, 1 m grid, no switchbacks.

**FLOOR for the peak:**

- A ridge with at least **two** saddles, not one analytic cone.
- A path that **reads** from the dock: three hairpins or a carved ledge, even if the collider stays off the slope.
- Basin on the summit. Water `#7fc8f8` / radiation of the place. Fall to a spring the eye can follow.
- Palette: gold `#d9a441` `#ffe08a`, crimson `#c3122e`, stone `#6a625c`.
- Pull for polychrom: \(d \ge 900\), then switch to Gate of Babylon, into **30° east**, eye **−1.2 m** (from the basin). Kill: Enuma Elish. Home: remade at the basin, not a pink card.
- Bruno: the hill is terrain. Not a second Fountain mesh mountain.

---

## W5 — 24 docks (director’s still)

Clock: `timeline.js` `LENGTH` 8.2, impact 1.15, bloom 1.15–1.6, line A 2.3. Default two-shot `EYE [-0.1, 0.85, 7.4] LOOK [0.7, 0.6, -1.0]` is the 7.5. Never use it as the zoom-in.

Positive yaw = west. `into.from` in radians. Elevation = eye height in metres. Azimuth 0 is a miss.

Live Chrome 2026-10-05: voids `p-aether-lang` (0.88 / 0.83), `pr-highway-3244` at 8 s (0.85), `pr-polychrom-79` magenta, `pr-topograph-432` HUD “THE NVIDIA MOAT”.

### `home` — Igloo

Class igloo. Vinland. Stage `#7fc8f8`. Paper `#e8dcc8`. Dawn `#7fc8f8`→`#f3c98a`. Gold `#e8b84a`. Ink `#1c1824`. Beacon `#ffd27a`. **No switch.** Level lens `look [-3.0, 1.7, -3.0]`, `eye [0.9, 0.0, 11.0]`. Kill: rain. 3 s: watercolor fjord. No fight.

### `p-aether-lang` — Infinite Void (won)

Gojeal. Hue 256. Void `#140b26`. VOID `#c77dff`. Blue `#2f7dff`. Red `#ff2b3a`. Purple `#7b2cbf`→`#e94bff`. Glass `#d9c6ff` @ 0.12. Pull \(d \ge 900\). Into **180°** (`from = π`), eye 0.4 m, looking *out* through the flood. Fog off in the domain. 3 s must show flood or core. Live black card is a miss. Kill: Hollow Purple.

### `p-caustic` — Madara (won) — the template

Stage `#e0559b`. War `#2a241f` `#6a5c4d` `#bfa98b`. Moon `#b3122a`. Susanoo rim blue-fire. Pull \(d \ge 900\). Into: Caustic LOW `look [-1.5, 3.8, -6]`, `eye [7.5, −3.4, 14]`. WIDE is the switch, not an approach. 3 s is LOW under the titan, not the lighthouse. Kill: meteor `HIT2 [5, −38]` r 32.

### `p-epsilon-hollow` — Tensura + hideout (supersede)

See W3. Stage `#1fb8ff`. Pool `#1a1440`. Veldora `#6b3fa0`. Maw `#0a0614`. No 3D human unless Genshin-test.

### `p-faraday` — Railgun (won)

Prussian `#0a4a7a` `#123a66`. Cream `#f4e8c8`. Amber `#ffa927`. Into **90°**, eye 0.6 m, coin in the near foreground. Rail is a diagonal, not a two-shot on blue paper.

### `p-monodromy` — Sinbad (supersede)

Stage `#1fbdb4`. Palace `#f4e8c8` `#d9a441`. Lightning `#e8f4ff`. Into **20° west**, eye 0.5 m, up the vortex. Kill is the **dimension**. Crack is a page tear. Remade at `[0, 48]`.

### `p-nerve` — Death Note (won)

Stage `#b3171f`. Roof `#1a0c0e`. Spot `#f2e6d8`. Ryuk `#3a1020`. Into **15° east**, eye 0.4 m. 3 s needs Ryuk or bells, not only the chained pup.

### `p-planimeter` — Class 1-D (won)

Stage `#f3b36b`. Board `#2a4a32`. Red 50 `#e5142e`. Into **10° west**, eye 1.1 m, onto the calm face. Money frame is the eye-glint, not an empty classroom.

### `p-resolvent` — Aura’s scale (won)

Stage `#e0a043`. Gold `#ffe08a`. Army `#3a2a6a`. Into **40° east**, eye 0.8 m, scale between pup and dais. Size jump is a camera move.

### `p-separatrix` — GER (won)

Stage `#d9a441`. Plaster `#f4e8c8`. Under-red `#b3122a`. Into **12° west**, canted, eye 1.4 m over the wall. Erase plaster to red sketch, then gold back.

### `p-tangle` — musubi (won)

Stage `#e0559b`. Sky `#f3b36b`→`#e0559b`→`#3a2a6a`. Cord `#e5142e`. Into **170°**, eye 2.0 m. 3 s: girl and sun, not an empty shore. Guest is silhouette unless Genshin-test.

### `p-topological-ml-toolkit` — Accelerator (won)

Stage `#3b82f6`. Overcast `#c8d4e4`. Arrows `#e5142e`. Into **25° east**, eye 1.4 m, arrows in the foreground. Kill: the city folds.

### `pr-highway-3244` — Gordius Wheel (won)

Stage `#ff5a3c`. Road `#2a241f`. Cape `#c3122e`. Into **25° west**, eye 0.3 m, wheel in the right third. 3 s is good. 8 s black 0.85 is a miss. Race stays visible through line B.

### `pr-mujoco-3396` / `#1541` / `#3450` — one mountain (won)

`plays: "pr-mujoco-3396"`. AoT. Stage `#ff8a3a`. Paper `#d4c4b0`. Graphite `#3a3228`. Pull \(d \ge 900\), `camFar ≥ 900`, fog out past 600 or the Rumbling is sky. Into **25° west**, eye 1.1 m, crowned face `[0, 7, −30]` fills the sky. 3 s: three faces. White card is a miss. Do not split.

### `pr-nemo-relay-481` — Ultra Instinct (won)

Stage `#6f7fe0`. Arena `#e8dcc8`. Aura `#e8f4ff`. Into **30° east**, eye 4.2 m looking **down**. 3 s: ledge + a god, not only a purple room.

### `pr-openxla-46539` — United States of SMASH (won)

Stage `#ec2a8a`. Cyan `#3b82f6`. Yellow `#ffe08a`. Into **15° west**, tipped ~10°. Street and storm fill the top.

### `pr-polychrom-79` — Gilgamesh (supersede)

See W4. Stage `#c3122e`. Gold `#d9a441`. Live magenta is a miss. 3 s: sky of gates. Remade at the Fountain.

### `pr-pyrefly-4180` — Nine-Tails (won)

Stage `#3a2a6a`. Paper `#f4e8c8`. Fox `#c3122e` cut-paper. Into **45° west**, eye 0.55 m. 3 s: paper giant, not only a yellow burst.

### `pr-tensorflow-124410` — MUDA (won)

Stage `#c026d3`. Stand `#e8b84a`. Into **20° east**, eye 1.9 m. Time-stop invert is a readable beat.

### `pr-topograph-432` — Nazarick (won)

Stage `#a23cff`. Hall `#1a0c24`. Gold `#d9a441`. Into **20° west**, eye 0.5 m, **up** the stair. Card `view [[0,1,0],[0,0.5,5]]` is a straight in — forbidden. **HUD title must not say THE NVIDIA MOAT.**

### `pr-triton-kernels-22` — Malevolent Shrine (won)

Stage `#e5142e`. Ink `#1c1824`. Paper `#f4e8c8`. Into already bent (yaw −0.2386). 3 s: shrine as a building.

### `pr-xnnpack-10801` — Kyoka Suigetsu (won)

Stage `#3d7fc4`. Desert `#f4e8c8`. Sky `#0a0614`. Into **10° west**, eye 4.2 m, seal on the rising throne. 3 s: Aizen or the dome after the switch.

---

## W6 — Band 1000 (from #7)

2D punch on first arrival. Seal acts. A silhouette (or the landform) says the other line. Famous punch that sits on the claim. No copied face. Skip restores perspective. `?play` stills stay 3D (W5).

This does **not** replace W5. A 2D koan on a black void is still 7.5. W5 stills must pass before W6 counts.

House: the seal is the only 3D face unless a guest passes the Genshin test. Everyone else is silhouette + one prop, or 2D ink.

---

## Shared 7.5 junk (what this issue kills)

- Default two-shot from +z. `PULL_FAR = 44` as “wide.”
- Pocket as a MeshStandard city / vomit human.
- Bubble as the subject.
- White or black card + banner (Aether, Highway-at-8s, polychrom, MujoRush white).
- HUD lie (Topograph = NVIDIA MOAT).
- Toy bowling-pin statue, cartoon cameo, clip-art plaza.
- Second MujoRush. Igloo as a fight. Straight incoming dolly.

---

## Gate (8.5–10)

Chrome, `channel: "chrome"`, 1280×800.

| still | pass |
|---|---|
| any non-home 0–1.4 s | island shrinking. At end of pull, \(\theta \le 23^\circ\) (\(d \ge 420\)). |
| `home` 3 s | watercolor fjord. No fight. |
| `p-caustic` 3 s | LOW lens, Susanoo or moon. |
| `p-aether-lang` 3 s | flood or core. Not VOID on black. |
| `pr-mujoco-3396` 3 s | three faces. Pup a speck. |
| `pr-highway-3244` 8 s | race visible. Not black 0.85. |
| `pr-polychrom-79` 3 s | sky of gates. |
| `pr-topograph-432` any | title is Nazarick or Topograph. |
| `p-epsilon-hollow` HUD-off | statue + plaque (live pfp, exact stone). Hill + mouth. Hideout in the corner. |
| `p-monodromy` 8 s | crack / remade. |
| every other 3 s | already *in* the pocket, zooming onto the seal from a bent degree. |

---

## Limits

Does not reskin Instrument Sans, cream cards, or the minimap. Does not rewrite `data/showcase.json`. Does not copy a face. Does not fire cutscenes on `?hud=off`. Does not ask for a new fog *system* — it asks the existing fog to move, and the pull to leave 44 m. Graphic stills without arrivals remain the 67 / 100 object-world work.

Mod may add beats on the same homage if they sit.
