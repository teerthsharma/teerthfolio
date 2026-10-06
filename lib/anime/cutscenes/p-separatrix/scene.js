// SCENE DATA for p-separatrix (JoJo, Golden Wind): Giorno's Requiem in the Colosseum. DIRECTION layer.
// Pure data, no imports. Schema: ../CONTRACT.md. Bible: scripts/p-separatrix.md (10 shots, 17.4 s @24).
// THIS FILE IS THE SINGLE SOURCE OF TRUTH for cue names and times. World/cast/fx read them via cue.on/k/since/done.
//
// CUE TABLE (name: window, who listens)
//   gildring  0.0-0.4   fx: opening gold ring wipe; world: plaster paint-in
//   banner    0.2-0.7   fx: cream banner unfurls (overshoot 0.35)
//   sign      0.2-0.7   seal pose; cast: Giorno signs
//   dress     0.5-1.0   cast: Giorno costume dresses in, overshoot 1.16
//   bloom     0.75-1.2 and 6.5-7.3  fx: gold-only bloom
//   enter     1.3-2.3   cast: Diavolo takes his mark
//   parcelDrop 1.7 + 0.3n (n 0..3)  cast/world: a parcel falls from the column (0.45 s), rounding discs appear
//   lineA     3.0       Diavolo bubble 1
//   kcRise    3.0-3.7   cast: King Crimson rises; fx: crimson edge + fringe; world: cosmos starts
//   cosmos    3.7-5.3   world: sky -> black cosmos + magenta stars (4-frame dissolve on threes); stays to the gild wipe
//   erase     3.7-5.3   world/fx: plaster erasure to sinopia, desaturate all but Diavolo + KC, flakes
//   streaks   3.7-5.3   fx: magenta speed streaks (frame 07)
//   witness   3.7 (kind recoil) / 6.45 (awe) / 12.3 (arms)  cast: Polnareff/Mista/Trish reactions
//   jump      4.05-4.55 cast: parcels jump (red sketch start/end smear)
//   coin      4.2-4.8   cast: coin flick, HEADS at once (arg face)
//   arrow     5.15-5.8  cast: gold arrow flies (4-frame streak) toward the slit
//   pierce    5.8-6.05  fx: pierce flash; cast: Diavolo shock; arrow lodged in slit
//   eyes      5.8-5.88  cast: seal eyes snap to arg expr "awe" (green starburst), 2 frames @24
//   move      6.0-6.4   seal turns to face Diavolo (also in seal.moves)
//   gerRise   6.05-6.7  cast: Gold Experience Requiem rises
//   lineB     6.4       seal bubble
//   gildWipe  6.45-7.7  fx/world: gild ring wipe repaints colour (uGild 0..1)
//   don       6.5-7.2   fx: DON! gold lettering pop
//   gerStep   7.4-8.0   cast: GER steps forward
//   kcSink    8.0-8.4   cast: King Crimson sinks
//   gate      8.0-10.3  world: boom gate lifts only for certified parcels
//   rewind    8.0-9.3   cast/fx: parcels rewind (reverse trails)
//   coinRewind 8.2-9.3  cast: coin rewound
//   beacon    9.0-9.5   world/fx: coral beacon flash #ff6a5a at first tear
//   trueRun   9.3-10.3  cast/fx: true run; clear parcels ring (ting), band parcels torn
//   tear      9.3-10.2  cast: refused parcels and coin torn in halves
//   muda      10.35-11.85  cast: GER barrage arms on twos; fx: afterimages, sparks, magenta lines, MUDA arc
//   pulse     10.35 + 0.25n (n 0..6, dur 0.12)  fx: seven pulses; n=6 at 11.85 is the last blow; arg n
//   lastBlow  11.85-12.05  fx: heavy impact; cast: Diavolo hair whip
//   launch    11.85-12.4 cast: Diavolo launched into the saddle
//   poses     12.0-15.0 cast: eight costume seals strike poses
//   slide     12.1-15.4 cast: Diavolo loop slide +-(poolX-1.2), period 2.3 s, open-mouth dismay
//   lineC     12.3      Diavolo bubble 3 (claim)
//   claim     12.3-13.8 cast: witnesses arms up; fx: GOGOGO rising both edges magenta + gold
//   tbc       14.7-15.4 fx: To Be Continued arrow slides in from left, becomes the credit
//   zero      15.2-16.4 world/fx: zero un-paint to #fbf6e8 expanding from the saddle
//   credit    15.4      credit card in the pocket
//   collapse  16.6-17.0 world/fx: collapse + one short wipe; sepia hold on last frame (arg sepia)
// Reserved beats used: impact, speedlines, shock, trauma, pose.
const GOLD = "#f2bd45";
const CRIM = "#ff2a5a";
const MAG = "#ff2adf";

// Consolidate: cue names the layers read, at the bible times (agreement with the layers' fallbacks).
const LAYER_CUES = [
  { t: 6.45, name: "gild" },
  { t: 17, name: "wipe" },
];

export default {
  id: "p-separatrix",
  title: "JoJo, Golden Wind",
  anime: "JoJo, Golden Wind",
  style: "modern-anime",
  // Part 5 cel in the Fresco and Gold Leaf dimension: thick ink, 3-tone hard shadow with violet shift,
  // vignette 0.25, grain 0.04, never milky (seal lit luma cap 0.92, excluded from bloom).
  look: {
    post: { vignette: 0.25, grain: 0.04, aberration: 0.0022, bloom: 0.5, bloomThreshold: 0.9 },
    lines: { width: 3.4, color: "#2a1a24" },
  },
  fps: 12,
  duration: 17.4,
  seed: 5005,
  far: 520,
  plates: true,
  bg: "#1d1a6e",
  palette: {
    // dusk fresco sky and stone
    zenith: "#1d1a6e", upper: "#5a1a8c", mid: "#d96a52", horizon: GOLD, sun: "#fff3c4", cloudLit: "#fbd9a0", cloudShade: "#7a2290",
    travertine: "#d9a441", stoneMid: "#a8602a", stoneShade: "#5a1a8c", stoneDeep: "#2a1a24", sinopia: "#b9573a", plaster: "#fbf6e8",
    hills: "#9a5a8a", fog: "#e8a060", pine: "#4a5a2a", pineShade: "#2e3a1c", roof: "#b9573a", dome: "#d9a441",
    // King Crimson cosmos
    cosmos: "#0b0612", starA: "#ff9be0", starB: "#ffffff", crimson: CRIM, kcBody: "#e8d8f0", kcShade: "#8a6aa8", kcLattice: "#c02a4a", kcBrow: "#d070b0",
    // Diavolo
    hairD: "#e8559a", hairDShade: "#a02a6a", spots: "#1a1020", mesh: "#e8b878", lips: "#b060c0", eyesD: "#4fd08a", bracelet: "#3fa060",
    // Giorno and Gold Experience Requiem
    curls: "#f5c518", curlsMid: "#e9c05a", curlsLight: "#f8e08a", jacket: "#d985bd", jacketShade: "#b8559a", hem: "#f0c860", ribbon: "#e3769f",
    irisG: "#3fbf8a", spokes: "#1f7a5a", goldLit: "#f8e08a", goldMid: GOLD, goldShade: "#b9803a", goldDeep: "#6a3a10", gem: "#ff80a0",
    // witnesses
    polnareff: "#cfd0e0", mista: "#2a2a3a", mistaStripe: "#e8c040", trish: "#e8559a",
    // project elements
    coral: "#d96a52", band: "#f4b8a0", water: "#3a6ea8", waterDeep: "#1f3f78", beacon: "#ff6a5a", magenta: MAG, sepia: "#8a6a3a",
    ink: "#1a1020", key: "#fff1d8", accent: GOLD, sky: "#1d1a6e", ground: "#d9a441",
  },
  // Saddle origin. The seal turns to Diavolo as the Requiem rises, faces the lens again at home.
  seal: {
    at: [0, 0, 0], yaw: 0, scale: 1,
    moves: [
      { t: [6.4, 6.9], to: [0, 0, 0], yaw: 2.8 },
      { t: [15.0, 15.5], to: [0, 0, 0], yaw: 0 },
    ],
    track: [
      { t: 0.0, pose: "awe", dur: 0.3, hold: 0.9, out: 0.2 },
      { t: 0.2, pose: "sign", dur: 0.3, hold: 0.2, out: 0.2 },
      { t: 1.3, pose: "idle", dur: 0.3, hold: 2.0, out: 0.3 },
      { t: 4.05, pose: "crouch", dur: 0.3, hold: 0.6, out: 0.3 },
      { t: 5.8, pose: "fist", dur: 0.2, hold: 0.5, out: 0.3 },
      { t: 6.7, pose: "spin", dur: 0.4, hold: 0.1, out: 0.2 },
      { t: 7.4, pose: "idle", dur: 0.3, hold: 2.3, out: 0.2 },
      { t: 10.35, pose: "point", dur: 0.2, hold: 1.2, out: 0.2 },
      { t: 11.85, pose: "point", dur: 0.1, hold: 0.2, out: 0.2 },
      { t: 12.1, pose: "raise", dur: 0.4, hold: 2.6, out: 0.4 },
      { t: 15.4, pose: "idle", dur: 0.4, hold: 1.5, out: 0.3 },
    ],
  },
  // CAMERA LAW: wide (pull back and up) -> arc into the seal -> kill -> home. A cut at least every 5 s (longest shot here 3.3 s).
  shots: [
    { n: 1,  t: [0.0, 1.3],    law: "wide", fov: [28, 44], r: [4, 15], elev: [1, 9], dutch: 0 },
    { n: 2,  t: [1.3, 3.0],    law: "wide", az: 0.8, r: [14, 15.5], elev: [8, 8.5], fov: [44, 42], dutch: 3.4, ease: "linear" },
    { n: 3,  t: [3.0, 3.7],    law: "kill", az: -0.35, r: [2.7, 2.2], elev: [0.6, 0.7], fov: [32, 30], dutch: [0, 3], look: [0, 0.2, 0.4] },
    { n: 4,  t: [3.7, 5.15],   law: "wide", az: 0.5, r: [9, 11], elev: [4, 5], fov: [36, 38], dutch: [0, 4], ease: "linear" },
    { n: 5,  t: [5.15, 6.0],   law: "arc",  az: [0.5, 0.15], r: [4.5, 2.6], elev: [1.5, 0.9], fov: [26, 22] },
    { n: 6,  t: [6.0, 7.7],    law: "kill", az: [-1.2, -0.6], r: [3.4, 4.8], elev: [0.3, 1.4], fov: [34, 38], dutch: [0, 2], look: [0, 0.8, 0] },
    { n: 7,  t: [7.7, 8.9],    law: "wide", az: 1.0, r: [10, 12], elev: [5, 6], fov: [36, 38], ease: "linear" },
    { n: 8,  t: [8.9, 10.35],  law: "arc",  az: [1.2, 0.8], r: [4.5, 3.6], elev: [1.6, 1.2], fov: [32, 28] },
    { n: 9,  t: [10.35, 11.1], law: "kill", az: [-0.5, -0.7], r: [2.8, 2.4], elev: [0.8, 0.7], fov: [30, 28], dutch: [0, 4], ease: "snap" },
    { n: 10, t: [11.1, 12.1],  law: "arc",  az: [0.6, 0.3], r: [5.0, 3.8], elev: [1.6, 1.1], fov: [34, 28] },
    { n: 11, t: [12.1, 15.4],  law: "wide", az: [0.3, -0.5], r: [8, 12], elev: [3, 6.5], fov: [30, 36], ease: "smooth" },
    { n: 12, t: [15.4, 16.4],  law: "wide", az: 0.2, r: [9, 12], elev: [5, 7], fov: [36, 40] },
    { n: 13, t: [16.4, 17.4],  law: "home", az: Math.PI, r: [3.4, 3.8], elev: [2, 2.3], fov: [36, 38] },
  ],
  beats: [
    ...LAYER_CUES,
    // open: island to Colosseum
    { t: 0.0, name: "gildring", dur: 0.4 },
    { t: 0.2, name: "banner", dur: 0.5 },
    { t: 0.2, name: "sign", dur: 0.5 },
    { t: 0.5, name: "dress", dur: 0.5, overshoot: 1.16 },
    { t: 0.75, name: "impact", seq: [[2, 2]] },
    { t: 0.75, name: "bloom", dur: 0.45, tint: GOLD },
    { t: 0.75, name: "shock", dur: 0.5, at: [0.5, 0.55], amp: 0.5, r1: 0.9 },
    { t: 1.3, name: "enter", dur: 1.0 },
    // shot 2: parcels from the column, 1.7 s then every 0.3 s
    ...[0, 1, 2, 3].map((n) => ({ t: 1.7 + 0.3 * n, name: "parcelDrop", dur: 0.45, n })),
    // shot 3: King Crimson
    { t: 3.0, name: "lineA" },
    { t: 3.0, name: "kcRise", dur: 0.7 },
    { t: 3.0, name: "trauma", amount: 0.35 },
    { t: 3.0, name: "speedlines", dur: 0.7, kind: "radial", at: [0.55, 0.45], strength: 0.5, col: CRIM },
    // shot 4: erase, time skip, coin
    { t: 3.7, name: "cosmos", dur: 1.6 },
    { t: 3.7, name: "erase", dur: 1.6 },
    { t: 3.7, name: "streaks", dur: 1.6 },
    { t: 3.7, name: "speedlines", dur: 1.6, kind: "speed", at: [0.5, 0.5], strength: 0.8, col: MAG },
    { t: 3.7, name: "witness", dur: 0.6, kind: "recoil" },
    { t: 4.05, name: "jump", dur: 0.5 },
    { t: 4.2, name: "coin", dur: 0.6, face: "heads" },
    // shot 5: the arrow
    { t: 5.15, name: "arrow", dur: 0.65 },
    { t: 5.15, name: "speedlines", dur: 0.65, kind: "speed", at: [0.5, 0.5], strength: 0.9, col: GOLD },
    { t: 5.8, name: "pierce", dur: 0.25 },
    { t: 5.8, name: "impact", seq: [[1, 2], [2, 2]] },
    { t: 5.8, name: "shock", dur: 0.5, at: [0.5, 0.5], amp: 0.7, r1: 0.8 },
    { t: 5.8, name: "pose", pose: "fist", dur: 0.2, hold: 0.5, out: 0.3 },
    { t: 5.8, name: "eyes", dur: 0.083, expr: "awe" },
    // shot 6: Requiem, DON, gild wipe
    { t: 6.0, name: "move", dur: 0.4 },
    { t: 6.05, name: "gerRise", dur: 0.65 },
    { t: 6.4, name: "lineB" },
    { t: 6.45, name: "gildWipe", dur: 1.25 },
    { t: 6.45, name: "witness", dur: 0.6, kind: "awe" },
    { t: 6.5, name: "don", dur: 0.7 },
    { t: 6.5, name: "trauma", amount: 0.5 },
    { t: 6.5, name: "bloom", dur: 0.8, tint: GOLD },
    // shots 7-8: step, rewind, true run, gate
    { t: 7.4, name: "gerStep", dur: 0.6 },
    { t: 8.0, name: "kcSink", dur: 0.4 },
    { t: 8.0, name: "gate", dur: 2.3 },
    { t: 8.0, name: "rewind", dur: 1.3 },
    { t: 8.2, name: "coinRewind", dur: 1.1 },
    { t: 9.0, name: "beacon", dur: 0.5 },
    { t: 9.3, name: "trueRun", dur: 1.0 },
    { t: 9.3, name: "tear", dur: 0.9 },
    // shots 9-10: MUDA barrage, seven pulses, the seventh (11.85) is the last blow
    { t: 10.35, name: "muda", dur: 1.5 },
    { t: 10.35, name: "speedlines", dur: 1.5, kind: "speed", at: [0.5, 0.5], strength: 1.0, col: MAG },
    ...[0, 1, 2, 3, 4, 5, 6].map((n) => ({ t: 10.35 + 0.25 * n, name: "pulse", dur: 0.12, n })),
    ...[0, 2, 4].map((n) => ({ t: 10.35 + 0.25 * n, name: "impact", seq: [[2, 1]] })),
    { t: 11.85, name: "lastBlow", dur: 0.2 },
    { t: 11.85, name: "impact", seq: [[1, 2], [2, 2]] },
    { t: 11.85, name: "shock", dur: 0.6, at: [0.55, 0.5], amp: 0.9, r1: 1.0 },
    { t: 11.85, name: "trauma", amount: 0.9 },
    { t: 11.85, name: "launch", dur: 0.55 },
    // shot 11: hero pose, claim
    { t: 12.0, name: "poses", dur: 3.0 },
    { t: 12.1, name: "slide", dur: 3.3 },
    { t: 12.3, name: "lineC" },
    { t: 12.3, name: "claim", dur: 1.5 },
    { t: 12.3, name: "witness", dur: 0.8, kind: "arms" },
    // shots 12-13: TBC, zero, collapse
    { t: 14.7, name: "tbc", dur: 0.7 },
    { t: 15.2, name: "zero", dur: 1.2 },
    { t: 15.4, name: "credit" },
    { t: 16.6, name: "collapse", dur: 0.4, sepia: true },
    { t: 16.6, name: "shock", dur: 0.4, at: [0.5, 0.6], amp: 0.4, r1: 1.2 },
  ],
  // Lower half, one at a time (the overlay moves them off the seal).
  bubbles: [
    { t: [3.0, 3.7], text: "King Crimson! Only the result remains!", who: "foe", side: "l", tone: "shout" },
    { t: [6.4, 9.2], text: "You will never arrive at the truth.", who: "seal", side: "r", tone: "say" },
    { t: [12.3, 15.2], text: "Top-k, argmin and threshold: certified or refused. Decided by the data, not by rounding.", who: "foe", side: "l", tone: "shout" },
  ],
  // The 15-line pool in Giorno's calm voice (L12), for pool:"lines" bubbles.
  lines: [
    "You will never arrive at the truth.",
    "Decided by the data, not by rounding.",
    "Certified, or refused.",
    "The answer is not chosen by the rounding.",
    "I will not guess where the data has not spoken.",
    "Return to zero.",
    "The side was never yours to pick.",
    "Only what survives the error may be said.",
    "A threshold is a promise, not a hunch.",
    "Where the bound is wide, I stay silent.",
    "Every parcel that rings was proven.",
    "Every parcel that tears was never an answer.",
    "Top-k, argmin and threshold, all on the same law.",
    "The ridge decides. The rounding only watches.",
    "This is the truth that cannot be rewound.",
  ],
  sfx: [
    { t: [0.2, 1.1], text: "ゴゴゴ", at: [0.5, 0.82], size: 0.2, rot: -2, col: GOLD, ink: "#1a1020" },
    { t: [1.7, 3.0], text: "tink... tink...", at: [0.5, 0.88], size: 0.1, rot: 0, col: GOLD, ink: "#1a1020" },
    { t: [3.0, 3.7], text: "ゴゴゴ", at: [0.85, 0.82], size: 0.26, rot: -8, col: GOLD, ink: "#1a1020" },
    { t: [3.9, 5.1], text: "ZZZT", at: [0.82, 0.86], size: 0.16, rot: 6, col: MAG, ink: "#1a1020" },
    { t: [5.8, 6.4], text: "SHING", at: [0.8, 0.84], size: 0.22, rot: -6, col: GOLD, ink: "#1a1020" },
    { t: [6.5, 7.4], text: "DON!", at: [0.22, 0.84], size: 0.34, rot: -5, col: GOLD, ink: "#1a1020" },
    { t: [8.4, 10.3], text: "TING", at: [0.82, 0.86], size: 0.14, rot: 4, col: GOLD, ink: "#1a1020" },
    { t: [10.35, 11.85], text: "MUDAMUDAMUDA", at: [0.5, 0.88], size: 0.26, rot: -3, col: GOLD, ink: "#1a1020" },
    { t: [12.1, 15.0], text: "ゴゴゴ", at: [0.9, 0.84], size: 0.22, rot: -7, col: MAG, ink: "#1a1020" },
    { t: [12.1, 15.0], text: "ゴゴゴ", at: [0.1, 0.84], size: 0.22, rot: 7, col: GOLD, ink: "#1a1020" },
    { t: [15.2, 16.0], text: "ding", at: [0.8, 0.86], size: 0.1, rot: 0, col: GOLD, ink: "#1a1020" },
  ],
  credit: { t: [15.4, 17.4], text: "separatrix: returned to zero, the seal is back where it started." },
};
