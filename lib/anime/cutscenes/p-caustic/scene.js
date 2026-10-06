// SCENE DATA for p-caustic: Naruto Shippuden, Madara's blue Perfect Susanoo + Tengai Shinsei + Infinite Tsukuyomi moon (PROTECTED look).
// DIRECTION layer. Pure data, no imports. Single source of truth for cue names and times: scripts/p-caustic.md sections 3-6.
// Pocket clock starts at the arrival; run time 11.6 s (278 frames @24). The 8 bible shots map to 8 camera shots below.
//
// FRAME. Rig angles are in the seal's own frame (x right, y up, z forward; az 0 = front, pi = behind, + = seal's left).
// The seal stands at the origin FACING THE ARMY (world -z): seal.yaw = PI (if the engine's yaw 0 already faces -z, flip this one value).
// The Susanoo stands ahead of the seal at world (0.9,0,-17), the army ridge at z -31.5..-35.5, the Limbo moon at (-30,14,-118).
// A camera BESIDE/BEHIND the seal (az ~ +-1.9..2.8) looks past it at the war: the seal is never covered, the war is the backdrop.
// Colour script per shot lives in shots[].col (free metadata; layers read ctx.scene.shots[cue.shotN].col).
//
// CUE NAMES (layers read them with cue.on/k/since/done; reserved ones are handled by the player):
//   moonRise 0-1.6 | warSwell 0-1.2 | threads 0-6.6 (continuous) | giantEgg 0-5 (still rock giant, far-right ridge)
//   pupGrow 0.55-1.15 (costume pops, 18 % overshoot) | madaraEyes 0.55-6.8 (red slit caps)
//   susanooRise 1.7-2.8 | groundCrack 1.7-2.8 | allyFlinch 1.9 (lag 0-0.25 s per seal) | swordsPose 2.8-3.3
//   castTengai 3.3 (flipper up, gunbai fan egg: fanEgg) | allyCover 3.3 | susanooFlare 3.45 and 6.42 | flashBlue 3.45
//   skyTear 3.45-3.95 | meteor1 3.8-4.7 | meteor1Hit 4.7 | meteor2Out 4.85-6.1 | allyShield 5.0-6.4 | moonCrack 5.45-6.2
//   meteor2Slam 6.1-6.42 (last 4 frames on ones) | hit2 6.42 | flashWarm 6.42 | dustPlume 6.42-7.05 | craterWeb 6.42-6.6 | allyBlown 6.42
//   shatter 6.6-8.1 (uBreak) | islandReveal 6.6-8.3 | lighthouseEgg 6.6 | costumeOff 6.8 | allyKneel 7.0
//   allyRise 8.3-9.3 (24 frames, one at a time) | shardsSettle 8.3-10.4 | wipeHome 10.4-11.6
// RESERVED used: pose, impact, speedlines, shock, trauma.
const SFX_COL = "#ffb15a", SFX_INK = "#2a1208";

// Consolidate: cue names the layers read, at the bible times (agreement with the layers' fallbacks).
const LAYER_CUES = [
  { t: 0.3, name: "limbo" },
  { t: 1.7, name: "rise" },
  { t: 3.3, name: "cast" },
  { t: 3.45, name: "tear" },
  { t: 4.7, name: "hit1" },
  { t: 4.85, name: "meteor2" },
  { t: 5.45, name: "crack" },
  { t: 6.6, name: "break" },
  { t: 0.55, name: "costume" },
  { t: 1.9, name: "flinch" },
  { t: 8.3, name: "aftermath" },
];

export default {
  id: "p-caustic",
  title: "Naruto, Madara: blue Susanoo (PROTECTED)",
  anime: "Naruto Shippuden, Pierrot: Fourth Shinobi War",
  style: "modern-anime",
  // Pierrot TV cel: warm dust grade over everything except the Susanoo (the one cold object), 3 % grain, 20 % vignette.
  look: {
    post: { grain: 0.03, vignette: 0.2, bloom: 0.55, aberration: 0, accentHue: 0.62 },
    lines: { color: "#2a1f1a", width: 2.5 },
    fill: { bands: 2 },
  },
  fps: 12,
  duration: 11.6,
  seed: 4101,
  far: 900,
  plates: true,
  bg: "#2a241f",
  // protected Madara palette (commit 4d2cf1a^) + bible hexes
  palette: {
    skyTop: "#2a241f", skyMid: "#6a5c4d", haze: "#bfa98b", skyLow: "#4a3f34",
    cloudStrip: "#1a0b0b", sunsetGold: "#e8c25a", bruise: "#7a4a3c",
    moonRed: "#b80a17", moonInk: "#140003", moonMottle: "#7a6a52", moonHalo: "#ffe8e0", limboSky: "#a4281f",
    ash: "#9c8a72", soot: "#433a30", ember: "#e8c9a0", groundInk: "#2a231c", hillOlive: "#5a5a28", hillShade: "#2c2c14",
    susBody: "#121f57", susDeep: "#1f4dff", susHot: "#59bfff", susEdge: "#ccebff", susLine: "#bfe6ff", susHalo: "#4aa8ff",
    susWing: "#2a5be0", susBlade: "#8cccff", susEye: "#ff2a3a",
    hair: "#33293d", hairLit: "#6a5f86", plate: "#b3202e", plateShadow: "#6a0f1a", lace: "#e8dcc2", rim: "#17120f",
    eyeRed: "#f2191f", eyeDeep: "#8c0514", gunbaiFace: "#2a231c", gunbaiRing: "#e8dcc2",
    rockDark: "#2a211a", lava: "#e6c799", tailStart: "#9e8061", tailEnd: "#473d33", emberHot: "#ff8a2a", emberCore: "#ffd27a",
    thread: "#fbf0f0", threadHalo: "#ffe8e0", tearSeam: "#fff2d8", tearGap: "#0a0408",
    flashBlue: "#cfe6ff", flashWarm: "#fff4e4", dust: "#9c8a72", dustLight: "#bfa98b",
    stage: "#e0559b", ink: "#2a1f1a", sfx: SFX_COL, sfxStroke: SFX_INK,
  },
  // hero at the origin facing the war. Poses: sign to 1.5, fist 1.7-3.3, raise 3.3-6.6 (Tengai Shinsei), crouch at the hit, fist on the flex 6.8.
  seal: {
    at: [0, 0, 0], yaw: Math.PI, scale: 1, moves: [],
    track: [
      { t: 0.0, pose: "sign", dur: 0.4, hold: 1.1, out: 0.2 },
      { t: 1.7, pose: "fist", dur: 0.25, hold: 1.35, out: 0.1 },
      { t: 3.3, pose: "raise", dur: 0.3, hold: 3.0, out: 0.1 },
      { t: 6.42, pose: "crouch", dur: 0.08, hold: 0.25, out: 0.1 },
      { t: 6.8, pose: "fist", dur: 0.2, hold: 0.9, out: 0.2 },
      { t: 8.3, pose: "idle", dur: 0.3, hold: 3.3, out: 0.2 },
    ],
  },
  // CAMERA LAW: wide -> arc -> free medium -> wide -> kill -> reveal arc -> home. Every shot <= 5 s, hard cuts.
  shots: [
    // 1 (0-1.6): wide on the war plain, fov 28 pulling to 44, pull back and up. Warm grey-brown, red moon accent.
    { n: 1, t: [0, 1.6], law: "wide", az: [2.55, 2.35], r: [3.2, 9], elev: [1.2, 5.5], fov: [28, 44], look: [[0, 0.3, -1], [0, 1.0, -4]],
      col: { mood: "warm grey-brown, red moon accent", p: ["skyMid", "haze", "moonRed", "ash", "groundInk"] } },
    // 2 (1.6-3.0): low arc into the seal, fov 62, looking UP at the Susanoo rising ahead of it. Blue is the only cold object.
    { n: 2, t: [1.6, 3.0], law: "arc", az: [2.15, 1.85], r: [4.4, 3.2], elev: [0.15, 0.35], fov: [62, 56], look: [[0, 1.6, -3], [0, 3.2, -6]], dutch: [0, -3],
      col: { mood: "warm dark, blue the only cold object", p: ["susDeep", "moonRed", "ash", "susHot", "susEdge"] } },
    // 3 (3.0-4.6): medium low over the ridge, clear of the seal; allies look up, line A, cast, sky tear, meteor one.
    { n: 3, t: [3.0, 4.6], law: "free", az: [-2.5, -2.2], r: [3.8, 3.2], elev: [0.5, 0.9], fov: [40, 36], look: [[0, 0.9, -4], [0, 2.2, -7]], minFrac: 0.14,
      col: { mood: "seam light, ember trail", p: ["tearSeam", "tearGap", "emberHot", "rockDark", "ash"] } },
    // 4 (4.6-6.0): wide, pull out per law; meteor two hangs and fills the sky; victims shield.
    { n: 4, t: [4.6, 6.0], law: "wide", az: [-2.75, -2.55], r: [5.5, 12], elev: [1.5, 7], fov: [34, 46], look: [[0, 1.2, -6], [0, 4.5, -10]],
      col: { mood: "rock mass blots the sky, moon cracking", p: ["rockDark", "lava", "moonRed", "skyTop", "susHalo"] } },
    // 5 (6.0-6.6): KILL ANGLE: low, side-on at the seal, flipper swung down; slam, flash, three impact frames.
    { n: 5, t: [6.0, 6.6], law: "kill", az: [-1.45, -1.7], r: [2.9, 2.2], elev: [0.55, 0.4], fov: [30, 26], look: [0, 0.1, -0.6], dutch: [0, 5], ease: "snap",
      col: { mood: "hard warm flash, never a white-out", p: ["flashWarm", "ember", "dust", "rockDark", "ash"] } },
    // 6 (6.6-8.3): reveal; the war shatters to the daylight island. Seal whole and upright, front-on (costume sheds at 6.8).
    { n: 6, t: [6.6, 8.3], law: "arc", az: [0.55, 0.3], r: [4.8, 3.6], elev: [0.8, 1.0], fov: [36, 32], look: [[0, 0.9, 0], [0, 0.7, 0]],
      col: { mood: "full saturated daylight returns", p: ["flashWarm", "dustLight", "ash", "susHot", "emberCore"] } },
    // 7 (8.3-10.4): home orbit behind and above the seal in open ground; allies rise, credit in the pocket.
    { n: 7, t: [8.3, 10.4], law: "home", az: Math.PI, r: [3.4, 3.8], elev: [2, 2.3], fov: [36, 38], look: [0, 0.2, 3.2],
      col: { mood: "daylight settles", p: ["dustLight", "ash", "ember", "emberCore", "haze"] } },
    // 8 (10.4-11.6): one short wipe home.
    { n: 8, t: [10.4, 11.6], law: "home", az: Math.PI, r: [3.8, 4.4], elev: [2.3, 2.9], fov: [38, 40], look: [0, 0.2, 3.4],
      col: { mood: "wipe home", p: ["dustLight", "ash"] } },
  ],
  beats: [
    ...LAYER_CUES,
    // shot 1 (0-1.6)
    { t: 0.0, name: "moonRise", dur: 1.6 },
    { t: 0.0, name: "warSwell", dur: 1.2 },
    { t: 0.0, name: "threads", dur: 6.6 },
    { t: 0.0, name: "giantEgg", dur: 5.0 },
    { t: 0.55, name: "pupGrow", dur: 0.6, overshoot: 0.18 },
    { t: 0.55, name: "madaraEyes", dur: 6.25 },
    { t: 0.0, name: "pose", pose: "sign", dur: 0.4, hold: 1.1, out: 0.2 },
    // shot 2 (1.6-3.0)
    { t: 1.7, name: "susanooRise", dur: 1.1 },
    { t: 1.7, name: "groundCrack", dur: 1.1 },
    { t: 1.7, name: "pose", pose: "fist", dur: 0.25, hold: 1.35, out: 0.1 },
    { t: 1.9, name: "allyFlinch", dur: 0.9, lag: [0, 0.25], lean: 0.32, step: 0.45 },
    { t: 1.9, name: "trauma", amount: 0.35 },
    { t: 2.2, name: "speedlines", dur: 0.6, kind: "radial", at: [0.5, 0.38], strength: 0.5, col: "#59bfff" },
    { t: 2.8, name: "swordsPose", dur: 0.5 },
    // shot 3 (3.0-4.6)
    { t: 3.3, name: "castTengai", dur: 0.5 },
    { t: 3.3, name: "fanEgg", dur: 0.5 },
    { t: 3.3, name: "pose", pose: "raise", dur: 0.3, hold: 3.0, out: 0.1 },
    { t: 3.3, name: "allyCover", dur: 0.7 },
    { t: 3.45, name: "susanooFlare", dur: 0.5, power: 1 },
    { t: 3.45, name: "flashBlue", dur: 0.25, amount: 0.12 },
    { t: 3.45, name: "skyTear", dur: 0.5 },
    { t: 3.8, name: "meteor1", dur: 0.9 },
    { t: 4.7, name: "meteor1Hit", dur: 0.4 },
    { t: 4.7, name: "trauma", amount: 0.4 },
    { t: 4.7, name: "speedlines", dur: 0.3, kind: "speed", at: [0.5, 0.5], strength: 0.6, col: "#fff4e4" },
    // shot 4 (4.6-6.0)
    { t: 4.85, name: "meteor2Out", dur: 1.25 },
    { t: 5.0, name: "allyShield", dur: 1.4 },
    { t: 5.45, name: "moonCrack", dur: 0.75 },
    // shot 5 (6.0-6.6)
    { t: 6.1, name: "meteor2Slam", dur: 0.32, onesFrames: 4 },
    { t: 6.42, name: "hit2", dur: 0.6 },
    { t: 6.42, name: "impact", seq: [[2, 2], [1, 2], [0, 2]] }, // white (two-tone), inverted, normal: 3 frames
    { t: 6.42, name: "shock", dur: 0.5, at: [0.5, 0.5], amp: 0.06, r1: 0.8 },
    { t: 6.42, name: "trauma", amount: 0.8 },
    { t: 6.42, name: "susanooFlare", dur: 0.4, power: 1.4 },
    { t: 6.42, name: "flashWarm", dur: 0.2, amount: 0.35 },
    { t: 6.42, name: "pose", pose: "crouch", dur: 0.08, hold: 0.25, out: 0.1 },
    { t: 6.42, name: "dustPlume", dur: 0.63, puffs: 24, speed: 14 },
    { t: 6.42, name: "craterWeb", dur: 0.18 },
    { t: 6.42, name: "allyBlown", dur: 0.6, stagger: 10 },
    { t: 6.45, name: "speedlines", dur: 0.4, kind: "radial", at: [0.5, 0.55], strength: 0.9, col: "#fff4e4" },
    // shot 6 (6.6-8.3)
    { t: 6.6, name: "shatter", dur: 1.5 },
    { t: 6.6, name: "islandReveal", dur: 1.7 },
    { t: 6.6, name: "lighthouseEgg", dur: 1.0 },
    { t: 6.8, name: "costumeOff", dur: 0.25 },
    { t: 6.8, name: "pose", pose: "fist", dur: 0.2, hold: 0.9, out: 0.2 },
    { t: 7.0, name: "allyKneel", dur: 1.3 },
    // shot 7 (8.3-10.4)
    { t: 8.3, name: "allyRise", dur: 1.0, frames: 24 },
    { t: 8.3, name: "shardsSettle", dur: 2.1 },
    { t: 8.3, name: "pose", pose: "idle", dur: 0.3, hold: 3.3, out: 0.2 },
    // shot 8 (10.4-11.6)
    { t: 10.4, name: "wipeHome", dur: 1.2 },
  ],
  // victims never speak; line A is the sky ("land"), line B the seal. Lower half, one at a time, off the seal.
  bubbles: [
    { t: [3.0, 4.5], pool: "lines", who: "seal", side: "r", tone: "shout", y: 0.78 }, // line A: the day's pool line
    { t: [6.65, 8.25], text: "This is the power of a seal. 0.995 AUROC, with no ground truth.", who: "seal", side: "l", tone: "say", y: 0.8 }, // line B
  ],
  // 15-line pool, Madara register, epic-sincere; index 0 is the bible default for line A.
  lines: [
    "Is this… the power of a god?",
    "Look up. The sky itself obeys me.",
    "You called it a war. I call it a dream.",
    "Every bound, proved. Every lie, measured.",
    "A confident collapse is still a collapse.",
    "No ground truth? Then I will make one.",
    "Stand against the moon, if you can.",
    "This light is only a mirror.",
    "Even the heavens fall when I raise a hand.",
    "Watch the illusion break.",
    "Peace is a pattern. I read it.",
    "The truth leaves a shadow. I measure it.",
    "Kneel. Or learn what you believe.",
    "Zero doubt is the loudest hallucination.",
    "The moon was never real. The numbers are.",
  ],
  sfx: [
    { t: [0.1, 1.4], text: "GOGOGO", at: [0.78, 0.2], size: 0.1, rot: -4, col: SFX_COL, ink: SFX_INK },
    { t: [1.9, 2.9], text: "KRRRK", at: [0.2, 0.22], size: 0.09, rot: 6, col: SFX_COL, ink: SFX_INK },
    { t: [3.2, 3.9], text: "DOOM", at: [0.78, 0.2], size: 0.11, rot: -3, col: SFX_COL, ink: SFX_INK },
    { t: [4.9, 5.8], text: "ZZZ", at: [0.2, 0.22], size: 0.08, rot: 3, col: SFX_COL, ink: SFX_INK },
    { t: [6.42, 7.17], text: "DOOOM", at: [0.5, 0.2], size: 0.16, rot: -2, col: SFX_COL, ink: SFX_INK },
    { t: [6.45, 6.8], text: "KRAKA", at: [0.8, 0.3], size: 0.09, rot: 8, col: SFX_COL, ink: SFX_INK },
    { t: [6.7, 7.5], text: "FWOOM", at: [0.2, 0.2], size: 0.1, rot: -5, col: "#fff4e4", ink: SFX_INK },
    { t: [10.4, 11.0], text: "shff", at: [0.5, 0.2], size: 0.07, rot: 0, col: "#fff4e4", ink: SFX_INK },
  ],
  // inside the pocket from about 8.4 s; the return line follows the credit.
  credit: {
    t: [8.4, 10.3],
    text: "teerthsharma/caustic · 0.995 AUROC · five proved bounds\nHallucination, measurable with no ground truth.\nLimbo closes. The seal walks out of Madara's moon.",
  },
};
