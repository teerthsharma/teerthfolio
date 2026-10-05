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

**5.0 / 10.0** = 10.0 − 0.1 × 50 fails. (50 pass.)

Order of this review: **(1) all 24 cutscenes, (2) the island, (3) then the fountain.** The fountain is scored **0** after the island walk, not from the cutscene probe.

---

## 1. Grade of all 24 (Chrome, this SHA)

Playback: 24/24 start. 0 black-voids. 0 console errors. That is T54–T77.

| id | play | 3 s mean RGB | picture (HUD ignored) |
|---|---|---|---|
| home | P | 156,147,153 | watercolor / igloo. Holds. |
| p-aether-lang | P | 45,18,57 | purple domain, still type-led. Not flood/core. |
| p-caustic | P | 102,79,65 | hall / earth. Not LOW Sukuna / manhwa. |
| p-epsilon-hollow | P | 87,96,134 | cave + orb. Not statue+plaque. |
| p-faraday | P | 95,138,163 | cyanotype chroma. Two-voice in DOM. |
| p-monodromy | P | 173,153,118 | palace wash. Not the page-tear. |
| p-nerve | P | 44,29,28 | dark on purpose. |
| p-planimeter | P | 195,185,184 | classroom light. |
| p-resolvent | P | 117,84,55 | courtyard brown. |
| p-separatrix | P | 135,99,124 | fresco chroma. |
| p-tangle | P | 145,99,135 | twilight pink. |
| p-topological-ml-toolkit | P | 139,159,194 | overcast blue. |
| pr-highway-3244 | P | 147,89,117 | 8 s survived (was black). Race chroma. |
| pr-mujoco-3396 | P | 107,80,45 | brown field. Not three faces. |
| pr-mujoco-warp-1541 | P | 107,81,47 | same mountain. Same miss. |
| pr-mujoco-3450 | P | 104,69,23 | same mountain. Same miss. |
| pr-nemo-relay-481 | P | 155,134,157 | purple arena. |
| pr-openxla-46539 | P | 52,54,70 | dark street. |
| pr-polychrom-79 | P | **155,25,89 = 8 s** | magenta plate. No gates. |
| pr-pyrefly-4180 | P | 137,108,117 | paper/night. |
| pr-tensorflow-124410 | P | 147,102,131 | stand chroma. |
| pr-topograph-432 | P | 67,44,54 | throne dark. Title field is Nazarick. |
| pr-triton-kernels-22 | P | 116,101,97 | ink shrine. |
| pr-xnnpack-10801 | P | 169,164,166 | pale palace. |

Play grade: **24/24**. Picture grade: **not 24/24**. Polychrom, MujoRush, Aether, Caustic LOW, Epsilon statue, Monodromy crack still fail their 0.1s.

---

## 2. Island walk (after the 24)

The north follows a **mountain law** (`terrain.js` 14–22): relief only inside `LAND_COLLIDERS`. A foot (`FOOT` + `APRON` + `rise()`) grades the snow into the cone. Triton, MujoRush, XNNPACK are collider → apron → wide peak → painted mesh.

The Fountain is **not in that law**.

| law | Triton / Mujo / XNNPACK | Fountain (`peak.js`) |
|---|---|---|
| `LAND_COLLIDERS` | yes (6 / 13 / 4 circles) | **none** |
| `FOOT` / `APRON` | 2.4–7 / 1.5–1.8 | **none** |
| In `PEAKS[]` | yes | **no** — second pass after `mountains()` |
| Footprint | tens of metres | **edge r = 14 m**, 21 m high |
| Outside the foot | graded | **y = 0** (`peakHeight` → `−∞`) |

`peak.js` line 1: “a spire mountain standing alone.” 21 m in a 7.5 m annulus, `pow(1-t, 1.3)`, then flat snow. Path on y=0 at (45, 58) until the cliff. Neighbours (Caustic, Epsilon, Monodromy) sit ~48 m away on open snow. That is a prop, not a mountain.

---

## 3. Fountain score: **0**

Given **0** because it is a mountain out of nowhere. It does not follow the island’s mountain law. Fixing it is **not** “add foothills to the spire.” Fixing it is:

**A plateau, made into a temple. The fountain is inside the temple.**

---

## 4. Polygons + shaders (a law)

Someone said the cutscenes are costly: too many polygons, too little shader. That is true of the **pockets**. It is not “delete every triangle.”

Genshin, and every game that looks like a game, is a **hybrid**. This is law, not mood.

| layer | triangles do | maps do | shaders do |
|---|---|---|---|
| Hero figure | silhouette, edge flow for outline | ramp, face SDF, ID, baked normal | light: rim, metal lobe, painted shadow |
| World / island | instance, merge, LOD, one heightfield | vertex colour, one atlas | fake light, fog, palette, cheap GI |
| FX / pocket sky | almost none (a hull) | none, or a noise LUT | the place: flood, volume, FBO, fullscreen |

**Law**

1. **Polygons are silhouette.** If the outline at 32 px does not name the thing, more loops will not. Fail → 2D card or ink, not a denser lathe.
2. **Maps are frequency.** Freckle, panel line, metal scratch, face shadow live in a texture or an SDF. They do not live in extra edge loops.
3. **Shaders are light and name.** A still with HUD ignored must be nameable from the fragment (void flood, manhwa grain, fresco plaster, Gate gold). Stock `MeshStandardMaterial` as the *only* light is below floor on a hero or a pocket city.
4. **One material family per dock.** Palette hexes are authored. Do not invent a second PBR city inside the pocket.
5. **Fog is a uniform, not a vibe.** Island fog is `C.sky` `#cfe6f8` 80–190. A custom `ShaderMaterial` that skips `UniformsLib.fog` is a miss (T98). Pocket may kill fog; it must hand it back on collapse.
6. **Instance repeats.** Columns, lanterns, stars, gates: `InstancedMesh`. A for-loop of `mesh` is a miss.
7. **Kill is a pass, not a crowd.** Predator, Hollow Purple, Enuma, Dismantle = fullscreen / FBO / one volume hull. Not a new sculpted army.

Industry jobs (not three skins to copy): Bruno owns the **island** (low-poly, instance, merge). Active Theory owns the **pocket** (material *is* the shader; they dropped Three’s lighting). Lusion owns the **statue** (one object, expensive pass, displacement). Genshin owns the **figure test**: silhouette at 32 px; face SDF or ink; ramp shadow (painted hue, not `albedo * 0.2`); outline; one family. Fail any line → 2D. No third option of “just add tris.”

Budget (pocket): ≤ 8 draw calls, ≤ 12k *environment* triangles, ≥ 1 shader that names the place, **0 extra MeshStandard cities**. One hero may sit above that. A crowd of heroes may not.

### Where to integrate (instance-specific, live hooks)

Do not start a new renderer. Hook what already draws.

**Island — shared `mat()` is the MeshStandard cache. Do not grow pocket cities here.**

```63:70:components/world/palette.js
export function mat(color, { flat = true, roughness = 0.75, metalness = 0, emissive = null, emissiveIntensity = 1, opacity = 1, vertexColors = false, side } = {}) {
  const key = `m|${color}|${flat}|${roughness}|${metalness}|${emissive}|${emissiveIntensity}|${opacity}|${vertexColors}|${side}`;
  return cached(key, () => new MeshStandardMaterial({
    color, flatShading: flat, roughness, metalness,
    emissive: emissive || "#000000", emissiveIntensity,
    transparent: opacity < 1, opacity, vertexColors,
    ...(side === undefined ? null : { side }),
```

**Island snow — one mesh. Keep Bruno. A snow sparkle is `onBeforeCompile` on this material, not a second terrain.**

```237:240:components/world/land/Terrain.jsx
export default function Terrain() {
  const geometry = useMemo(buildTerrain, []);
  const material = useMemo(() => new MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), []);
  return <mesh geometry={geometry} material={material} receiveShadow onClick={walkHere} />;
```

**Island water — this is the legal island shader pattern (perturb the stock shader, keep lights).**

```20:32:components/world/Sea.jsx
function seaMaterial(time) {
  const m = new MeshStandardMaterial({ color: C.sea, roughness: 0.3, metalness: 0.05 });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;")
      .replace(
        "#include <beginnormal_vertex>",
        `#include <beginnormal_vertex>
        objectNormal.xy += 0.06 * vec2(sin(uTime * 0.7 + position.x * 0.15 + position.y * 0.11), cos(uTime * 0.55 - position.x * 0.1 + position.y * 0.17));`,
      );
  };
  return m;
}
```

**Moat / fountain water — written `ShaderMaterial` + fog. Temple basin copies this, does not invent a second water stack.**

```105:116:components/world/land/parts/moat-uphill.js
export function streamMaterial(radiation) {
  return new ShaderMaterial({
    fog: true,
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      {
        uTime: { value: 0 },
        uLow: { value: new Color("#1f9fb0") },
        uHigh: { value: new Color(radiation) },
        uFoam: { value: new Color("#f4ffd6") },
      },
    ]),
```

**Seal contact shadow — already a `ShaderMaterial`. Statue / hero ground contact clones this, does not paint a black oval.**

```39:47:components/world/Seal.jsx
function contactShadow() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: CustomBlending,
    blendSrc: ZeroFactor,
    blendDst: SrcColorFactor,
    uniforms: { strength: { value: 1 } },
```

**Snowfall — custom shader, no fog. T98 fails until `UniformsLib.fog` is merged here.**

```63:72:components/world/sky/Snowfall.jsx
  const material = useMemo(() => new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uCentre: { value: [0, 0, 0] },
      uBox: { value: [60, 24, 60] },
      uPx: { value: 1000 },
    },
  }), []);
```

**Pocket stage — the AT hook. Every dock’s night / domain is this `voidMaterial()`, not a MeshStandard hall.** File lives on `origin/main`: `components/world/cutscene/Stage.jsx`. Halftone is already a fragment. Name the place by swapping `uNight` / `uHalo` / adding one volume hull. Do not replace this with a sculpted city.

```38:44:components/world/cutscene/Stage.jsx
function voidMaterial() {
  return new ShaderMaterial({
    uniforms: { uCore: v3(), uCell: { value: 6 }, uNight: v3(), uNightHigh: v3(), uHalo: v3(), uDots: v3(), uLight: v3(), uFresnel: v3() },
    side: DoubleSide,
    transparent: true,
    depthWrite: false,
```

Moves attach through `components/world/cutscene/kit.jsx`: `<Stage />`, `<Speaker />`, `useCutFrame`. A new dock shader is a material on a hull inside `moves/<id>/`, uploaded as a uniform on that `useCutFrame`. It is not a new post stack.

**Instance hooks (do not invent a fourth stack)**

| dock | file (origin/main) | what the shader must do |
|---|---|---|
| Caustic / Sukuna LOW | `moves/p-caustic/susanoo.js` | Hull + additive fresnel already. Retarget the hull to **Sukuna / shrine-shadow**, manhwa grain in the fragment. Keep one merged mesh. |
| Aether | `moves/p-aether-lang/purple.js` + `Stage.jsx` | Flood or Hollow Purple as the 3 s subject. Not VOID type on night. |
| Epsilon pocket | `moves/p-epsilon-hollow/slime.js` + `fx.js` | Rimuru if kept: ramp + face SDF (ultra-modern), or slime-only. Veldora = `#6b3fa0` orb shader. |
| Epsilon island | `Seal.jsx` + monument | SEAL SEAL statue: written bronze/toon, not stock-only. Cameo = live `github.com/teerthsharma.png`. |
| MujoRush | `moves/pr-mujoco-3396/charcoal.js` | Fresco plaster, not a white banner field. Faces are terrain + one chalk shader. |
| Polychrom | `moves/pr-polychrom-79/world.js` | Gate rings in the fragment. Magenta `rgb(155,25,89)` plate is a miss. |
| Fountain temple | `moat-uphill.js` `streamMaterial` | Basin **inside** the cella. Radiation `#2bdc8a`. |
| Triton shrine | `moves/pr-triton-kernels-22/ink.js` | Same manhwa law as Caustic. Ink + screentone, one blood. |
| Topograph | `moves/pr-topograph-432/` | American-show lighting (key + fill + rim), not clay, not manga tone. |
| Snow / pull | `Snowfall.jsx`, `Island.jsx` fog | Fog uniforms ride the pull. |

Stock `MeshStandard` on a lathe human is why the live Rimuru body is shit. More subdivisions make that worse.

### All other is up to the mod

The law and the hooks above are locked. **Ramp tables, noise LUTs, exact GLSL after the first naming pass, which hull gets the volume, mobile quality rungs beyond “drop bloom/shadow maps,” and any dock not named in the instance table are the moderator’s.** Fill M01–M20 for those. Do not wait for another author essay. Do not add a new engine.

---

## 5. Dialogue, easter eggs, art style (all 24)

Shader/poly make them beautiful. Each world still needs a **locked art-style to grow into**. Owner locks first, then the rest of the clock.

| lock | art-style | live dock |
|---|---|---|
| Sukuna | **Korean manhwa** (webtoon: hard value cuts, full-bleed red, no Japanese screentone-as-the-look) | `p-caustic` = Sukuna / LOW. `pr-triton-kernels-22` = Malevolent Shrine, same law. |
| Ainz | **Manga art** (panels, speed lines, screentone, monochrome with one purple) | `p-epsilon-hollow` island / hideout / statue. |
| Rumbling | **Early Renaissance** (fresco, egg tempera, gold ground, Giotto/Masaccio weight — not manga, not WIT) | `pr-mujoco-3396` / `#1541` / `#3450` (one play). |
| Overlord | **American show** (adult Western TV: Castlevania / Invincible key-light, English staging, not clay, not manga) | `pr-topograph-432` Throne Room of Nazarick. |
| Rimuru | **Ultra-modern pretty anime** (2024–26 TV: clean gradients, film bloom, face SDF). Live Rimuru is the Epsilon slime/human. It looks shit. | `p-epsilon-hollow` *pocket* only. Highway is **not** Rimuru (Gordius / Fate). |

Caustic on `origin/main` still says Madara. **This issue remaps it.** LOW numbers stay (`look [-1.5, 3.8, -6]`, `eye [7.5, −3.4, 14]`). The titan is Sukuna, not Susanoo. Triton keeps the shrine so the franchise has a fight and a domain.

Epsilon keeps Tensura **lines** in the pocket (T42 already plays). The *island* is Ainz manga + SEAL SEAL. Two styles, one dock, via the switch.

Lines that are flex/credit stay numbered as in `data/showcase.json`. Homage lines below are the demand. No copied face.

| id | homage | art-style (grow into) | dialogue (land → seal → flex) | easter (HUD-off still must hide it) |
|---|---|---|---|---|
| `home` | Vinland / Thors | Yukimura watercolor. Paper `#e8dcc8`. No fight. | “You have no enemies.” / “I have no orcas, for I have no enemies.” / “Eleven landed contributions. Welcome home.” | Eleven beacons = eleven merges. Thors’ dagger as a jetty cleat. |
| `p-aether-lang` | JJK Infinite Void | MAPPA digital void. Hue 256. Glass `#d9c6ff` @ 0.12. | “Are you the strongest because you are Gojeal Satarou?” / “Or are you Gojeal Fishtarou because you are the strongest?” / “HOLLOW PURPLE!” | Six-eye ticks in the flood. Infinity symbol only when the core is behind the pup. |
| `p-caustic` | **Sukuna / LOW** (was Madara) | **Korean manhwa.** Full-bleed `#e5142e` on ash `#2a241f`. No Japanese tone-as-style. | “Know your place.” / “This is the power of a seal. 0.995 AUROC, with no ground truth.” | Two-finger cut as a crack in the hall glass. Shrine mouth in the LOW sky, not a lighthouse. |
| `p-epsilon-hollow` | Pocket: Tensura. Island: **Ainz**. | Pocket: **ultra-modern pretty anime**. Island: **manga**. | Pocket: “Kwahaha! What does that one do?” / “Oops. Wrong place.” Island plaque: `SEAL SEAL` / `founder of seal city`. Flex: “Bare metal x86_64. No POSIX. No libc…” | Live GitHub pfp on the plaque. Staff’s seven gems as seven syscalls. Slime left on the pool if Rimuru stays. |
| `p-faraday` | Railgun | 2000s JC Staff + cyanotype. Prussian `#0a4a7a`. | Two-voice already in DOM. Seal: “Not assumed. Found.” / “The field coupling, found rather than assumed.” | Coin is a token with `∇×`. Gekota as a stamp on the blueprint, one frame. |
| `p-monodromy` | Magi / Sinbad | Ohtaka palatial shonen. Gold `#d9a441` on teal. | “Relax. The loop closes.” / Ja’far panic in DOM / “Oops. Wrong dimension. Hold on.” / “5 dependencies, torch not required.” | Baal’s vessel as the vortex ring. Page-tear is the *dimension*, not a flash. |
| `p-nerve` | Death Note | Obata tenebrism. Roof `#1a0c0e`. Spot `#f2e6d8`. | “When it ends, I’m the one who writes yours.” / L: “The bells are loud today.” / “3 of its own 4 hypotheses withdrawn. 224 tests passing.” | Ryuk’s apple as a red folio on the parapet. Shinigami eyes only in the kill. |
| `p-planimeter` | Classroom of the Elite | Cool 2010s TV. Board `#2a4a32`. Red 50 `#e5142e`. | “Fifty. Again.” / Chabashira off-screen / “495 exact. 33 refused. 0 wrong.” | Chess overlay at 0.35. The 50 is circled on the paper, not the HUD. |
| `p-resolvent` | Frieren / Aura | KyoAni painterly. Gold scale `#ffe08a`. | “Your mana is so small.” / “Obey me.” / “Softmax and a Markov path. 175 declarations, zero sorry.” | Scale pans = softmax weights. Army count = 175 ticks on the courtyard. |
| `p-separatrix` | GER / JoJo P5 | Araki fresco + gold leaf. Plaster `#f4e8c8`, under-red `#b3122a`. | “King Crimson! Only the result remains!” / “You will never arrive at the truth.” | Red sketch under the gold. Diavolo in the saddle, never a copied face. |
| `p-tangle` | Your Name | Shinkai film still. Sky `#f3b36b`→`#e0559b`→`#3a2a6a`. | “Is the knot real?” / seal on the cord / “0 wrong certificates in 2,000 diagrams and 80 scenes.” | Cord stays on the flipper after twilight dies. Comet = one TDA bar. |
| `p-topological-ml-toolkit` | Accelerator | JC Staff 2000s Index. Overcast `#c8d4e4`. Arrows `#e5142e`. | “That much power, from a seal?” / “I just changed the direction. The shape was always there.” | White-eye pup. Academy City fold = a persistence diagram slamming shut. |
| `pr-highway-3244` | Fate/Zero Gordius | Ufotable cinematic. Road `#2a241f`. Cape `#c3122e`. **Not Rimuru.** | “Via Expugnatio! Ionioi Hetairoi, ride!” / “AAALALALALAI! 65.5x fewer comparisons. The slice already knew.” | Army as slice-overlap ghosts. Wheel in the right third. Iskandar’s red hair is a cape, not a face. |
| `pr-mujoco-3396` | Rumbling / AoT | **Early Renaissance fresco.** Charcoal paper `#d4c4b0`. Gold ground. Graphite `#3a3228`. | Faces: “If the seal eats all the fish…” / eat 1,282 coral, one blue remains / three-PR credit. | Three faces = three PRs. One blue cube = linear scratch. Do not split. |
| `pr-mujoco-warp-1541` | same play | same fresco | same | GPU forest as a second register in the fresco border, not a new cartoon. |
| `pr-mujoco-3450` | same play | same fresco | same | Hull probes as gold leaf scratches on the Wall. |
| `pr-nemo-relay-481` | Ultra Instinct | Toei 2010s DBS. Arena `#e8dcc8`. Aura `#e8f4ff`. | “Ultra Instinct… the body moves on its own.” / “23 files. One scaffold. I didn't even think.” / Beerus: “That's the power of the gods.” | Afterimages = duplicate requests. One scaffold globe in the arena floor. |
| `pr-openxla-46539` | U.S. of SMASH | Bones TV + Golden Age comic. Ben-Day. Cyan/magenta/yellow. | “Two runs. Two answers.” / “UNITED STATES OF SMASH.” / “5 lines, deterministic.” | Two ink colours = two hash orders. One smash = one output. |
| `pr-polychrom-79` | Gilgamesh | Ufotable Fate gold. Stage `#c3122e`. Gold `#d9a441`. | “Gate of Babylon. Kneel, mongrels.” / “Let me show you a treasure worthy of the King.” / “11/11 test pairs agree… Mismatched frees: 16 to 0.” | Gates as gold rings in the temple room (W4). Ea spiral only on kill. |
| `pr-pyrefly-4180` | Nine-Tails | Pierrot kiri-e. Paper `#f4e8c8`. Fox `#c3122e` cut-paper. | “You can't hold me forever!” / “Flying Thunder God.” / “208 two-module SCCs chained in one Rust test.” | 208 links. Violet hoop at 100. Pin is brass, not a HUD number. |
| `pr-tensorflow-124410` | MUDA / JoJo | Araki / David Production. Stand `#e8b84a`. | “Oh? You're approaching me?” / MUDA barrage / “Four edges. Three remain. +362/-26 across 4 files.” | Fourth edge drowns. Time-stop invert is one readable beat. |
| `pr-topograph-432` | Nazarick / Overlord | **American show.** Key `#a23cff`, fill `#1a0c24`, rim gold. Not clay. Not manga tone. | “Ainz Ooal Gown is legend.” / “Rejoice!” / “145 lines changed across 4 files…” / “Ainz: You are dismissed.” | Floor guardians as silhouettes in TV lighting. HUD title is Nazarick, never NVIDIA MOAT. |
| `pr-triton-kernels-22` | Malevolent Shrine | **Korean manhwa** (same Sukuna law as Caustic). Ink `#1c1824`. Blood `#e5142e`. | “Domain Expansion.” / “Malevolent Shrine. Only the scheduled blocks survive.” / “804 lines added, 17 tests passing.” | Unscheduled city blocks shear away. Shrine jaws = causal triangle. |
| `pr-xnnpack-10801` | Kyoka Suigetsu | Pierrot Bleach 2000s. Desert `#f4e8c8`. Sky `#0a0614`. | “Since when were you under the impression the gap was not there?” / “It was there all along.” / “6.42% lower peak. Workspace 144 MiB to 112 MiB.” | Leading-gap as the throne’s missing step. Sword snaps on kill. |

House: the seal is the only 3D face unless a guest passes the Genshin test **and** the dock’s art-style. Rimuru’s live human fails both. Sukuna / Ainz / Titans / Ainz-on-TV are silhouette + one prop, or ink, unless the mod proves the test.

---

## 6. Camera view (all 24)

Sitewide grammar does not nudge: **zoom out of the world → switch dimension → zoom into the seal.** Never a straight +z incoming dolly. `|into.from| < 0.2` is already forced off. Positive yaw = west. Elevation = eye height in metres. Clock: `timeline.js` `LENGTH` 8.2, impact 1.15, bloom 1.15–1.6, line A 2.3 unless the card says otherwise.

Default two-shot `EYE [-0.1, 0.85, 7.4] LOOK [0.7, 0.6, -1.0]` is the 7.5. Never use it as the zoom-in. Live `PULL_FAR = 44` is a shrug (θ ≈ 125°). Floor: \(d \ge 420\) (θ ≤ 23°). Prefer **900** on myth docks.

| id | pull | switch | into (after switch) | kill | home |
|---|---|---|---|---|---|
| `home` | small fjord breath only. **No switch.** | — | level `look [-3.0, 1.7, -3.0]`, `eye [0.9, 0.0, 11.0]` | rain | wash off; eleven beacons stay |
| `p-aether-lang` | \(d \ge 900\), FOV 28→44. Live pull **18 m** is a miss. | void at the coin | **180°** (`from = π`), eye 0.4 m, looking *out* through the flood | Hollow Purple | `[-44, -26]`, loops-stop credit |
| `p-caustic` | \(d \ge 900\) | WIDE is the smash, not a path | **LOW** `look [-1.5, 3.8, -6]`, `eye [7.5, −3.4, 14]` (28° off +z). Sukuna fills the sky. | Dismantle / shrine slash (was meteor `HIT2 [5, −38]` r 32 — same beat, new picture) | lighthouse / 0.995 AUROC |
| `p-epsilon-hollow` | \(d \ge 900\) | Tensura pocket (pretty) | 35° (`from ≈ 0.611`), eye 1.2 m, Veldora in sky | Predator maw | **second switch**: statue, LOW 20° west, eye 1.6 m on the plaque. Ainz-manga hideout behind. |
| `p-faraday` | \(d \ge 420\) | cyanotype | **90°**, eye 0.6 m, coin in the near foreground | coin flick / rail burn | island under the burn |
| `p-monodromy` | \(d \ge 420\) | palace | **20° west**, eye 0.5 m, **up** the vortex | page-tear dimension | remade `[0, 48]` |
| `p-nerve` | \(d \ge 420\) | roof | **15° east**, eye 0.4 m, bells above | three hypotheses buried | 224 tests |
| `p-planimeter` | \(d \ge 420\) | classroom | **10° west**, eye 1.1 m, onto the calm face. Not an aisle push. | CHECKMATE | 495 exact |
| `p-resolvent` | \(d \ge 420\) | courtyard | **40° east**, eye 0.8 m, scale between pup and dais | limiters off; camera pulls as the pup “grows” | 175 declarations |
| `p-separatrix` | \(d \ge 420\) | fresco | **12° west**, canted, eye 1.4 m over the wall | Requiem erase | certified or refused |
| `p-tangle` | \(d \ge 420\) | twilight | **170°**, eye 2.0 m, girl and sun | comet; twilight dies | cord on the flipper |
| `p-topological-ml-toolkit` | \(d \ge 420\) | overcast | **25° east**, eye 1.4 m, arrows in the foreground | city folds | direction credit |
| `pr-highway-3244` | \(d \ge 420\) | road | **25° west**, eye 0.3 m, wheel in the right third. 0° is still a straight in. | rivals wrap; race stays through line B | 65.5x |
| `pr-mujoco-3396` | \(d \ge 900\), `camFar ≥ 900`, fog past 600 | Wall | **25° west**, eye 1.1 m, crowned face `[0, 7, −30]` fills the sky | lightning; eat; Wall dies | real MujoRush under the drawing |
| `pr-mujoco-warp-1541` | same | same | same play | same | same |
| `pr-mujoco-3450` | same | same | same play | same | same |
| `pr-nemo-relay-481` | \(d \ge 420\) | arena | **30° east**, eye 4.2 m looking **down** | form gutters | 23 files |
| `pr-openxla-46539` | \(d \ge 420\) | street | **15° west**, tipped ~10°. Not a street-axis push. | Detroit then U.S. Smash | 5 lines |
| `pr-polychrom-79` | \(d \ge 900\) off the **plateau** | Gate of Babylon | **30° east**, eye **inside the temple**, onto the seal at the basin. Live `elev −1.2` was a fake-spire look-up. | Enuma Elish | remade **in the temple**, door to plateau light |
| `pr-pyrefly-4180` | \(d \ge 420\) | paper night | **45° west**, eye 0.55 m, fox over the pup | 208-link seal | SCC credit |
| `pr-tensorflow-124410` | \(d \ge 420\) | stand | **20° east**, eye 1.9 m | time-stop invert; fourth edge drowns | +362/-26 |
| `pr-topograph-432` | \(d \ge 420\) | hall | **20° west**, eye 0.5 m, **up** the stair. Card `view [[0,1,0],[0,0.5,5]]` is a straight in — forbidden. | lashes; span breaks | 145 lines |
| `pr-triton-kernels-22` | \(d \ge 420\) (live 46) | Shibuya ink | `from = −0.2386`, eye 1.4 m. `SHOT.k` 0→1 is the zoom-in, not an avenue dolly. | unscheduled blocks cut | 804 lines |
| `pr-xnnpack-10801` | \(d \ge 420\) | Las Noches | **10° west**, eye 4.2 m, seal on the rising throne | illusion snaps | 6.42% |

Path of the eye on pull: **back and up**, pitch ~14° (`WIDE_PITCH`), along the follow’s azimuth. Never nearer than follow. Never a +z push at the subject. Switch at the **wide**, impact / bloom. Then arc into the seal. Kill may open a third angle. Still not azimuth 0.

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
| T21 | F | Place is not named by a fragment. | shader | ≥ 1 shader whose still names the homage (void flood, Sukuna LOW volume, cave pool). |
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

### W4 Fountain — scored **0** (T46–T53)

Walked after the 24. `peak.js` is a 21 m spire, foot 14 m, no collider, no apron, pasted on y=0. That is not a mountain. All eight ticks fail until the **plateau-temple** exists.

| id | now | why | fix | earn |
|---|---|---|---|---|
| T46 | F | Sudden mountain. No `LAND_COLLIDERS`, no `FOOT`/`APRON`. 21 m in 7.5 m. | terrain | Delete the spire overlay. Landform must use the same foot law as Triton/Mujo/XNNPACK **or** stop pretending to be a mountain. |
| T47 | F | Not a plateau. Cap is a 6.5 m disc on a spike. | terrain | Plateau: flat top ≥ 18 m across, rim 2–4 m, sides a mesa (keep-like), not `pow(1-t, 1.3)`. |
| T48 | F | No temple. Basin + helix sit on bare rock. | poly | Temple on the plateau. Stone `#6a625c` / gold `#d9a441`. Door on +z. Roof reads at 35 m. |
| T49 | F | Fountain is the *peak*, not *inside*. | poly+shader | Basin **inside** the temple. Radiation `#2bdc8a`. Not on the roof, not on the snow. |
| T50 | F | Polychrom 3 s = 8 s = rgb(155,25,89). | shader+cam | Pocket is gates. Home is the temple room. |
| T51 | F | Pull `far = 44`. | cam | `d ≥ 900` off the plateau. |
| T52 | F | Card look-up from a fake basin is not earned. | cam | Into 30° east, eye inside the temple, onto the seal at the basin. |
| T53 | F | Remade on the magenta plate, not in the temple. | cam | Home still: interior, fountain, door to plateau light. |

W4 now: 0 P / 8 F → **0.0 / 0.8**

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
| T79 | F | Caustic 3 s is the hall (warm 102,79,65), not LOW Sukuna. | cam | 3 s is the LOW lens `eye [7.5, −3.4, 14]`, manhwa grain. |
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
| W4 fountain | 0 | 8 | 0.0 / 0.8 |
| W5 docks | 26 | 6 | 2.6 / 3.2 |
| W6 punches | 4 | 4 | 0.4 / 0.8 |
| Island | 4 | 3 | 0.4 / 0.7 |
| **Total** | **50** | **50** | **5.0 / 10.0** |

Recount: 10+4+2+0+26+4+4 = 50 P. 5+11+13+8+6+4+3 = 50 F. 50+50=100.

**Score = 10.0 − 5.0 = 5.0 / 10.0.** Fountain band is 0. 24/24 working is T54–T77 only (2.4 of 10).

To **8.5**: need 35 of the 50 fails flipped (15 fails left). Cheapest 35 are T08–T12 (cam pull), T50 T78–T81 T84–T85 (pictures), T19–T23 (shader law), T31–T41 (hideout+statue), T46–T49 T52–T53 (plateau-temple). W6 last.

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
| **W4** | Fountain temple | Plateau under mountain law. Temple on the deck. Fountain inside. Polychrom remade in the cella. |
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
| [Active Theory](https://activetheory.net/) | **pocket** | material **is** a shader. They dropped Three’s lighting. Void / Sukuna LOW / cave = hull + fragment. FBO particles, not a sculpted crowd. See §4. |
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

## W4 — Fountain of Immortality (plateau → temple → basin inside)

`peak.js` today: `top 21`, `flat 6.5`, `edge 14`, profile `pow(1-t, 1.3)`, applied *after* `mountains()`. No collider. No foot. That is a cone on a desk. **Score 0.**

Do not add foothills to the spire. Do not keep a 21 m needle.

**FLOOR — three layers, one place:**

1. **Plateau (terrain, mountain law).** Mesa like the NVIDIA keep: flat top ≥ 18 m across, rim 2–4 m, sides rise from a **collider + FOOT/APRON** so the snow grades into the wall. Height of the deck ~6–8 m (keep-scale), not 21 m. `peakHeight` overlay goes away or becomes this mesa. Walkable deck. Dock on the deck’s +z edge, or a stair cut in the south face.
2. **Temple (built).** On the deck. Stone `#6a625c` `#3a3228`, gold leaf `#d9a441`, door +z. Roof / columns read at follow 35.5 m. Bruno instance for repeats (columns, lanterns). Not a MeshStandard palace-city.
3. **Fountain (inside).** Basin at the cella. Water `#7fc8f8`, radiation `#2bdc8a`. Helix / fall **in the room**, not down a fake cliff. If a fall leaves the temple, it leaves through a spout in the north wall onto a short apron, not a 21 m ribbon on bare snow.

**Polychrom:** pull \(d \ge 900\) off the plateau. Switch to Gate of Babylon. Into **30° east**, eye inside the temple, onto the seal at the basin. Kill: Enuma Elish. Home: remade **in the temple**, door open to plateau light. Magenta plate rgb(155,25,89) is a miss.

Do not turn this into a second Rushmore. Do not put the basin on the roof.

---

## W5 — 24 docks (director’s still)

Clock: `timeline.js` `LENGTH` 8.2, impact 1.15, bloom 1.15–1.6, line A 2.3. Default two-shot `EYE [-0.1, 0.85, 7.4] LOOK [0.7, 0.6, -1.0]` is the 7.5. Never use it as the zoom-in.

Positive yaw = west. `into.from` in radians. Elevation = eye height in metres. Azimuth 0 is a miss.

Live Chrome 2026-10-05 18:27 UTC on `460bafd`: 24 play, 0 black-voids. Picture misses: Aether type-on-purple, Caustic hall, Epsilon not statue, Monodromy no tear, MujoRush banner field, Polychrom magenta plate. Topograph title field is Nazarick.

### `home` — Igloo

Class igloo. Vinland. Stage `#7fc8f8`. Paper `#e8dcc8`. Dawn `#7fc8f8`→`#f3c98a`. Gold `#e8b84a`. Ink `#1c1824`. Beacon `#ffd27a`. **No switch.** Level lens `look [-3.0, 1.7, -3.0]`, `eye [0.9, 0.0, 11.0]`. Kill: rain. 3 s: watercolor fjord. No fight.

### `p-aether-lang` — Infinite Void (won)

Gojeal. Hue 256. Void `#140b26`. VOID `#c77dff`. Blue `#2f7dff`. Red `#ff2b3a`. Purple `#7b2cbf`→`#e94bff`. Glass `#d9c6ff` @ 0.12. Pull \(d \ge 900\). Into **180°** (`from = π`), eye 0.4 m, looking *out* through the flood. Fog off in the domain. 3 s must show flood or core. Live black card is a miss. Kill: Hollow Purple.

### `p-caustic` — Sukuna / LOW (remaps Madara)

See §5–6. Korean manhwa. LOW `look [-1.5, 3.8, -6]`, `eye [7.5, −3.4, 14]`. WIDE is the switch. 3 s is LOW under Sukuna, not the lighthouse. Live card still says Madara — that homage is superseded here.

### `p-epsilon-hollow` — Ainz island + Tensura pocket (supersede)

See W3 and §5–6. Island = Ainz manga + SEAL SEAL. Pocket = Rimuru ultra-modern (live slime; it looks shit). Stage `#1fb8ff`. Pool `#1a1440`. Veldora `#6b3fa0`. Maw `#0a0614`. No 3D human unless Genshin-test **and** pretty.

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

### `pr-topograph-432` — Nazarick, American show (won)

See §5–6. Not clay, not manga tone. Stage `#a23cff`. Hall `#1a0c24`. Gold `#d9a441`. Into **20° west**, eye 0.5 m, **up** the stair. Card `view [[0,1,0],[0,0.5,5]]` is a straight in — forbidden. **HUD title must not say THE NVIDIA MOAT.**

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

## How much gap is left

This is the closer of the issue. The ledger above is **5.0 / 10.0** on `460bafd`: 50 pass, 50 fail, each fail −0.1.

| target | open authored fails | what that means on this SHA |
|---|---:|---|
| **now** | 50 | Fountain band 0. Pull still 44 m. Pockets are MeshStandard museums. Hideout/statue not FLOOR. Five art-styles unlocked only as words. |
| **8.5** | ≤ 15 | Flip **35** fails. |
| **9.0** | ≤ 10 | Flip 40. |
| **10.0** | 0 authored **and** every M-row the mod filled | Author cannot mark M01–M20. |

**24/24 playing is 2.4 of 10** (T54–T77). It is already in the bag. It does not move the score.

**Cheapest 35 toward 8.5**

1. T08–T12 — pull \(d \ge 420\), prefer 900, FOV 28→40–48, switch on a coin (W1 / §6).
2. T46–T53 — delete the 21 m spire; plateau → temple → basin inside (W4). That whole band is 0 today.
3. T31–T41 — hideout at `[48, 68]`, SEAL SEAL plaque, live pfp, second switch (W3).
4. T19–T23, T50, T78–T81, T84–T85 — naming shaders + pictures (Aether flood, Caustic LOW Sukuna, Polychrom gates, Mujo faces, Monodromy tear). Hook `Stage.jsx` / `susanoo.js` / `streamMaterial`. Do not write a new engine.
5. Leave W6 punches and T100 (67/100 stills) for last.

**Author locked (do not reopen)**

- Grammar: zoom out → switch → zoom into the seal. No +z dolly.
- Fountain: 0 until plateau-temple-fountain-inside. Not foothills on a needle.
- Caustic = Sukuna / LOW / Korean manhwa. Triton = shrine / same manhwa law.
- Epsilon island = Ainz manga + SEAL SEAL. Epsilon pocket = Rimuru ultra-modern (live slime; it looks shit).
- MujoRush = early Renaissance, one mountain, `plays: "pr-mujoco-3396"`.
- Topograph = Overlord as an **American show**. HUD is Nazarick.
- Shader law + the instance hooks in §4. All other GLSL is the mod’s.
- `data/showcase.json` numbers stay. `?hud=off` never fires a cutscene. Igloo never switches. No copied face. No new package.

**Mod fills**

- M01–M20: empty. Each filled row adds 0.1 to the denominator and starts F.
- Ramp tables, noise LUTs, exact GLSL after the first naming pass, mobile rungs beyond drop-bloom, any dock not in the §4 instance table.
- Beats on the same homage if they sit.
- Whether Rimuru’s pocket keeps a 3D body (must pass Genshin + pretty) or goes slime-only / 2D.

**Chrome gate (still the probe)**

`channel: "chrome"`, 1280×800. Non-home 0–1.4 s: island shrinking, end of pull θ ≤ 23°. `home` 3 s: watercolor, no fight. `p-caustic` 3 s: LOW Sukuna. `p-aether-lang` 3 s: flood or core. `pr-mujoco-3396` 3 s: three faces. `pr-highway-3244` 8 s: race visible. `pr-polychrom-79` 3 s: gates in the temple. `pr-topograph-432`: title Nazarick. `p-epsilon-hollow` HUD-off: statue + plaque. `p-monodromy` 8 s: page-tear. Every other 3 s: already in the pocket, bent into the seal.

Does not reskin Instrument Sans, cream cards, or the minimap. Does not rewrite `data/showcase.json`. Graphic stills without arrivals remain the 67 / 100 object-world work (T100). Reduced motion keeps a bent `into`, not the passport two-shot (T15).

The gap is **5.0 points**, not a vibe. Write the plan after this spec is approved. Do not implement from this file until then.
