// SCENE DATA for pr-tensorflow-124410 (JoJo Part 3, DIO vs Jotaro: MUDA and The World). DIRECTION agent. Pure data.
// Single source of truth for cue names, times and the stage. Bible: scripts/pr-tensorflow-124410.md (+ .json).
// Owner law L6: the SEAL IS DIO. Its Stand, The World, throws MUDA and stops time. The anime figure is the VICTIM,
// a Jotaro-dressed small seal on the valve tower. The Jotaro seal never speaks line A.
//
// ============================== STAGE (world coordinates, metres; seal scale 1) ==============================
// The seal stands at the origin facing +z. Seal-local x is its right (= world -x), its left is world +x.
//   dam crest        a long strip along z (z -8..32), 4 m wide (x -2..2), y 0. Railing + lamp posts. 40 m long (bible).
//   valley           the faceted valley falls away on the seal's RIGHT (world -x). Far mountains beyond it.
//   reservoir        on the seal's LEFT (world +x): water surface y = -2.5, x from +2 outward (cyan/blue).
//   valve tower      12 m, at the far end of the crest: base (0, 0, 33), top platform y 12. The Jotaro seal starts at
//                    its foot and WALKS toward DIO: z 30 -> 10 over 3.0..5.0 s, then frozen (time stop).
//   control gantry   two fluted pylons 14 m at x = +5, z = 6 and z = 28 (edges 22 m between them, along z),
//                    four edges stacked at y 4, 7.5, 11, 14: three mint, ONE coral (the redundant one, y = 7.5).
//   The World        the Stand: 3.4 m tall (1.9x the seal), rises out of the crest BEHIND the seal at (0, 0, -2.4).
//   clock            giant clock face 18 m in the sky BEHIND the seal, centre (0, 20, -26), faces +z.
//   road roller      a prop parked on the crest at (0, 0, 15)  (Easter egg 1, 'Road roller da!').
//   bystanders       six costumed seals (linen tunic, headscarf, basket) fleeing along the crest, z 12..26.
//   island           at the tear (9.54 s) the pocket reveals the snow island; the seal does NOT move: the world layer
//                    swaps the dressing around the origin (cue "island").
// The camera is aimed at the SEAL always (the law); the stage is arranged around it (Stand behind, target ahead).
// The same numbers are exported below as `stage` so layers can read ctx.scene.stage.
// ================================================================================================================
const T = (a, b) => [a, b];

// Consolidate: cue names the layers read, at the bible times (agreement with the layers' fallbacks).
const LAYER_CUES = [
  { t: 5, name: "crack" },
  { t: 7.6, name: "drown" },
  { t: 6.21, name: "clock" },
  { t: 3, name: "stand" },
  { t: 3, name: "approach" },
  { t: 8.2, name: "flex" },
  { t: 13, name: "credit" },
];

export default {
  id: "pr-tensorflow-124410",
  title: "JoJo Part 3, DIO: MUDA",
  anime: "JoJo's Bizarre Adventure: Stardust Crusaders, DIO vs Jotaro, Cairo: The World stops time",
  style: "modern-anime",
  // Compositing (bible section 2): no bloom except the clock face (the fx layer lifts the clock above 1 itself),
  // saturated, grain 0.015, vignette 0.15, thick black ink 3 px, hard cel.
  look: {
    lines: { px: 3, ink: "#05020a", inkMix: 1, set: 1, setW: 1.4, setMix: 1, setCol: "#05020a", charLines: 1 },
    fill: { sat: 1.18, flat: 0.8, bias: 0.3, lumaMax: 0.92 },
    post: { bloom: 0.12, diffuse: 0, shafts: 0, sat: 1.15, grain: 0.015, vig: 0.15 },
  },
  fps: 12, // characters on twos; the MUDA fan layer re-randomises each 2 frames (every step)
  duration: 17.4,
  seed: 124410, // the PR number
  far: 1200,
  plates: true,
  bg: "#5a2a8a",

  stage: {
    crest: { z: [-8, 32], halfW: 2, y: 0 },
    water: { y: -2.5, side: "+x" },
    valley: { side: "-x" },
    tower: { at: [0, 0, 33], h: 12 },
    gantry: { x: 5, z: [6, 28], pylonH: 14, edgeY: [4, 7.5, 11, 14], coralIndex: 1 },
    stand: { at: [0, 0, -2.4], h: 3.4 },
    clock: { at: [0, 20, -26], r: 9, minuteHand: 7 },
    roller: { at: [0, 0, 15] },
    jotaro: { from: [0, 0, 30], to: [0, 0, 10], scale: 0.9 },
    bystanders: { n: 6, z: [12, 26] },
    stageRadius: 40,
  },

  // the base palette (the world agent also reads the per-beat sets below)
  palette: {
    violet: "#5a2a8a", magenta: "#d02a9a", orange: "#ff9a2a", cyan: "#19d3ff", citrus: "#ffe14a", ink: "#05020a",
    coral: "#ff6a5a", mint: "#3de0b0", water: "#1f5fe0", pylon: "#8a80a0",
    stoneLit: "#c8c0d0", stoneMid: "#8a80a0", stoneShadow: "#4a3a6a", stoneDeep: "#20103a",
    valley: "#3a8a5a", valleyShadow: "#14403a",
    // DIO
    skinLit: "#f6d4b4", skinMid: "#e0a888", skinShadow: "#a86858",
    hairLit: "#fff08a", hairMid: "#f0c020", hairShadow: "#b88010",
    jacketLit: "#ffd24a", jacketMid: "#e0a020", jacketShadow: "#8a5a10", jacketDeep: "#3a2008",
    shirt: "#0a0a12", shirtHi: "#3a3a5a",
    capeLit: "#d02a3a", capeMid: "#8a1a2a", capeShadow: "#3a0a14",
    goldLit: "#ffe27a", goldMid: "#d0a020", goldShadow: "#7a5a10",
    // The World
    plateLit: "#f6e8b0", plateMid: "#e8d49a", plateShadow: "#b8742a", limb: "#7a8a7a", limbShadow: "#4a5a5a",
    hood: "#4a4a50", band: "#d0a020", seam: "#6a3a20",
    // bystanders
    linen: "#d8c8a0", scarf: "#c8a060",
  },

  // the colour script per shot: flat palette swaps by hard cut on twos. Read by build.js into
  // ctx.pal = { name, cols:[5 hexes], invert, note } and driven by the "palette" beats.
  palettes: {
    violet: { cols: ["#5a2a8a", "#d02a9a", "#ff9a2a", "#19d3ff", "#05020a"], note: "violet-magenta dusk" },
    citrus: { cols: ["#ffe14a", "#ff9a2a", "#d02a9a", "#05020a", "#19d3ff"], note: "orange citrus" },
    magenta: { cols: ["#d02a9a", "#ffe14a", "#ff9a2a", "#05020a", "#19d3ff"], note: "magenta field, citrus accents" },
    yolet: { cols: ["#ffe14a", "#5a2a8a", "#05020a", "#ff6a5a", "#d02a9a"], note: "yellow-violet barrage" },
    inverted: { cols: ["#dfd1ff", "#fa9a31", "#2fd5c1", "#fffffe", "#e6e6e6"], note: "complement set: time stop", invert: true },
    cyan: { cols: ["#19d3ff", "#3de0b0", "#1f5fe0", "#05020a", "#ffe14a"], note: "cyan-mint drowning" },
    snow: { cols: ["#f4f4f0", "#d02a9a", "#ffe14a", "#05020a", "#c8d8e8"], note: "island snow with magenta" },
  },

  // the seal is DIO, standing his ground on the crest; at the tear the world swaps to the island around it.
  seal: {
    at: [0, 0, 0], yaw: 0, scale: 1,
    moves: [
      { t: T(4.9, 5.0), to: [0, 0, 0.35] }, // lunge into the stance
      { t: T(7.46, 7.7), to: [0, 0, 0] },   // settles after the resume
    ],
    // raise = arms spread (the cel pose), point = "Oh? You're approaching me?", fist = MUDA stance,
    // sign = the time-stop hold, sign+crouch together = the JoJo pose (twisted contrapposto, flipper across the face).
    track: [
      { t: 1.2, pose: "raise", dur: 0.4, hold: 1.8, out: 0.25 },
      { t: 3.0, pose: "point", dur: 0.3, hold: 1.7, out: 0.3 },
      { t: 4.9, pose: "fist", dur: 0.2, hold: 1.1, out: 0.2 },
      { t: 6.21, pose: "sign", dur: 0.2, hold: 1.0, out: 0.25 },
      { t: 7.9, pose: "idle", dur: 0.3, hold: 0.4, out: 0.2 },
      { t: 8.4, pose: "sign", dur: 0.4, hold: 5.2, out: 0.4 },
      { t: 8.4, pose: "crouch", dur: 0.4, hold: 5.2, out: 0.4 },
      { t: 13.3, pose: "raise", dur: 0.4, hold: 1.2, out: 0.3 },
    ],
  },

  // ---- THE CAMERA LAW: wide -> arc -> kill -> home; a cut at least every 5 s; every shot aimed at the seal ----
  // `pal` names the colour-script entry; `bible` is the bible shot number.
  shots: [
    // bible 1: EWS, pull back and up, the island recedes, the sky becomes bullseye rings. fov 28 -> 42.
    { n: 1, bible: 1, t: T(0, 1.5), law: "wide", pal: "violet", az: 0.7, r: [4, 15], elev: [1, 9], fov: [28, 42], look: [[0, 0.2, 0], [0, 1.2, 0]], ease: "smooth" },
    // bible 2: wide, the switch: 35 mm LOW from behind-left, the crest runs away, the tower in the far third.
    { n: 2, bible: 2, t: T(1.5, 3.0), law: "wide", pal: "citrus", az: [2.55, 2.85], r: [9, 8], elev: [0.8, 1.6], fov: [38, 36], look: [[0, 1.5, 5], [0, 1.8, 6]], ease: "smooth" },
    // bible 3: medium arc into the seal from -0.349 rad, low lens, fov 56, swinging to profile as Jotaro walks.
    { n: 3, bible: 3, t: T(3.0, 5.0), law: "arc", pal: "magenta", az: [-0.349, -1.25], r: [4.2, 3.0], elev: [0.2, 0.5], fov: [56, 50], look: [[0, 0.7, -0.4], [0, 0.8, 1.0]], dutch: 0, ease: "smooth" },
    // bible 4: KILL ANGLE, the barrage. Profile from the seal's right: Stand left, the fan of fists streaming right
    // toward the gantry. The diagonal roll on twos is ctx.stage.dutch (build.js) on top of this dutch ramp.
    { n: 4, bible: 4, t: T(5.0, 6.21), law: "kill", pal: "yolet", az: [-1.35, -1.7], r: [2.7, 2.2], elev: [0.8, 0.7], fov: [42, 34], look: [[0, 0.3, 1.2], [0, 0.3, 1.8]], dutch: [-8, 12], ease: "snap" },
    // bible 5: time stop, LOCKED (every field held). Looks up past the seal at the Stand and the clock behind it.
    { n: 5, bible: 5, t: T(6.21, 7.46), law: "kill", pal: "inverted", az: -0.9, r: 3.2, elev: 0.9, fov: 46, look: [0, 1.6, -2.4], dutch: 5, ease: "linear" },
    // bible 6: wide over the reservoir from the valley side: the coral edge falls and drowns, three mint remain.
    { n: 6, bible: 6, t: T(7.46, 9.54), law: "wide", pal: "cyan", az: [-1.2, -1.5], r: [9, 10], elev: [4, 3], fov: 46, look: [[0, 1.5, 4], [0, 1.5, 6]], ease: "smooth" },
    // bible 7a: island, chase pose: behind and above in open ground.
    { n: 7, bible: 7, t: T(9.54, 11.3), law: "home", pal: "snow", az: [3.14, 2.85], r: [3.1, 3.5], elev: [1.8, 2.1], fov: [36, 38], look: [0, 0.2, 3.2], ease: "smooth" },
    // bible 7b: then front: the JoJo pose reads (flipper across the face, twisted contrapposto).
    { n: 8, bible: 7, t: T(11.3, 13.0), law: "arc", pal: "snow", az: [0.45, 0.12], r: [3.1, 2.7], elev: [0.35, 0.5], fov: [36, 32], look: [0, 0.4, 0], dutch: [-3, 2], ease: "smooth" },
    // bible 8: credit, wide: 35 mm behind and above; the short wipe home 16.6-17.0 s.
    { n: 9, bible: 8, t: T(13.0, 17.4), law: "home", pal: "snow", az: [2.8, 3.3], r: [5, 9], elev: [3, 6], fov: [34, 40], look: [0, 0.4, 3.0], ease: "smooth" },
  ],

  // ---- BEATS: the cue names are the contract with the layers (world / cast / fx).
  // Reserved: impact speedlines shock trauma pose. Every other name is free: cue.on / cue.k / cue.since / cue.arg.
  beats: [
    ...LAYER_CUES,
    // ===== COLOUR SCRIPT: hard cuts on twos at the shot boundaries (build.js maps them into ctx.pal) =====
    { t: 0.0, name: "palette", dur: 1.5, set: "violet" },
    { t: 1.5, name: "palette", dur: 1.5, set: "citrus" },
    { t: 3.0, name: "palette", dur: 2.0, set: "magenta" },
    { t: 5.0, name: "palette", dur: 1.21, set: "yolet" },
    { t: 6.21, name: "palette", dur: 1.25, set: "inverted" },
    { t: 7.46, name: "palette", dur: 2.08, set: "cyan" },
    { t: 9.54, name: "palette", dur: 7.86, set: "snow" },

    // ===== SHOT 1 (0-1.5): EWS. bullseye sky (8 rings, 6 degrees apart); low organ chord =====
    { t: 0.0, name: "bullseye", dur: 17.4, rings: 8, deg: 6 },
    { t: 0.0, name: "organ", dur: 1.5 },

    // ===== SHOT 2 (1.5-3.0): the dam builds, GOGOGO rises, the gantry glows, inverted panel on impact =====
    { t: 0.4, name: "dam_build", dur: 1.1 },
    { t: 1.5, name: "impact", seq: [[2, 2]] },
    { t: 1.5, name: "gogogo", dur: 10.0, count: 12, fade: 9.54 },
    { t: 1.5, name: "gantry_glow", dur: 1.5 },
    { t: 1.5, name: "bystanders_flee", dur: 4.71 },
    { t: 2.0, name: "dio_expr", dur: 1.0, expr: "smug" },

    // ===== SHOT 3 (3.0-5.0): the line; the Stand rises; Jotaro steps forward; road roller =====
    { t: 3.0, name: "stand_rise", dur: 1.2 },
    { t: 3.0, name: "jotaro_step", dur: 2.0, from: [0, 0, 30], to: [0, 0, 10] },
    { t: 3.0, name: "roller", dur: 2.0 },
    { t: 3.0, name: "thud", dur: 0.4 },
    { t: 3.0, name: "shock", dur: 0.5, at: [0.5, 0.6], amp: 0.5, r1: 0.5 },
    { t: 3.0, name: "trauma", amount: 0.35 },
    { t: 3.0, name: "speedlines", dur: 0.5, kind: "radial", at: [0.5, 0.55], strength: 0.5, col: "#ffffff" },
    { t: 3.0, name: "dio_expr", dur: 1.9, expr: "smug" },
    { t: 3.5, name: "muda_warm", dur: 1.5, fists: 24 },
    { t: 3.5, name: "edge_tremble", dur: 1.5 },
    { t: 4.0, name: "stand_sway", dur: 1.0 },

    // ===== SHOT 4 (5.0-6.21): KILL ANGLE. MUDA barrage on the coral edge (124 fists, egg 6) =====
    { t: 4.9, name: "dio_expr", dur: 1.3, expr: "rage" },
    { t: 5.0, name: "muda", dur: 1.21, count: 124, perVolley: [12, 20], volley: 1.5 },
    { t: 5.0, name: "impact", seq: [[2, 2]] },
    { t: 5.0, name: "speedlines", dur: 1.21, kind: "speed", at: [0.7, 0.5], strength: 0.95, col: "#ffffff" },
    { t: 5.0, name: "trauma", amount: 0.55 },
    { t: 5.0, name: "dam_judder", dur: 1.21 },
    { t: 5.0, name: "edge_fissure", dur: 0.9 },
    { t: 5.0, name: "clock_show", dur: 4.6 },
    { t: 5.0, name: "spark", dur: 1.21 },
    { t: 5.5, name: "impact", seq: [[1, 1], [2, 1]] },
    { t: 5.5, name: "trauma", amount: 0.3 },
    { t: 5.9, name: "edge_crack", dur: 0.3 },
    { t: 5.9, name: "impact", seq: [[2, 1], [3, 1]] },
    { t: 5.9, name: "trauma", amount: 0.4 },

    // ===== SHOT 5 (6.21-7.46): TIME STOP. Inversion held 1.2 s, the clock ticks, spray hangs; DIO + Stand move =====
    { t: 6.21, name: "impact", seq: [[2, 1]] },
    { t: 6.21, name: "timestop", dur: 1.25 },
    { t: 6.21, name: "spray_hang", dur: 1.25 },
    { t: 6.21, name: "bystanders_freeze", dur: 1.25 },
    { t: 6.21, name: "jotaro_freeze", dur: 1.25 },
    { t: 6.21, name: "jotaro_brim", dur: 0.4 },
    { t: 6.21, name: "stand_hold", dur: 1.25 },
    { t: 6.4, name: "tick", dur: 0.2, n: 1 },
    { t: 6.6, name: "tock", dur: 0.2, n: 2 },
    { t: 6.8, name: "tick", dur: 0.2, n: 3 },
    { t: 6.95, name: "tock", dur: 0.2, n: 4, last: true },
    { t: 6.9, name: "banana", dur: 1.0 },

    // ===== SHOT 6 (7.46-9.54): the resume; the coral edge falls and drowns; three mint remain =====
    { t: 7.46, name: "resume", dur: 0.3 },
    { t: 7.46, name: "impact", seq: [[3, 1]] },
    { t: 7.46, name: "bystanders_fall", dur: 0.6 },
    { t: 7.46, name: "edge_fall", dur: 0.7 },
    { t: 7.7, name: "jotaro_recoil", dur: 0.8 },
    { t: 7.9, name: "dam_judder", dur: 0.5 },
    { t: 7.9, name: "trauma", amount: 0.4 },
    { t: 8.0, name: "edge_drown", dur: 0.9 },
    { t: 8.0, name: "shock", dur: 0.7, at: [0.6, 0.62], amp: 0.6, r1: 0.55 },
    { t: 8.0, name: "spray_burst", dur: 0.7 },
    { t: 8.2, name: "mint_glow", dur: 1.4 },
    { t: 8.4, name: "jojo_pose", dur: 4.6 },
    { t: 8.5, name: "clock_twelve", dur: 0.5 },
    { t: 8.8, name: "tick", dur: 0.2, n: 5 },

    // ===== SHOT 7 (9.54-13.0): POSTER TEAR to the island; the JoJo pose =====
    { t: 9.3, name: "tear", dur: 0.84, edge: "#f4f4f0", ragged: true, diag: -0.55 },
    { t: 9.54, name: "island", dur: 7.86 },
    { t: 9.54, name: "thud", dur: 0.3 },
    { t: 10.6, name: "gogogo_fade", dur: 2.4 },

    // ===== SHOT 8 (13.0-17.4): credit; the world resumes; the short wipe home =====
    { t: 13.0, name: "credit_card", dur: 3.6 },
    { t: 13.0, name: "soft_tick", dur: 0.3 },
    { t: 16.6, name: "wipe", dur: 0.4 },
  ],

  // ---- BUBBLES: lower half, one at a time. DIO is the SEAL, so it speaks line A; Jotaro is silent. ----
  bubbles: [
    { t: T(3.0, 5.9), text: "Oh? You're approaching me?", who: "seal", side: "r", tone: "say", y: 0.68 },
    { t: T(8.2, 12.6), text: "Four edges. Three remain. +362/-26 across 4 files.", who: "seal", side: "l", tone: "say", y: 0.7 },
  ],

  // the 15-line character-voiced pool (DIO, about the PR); drawn only where a bubble asks pool:"lines"
  lines: [
    "Oh? You're approaching me? Instead of running, you approach?",
    "This is the edge you thought you needed. It was already implied.",
    "The fourth edge was never necessary. I merely noticed.",
    "Time has stopped, and so has the redundancy.",
    "Three edges. The unique transitive reduction. Nothing more.",
    "Is that a regression? No. It is the absence of one.",
    "I reduced it, so that you would not have to.",
    "A control edge that is already implied is a wasted edge.",
    "MUDA. Useless. Useless. Useless.",
    "I have surpassed the graph. Nothing implied remains.",
    "You thought four was the safe number. Three was always enough.",
    "Stopped for one second. That is all a reduction takes.",
    "The tests passed before I stopped time. They pass now.",
    "Behold the transitive reduction, with no loss of order.",
    "Four files. 362 added, 26 removed. Time resumes.",
  ],

  // ---- SFX lettering (fractions of the frame, v=0 top; the overlay places it off the seal) ----
  sfx: [
    { t: T(0.1, 1.4), text: "ゴゴゴゴ", at: [0.22, 0.28], size: 0.11, rot: -8, col: "#ffe14a", ink: "#05020a" },
    { t: T(1.6, 2.95), text: "ゴゴゴゴ", at: [0.78, 0.3], size: 0.12, rot: 7, col: "#ffe14a", ink: "#05020a" },
    { t: T(3.0, 3.5), text: "ドン", at: [0.2, 0.3], size: 0.13, rot: -10, col: "#ffe14a", ink: "#05020a" },
    { t: T(5.0, 5.4), text: "MUDA", at: [0.74, 0.26], size: 0.16, rot: -12, col: "#ffe14a", ink: "#05020a" },
    { t: T(5.3, 5.7), text: "MUDA", at: [0.3, 0.3], size: 0.18, rot: 9, col: "#ffe14a", ink: "#05020a" },
    { t: T(5.6, 6.0), text: "MUDA MUDA", at: [0.62, 0.22], size: 0.2, rot: -6, col: "#ffe14a", ink: "#05020a" },
    { t: T(6.25, 7.0), text: "ザ・ワールド", at: [0.5, 0.2], size: 0.1, rot: 0, col: "#fffffe", ink: "#05020a" },
    { t: T(6.4, 6.6), text: "TICK", at: [0.82, 0.4], size: 0.07, rot: 8, col: "#fffffe", ink: "#05020a" },
    { t: T(6.6, 6.8), text: "TOCK", at: [0.18, 0.4], size: 0.07, rot: -8, col: "#fffffe", ink: "#05020a" },
    { t: T(6.8, 7.0), text: "TICK", at: [0.8, 0.45], size: 0.07, rot: 8, col: "#fffffe", ink: "#05020a" },
    { t: T(6.95, 7.4), text: "TOCK", at: [0.2, 0.46], size: 0.08, rot: -8, col: "#fffffe", ink: "#05020a" },
    { t: T(8.0, 8.5), text: "ザバーン", at: [0.7, 0.35], size: 0.12, rot: -8, col: "#ffe14a", ink: "#05020a" },
    { t: T(8.8, 9.1), text: "TICK", at: [0.8, 0.3], size: 0.07, rot: 6, col: "#ffe14a", ink: "#05020a" },
    { t: T(9.7, 11.4), text: "ゴゴゴゴ", at: [0.2, 0.3], size: 0.1, rot: -6, col: "#ffe14a", ink: "#05020a" },
    { t: T(13.0, 13.4), text: "tick", at: [0.8, 0.3], size: 0.05, rot: 5, col: "#f4f4f0", ink: "#05020a" },
  ],

  credit: { t: T(13.0, 16.6), text: "tensorflow/tensorflow #124410 · 4 edges to 3 / Four control edges emitted where the unique transitive reduction is three." },
};
