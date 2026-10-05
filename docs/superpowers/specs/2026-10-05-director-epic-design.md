# Director epic — six workstreams, one issue

Supersedes [#9](https://github.com/teerthsharma/teerthfolio/issues/9) (grandify dump) and [#7](https://github.com/teerthsharma/teerthfolio/issues/7) (Band 1000 + graphic 67 history). Those threads are closed. This file is the demand.

Live `teerthfolio.vercel.app` on `origin/main` already plays 24 approved first-arrival cutscenes. Chrome stills (2026-10-05, Playwright `channel: "chrome"`, 1280×800) name 22 pictures and 2 voids. The pictures sit at **7.5**. This issue is **8.5–10**.

No stills reskin. No new package. No copied face. `data/showcase.json` numbers stay. `plays: "pr-mujoco-3396"` stays for the three mountain docks. `?hud=off` never fires a cutscene. Igloo never switches dimension. Do not split MujoRush.

---

## Six workstreams

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
