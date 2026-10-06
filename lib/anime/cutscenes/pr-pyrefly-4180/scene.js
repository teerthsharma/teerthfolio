// SCENE DATA for pr-pyrefly-4180: the Nine-Tails chained and sealed (Naruto Shippuden, Pierrot; bible default 9 = Pierrot).
// Pure data, no imports. Bible: scripts/pr-pyrefly-4180.md. Cue names below are the single source of truth for world / cast / fx.
//
// STAGE (world metres, y up; the seal starts at the origin, yaw 0 = faces +z toward the lens side):
//   Kurama crouches BEHIND the seal at stage.fox, so every arc/kill shot frames the fox over the seal's shoulder.
//   The three kunai stick in the ground round the fox (stage.kunai); the seal hops to each (moves, 7.21-7.78 s)
//   and finishes at kunai 3 facing the fox (yaw pi), so the behind-the-shoulder chain shot (5) looks down the line to Kurama.
//
// CUE NAMES (read with cue.on / cue.k / cue.since / cue.arg). Times in s, dur in s (bible frames @24 / 24).
//   paperFold      0.00 d1.2   intro island-to-stage paper fold (shot 1)          fx/world
//   bannerSlam     0.35 d0.5   banner slams and docks                             world/fx
//   flatsRise      1.21 d1.5   flats rise near to far, 36 frames                  world
//   lampRise       1.21 d1.1   back lamp rises, card transmission up              world/fx
//   foxRoar        2.30 d1.3   jaw puppet roar                                    cast (Kurama) / fx (shake lines)
//   shinobiFlinch  2.30 d0.17  frames 0-4 flinch at the roar                      cast
//   shinobiShield  2.47 d0.33  frames 4-12 shield heads                           cast
//   foxOrb         3.60 d2.4   Kurama gathers the dark orb                        cast / fx
//   kunaiThrow1..3 4.90 5.40 5.90 d0.33  the seal throws a kunai (8 frames)       cast / fx
//   ftg1..3        7.21 7.44 7.68 d0.125 Flying Thunder God flash to kunai i (3 frames, ones)  fx / cast
//   ftgScript      7.21 d0.9   sealing-script glyphs flicker on the kunai wall    fx / world
//   foxBelly       7.90 d0.8   Eight Trigrams seal on Kurama's belly (egg)        cast
//   chain          7.92 d1.0   208 links appear and coil from kunai 3 (24 frames); k = links/208   fx / cast
//   foxFlinch      7.92 d0.33  Kurama flinches at the chain (frames 0-8)          cast
//   hoop           8.40 d0.3   violet hoop shuts at link 100                      fx
//   foxThrash      8.40 d2.1   Kurama thrashes while the coral surge runs         cast
//   surge          9.00 d1.5   coral surge runs links 101-208 (36 frames)         fx
//   burst          10.50 d0.5  surge bursts at the pin (impact beat fires with it) fx / world
//   foxPinned      10.50 d0.25 pinned, frames 0-6                                 cast
//   rosette        10.80 d0.75 kirigami rosette pops up (18 frames)               fx / cast
//   pin            11.60 d0.25 brass split-pin punches through (6 frames)         fx / cast
//   shinobiCheer   12.00 d6.0  masked shinobi seals cheer once chained            cast
//   kushinaCheer   14.30 d6.0  Kushina arms up, "dattebane!"                      cast
//   sealFlex       14.30 d2.5  the seal flexes                                    cast (pose is in seal.track too)
//   lampGlow       14.30 d8.5  lamp glow held                                     world/fx
//   plaque         22.80 d0.7  end plaque flips on the pillar (leaf symbol, 100 / 208)  world
//   lampDie        22.80 d1.0  lamp dies over 24 frames                           world/fx
//   flatsLower     23.80 d2.2  flats lowered through the floor                    world
//   islandReturn   26.00 d1.6  the island shows behind the stage                  world
//   wipeHome       27.60 d0.4  short wipe home                                    world/fx
//   eggMask        1.20 d0.8   tiny orange spiral mask on the branch (egg 1)      cast
// build.js also publishes ctx.pyrefly = { links, hoop, surge, surgeFront, burst, rosette, pin, flats, lamp, ftg, ftgIndex }.
// Reserved beats used: impact, speedlines, shock, trauma (handled by the player).
const FOX = [-5, 0, -14];
const K = [[-11, 0, -10], [1, 0, -10], [-5, 0, -5]];
const face = (p) => Math.atan2(FOX[0] - p[0], FOX[2] - p[2]); // yaw that faces Kurama from p

export const CUES = {
  paperFold: [0.0, 1.2], bannerSlam: [0.35, 0.5], flatsRise: [1.21, 1.5], lampRise: [1.21, 1.1],
  foxRoar: [2.3, 1.3], shinobiFlinch: [2.3, 0.17], shinobiShield: [2.47, 0.33], foxOrb: [3.6, 2.4],
  kunaiThrow1: [4.9, 0.33], kunaiThrow2: [5.4, 0.33], kunaiThrow3: [5.9, 0.33],
  ftg1: [7.21, 0.125], ftg2: [7.44, 0.125], ftg3: [7.68, 0.125], ftgScript: [7.21, 0.9],
  foxBelly: [7.9, 0.8], chain: [7.92, 1.0], foxFlinch: [7.92, 0.33], hoop: [8.4, 0.3], foxThrash: [8.4, 2.1],
  surge: [9.0, 1.5], burst: [10.5, 0.5], foxPinned: [10.5, 0.25], rosette: [10.8, 0.75], pin: [11.6, 0.25],
  shinobiCheer: [12.0, 6.0], kushinaCheer: [14.3, 6.0], sealFlex: [14.3, 2.5], lampGlow: [14.3, 8.5],
  plaque: [22.8, 0.7], lampDie: [22.8, 1.0], flatsLower: [23.8, 2.2], islandReturn: [26.0, 1.6], wipeHome: [27.6, 0.4],
  eggMask: [1.2, 0.8],
};
const cueBeats = Object.entries(CUES).map(([name, [t, dur]]) => ({ t, name, dur }));
const PLUM = ["#30203f", "#4a3466", "#f6ecd6", "#ffb04a", "#b3221c"];
const GOLD = ["#f0c840", "#ff6b57", "#3a2a6a", "#30203f", "#f6ecd6"];
const ISLE = ["#f4f4f0", "#30203f", "#ffb04a", "#4a3466", "#c8d8e8"];

// Consolidate: cue names the layers read, at the bible times (agreement with the layers' fallbacks).
const LAYER_CUES = [
  { t: 1.21, name: "lamp-up" },
  { t: 0.9, name: "flats-rise" },
  { t: 22.79, name: "plaque-flip" },
  { t: 22.8, name: "lamp-die" },
  { t: 25.2, name: "flats-lower" },
  { t: 25.8, name: "island" },
  { t: 1.2, name: "mask" },
  { t: 2.6, name: "roar" },
  { t: 4, name: "orb" },
  { t: 6.2, name: "throw" },
  { t: 7.25, name: "flash" },
  { t: 7.9, name: "trigram" },
  { t: 9, name: "cheer" },
  { t: 14.3, name: "dattebane" },
  { t: 23.2, name: "lower" },
  { t: 7.21, name: "ftg" },
];

export default {
  id: "pr-pyrefly-4180",
  title: "Naruto, Nine-Tails and Minato",
  anime: "Naruto Shippuden, the Nine-Tails and the Fourth Hokage (Pierrot)",
  style: "modern-anime",
  // Pierrot lit/shadow pairs from the bible: two tones + deep, hard shadow edge, violet-shifted shadow.
  look: {
    fill: { fur: ["#3a1a1a", "#140a10"], belly: ["#e89a30", "#b86a20"], skin: ["#f4d0b0", "#c89878"], hair: ["#f8e060", "#c8a020"], cloth: ["#f4f0e6", "#b8b8c8"], roof: ["#4a5a7a", "#2a3048"] },
    lines: { skin: "#3a1a10", fur: "#140a10", px: 2 },
    post: { bloom: 0.55, bloomPx: 12, fireGlow: ["#ffb04a", "#d8501a"], grain: 0, vignette: 0.1 },
  },
  fps: 12, // characters on twos; chain and sparks on twos; FTG steps its own 24 fps for ftg1..3
  duration: 28.4,
  seed: 4180,
  far: 2000,
  palette: {
    sky: "#30203f", skyMid: "#4a3466", smoke: "#5a1010", smokeDeep: "#1a0808", ember: "#ff8a3a", fire: "#ffb04a", fireLow: "#d8501a",
    ground: "#4a5a7a", roof: "#4a5a7a", roofShadow: "#2a3048", cedar: "#2a3a3a", paper: "#f6ecd6",
    kuramaFur: "#3a1a1a", kuramaDeep: "#140a10", belly: "#e89a30", bellyShadow: "#b86a20", eye: "#e02020", fang: "#f4ecd8", kurama: "#b3221c",
    chain: "#f0c840", chainShadow: "#a86a08", hoop: "#3a2a6a", surge: "#ff6b57", brass: "#ffb04a", rosette: "#4a3466",
    flash: "#fdf8e0", streak: "#ffd54a", script: "#cfe6f8", wall: "#2a3048",
    haori: "#f4f0e6", haoriShadow: "#b8b8c8", flame: "#d83820", hair: "#f8e060", hairShadow: "#c8a020", band: "#3a4a6a", plate: "#c8c8d0",
    kushinaHair: "#c82020", kushinaDress: "#3a8a5a", flak: "#2a3048", mask: "#e87a2a", anbu: "#f4f0e6", anbuMark: "#c82020",
    key: "#fff6dc", accent: "#ffb04a", ink: "#140a10", island: "#f4f4f0", islandSky: "#c8d8e8",
  },
  seal: {
    at: [0, 0, 0], yaw: 0, scale: 1,
    // the FTG hops: 0.1 s snaps to each kunai, turning to face Kurama; ends at kunai 3 facing him
    moves: [
      { t: [7.21, 7.31], to: K[0], yaw: face(K[0]) },
      { t: [7.44, 7.54], to: K[1], yaw: face(K[1]) },
      { t: [7.68, 7.78], to: K[2], yaw: face(K[2]) },
    ],
    track: [
      { t: 0.0, pose: "sign", dur: 0.4, hold: 2.2, out: 0.3 },            // beat 1: sign
      { t: 4.9, pose: "point", dur: 0.12, hold: 0.2, out: 0.1, k: 1 },    // beat 2: three kunai
      { t: 5.4, pose: "point", dur: 0.12, hold: 0.2, out: 0.1, k: 1 },
      { t: 5.9, pose: "point", dur: 0.12, hold: 0.2, out: 0.1, k: 1 },
      { t: 7.21, pose: "spin", dur: 0.1, hold: 0.6, out: 0.15 },          // beat 3: flash to each
      { t: 8.2, pose: "crouch", dur: 0.3, hold: 2.0, out: 0.3 },          // braces while the chain coils
      { t: 11.55, pose: "fist", dur: 0.1, hold: 0.5, out: 0.2 },          // beat 4: slam flippers with the pin
      { t: 14.3, pose: "raise", dur: 0.4, hold: 2.1, out: 0.3 },          // flex
      { t: 18.5, pose: "fist", dur: 0.4, hold: 3.5, out: 0.4 },
      { t: 24.0, pose: "blink", dur: 0.2, hold: 0.2, out: 0.2 },
    ],
  },
  stage: {
    fox: FOX, foxHeight: 11, tailSpan: 24, tails: 9, kunai: K,
    shinobi: [[7.0, 3.2, -1.0], [7.9, 3.2, -1.6], [8.8, 3.2, -0.8], [9.7, 3.2, -1.4], [10.6, 3.2, -0.9]], // five masked seals on the branch
    kushina: [9.0, 0, -7.5], pillar: [-9.5, 0, 6], branch: [9, 3, -1.2],
  },
  // camera law, every shot <= 5 s. Bible lens map: 24mm~42, 35mm~38, 50mm~56 (close eye), 85mm~24, 28mm~55.
  shots: [
    { n: 1, t: [0, 1.21], law: "wide", az: 0.7, r: [11, 18], elev: [3, 14], fov: [28, 42], look: [[0, 0.2, 0], [0, 1.5, -3]], color: { name: "Plum", pal: PLUM } },
    { n: 2, t: [1.21, 2.29], law: "wide", az: [0.7, 0.55], r: [13, 11], elev: [6, 5], fov: 38, look: [0, 1.5, -2], color: { name: "Plum-gold", pal: PLUM } },
    { n: 3, t: [2.29, 7.21], law: "arc", az: [0.785, 0.3], r: [5.5, 2.8], elev: [1.6, 0.55], fov: [50, 56], look: [0, 0.1, -0.5], color: { name: "Red-plum", pal: ["#b3221c", "#30203f", "#ffb04a", "#f6ecd6", "#4a3466"] } },
    { n: 4, t: [7.21, 7.92], law: "kill", az: [-0.35, -0.6], r: [2.4, 1.8], elev: 0.8, fov: 24, dutch: [0, 4], ease: "snap", color: { name: "Yellow-cream", pal: ["#fdf8e0", "#ffd54a", "#cfe6f8", "#30203f", "#b3221c"] } },
    { n: 5, t: [7.92, 11.1], law: "home", az: Math.PI, r: [4, 6], elev: [1.2, 2.6], fov: 55, look: [0, 1.5, 3.5], color: { name: "Gold-coral", pal: GOLD } },
    { n: 6, t: [11.1, 14.29], law: "arc", az: [1.0, 0.6], r: [7, 4.5], elev: [3, 1.2], fov: [40, 34], look: [0, 3, 2.5], color: { name: "Gold-coral", pal: GOLD } },
    { n: 7, t: [14.29, 18.5], law: "arc", az: [0.5, 0.2], r: [4.2, 3.4], elev: [0.8, 0.6], fov: 36, look: [0, 0.3, 0], color: { name: "Plum-gold", pal: PLUM } },
    { n: 8, t: [18.5, 22.79], law: "kill", az: [-0.3, -0.55], r: [3.4, 3.0], elev: 0.9, fov: 34, dutch: 0, ease: "smooth", color: { name: "Plum-gold", pal: PLUM } },
    { n: 9, t: [22.79, 26.0], law: "home", az: Math.PI, r: [4, 6], elev: [2.4, 4], fov: 38, look: [0, 0.2, 3.2], color: { name: "Island", pal: ISLE } },
    { n: 10, t: [26.0, 28.4], law: "wide", az: 0.9, r: [6, 14], elev: [4, 12], fov: [34, 42], look: [0, 0.5, 0], color: { name: "Island", pal: ISLE } },
  ],
  beats: [
    ...LAYER_CUES,
    ...cueBeats,
    { t: 0.9, name: "trauma", amount: 0.3 },                                   // banner dock
    { t: 2.3, name: "trauma", amount: 0.6 },                                   // roar shake
    { t: 2.3, name: "shock", dur: 0.5, at: [0.5, 0.45], amp: 0.5, r1: 0.9 },
    { t: 2.3, name: "speedlines", dur: 0.6, kind: "radial", at: [0.5, 0.45], strength: 0.7, col: "#ff8a3a" },
    { t: 7.21, name: "impact" }, { t: 7.44, name: "impact" }, { t: 7.68, name: "impact" }, // FTG: default two-tone / invert / swapped
    { t: 7.21, name: "speedlines", dur: 0.7, kind: "speed", at: [0.5, 0.5], strength: 0.9, col: "#ffd54a" },
    { t: 8.4, name: "trauma", amount: 0.35 },                                  // hoop shuts
    { t: 10.5, name: "impact", seq: [[2, 2], [1, 1], [2, 2]] },                // surge bursts at the pin
    { t: 10.5, name: "shock", dur: 0.6, at: [0.5, 0.5], amp: 0.8, r1: 1.1 },
    { t: 10.5, name: "trauma", amount: 0.8 },
    { t: 11.6, name: "trauma", amount: 0.4 },                                  // pin click
    { t: 14.3, name: "speedlines", dur: 0.4, kind: "radial", at: [0.5, 0.55], strength: 0.35, col: "#ffb04a" },
  ],
  bubbles: [
    { t: [2.3, 4.6], text: "You can't hold me forever!", who: "foe", side: "l", tone: "shout" }, // Kurama (land)
    { t: [7.9, 9.9], text: "Flying Thunder God.", who: "seal", side: "r", tone: "say" },
    { t: [14.3, 20.3], text: "208 two-module SCCs chained in one Rust test. The failure is pinned at the end with should_panic.", who: "narr", side: "c", tone: "say" },
  ],
  // 15-line pool (L12): the Fourth (calm), Kurama (snarl), Kushina (dattebane); none contradict the claim.
  lines: [
    "You can't hold me forever!", "Flying Thunder God.", "Link one hundred. The hoop closes.", "Two hundred and eight, no more.",
    "Pinned where everyone can see it.", "Chains first. Then the seal.", "It panics on purpose, dattebane!", "Hold still, Kurama.",
    "One kunai, three marks.", "The test stays green. The panic stays pinned.", "I'll be there before you blink.", "Cycles, chained.",
    "A roar is not a reason.", "should_panic, exactly where it belongs.", "Believe it.",
  ],
  sfx: [
    { t: [0.2, 0.7], text: "DON", at: [0.82, 0.22], size: 0.07, rot: -6, col: "#ffb04a" },         // drum tap
    { t: [1.25, 1.8], text: "PAT PAT", at: [0.2, 0.2], size: 0.05, rot: 5, col: "#f6ecd6" },        // page-flip
    { t: [2.4, 3.6], text: "GRAAAOOH", at: [0.2, 0.18], size: 0.09, rot: -4, col: "#ff6b57" },      // roar
    { t: [4.95, 5.25], text: "SHING", at: [0.82, 0.24], size: 0.05, rot: 8, col: "#f4f0e6" },
    { t: [7.21, 7.4], text: "FWIP", at: [0.2, 0.2], size: 0.07, rot: -8, col: "#ffd54a" },          // FTG x3
    { t: [7.44, 7.63], text: "FWIP", at: [0.8, 0.2], size: 0.07, rot: 7, col: "#ffd54a" },
    { t: [7.68, 7.87], text: "FWIP", at: [0.5, 0.14], size: 0.07, rot: -3, col: "#ffd54a" },
    { t: [8.1, 9.5], text: "JARA JARA JARA", at: [0.22, 0.2], size: 0.06, rot: -5, col: "#f0c840" }, // chain rattle
    { t: [11.6, 12.4], text: "KA-CHIK", at: [0.8, 0.2], size: 0.07, rot: 5, col: "#ffb04a" },      // pin click
    { t: [14.3, 15.6], text: "DATTEBANE!", at: [0.2, 0.22], size: 0.075, rot: -6, col: "#c82020" }, // Kushina's tic (egg 4)
    { t: [14.6, 15.0], text: "PAF", at: [0.82, 0.3], size: 0.05, rot: 6, col: "#f6ecd6" },          // paper clap
    { t: [22.9, 23.5], text: "CLACK", at: [0.8, 0.2], size: 0.06, rot: 4, col: "#f6ecd6" },         // plaque
  ],
  credit: { t: [22.8, 28.0], text: "facebook/pyrefly #4180 / 208 SCCs pinned · the paper stage folds and the island is behind it" },
};
