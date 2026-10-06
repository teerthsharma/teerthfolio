// SCENE DATA for p-monodromy (Magi, Sinbad: Baal). DIRECTION layer: single source of truth for time, shots, cues.
// Bible: scripts/p-monodromy.md. 14.0 s, bible frames at 24 fps (f = s * 24), character timing on twos (fps 12).
// Layers import { CUES, PAL } from "../scene.js" (own folder) to read cue names/times; never retype a name.
//
// Cue reading (CONTRACT): world/cast/fx call cue.on(name) / cue.k(name) (0..1 across dur) / cue.arg(name,key,def).
// Colour script per shot lives in shots[].pal (5 hex, bible section 5) and in PAL (full ramps, bible section 2).

export const PAL = {
  daySky: { zenith: "#1b57c8", mid: "#3f8ee8", horizon: "#bfe6ff", cloudLit: "#ffffff", cloudShade: "#8fb4e8" },
  stormSky: { zenith: "#0a0f3a", mid: "#1f2a78", horizon: "#3a4aa8", rim: "#7fc8ff", shade: "#0e1650", bruise: "#2b2a6b" },
  sea: ["#0a7fb4", "#0b5f9a"], foam: "#e8f6ff",
  scales: { hi: "#d8fbff", lit: "#7fe0ee", mid: "#3aa8c8", shadow: "#1c6486", deep: "#0e3350" },
  baalHair: { hi: "#bff0ff", lit: "#4aa8e0", mid: "#2c70b8", shadow: "#123c78", deep: "#0a1f4a" },
  sinbadHair: { hi: "#b98af0", lit: "#7a3fb8", mid: "#5a2a90", shadow: "#3d1a70", deep: "#1e0e46" },
  gold: { hi: "#fff6c2", lit: "#f2c14a", mid: "#e9b23a", shadow: "#a8741a", deep: "#5e3c0c" },
  bolt: { core: "#ffffff", edge: "#8fd8ff", glow: "#2a7fe8", tear: "#fff2c0", navy: "#0b2a55" },
  flash: "#cfe6ff", sigil: "#7fd8ff", crimson: "#b3123a", ink: "#140f3a",
  jafar: { robe: "#f6f2ea", sash: "#14757d", hood: "#2aa05a", badge: "#e9c040", hair: "#e8e6ea", thread: "#c0262e" },
  thamen: { robe: "#1c1830", lit: "#3a3358", shade: "#0c0a1c", trim: "#b8860b", mask: "#f6f2ea", line: "#b3123a" },
  crowd: { tunic: "#f7f1e3", robes: ["#fff3d6", "#1fbdb4", "#e4566a", "#f2b52e", "#ffffff", "#7d4fc4"], plate: "#e9c040", hood: "#231a14" },
  motes: ["#f2b52e", "#e4566a", "#1fbdb4", "#fff3d6"],
};

// Every free cue the layers listen to. t = start (s), dur = length (s). Names are exact; layers read these.
// Reserved beats (impact, speedlines, shock, trauma, pose) are handled by the player and listed in `beats` below.
export const CUES = {
  // --- world
  dissolve:     { t: 0.0,  dur: 0.25 },  // shot 1: dock -> Sindria 6-frame match dissolve
  stormRamp:    { t: 1.6,  dur: 4.8 },   // day sky -> storm sky, k 0..1 (warm day to cyan-blue monochrome, vignette in)
  bruise:       { t: 5.35, dur: 1.05 },  // bruise-violet #2b2a6b band low at the strike; crowd ducks with it
  vortexTight:  { t: 3.0,  dur: 3.4 },   // storm column tightens (1 rev per 1.5 s, faster)
  stormOut:     { t: 9.6,  dur: 1.2 },   // storm drains as the island reassembles
  daylight:     { t: 10.5, dur: 1.5 },   // Sindria daylight back (frame 07 key)
  freeze:       { t: 8.4,  dur: 1.2 },   // world freezes behind the lens
  fold:         { t: 8.4,  dur: 0.5 },   // world-fold squeeze toward the seam plane
  shatter:      { t: 8.4,  dur: 1.2, fall: 0.5, back: 1.1 }, // 40 shards: F=8.4, fall +0.5, fly back +1.1
  loopShard:    { t: 8.4,  dur: 2.3 },   // one shard edge traces a closed loop 8.4-10.7 (the monodromy claim)
  reassemble:   { t: 9.6,  dur: 1.3 },   // island reassembles; land = F+1.3
  lock:         { t: 10.5, dur: 0.2 },   // locked = F+2.1: seam heals, CHK
  seamHeal:     { t: 9.6,  dur: 0.9 },   // seam heals from the ends toward the middle
  frameGold:    { t: 12.0, dur: 1.2 },   // gold manuscript frame on, 8-point stars, teal/gold dashes
  wipe:         { t: 13.2, dur: 0.4 },   // single short wipe to the chase pose
  // --- cast
  costume:      { t: 0.9,  dur: 0.6 },   // Sinbad costume: purple ponytail, circlet, hoops, gold ring vessels
  equip:        { t: 1.9,  dur: 1.2 },   // Baal equip: eyes one highlight, mouth flat
  scales1:      { t: 1.9,  dur: 0.17 },  // scales snap on in 3 stages over 12 frames (0.5 s)
  scales2:      { t: 2.1,  dur: 0.17 },
  scales3:      { t: 2.3,  dur: 0.17 },
  tail:         { t: 2.7,  dur: 0.4 },   // serpent tail grows (1.2 m, blade fin)
  baalHair:     { t: 2.5,  dur: 0.5 },   // hair override blue
  jafarPanic:   { t: 2.3,  dur: 0.4 },   // hands up, sleeves flare (frame 55)
  jafarShake:   { t: 2.7,  dur: 3.7 },   // shaking, eyes wide
  jafarCover:   { t: 6.4,  dur: 0.25 },  // covers head
  jafarCling:   { t: 7.0,  dur: 1.4 },   // clings to sleeves
  jafarFreeze:  { t: 8.4,  dur: 3.6 },   // frozen then released with the world
  charge:       { t: 4.9,  dur: 1.4 },   // flippers up, small flat "o"
  crowdCheer:   { t: 0.0,  dur: 2.3 },   // hop 5 cm on twos
  crowdDuck:    { t: 4.9,  dur: 1.5 },   // duck begins with the violet sky
  crowdFlat:    { t: 6.4,  dur: 0.6 },
  crowdLookUp:  { t: 7.0,  dur: 1.4 },   // look up at the crack
  thamenSway:   { t: 0.0,  dur: 6.4 },   // al-thamen stand and sway on twos
  blownBack:    { t: 6.4,  dur: 0.25 },  // 6 frames, 3-4 m along -z; hit order by distance from palace axis (A,B f154, then 2 per 2 frames)
  kneel:        { t: 7.0,  dur: 0.5 },
  sparks:       { t: 6.65, dur: 0.5 },   // 12 frames of blue sparks on the fallen
  lookUp2:      { t: 7.4,  dur: 1.0 },   // two victims look up
  costumeFade:  { t: 10.5, dur: 1.3 },   // Sinbad/Baal costume fades to the plain locked seal (F+2.1..3.4)
  // --- fx
  sigilFloor:   { t: 1.9,  dur: 4.5 },   // r 1.6 m floor ring, spin on threes
  sigilSky:     { t: 3.0,  dur: 3.4 },   // r 2.2 m ring in the cloud deck, y 9
  flashA:       { t: 3.35, dur: 0.17 },  // additive #cfe6ff 22%, 4 frames (6 flashes, accelerating)
  flashB:       { t: 3.95, dur: 0.17 },
  flashC:       { t: 4.9,  dur: 0.17 },
  flashD:       { t: 5.35, dur: 0.17 },
  flashE:       { t: 5.8,  dur: 0.17 },
  flashF:       { t: 6.1,  dur: 0.17 },
  gather:       { t: 4.9,  dur: 1.5 },   // gold-white gathers in the ring vessels
  wreath:       { t: 4.9,  dur: 1.5 },   // 4-6 arcs sweeping horizontally round the torso, flicker on threes
  strike:       { t: 6.4,  dur: 0.9, grow: 0.2, hold: 0.5, fade: 0.2 }, // BARARAQ SAIQA: 0.2 grow, 0.5 hold, fade to 0.9; 3 seeds on threes
  tearFlip:     { t: 6.4,  dur: 0.2 },   // bolt colour flips #cfe6ff to #fff2c0 at the tear
  strikeWash:   { t: 6.4,  dur: 0.6 },   // hard-edged light wash on the terrace
  hudShudder:   { t: 6.4,  dur: 0.25 },
  crack:        { t: 6.5,  dur: 0.45, passes: 3 }, // lens crack: 1 main + 5 radial + 2 ring in 3 passes (6.5-6.95); origin = bolt impact pixel
  crackGlint:   { t: 7.0,  dur: 1.4 },   // dust on crack edges, star glints
  edgeLight:    { t: 8.4,  dur: 1.2 },   // blue edge light outward from impact on the shards
  ringWave:     { t: 9.6,  dur: 0.6 },   // r 0 to 4 m, #7fd8ff to #e9b23a, 3 px
  motes:        { t: 0.0,  dur: 1.6 },   // gold motes + sun glint streaks (shot 1)
  motesGold:    { t: 12.0, dur: 1.2 },   // credit motes
  sfxKRRRNG:    { t: 1.9,  dur: 0.5 },
  sfxZZZZ:      { t: 4.9,  dur: 1.0 },
  sfxBARARAQ:   { t: 6.4,  dur: 0.17 },
  sfxZZAAP:     { t: 6.57, dur: 0.6 },
  sfxSHRRK:     { t: 8.4,  dur: 0.6 },
  sfxCHK:       { t: 10.5, dur: 0.4 },
};

// beats[] is derived from CUES: every cue becomes a free beat; reserved beats are appended below.
const cueBeats = Object.entries(CUES).map(([name, v]) => ({ name, ...v }));

export default {
  id: "p-monodromy",
  title: "Magi, Sinbad: Baal",
  anime: "Magi, Sinbad: Baal",
  style: "modern-anime",
  // A-1 warm cel: grain 1.5%, glow on lightning, vignette 8% navy (the storm half is driven by cue stormRamp in world/fx).
  look: { post: { grain: 0.015, vignette: 0.08, bloom: 0.8 }, lines: { width: 2.5 } },
  fps: 12,
  duration: 14,
  seed: 1,
  far: 1500,
  plates: true,
  palette: { sky: "#1b57c8", ground: "#f6ead2", key: "#fff1d8", accent: "#e9b23a", ink: "#140f3a", storm: "#0e1650", bolt: "#8fd8ff", jade: "#0f8f8a" },

  // The hero seal stays at the terrace origin facing the lens. Yaw is held: the camera rig is seal-relative, so a turn
  // would swing the lens; the palace-facing read is carried by the point/raise poses.
  seal: {
    at: [0, 0, 0], yaw: 0, scale: 1, moves: [],
    track: [
      { t: 0.0, pose: "idle" },
      { t: 0.9, pose: "sign", dur: 0.6 },             // costume reveal
      { t: 1.9, pose: "fist", dur: 1.2 },             // equip
      { t: 3.2, pose: "idle", dur: 0.6 },
      { t: 4.9, pose: "raise", dur: 1.4 },            // charge: flippers up 4.9-6.3
      { t: 6.4, pose: "point", dur: 0.6 },            // strike
      { t: 7.0, pose: "awe", dur: 1.4 },              // watches the crack
      { t: 8.4, pose: "idle", dur: 1.2 },             // frozen
      { t: 9.6, pose: "blink", dur: 0.4 },
      { t: 10.0, pose: "idle" },                      // calm smile, eyes on lens
    ],
  },

  // The camera law: wide, arc, free arcs, kill, arcs, home. Every shot <= 5 s; all cuts, no blends.
  // pal = the bible's 5-hex colour script per shot.
  shots: [
    // 1 wide 0-1.6: rises, fov 28 to 44 (pull back and up)
    { n: 1, t: [0, 1.6], law: "wide", az: 0.7, r: [6, 22], elev: [1.2, 14], fov: [28, 44], look: [[0, 0.2, 0], [0, 1.2, 0]],
      pal: ["#1b57c8", "#bfe6ff", "#f6ead2", "#0f8f8a", "#e9b23a"] },
    // 2 costume/equip 1.6-4.6: arc in from az -0.15, elev 0.5, fov 44
    { n: 2, t: [1.6, 4.6], law: "arc", az: [-0.15, 0.25], r: [5.5, 2.8], elev: [1.4, 0.6], fov: [44, 34], look: [0, 0.1, 0],
      pal: ["#2a3a8a", "#4aa8e0", "#7fe0ee", "#e9b23a", "#f6ead2"] },
    // 3 charge 4.6-6.4: level lens above the terrace, hero in the lower third (aim raised)
    { n: 3, t: [4.6, 6.4], law: "arc", az: [0.1, -0.1], r: [4.4, 3.4], elev: [0.5, 0.35], fov: [40, 36], look: [0, 0.9, 0],
      pal: ["#0e1650", "#1f2a78", "#7fc8ff", "#ffffff", "#e9b23a"] },
    // 4 kill angle 6.4-7.0: low front, vortex above, hero lower third; impact frame at 6.4
    { n: 4, t: [6.4, 7.0], law: "kill", az: [-0.35, -0.5], r: [2.7, 2.2], elev: [0.5, 0.45], fov: [28, 25], look: [0, 0.55, 0], dutch: [0, 4], ease: "snap",
      pal: ["#ffffff", "#8fd8ff", "#0b2a55", "#fff2c0", "#b3123a"] },
    // 5 slow push on the cracked lens 7.0-8.4
    { n: 5, t: [7.0, 8.4], law: "arc", az: [0.2, 0.1], r: [3.6, 2.6], elev: [0.9, 0.8], fov: [34, 28], look: [0, 0.1, 0],
      pal: ["#1f2a78", "#7fc8ff", "#ffffff", "#e9b23a", "#0e1650"] },
    // 6 same lens, world frozen, shards 8.4-9.6 (held free rig around the seal)
    { n: 6, t: [8.4, 9.6], law: "free", az: 0.1, r: 2.6, elev: 0.8, fov: 28, look: [0, 0.1, 0], ease: "linear",
      pal: ["#0b2a55", "#7fc8ff", "#ffffff", "#1b57c8", "#e9b23a"] },
    // 7 arc into the seal 9.6-12.0, island reassembles, ring wave
    { n: 7, t: [9.6, 12.0], law: "arc", az: [0.9, 0.3], r: [6, 3.0], elev: [3.2, 1.0], fov: [38, 30], look: [0, 0.05, 0],
      pal: ["#1b57c8", "#bfe6ff", "#f6ead2", "#0f8f8a", "#e9b23a"] },
    // 8 settled mid, gold frame on, credit in the pocket 12.0-13.2
    { n: 8, t: [12.0, 13.2], law: "arc", az: [0.2, 0.0], r: [3.4, 3.2], elev: [1.0, 0.9], fov: 34, look: [0, 0.1, 0],
      pal: ["#e9b23a", "#b3123a", "#f6ead2", "#0f8f8a", "#140f3a"] },
    // 9 chase pose behind and above the seal 13.2-14.0 (one short wipe)
    { n: 9, t: [13.2, 14.0], law: "home",
      pal: ["#1b57c8", "#bfe6ff", "#f6ead2", "#0f8f8a", "#e9b23a"] },
  ],

  beats: [
    ...cueBeats,
    // reserved beats
    { t: 6.4, name: "impact", seq: [[2, 2], [1, 1], [2, 1]] }, // 2 frame smear (two-tone), 1 frame inverted white-on-navy, then swapped
    { t: 6.4, name: "speedlines", dur: 0.5, kind: "radial", at: [0.5, 0.45], strength: 0.9, col: "#ffffff" },
    { t: 6.4, name: "shock", dur: 0.6, at: [0.5, 0.4], amp: 0.5, r1: 0.9 },
    { t: 6.4, name: "trauma", amount: 0.8 },               // shake 6 frames
    { t: 3.35, name: "trauma", amount: 0.15 },
    { t: 5.35, name: "trauma", amount: 0.25 },
    { t: 1.9, name: "speedlines", dur: 0.6, kind: "radial", at: [0.5, 0.5], strength: 0.45, col: "#cfe6ff" }, // equip snap
    { t: 8.4, name: "shock", dur: 0.5, at: [0.5, 0.5], amp: 0.3, r1: 0.8 },
    { t: 9.6, name: "shock", dur: 0.6, at: [0.5, 0.45], amp: 0.3, r1: 0.9 },
    { t: 10.5, name: "trauma", amount: 0.3 },              // lock CHK
  ],

  // Lower half, one at a time, off the seal. Ja'far has his own bubble (who foe) 2.3-4.6.
  bubbles: [
    { t: [2.3, 4.6], text: "S-Sinbad-sama?! The sky is angry at you!", who: "foe", side: "l", tone: "shout" },
    { t: [4.6, 6.4], text: "Hold still, everyone. I only need one bolt.", who: "seal", side: "c", tone: "say" },
    { t: [7.0, 8.4], text: "Oh. The glass is not mine to break.", who: "seal", side: "c", tone: "think" },
    { t: [9.6, 12.0], text: "No Jacobian needed. It closed below, not above.", who: "seal", side: "c", tone: "say" },
  ],

  // 15-line character-voiced pool (L12).
  lines: [
    "The gold ring is a vessel, not a toy.",
    "Baal, lend me your thunder.",
    "A loop that closes below, never above.",
    "Five dependencies. No torch.",
    "Sindria, hold the line.",
    "Every storm comes home to the sea.",
    "Can it be undone? Watch.",
    "Thunder first, the quiet after.",
    "Cultists, mind the quay.",
    "That crack is only the seam showing.",
    "The sky owes me nothing. I take it anyway.",
    "Gather, Baraq. Do not spill.",
    "Back where we started, one turn wiser.",
    "No Jacobian. Just the loop.",
    "Ja'far, breathe. It is over.",
  ],

  // Latin letters, cream #cfe6ff fill, 6 px stroke #140f3a, 96 px tall, 3-frame shake. Off the seal.
  sfx: [
    { t: [1.9, 2.5], text: "KRRRNG", at: [0.2, 0.3], size: 96, rot: -6, col: "#cfe6ff", ink: "#140f3a" },
    { t: [4.9, 5.9], text: "ZZZZ", at: [0.8, 0.28], size: 96, rot: 5, col: "#cfe6ff", ink: "#140f3a" },
    { t: [6.4, 6.57], text: "BARARAQ SAIQA", at: [0.76, 0.78], size: 80, rot: -4, col: "#cfe6ff", ink: "#140f3a" },
    { t: [6.57, 7.17], text: "ZZAAP", at: [0.78, 0.82], size: 120, rot: -8, col: "#cfe6ff", ink: "#140f3a" },
    { t: [8.4, 9.0], text: "SHRRK", at: [0.2, 0.3], size: 96, rot: 4, col: "#cfe6ff", ink: "#140f3a" },
    { t: [10.5, 10.9], text: "CHK", at: [0.8, 0.3], size: 96, rot: -3, col: "#cfe6ff", ink: "#140f3a" },
  ],

  // Credit plays inside the pocket (card title/sub/ret).
  credit: { t: [12.0, 13.4], text: "teerthsharma/monodromy: 5 dependencies, torch not required." },
};
