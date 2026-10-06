// SCENE DATA for p-epsilon-hollow: DOMAIN EXPANSION, GRAVEYARD OF EFFORTS (Naruto: Itachi's Tsukuyomi, the Susanoo stroke, the throne room).
// DIRECTION agent. Pure data, no imports. THIS FILE IS THE SINGLE SOURCE OF TRUTH FOR CUE NAMES AND TIMES: world, cast and fx read `cue.*` only.
// Bible: scripts/p-epsilon-hollow.md (+ .json). Schema: ../CONTRACT.md. Run time 29.3 s (bible: 703 frames at 24 fps).
//
// ---------------------------------------------------------------------------------------------------------------------
// STAGE (all layers agree on this frame; metres; seal-local = world because seal.yaw = 0)
//   The seal stands at the NORTH POLE of a planet of radius 170 m: seal.at = [0,0,0], the planet centre is [0,-170,0].
//   The seal faces +z (it faces the lens in the front-camera shots). The EPSILON-HOLLOW EYE hangs in the sky over -z,
//   12 deg above the wide's line of sight, so from the wide (camera in front, +z) the eye is BEHIND the pup.
//   The 31 plinths stand in an arc BEHIND the pup (z < 0) at 5, 6.9 and 8.8 m. The four victims stand 3.5-6 m away at the
//   flanks and front-left, never on a camera ray to the seal (L2). The sleeper god-form is at (2.3, 0, -1.4), scale 0.55.
//   A 3 m radius around the seal is clear (L2). Nothing sits between the lens and the seal.
//
// CUE TABLE (name: t, dur: who listens) -- exact names, used nowhere else under another spelling
//   eyeSwell   0.0  3.0   world(eye glow swell 0..1 across dur) fx(bloom swell)
//   motes      0.0  29.3  fx(violet flecks 0.04 m, 0.2 m/s up, on threes)
//   pull       0.5  0.9   world(planet to sphere) fx
//   wires      0.5  1.4   fx(3 white wire curves, 6 px, glow 8 px at 25%; fade in/out over `fade` = 0.5 s = 12 frames)
//   crescent   1.4  0.5   world(gold crescent on the planet at the wide)
//   dive       1.9  1.1   world(eye rises behind the seal)
//   pinwheel   2.875 0.125 world(three-tomoe pinwheel resolves in the iris fibre noise: f69-72)  [easter egg 1]
//   flinch     3.0  0.4   cast(first flinch of S1-S4; petrify begins)
//   petrify    3.0  20.0  cast(stone climbs from the feet: `to` = 0.4 of body height by 23.0; k 0..1 across dur) fx
//   throneEgg  4.6  1.8   cast(S2 legs crossed, hand on knee, ref 06)   [easter egg 2]
//   shardDraw  6.4  2.6   cast(sleeper) fx(shard blade rises 1 m/s from the sleeper, to the seal's flipper) k 0..1
//   tealPour   6.4  2.6   world(teal pours from the sleeper then settles) fx
//   shardHeld  9.0  17.8  fx(shard overhead, still; pale contour + gold edge)  (until the swing)
//   sag        9.0  0.5   cast(S1 one knee drops; S2 sags)
//   plinthGlow 9.0  5.6   world(gold rim on the plinth tops)
//   kneel      14.6 0.6   cast(S3 to her knees)
//   lower      15.0 0.5   cast(chorus heads lower: 14.6 + 0.4)
//   ripple     14.6 8.4   world(gold crack front, 40 m/s, 1.5 m wide) fx   k 0..1 across dur
//   crow       20.0 2.0   cast(crow lifts off the maw, 2 s arc into the eye) [easter egg 4]
//   lowerAgain 23.0 0.5   cast(S1 and S4 heads lower)
//   sparks     23.0 4.0   fx(PR numbers rise as 0.12 m glyph sparks, 0.4 m/s, gold, on twos)  world(plinth text)
//   swing      26.8 0.458 cast(none) fx(shard swing: anticipation 3 f, smear 2 f, strike 4 f, hold 2 f) -- seal pose `point`
//   slash      27.0 0.45  fx(line through frame centre, normal (0.62, 0.78), opens to 0.55 NDC; edge burn)
//                         args: normal, open, edge0 "#7a3fc0" for `edge0Dur` 0.042 s (one frame, Susanoo purple) then "#e11d2e" -> "#ffb524"
//   islandReveal 27.0 1.5 world(the island seen through the cut)
//   stoneCrack 27.0 0.25  cast(victim stone cracks gold along its line and falls away in 6 frames; they survive)
//   edgeBurst  27.0 0.2   fx(bloom 1.4 for 0.2 s; the seal stays excluded)
//   wipe       28.5 0.3   fx(slash-aligned wedge wipe home)
//   Reserved (framework handles): impact 27.0 [[2,1]] (one inverted frame), speedlines 6.4 & 26.8, shock 27.0, trauma 0.5 & 27.0.
//   Per-shot colour script: shots[].color = { key, accent, fill, rim, ground }; cue.shot.data.color.
// ---------------------------------------------------------------------------------------------------------------------
export default {
  id: "p-epsilon-hollow",
  title: "Epsilon-Hollow: Graveyard of Efforts",
  anime: "Naruto (Itachi's Tsukuyomi, the Susanoo stroke, the Uchiha hideout throne room)",
  style: "modern-anime",
  // Pierrot TV finish (bible section 2): warm near-black ink 1.5 px, glow on emissive only (0.9), aberration 0.4 px, grain 0-2%, vignette 0.18, no lifted blacks.
  look: {
    fill: { sat: 1.12, lumaMax: 0.92 },
    lines: { px: 1.5, dist: 1, ink: "#2a1f1d", inkMix: 1, set: 0.9 },
    post: { bloom: 0.9, diffuse: 0.08, shafts: 0.3, sat: 1.12, split: [-0.01, -0.005, 0.02], grain: 0.012, vig: 0.18 },
  },
  fps: 12, // FX on twos; characters step on threes inside the cast layer (cue.ts is the stepped clock)
  duration: 29.3,
  seed: 3059226, // Epsilon-Hollow HEAD
  far: 3000,
  plates: true,
  bg: "#0d0714",

  palette: {
    // the sky and the eye (3.1, 3.2)
    void: "#1a0b3d", indigo: "#2b1065", nebulaTeal: "#19e6c8", crimson: "#e11d2e", wisp: "#1a0c0c", wispRim: "#ff6a1f",
    tsukuyomiHi: "#8c2118", tsukuyomiLo: "#5a120f", wire: "#ffffff",
    pupil: "#000000", photon: "#fff2d1", irisIn: "#ffdc7a", irisMid: "#f28d2e", irisRim: "#6b24ad", sclera: "#0f0517", scleraNear: "#8c5229",
    lid: "#f5c58a", limbal: "#14031f",
    memory: "#05d9f2", files: "#ffc74d", scheduler: "#f25aad",
    // stone and the world (3.3-3.7)
    basalt: "#231e2a", stoneMid: "#5a4a63", stoneLit: "#ffd9a0", stoneRim: "#c98a4e", deep: "#0d0714", bone: "#8c8474",
    crescentA: "#f2b25a", crescentB: "#7a3fc0", crackTeal: "#19e6c8", crackHi: "#7affea", gold: "#ffb524", mistTeal: "#0f2e32",
    hull: "#120a1a", carve: "#19e6c8", plinthText: "#19e6c8",
    // the shard and the slash (3.8, 3.10)
    shardPale: "#ffe7a8", shardOrange: "#ff8a1f", shardDeep: "#d4521a", ember: "#ffd54a", susanoo: "#7a3fc0",
    // props of the cast
    crow: "#0e0d12", mote: "#7a3fc0", paper: "#f2efe6", cream: "#e8dcc0",
    // legacy keys read by the stub layers
    sky: "#1a0b3d", ground: "#231e2a", key: "#ffd9a0", accent: "#ffb524", ink: "#2a1f1d",
  },

  // the hero: Itachi's role, the caster. Locked design, never restyled. North pole, upright, sat-up (sit 0.8), flippers in the sign from 0.05.
  seal: {
    at: [0, 0, 0], yaw: 0, scale: 1,
    moves: [], // the seal never travels; the camera does
    track: [
      { t: 0.0, pose: "sit", dur: 0.3, hold: 28.0, out: 0.5, k: 0.8 },     // sat-up through the whole play
      { t: 0.05, pose: "sign", dur: 0.15, hold: 6.0, out: 0.3 },           // flippers cross in the sign 0.05 -> 6.4 (held calm from 3.0)
      { t: 3.0, pose: "blink", dur: 0.3, hold: 0.0, out: 0.3, k: 0.5 },    // eyes half-lidded and calm at the sign hold
      { t: 6.4, pose: "raise", dur: 2.6, hold: 17.8, out: 0.3 },           // reaches 6.4-9.0, holds the shard overhead to 26.8
      { t: 26.8, pose: "point", dur: 0.125, hold: 1.5, out: 0.4 },         // the single stroke; point (swing) from 26.8
      { t: 27.0, pose: "blink", dur: 0.04, hold: 0.04, out: 0.04 },        // eyes narrow for one frame at the strike (f648)
    ],
  },

  // STAGE DATA (read by world and cast; positions in metres, `face:"seal"` = turn to face the seal)
  stage: {
    planet: { r: 170, centre: [0, -170, 0], clear: 3 },
    eye: { elevAboveWide: 12, az: "-z" },
    sleeper: { at: [2.3, 0, -1.4], scale: 0.55, kind: "godform" },
    plinths: { rows: [5, 6.9, 8.8], arc: "behind", count: 31, first: "Epsilon-Hollow #268", last: "topograph #422" },
    // four small costumed seals, ~0.6 m tall, 3.5-6 m from the seal, half-petrified from the feet to 40% of the body by 23.0
    victims: [
      { id: "S1", who: "Sasuke", at: [-4.2, 0, 0.7], face: "seal", pose: "stand", eyes: "rage", sharingan: true,
        coat: "#d9d4e8", shade: "#9a93b8", belt: "#6b4f9e", legs: "#2a2a3a", hair: { preset: "spiky", spikes: 7, col: "#14121c", rim: "#ffb524" }, accessories: ["sword hilt #7a7a82 at hip"] },
      { id: "S2", who: "Kakashi", at: [-2.5, 0, 3.6], face: "seal", pose: "legsCrossed", eyes: "calm", sharingan: true,
        mask: "#1d2540", vest: "#4a5d3c", vestShade: "#2f3d27", headband: "#25306b", plate: "#c4c8d0", hair: { preset: "swept", col: "#c9ccd6" }, accessories: ["kunai pouch #8a6a3d"] },
      { id: "S3", who: "Kurenai (role UNVERIFIED)", at: [4.2, 0, 0.9], face: "seal", pose: "armsCrossed", eyes: "awe", dress: "#c43a3a", bandage: "#f2efe6", hair: { preset: "long", col: "#14121c", locks: 3 } },
      { id: "S4", who: "Asuma (role UNVERIFIED)", at: [-3.6, 0, -2.6], face: "seal", pose: "crouch", eyes: "neutral", jacket: "#1c1c22", flak: "#3d4f33", scarf: "#b84a2a", headband: "#25306b", hair: { preset: "bob", col: "#1a1820" }, accessories: ["cigarette stub #e8dcc0", "trench knives #8a8a92"] },
    ],
    statues: { nearPerType: 3, names: ["TSS packing", "Certified beta-0", "T4 AGCR, not certified", "T8 TEB, Landauer"], moons: ["T6 RGCS", "T9 CMA", "T10 WPHB"] },
  },

  // THE CAMERA LAW (L3): wide -> arc -> kill -> home; FREE inserts between; a cut at least every 5 s (longest hold here: 5.0 s).
  // Spherical rig about the chest, seal-local (+x = the +az side, +z forward). Fields: CONTRACT.md "Shots". `color` is read by the layers.
  shots: [
    // 1. pre-pull close-medium; pup signs, cracks glow, bloom swells. Violet key, teal accent.
    { n: 1, t: [0, 0.5], law: "free", az: 0.5, r: 3.2, elev: 0.9, fov: 34, look: [0, 0.25, 0], ease: "linear",
      color: { key: "#2b1065", accent: "#19e6c8", fill: "#1a0b3d", rim: "#ffb524", ground: "#231e2a", band: ["#1a0b3d", "#2b1065", "#19e6c8", "#ffb524", "#e8dcc0"] } },
    // 2. pull back and up, the planet becomes a sphere; wires fade in; crimson joins
    { n: 2, t: [0.5, 1.4], law: "wide", az: 0.55, r: [3.2, 9], elev: [1, 8], fov: [34, 52], look: [[0, 0.2, 0], [0, 1.6, 0]], minFrac: 0.085, ease: "in",
      color: { key: "#e11d2e", accent: "#19e6c8", fill: "#2b1065", rim: "#ffb524", ground: "#231e2a", band: ["#1a0b3d", "#2b1065", "#19e6c8", "#ffb524", "#e11d2e"] } },
    // 3. THE WIDE: gold crescent, eye 38% of frame height, wires across, the beacon pup >= 8.5% of frame height (60 px at 720)
    { n: 3, t: [1.4, 1.9], law: "wide", az: -0.4, r: [8.4, 8.9], elev: [7, 7.4], fov: [56, 58], look: [0, 3.4, 0], minFrac: 0.085, ease: "linear",
      color: { key: "#ffb524", accent: "#f28d2e", fill: "#6b24ad", rim: "#e11d2e", ground: "#0d0714", band: ["#ffb524", "#f28d2e", "#6b24ad", "#e11d2e", "#0d0714"] } },
    // 4. arc into the seal: dive low, the eye rises behind it. Runs to 3.0 so the pinwheel lands on its last 3 frames (f69-72).
    { n: 4, t: [1.9, 3.0], law: "arc", az: [0.9, 0.2], r: [5.5, 3.0], elev: [0.35, 0.6], fov: [50, 36], look: [[0, 0.6, 0], [0, 1.3, 0]], ease: "smooth",
      color: { key: "#ffd9a0", accent: "#19e6c8", fill: "#5a4a63", rim: "#ffb524", ground: "#231e2a", band: ["#ffd9a0", "#5a4a63", "#231e2a", "#19e6c8", "#ffb524"] } },
    // 5a. medium orbit BEHIND the pup, S1-S4 half-petrified beyond it. Throne-room calm.
    { n: 5, t: [3.0, 4.6], law: "free", az: [2.55, 2.9], r: 4.2, elev: 1.3, fov: 40, look: [0, 0.2, 2.6], ease: "smooth",
      color: { key: "#d9d4e8", accent: "#19e6c8", fill: "#5a4a63", rim: "#ffb524", ground: "#231e2a", band: ["#5a4a63", "#231e2a", "#d9d4e8", "#19e6c8", "#ffb524"] } },
    // 5b. cut at 4.6: low three-quarter on S2 (Kakashi, legs crossed, ref 06); the seal stays in frame (aim midway)
    { n: 5, t: [4.6, 6.4], law: "free", eye: [[2.4, 0.4, 5.4], [2.1, 0.42, 5.0]], lookAt: [[-1.3, 0.5, 1.8], [-1.7, 0.5, 2.2]], fov: [46, 42], ease: "smooth",
      color: { key: "#d9d4e8", accent: "#19e6c8", fill: "#5a4a63", rim: "#ffb524", ground: "#231e2a", band: ["#5a4a63", "#231e2a", "#d9d4e8", "#19e6c8", "#ffb524"] } },
    // 6. close on the sleeper: the shard is drawn; teal pours then settles. Seal stays in frame, sleeper beyond it.
    { n: 6, t: [6.4, 9.0], law: "arc", az: [-0.9, -0.7], r: [3.2, 2.8], elev: [0.5, 0.9], fov: 36, look: [1.2, 0.3, -0.7], ease: "smooth",
      color: { key: "#19e6c8", accent: "#ffb524", fill: "#5a4a63", rim: "#7affea", ground: "#0d0714", band: ["#5a4a63", "#19e6c8", "#7affea", "#ffb524", "#0d0714"] } },
    // 7a. wide-medium, the 31 plinths in frame behind the pup (camera in front, looking back)
    { n: 7, t: [9.0, 11.8], law: "free", az: [0.3, 0.55], r: [7, 6.4], elev: [3.0, 2.6], fov: 50, look: [0, 0.6, -4], ease: "smooth",
      color: { key: "#ffd9a0", accent: "#19e6c8", fill: "#231e2a", rim: "#e11d2e", ground: "#8c8474", band: ["#ffd9a0", "#19e6c8", "#231e2a", "#8c8474", "#e11d2e"] } },
    // 7b. cut at 11.8: a plinth close
    { n: 7, t: [11.8, 14.6], law: "free", az: [0.9, 1.1], r: [4.6, 4.0], elev: [0.55, 0.5], fov: 38, look: [-1.2, 0.3, -3.2], ease: "smooth",
      color: { key: "#ffd9a0", accent: "#19e6c8", fill: "#231e2a", rim: "#e11d2e", ground: "#8c8474", band: ["#ffd9a0", "#19e6c8", "#231e2a", "#8c8474", "#e11d2e"] } },
    // 8a. slow dolly past the plinths toward the pup holding the shard; gold ripple; chorus lowers heads
    { n: 8, t: [14.6, 18.0], law: "free", eye: [[-4.8, 1.1, -7.4], [-1.8, 1.0, -3.0]], lookAt: [[-0.5, 0.5, -2.5], [0, 0.8, 0]], fov: [34, 32], ease: "smooth",
      color: { key: "#ffb524", accent: "#19e6c8", fill: "#5a4a63", rim: "#f2efe6", ground: "#1a0b3d", band: ["#ffb524", "#19e6c8", "#5a4a63", "#1a0b3d", "#f2efe6"] } },
    // 8b. internal cut at 18.0: a low push to the pup with the shard overhead; the crow lifts at 20.0
    { n: 8, t: [18.0, 23.0], law: "free", az: [0.6, 0.25], r: [4.2, 2.8], elev: [0.45, 0.55], fov: [34, 30], look: [0, 0.8, 0], ease: "smooth",
      color: { key: "#ffb524", accent: "#19e6c8", fill: "#5a4a63", rim: "#f2efe6", ground: "#1a0b3d", band: ["#ffb524", "#19e6c8", "#5a4a63", "#1a0b3d", "#f2efe6"] } },
    // 9. credit hold: static medium-low, 1% dolly in, pup upright, the eye behind it
    { n: 9, t: [23.0, 27.0], law: "free", az: 0.15, r: [4.0, 3.96], elev: 0.5, fov: 38, look: [0, 0.9, 0], ease: "linear",
      color: { key: "#ffb524", accent: "#f28d2e", fill: "#6b24ad", rim: "#e11d2e", ground: "#0d0714", band: ["#ffb524", "#f28d2e", "#6b24ad", "#e11d2e", "#0d0714"] } },
    // 10. THE KILL ANGLE, low and sideways: impact frame f648, the swing, the slash opens, the island shows through
    { n: 10, t: [27.0, 28.5], law: "kill", elev: [0.5, 0.45], ease: "snap",
      color: { key: "#e11d2e", accent: "#ffb524", fill: "#0d0714", rim: "#f2efe6", ground: "#f2efe6", band: ["#e11d2e", "#ffb524", "#f2efe6", "#0d0714", "#ffffff"] } },
    // 11. one short wipe home along the slash line, then the chase pose behind and above in open ground (L5)
    { n: 11, t: [28.5, 29.3], law: "home",
      color: { key: "#f2efe6", accent: "#ffb524", fill: "#e8f1ff", rim: "#ffffff", ground: "#f2efe6", band: ["#f2efe6", "#ffb524", "#e8f1ff", "#0d0714", "#ffffff"] } },
  ],

  beats: [
    // ---- reserved (the framework draws them) ----
    { t: 0.5, name: "trauma", amount: 0.15 },                                     // ゴゴゴ rumble
    { t: 6.4, name: "speedlines", dur: 0.3, kind: "radial", at: [0.55, 0.5], strength: 0.35, col: "#7affea" }, // シュッ: the draw
    { t: 26.8, name: "speedlines", dur: 0.25, kind: "speed", at: [0.5, 0.5], strength: 0.6, col: "#ffe7a8" },  // the swing smear
    { t: 27.0, name: "impact", seq: [[2, 1]] },                                   // ONE inverted two-tone frame at f648
    { t: 27.0, name: "shock", dur: 0.5, at: [0.5, 0.5], amp: 0.5, r1: 0.6 },
    { t: 27.0, name: "trauma", amount: 0.55 },                                    // 6 px for 4 frames
    // ---- free cues for the layers (see the CUE TABLE above) ----
    { t: 0.0, name: "eyeSwell", dur: 3.0 },
    { t: 0.0, name: "motes", dur: 29.3 },
    { t: 0.5, name: "pull", dur: 0.9 },
    { t: 0.5, name: "wires", dur: 1.4, fade: 0.5, count: 3, width: 6, glow: 8, glowAlpha: 0.25, touchEye: 1 },
    { t: 1.4, name: "crescent", dur: 0.5 },
    { t: 1.9, name: "dive", dur: 1.1 },
    { t: 2.875, name: "pinwheel", dur: 0.125, tomoe: 3 },
    { t: 3.0, name: "flinch", dur: 0.4 },
    { t: 3.0, name: "petrify", dur: 20.0, to: 0.4, risePer2s: 0.15 },
    { t: 4.6, name: "throneEgg", dur: 1.8, who: "S2" },
    { t: 6.4, name: "shardDraw", dur: 2.6, rise: 1.0 },
    { t: 6.4, name: "tealPour", dur: 2.6 },
    { t: 9.0, name: "shardHeld", dur: 17.8 },
    { t: 9.0, name: "sag", dur: 0.5, who: ["S1", "S2"] },
    { t: 9.0, name: "plinthGlow", dur: 5.6 },
    { t: 14.6, name: "ripple", dur: 8.4, speed: 40, width: 1.5 },
    { t: 14.6, name: "kneel", dur: 0.6, who: ["S3"] },
    { t: 15.0, name: "lower", dur: 0.5, who: ["S1", "S2", "S3", "S4"] },
    { t: 20.0, name: "crow", dur: 2.0, from: "maw", to: "eye" },
    { t: 23.0, name: "lowerAgain", dur: 0.5, who: ["S1", "S4"] },
    { t: 23.0, name: "sparks", dur: 4.0, size: 0.12, speed: 0.4 },
    { t: 26.8, name: "swing", dur: 0.458, anticipation: 3, smear: 2, strike: 4, hold: 2 }, // frames at 24 fps
    { t: 27.0, name: "slash", dur: 0.45, normal: [0.62, 0.78], open: 0.55, edge0: "#7a3fc0", edge0Dur: 0.042, edgeA: "#e11d2e", edgeB: "#ffb524", px: 6 },
    { t: 27.0, name: "islandReveal", dur: 1.5 },
    { t: 27.0, name: "stoneCrack", dur: 0.25 },
    { t: 27.0, name: "edgeBurst", dur: 0.2, bloom: 1.4 },
    { t: 28.5, name: "wipe", dur: 0.3 },
  ],

  // one bubble at a time, lower half, the seal speaks (A, B, C are the card's lines; pool = the 15 below)
  bubbles: [
    { t: [3.8, 6.3], text: "Domain Expansion: Graveyard of Efforts.", who: "seal", side: "r", tone: "say", y: 0.64 },
    { t: [7.0, 8.9], pool: "lines", who: "seal", side: "l", tone: "think", y: 0.66 },
    { t: [9.2, 12.4], text: "Every stone here is a PR that never landed.", who: "seal", side: "l", tone: "think", y: 0.64 },
    { t: [12.7, 14.4], pool: "lines", who: "seal", side: "r", tone: "think", y: 0.68 },
    { t: [14.8, 18.6], text: "Effort never gets wasted.", who: "seal", side: "r", tone: "say", y: 0.64 },
    { t: [19.2, 22.8], pool: "lines", who: "seal", side: "l", tone: "say", y: 0.66 },
    { t: [28.65, 29.3], pool: "lines", who: "seal", side: "l", tone: "shout", y: 0.7 },
  ],

  // the 15-line pool, epic-sincere (L12), seal's own voice, facts from Epsilon-Hollow (THEOREMS.md, README)
  lines: [
    "Nine of ten theorems verified. The tenth says so out loud.",
    "T4 is not certified. I kept the grave anyway.",
    "The index was wrong 1,215 times in 5,000. Now it refuses.",
    "A refusal is an answer, too.",
    "Zero wrong answers. It learned to say \"I cannot decide.\"",
    "Memory, files and scheduler, on one sphere.",
    "No libc. No POSIX. Only the kernel and the dark.",
    "Thirty-one pull requests closed. Thirty-one stones set.",
    "A proof that stops is still a proof.",
    "Some theorems are never consumed. They still orbit.",
    "The eye never blinks. It checks every bound.",
    "A blade made of what the kernel would not say.",
    "Stand still. The stone is only holding you up.",
    "Every dead idea leaves a seam. The light gets in.",
    "I will carry it. Everyone who tried is carried.",
  ],

  // brush katakana (Pierrot): fill #f2efe6, 3 px outline #120a1a; off the seal, on threes
  sfx: [
    { t: [0.0, 0.5], text: "開", at: [0.5, 0.3], size: 0.24, rot: -4, col: "#f2efe6", ink: "#120a1a", font: '"Yuji Syuku","Hiragino Mincho ProN","Yu Mincho","MS Mincho",serif' },
    { t: [0.5, 1.4], text: "ゴゴゴ", at: [0.5, 0.22], size: 0.15, rot: -6, col: "#f2efe6", ink: "#120a1a", font: '"Hiragino Mincho ProN","Yu Mincho","MS Mincho",serif' },
    { t: [1.4, 2.2], text: "ォォン", at: [0.7, 0.2], size: 0.13, rot: 5, col: "#f2efe6", ink: "#120a1a", font: '"Hiragino Mincho ProN","Yu Mincho","MS Mincho",serif' },
    { t: [2.7, 3.7], text: "ズズ", at: [0.25, 0.28], size: 0.12, rot: -8, col: "#f2efe6", ink: "#120a1a", font: '"Hiragino Mincho ProN","Yu Mincho","MS Mincho",serif' },
    { t: [6.4, 6.7], text: "シュッ", at: [0.7, 0.25], size: 0.12, rot: -12, col: "#f2efe6", ink: "#120a1a", font: '"Hiragino Mincho ProN","Yu Mincho","MS Mincho",serif' },
    { t: [27.0, 27.8], text: "ザシュ", at: [0.5, 0.24], size: 0.2, rot: -14, col: "#f2efe6", ink: "#120a1a", font: '"Yuji Syuku","Hiragino Mincho ProN","Yu Mincho","MS Mincho",serif' },
  ],

  // the credit plays inside the pocket, lower third (28 px serif #ffd9a0 title, 16 px sub #e8dcc0), 23.0 -> 27.0
  credit: { t: [23.0, 27.0], text: "Epsilon-Hollow · lab  —  Memory, files and scheduler, on one sphere." },
};
