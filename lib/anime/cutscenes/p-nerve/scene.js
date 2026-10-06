// SCENE DATA for p-nerve (Death Note): the rooftop, the four gauges, the bell. DIRECTION layer, pure data.
// Bible: scripts/p-nerve.md. Real clock 31 s (the bible's 744 frames at 24 fps; frame f -> f/24 s).
// THE SINGLE SOURCE OF CUE NAMES. world/cast/fx read these names via cue.on/k/since/done/arg and cue.nerve (build.js).
//
// CUE TABLE (name: who listens, meaning)
//  rain          world+fx   starts 1.3 s, rain-streak gated by the floodlight cone
//  banner        fx         title card unfurls (black card, white lettering, one red apple); bannerRoll rolls it up
//  realmOpen     world+fx   sky gap opens (monochrome plate, 24 radial lines, 3 red apples), closes at its end
//  appleOut      cast+fx    seal's flipper holds out the apple, scale 0.4 -> 1.0
//  appleTaken    cast       Ryuk's claw takes the apple, grin widens (KUKUKU)
//  bite  n=1..3  cast       Ryuk bites; colony munches
//  chainRing     cast+fx    amber witness ring at the chain crossing
//  ryukWrite     cast       Ryuk opens his notebook and writes slowly
//  stroke n=1..4 cast+fx    seal's pen strokes, one per hypothesis
//  beadDrop n=1..4 world+fx a bead drops in gauge n (3 die, 1 lives)
//  slash         fx+cast    the red/white SHING slash (also reserved impact + trauma)
//  toll n=1..3   world+cast+fx  the bell: yoke swing, DONG ring, rim pulse, L flinch, colony hop, light flicker
//  grainHeap n=1..3 world+fx  umber grains fall and heap (32,48,64 then 16)
//  pigeons       cast       cel pigeons burst off the belfry on toll 1
//  coreFlick     cast       Ryuk flicks the apple core
//  beadFlare     fx+world   fourth gauge flares #4aa8ff, 4-point star, 12 f up and hold
//  lThumbOff     cast       L's thumb leaves the lip, eyes 1.3x
//  ryukGrinFlat  cast       Ryuk's grin flattens
//  chipBag       cast       seal pulls out the chip bag
//  chipTear      cast+fx    RIP: the bag tears into the page
//  screensCut    world      three broadcast screens cut to the page, city lit #cfe8ea; Misa on the nearest
//  pageToLens    cast+fx    page raised to the lens beside the seal's face, head tilt 0.21 rad (never covering it)
//  crackWeb      world+fx   hard-white crack web from the screens, 24 radial lines
//  shatter       world+fx   world breaks into flat cel shards (CRUNCH); chip eaten
//  shardFall     world+fx   shards tumble and fall through the credit hold
//  islandReveal  world      the island beneath is revealed
//  chime         fx         credit chime flare
//  wipe          fx+world   the short home wipe
//  notebookClose cast       the notebook closes
// Reserved beats used: impact, speedlines, shock, trauma (and the seal track poses).
// Colour script: shot.pal (5 swatches per shot from the bible), read by layers via cue.shot.pal.
export default {
  id: "p-nerve",
  title: "Death Note",
  anime: "Death Note",
  style: "modern-anime",
  // Madhouse Death Note: thin warm-black ink, desaturated teal-grey grade, single saturated reds, deep blacks, light grain, 12% vignette.
  look: {
    fill: { sat: 0.92, lumaMax: 0.92, rim: 0.5, ring: 1 },
    lines: { px: 1.8, ink: "#1c1816", inkMix: 1, set: 0.6, setCol: "#1c1816", setMix: 1, charLines: 1 },
    post: { bloom: 0.35, diffuse: 0.1, shafts: 0.45, shaftCol: "#f4efe3", sat: 0.82, grain: 0.04, vig: 0.12, split: [-0.02, 0.0, 0.03],
      kuwa: 3, bgSat: 0.75, bgPoster: 4, haze: "#1b1018", hazeAmt: 0.28, hazeNear: 4, hazeFar: 40 },
  },
  fps: 12,
  duration: 31,
  seed: 25,
  far: 1500,
  plates: true,
  bg: "#050408",
  palette: {
    sky: "#07070d", cloud: "#1a1220", underglow: "#5a2f2a", horizon: "#e8a23a", rimTeal: "#2f7f86",
    stone: "#8d9498", stoneMid: "#4c5358", stoneShadow: "#21282c", stoneDeep: "#0b0e10", wet: "#cfe6e6",
    shaft: "#f4efe3", rain: "#cfe8ea", rainFar: "#7fa4a6",
    red: "#b3171f", apple: "#d21f1a", appleShadow: "#7a0d0f", appleHi: "#ff6a5a", coral: "#ff5a4d",
    bead: "#4aa8ff", beadCore: "#d9efff", bronze: "#c58a3a", bronzeShadow: "#7a4f1e", glint: "#ffe3a0",
    grain: "#7a4a2a", ivory: "#f4efe3", cover: "#0f0f12", foil: "#c9cdd1", flash: "#fff1d6", sfxRed: "#8a1219",
    realmAsh: "#1a1a18", realmBone: "#8f8d86", ink: "#1c1816", key: "#f4efe3", accent: "#b3171f",
  },
  seal: {
    at: [0, 0, 0], yaw: 0, scale: 1,
    moves: [{ t: [30.3, 31.0], to: [0, 0, 5] }], // the seal walks out after the notebook closes
    track: [
      { t: 0.0, pose: "idle", dur: 0.3 },                              // arrival stand, head toward Ryuk
      { t: 4.5, pose: "raise", dur: 0.6, hold: 1.3, out: 0.5 },        // apple at arm's length
      { t: 8.1, pose: "sign", dur: 0.3, hold: 3.0, out: 0.4 },         // notebook and pen, four strokes
      { t: 11.5, pose: "idle", dur: 0.3 },                             // still, eyes follow the bell
      { t: 16.9, pose: "awe", dur: 0.3, hold: 0.5, out: 0.3 },         // eyes widen, then narrow
      { t: 17.7, pose: "blink", dur: 0.2, out: 0.2 },                  // half-lidded, the slant smile
      { t: 20.6, pose: "fist", dur: 0.4, hold: 0.8, out: 0.3 },        // pulls out the chip bag
      { t: 22.2, pose: "raise", dur: 0.5, hold: 1.4, out: 0.4, k: 0.8 }, // page to lens, tilt 0.21
      { t: 25.3, pose: "fist", dur: 0.2, hold: 0.4, out: 0.3 },        // eats the chip
      { t: 26.0, pose: "idle", dur: 0.4 },                             // upright under falling shards
    ],
  },
  // CAMERA LAW: wide (pull back and up) -> arc (into the seal) -> kill angle -> home; a cut at least every 5 s (all <= 4.2 s).
  shots: [
    { n: 1, t: [0, 4.2], law: "wide", r: [4, 15], elev: [1, 9], fov: [28, 44], az: 0.7, look: [[0, 0.2, 0], [0, 1.4, 0]],
      pal: ["#050408", "#1b1018", "#e8a23a", "#2f7f86", "#b3171f"] },
    { n: 2, t: [4.2, 8.0], law: "arc", az: [0.95, 0.45], r: [6, 2.9], elev: [3.2, 1.1], fov: [42, 36], look: [0, 0.1, 0],
      pal: ["#050408", "#b3171f", "#f4efe3", "#1b1018", "#c9cdd1"] },
    { n: 3, t: [8.0, 9.6], law: "arc", az: [-0.7, -0.95], r: [3.4, 2.7], elev: [1.7, 1.2], fov: [34, 30], look: [[0, 0.2, 0.3], [-0.5, 1.0, 0.4]], // over the shoulder, tilt to the gauges
      pal: ["#0f0f12", "#f4efe3", "#4aa8ff", "#b3171f", "#1b1018"] },
    { n: 4, t: [9.6, 11.25], law: "arc", az: [0.3, 0.15], r: [2.4, 1.9], elev: [0.6, 0.45], fov: [30, 26], look: [0, 0.1, 0], // cut to the pup's face
      pal: ["#0f0f12", "#f4efe3", "#4aa8ff", "#b3171f", "#1b1018"] },
    { n: 5, t: [11.25, 11.9], law: "kill", az: -0.5, r: [2.0, 1.6], elev: 0.3, fov: 35, dutch: [0, 5], ease: "snap", look: [0.25, 0.0, 0.2], // low on the pen hand
      pal: ["#b3171f", "#ffffff", "#0b0e10", "#ff5a4d", "#f4efe3"] },
    { n: 6, t: [11.9, 14.0], law: "wide", az: [1.3, 1.6], r: [8, 9.5], elev: [2.5, 3.2], fov: 35, look: [[0, 0.2, -1], [-0.8, 0.5, -1.2]], // lateral drift across the deck
      pal: ["#1b1018", "#e8a23a", "#ff5a4d", "#7a4a2a", "#2f7f86"] },
    { n: 7, t: [14.0, 15.5], law: "arc", az: [1.25, 0.95], r: [5.2, 4.4], elev: [1.0, 0.9], fov: 36, look: [[-1.8, 0.4, -1.0], [-2.6, 0.5, -1.2]], // L's face
      pal: ["#1b1018", "#e8a23a", "#ff5a4d", "#7a4a2a", "#2f7f86"] },
    { n: 8, t: [15.5, 16.5], law: "wide", az: 0.45, r: [8, 9], elev: [2.5, 3.5], fov: 38, look: [[0, 1.0, -1.0], [0, 2.4, -2.0]], // the bell
      pal: ["#1b1018", "#e8a23a", "#c58a3a", "#ffe3a0", "#2f7f86"] },
    { n: 9, t: [16.5, 18.33], law: "arc", az: [0.8, 0.3], r: [4.2, 2.9], elev: [1.8, 1.0], fov: [45, 38], look: [0, 0.1, 0], // hero medium arcs in
      pal: ["#050408", "#4aa8ff", "#b3171f", "#f4efe3", "#1b1018"] },
    { n: 10, t: [18.33, 20.5], law: "kill", az: [-0.4, -0.6], r: [2.6, 1.9], elev: [0.9, 0.7], fov: [28, 24], dutch: [0, 4], look: [0, 0.1, 0], // on the bead; line C plays here
      pal: ["#050408", "#4aa8ff", "#b3171f", "#f4efe3", "#1b1018"] },
    { n: 11, t: [20.5, 21.5], law: "arc", az: [0.4, 0.3], r: [2.8, 2.3], elev: [1.0, 0.7], fov: [36, 32], look: [0, 0.1, 0], // slow-motion: push to the face, chip bag
      pal: ["#f4efe3", "#0f0f12", "#b3171f", "#2f7f86", "#c9cdd1"] },
    { n: 12, t: [21.5, 22.67], law: "arc", az: [-0.25, -0.1], r: [2.0, 1.8], elev: [0.5, 0.4], fov: [26, 24], look: [0, 0.15, 0], // the tear
      pal: ["#f4efe3", "#0f0f12", "#b3171f", "#2f7f86", "#c9cdd1"] },
    { n: 13, t: [22.67, 23.6], law: "kill", az: [-0.1, 0.0], r: [1.9, 1.7], elev: 0.25, fov: 24, dutch: [0, 5], look: [0, 0.15, 0], // page to the lens, the half-lidded slant smile
      pal: ["#f4efe3", "#0f0f12", "#b3171f", "#2f7f86", "#c9cdd1"] },
    { n: 14, t: [23.6, 24.4], law: "arc", az: [0.55, 0.4], r: [2.6, 3.2], elev: [0.8, 1.2], fov: [34, 38], look: [0, 0.1, 0], // screens behind, crack begins
      pal: ["#f4efe3", "#0f0f12", "#b3171f", "#2f7f86", "#c9cdd1"] },
    { n: 15, t: [24.4, 26.0], law: "wide", az: 0.6, r: [3.5, 12], elev: [0.9, 8], fov: [28, 40], look: [[0, 0.2, 0], [0, 1.2, 0]], // crack web, chip eaten, shatter
      pal: ["#ffffff", "#0b0e10", "#b3171f", "#fff1d6", "#8d9498"] },
    { n: 16, t: [26.0, 30.2], law: "arc", az: [0.6, 0.3], r: [4.5, 5.0], elev: [1.6, 1.8], fov: 40, look: [0, 0.3, 0], // credit hold: shards fall, the island revealed
      pal: ["#b3171f", "#f4efe3", "#2f7f86", "#e8a23a", "#050408"] },
    { n: 17, t: [30.2, 31.0], law: "home", az: Math.PI, r: [3.4, 3.8], elev: [2, 2.3], fov: [36, 38], look: [0, 0.2, 3.2], // chase pose, open ground, the seal walks out
      pal: ["#f4efe3", "#2f7f86", "#e8a23a", "#1b1018", "#b3171f"] },
  ],
  beats: [
    // ---- shot 1: tower, rain, banner ----
    { t: 0.33, name: "banner", dur: 1.85 },
    { t: 2.17, name: "bannerRoll", dur: 0.33 },
    { t: 1.3, name: "rain", dur: 29.7 },
    // ---- shot 2: the apple handoff, the realm gap ----
    { t: 4.5, name: "appleOut", dur: 1.2 },
    { t: 4.6, name: "realmOpen", dur: 3.4 },
    { t: 4.6, name: "speedlines", dur: 3.0, kind: "radial", at: [0.72, 0.38], strength: 0.5, col: "#ffffff" },
    { t: 5.7, name: "appleTaken", dur: 0.6 },
    { t: 5.7, name: "speedlines", dur: 0.5, kind: "speed", at: [0.7, 0.4], strength: 0.6, col: "#f4efe3" },
    { t: 6.4, name: "chainRing", dur: 1.2 },
    { t: 6.5, name: "bite", n: 1, dur: 0.4 },
    { t: 7.2, name: "bite", n: 2, dur: 0.4 },
    { t: 7.8, name: "bite", n: 3, dur: 0.4 },
    // ---- shot 3/4: four strokes, four beads ----
    { t: 8.0, name: "ryukWrite", dur: 3.9 },
    { t: 8.3, name: "stroke", n: 1, dur: 0.4 }, { t: 8.45, name: "beadDrop", n: 1, dur: 0.6 },
    { t: 8.8, name: "stroke", n: 2, dur: 0.4 }, { t: 8.95, name: "beadDrop", n: 2, dur: 0.6 },
    { t: 9.3, name: "stroke", n: 3, dur: 0.4 }, { t: 9.45, name: "beadDrop", n: 3, dur: 0.6 },
    { t: 9.8, name: "stroke", n: 4, dur: 0.4 }, { t: 9.95, name: "beadDrop", n: 4, dur: 0.6 },
    // ---- shot 5: the kill-angle slash, 2-frame impact ----
    { t: 11.25, name: "slash", dur: 0.4 },
    { t: 11.25, name: "impact", seq: [[2, 2], [1, 2]] },
    { t: 11.25, name: "trauma", amount: 0.4 },
    // ---- shots 6-8: the tolls, the grains ----
    { t: 12.4, name: "toll", n: 1, dur: 1.85 }, { t: 12.4, name: "grainHeap", n: 1, dur: 0.9 }, { t: 12.4, name: "pigeons", dur: 2.0 },
    { t: 12.4, name: "shock", dur: 0.25, at: [0.72, 0.3], amp: 0.5, r1: 0.5 }, { t: 12.4, name: "trauma", amount: 0.25 },
    { t: 13.5, name: "toll", n: 2, dur: 1.85 }, { t: 13.5, name: "grainHeap", n: 2, dur: 0.9 },
    { t: 13.5, name: "shock", dur: 0.25, at: [0.72, 0.3], amp: 0.5, r1: 0.5 }, { t: 13.5, name: "trauma", amount: 0.25 },
    { t: 14.6, name: "toll", n: 3, dur: 1.85 }, { t: 14.6, name: "grainHeap", n: 3, dur: 0.9 },
    { t: 14.6, name: "shock", dur: 0.25, at: [0.72, 0.3], amp: 0.5, r1: 0.5 }, { t: 14.6, name: "trauma", amount: 0.25 },
    // ---- shot 9/10: the fourth bead, the core, L's thumb ----
    { t: 16.9, name: "beadFlare", dur: 0.5 },
    { t: 16.9, name: "lThumbOff", dur: 0.4 },
    { t: 16.9, name: "ryukGrinFlat", dur: 0.4 },
    { t: 17.2, name: "coreFlick", dur: 0.6 },
    // ---- shots 11-14: slow motion: chip bag, tear, page to lens ----
    { t: 20.6, name: "chipBag", dur: 1.0 },
    { t: 21.5, name: "chipTear", dur: 0.35 },
    { t: 21.5, name: "impact", seq: [[2, 1]] },
    { t: 21.8, name: "screensCut", dur: 2.6 },
    { t: 22.3, name: "pageToLens", dur: 1.3, tilt: 0.21 },
    // ---- shot 15: crack, shatter, chip eaten ----
    { t: 24.4, name: "crackWeb", dur: 1.0 },
    { t: 24.4, name: "speedlines", dur: 1.0, kind: "radial", at: [0.5, 0.5], strength: 0.8, col: "#ffffff" },
    { t: 25.4, name: "shatter", dur: 0.6 },
    { t: 25.4, name: "impact", seq: [[2, 2], [1, 2]] },
    { t: 25.4, name: "trauma", amount: 0.5 },
    // ---- shot 16: credit hold, shards fall, the island ----
    { t: 25.4, name: "shardFall", dur: 4.8 },
    { t: 26.0, name: "chime", dur: 0.6 },
    { t: 26.5, name: "islandReveal", dur: 2.0 },
    // ---- shot 17: wipe home ----
    { t: 30.2, name: "wipe", dur: 0.5 },
    { t: 30.3, name: "notebookClose", dur: 0.4 },
  ],
  // Bubbles: lower half, one at a time, off the seal. Ryuk and L are the "foe" voice (inverted bubble).
  bubbles: [
    { t: [5.0, 7.9], pool: "lines", who: "foe", side: "r", tone: "say" },
    { t: [12.6, 14.4], text: "The bells are loud today.", who: "foe", side: "l", tone: "say" },
    { t: [17.6, 21.0], text: "I built the control that could kill my own result, then published what it said. 3 of its own 4 hypotheses withdrawn. 224 tests passing.", who: "seal", side: "c", tone: "say" },
  ],
  // The pool: 15 Ryuk-voiced lines, sincere, about the control that can kill the result (L12). One is drawn per play.
  lines: [
    "When it ends, I'm the one who writes yours.",
    "You built something that could prove you wrong. Humans never do that.",
    "Four ideas. I'll watch which one still breathes.",
    "The apple's fair. The control is fairer.",
    "Kukuku. You want the answer or the one you hoped for?",
    "Most hands only write what they want. Yours keeps the pen honest.",
    "A test that can't fail is just a wish.",
    "Careful. The notebook doesn't care how long you worked.",
    "I've watched a lot of people lie to a page. You don't.",
    "Three die tonight. That's what makes the fourth mean something.",
    "Bells don't lie either. Listen.",
    "I'm bored. Show me the number that scares you.",
    "Humans are interesting when they can lose.",
    "Go on. Publish what it said.",
    "Even a shinigami can't argue with 224 passing.",
  ],
  sfx: [
    { t: [5.7, 6.5], text: "KUKUKU", at: [0.78, 0.3], size: 0.07, rot: -8, col: "#ffffff", ink: "#8a1219" },
    { t: [11.3, 11.9], text: "SHING", at: [0.2, 0.3], size: 0.11, rot: -14, col: "#ffffff", ink: "#8a1219" },
    { t: [12.4, 13.1], text: "DONG", at: [0.8, 0.22], size: 0.09, rot: 4, col: "#ffffff", ink: "#8a1219" },
    { t: [13.5, 14.2], text: "DONG", at: [0.8, 0.22], size: 0.09, rot: 4, col: "#ffffff", ink: "#8a1219" },
    { t: [14.6, 15.3], text: "DONG", at: [0.8, 0.22], size: 0.09, rot: 4, col: "#ffffff", ink: "#8a1219" },
    { t: [21.5, 22.0], text: "RIP", at: [0.2, 0.28], size: 0.1, rot: -10, col: "#ffffff", ink: "#8a1219" },
    { t: [25.4, 26.0], text: "CRUNCH", at: [0.78, 0.28], size: 0.11, rot: 6, col: "#ffffff", ink: "#8a1219" },
  ],
  credit: { t: [26.2, 30.0], text: "nerve: 3 of its own 4 hypotheses withdrawn · 224 tests passing" },
  // Bible numbers the layers share (read via ctx.scene.facts): geometry anchors and gauge/grain/bell constants.
  facts: {
    ryukAt: [1.55, 0.55, -2.35], lAt: [-3.55, -0.24, -2.2], colonyAt: [4.62, 0, 0.0], keyAt: [4.7, 5.9, -0.7], keyAim: [-0.5, 0.5, -1.6],
    realmAt: [8.5, 21.5, -104], gaugesX: [-2.2, -1.3, -0.4, 0.5], heaps: [32, 48, 64, 16],
    bell: { amp: 0.42, decay: 0.75, period: 1.85, y: 7.15 },
  },
};
