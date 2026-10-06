// SCENE DATA for pr-xnnpack-10801: Kyoka Suigetsu and the throne of Las Noches (Bleach / TYBW, Aizen). PROTECTED LOOK.
// Written by the DIRECTION agent. Pure data: no imports, no code. This file is the SINGLE SOURCE OF TRUTH for the
// timeline: every cue name below is read by world/, cast/ and fx/ with cue.on(name) / cue.k(name) / cue.since(name).
// Bible: scripts/pr-xnnpack-10801.md (shots in frames @24 fps converted to seconds: f / 24).
//
// THE REALMS (build.js also derives them into cue.realm / cue.dim / ctx.stage):
//   0.00 - 3.00   ISLAND     the real pocket: snow, the seal signs, the black wipe grows from the pup (cue "wipe")
//   3.00 - 9.55   DIMENSION  Las Noches: black sky, crescent, white dunes in contour lines, dome-and-towers, the throne
//   9.55 - 10.80  RETURN     Kyoka Suigetsu snaps, the picture falls as glass, the island shows through; the seal drops
//   10.80 - 15.20 ISLAND     snow, the credit behind and above
//
// STAGE (metres, world space; the hero seal faces +z; x right of the seal). The throne is at the origin, its seat top at
// stage.throneTop. The seal's y rides up with the throne (seal.moves below, smoothstep eased: the throne must use the
// same smoothstep over cue.k("throne_rise")) and drops with the break.
//   throne      white stone dais + seat, steps 7 m wide, seat top y = throneTop, back 3.2 m taller than the seat
//   aizen       the standing costumed seal (the illusion's voice), BEHIND and to the side so no lens line crosses the hero
//   ichigo, gin, urahara   the three named victims on the dais foot, in FRONT (+z) of the throne, below eye level
//   extras      six cheering Soul Reaper seals, popped in pairs at the foot
// Cast agents place victims only at stage.* (never between lens and seal at throne height).
//
// CUE REGISTRY (name, t, dur, who reads it). dur = how long cue.k(name) runs 0..1.
//   ISLAND / SWITCH
//     wipe          1.20  1.80  fx+world   black wipe growing from the pup (island goes to ink)
//     swell         2.00  1.00  fx         low reverse swell (a pulse in the wipe's edge)
//     impact        3.00        player     one inverted frame (white sky, black sand) = the dimension lands
//     shock         3.00  0.50  player     warp ring from the pup
//     trauma        3.00        player     shake
//     dimension     3.00  7.60  world+fx   Las Noches is on (3.0 - 10.6); everything dimension-bound reads this
//     contour       3.00  1.40  world      dunes drawn in as contour lines, far to near
//     moon          3.00  0.80  world      the crescent
//     palace        3.30  1.00  world      dome-and-towers appear on the horizon
//     throne_rise   3.00  1.50  world+cast the throne climbs out of the sand carrying the seal (36 frames @24)
//     motes         3.20  7.40  fx         sand motes drift on twos
//     aizen_raise   3.00  0.80  cast       Aizen-seal raises a hand for line A
//   BEAT B (the glass)
//     eyeholes      3.90  0.70  fx         the ten white ovals from the TYBW opening as moon holes in a hairline of the glass (egg)
//     cheer         3.90  5.60  cast       extras cheer on twos (colony_pop first)
//     colony_pop    3.20  1.20  cast       extras pop in, a pair at a time
//     ichigo_lean   3.90  0.90  cast       lean back
//     ichigo_swing  4.85  0.33  cast       swing (8 frames @24)
//     slash         4.95  0.13  fx         the thin cold arc, 3 frames on ones (arg n:1)
//     slash         5.30  0.13  fx         second arc (arg n:2)
//     ichigo_recoil 5.18  0.25  cast       recoil (6 frames)
//     crack1        5.42  1.00  fx+world   first crack: radial, ones for 2 frames then twos; holes to the real island
//     cold_flash    5.42  0.08  fx         1-2 frames, #aab1bf tinted, never white
//     hat_hole      5.40  0.50  fx         Urahara's hat-and-clogs silhouette in a hole (egg)
//     holes         5.50  0.60  fx+world   holes open
//     mend          5.75  1.00  fx+world   the glass re-forms over 24 frames
//     ichigo_stunned 5.50 3.90  cast       stands stunned
//   BEAT C (the gap)
//     hogyoku       6.40  0.083 fx         one violet-blue dot at the throne's top, 1 frame (egg)
//     forelock      6.40  8.80  cast       the black lock on the seal's brow (egg)
//     gap           6.42  2.90  fx+world   cold blue lights along the dais foot
//     swell2        8.40  1.10  fx         reverse swell
//     gap_named     8.40  0.60  fx+world   the gap is named: the dais foot burns cold blue, width exactly 32 MiB = 144 - 112 (egg)
//   THE BREAK
//     crack2        8.96  1.96  fx+world   second crack runs out from the blade
//     gin_step      8.96  0.50  cast       Gin steps back 1 m, the smile holds
//     cold_flash    9.55  0.10  fx         flash
//     blade_snap    9.58  0.60  cast+fx    Kyoka Suigetsu tip snaps and tumbles (14 frames)
//     shing         9.58  0.40  fx         ink lettering on the crack (also sfx[] below)
//     urahara_tip   9.67  0.40  cast       tips the hat
//     extras_gasp   9.55  0.25  cast       gasp (6 frames)
//     extras_tumble 9.80  0.45  cast       tumble (10 frames)
//     choir         9.60  2.00  fx         the choir swell (light)
//     shards_fall   9.60  1.60  fx+world   the whole picture falls as glass
//     shard10801    9.60  1.00  fx         a shard shows the number 10801 (egg)
//     throne_drop   9.55  1.00  world+cast the throne drops with the seal
//     island        9.60  1.20  world+fx   the real island shows through the falling glass
//   CREDIT
//     credit        13.20 2.00  all        quiet: no new motion, the credit plays in the pocket overlay
//
// Derived by build.js each frame onto cue: cue.realm ("island"|"dimension"|"return"), cue.dim (0..1, dimension strength),
// cue.sealY (the seal's world y), and ctx.stage = { ...stage, sealY(t), realm(t), dim(t) } at build time.

const THRONE_TOP = 3.2; // m, seat top; the seal sits here

// Consolidate: cue names the layers read, at the bible times (agreement with the layers' fallbacks).
const LAYER_CUES = [
  { t: 3.9, name: "eyes" },
  { t: 5.42, name: "crack" },
  { t: 5.52, name: "hat" },
  { t: 9.58, name: "snap" },
  { t: 9.7, name: "break" },
  { t: 6.4, name: "line" },
  { t: 8.96, name: "gin" },
  { t: 2, name: "swell1" },
  { t: 5.42, name: "flash1" },
  { t: 8.96, name: "flash2" },
  { t: 9.55, name: "flash3" },
  { t: 9.6, name: "number" },
];

export default {
  id: "pr-xnnpack-10801",
  title: "Kyoka Suigetsu and the throne of Las Noches",
  anime: "Bleach: Thousand-Year Blood War (Studio Pierrot), Aizen's throne in Las Noches",
  // PROTECTED LOOK (Aizen, L7). The base is the engine's modern-anime ink; `look` makes it stark: razor ink #080a0f, hard
  // two-band cel, no lift of blacks, no haze (the far field stays black), a hair of aberration, grain .02, vignette .2.
  // The pup is excluded from bloom by the shared lumaMax .92; bloom here is low and its threshold sits above the lit band.
  style: "modern-anime",
  look: {
    fill: { soft: 0, bias: 1, lumaMax: 0.92, sat: 1, rim: 0.55, ring: 0.8 },
    lines: { px: 1.6, dist: 1, ink: "#080a0f", inkMix: 1, set: 0.95, setW: 1, setMix: 1, setCol: "#080a0f", setDepth: 1, charLines: 0 },
    post: { bloom: 0.3, diffuse: 0.04, shafts: 0, sat: 1, gain: [1, 1, 1], gamma: [1, 1, 1], split: [0, 0, 0.02], grain: 0.02, vig: 0.2, ca: 0.35, hazeAmt: 0, bgSat: 1 },
  },
  fps: 12, // characters on twos; glass crack, slash arc on ones are the FX layer's own business (ones for 2 / 3 frames)
  duration: 15.2,
  seed: 10801,
  far: 1500,
  plates: true,
  bg: "#080a0f", // build.js swaps this to the island pale in the island realms; never the island fog
  palette: {
    // the dimension: two tones and ONE accent
    sky: "#080a0f", ink: "#080a0f", paper: "#f4f4f0", moon: "#f4f4f0", halo: "#d8ecff",
    shadow: "#aab1bf", sandShadow: "#c8ccd6", farDune: "#d8d8e0", palaceShadow: "#b0b4c0", fold: "#6a6a72",
    blue: "#3d7fc4", blueHi: "#5fb6ff", bluePale: "#d8ecff", red: "#b3202a", // red: hand-cut accents only (TYBW eye smudges)
    // seal costumes (cast)
    ichigoCloth: "#080a0f", ichigoHair: "#f08a2a", zangetsu: "#0e0b0d", bandage: "#c8c0b0",
    ginHair: "#d8d8e0", ginHaori: "#f4f4f0", uraharaHat: "#3a8a5a", uraharaKimono: "#3a6a4a", uraharaHair: "#e8d890",
    // the island the glass falls onto
    snow: "#f4f4f0", snowShadow: "#aab1bf", islandSky: "#9fb4cf",
    // legacy keys so a generic layer still gets sane colours
    ground: "#f4f4f0", key: "#f4f4f0", accent: "#3d7fc4",
  },
  stage: {
    throneTop: THRONE_TOP,
    throne: [0, 0, 0],
    stepsWidth: 7,
    seatBackH: 3.2,
    aizen: [1.8, THRONE_TOP, -1.2], // standing, behind and to +x of the hero (out of every lens line)
    ichigo: [-2.6, 0, 5.4],
    gin: [1.9, 0, 6.3],
    urahara: [4.0, 0, 4.4],
    extras: [[-5.2, 0, 4.6], [-4.2, 0, 6.6], [5.0, 0, 6.8], [6.2, 0, 5.2], [-1.0, 0, 7.8], [1.0, 0, 8.4]],
    radius: 40,
    gapWidthMiB: 32, // 144 - 112, the claim drawn (egg)
    moon: { az: 0.55, el: 0.34 }, // upper right of the kill/arc frames
    horizon: 0.38, // fraction of frame height
  },
  // the hero: ONE locked pup. On the island at the origin; it rides the throne up (3.0 - 4.5) and drops with the break (9.55 - 10.5).
  seal: {
    at: [0, 0, 0], yaw: 0, scale: 1,
    moves: [
      { t: [3.0, 4.5], to: [0, THRONE_TOP, 0] },
      { t: [9.55, 10.5], to: [0, 0, 0] },
    ],
    track: [
      { t: 0.4, pose: "sign", dur: 0.5, hold: 1.6, out: 0.4 },       // beat A opening gesture on the island
      { t: 3.0, pose: "sit", dur: 0.5, hold: 3.8, out: 0.5 },        // reclined, chin on flipper (Aizen's throne pose)
      { t: 5.45, pose: "sign", dur: 0.3, hold: 1.1, out: 0.4 },      // flipper across the chest
      { t: 8.2, pose: "raise", dur: 0.4, hold: 1.1, out: 0.3 },      // both flippers up on the truth
      { t: 8.3, pose: "awe", dur: 0.3, hold: 1.2, out: 0.3 },        // eyes open wide
      { t: 9.55, pose: "blown", dur: 0.2, hold: 0.7, out: 0.4 },     // blown low at the break
      { t: 10.4, pose: "crouch", dur: 0.12, hold: 0.08, out: 0.3 },  // lands upright
      { t: 13.5, pose: "fist", dur: 0.3, hold: 1.0, out: 0.3 },      // the flex on the credit
    ],
  },
  // THE CAMERA LAW (L3). Wide -> arc -> kill -> home, a cut at least every 5 s (longest hold here 3.75 s).
  // Shots 4 and 5 are `free` rigs (law allows them anywhere): same spherical rig about the seal's chest, no world keys, so the
  // camera always rides the seal, including down with the drop.
  shots: [
    // 1  frames 0-72   EWS pull back and up, fov 28 -> 42. The island recedes; the wipe grows. Cut at the bloom (the impact).
    { n: 1, t: [0, 3.0], law: "wide", az: [0.55, 0.8], r: [5, 17], elev: [1.0, 9.5], fov: [28, 42], look: [[0, 0.2, 0], [0, 1.0, 0]], minFrac: 0.05, ease: "smooth" },
    // 2  frames 72-130  WIDE read of the switch: black sky, crescent, dome, throne rising. Arcs in. Must read instantly.
    { n: 2, t: [3.0, 5.42], law: "arc", az: [0.95, 0.5], r: [11, 5.6], elev: [2.2, 0.7], fov: [44, 34], look: [[0.4, 1.2, 0], [0, 0.35, 0]], minFrac: 0.085, ease: "smooth" },
    // 3  frames 130-154  KILL ANGLE: low, tipped up at the throne, fov 50 -> 44, dutch 0 -> 6; the glass cracks once
    { n: 3, t: [5.42, 6.42], law: "kill", az: [-0.35, -0.6], r: [3.4, 2.5], elev: [-0.9, -0.7], fov: [50, 44], look: [[0, 0.35, 0], [0, 0.5, 0]], dutch: [0, 6], ease: "snap", minFrac: 0.14 },
    // 4  frames 154-226  medium on the throne, level with the seal, crane back and down as the dais foot lights cold blue
    { n: 4, t: [6.42, 9.42], law: "free", az: [0.32, 0.18], r: [3.6, 6.2], elev: [0.15, 1.6], fov: [30, 36], look: [[0, 0.2, 0], [0, -0.9, 0]], dutch: 0, ease: "smooth", minFrac: 0.1 },
    // 5  frames 226-316  wide, the truth: the blade snaps, the picture falls, the seal drops with the camera riding it down
    { n: 5, t: [9.42, 13.17], law: "free", az: [0.5, 0.95], r: [5, 13], elev: [0.5, 4], fov: [34, 44], look: [[0, 0.2, 0], [0, 0.9, 0]], dutch: 0, ease: "smooth", minFrac: 0.05 },
    // 6  frames 316-365  credit: the chase pose behind and above, in open snow
    { n: 6, t: [13.17, 15.2], law: "home", az: Math.PI, r: [3.4, 3.9], elev: [2.0, 2.4], fov: [36, 38], look: [0, 0.2, 3.2], minFrac: 0.14 },
  ],
  // colour script per shot (the palette each shot may use; one cold blue accent over two tones)
  colorScript: [
    { shot: 1, dominant: "black", accent: null, palette: ["#080a0f", "#f4f4f0", "#aab1bf", "#3d7fc4", "#d8ecff"] },
    { shot: 2, dominant: "b/w", accent: null, palette: ["#080a0f", "#f4f4f0", "#aab1bf", "#3d7fc4", "#d8ecff"] },
    { shot: 3, dominant: "cold blue accent", accent: "#5fb6ff", palette: ["#5fb6ff", "#d8ecff", "#080a0f", "#f4f4f0", "#3d7fc4"] },
    { shot: 4, dominant: "b/w, blue accent", accent: "#3d7fc4", palette: ["#5fb6ff", "#d8ecff", "#080a0f", "#f4f4f0", "#3d7fc4"] },
    { shot: 5, dominant: "white/black to island", accent: "#3d7fc4", palette: ["#f4f4f0", "#080a0f", "#3d7fc4", "#d8ecff", "#aab1bf"] },
    { shot: 6, dominant: "island snow", accent: "#3d7fc4", palette: ["#f4f4f0", "#aab1bf", "#3d7fc4", "#080a0f", "#d8ecff"] },
  ],
  // beats: reserved names are handled by the player (impact, speedlines, shock, trauma, pose); the rest are the cue registry above
  beats: [
    ...LAYER_CUES,
    // ---- island and the switch ----
    { t: 1.2, name: "wipe", dur: 1.8 },
    { t: 2.0, name: "swell", dur: 1.0 },
    { t: 3.0, name: "impact", seq: [[1, 1]] },                       // one inverted frame: white sky, black sand
    { t: 3.0, name: "shock", dur: 0.5, at: [0.5, 0.55], amp: 0.5, r1: 0.8 },
    { t: 3.0, name: "trauma", amount: 0.45 },
    { t: 3.0, name: "dimension", dur: 7.6 },
    { t: 3.0, name: "contour", dur: 1.4 },
    { t: 3.0, name: "moon", dur: 0.8 },
    { t: 3.3, name: "palace", dur: 1.0 },
    { t: 3.0, name: "throne_rise", dur: 1.5 },
    { t: 3.2, name: "motes", dur: 7.4 },
    { t: 3.0, name: "aizen_raise", dur: 0.8 },
    // ---- beat B: the glass ----
    { t: 3.2, name: "colony_pop", dur: 1.2 },
    { t: 3.9, name: "eyeholes", dur: 0.7 },
    { t: 3.9, name: "cheer", dur: 5.6 },
    { t: 3.9, name: "ichigo_lean", dur: 0.9 },
    { t: 4.85, name: "ichigo_swing", dur: 0.33 },
    { t: 4.95, name: "slash", dur: 0.13, n: 1 },
    { t: 5.18, name: "ichigo_recoil", dur: 0.25 },
    { t: 5.3, name: "slash", dur: 0.13, n: 2 },
    { t: 5.4, name: "hat_hole", dur: 0.5 },
    { t: 5.42, name: "crack1", dur: 1.0 },
    { t: 5.42, name: "cold_flash", dur: 0.08 },
    { t: 5.42, name: "trauma", amount: 0.8 },                       // two drawings of shake
    { t: 5.5, name: "trauma", amount: 0.5 },
    { t: 5.42, name: "speedlines", dur: 0.3, kind: "radial", at: [0.5, 0.45], strength: 0.55, col: "#d8ecff" },
    { t: 5.5, name: "holes", dur: 0.6 },
    { t: 5.5, name: "ichigo_stunned", dur: 3.9 },
    { t: 5.75, name: "mend", dur: 1.0 },
    // ---- beat C: the gap ----
    { t: 6.4, name: "hogyoku", dur: 0.083 },
    { t: 6.4, name: "forelock", dur: 8.8 },
    { t: 6.42, name: "gap", dur: 2.9 },
    { t: 8.4, name: "swell2", dur: 1.1 },
    { t: 8.4, name: "gap_named", dur: 0.6 },
    // ---- the break ----
    { t: 8.96, name: "crack2", dur: 1.96 },
    { t: 8.96, name: "gin_step", dur: 0.5 },
    { t: 9.55, name: "impact", seq: [[2, 1], [1, 1], [2, 1]] },
    { t: 9.55, name: "cold_flash", dur: 0.1 },
    { t: 9.55, name: "trauma", amount: 0.9 },
    { t: 9.55, name: "speedlines", dur: 0.5, kind: "radial", at: [0.5, 0.5], strength: 0.7, col: "#d8ecff" },
    { t: 9.55, name: "shock", dur: 0.6, at: [0.5, 0.5], amp: 0.7, r1: 1.0 },
    { t: 9.55, name: "throne_drop", dur: 1.0 },
    { t: 9.55, name: "extras_gasp", dur: 0.25 },
    { t: 9.58, name: "blade_snap", dur: 0.6 },
    { t: 9.58, name: "shing", dur: 0.4 },
    { t: 9.6, name: "choir", dur: 2.0 },
    { t: 9.6, name: "shards_fall", dur: 1.6 },
    { t: 9.6, name: "shard10801", dur: 1.0 },
    { t: 9.6, name: "island", dur: 1.2 },
    { t: 9.67, name: "urahara_tip", dur: 0.4 },
    { t: 9.8, name: "extras_tumble", dur: 0.45 },
    // ---- credit ----
    { t: 13.2, name: "credit", dur: 2.0 },
  ],
  // L9: one bubble at a time, lower half, off the seal. who "seal" = white bubble, "foe" = black bubble.
  bubbles: [
    { t: [3.15, 5.35], text: "Since when were you under the impression the gap was not there?", who: "seal", side: "l", tone: "say", y: 0.64 },
    { t: [6.45, 9.2], text: "Where did that space even come from?", who: "foe", side: "r", tone: "say", y: 0.64 },
    { t: [9.45, 13.1], text: "It was there all along. 6.42% lower peak. Workspace 144 MiB to 112 MiB.", who: "seal", side: "c", tone: "say", y: 0.66 },
  ],
  // L12: the 15-line character-voiced pool (Aizen's voice on the one claim; numbers exact, from XNNPACK #10801)
  lines: [
    "Since when did you think the gap was not there?",
    "The leading gap was free. It was there all along.",
    "MobileNet V1 peak: 23.862980 down to 22.331730 MiB.",
    "That is 6.42% lower, and not one byte was taken.",
    "Workspace: 144 MiB down to 112 MiB.",
    "Thirty-two MiB, exactly. Never used, never missed.",
    "You looked at the allocation. You never looked at the space.",
    "An illusion is only a plan you were not told about.",
    "Admiration is the furthest thing from understanding.",
    "The buffer was always aligned. You simply stood too close.",
    "Name the gap, and the picture breaks like glass.",
    "A reuse nobody saw is still a reuse.",
    "Peak memory is a promise. I moved it.",
    "The tip of the blade was never the blade.",
    "Free, as in it was there before you asked.",
  ],
  // SFX lettering: ink on paper white, off the seal. SLASH x2, the crack, SHING on the break.
  sfx: [
    { t: [4.9, 5.25], text: "SLASH", at: [0.3, 0.3], size: 64, rot: -12, col: "#f4f4f0", ink: "#080a0f" },
    { t: [5.3, 5.62], text: "SLASH", at: [0.72, 0.34], size: 72, rot: 9, col: "#f4f4f0", ink: "#080a0f" },
    { t: [5.46, 5.9], text: "KRRK", at: [0.5, 0.2], size: 54, rot: -4, col: "#d8ecff", ink: "#080a0f" },
    { t: [9.58, 10.1], text: "SHING", at: [0.7, 0.3], size: 84, rot: 8, col: "#080a0f", ink: "#f4f4f0" },
  ],
  credit: { t: [13.3, 15.1], text: "google/XNNPACK #10801 · 6.42% lower peak" },
};
