# Grandify every arrival (8.5–10)

Live `teerthfolio.vercel.app` on `origin/main` already plays 24 approved first-arrival cutscenes. Chrome stills of those 24 on 2026-10-05 (Playwright `channel: "chrome"`, 1280×800, 3 s and 8 s, 2 workers) name 22 pictures and 2 voids. The pictures sit at about **7.5**: a locked two-shot, a bubble, HUD chrome on top. The cards already promise 8.5–10 (other dimensions, unique lenses, a death). The clock grew. The picture did not.

This issue is the spec. Stills without cutscenes stay on the 67 / 100 object-world grade. There is no stills reskin, no new package, no copied face.

**What changes:** a shared camera kit, a three-way world rule, one building move at Epsilon-Hollow, and a dossier per dock (palette, approach degree, what dies). **What does not change:** `data/showcase.json` numbers, punch lines already on the cards, `plays: "pr-mujoco-3396"` for the three mountain docks, Bruno cute, `?hud=off` never firing a cutscene.

---

## Live Chrome, 2026-10-05

Provenance: `verification/observe-all/report.json` and the 48 PNGs under `verification/observe-all/`. No console errors on any of the 24.

| band | count | ids |
|---|---|---|
| draws | 22 | home, 10 labs except Aether, 11 PRs except Highway-at-8s |
| void | 2 | `p-aether-lang` (3 s black 0.88, 8 s 0.83), `pr-highway-3244` (3 s 0.00 then 8 s 0.85) |
| color void | 1 | `pr-polychrom-79` magenta field, no Gate |
| HUD lie | 1 | `pr-topograph-432` plaque Nazarick, title bar THE NVIDIA MOAT |
| one mountain | 3 | `#3396` `#1541` `#3450` all replay `pr-mujoco-3396` (correct theme, white card) |

Default two-shot in `lib/world/cutscene/timeline.js`: eye `[-0.1, 0.85, 7.4]`, look `[0.7, 0.6, -1.0]`, pup yaw `0.6`. That locked front angle is the 7.5. Caustic already breaks it (`cards/p-caustic.js` WIDE → LOW looking up the Susanoo → WIDE) and is the reference.

---

## Camera kit

Every approved arrival except the Igloo plugs into four beats. A card adds `approach: { from, elev, fov }` and `kill: { what, at }`. Default two-shot is the reduced-motion / `still` fallback only. No 24 private `KEYS[]` files unless a dock already has one (MujoRush, Triton, Planimeter, Caustic) and that file is made to *read*.

| beat | clock | lens |
|---|---|---|
| **Approach** | 0–~2.2 s | Enter from that dock’s own azimuth. Not default +z. Low or high, left or right. Unique per place. |
| **Settle** | line A | Money angle. Guest or landform fills the sky. Pup is a speck or a profile, never a passport photo. |
| **Kill** | move / line B | Something dies: illusion, wall, domain, rival, paper, charcoal, *or the dimension’s canon*. A third degree is allowed for the death. |
| **Home** | credit / collapse | Follow camera, fog, far plane, HUD restore. Credit on snow. |

Hard rules:

- HUD chrome (nav, Skip) may stay. The **picture** names the place with those ignored. A white or black card plus a banner is a miss.
- Island fog `C.sky` `#cfe6f8` 80–190 is pushed out for the drawing and handed back on collapse. The MujoRush march sits at 200–470 m; under current fog it is sky-color.
- Lines and JSON numbers stay. Shape and colour only. No copied face.
- `?hud=off` stills never fire a cutscene.
- Skip restores follow in ≤ 0.08 s. No stuck ortho.

---

## Three kinds of place

### 1. Igloo — this island

`home` only. Neutral zone, no radiation (`places.js` `radiation: null`). Vinland watercolor. Thors. “You have no enemies.” No win. No death. The seal sits. The orca sinks. Rain washes the paper off. Home is underneath.

### 2. Won dimensions — the seal is already the one who won

The camera comes in from a strange degree because this is *their* world. The seal is Madara, Gojo, Giorno, Ainz, Aizen, Accelerator, Iskandar. What dies is the illusion, the wall, the rival, the domain, the paper. The seal walks out.

### 3. Seem-defeated dimensions — canon would crush them

The world says they lost. They **break that dimension’s canon, supersede it, and get remade** on the real dock. The death is the *rule*, not a rival. Hard supersedes:

| id | homage | beat |
|---|---|---|
| `p-monodromy` | Magi / Sinbad | Baararaq Saiqa cracks the fourth wall. “Oops. Wrong dimension.” Loop closes below. Remade at the dock. |
| `pr-polychrom-79` | Fate / Gilgamesh | Enuma Elish tears space. Gold-red shards. Pup drops back at the Fountain. |

`p-epsilon-hollow` sits with them: the void maw eats the seal, then the sphere was the return. The **building** on the island is also moving (below). Nemo (Ultra Instinct runs out) and Aether (Hollow Purple erases the void) stay **won** unless a later comment moves them.

Return is always the same: the pocket world cracks and the real dock is what was there.

---

## Epsilon-Hollow building (island, not only the cutscene)

`components/world/monuments/Collapse.jsx` is an Atomium / Unisphere geodesic globe on a lift shaft at place centre `[18, 30]`. `OUTER_R` 2.1 m, `CORE_Y` 3.7 m, inner sphere 0.72 m, candy struts `#ff5d8f` `#ffb238` `#33e6b3` `#5b8dff`. Showcase line: “Memory, files and scheduler, on one sphere.”

**The centre is a statue of the seal. The sphere moves to a corner of the plaza.**

- Statue: the pup, bronze or dressed granite, on the snow at the place origin. Dock (+z) looks at the statue first. HUD-off still names Epsilon-Hollow from the silhouette of a seal, not a circle.
- Sphere: the existing geodesic (struts, inner Epsilon, payload thread) shifts to one plaza corner — northwest preferred, so it does not sit between dock and statue. It stays readable as “the one sphere” from the dock, just no longer the optical centre.
- Anomalies (`LabAnomalies.jsx` orbiting boulders) orbit the statue or the corner sphere, not an invisible centre in the middle.
- Cutscene (Tensura, Veldora, Megiddo, Predator) plays in the pocket dimension. On return the statue is what the lens finds. The sphere is in the corner of that still too.

This is a building change and a cutscene-return change. It is in this issue. It is not a separate graphic-67 task.

---

## Fog, far, HUD

`Island.jsx` linear fog `[C.sky, 80, 190]`. `CameraRig.jsx` only pushes the band when the camera stands farther than follow 35.5 m. Cutscene cameras that look 30–80 m at a wall still sit inside the fog start; anything past 190 m (Rumbling, Founding Titan, Infinite Tsukuyomi moon at z −118 is close; march 200–470 m is not) fades to `#cfe6f8`.

Each full drawing owns `camera.far` and fog near/far for its length, then hands them back on collapse. Stage bloom (`timeline.js` `radius` 16, some cards 26–45) is not a substitute for fog.

HUD title must match the place. `pr-topograph-432` plaque “THE THRONE ROOM OF NAZARICK” with title “THE NVIDIA MOAT” is a miss on live main.

---

## Dossier key

Each dock below: class, homage, palette (hex as the shaders pick them), live Chrome, approach (azimuth from +z, elevation, fov), settle still, kill, home, lines. Azimuth 0 is the current two-shot (+z toward the lens). Positive yaw is west (right-hand about +y). Elevation is eye height in metres. These numbers are the demand; a later commit may nudge a degree if the still names the place.

---

### `home` — Igloo (this island)

- **Class:** igloo.
- **Homage:** Vinland Saga, Thors, “You have no enemies.”
- **Palette:** stage `#7fc8f8`. Watercolor paper `#e8dcc8`. Dawn wash `#7fc8f8` → `#f3c98a`. Vinland gold `#e8b84a`. Ink Thors `#1c1824`. Beacon warm `#ffd27a`.
- **Live:** 3 s / 8 s draw. Cape + halo pup on the jetty, two penguins, “You have no enemies.” Black 0 / 0.
- **Approach:** none. This is the island. Level lens down the fjord already on the card: look `[-3.0, 1.7, -3.0]`, eye `[0.9, 0.0, 11.0]`.
- **Settle:** pup on the jetty’s end, Thors behind, igloo left, fjord mouth ahead.
- **Kill:** nothing. Rain only.
- **Home:** the wash runs off. Eleven beacons stay as memory, not as a second world.
- **Lines stay:** sil “You have no enemies.” / seal “I have no orcas, for I have no enemies.” / “Eleven landed contributions. Welcome home.”
- **Grandify:** keep the watercolor. Do not turn home into a fight. The 7.5 here is the wobbly bubble track, not the picture.

---

### `p-aether-lang` — Infinite Void (won)

- **Class:** won. Gojeal owns this koan.
- **Homage:** Jujutsu Kaisen, Domain Expansion: Infinite Void.
- **Palette:** stage hue 256. Void `#140b26`. VOID lettering `#c77dff`. Lapse Blue `#2f7dff`. Reversal Red `#ff2b3a`. Hollow Purple `#7b2cbf` → `#e94bff` (lab radiation). Glass floor `#d9c6ff` at 0.12 alpha. Stars off.
- **Live:** 3 s VOID on black (0.88). 8 s Gojeal bubble on black (0.83). No pup, no domain, no purple. Length 26.7 s. The clock is a bubble.
- **Approach:** from **inside** the domain, 180° from the dock, eye at 0.4 m looking *out* through the flood toward a white-violet core. Not the default two-shot into a black sphere.
- **Settle:** core behind the pup, silhouette (band, pockets) at `[2.2, 0, -3.6]`, glass under both. Line A.
- **Kill:** Hollow Purple. Blue and red collide. The void dies. A purple tunnel.
- **Home:** pup upright at `[-44, -26]`. Credit: “Loops stop when their shape stops changing.”
- **Lines stay:** “Are you the strongest because you are Gojeal Satarou?” / “Or are you Gojeal Fishtarou because you are the strongest?” / “HOLLOW PURPLE!”
- **Grandify:** a 3 s still must show the flood or the core. A black card with VOID type is a miss. Fog off inside the domain (there is no 80 m).

---

### `p-caustic` — Madara (won) — the template

- **Class:** won.
- **Homage:** Naruto Shippuden, Perfect Susanoo, Tengai Shinsei, Infinite Tsukuyomi.
- **Palette:** stage `#e0559b`. War sky `#2a241f` `#6a5c4d` `#bfa98b` `#4a3f34`. Moon `#b3122a` + pink sheen `#e0559b`. Sepia keep 0.12. Susanoo body dark translucent, rim blue-fire (the one saturated thing besides the moon). Meteor ash `#3a3228`. Lighthouse return is the lab’s own coral/blue glass.
- **Live:** 3 s no bubble, spider-pup under the blue hall (post-set or pre-war). 8 s “Is this… the power of a god?” on the cracked earth with the hall. Length 11.6. Shatter at 6.6. The war moon and the 32 m Susanoo are not in the 3 s still.
- **Approach:** card already has it. WIDE (look `[0.4, 1.15, -1.0]`, eye `[-0.1, 0.0, 10.6]`) → LOW (look `[-1.5, 3.8, -6]`, eye `[7.5, −3.4, 14]`) looking **up** the titan from the flank, 2.3–3.0 s → back to WIDE for meteors 4.5–5.3. That is the site language.
- **Settle:** alliance 48 ink on the ridge, blood moon, Susanoo ten pups tall at `[0.9, 0, −17]` scale 2.5. Line A from the ridge.
- **Kill:** meteor two, `HIT2` `[5, −38]`, r 32. The war is a shard mesh. The lighthouse was there.
- **Home:** “This is the power of a seal. 0.995 AUROC, with no ground truth.”
- **Grandify:** 3 s is the LOW lens under the Susanoo, not the lighthouse. 8 s may be the real dock after shatter. A 3 s still that is only the hall is a miss.

---

### `p-epsilon-hollow` — Tensura + statue (supersede + building)

- **Class:** supersede (void eats the seal; remade) **and** island building move.
- **Homage:** That Time I Got Reincarnated as a Slime. Rimuru, Veldora, Megiddo, Predator.
- **Palette:** stage `#1fb8ff`. Cave pool `#1a1440`. Crystals `#ff5d8f` `#33e6b3` `#5b8dff`. Veldora sphere `#6b3fa0` glass. Demon-lord hair `#1c1824`, gold eyes `#e8b84a`. Megiddo sun `#ffe08a`. Void maw `#0a0614`. Statue bronze `#8a7a68` dressed, or granite `#9e928d` with the place radiation `#06b6d4` in the eyes.
- **Live:** 3 s / 8 s draw. Pup vs dragon-in-a-bubble on purple water. “Kwahaha! What does that one do?” Black 0 / 0. The geodesic globe is the island building, not this still.
- **Approach:** from the cave mouth, 35° off +z, eye 1.2 m, looking at Veldora’s sphere. On return, from the dock looking at the **statue**, sphere in the northwest corner.
- **Settle:** Veldora land-speaker, Great Sage off-screen, pup at the pool.
- **Kill:** Predator. The maw eats sky, ground, and the seal. That is the explained return.
- **Home:** statue at `[18, 30]`. Sphere in the corner. Flex: “Bare metal x86_64. No POSIX. No libc…”
- **Building demand:** statue at origin. Globe (`Collapse.jsx`) translated to a plaza corner. Dock still open +z. HUD-off still names a seal, not a circle. Orbiting boulders retarget.
- **Lines stay:** “Kwahaha! What does that one do?” / “Oops. Wrong place.” / the bare-metal flex.

---

### `p-faraday` — Railgun (won)

- **Class:** won.
- **Homage:** A Certain Scientific Railgun. Cyanotype blueprint.
- **Palette:** Prussian paper `#0a4a7a` / `#123a66`. Cream linework `#f4e8c8`. Grid `#7fc8f8` at 0.15. Amber rise `#ffa927`. Rail burn `#ffd27a` → white. Touma ink `#1c1824`.
- **Live:** 8 s cyanotype city, flying pup, “Not assumed. Found.” Draws. Two-voice in the DOM.
- **Approach:** along the rail, 90° (from the coin’s side), eye 0.6 m, coin in the near foreground, city as blueprint beyond.
- **Settle:** fields at right angles. Touma charges from the right (speaker `[6.38, −3.65, −5.42]`).
- **Kill:** the coin flick. The railgun burns Touma and the sheet. The blueprint dies.
- **Home:** island under the burn. “The field coupling, found rather than assumed.”
- **Grandify:** keep the cyanotype. Push the lens so the rail is a diagonal across the frame, not a flat two-shot on blue paper.

---

### `p-monodromy` — Sinbad (supersede)

- **Class:** supersede. Hard.
- **Homage:** Magi. Sinbad, Baal, Baararaq Saiqa.
- **Palette:** stage `#1fbdb4`. Palace white/gold `#f4e8c8` `#d9a441`. Floor teal stars `#14b8a6`. Lightning `#e8f4ff`. Crack/white `#ffffff`. Ja’far ink `#3a2a6a`.
- **Live:** 8 s crowned pup, lightning, choir, “Relax. The loop closes.” Draws. Ja’far’s panic is in the DOM at 8 s.
- **Approach:** from the terrace below, 20° west, eye 0.5 m looking **up** the vortex and the palace. Canon says a king cannot fire this inside a portfolio.
- **Settle:** Ja’far panic line (move’s own bubble). Pup as Sinbad, Baal equipped.
- **Kill:** the **dimension’s rule**. The lightning breaks the fourth wall. “Oops. Wrong dimension. Hold on.” Shards fall. The loop closes below, not above. Remade at `[0, 48]`.
- **Home:** “Can it be undone? Topology answers: it closed below, not above. 5 dependencies, torch not required.”
- **Grandify:** the crack must read as a page tear, not a flash. 3 s should already have Ja’far and the palace, not a wait.

---

### `p-nerve` — Death Note (won)

- **Class:** won.
- **Homage:** Death Note. Rooftop, bells, tenebrism.
- **Palette:** stage `#b3171f`. Roof `#1a0c0e`. Spotlight `#f2e6d8` on the pup. Ryuk `#3a1020`. Chain `#5b6bff`. Notebook black `#1c1824`. Bell bronze `#c4a46a`.
- **Live:** 3 s / 8 s draw. Black chained pup, red stage, “When it ends, I’m the one who writes yours.” Black share 0.47 / 0.40 (dark on purpose, not a void).
- **Approach:** low on the roof, 15° east, eye 0.4 m, bells above, city drop behind. Looking up at Ryuk on the parapet.
- **Settle:** Ryuk line A. L at the edge for line B (“The bells are loud today.”).
- **Kill:** three of four hypotheses. The grains bury them. The bell tolls three times. The page goes to camera. The varnish cracks.
- **Home:** “3 of its own 4 hypotheses withdrawn. 224 tests passing.”
- **Grandify:** keep the dark. The 3 s still needs Ryuk or the bells, not only the chained pup in a spot.

---

### `p-planimeter` — Class 1-D (won)

- **Class:** won.
- **Homage:** Classroom of the Elite. Exact fifty.
- **Palette:** stage `#f3b36b`. Sunset through windows `#f3b36b` `#e0559b`. Board green `#2a4a32`. Red 50 `#e5142e`. Desk beech `#c4a46a`. Chabashira silhouette `#3a2a6a`. Chess overlay `#1c1824` at 0.35.
- **Live:** 8 s classroom sparkle, circled 50, “Fifty. Again.” Draws.
- **Approach:** from the aisle, 10° west, eye 1.1 m, push-in on the calm face (`lensAt` already on the card).
- **Settle:** paper reads 50. Chabashira line A.
- **Kill:** CHECKMATE. The chessboard. Class dismissed. The sunset dies into the island.
- **Home:** “495 exact. 33 refused. 0 wrong.”
- **Grandify:** hold the push-in. The eye-glint is the money frame. Do not pull back to a wide empty classroom.

---

### `p-resolvent` — Aura’s scale (won)

- **Class:** won (seems small, then the limiters come off).
- **Homage:** Frieren. Scale of Obedience.
- **Palette:** stage `#e0a043`. Courtyard stone `#6a5c4d`. Gold scale `#e0a043` `#ffe08a`. Army `#3a2a6a`. Aura hair `#e8dcc8`, cape `#7b2cbf`. Cracks gold.
- **Live:** 8 s tiny blue pup, army, scale, “Your mana is so small.” Draws.
- **Approach:** from inside the army, 40° east, eye 0.8 m, looking at the scale between pup and dais. The pup is a speck on purpose until the kill.
- **Settle:** Aura “Obey me.” Scale held up.
- **Kill:** limiters off. Scale swings and shatters. Soldiers kneel. Gold cracks unmake the courtyard.
- **Home:** “Softmax and a Markov path. Two weights on your scale. One operator. 175 declarations, zero sorry.”
- **Grandify:** the size jump must be a camera move (push back as the pup “grows”) not only a scale uniform.

---

### `p-separatrix` — Gold Experience Requiem (won)

- **Class:** won.
- **Homage:** JoJo Part 5. GER. Colosseum fresco and gold leaf.
- **Palette:** stage `#d9a441`. Plaster `#f4e8c8`. Red sketch under `#b3122a`. Gold leaf `#d9a441`. Giorno wig `#e8b84a`. King Crimson `#c026d3`.
- **Live:** 8 s Giorno wig, “King Crimson! Only the result remains!” Banner JoJo: Gold Experience Requiem. Draws.
- **Approach:** from the hypogeum gap, canted, 12° west, eye 1.4 m over the wall lip (card already).
- **Settle:** Diavolo across the arena `[5.2, 0, −11.4]`.
- **Kill:** Requiem. Time erased returns to zero. Diavolo into the saddle. Gold un-paints the fresco.
- **Home:** “You will never arrive at the truth.” / certified or refused.
- **Grandify:** the erase must take plaster off to the red sketch, then gold back. A still of only the wig is 7.5.

---

### `p-tangle` — musubi (won)

- **Class:** won. The twilight dies, not the seal.
- **Homage:** Your Name. Kataware-doki, red cord.
- **Palette:** stage `#e0559b`. Sky `#f3b36b` → `#e0559b` → `#3a2a6a`. Lake `#7fc8f8` with sun path. Cord `#e5142e`. Girl against sun, black cutout. Comet `#ffe08a`.
- **Live:** 8 s dark pup, red thread, “Is the knot real?” Draws.
- **Approach:** from across the lake, 170° (from the girl’s side), eye 2.0 m, looking at the pup with the shrine and comet behind.
- **Settle:** land “Is the knot real?” Tail at the girl `[4.6, 4.2, −27]`.
- **Kill:** kataware-doki ends. The comet falls. The cords cannot part. The twilight dies. The cord stays on the flipper.
- **Home:** “0 wrong certificates in 2,000 diagrams and 80 scenes.”
- **Grandify:** 3 s should already have the girl and the sun, not an empty shore.

---

### `p-topological-ml-toolkit` — Accelerator (won)

- **Class:** won.
- **Homage:** A Certain Magical Index. Vector reverse. Shape and colour only.
- **Palette:** stage `#3b82f6`. Overcast `#c8d4e4`. Arrows `#e5142e`. Plasma orb `#7b2cbf` → grid `#3b82f6`. Rival silhouette `#1c1824`. White-eye pup.
- **Live:** 8 s white-eyes, red arrows, “That much power, from a seal?” Draws.
- **Approach:** from the rival’s ray, 25° east, eye 1.4 m, arrows as the foreground.
- **Settle:** storm in. Every object wears a vector.
- **Kill:** reverse. Orb pops. Shockwave folds Academy City like a map.
- **Home:** “I just changed the direction. The shape was always there.”
- **Grandify:** the fold-shut is the death. A still of arrows on a blue floor without the city is 7.5.

---

### `pr-highway-3244` — Gordius Wheel (won)

- **Class:** won.
- **Homage:** Fate/Zero. Iskandar, Via Expugnatio.
- **Palette:** stage `#ff5a3c`. Road `#2a241f`. Crimson cape `#c3122e`. Bronze `#c4a46a`. Bulls `#1c1824`. Lightning `#ffe08a`. Flag `#c3122e` / gold.
- **Live:** 3 s chariot + army, “Via Expugnatio! Ionioi Hetairoi, ride!” — actually good. 8 s same line, world gone, black 0.85. Length 25.8. Late void.
- **Approach:** from the grid, 0° but **low**, eye 0.3 m, wheel filling the right third (the 3 s still already has this).
- **Settle:** keep 3 s.
- **Kill:** the rivals, not the picture. The flag wraps like a page and they roll onto the roundabout. The 8 s black card is a miss.
- **Home:** “AAALALALALAI! 65.5x fewer comparisons. The slice already knew.”
- **Grandify:** do not hide the island until collapse. The race stays visible through line B.

---

### `pr-mujoco-3396` / `#1541` / `#3450` — Mount MujoRush (won, one mountain)

- **Class:** won. One cinematic. `plays: "pr-mujoco-3396"`. Do not split into Frieza or One Punch.
- **Homage:** Attack on Titan. The Walls were Titans. The Rumbling.
- **Palette:** stage `#ff8a3a` hue 24. Charcoal paper `#d4c4b0`. Graphite `#3a3228`. Burnt-orange sun `#ff8a3a`. Coral cubes `#e0559b`. One blue cube `#2f7dff`. Sea `#0a4a7a`. Faces granite `#9e928d`. Radiation `#` of the district (deepmind).
- **Live:** all three docks replay `#3396`. Banner THE WALLS WERE TITANS. White field, tiny pup. Black 0 / 0. No Wall, no three faces, no march, no Eren. Card `length` 20. `world.js` already: Wall H 20, faces 8 m at y 14.2, march 200–470 m, Founding 480 m at `[-210, 150, −720]`.
- **Approach:** from the cobbled square, 5° west, eye 1.1 m, look at the crowned face `[0, 7, −30]` (KEYS[0] already). Pup is a speck.
- **Settle:** Wall Maria fills the sky. Horns / crown / cap west to east. Line A from the faces: “If the seal eats all the fish…”
- **Kill:** lightning. Pup swells to titan scale 6. Eats 1,282 coral cubes. One blue remains. The Wall dies as a cage. Sea comes in. Charcoal burns off.
- **Home:** three-PR credit. Real MujoRush (carved pups in `MujoRush.jsx`) is under the drawing.
- **Fog:** this dimension owns far ≥ 900 and fog out past 600, or the Rumbling is sky.
- **Grandify:** 3 s names the mountain from the three faces. 8 s is the eat or the march. A white card plus a banner is a miss.

---

### `pr-nemo-relay-481` — Ultra Instinct (won)

- **Class:** won. The form runs out; the seal already moved without a thought.
- **Homage:** Dragon Ball Super. Tournament of Power.
- **Palette:** stage `#6f7fe0` hue 236. Arena `#e8dcc8`. Void `#6f7fe0`. Silver aura `#e8f4ff`. Spike hair `#f4e8c8`. Whis / Beerus ink `#3a2a6a` `#c3122e`. Orbs `#7b2cbf`.
- **Live:** 8 s spike-hair pup, purple aura, “Ultra Instinct… the body moves on its own.” Draws.
- **Approach:** from the gods’ ledge, 30° east, eye 4.2 m looking **down** (tails already `[2.5, 4.2, −8.3]`).
- **Settle:** Whis line A. Pup eyes shut, afterimages.
- **Kill:** the form. Aura gutters. Arena crumbles outside-in. Island under it.
- **Home:** “23 files. One scaffold. I didn't even think.” / Beerus “That's the power of the gods.”
- **Grandify:** 3 s should already have the ledge and a god, not only the pup in a purple room.

---

### `pr-openxla-46539` — United States of SMASH (won)

- **Class:** won.
- **Homage:** My Hero Academia. Golden-age comic. Ben-Day.
- **Palette:** stage `#ec2a8a`. Cyan `#3b82f6`. Magenta `#ec2a8a`. Yellow `#ffe08a`. Off-register ink `#1c1824`. Halftone 6. Street ruin `#4a3f34`. Sun column `#ffe08a`.
- **Live:** 8 s halftone geyser, “Two runs. Two answers.” Draws. Black 0.04 / 0.04.
- **Approach:** low, tipped up ~10° (card already), from 15° west, pup lower-left uncropped.
- **Settle:** Nomu, two glowing answers.
- **Kill:** Detroit Smash then UNITED STATES OF SMASH. Two answers become one. The page tears.
- **Home:** “5 lines, deterministic.”
- **Grandify:** the street and the storm must fill the top. A halftone floor with a cone hat is 7.5.

---

### `pr-polychrom-79` — Gilgamesh (supersede)

- **Class:** supersede. Hard.
- **Homage:** Fate. Gate of Babylon, Bab-ilu, Ea.
- **Palette:** stage `#c3122e`. Gold `#d9a441` `#ffe08a`. Crimson `#c3122e`. Portal gold rings. Ea spiral `#b3122a`. Shard gold/red. Fountain return, place radiation.
- **Live:** 3 s / 8 s magenta field, “Gate of Babylon. Kneel, mongrels.” Yellow coins barely in at 8 s. Color void. Length 28.2.
- **Approach:** from below the portals, 0° but eye **−1.2 m** (looking up from the basin), portals as the sky. Canon: the King ruptures the world.
- **Settle:** gold portals, treasure silhouettes. “Let me show you a treasure worthy of the King.”
- **Kill:** Enuma Elish. Space dies. Gold-red shards. **Remade** at the Fountain (`PEAK`).
- **Home:** “11/11 test pairs agree with the fix, 1/11 on master. Mismatched frees: 16 to 0.”
- **Grandify:** 3 s is a sky of gates, not a pink card. The death is the dimension’s canon, same family as Sinbad.

---

### `pr-pyrefly-4180` — Nine-Tails (won)

- **Class:** won. Chained, not killed.
- **Homage:** Naruto. Kushina’s chains, Flying Thunder God. Kiri-e paper theatre.
- **Palette:** stage `#3a2a6a`. Paper backlight `#f4e8c8`. Night `#3a2a6a`. Kunai `#ffe08a`. Chains gold `#d9a441`. Violet hoop `#7b2cbf`. Coral pin `#e0559b`. Fox `#c3122e` cut-paper.
- **Live:** 8 s yellow smash, “Flying Thunder God.” Draws. 3 s “You can't hold me forever!”
- **Approach:** paper layers, from 45° west, fox over the pup, eye 0.55 m (card).
- **Settle:** Kurama from the jaws `tail.a [-2.4, 3.6, −8.4]`.
- **Kill:** 208 links. Violet hoop at 100. Brass pin. The fox is sealed. The paper stage folds.
- **Home:** “208 two-module SCCs chained in one Rust test.”
- **Grandify:** 3 s should show the fox as a paper giant, not only a yellow burst at 8 s.

---

### `pr-tensorflow-124410` — MUDA (won)

- **Class:** won.
- **Homage:** JoJo. Stand barrage, stopped second. Araki psychedelic.
- **Palette:** stage `#c026d3`. Stand yellow `#e8b84a`. Menace glyphs `#e0559b`. Invert on time-stop. Water `#0a4a7a`. Fourth edge `#ff2b3a`.
- **Live:** 8 s Dio-yellow Stand, pink glyphs, “Oh? You're approaching me?” Draws.
- **Approach:** from the valve tower, 20° east, eye 1.9 m (card wide), Stand over the pup, four edges over the Stand.
- **Settle:** land “Oh? You're approaching me?” The seal is the one approaching. That is the win.
- **Kill:** the fourth control edge. Time stops, resumes. Edge drowns. Three remain. Poster tears.
- **Home:** “Four edges. Three remain. +362/-26 across 4 files.”
- **Grandify:** time-stop invert must last a readable beat. A still of only the Stand and the line is 7.5.

---

### `pr-topograph-432` — Nazarick (won)

- **Class:** won.
- **Homage:** Overlord. Ainz. Super-tier circle.
- **Palette:** stage `#a23cff`. Hall `#1a0c24`. Gold circle `#d9a441`. Purple walls `#7b2cbf`. Cloak `#1c1824` / `#a23cff`. Staff gems rainbow. Floor guardians as ink.
- **Live:** 8 s throne, “Ainz Ooal Gown is legend.” Plaque correct. **Title bar THE NVIDIA MOAT.** Black 0.18 / 0.31.
- **Approach:** stair foot, 0°, eye 0.5 m, looking **up** the throne (card `view` is too close and flat: `[[0,1,0],[0,0.5,5]]`).
- **Settle:** pup in the cloak. Line A. Ainz “Rejoice!”
- **Kill:** cluster-wide access. Crimson lashes snap. Span breaks. “Ainz: You are dismissed.”
- **Home:** “145 lines changed across 4 files.”
- **Grandify:** fix the HUD title. Low-angle the throne so it fills the sky. The NVIDIA MOAT string is a live bug.

---

### `pr-triton-kernels-22` — Malevolent Shrine (won)

- **Class:** won.
- **Homage:** Jujutsu Kaisen. Sukuna. Barrierless domain. Manga ink.
- **Palette:** stage `#e5142e` hue 352. Ink `#1c1824`. Paper `#f4e8c8`. Screentone. Blood `#e5142e`. Shrine `#3a1020`. Night Shibuya.
- **Live:** 8 s red shrine, halftone pup, “Malevolent Shrine. Only the scheduled blocks survive.” (DOM at probe still said Domain Expansion; the picture had moved.) Draws. Black 0.10 / 0.21.
- **Approach:** down the avenue, shrine at z −78, yaw −0.2386 (SHOT already). Push-in `SHOT.k` 0→1.
- **Settle:** “Domain Expansion.” Mouth tail on the shrine.
- **Kill:** unscheduled blocks. Barrage. Jaws close. Drawing rubbed out.
- **Home:** “Merged into triton-lang/kernels. 804 lines added, 17 tests passing.”
- **Grandify:** keep the push-in. 3 s should already have the shrine as a building, not only the word Domain.

---

### `pr-xnnpack-10801` — Kyoka Suigetsu (won)

- **Class:** won.
- **Homage:** Bleach. Aizen. Las Noches.
- **Palette:** stage `#3d7fc4`. Desert white `#f4e8c8`. Sky black `#0a0614`. Ink cast `#1c1824`. Throne `#3a3228`. Crack `#7fc8f8`. KYOKA SUIGETSU lettering `#1c1824`.
- **Live:** 8 s wireframe palace, pup on a block, “Since when were you under the impression the gap was not there?” Draws.
- **Approach:** from the desert, 10° west, eye 4.2 m looking at the throne (card). Throne rises with the pup.
- **Settle:** Aizen line A. Ichigo line B from the left (`tail.b`).
- **Kill:** the illusion. “It was there all along.” Sword snaps. Las Noches falls.
- **Home:** “6.42% lower peak. Workspace 144 MiB to 112 MiB.”
- **Grandify:** 3 s should have Aizen or the dome on the horizon, not an empty approach.

---

## Shared 7.5 junk (every card)

- Stage is a still + a bubble. Faraday and Monodromy are the only two-voice pictures in the 8 s set.
- No silhouette actor on most docks. Other characters are more 3D mesh.
- Bubble font is a wobbly comic track. DOM text is clean; the picture looks jammed.
- Skip and the pill nav sit on the “cutscene” the whole time. Allowed, but they must not be the subject.
- Default two-shot from +z. Caustic is the exception that should become the rule.

---

## Gate (8.5–10)

Chrome, `channel: "chrome"`, 1280×800, HUD on.

| still | pass |
|---|---|
| `home` 3 s | watercolor fjord. No fight. |
| `p-caustic` 3 s | LOW lens, Susanoo or moon. Not only the lighthouse. |
| `p-aether-lang` 3 s | flood or core. Not VOID on black. |
| `pr-mujoco-3396` 3 s | three faces in the Wall. Pup a speck. |
| `pr-mujoco-3450` 3 s | same mountain as `#3396`. |
| `pr-mujoco-warp-1541` 3 s | same mountain. |
| `pr-highway-3244` 8 s | race still visible. Not black 0.85. |
| `pr-polychrom-79` 3 s | sky of gates. Not a magenta card. |
| `pr-topograph-432` any | title is Nazarick or Topograph, not NVIDIA MOAT. |
| `p-epsilon-hollow` HUD-off | statue names the place. Sphere in a corner. |
| `p-monodromy` 8 s | crack / remade, not only a choir still. |
| every other 3 s | unique azimuth. Landform or guest fills the sky. |

A dock that is a bubble on a flat field stays 7.5. Band 1000 on issue history does not count until these stills pass.

Mod may add more beats on the same homage if they sit. Do not add a second mountain. Do not turn the Igloo into a won dimension. Do not split MujoRush.

---

## Limits

This issue does not reskin Instrument Sans, the cream cards, or the minimap. It does not rewrite `data/showcase.json`. It does not copy a face. It does not fire cutscenes on `?hud=off`. It does not ask for a new fog system — it asks the existing fog to move for the drawing. Graphic stills without arrivals remain the 67 / 100 object-world work. Reduced motion keeps the old two-shot and both bubbles.

Relates to the Band 1000 comments on this thread. Mount MujoRush stays one mountain.
