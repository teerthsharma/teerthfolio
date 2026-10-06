// SCENE DATA for p-topological-ml-toolkit (A Certain Scientific Accelerator: reversal vs Kakine). DIRECTION layer. Pure data, no imports.
// SINGLE SOURCE OF TRUTH for cue names: world, cast and fx read these names through cue.on / k / since / arg.
// Bible: scripts/p-topological-ml-toolkit.md (24 fps frames: t = f/24). Contract: ../CONTRACT.md.
//
// CUE INDEX (free cues; `t` seconds; `dur` is the window cue.k(name) maps to 0..1):
//   WORLD  city_bloom 0-1.2 (shell wave + sky erase) | storm 2.0-5.5 (far wall #2a3a8a, uStorm 0..1)
//          turbine_ramp 2.0-3.0 (x3 spin) | turbine_slow 5.8-7.0 (x0.12) | level6_flip 4.17 (f100, mirrored LEVEL 6 sign)
//          sky_wave 10.35-11.3 (sky erased, r1 3.4 rad) | fold 10.4-11.3 (accordion, 2 anticipation frames first)
//          vanish 11.3-11.6 | island_return 11.6-12.2 | wipe_fold 15.0-15.4 (map-fold wipe home)
//   CAST   rival_pop 4.3-4.7 (f103-f112, twos, 1.15 overshoot) | rival_aim 4.75-5.0 (f114-f119) | rival_charge 4.8-5.0 (f115-f120)
//          rival_fire 5.0 (f120) | rival_knock 5.27-5.57 (0.9 m over 7f, tilt -0.3 rad) | wings_crumple 5.37-5.67 (f129-f136)
//          rival_react 11.4-13.6 (smirk to slack, line C) | arrow_pop 2.2-3.4 | arrow_flip 3.6-5.5 (each arrow flips end for end)
//          train_launch 3.58 (f86, torn off) | train_hit 4.55 (f109)
//   FX     storm_fire 2.0-3.6 (bullets, missiles, beams, ray) | hit_star 3.6-5.5 (8-spike star, ring, sparks, debris per rebound)
//          ray_return 5.0-5.6 | ray_hit 5.25 | wind_spiral 5.7-9.7 (72 ribbons) | orb_compress 5.83-7.83 (f139-f187) | orb_resolve 7.95-8.7
//          grid_pop 8.0-9.0 (gold cells + outlier) | bubble_rise 9.0-10.4 (to stage.bubbleTop) | release_flick 9.46 (f227)
//          pop 10.33 (f248) | shards 10.33-11.0 | rings 10.33-10.9 | ring_survive 10.5-10.95 | flash 10.33-10.58 (cap 0.32)
// RESERVED (player): impact, speedlines, shock, trauma, pose.
const T = (f) => +(f / 24).toFixed(4);

export default {
  id: "p-topological-ml-toolkit",
  title: "Index, Accelerator vs Kakine",
  anime: "A Certain Scientific Accelerator (Index universe), reversal vs Kakine Teitoku",
  style: "modern-anime",
  // bible 2 compositing: glow 0.6, grain ~0.02, vignette 0.15, cool slightly desaturated day grade, CA on impacts; luma cap 0.92
  look: {
    fill: { sat: 1.1, lumaMax: 0.92 },
    lines: { px: 3, dist: 1, ink: "#1b1a24" },
    post: { bloom: 0.6, diffuse: 0.05, shafts: 0.2, sat: 1.06, grain: 0.02, vig: 0.15, split: [-0.02, -0.01, 0.05] },
  },
  fps: 12,
  duration: 15.4, // 379 frames at 24 fps (15.8 s card length), ending on the 0.4 s wipe home
  seed: 4131,
  far: 420,
  plates: true,
  bg: "#2f6fe0",
  palette: {
    sky: "#2f6fe0", skyMid: "#5a9cf5", horizon: "#9fc9f2", skyStorm: "#2a3a8a", cloudLit: "#ffffff", cloudShade: "#6f94dc",
    ground: "#e3eaf3", slab: "#c3d1e3", asphalt: "#7a8aa1", paint: "#f4f7fb", ring: "#73a0dc",
    key: "#f4fbff", accent: "#ffc83d", ink: "#1d3f9a", inkChar: "#1b1a24", inkBg: "#4a5668",
    arrowIn: "#ff2a4d", arrowOut: "#f4fbff", arrowCore: "#3de0ff", gridCell: "#ffc83d", outlier: "#fff1c2",
    wind: "#7fe8ff", windHatch: "#e8f8ff", orbCore: "#f8fdff", orbMid: "#80dcff", orbEdge: "#2a6bff", orbShell: "#b04dff", veins: "#e6f4ff",
    film: "#e0f2ff", lattice: "#d7ecff",
    shards: ["#a8f0ff", "#ffb3f0", "#fff2a8", "#b9c8ff"], flash: "#e4f1ff", impactDark: "#10162a", impactLight: "#f4fbff",
    hairLit: "#f2f4f8", hairMid: "#c9d0de", hairShade: "#8e97ae", hairCut: "#ffffff", eyeRed: "#ff4d42", eyeDeep: "#9e0514",
    shirt: "#f1f2f4", shirtStripe: "#b4b7bf", choker: "#14141a", coatTails: "#262c3a",
    foeHair: "#c79a6a", foeHairShade: "#8a6440", foeHairCut: "#e9c99a", foeJacket: "#6c7ea3", foeJacketShade: "#46567a", foeCollar: "#f1f3f7",
    wingBody: "#fff1c2", wingEdge: "#ffd96b", wingCore: "#ffffff",
    gun: "#f1f5fa", gunStripe: "#3b74d9", gunBarrel: "#8fa3bd", gunMuzzle: "#7fe0ff", ray: "#7cc2ff", rayCore: "#d6f3ff", ball: "#f6fcff",
    shadow: "#2a3a8a", wall: "#eef3fa", glass: "#6f9fd6", paper: "#eef3f8", paperGrid: "#9fb8dc", haze: "#5a8ae0",
  },
  // staging data for the layers (single source): the rival stands at rival.at, the hero is yawed to face it
  rival: { at: [3.3, 0, -5.2], scale: 0.95, costume: "kakine", knock: 0.9 },
  stage: {
    orb: [0.2, 3.7, -1.0], orbR: 1.55, bubbleTop: [0.3, 6.0, -1.0], gridR: 1.38,
    hinges: [0, -22, -50, -82], plaza: [34, 30], viaduct: { y: 6.0, trainFrom: -24, v: 10 },
  },
  seal: {
    at: [0, 0, 0], yaw: Math.atan2(3.3, -5.2), scale: 1, moves: [],
    // bible 4 hero table. Crouch dips 0.45 on each heavy hit then recovers.
    track: [
      { t: 0.0, pose: "idle", dur: 0.4 },
      { t: T(13), pose: "idle", dur: 0.6, k: 1 },              // look grows in f13-f28 (cast reads city_bloom for the 1.18x tuft overshoot)
      { t: 0.9, pose: "sign", dur: 0.5, hold: 0.4, k: 1 },     // sign until 1.5-1.8 s
      { t: 2.0, pose: "raise", dur: 0.3, hold: 1.5, k: 1 },    // flippers raised, brow set (f48-f110)
      { t: 3.6, pose: "crouch", dur: 0.12, hold: 0.1, out: 0.25, k: 0.45 },
      { t: 4.55, pose: "crouch", dur: 0.1, hold: 0.1, out: 0.3, k: 0.45 },   // train hit f109
      { t: 5.25, pose: "crouch", dur: 0.1, hold: 0.1, out: 0.3, k: 0.45 },   // ray hit on the rival
      { t: 5.7, pose: "raise", dur: 0.3, hold: 3.45, k: 1 },   // wind seized, both flippers up (f139-f230)
      { t: 9.45, pose: "point", dur: 0.12, hold: 1.0, out: 0.3, k: 1 },      // release flick f227-f250
      { t: 11.3, pose: "fist", dur: 0.3, hold: 3.4, k: 1 },    // fist on chest, proud
      { t: 15.0, pose: "idle", dur: 0.3 },
    ],
  },
  // 11 shots, sequential (the bible's shot 4 sits inside 3 and shot 9 inside 8's tail: cut at the seams). None over 5 s.
  // `col` is the shot's 5-hex colour script for the layers.
  shots: [
    // 1 wide bloom: pull back and up, fov 28. City blooms from the pup. Shell wipe.
    { n: 1, t: [0, 1.2], law: "wide", az: 0.7, r: [4.5, 12], elev: [1.2, 8], fov: [28, 30], look: [[0, 0.2, 0], [0, 1.0, 0]], col: ["#2f6fe0", "#7fd0ff", "#eef3fa", "#1d3f9a", "#ffffff"] },
    // 2 storm: wide to medium, fov 28 to 44, arrows pop, turbines x3
    { n: 2, t: [1.2, 3.4], law: "wide", az: [0.7, 0.55], r: [12, 16], elev: [8, 10], fov: [28, 44], look: [0, 1.0, 0], col: ["#2a3a8a", "#ff2a4d", "#eef3fa", "#6f9fd6", "#1d3f9a"] },
    // 3 reversal: cut at the wide, arc into the seal (elev 1.4, az -0.44, fov 46), hard cut on the train hit
    { n: 3, t: [3.4, 4.3], law: "arc", az: [-0.2, -0.44], r: [4.6, 3.4], elev: [1.6, 1.4], fov: [44, 46], look: [0, 0.35, 0], col: ["#2f6fe0", "#f4fbff", "#3de0ff", "#ff2a4d", "#10162a"] },
    // 4 low over the shoulder, rival centre-right
    { n: 4, t: [4.3, 5.6], law: "arc", az: [2.75, 2.95], r: [2.6, 2.4], elev: [0.55, 0.5], fov: [40, 38], look: [0.5, 0.25, 3.2], minFrac: 0.15, col: ["#46567a", "#fff1c2", "#c79a6a", "#7fe0ff", "#1d3f9a"] },
    // 5 hero close-up, low up the arm: ribbons spiral, orb compresses, match cut up the orb
    { n: 5, t: [5.6, 8.0], law: "arc", az: [0.55, 0.35], r: [3.0, 2.6], elev: [0.35, 0.5], fov: [46, 44], look: [[0, 0.7, 0], [0, 2.0, 0]], col: ["#7fe8ff", "#b04dff", "#2a6bff", "#f8fdff", "#1d3f9a"] },
    // 6 medium up, slow push: orb to bubble round the gold grid
    { n: 6, t: [8.0, 9.0], law: "arc", az: [0.3, 0.2], r: [4.6, 3.9], elev: [1.5, 1.7], fov: [40, 38], look: [[0.1, 2.2, 0], [0.2, 2.9, 0]], col: ["#ffc83d", "#b04dff", "#d7ecff", "#1d3f9a", "#2a6bff"] },
    // 7 kill-angle approach, low past the flipper; the bubble rises
    { n: 7, t: [9.0, 10.35], law: "kill", az: [-0.5, -0.3], r: [3.0, 2.5], elev: [0.5, 0.6], fov: [36, 34], look: [[0, 1.2, 0.1], [0, 2.8, 0]], dutch: [0, 3], col: ["#2f6fe0", "#7fe8ff", "#b04dff", "#eef3fa", "#1d3f9a"] },
    // 8 kill angle wide-low: pop, shards, rings, fold, vanish, island returns
    { n: 8, t: [10.35, 11.6], law: "kill", az: [-0.35, -0.6], r: [6.5, 7.5], elev: [0.7, 1.0], fov: [30, 27], look: [0, 1.4, 0], dutch: [0, 6], ease: "snap", minFrac: 0.12, col: ["#10162a", "#f4fbff", "#ffb3f0", "#a8f0ff", "#fff2a8"] },
    // 9 medium settle: the pup itself, fist
    { n: 9, t: [11.6, 13.8], law: "arc", az: [0.5, 0.3], r: [3.4, 3.1], elev: [1.2, 1.0], fov: [34, 32], look: [0, 0.1, 0], col: ["#7fd0ff", "#eef3fa", "#3b82f6", "#ffffff", "#1d3f9a"] },
    // 10 credit hold
    { n: 10, t: [13.8, 15.0], law: "arc", az: [0.2, 0.15], r: 3.8, elev: 0.9, fov: 34, look: [0, 0.25, 0], col: ["#1d3f9a", "#f4fbff", "#ffc83d", "#2f6fe0", "#10162a"] },
    // 11 home: chase pose behind and above in open ground; map-fold wipe
    { n: 11, t: [15.0, 15.4], law: "home", col: ["#e3eaf3", "#9fb8dc", "#1d3f9a", "#ffffff", "#7fd0ff"] },
  ],
  beats: [
    // ---- world
    { t: 0, name: "city_bloom", dur: 1.2 },
    { t: 2.0, name: "storm", dur: 3.5 },
    { t: 2.0, name: "turbine_ramp", dur: 1.0 },
    { t: T(100), name: "level6_flip", dur: 0.3 },
    { t: 5.8, name: "turbine_slow", dur: 1.2 },
    { t: T(248), name: "sky_wave", dur: 0.95, r1: 3.4 },
    { t: 10.4, name: "fold", dur: 0.9, anticipate: 2 / 24 },
    { t: 11.3, name: "vanish", dur: 0.3 },
    { t: 11.6, name: "island_return", dur: 0.6 },
    { t: 15.0, name: "wipe_fold", dur: 0.4 },
    // ---- storm and reversal
    { t: 2.0, name: "storm_fire", dur: 1.6 },
    { t: 2.2, name: "arrow_pop", dur: 1.2 },
    { t: T(86), name: "train_launch", dur: 0.9 },
    { t: 3.6, name: "arrow_flip", dur: 1.9 },
    { t: T(109), name: "train_hit", dur: 0.4 },
    { t: 3.6, name: "hit_star", dur: 1.9 },
    // ---- rival
    { t: T(103), name: "rival_pop", dur: 0.4 },
    { t: T(114), name: "rival_aim", dur: 0.25 },
    { t: T(115), name: "rival_charge", dur: 0.2 },
    { t: T(120), name: "rival_fire", dur: 0.5 },
    { t: 5.0, name: "ray_return", dur: 0.6 },
    { t: 5.25, name: "ray_hit", dur: 0.3 },
    { t: 5.27, name: "rival_knock", dur: 0.3 },
    { t: T(129), name: "wings_crumple", dur: 0.3 },
    { t: 11.4, name: "rival_react", dur: 2.2 },
    // ---- wind, orb, bubble, pop
    { t: 5.7, name: "wind_spiral", dur: 4.0 },
    { t: T(139), name: "orb_compress", dur: 2.0 },
    { t: 7.95, name: "orb_resolve", dur: 0.75 },
    { t: T(192), name: "grid_pop", dur: 1.0 },
    { t: T(216), name: "bubble_rise", dur: 1.4 },
    { t: T(227), name: "release_flick", dur: 0.2 },
    { t: T(248), name: "pop", dur: 0.7 },
    { t: T(248), name: "shards", dur: 0.7 },
    { t: T(248), name: "rings", dur: 0.6 },
    { t: T(252), name: "ring_survive", dur: 0.45 },
    { t: T(248), name: "flash", dur: 0.25, cap: 0.32 },
    // ---- reserved player beats (default impact seq: 2 two-tone, 1 inverted, 2 swapped)
    { t: T(109), name: "impact", seq: [[2, 2], [1, 1]] },
    { t: T(248), name: "impact" },
    { t: T(109), name: "trauma", amount: 0.6 },
    { t: 3.7, name: "trauma", amount: 0.3 },
    { t: 4.2, name: "trauma", amount: 0.3 },
    { t: 5.25, name: "trauma", amount: 0.4 },
    { t: T(248), name: "trauma", amount: 0.7 },
    { t: T(248), name: "shock", dur: 0.6, at: [0.5, 0.45], amp: 0.05, r1: 0.9 },
    { t: T(109), name: "shock", dur: 0.3, at: [0.5, 0.5], amp: 0.025, r1: 0.5 },
    { t: T(248), name: "speedlines", dur: 6 / 24, kind: "radial", at: [0.5, 0.45], strength: 0.9, col: "#ffffff" },
    { t: T(86), name: "speedlines", dur: 4 / 24, kind: "speed", at: [0.5, 0.5], strength: 0.6, col: "#f4fbff" },
  ],
  bubbles: [
    // lower half, one at a time, never over the seal (overlay slides them off). A and C: the Kakine seal; B: the pup.
    { t: [5.6, 7.9], text: "That much power, from a seal?", who: "foe", side: "r", tone: "say" },
    { t: [9.0, 10.3], text: "I just changed the direction. The shape was always there.", who: "seal", side: "l", tone: "say", y: 0.72 },
    { t: [11.4, 13.6], text: "The shape of data, as an ordinary feature.", who: "foe", side: "r", tone: "say" },
  ],
  // the 15-line pool in the Kakine seal's voice (L12)
  lines: [
    "That much power, from a seal?",
    "It came straight back along its own line.",
    "Every vector, turned round.",
    "So the field was never the point.",
    "A loop in the middle. A hole that stays.",
    "It counts what survives the squeeze.",
    "One long arrow, outliving the rest.",
    "The shape of data, as an ordinary feature.",
    "Reverse it, and the structure is left standing.",
    "The wind obeyed. All of it.",
    "I fired. It answered.",
    "Persistence, drawn as a bubble.",
    "Not a trick. A coordinate.",
    "Then the whole map folds shut.",
    "Fine. I will read the shape.",
  ],
  sfx: [
    { t: [0.1, 1.0], text: "VWOOOM", at: [0.2, 0.2], size: 0.11, rot: -6, col: "#ffffff", ink: "#1d3f9a" },
    { t: [2.2, 3.2], text: "KA-KA-KA", at: [0.78, 0.22], size: 0.09, rot: 6, col: "#ffffff", ink: "#1d3f9a" },
    { t: [2.8, 3.5], text: "GOOOO", at: [0.2, 0.28], size: 0.08, rot: -5, col: "#ffffff", ink: "#1d3f9a" },
    { t: [3.65, 4.5], text: "REVERSE", at: [0.24, 0.22], size: 0.15, rot: 6, col: "#ffffff", ink: "#1d3f9a" },
    { t: [4.6, 5.3], text: "CHANG", at: [0.78, 0.22], size: 0.1, rot: -6, col: "#ffffff", ink: "#1d3f9a" },
    { t: [5.85, 6.9], text: "SHUUUU", at: [0.78, 0.2], size: 0.09, rot: 6, col: "#ffffff", ink: "#1d3f9a" },
    { t: [8.0, 8.8], text: "KII-N", at: [0.22, 0.22], size: 0.1, rot: -6, col: "#ffffff", ink: "#1d3f9a" },
    { t: [9.5, 10.2], text: "FWOOP", at: [0.78, 0.25], size: 0.09, rot: 6, col: "#ffffff", ink: "#1d3f9a" },
    { t: [10.37, 10.9], text: "PAN!", at: [0.2, 0.2], size: 0.16, rot: -6, col: "#ffffff", ink: "#1d3f9a" },
    { t: [10.7, 11.5], text: "ZA-ZA-ZAAN", at: [0.76, 0.2], size: 0.09, rot: 6, col: "#ffffff", ink: "#1d3f9a" },
  ],
  credit: {
    t: [13.8, 15.0],
    text: "teerthsharma/topological-ml-toolkit",
    sub: "persistent homology and Betti-curve features · Rust core, Python API",
    ret: "Vectors reversed, the seal is sent back along its own path.",
    payoff: "Reverse the vector, and the shape of the data is left standing.",
  },
  // easter eggs (bible 7): chevron top+choker+earphone (cast), frog lamp+vending machine (world), mirrored LEVEL 6 (world, level6_flip),
  // slab REVERSE (sfx), pale-gold outlier (fx), surviving Betti-1 ring (fx, ring_survive), M-1 plate and ACCEL decal (cast/world)
  eggs: ["accel-wardrobe", "frog-lamp-vending", "level6-mirror", "reverse-slab", "gold-outlier", "ring-survives", "m1-accel-decals"],
};
