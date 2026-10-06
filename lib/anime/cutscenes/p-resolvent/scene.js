// SCENE DATA for p-resolvent (Frieren vs Aura, Madhouse golden hour). DIRECTION layer: the single source of truth for
// the shot list, the camera law, the cue names and times, the lines, the colour script and the stage.
// Pure data (no imports). Bible: teerthfolio-wt/scripts/p-resolvent.md. Schema: ../CONTRACT.md.
//
// STAGE FRAME (world metres; the hero seal is 0.8 m tall at the origin, `seal.yaw = 0` so it FACES +z toward Aura):
//   seal       (0, 0, 0)                      hero, Frieren costume, staff
//   dais       centre (0.9, 0, 3.0)           3.2 x 2.2 m, 0.45 m high
//   Aura       (0.9, 0.45, 3.0) yaw PI        small costumed seal x1.15, faces -z at the hero
//   scale      held at Aura's flipper tip ~ (1.0, 1.7, 2.9); beam half 0.9 x SCALE_K; pans hang to ~1.0
//   ranks      27 knights at z = 5.2 / 6.6 / 8.0 (8 / 9 / 10 per rank, x in [-5, 5]), face -z
//   Fern       (-3.6, 0, -2.4)   Stark (3.8, 0, -2.2)    bystanders, beside the lens line in shots 7 and 11
//   fountain   (-4.4, 0, -4.6)   gate with the "Graz" lintel at z = -9 (outside every shot's aim)
//   sun        low, from world dir (-0.55, 0.3, -0.62): long shadows fall toward +x +z
// Cast and fx agents may read `ctx.scene.stage` (and `ctx.dir`, set by build.js); the numbers above are the same.
//
// CAMERA LAW (L3), rigs about the seal's chest in its own frame (x right, y up, z forward = toward Aura):
//   wide (1) -> arc (2) -> free pan insert (3) -> arc (4) -> arc (5) + kill (6) -> free low wide (7) -> free ranks (8)
//   -> arc golden rim (9) -> wide pull-away (10) -> home (11). No shot is longer than 3.4 s (limit 5 s).
//   Our shot n differs from the bible's shot number: bible 5 is split into n=5 (7.0-7.7) and n=6 (7.7-8.4), so
//   bible 6..10 are n=7..11. colorScript is keyed by n.
//   Framing checks (hand-computed): shot 2 eye ~(5.8,1.7,1.3) sees seal and Aura 32 deg apart inside fov 38;
//   shot 3 eye (3.2,1.2,5.0) fov 27 (50 mm): seal 0.28 of frame height; shot 7 eye (-1.4,0.6,-2.2) puts the seal in
//   the foreground (0.30) and the scale beyond it; shot 8 eye (1.2,1.7,12.5) over the ranks, seal 0.09 (wide, minFrac 0.06).
//
// CUE NAMES (read with cue.on / cue.k / cue.since / cue.done / cue.arg). Reserved: impact speedlines shock trauma pose.
//   WORLD: sky.swell sky.crack unmake island.fade butterfly dim
//   CAST : aura.pop aura.stagger aura.stunned aura.grim scale.rise scale.tip scale.tremble scale.swing scale.break
//          ranks.march ranks.rock ranks.kneel wash.clear fern.grip stark.shiver pup.bow
//   FX   : leaves.swirl leaves.blow leaves.gold motes.calm motes.spiral dust.puffs glint weigh flame.on soulglow
//          flame.swell flame.flare flame.die mass.pop wind ring.cross rings.scale release column.grow column.fade
//          flash stones.lift shards cracks.grow wipe
// Args are on the beat objects below (cue.arg(name, key, default)). `release` (7.7) and `scale.break` (8.5) are the
// two master cues: any layer may sync to them.

const SEC = 1 / 24; // one drawing frame at the 24 fps shot clock
const CREAM = "#ffe9b8", BROWN = "#4a2e2e";

export default {
  id: "p-resolvent",
  title: "Frieren vs Aura",
  anime: "Sousou no Frieren",
  style: "modern-anime",
  // Madhouse finish: warm-brown 1.5 px line, pastel bloom, golden shafts, 2.5% grain, 10% vignette (bible 2.1, 2.6)
  look: {
    lines: { px: 1.5, ink: "#4a2e2e", inkMix: 1, set: 0.7 },
    fill: { sat: 1.1, lumaMax: 0.92 },
    post: { bloom: 0.5, diffuse: 0.18, shafts: 0.6, shaftCol: "#ffd488", sat: 1.1, grain: 0.025, vig: 0.1 },
  },
  fps: 12,
  duration: 20,
  seed: 5,
  far: 1500,
  plates: true,
  bg: "#da806a",

  // golden-hour ramp (bible 2.2, 3.1). hex provenance: see the bible.
  palette: {
    sky: "#b47491", zenith: "#6fc4c0", horizon: "#da806a", horizonGold: "#f0b840", cloudLit: "#ffdca0", cloudUnder: "#d68fa0",
    ridge1: "#b88c9a", ridge2: "#8e6a82", ridge3: "#5e5260", mist: "#be6443",
    ground: "#b99c76", groundLit: "#cdb088", groundShadow: "#7a5578", moss: "#5e7f2a", leafGold: "#e08a2e",
    stone: "#cdb088", stoneMid: "#b99c76", stoneShadow: "#5a3c8a", gateMouth: "#3b2a30", roof: "#b4502a",
    foliageTip: "#f0b840", foliage: "#d18e4e", foliageMid: "#9b543c", foliageShadow: "#5b1e10", trunk: "#5a3a2c",
    rim: "#ffb040", dusk: "#5a3c8a", castShadow: "#5a3c8a", godray: "#ffd488",
    key: "#fff1d8", accent: "#ffc83a", ink: "#4a2e2e", inkDark: "#1c1228",
    // Aura
    auraHair: "#a77ac8", auraHairShadow: "#453d6b", auraHairSheen: "#d8bdf0", horn: "#e6d6ae", hornShadow: "#b09a70",
    bodice: "#2a1b4e", bodiceShadow: "#14102a", inlay: "#cdd0f0", cape: "#8a2e5a", capeShadow: "#4b2d5a",
    glove: "#1d1e37", skirt: "#f2eef8", skirtShadow: "#b8b4d0", gold: "#e9b84a", goldHem: "#d9a93a",
    // knights, bystanders
    steel: "#cfc8c0", steelMid: "#8a7d86", steelShadow: "#231621", redCape: "#7a1a1a", redCapeShadow: "#260a0f", halberd: "#6b5a4a", blade: "#bfc3d4",
    fernHair: "#6a3a8a", fernHairShadow: "#3e2a58", fernCoat: "#3a2a28", fernBlouse: "#efe4d2",
    starkHair: "#d8442a", starkJacket: "#c4302a", starkShirt: "#1c1c26", starkShorts: "#4a3024",
    // the scale
    brassHi: "#f2e6c2", brass: "#d9a93a", brassMid: "#a67f2a", brassShadow: "#5e615d", panInner: "#383a4c",
    silver: "#e6f3f8", silverGlow: "#a8b4d9", silverShadow: "#565d88",
    // flames
    flameEdge: "#9ff0e0", flameCore: "#f5fbf2", flameYellow: "#fff6c0", flamePink: "#f4b8c8", flameHalo: "#7ff0e4",
    massBlack: "#0e0513", massHatch: "#2a1535", panShadow: "#4b2d5a",
    // power and return
    column: "#ffc83a", columnCore: "#fff1b8", ring: "#ffe9b8", shard: "#f3c04e", shardStar: "#fff6d8",
    crackCore: "#ffd488", crackEdge: "#d9a93a", unmake: "#ffc760", island: "#f4f1e8", butterfly: "#1f7fd6", butterflyEdge: "#0b3d7a",
    clover: "#f4f1e8", sfx: CREAM, sfxInk: BROWN,
  },

  // positions the layers share (see the stage comment)
  stage: {
    dais: { at: [0.9, 0, 3.0], size: [3.2, 2.2], h: 0.45 },
    aura: { at: [0.9, 0.45, 3.0], yaw: Math.PI, scale: 1.15 },
    scaleHand: [1.0, 1.7, 2.9],
    ranks: { z: [5.2, 6.6, 8.0], counts: [8, 9, 10], xSpan: [-5, 5], yaw: Math.PI, redCapeEvery: 9, marchDelay: 0.15, kneelDelay: 0.12, rockDelay: 0.08 },
    fern: { at: [-3.6, 0, -2.4], yaw: 0.6 },
    stark: { at: [3.8, 0, -2.2], yaw: -0.6 },
    fountain: { at: [-4.4, 0, -4.6] },
    gate: { z: -9, lintel: "Graz" },
    sunDir: [-0.55, 0.3, -0.62],
    unmake: [13.0, 15.4], // the court dissolves to the island here
    dimTo: 0.8,           // uDim at the release (violet dusk round the column)
  },

  // the hero faces Aura (+z), whole and upright; no moves (the stage comes to the seal, never the lens)
  seal: {
    at: [0, 0, 0], yaw: 0, scale: 1, moves: [],
    track: [
      { t: 0.4, pose: "sit", dur: 0.3, hold: 0.3, out: 0.3 },                   // 0.4-1.0 sits in the pull-back
      { t: 2.6, pose: "sign", dur: 0.2, hold: 0.0, out: 0.1 },                  // upright, sign pose
      { t: 2.7, pose: "fist", dur: 0.3, hold: 3.2, out: 0.3 },                  // fist 2.7 -> 6.5
      { t: 6.2, pose: "crouch", dur: 0.35, hold: 1.0, out: 0.3 },               // crouch 6.2 -> 7.85 (limiters)
      { t: 7.7, pose: "raise", dur: 0.25, hold: 2.1, out: 0.4 },                // arms up at the release, tails lift
      { t: 10.9, pose: "fist", dur: 0.3, hold: 1.1, out: 0.4 },                 // fist flex T.flex 10.9
      { t: 13.6, pose: "blink", dur: 0.15, hold: 0.1, out: 0.15 },
      { t: 17.92, pose: "crouch", dur: 0.083, hold: 0.25, out: 0.17, k: 0.35 }, // bows its head once (2 held 6 up 4 frames)
    ],
  },

  // ---------------- SHOTS (seconds; frame = round(s x 24)) ----------------
  // az: + toward the seal's left, 0 = in front (Aura side), pi = behind. look is seal-local (z forward, toward Aura).
  shots: [
    // 1 (0-62) wide high, 48 -> 30 mm: pull back and up (law step 1); coral sky, teal accent
    { n: 1, t: [0, 2.6], law: "wide", az: [0.7, 0.9], r: [3.2, 15], elev: [0.8, 9.5], fov: [28, 43], look: [[0, 0.3, 0.2], [0.4, 1.0, 2.2]], ease: "smooth" },
    // 2 (62-120) medium two-shot, 35 mm: Aura on the dais, the scale rises, the beam tips (side-on so both read)
    { n: 2, t: [2.6, 5.0], law: "arc", az: [1.35, 1.1], r: [6.5, 5.6], elev: [1.6, 1.3], fov: [38, 34], look: [[0.35, 0.6, 1.5], [0.4, 0.7, 1.7]], ease: "smooth" },
    // 3 (120-154) insert, 50 mm, low on the pans from Aura's side; the pup sits left of the dish, uncovered
    { n: 3, t: [5.0, 6.4], law: "free", fov: 27, eye: [[3.2, 1.2, 5.0], [2.8, 1.3, 4.6]], lookAt: [[0.5, 1.0, 1.5], [0.45, 0.95, 1.4]], dof: [2.2, 0.8, 1], minFrac: 0.14, dutch: 0, ease: "smooth" },
    // 4 (154-168) arc into the seal, 28 mm, az -0.7 elev 0.8 (card `into`): the crouch, the wind
    { n: 4, t: [6.4, 7.0], law: "arc", az: [-0.7, -0.62], r: [3.4, 2.9], elev: 0.8, fov: [30, 28], look: [0, 0.1, 0.3], ease: "smooth" },
    // 5 (168-185) close-medium on the bubble B line
    { n: 5, t: [7.0, 7.7], law: "arc", az: [-0.62, -0.5], r: [2.9, 2.5], elev: [0.8, 0.7], fov: 28, look: [0, 0.1, 0.2], ease: "smooth" },
    // 6 (185-202) HARD CUT on the release: the kill angle, low, tighter, dutch (law step 4)
    { n: 6, t: [7.7, 8.4], law: "kill", az: [-1.0, -1.25], r: [2.4, 1.9], elev: [0.5, 0.4], fov: [26, 24], look: [0, 0.35, 0.6], dutch: [0, 6], ease: "snap" },
    // 7 (202-247) low wide, 24 mm: the scale breaks beyond the seal; push-in on T.dolly 7.8 / 8.7 / 9.9 / 10.9
    { n: 7, t: [8.4, 10.3], law: "free", fov: 53, eye: [[-1.4, 0.6, -2.2], [-0.9, 0.55, -1.4]], lookAt: [[0.9, 1.5, 3.0], [0.9, 1.4, 3.0]], minFrac: 0.14, dutch: [2, 0], ease: "smooth" },
    // 8 (247-264) wide from behind the ranks, 35 mm: the wave kneels; dolly toward the pup
    { n: 8, t: [10.3, 11.0], law: "free", fov: 38, eye: [[1.2, 1.7, 12.5], [0.9, 1.5, 10.8]], lookAt: [[0.5, 1.0, 3.0], [0.3, 0.9, 2.0]], minFrac: 0.06, dutch: 0, ease: "smooth" },
    // 9 (264-317) 40 mm medium on the pup in the afterglow; golden rim; Aura speaks bubble C
    { n: 9, t: [11.0, 13.2], law: "arc", az: [-1.0, -0.6], r: [3.3, 2.6], elev: [0.9, 1.0], fov: [34, 31], look: [0, 0.15, 0.2], ease: "smooth" },
    // 10 (317-398) wide high pull-away, 30 mm, rising: the cracks cross the sky, the court dissolves (3.4 s)
    { n: 10, t: [13.2, 16.6], law: "wide", az: [0.7, 0.35], r: [5, 16], elev: [2, 10], fov: [30, 36], look: [[0, 0.4, 0.8], [0, 1.0, 1.2]], ease: "smooth" },
    // 11 (398-480) chase pose behind and above, open ground, 35 mm; the credit plays; one short wipe home at 19.6
    { n: 11, t: [16.6, 20.0], law: "home", az: Math.PI, r: [3.4, 3.7], elev: [2.0, 2.2], fov: 35, look: [0, 0.2, 3.2], ease: "smooth" },
  ],

  // ---------------- BEATS (the cue contract) ----------------
  beats: [
    // ===== reserved: applied by the player =====
    { t: 7.7, name: "trauma", amount: 0.5 },                                    // shake 0.07 for 0.34 s at the release
    { t: 7.7, name: "shock", dur: 0.5, at: [0.5, 0.58], amp: 0.03, r1: 0.7 },   // the court rings
    { t: 7.7, name: "speedlines", dur: 0.35, kind: "radial", at: [0.5, 0.58], strength: 0.55, col: "#ffd488" },
    { t: 204 * SEC, name: "impact", seq: [[1, 1]] },                            // frame 204: one two-tone frame at the break
    { t: 204 * SEC, name: "trauma", amount: 0.3 },
    { t: 204 * SEC, name: "shock", dur: 0.6, at: [0.62, 0.38], amp: 0.025, r1: 0.6 },

    // ===== SHOT 1 (0-2.6) =====
    { t: 0.0, name: "sky.swell", dur: 2.6 },                                    // the bubble swells while the lens pulls back
    { t: 0.0, name: "dust.puffs", dur: 1.0, alpha: [0, 0.2] },
    { t: 1.6, name: "leaves.swirl", dur: 1.0, count: 260 },                     // 260 leaves swirl in, visible from 1.6 s
    { t: 2.0, name: "motes.calm", dur: 0.6, count: 70, col: "#ffe3a0" },        // 70 calm motes fade in 2.0-2.6
    { t: 1.75, name: "aura.pop", dur: 0.25 },                                   // frame 42: Aura pops onto the dais
    { t: 2.0, name: "ranks.march", dur: 1.2, perRank: 0.15 },                   // ranks step in from 2.0 s + 0.15 s / rank

    // ===== SHOT 2 (2.6-5.0) =====
    { t: 2.4, name: "scale.rise", dur: 0.45, overshoot: 1.18 },                 // frame 58: held up with a 1.18x overshoot
    { t: 3.0, name: "scale.tip", dur: 1.9, toward: "aura", amp: 0.34 },         // frame 72: beam tips toward Aura, damped
    { t: 2.6, name: "glint", dur: 2.4, col: "#fff0b8" },                        // gold glints on the pan rims, on twos

    // ===== SHOT 3 (5.0-6.4): the weighing =====
    { t: 5.0, name: "weigh", dur: 1.4 },                                        // silver scale state, 1.5 px white line, 6 px glow
    { t: 5.0, name: "flame.on", dur: 0.15, size: 0.5 },                         // soul-flame flickers on, 0.5x pan, calm
    { t: 5.0, name: "soulglow", dur: 2.7 },                                     // egg 3: steady faint cyan glow until the release
    { t: 5.4, name: "butterfly", dur: 3.0 },                                    // egg 2: clover + one blue butterfly crosses
    { t: 6.2, name: "scale.tremble", dur: 1.5 },                                // trembles from 6.2 s

    // ===== SHOT 4 (6.4-7.0): the limiters =====
    { t: 6.2, name: "wind", dur: 1.5, from: 0.05, to: 1.0 },                    // uWind 0.05 -> 1.0, twin tails rise
    { t: 6.4, name: "motes.spiral", dur: 1.3, col: "#ffe3a0" },                 // motes spiral into the seal
    { t: 6.5, name: "ring.cross", dur: 1.7, r: [0.6, 26], alpha: 0.55 },        // a gold ring crosses the flagstones
    { t: 7.0, name: "flame.swell", dur: 0.7, from: 0.5, to: 1.3 },              // swell 168-185 toward 1.3x the pan

    // ===== SHOT 5-6 (7.0-8.4): the release at T.release 7.7 =====
    { t: 7.7, name: "release", dur: 0.6 },                                      // master cue: every layer syncs to it
    { t: 7.7, name: "column.grow", dur: 0.55 },                                 // 13 frames; hardened 3-tone bands
    { t: 7.7, name: "flash", dur: 2 * SEC, amount: 0.12 },                      // gold, 2 frames, never white
    { t: 7.7, name: "dim", dur: 0.3, to: 0.8, until: 10.3 },                    // uDim: violet dusk round the column
    { t: 7.7, name: "stones.lift", dur: 1.6, count: 70, delayPerM: 0.035 },     // lift by distance from the pup
    { t: 7.7, name: "leaves.blow", dur: 1.5 },                                  // leaves blown skyward
    { t: 7.7, name: "ranks.rock", dur: 0.3, back: 0.35, perRank: 0.08 },        // a wave from the front
    { t: 7.7, name: "fern.grip", dur: 0.4 },                                    // Fern braces (egg 5)
    { t: 7.8, name: "aura.stagger", dur: 0.35, back: 0.4, tip: 0.1 },           // T.release+0.1 .. +0.45
    { t: 8.15, name: "aura.stunned", dur: 1.45 },                               // stunned to 9.6 s, frozen mid-step

    // ===== SHOT 7 (8.4-10.3): the break =====
    { t: 7.85, name: "scale.swing", dur: 0.6, to: -0.95 },                      // swings to the pup's side (7.85-8.45)
    { t: 8.5, name: "scale.break", dur: 0.8, slow: 4, pieces: 5, cross: true }, // frame 204; slow on fours 8.5-9.3; egg 4: halves land "="
    { t: 8.5, name: "mass.pop", dur: 2 * SEC },                                 // Aura's black mass pops out in 2 frames
    { t: 8.5, name: "shards", dur: 1.0, count: 40 },                            // 40 shards with a white star glint
    { t: 8.5, name: "flash", dur: 2 * SEC, amount: 0.2 },
    { t: 8.5, name: "rings.scale", dur: 1.7, count: 2 },                        // two rings from the scale
    { t: 8.45, name: "flame.flare", dur: 0.25 },                                // the pup's flame flares then dies
    { t: 8.7, name: "flame.die", dur: 0.2 },
    { t: 9.3, name: "column.fade", dur: 1.0 },                                  // the column fades 9.3-10.3
    { t: 9.3, name: "aura.grim", dur: 1.0 },

    // ===== SHOT 8 (10.3-11.0): the kneel =====
    { t: 10.3, name: "ranks.kneel", dur: 1.0, perRank: 0.12, fold: 0.52, bow: 0.38 },
    { t: 10.3, name: "wash.clear", dur: 0.4 },                                  // the control wash clears = freed
    { t: 10.35, name: "dust.puffs", dur: 1.0, alpha: [0.3, 0.3], flat: true },  // flat 2-tone puffs on twos
    { t: 10.3, name: "dim", dur: 0.8, to: 1.0, release: true },                 // the dusk lifts to the afterglow

    // ===== SHOT 9 (11.0-13.2): afterglow, the cracks, the bystanders =====
    { t: 11.0, name: "stark.shiver", dur: 2.2 },                                // egg 5: Stark's axe handle shivers
    { t: 11.0, name: "fern.grip", dur: 2.2 },                                   // egg 5: Fern's flippers tighten
    { t: 11.4, name: "cracks.grow", dur: 1.8, tree: true },                     // 274-317: a branching proof tree from the scale
    { t: 11.4, name: "sky.crack", dur: 1.8, to: 1 },                            // uCrack toward the sky

    // ===== SHOT 10 (13.2-16.6): the unmaking (no caption) =====
    { t: 13.0, name: "unmake", dur: 2.4 },                                      // noise-discard dissolve, gold edge, to the island
    { t: 13.0, name: "island.fade", dur: 2.4 },                                 // the island fades in beneath; the seal stays
    { t: 13.0, name: "leaves.gold", dur: 2.4 },                                 // leaves turn to gold dust

    // ===== SHOT 11 (16.6-20.0) =====
    { t: 17.92, name: "pup.bow", dur: 0.5 },                                    // the single bow, frame 430
    { t: 19.6, name: "wipe", dur: 0.4 },                                        // one short wipe home
  ],

  // ---------------- BUBBLES: lower half, one at a time (L9) ----------------
  // The overlay renders plain text (no bold markup). Emphasis the bible names: A "so small", "Obey me";
  // B "limiters"; C "One operator", "175 declarations", "zero sorry".
  bubbles: [
    { t: [2.9, 5.0], text: "Your mana is so small. The scale will decide. Obey me.", who: "foe", side: "r", tone: "say" },
    { t: [7.0, 8.6], text: "Okay. Let me pull away my limiters too.", who: "seal", side: "l", tone: "shout" },
    { t: [11.0, 13.9], text: "Softmax and a Markov path. Two weights on my scale. One operator. 175 declarations, zero sorry.", who: "foe", side: "r", tone: "say" },
  ],

  // the 15-line character-voiced pool (a joke-pool line may replace bubble A via pool:"lines")
  lines: [
    "Your mana is so small. The scale will decide. Obey me.",
    "Weigh me, then. I have been hiding this for eighty years.",
    "Soul against soul. Mine is lighter, and you cannot see it.",
    "That is the whole trick. Hold still, and let them look away.",
    "Kneel, all of you. The scale has spoken.",
    "Sorry about the scale. It was the wrong kind of balance.",
    "Two weights, one operator. The scale only ever agreed with itself.",
    "A hundred and seventy-five proofs, and not one gap.",
    "Obey? I only ever obeyed the algebra.",
    "Do not look so shocked. You asked me to show you.",
    "Softmax is a path. A path is softmax. Weigh that.",
    "I held back so long it became a habit.",
    "The scale broke, and the sky went with it.",
    "Stark would have run. Fern would have scolded me.",
    "It is only a limiter. They were always meant to come off.",
  ],

  // ---------------- SFX: cream letters, thin brown line, off the seal (bible 3.18) ----------------
  sfx: [
    { t: [8 * SEC, 40 * SEC], text: "FWOOOM", at: [0.5, 0.2], size: 0.09, rot: -5, col: CREAM, ink: BROWN },
    { t: [62 * SEC, 80 * SEC], text: "ZUUUN", at: [0.72, 0.3], size: 0.08, rot: -6, col: CREAM, ink: BROWN },
    { t: [128 * SEC, 146 * SEC], text: "kri... kri...", at: [0.3, 0.25], size: 0.045, rot: 4, col: CREAM, ink: BROWN },
    { t: [156 * SEC, 168 * SEC], text: "kiiiin", at: [0.75, 0.24], size: 0.07, rot: -8, col: CREAM, ink: BROWN },
    { t: [185 * SEC, 204 * SEC], text: "DOOOOON", at: [0.5, 0.2], size: 0.14, rot: -4, col: CREAM, ink: BROWN },
    { t: [204 * SEC, 224 * SEC], text: "PAKIIIN", at: [0.7, 0.22], size: 0.12, rot: 6, col: CREAM, ink: BROWN },
    { t: [250 * SEC, 264 * SEC], text: "ZAAAT", at: [0.3, 0.26], size: 0.08, rot: -6, col: CREAM, ink: BROWN },
    { t: [275 * SEC, 295 * SEC], text: "pikiii", at: [0.72, 0.24], size: 0.045, rot: 5, col: CREAM, ink: BROWN },
    { t: [330 * SEC, 352 * SEC], text: "SHAAAN", at: [0.5, 0.18], size: 0.1, rot: -3, col: CREAM, ink: BROWN },
  ],

  // the credit plays inside the pocket from frame 398 (16.6 s) to the wipe; the overlay takes one string
  credit: { t: [16.6, 19.6], text: "teerthsharma/resolvent · 175 declarations · zero sorry · Lean 4: softmax attention and Markov path composition are one operator" },

  // colour script, one entry per shot `n` (5 hexes each, bible section 5); layers may read ctx.scene.colorScript
  colorScript: {
    1: { key: "coral dominant, teal accent, mid-high key", hex: ["#6fc4c0", "#da806a", "#f0b840", "#b47491", "#5b1e10"] },
    2: { key: "amber + lilac + burgundy", hex: ["#f0b840", "#e0993a", "#a77ac8", "#8a2e5a", "#5a3c8a"] },
    3: { key: "high contrast, near-black + cyan", hex: ["#0e0513", "#4b2d5a", "#9ff0e0", "#f5fbf2", "#d9a93a"] },
    4: { key: "gold over amber", hex: ["#ffc83a", "#ffe9b8", "#e0993a", "#5a3c8a", "#6fc4c0"] },
    5: { key: "gold over amber, the line", hex: ["#ffc83a", "#ffe9b8", "#e0993a", "#5a3c8a", "#6fc4c0"] },
    6: { key: "silver core, gold, violet dusk", hex: ["#fff1b8", "#ffc83a", "#5a3c8a", "#8a2e5a", "#1c1228"] },
    7: { key: "gold on violet", hex: ["#f3c04e", "#d9a93a", "#5a3c8a", "#231621", "#fff6d8"] },
    8: { key: "amber, burgundy, violet, steel", hex: ["#e0993a", "#8a2e5a", "#5a3c8a", "#cfc8c0", "#231621"] },
    9: { key: "afterglow, golden rim", hex: ["#ffd488", "#d9a93a", "#e0993a", "#5a3c8a", "#f4f1ea"] },
    10: { key: "cracks, then the island", hex: ["#ffd488", "#fff1b8", "#6fc4c0", "#e0a043", "#f4f1ea"] },
    11: { key: "island snow, sky teal", hex: ["#f4f1ea", "#6fc4c0", "#e0a043", "#d9a93a", "#8a2e5a"] },
  },
};
