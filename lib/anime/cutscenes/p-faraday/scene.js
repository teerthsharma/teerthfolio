// SCENE DATA for p-faraday (A Certain Scientific Railgun). DIRECTION layer. Data only (one array generator for the 18 ticks).
// SINGLE SOURCE OF TRUTH for timing and cue names. World, cast and fx read these through `cue` and `ctx.scene`.
// Bible: scripts/p-faraday.md (24 fps card, 499 frames, 20.8 s). Frame f -> seconds = f / 24.
//
// STAGE LAYOUT (world metres, read as ctx.scene.layout)
//   The seal sits at the origin on the glass deck and faces +x (yaw = pi/2: group.rotation.y maps local +z to world +x,
//   local +x (the seal's right) to world -z). The beam travels along +x at y 0.75. The platform is centred x 2.5.
//   Bushings B1/B2 stand either side of the beam line at z = -2.1 / +2.1 (x 3.2), 4.4 m tall; the fields live between them.
//   Touma-seal walks in along +x: x 7.0 -> 2.6 (plants at 5.2 s, f125). Kuroko-seal perches on a 4.2 m lamp at [5.5, 0, -3.2].
//   10 colony seals on the walkway z = -4.6, x -13 .. +4 (spacing 1.9). River beyond z = -9. Moon upper left.
//
// CUE TABLE (every name below appears in `beats`; layers read cue.on / cue.k / cue.fired / cue.since)
//   WORLD  moonHalo, monorail (whole run), lamps, lampsSteady, amber, riverGlow, char, shimmer, afterglow, bloom (sky swell), scorch
//   CAST   sign, vest, enter, touma_plant, touma_hand, touma_shove, touma_flip, touma_dazed, touma_bow, kuroko_perch, kuroko_snap,
//          kuroko_fall, colony_flinch, colony_scatter, colony_hop, coinToss, coinHeld, smear, lineA/lineB/lineC (expression cues)
//   FX     bloom, fieldStart, fieldLock, tick (x18, arg i), amber, streak, shot, beamHead, beamGrow, beamHold, beamThin, sonic,
//          imagine, hitstop, flash, fieldsCircle, proof, tickFlash, rimGold, afterglow, scorch, coinHeld
//   Reserved (the player applies them): impact, speedlines, shock, trauma, pose.
const TICKS = Array.from({ length: 18 }, (_, i) => +(4.0 + (i * 2.4) / 17).toFixed(3)); // 18 pops 4.0 .. 6.4, the last lands at the coin

// Consolidate: cue names the layers read, at the bible times (agreement with the layers' fallbacks).
const LAYER_CUES = [
  { t: 6.4, name: "coin" },
  { t: 16.7, name: "credit" },
  { t: 1.15, name: "zap" },
  { t: 1.2, name: "fieldsStart", dur: 2.8 },
  { t: 4, name: "tickLock" },
  { t: 14.4, name: "face" },
  { t: 20, name: "wipe" },
];

export default {
  id: "p-faraday",
  title: "A Certain Scientific Railgun",
  anime: "A Certain Scientific Railgun",
  style: "modern-anime",
  // J.C.Staff Railgun: clean digital cel, saturated, cool shadows, warm highlights, bloom thresholded to beam / moon / lamps.
  look: {
    lines: { px: 2.5, dist: 1, ink: "#1a1f3a", inkMix: 1, set: 0.75, setCol: "#0a2a5c", setMix: 1, charLines: 1 },
    fill: { t: 0.5, soft: 0, sat: 1.1, rim: 0.7, lumaMax: 0.92 },
    post: { bloom: 0.5, diffuse: 0.1, shafts: 0, sat: 1.1, split: [-0.03, -0.01, 0.06], grain: 0.03, vig: 0.25, ca: 0 },
    timing: { fps: 12, squash: 0 },
  },
  fps: 12,
  duration: 20.8,
  seed: 24,
  far: 420,
  bg: "#0a1a66",
  palette: {
    skyZenith: "#0a1a66", skyMid: "#4a2bc8", skyHorizon: "#ff5a9d", glow: "#ff8ab5",
    sky: "#0a1a66", ground: "#1d2658", key: "#cfe0ff", ink: "#1a1f3a",
    cyan: "#5fd8ff", cyanCore: "#e8fbff", cyanOuter: "#28d7ff", lilac: "#b58cff", lilacCore: "#efe4ff",
    amber: "#ffa927", amberPool: "#ffb347", gold: "#ffd23a", coin: "#ffc34a", coinEdge: "#ff9b1a", coinStamp: "#7a3a00",
    beamCore: "#fff4cf", beamBody: "#ffb347", beamEdge: "#ff7a1a", beamOutline: "#e8470a", white: "#fff6d6",
    vest: "#f1e2c0", vestShadow: "#b9a0a8", vestDeep: "#7a5f7e", crest: "#c8342a", rimLeft: "#ff9ac4",
    steel: "#8fb2e0", steelMid: "#3d68a8", steelShadow: "#1c356b", steelDeep: "#0f2d5e",
    river: "#062a4a", riverBand: "#0a5a7a", riverTeal: "#10c9b0", mist: "#6a5ad8",
    window: "#ffe9a8", moon: "#fff0c8", halo: "#7fe4ff", char: "#14080a",
    accent: "#ffa927",
  },
  layout: {
    deck: { centre: [2.5, 0, 0], size: [11.6, 0.16, 3.9] },
    bushings: [[3.2, 0, -2.1], [3.2, 0, 2.1]], bushingH: 4.4,
    touma: { from: [7.0, 0, 0], plant: [2.6, 0, 0], shove: 0.8 },
    kuroko: { lamp: [5.5, 0, -3.2], lampH: 4.2 },
    colony: { z: -4.6, x0: -13, step: 1.9, n: 10 },
    beam: { y: 0.75, speed: 55, maxLen: 46, coreR: 0.18, bodyR: 0.38, glowR: 0.62, from: [0.4, 0.75, 0] },
    moon: [-0.62, 0.52, -0.58],
  },
  seal: {
    at: [0, 0, 0], yaw: Math.PI / 2, scale: 1, moves: [],
    // f11-25 sign; sits up facing +x; coin f154; recoil crouch 0.7 x 12 frames; relaxed f221; flipper up f288; coin held f401
    track: [
      { t: 0.45, pose: "sign", dur: 0.25, hold: 0.6 },
      { t: 1.05, pose: "sit", dur: 0.5, hold: 5.1, k: 1 },
      { t: 6.0, pose: "point", dur: 0.4, hold: 0.8 },
      { t: 6.8, pose: "crouch", dur: 0.08, hold: 0.5, out: 0.2, k: 0.7 },
      { t: 9.2, pose: "idle", dur: 0.5, hold: 2.8 },
      { t: 12.0, pose: "raise", dur: 0.4, hold: 2.4 },
      { t: 14.4, pose: "idle", dur: 0.5, hold: 2.3 },
      { t: 16.7, pose: "raise", dur: 0.4, hold: 3.3 },
    ],
  },
  // CAMERA LAW per shot (wide -> arc -> kill -> home), every shot <= 5 s. `bible` = the bible's shot number; `colors` = its colour script.
  // Seal axes: x right (world -z), y up, z forward (world +x). az + = the seal's left (world +z).
  shots: [
    { n: 1, bible: 1, t: [0, 1.2], law: "wide", az: 0.7, r: [3.2, 14], elev: [0.8, 8], fov: [28, 44], look: [[0, 0.2, 0], [0, 1.0, 0]], ease: "smooth",
      colors: ["#0a1a66", "#4a2bc8", "#ff5a9d", "#ffd23a", "#f1e2c0"] },
    // profile two-shot, 90 degrees to the beam, 0.5 m drift; Touma enters ahead
    { n: 2, bible: 2, t: [1.2, 3.4], law: "arc", az: [1.2, 1.4], r: [5.2, 4.6], elev: [0.7, 0.9], fov: [50, 46], look: [0, 0.2, 1.5], ease: "smooth",
      colors: ["#0a1a66", "#28d7ff", "#b58cff", "#0f2d5e", "#ffe9a8"] },
    // insert on bushing B1 (the seal's right, world z -2.1): ticks lock, arcs tighten
    { n: 3, bible: 3, t: [3.4, 5.0], law: "arc", az: [-1.15, -1.05], r: [3.8, 3.4], elev: [0.9, 1.0], fov: [34, 31], look: [1.5, 1.4, 2.4], ease: "smooth",
      colors: ["#0f2d5e", "#5fd8ff", "#b58cff", "#ffffff", "#ffd23a"] },
    // MS Touma planted: low, Touma centre third, the seal at the left edge, amber rising
    { n: 4, bible: 4, t: [5.0, 6.4], law: "arc", az: [0.95, 0.85], r: [4.0, 3.6], elev: [0.25, 0.3], fov: 38, look: [0, 0.4, 1.7], ease: "smooth",
      colors: ["#0a1a66", "#ffa927", "#4a2bc8", "#3a4a7a", "#f1e2c0"] },
    // CU flipper and coin: low hard push, kill-angle prep (the seal's right flipper)
    { n: 5, bible: 5, t: [6.4, 6.8], law: "arc", az: [-0.55, -0.5], r: [1.6, 0.85], elev: [0.05, 0.12], fov: 24, look: [0.25, 0.28, 0.2], ease: "in", minFrac: 0.3,
      colors: ["#14183a", "#ffa927", "#ffd23a", "#fff8e0", "#7a3a00"] },
    // KILL ANGLE: low profile from the seal's left, beam crosses left to right, snap in, dutch 0 -> 4
    { n: 6, bible: 6, t: [6.8, 9.2], law: "kill", az: [1.35, 1.2], r: [2.5, 1.9], elev: [0.35, 0.3], fov: [28, 26], look: [0, 0.1, 0.9], dutch: [0, 4], ease: "snap",
      colors: ["#ffd23a", "#ffa927", "#e8470a", "#0f2d5e", "#fff6d6"] },
    // WS aftermath, wide arc round the pup, seal whole
    { n: 7, bible: 7, t: [9.2, 12.0], law: "wide", az: [1.9, 0.5], r: [6.5, 8], elev: [2.6, 2.0], fov: 42, look: [0, 0.3, 0.8], ease: "smooth",
      colors: ["#0a1a66", "#ffb347", "#10c9b0", "#b58cff", "#4a2bc8"] },
    // MS the proof: orbit in at ~12 deg/s, locked fields circle behind
    { n: 8, bible: 8, t: [12.0, 14.4], law: "arc", az: [0.95, 0.45], r: [4.6, 3.3], elev: [1.4, 1.0], fov: [36, 32], look: [0, 0.25, 0], ease: "smooth",
      colors: ["#0a1a66", "#28d7ff", "#b58cff", "#ffa927", "#f1e2c0"] },
    // CU face against the gold afterglow, static with a 5 percent push
    { n: 9, bible: 9, t: [14.4, 16.7], law: "kill", az: [-0.28, -0.3], r: [1.5, 1.42], elev: 0.28, fov: 24, look: [0, 0.3, 0], dutch: 0, ease: "linear", minFrac: 0.34,
      colors: ["#4a2bc8", "#ffd23a", "#ffb347", "#f3f6ff", "#0f2d5e"] },
    // credit MS: slow push, pup centred and upright, coin held up
    { n: 10, bible: 10, t: [16.7, 20.0], law: "arc", az: [0.06, 0.02], r: [3.6, 2.9], elev: [0.5, 0.45], fov: 30, look: [0, 0.2, 0], ease: "smooth", minFrac: 0.2,
      colors: ["#0a1a66", "#ffa927", "#ffe9a8", "#f1e2c0", "#4a2bc8"] },
    // return wipe: the chase pose behind and above the seal, in open ground
    { n: 11, bible: 11, t: [20.0, 20.8], law: "home",
      colors: ["#14080a", "#ffb347", "#ffd23a", "#4a2bc8", "#cfe6f4"] },
  ],
  beats: [
    ...LAYER_CUES,
    // ---- S1: ZAP bloom out of the pup ----
    { t: 0.45, name: "sign", dur: 0.6 },                          // finger-gun sign f11-25
    { t: 0.54, name: "vest", dur: 0.55 },                         // cream vest pops f13-26
    { t: 1.15, name: "impact", seq: [[1, 2], [2, 1]] },           // f28 impact flash
    { t: 1.15, name: "speedlines", dur: 0.45, kind: "radial", at: [0.5, 0.5], strength: 0.8, col: "#ffd23a" }, // radial ink burst
    { t: 1.15, name: "shock", dur: 0.45, at: [0.5, 0.5], amp: 0.5, r1: 0.9 },
    { t: 1.15, name: "bloom", dur: 0.45 },                        // stage bloom f28-38 (the sky plate swells out of the pup)
    { t: 1.15, name: "trauma", amount: 0.3 },
    // ---- S2: fields start wrong, Touma enters, lamps flicker ----
    { t: 1.2, name: "fieldStart", dur: 3.3 },                     // wrong-start amplitude 1.0, x0.62 per state (1/3 s), locked by state 10 at 4.5 s
    { t: 1.7, name: "enter", dur: 3.5 },                          // Touma-seal walks 7.0 -> 2.6, plants f125 (5.2 s)
    { t: 1.8, name: "lineA" },
    { t: 1.8, name: "moonHalo", dur: 2 },
    { t: 1.9, name: "lamps", dur: 3.4 },                          // flicker on twos f46-127 (1.9-5.3 s)
    { t: 1.9, name: "kuroko_perch", dur: 4.9 },                   // perched on the lamp f46-163
    { t: 0, name: "monorail", dur: 20.8 },
    // ---- S3: ticks lock ----
    { t: 4.5, name: "fieldLock" },
    ...TICKS.map((t, i) => ({ t, name: "tick", dur: 0.5, i })),   // 18 right-angle pops; cue.fired carries each, arg i
    { t: 5.3, name: "lampsSteady" },
    // ---- S4: amber rise (f116-163, retimed to 4.85 s) ----
    { t: 4.85, name: "amber", dur: 1.95 },
    { t: 5.2, name: "touma_plant", dur: 0.3 },                    // wide stance f125
    { t: 6.25, name: "touma_hand", dur: 0.3 },                    // flipper flat and out f150
    // ---- S5: coin ----
    { t: 6.4, name: "coinToss", dur: 0.4 },                       // toss f154-163, 7 half-turns on twos
    { t: 6.4, name: "streak", dur: 0.68 },                        // orange streak f154-170, 1.2 m along +x for 6 frames
    { t: 6.4, name: "speedlines", dur: 0.4, kind: "radial", at: [0.5, 0.55], strength: 0.9, col: "#ffa927" }, // converge on the coin
    { t: 6.76, name: "smear", dur: 0.04 },                        // one smear frame on the flick
    // ---- S6: kill angle ----
    { t: 6.8, name: "shot" },                                     // the SHOT
    { t: 6.8, name: "lineB" },
    { t: 6.8, name: "hitstop", dur: 0.17 },                       // 4 frames hold f163-167: layers freeze their own motion
    { t: 6.8, name: "sonic", dur: 0.42 },                         // ring 0.6 -> 4 m over 10 frames on twos, 170 bits trail 1.2 s
    { t: 6.8, name: "shock", dur: 0.42, at: [0.4, 0.55], amp: 0.7, r1: 1.0 },
    { t: 6.8, name: "beamHead", dur: 0.9 },                       // head at 55 m/s, up to 46 m
    { t: 6.97, name: "beamGrow", dur: 0.17 },                     // full radius in 4 frames
    { t: 7.1, name: "beamHold", dur: 1.23 },                      // holds to f200 (8.33 s)
    { t: 8.33, name: "beamThin", dur: 0.87 },                     // thins to 0 by f221 (9.2 s)
    { t: 6.97, name: "impact", seq: [[1, 2], [2, 2]] },           // f167-169: #ffd23a on #1a0a00, then #fff on #e8470a
    { t: 6.97, name: "trauma", amount: 0.5 },                     // 0.2 m shake on twos decaying 10 frames
    { t: 6.9, name: "imagine", dur: 0.3 },                        // Imagine Breaker: the beam's first metre cancels at the hand, 6.9-7.2
    { t: 6.8, name: "flash", dur: 0.3 },                          // 0.22 quad f163-170
    { t: 6.8, name: "touma_shove", dur: 1.1 },                    // 0.8 m by f190
    { t: 6.93, name: "touma_flip", dur: 0.4 },                    // 540 degrees f166-175
    { t: 6.8, name: "kuroko_snap", dur: 0.3 },                    // tails snap f163
    { t: 7.08, name: "kuroko_fall", dur: 1.25 },                  // tumbles into the mist by f200
    { t: 6.8, name: "colony_flinch", dur: 0.3 },
    { t: 7.1, name: "colony_scatter", dur: 0.5 },
    { t: 6.9, name: "char", dur: 2.3 },                           // deck chars with a gold rim
    { t: 6.8, name: "riverGlow", dur: 5.2 },                      // gold reflection streak on the river from the shot
    // ---- S7: aftermath ----
    { t: 9.2, name: "afterglow", dur: 2.8 },
    { t: 9.2, name: "shimmer", dur: 2.8 },                        // heat shimmer f221-288
    { t: 9.2, name: "touma_dazed", dur: 1.25 },                   // sits up dazed f221-250
    { t: 9.2, name: "fieldsCircle", dur: 5.2 },                   // locked fields turn round the pup
    { t: 12.1, name: "colony_hop", dur: 2.1 },                    // hop on twos f290-340
    // ---- S8: the proof ----
    { t: 12.0, name: "proof", dur: 2.4 },
    { t: 12.0, name: "lineC" },
    { t: 12.0, name: "tickFlash", dur: 0.35 },
    { t: 12.4, name: "touma_bow", dur: 0.8 },                     // Touma-seal lowers his head
    // ---- S9: gold rim on the face ----
    { t: 14.4, name: "rimGold", dur: 2.3 },
    // ---- S10: credit, coin held up ----
    { t: 16.7, name: "coinHeld", dur: 3.3 },
    // ---- S11: scorch wipe home ----
    { t: 20.0, name: "scorch", dur: 0.8 },
  ],
  // lower half, one at a time (never overlapping); the overlay slides them off the seal
  bubbles: [
    { t: [1.8, 4.6], text: "Electric and magnetic? You're just assuming they couple.", who: "foe", side: "r", tone: "say" },        // lineA f43
    { t: [6.8, 8.6], text: "Not assumed. Found.", who: "seal", side: "l", tone: "shout" },                                            // lineB f163
    { t: [9.4, 11.8], pool: "lines", who: "seal", side: "c", tone: "say" },                                                           // L12: a random line from the 15-line pool
    { t: [12.0, 16.4], text: "The field coupling, found rather than assumed. Computational Faraday tensor, topology-fixed-point projection.", who: "seal", side: "c", tone: "say" }, // lineC f288
  ],
  // L12: epic sincerity, character-voiced (Misaka's pride, Touma's stubborn faith), no seal-humour
  lines: [
    "I don't borrow a result. I fire it.",
    "Every arc meets every ring at a right angle. That is not luck.",
    "Stand where you like. The field already knows where it lands.",
    "Doubt is fair. So I measured it.",
    "A coin, a field, and one fixed point.",
    "If it only works when you assume it, it doesn't work.",
    "Two fields, one answer. I waited until they agreed.",
    "That wasn't force. That was coupling, found.",
    "You held your hand out. I respect that.",
    "Close enough is a guess. This was exact.",
    "The proof was never loud. The shot was just how it sounded.",
    "Every state tighter than the last, until nothing moved.",
    "Believe the number you can reproduce.",
    "I didn't choose the target. I found the fixed point.",
    "Settle first. Then fire.",
  ],
  // SFX lettering, 6-9 percent of frame height, 3 px outline (ink), placed off the seal; pop 3 frames, hold, fade
  sfx: [
    { t: [1.15, 1.9], text: "ZAP", at: [0.5, 0.3], size: 0.09, rot: -8, col: "#ffd23a", ink: "#1a1f3a" },
    { t: [2.0, 2.8], text: "bzzzt", at: [0.7, 0.72], size: 0.06, rot: 6, col: "#5fd8ff", ink: "#1a1f3a" },
    { t: [4.2, 5.0], text: "tik tik tik", at: [0.3, 0.3], size: 0.06, rot: -4, col: "#ffffff", ink: "#1a1f3a" },
    { t: [5.1, 6.1], text: "hmmmm", at: [0.72, 0.3], size: 0.06, rot: 3, col: "#ffa927", ink: "#1a1f3a" },
    { t: [6.4, 6.8], text: "ting", at: [0.25, 0.32], size: 0.06, rot: -6, col: "#ffd23a", ink: "#1a1f3a" },
    { t: [6.7, 7.0], text: "CHK", at: [0.7, 0.3], size: 0.07, rot: 5, col: "#fff6d6", ink: "#1a1f3a" },
    { t: [6.95, 7.9], text: "ZZZAAAAP", at: [0.5, 0.25], size: 0.09, rot: -3, col: "#ffa927", ink: "#1a1f3a" },
    { t: [7.1, 8.0], text: "KA-DOOM", at: [0.72, 0.4], size: 0.09, rot: 4, col: "#fff6d6", ink: "#1a1f3a" },
    { t: [7.3, 8.0], text: "Onee-sama!", at: [0.82, 0.18], size: 0.05, rot: 8, col: "#f2a45a", ink: "#3a2a1a" }, // Kuroko's tag, no bubble
    { t: [9.3, 10.4], text: "fshhh", at: [0.3, 0.3], size: 0.06, rot: -5, col: "#ffb347", ink: "#1a1f3a" },
    { t: [12.1, 13.0], text: "hmmmm", at: [0.75, 0.3], size: 0.06, rot: 4, col: "#b58cff", ink: "#1a1f3a" },
    { t: [16.8, 17.5], text: "ting", at: [0.7, 0.3], size: 0.06, rot: -6, col: "#ffd23a", ink: "#1a1f3a" },
    { t: [20.0, 20.8], text: "fwoosh", at: [0.5, 0.3], size: 0.08, rot: 0, col: "#ffb347", ink: "#14080a" },
  ],
  credit: { t: [16.7, 20.0], text: "teerthsharma/faraday: computational Faraday tensor, topology-fixed-point projection. Coupling, not assumption." },
};
