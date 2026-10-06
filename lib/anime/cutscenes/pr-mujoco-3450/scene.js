// SCENE DATA for pr-mujoco-3450: One Punch Man (Madhouse S1), "the hull in one stroke". DIRECTION agent. Pure data, no imports.
// SINGLE SOURCE OF TRUTH for shots, beats, cue names and times. World, cast and fx read cues from here (cue.on/k/since/done/arg).
// Bible: scripts/pr-mujoco-3450.md (24 fps frames). Every time below is  f / 24  seconds; the frame number is in the comment.
//
// FRAME (world): the hero seal stands at the origin facing +x (yaw = +pi/2, so seal-local forward z = world +x, seal-local right x = world -z).
//   hull   world (2.4, 2.0, -1.3)  r 1.1, 42 verts      thieves in a 120 deg arc 4-6 m from the hero, none between any lens and the seal.
//   deck   cloud ceiling 40 m up, 14 masses, hole 11 m across, centred over the hull; haze/horizon at 31 percent of frame at the wide.
// CAMERA LAW notes (director.js): every shot is a rig about the seal's chest, az = atan2(local x, local z). The bible's world eye points were
//   converted to rigs; the one deliberate deviation is shot 3, which swings round to a 3/4 FRONT az so the serious face is on screen
//   (the bible's side-on eye would show the pup in profile). Shot 6 is `home` law with az/r overridden (wide hold, then return home).
//   Bible shot 7 is split here into an arc (faces camera) and a kill so no setup runs long.
//
// CUE TABLE (free cues, ordered by time; `dur` is the window cue.k() runs across):
//   hullBorn 1.708/0.58 | rayGrow 1.79/1.21 | rayTremble 3.042/0.875 | crouch 2.917/0.83 | capeOn 2.917 | serious 2.917/1.33
//   crossVein 3.25/0.65 | vignette 2.917/1.25 | wristBand 3.75/1.0 | punch 3.875/0.875 | smear 3.917/0.125 | freeze 3.917/0.083
//   impactCard 3.917/0.167 (red-black starburst for frames 96-97) | blast 3.917/1.9 (victim trigger, args below)
//   rayLand 3.917/0.5 | ringA 3.917/0.71 | ringB 4.0/0.417 | dust 3.917/0.6 | debris 3.917/1.08
//   cloudSplit 4.083/1.04 | rimPush 4.083/0.25 | dome 4.083/1.04 | tumble 4.083/1.125 | hullClose 4.208/1.417 | seriousRelease 4.208/1.46
//   shaft 4.333/0.79 | rayFade 4.5/1.1 | wireFade 4.5/1.125 | shaftBreath 5.125/3.2 | land 5.25/0.25 | capeOff 5.417/0.58
//   bossKneel 5.667/0.6 | settle 5.833/0.3 | whiteFlag 5.833/6.0 | numberCard 9.583/2.9 | wipe 13.75/0.25
// Reserved beats (player-owned): impact, speedlines (x2), shock, trauma. Pose is carried by seal.track.
// Consolidate: cue names the layers read, at the bible times (agreement with the layers' fallbacks).
const LAYER_CUES = [
  { t: 1.7083, name: "hull" },
  { t: 9.5833, name: "number" },
  { t: 4.1, name: "split", dur: 1.04 },
];

export default {
  id: "pr-mujoco-3450",
  title: "One Punch Man",
  anime: "One Punch Man (Madhouse S1): the Serious Punch splits the clouds",
  style: "modern-anime",
  // Madhouse S1 grade (E18): cool, desaturated 0.9 in the wide, 1.1 on the punch (the direction layer drives sat per shot), grain 0.6 percent,
  // vignette 18 percent, bloom only for energy (0.35), no diffusion on fur, luma cap 0.92. Lines 2 px ink #1a1214.
  look: {
    fill: { sat: 0.92, lumaMax: 0.92, t: 0.5, soft: 0.0, bias: 1, flat: 0.9 },
    lines: { px: 2, dist: 0.6, ink: "#1a1214", inkMix: 1, set: 0.9, setW: 1.2, setMix: 1, setCol: "#1d2236", charLines: 1 },
    post: { bloom: 0.35, diffuse: 0, shafts: 0.35, shaftCol: "#f5e0b0", sat: 0.9, gain: [0.98, 0.99, 1.04], gamma: [1, 1, 1.02], split: [-0.01, 0.0, 0.04], grain: 0.006, vig: 0.18 },
    impact: ["#ffffff", "#12070a"], // mono, never rainbow (E11); the red-black card is the fx layer's `impactCard`
  },
  fps: 12, // hero and fx on twos; the strike drawings are drawn on ones by the layers (cue windows f93-100)
  duration: 14.0, // 336 frames at 24
  seed: 3450,
  far: 400,
  plates: true,
  bg: "#7f8aa8",
  palette: {
    // sky (E01)
    skyTop: "#d9dfee", skyLit: "#aeb8d0", skyMid: "#7f8aa8", skyShadow: "#55607f", skyDeep: "#343c5a", skyViolet: "#4a4f86",
    gapRim: "#6aa3e0", gapMid: "#3e7fd0", gapZenith: "#2c53af", warm: "#f5e0b0", haze: "#8d95ad",
    // ground (E02)
    groundLit: "#b9a789", groundMid: "#96866c", groundShadow: "#6d5f58", groundViolet: "#5b5266", groundDeep: "#3b3340", rubbleTop: "#cdbd9e",
    // hull and probes (E03-E05)
    mint: "#3de0b0", mintLit: "#7ff0cf", mintShadow: "#1f9d7f", mintDeep: "#0d5d55", violet: "#b79bff", violetLit: "#d7c8ff", violetShadow: "#7a4be0", violetDeep: "#3a246f",
    coral: "#ff6a5a", coralLit: "#ff9a88", coralShadow: "#c23a40", coralDeep: "#6b1b2b", hot: "#fff1d8", wire: "#f3ecd8",
    // ink and impact
    ink: "#12070a", ink2: "#1a1214", white: "#ffffff", impactRed: "#c0121f", impactRed2: "#e0142c", impactDeep: "#3a0a10", sfxYellow: "#ffd21f", cream: "#f6f1e4",
    // seal rim, cape, wristband (E06-E08)
    rim: "#7ff0cf", cape: "#f6f2ea", capeMid: "#ddd9d4", capeShadow: "#a8aec6", capeDeep: "#6f7690", band: "#d63a2c",
    // victims (E14)
    armour: "#8a8fa6", armourMid: "#5f6480", armourShadow: "#3a3d56", armourDeep: "#1f2133", trim: "#8b5fd0", crest: "#c9b8f0", crestShadow: "#8b6fd0",
    gruntVest: "#7a7f98", lens: "#f2c94c", dustPuff: "#96866c", key: "#fff1d8", accent: "#3de0b0",
  },
  // the hero: stands facing +x; steps in at the strike (E06: 0.5 m, 0.4 m back-z). Poses on twos, strike held six drawings.
  seal: {
    at: [0, 0, 0], yaw: Math.PI / 2, scale: 1,
    moves: [{ t: [3.79, 3.917], to: [0.5, 0, -0.4] }], // f91-94, stepAt
    track: [
      { t: 1.79, pose: "point", dur: 0.5, hold: 0.9, out: 0.3, k: 0.35 }, // f43-72: head tracks the spraying rays (eyes narrow one step)
      { t: 2.917, pose: "crouch", dur: 0.5, hold: 0.33, out: 0.15 }, // f70-82 ramp, held to f90, snaps out f91-94
      { t: 3.79, pose: "fist", dur: 0.13, hold: 0.95, out: 0.55 }, // f91-94 snap, held six drawings and beyond, back by f114
      { t: 5.7, pose: "idle", dur: 0.4, hold: 5.0, out: 0.3, k: 0.5 }, // f136 chase pose beside the hull, calm
      { t: 9.4, pose: "blink", dur: 0.2, hold: 0.1, out: 0.2 }, // faces the camera for the number card
    ],
  },
  // shots (bible section 5). Rig numbers: az = atan2(localX, localZ), r horizontal m, elev above chest, fov vertical degrees.
  shots: [
    // 1 (f0-40) WIDE: 24 mm, pulled back and up from (-6.5,4.2,9.5), 8-frame drift; hull not yet born, thieves guard, deck overhead.
    { n: 1, law: "wide", t: [0, 1.708], az: [-2.17, -2.12], r: [11.3, 10.6], elev: [3.8, 4.4], fov: [30, 32], look: [[1, 0.8, 1], [1, 1.0, 1.1]], minFrac: 0.05, ease: "linear" },
    // 2 (f41-72) cut at the wide to a low 3/4 looking up the diagonal to the hull (-3.2,1.2,4.0); 35 mm.
    { n: 2, law: "arc", t: [1.708, 3.042], az: [-2.25, -2.0], r: [5.1, 4.6], elev: [0.8, 0.9], fov: [38, 36], look: [[1.3, 1.6, 2.4], [1.3, 1.5, 2.2]], ease: "smooth" },
    // 3 (f73-93) ARC INTO THE SEAL: 50 mm, dolly in 1.6 m to eye level with the pup, 4 percent push. Swung to a 3/4 front so the serious face reads.
    { n: 3, law: "arc", t: [3.042, 3.917], az: [-0.95, -0.6], r: [2.9, 1.7], elev: [0.5, 0.15], fov: [30, 27], look: [0, 0.1, 0], ease: "smooth" },
    // 4 (f94-107) KILL ANGLE: 12 mm, hard low angle (0.2,0.2,1.4) looking up the diagonal, held on the mitt, shake from the trauma beat.
    { n: 4, law: "kill", t: [3.917, 4.5], az: [-1.25, -1.1], r: [1.5, 1.35], elev: [-0.15, -0.1], fov: [66, 62], look: [[1.0, 1.0, 1.4], [1.2, 1.3, 1.6]], dutch: [0, 5], ease: "snap" },
    // 5 (f108-150) the deck splits: 18 mm tilt up and pull back (0.3,0.8,3.2) -> (0.3,1.8,4.6), aim rises to the hole.
    { n: 5, law: "kill", t: [4.5, 6.292], az: [-1.47, -1.47], r: [3.2, 4.6], elev: [0.4, 1.4], fov: [52, 50], look: [[0.5, 2.0, 1.0], [0.8, 5.0, 1.0]], dutch: [4, 0], ease: "smooth" },
    // 6 (f151-215) aftermath wide hold (-5,3,8) toward seal and hole, drifting home.
    { n: 6, law: "home", t: [6.292, 9.0], az: [-2.13, -2.6], r: [8.2, 7.2], elev: [2.6, 2.5], fov: [36, 34], look: [[0.8, 1.5, 1.0], [0.4, 1.2, 1.6]], minFrac: 0.12, ease: "smooth" },
    // 7 (f216-300): arc round to face the camera (number card f230), then the kill angle.
    { n: 7, law: "arc", t: [9.0, 10.75], az: [0.9, 0.2], r: [4.2, 3.1], elev: [1.5, 0.6], fov: [34, 31], look: [0, 0.1, 0.4], ease: "smooth" },
    { n: 8, law: "kill", t: [10.75, 12.5], az: [-0.4, -0.7], r: [2.9, 2.4], elev: [0.9, 0.7], fov: [29, 26], look: [0, 0.1, 0.3], dutch: [0, 4], ease: "snap" },
    // 8 (f301-336) home: behind and above the seal in open ground; the wipe is the fx layer's `wipe` cue.
    { n: 9, law: "home", t: [12.5, 14.0], az: Math.PI, r: [3.4, 3.8], elev: [2.0, 2.3], fov: [36, 38], look: [0, 0.2, 3.2], ease: "smooth" },
  ],
  // COLOUR SCRIPT per shot (bible section 5). `sat` is driven by the direction layer on engine.composer; `key` is the value (1-10) the plates aim for.
  colourScript: [
    { n: 1, t: [0, 1.708], key: 4, sat: 0.9, dominant: "slate", accent: null, palette: ["#7f8aa8", "#aeb8d0", "#96866c", "#3b3340", "#f5e0b0"] },
    { n: 2, t: [1.708, 3.042], key: 5, sat: 0.95, dominant: "slate", accent: "coral", palette: ["#ff6a5a", "#3de0b0", "#7f8aa8", "#12070a", "#fff1d8"] },
    { n: 3, t: [3.042, 3.917], key: 3, sat: 0.9, dominant: "low-key", accent: "coral", vig: 0.28, palette: ["#f6f4f1", "#a9a8b6", "#6e6a85", "#12070a", "#ff6a5a"] },
    { n: 4, t: [3.917, 4.5], key: 9, sat: 1.1, dominant: "mono", accent: "red", palette: ["#ffffff", "#12070a", "#c0121f", "#3de0b0", "#ffd21f"] },
    { n: 5, t: [4.5, 6.292], key: 7, sat: 1.1, dominant: "blue", accent: "violet", palette: ["#6aa3e0", "#f5e0b0", "#b79bff", "#3de0b0", "#55607f"] },
    { n: 6, t: [6.292, 9.0], key: 6, sat: 1.0, dominant: "warm light", accent: "violet", palette: ["#6aa3e0", "#f5e0b0", "#96866c", "#3b3340", "#b79bff"] },
    { n: 7, t: [9.0, 12.5], key: 6, sat: 1.0, dominant: "clean", accent: "mint", palette: ["#3de0b0", "#b79bff", "#f6f1e4", "#12070a", "#6aa3e0"] },
    { n: 8, t: [12.5, 14.0], key: 5, sat: 0.95, dominant: "settled", accent: "mint", palette: ["#3de0b0", "#b79bff", "#6aa3e0", "#96866c", "#f6f1e4"] },
  ],
  // STAGE: shared numbers so the three layers agree (each layer may also keep its own copy of the bible; these win on conflict).
  stage: {
    hull: { at: [2.4, 2.0, -1.3], r: 1.1, verts: 42, faces: 80, spin: 0.3, bornAt: 1.708 },
    rays: { count: 48, hot: 9, len: 4.2, fan: [38, 31], coral: "#ff6a5a", snapped: "#3de0b0", landAt: 3.917, landDur: 0.5, growAt: 1.79, growDur: 1.21 },
    punch: { from: [0.5, 0.78, 0.12], to: "hull-corner", flipper: 0.3, mitt: 0.32, ext: 2.0, extIn: [3.875, 3.99], extOut: [4.5, 4.75] },
    deck: { alt: 40, masses: 14, holeAt: [2.4, 40, -1.3], hole: 11, open: [4.083, 5.125], shaft: { w: 11, h: 38, apex: 14 } },
    plain: { depth: 60, horizon: 0.31, rubble: 5, cracks: 9 },
    // victims: Dark Matter Thieves (small costumed seals, faced at the hero; yaw in radians)
    cast: [
      { id: "boros", costume: "royal", scale: 0.75 / 0.8, at: [5.2, 0, -1.8], yaw: -1.238, hair: "swept", crest: 7, ring: "#c0121f", gem: "#8b5fd0" },
      { id: "gruntA", costume: "extra", scale: 0.55 / 0.8, at: [4.2, 0, -3.6], yaw: -0.862, weapon: "blaster" },
      { id: "gruntB", costume: "extra", scale: 0.55 / 0.8, at: [4.6, 0, -3.8], yaw: -0.88, weapon: "blaster" },
      { id: "gruntC", costume: "extra", scale: 0.55 / 0.8, at: [4.0, 0, 0.4], yaw: -1.67, weapon: "blaster", lens: "#ff6a5a" },
      { id: "gruntD", costume: "extra", scale: 0.55 / 0.8, at: [5.4, 0, 1.6], yaw: -1.859, weapon: "blaster" },
    ],
    rubble: [[3.0, -2.2, 0.7], [-2.4, 3.0, 0.5], [6.0, 2.8, 0.6], [-4.0, -3.0, 0.3], [1.5, 4.5, 0.4]], // x, z, size m
  },
  // BEATS: reserved names are handled by the player; every other name is a free cue for the layers (see CUE TABLE above).
  beats: [
    ...LAYER_CUES,
    // ---- shots 1-2: the hull is born, the storm sprays ----
    { t: 1.708, name: "hullBorn", dur: 0.58 }, // f41-55 swell in, ease-out cubic, on twos
    { t: 1.79, name: "rayGrow", dur: 1.21 }, // f43-72 48 rays staggered 0.02 s, jitter on twos +-0.12 m
    // ---- shot 3: the crouch ----
    { t: 2.917, name: "capeOn", dur: 0.2 }, // f70
    { t: 2.917, name: "crouch", dur: 0.83 }, // f70-90 ramp and hold (the pose track carries the body)
    { t: 2.917, name: "serious", dur: 1.33 }, // f70-101: dot eyes, brow slash, cheek hatch, tight w mouth
    { t: 3.25, name: "crossVein", dur: 0.65 }, // f78 egg 1: the cross-vein mark pops on the brow
    { t: 2.917, name: "vignette", dur: 1.25, from: 0.18, to: 0.28 }, // tightens 18 to 28 percent, released by f101
    { t: 3.042, name: "rayTremble", dur: 0.875 }, // f73-93 rays frozen, trembling
    { t: 3.125, name: "speedlines", dur: 0.79, kind: "speed", at: [0.5, 0.45], strength: 0.7, col: "#ffffff" }, // f75-93 parallel pressure lines (18)
    { t: 3.75, name: "wristBand", dur: 1.0 }, // f90 nod to the red glove; DECISION 10 pending (owner to confirm it does not touch the locked design). Default: cast draws it as a 2 px band on the flipper only.
    // ---- shot 4: the punch (f94 = 3.917). f94 mono white, f95 inverted, f96-97 red-black, f98 colour ----
    { t: 3.875, name: "punch", dur: 0.875 }, // f93-114 flipper in over 3 drawings, held six, out f108-114
    { t: 3.917, name: "impact", seq: [[1, 1], [2, 1], [3, 2]] }, // mono white, inverted, then the swapped (red-black) pair
    { t: 3.917, name: "impactCard", dur: 0.167 }, // fx draws the red-black radial starburst on f96-97 (E11, 40 radial lines)
    { t: 3.917, name: "freeze", dur: 0.083 }, // hull held still 2 drawings (E03)
    { t: 3.917, name: "smear", dur: 0.125 }, // 1-drawing stretched double at f94, 2-frame multiple f95-96 (E07)
    { t: 3.875, name: "speedlines", dur: 0.875, kind: "radial", at: [0.6, 0.4], strength: 1, col: "#12070a" }, // f93-114 radial burst on the fist (24)
    { t: 3.917, name: "trauma", amount: 0.6 }, // 4 px shake f94-100, decays in 14 frames
    { t: 3.917, name: "shock", dur: 0.7, at: [0.6, 0.4], amp: 0.035, r1: 0.85 },
    { t: 3.917, name: "rayLand", dur: 0.5 }, // each ray snaps to its vertex over 12 frames; landing fires a dot and a 1-frame white tick
    { t: 3.917, name: "ringA", dur: 0.71 }, // 17 frames 0.25 to 2.65 m
    { t: 4.0, name: "ringB", dur: 0.417 }, // f96-106 10 frames 0.15 to 1.45 m
    { t: 3.917, name: "dust", dur: 0.6 }, // 7 m dust ring across the plain; cracks brighten 4 frames
    { t: 3.917, name: "debris", dur: 1.08 }, // f94-120 24 shards along the punch diagonal
    // ---- the blast the victims react to: wave reaches 2 m at f96 (4.0 s), 5 m at f104 (4.333 s); 2 frames per metre stagger ----
    // args via cue.arg("blast", key): origin (hull corner), r0 (m at t0), t0, speed (m/s), perMetre (s), recoil (s on ones)
    { t: 3.917, name: "blast", dur: 1.9, origin: [2.4, 2.0, -1.3], r0: 2, t0: 4.0, speed: 9, perMetre: 0.083, recoil: 0.125 },
    { t: 4.083, name: "tumble", dur: 1.125 }, // f98-125 thrown 2-5 m, tumble on twos
    { t: 5.25, name: "land", dur: 0.25 }, // f126-132 ground hit, 1-drawing dust puff #96866c
    { t: 5.667, name: "bossKneel", dur: 0.6 }, // f136 the Boros-seal kneels, helm cracked, looks at the hole
    { t: 5.833, name: "settle", dur: 0.3 }, // f140 all settled
    { t: 5.833, name: "whiteFlag", dur: 6.0 }, // f140 egg 8: a grunt waves a white flag
    // ---- shot 5: the deck splits ----
    { t: 4.083, name: "cloudSplit", dur: 1.04 }, // f98-123 two nearest masses slide apart 1.1 m, ease-out cubic; hole 11 m by f124
    { t: 4.083, name: "rimPush", dur: 0.25 }, // f98-103 rims pushed out on ones
    { t: 4.083, name: "dome", dur: 1.04 }, // f98-123 9 m dome rises to the deck, 18 percent fading to 0
    { t: 4.208, name: "hullClose", dur: 1.417 }, // f101-135 faces close in a spiral sweep, 2-frame white edge on the front face
    { t: 4.333, name: "shaft", dur: 0.79 }, // f104-123 light shaft grows, blue plate behind the hole
    { t: 4.208, name: "seriousRelease", dur: 1.46 }, // f101-135 eyes release to normal dots
    { t: 4.5, name: "rayFade", dur: 1.1 }, // to opacity 0.15 by f135
    { t: 4.5, name: "wireFade", dur: 1.125 }, // wire and 42 dots fade to 0 by f135
    { t: 5.125, name: "shaftBreath", dur: 3.2 }, // holds to f200 with 1 percent breath
    { t: 5.417, name: "capeOff", dur: 0.58 }, // f130-144 cape off
    // ---- shots 7-9 ----
    { t: 9.583, name: "numberCard", dur: 2.9 }, // f230 (the lettering itself is scene.sfx; the cue is for fx accents: 3 drawings on ones, then settles)
    { t: 13.75, name: "wipe", dur: 0.25 }, // f330-336 one short wipe home
  ],
  // BUBBLES (lower half, one at a time, never over the seal): the card's own two lines.
  bubbles: [
    { t: [6.667, 8.333], text: "One punch.", who: "narr", side: "l", tone: "say", y: 0.7 }, // A: speaker 'land', f160-200
    { t: [8.542, 12.5], text: "15,361x fewer probes. The hull is already there.", who: "seal", side: "r", tone: "say", y: 0.66 }, // B: f205-300
  ],
  // the 15-line pool (L12), in the register of the card: dry, flat, certain; all short enough for one bubble.
  lines: [
    "One punch.",
    "The hull was already there.",
    "48 probes. One stroke.",
    "Fewer probes. Same hull.",
    "15,361x fewer.",
    "Forty-two vertices.",
    "No need to search.",
    "Just the one.",
    "That was the whole query.",
    "The shape was already known.",
    "Hm. Too easy.",
    "Probes: spared.",
    "Straight to the hull.",
    "Done. Next.",
    "I only needed to hit it once.",
  ],
  // SFX lettering (E16, E19). The overlay places it away from the seal. DOOM pops f94 at 140 percent; yellow on ink, upper right, f94-120.
  sfx: [
    { t: [1.79, 3.0], text: "ZZZ", at: [0.82, 0.22], size: 0.07, rot: 6, col: "#ff6a5a", ink: "#12070a" },
    { t: [3.917, 5.0], text: "DOOM", at: [0.78, 0.22], size: 0.18, rot: 8, col: "#ffd21f", ink: "#12070a" },
    { t: [9.583, 12.5], text: "15,361x", at: [0.22, 0.8], size: 0.14, rot: -3, col: "#3de0b0", ink: "#12070a" },
    { t: [9.9, 12.5], text: "fewer probes", at: [0.22, 0.92], size: 0.045, rot: -3, col: "#f6f1e4", ink: "#12070a" },
  ],
  credit: { t: [12.54, 13.9], text: "google-deepmind/mujoco #3450" },
};
