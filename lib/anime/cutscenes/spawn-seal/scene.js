// SCENE DATA for spawn-seal (Tensura, Rimuru: the seal turns into a human). DIRECTION layer. Pure data, no imports.
// Bible: teerthfolio-wt/scripts/spawn-seal.md. Bible frames are 24 fps; every time here is f/24 seconds.
// THIS FILE IS THE SINGLE SOURCE OF TRUTH FOR CUE NAMES. world/cast/fx read them through `cue.on/k/since/done`.
//
// CUE NAMES (t seconds, dur seconds), grouped by who reads them:
//  all     morph (4.375, 4.42) whole seal->human; morph_a (4.375,1.42) glossy blue wash from the feet; morph_b (5.79,.67) column
//          stretch 0.9->1.55 m, flippers->arms, fluke->tail; morph_c (6.458,1.58) gold slit eyes, hair pours, belly->shirt;
//          morph_d (8.04,.75) coat unfurls, collar teeth, mittens. Cast drives uMorph from cue.k("morph"), fx the column from morph_a..b.
//  cast    drop (0,.75) the falling drop; plop (1,.9); veldora_eye (2.79,.33) gold eye opens; sphere_pulse (2.79,.6);
//          hair_pour (6.458,.5); gold_eyes (6.458,1.58); eye_glint (6.7,.25); coat_unfurl (8.04,.75); bud_spawn (8.04,1.38)
//          slime-bud pup sheds from the shoulder droplet and lands at (+0.9,0,0.3); tail_flick (9.25,.17); eyes_cam (9.375,.4);
//          point (8.58,1.0) right index finger to the sphere; cheek_hatch (8.58,.1) the ONE frame; victims_look (9.42,.58) heads tilt up;
//          victims_drop (10.0,1.0) spears drop, step back; victims_down (11.0,2.79) kneel / blown back 1.2 m, staggered 4 f L to R by beamN;
//          fingers (18.5,4.1) two fingers to the water; bud_copy (19.3,1.0) the pup copies with a flipper; palm (26.79,2.5) open palm up,
//          eyes lit violet; statue (29.29,.71) the Rimuru statue holds the point pose, the real seal beside it.
//  world   plop (ripple rings +4 f apart); lightshafts (1.0,1.8); crystal ignite: beam0..beam6 (node order, 3.7 f apart from 10.0);
//          ignite (10.0,.92); cool_violet (22.58,4.2) light cools toward #8a3fff from the edges; eaten (26.9,2.4) sky, ground, lenses,
//          lattice and Veldora's sphere eaten by the maw; restore (29.29,.71) the island returns; territories (15.5,3).
//  fx      plop; panel_in (1.3,1.0); raphael_a (3.4,2.0) / raphael_c (13.79,2.5) / raphael_d (14.4,1.9) Raphael holo-panel (no
//          words in the world: the line text is a pocket bubble); stretch (5.79,.67) 1 px chromatic fringe; droplet_burst (8.04,.5);
//          lenses (9.42,1.17) seven Megiddo lenses form with a 1.12 overshoot; beam0..beam6 gold beams (3.7 f apart, .5 each);
//          beams (10.0,.92); whip (12.79,.22); lattice (13.79,4.7); lattice_nodes (13.79,.9); lattice_edges (14.7,1.9) draw-on 6 f each;
//          lattice_tris (16.5,.8); loop (17.3,9.5) the shortest 1-cycle breathes 1.5 s; territories (15.5,3) cyan/gold/pink sectors;
//          ring_pulse (18.54,.6); bokeh (18.5,8.3) white-gold discs through the calm shots; maw (26.79,.42) opens over 10 f;
//          maw_hold (27.21,2.08) spin 1 rev/s; wipe (29.0,.3).
//  reserved (handled by the player): impact, speedlines, shock, trauma, pose.
export default {
  id: "spawn-seal",
  title: "Tensura, Rimuru (seal to human)",
  anime: "Tensura, Rimuru (seal to human)",
  style: "modern-anime",
  // Tensura TV grade: saturated blue-teal shadows, warm gold highlights, 8% cave vignette, glow on beams and eyes only,
  // 1.5% grain. Seal excluded from bloom by the framework (lit luma <= 0.92).
  look: {
    post: { bloom: 0.6, diffuse: 0.12, shafts: 0.5, sat: 1.12, split: [-0.03, 0.0, 0.07], gain: [1.02, 1.0, 0.98], grain: 0.015, vig: 0.08 },
    lines: { px: 2, dist: 1, set: 0.8 },
    fill: { sat: 1.1, lumaMax: 0.92 },
  },
  fps: 12,
  duration: 30,
  seed: 1,
  far: 400,
  plates: true,
  bg: "#1a1f5e", // fog indigo (build.js sets near 40 far 180); never white, never lifted blacks
  palette: {
    sky: "#2a1860", skyMid: "#8a3fa0", horizon: "#ff7a3a", sun: "#ffb35a",
    rock: "#1a2257", rockLit: "#2a3472", rockEdge: "#4a5fa6", rockDeep: "#0b1034", ink: "#050a1c",
    pool: "#1fb8ff", poolDeep: "#0d6ac0", poolHi: "#e8ffff", caustic: "#7ff8ff", poolEdge: "#3fdcff",
    crystal: "#3fdcff", crystalLit: "#7ff8ff", crystalShade: "#1fa0d8", ignite: "#ffd23a",
    slime: "#4a96e6", slimeLit: "#6fb4f2", slimeShade: "#2f78d0", slimeDeep: "#1f5aa8",
    hair: "#a9def2", hairMid: "#86c7e8", hairShade: "#4d9ccf", hairDeep: "#2f6fa0",
    skin: "#fbe4d6", skinShade: "#e7b8a6", skinDeep: "#c98f80", iris: "#c9b83a", lash: "#1f3350",
    coat: "#14111c", lining: "#2b57d6", collar: "#0d0b14", shirt: "#f6f8fb", mitten: "#8e8c91", boots: "#07060b",
    veldora: "#14102c", veldoraBelly: "#ffc83a", veldoraEye: "#fff1a8", shell: "#ffd25a", storm: "#3aa6ff",
    beam: "#ffd23a", beamOuter: "#ffb35a", beamHot: "#fff3b0", lens: "#7fd0ff", lensRim: "#e8ffff", ember: "#ff5a1a",
    memory: "#3fdcff", files: "#ffc83a", scheduler: "#ff4fa0", loop: "#fff3b0",
    pearl: "#dfe8ff", pearlShade: "#a8b4e0", pearlDeep: "#5a6a9a", magenta: "#ff30e8", violet: "#5a40ff", void: "#05030b", cool: "#8a3fff",
    plate: "#cfd8e8", plateMid: "#9aa8c4", plateShade: "#5a688a", gold: "#ffd23a", tabard: "#f6f8fb", cross: "#f2c230", plume: "#c8283a",
    key: "#ffd37a", accent: "#ffcf5a",
  },
  // The hero pup: on the plinth (top y .35), 35 degrees off +z. It is the framing anchor in EVERY frame. After the morph it is the
  // slime-bud: it lands at Rimuru's right (+0.9, 0, 0.3), facing him, and copies the two-finger gesture. Cast owns the Rimuru mesh at the origin.
  seal: {
    at: [0, 0.35, 0], yaw: 0.611, scale: 1,
    moves: [
      { t: [8.04, 9.42], to: [0.9, 0, 0.3], yaw: -1.9 }, // slime-bud lands
    ],
    track: [
      { t: 0.0, pose: "sit", dur: 0.2, hold: 1.0 },       // sits 0-24 f
      { t: 0.2, pose: "sign", dur: 0.55, hold: 1.2 },      // sign pose rises 5-22 f
      { t: 2.79, pose: "awe", dur: 0.4, hold: 1.1 },       // looks up at Veldora 67-105 f
      { t: 4.375, pose: "raise", dur: 0.6, hold: 1.4 },    // morph A/B
      { t: 6.458, pose: "blink", dur: 0.15, hold: 0.1 },
      { t: 8.6, pose: "idle", dur: 0.3, hold: 0.8 },
      { t: 11.0, pose: "awe", dur: 0.5, hold: 2.0 },       // the pup watches the lenses
      { t: 14.4, pose: "idle", dur: 0.4, hold: 3.8 },
      { t: 19.3, pose: "point", dur: 0.5, hold: 1.8 },     // copies the two-finger gesture with a flipper
      { t: 22.6, pose: "idle", dur: 0.5, hold: 3.8 },
      { t: 26.79, pose: "awe", dur: 0.3, hold: 2.3 },      // whole through the maw
      { t: 29.29, pose: "sit", dur: 0.3, hold: 0.7 },      // beside the statue at home
    ],
  },
  // CAMERA LAW. Pull back/up (wide), cut at the wide, arc in, kill angle, home; a cut at least every 5 s (the longest shot here
  // is 4.7 s). Wide capped near 6 m (INDEX decision 4, default yes): wides carry minFrac .12 so the figure holds 12% of frame.
  // Seal-local rig: +az toward the seal's left, elev above the chest (chest ~ plinth + 0.45). Bible shot numbers in comments.
  shots: [
    // 1 (0-24 f) extreme close, shallow DOF, locked. Drop falls, PLOP, cut on the flash.
    { n: 1, t: [0, 1.0], law: "free", eye: [[0.75, 0.45, 1.15], [0.7, 0.47, 1.08]], lookAt: [[0, 0.6, 0], [0, 0.62, 0]], fov: [34, 32], dof: [1.4, 0.9, 1], minFrac: 0.2,
      colors: ["#1fb8ff", "#7ff8ff", "#0d6ac0", "#1a1f5e", "#e8ffff"] },
    // 2 (24-67 f) wide high, pull fov 50 -> 64, cave opens in scale, pup at 12%. Cut.
    { n: 2, t: [1.0, 2.79], law: "wide", az: [0.7, 0.55], r: [3.2, 6.0], elev: [0.9, 3.0], fov: [50, 64], look: [[0, 0.1, 0], [-0.3, 1.0, 1.5]], minFrac: 0.12,
      colors: ["#1a2257", "#3fdcff", "#1fb8ff", "#8a3fff", "#ffd23a"] },
    // 3 (67-106 f) medium arc from 0.611 rad, Veldora's eye opens, match cut on the pup's eye.
    { n: 3, t: [2.79, 4.42], law: "arc", az: [0.611, 1.15], r: [3.9, 3.3], elev: [1.0, 0.85], fov: [60, 56], look: [0, 0.35, 0],
      colors: ["#1a2257", "#ffd25a", "#3aa6ff", "#14102c", "#7ff8ff"] },
    // 4 (106-154 f) medium low push-in on morph A and B; hard cut.
    { n: 4, t: [4.42, 6.42], law: "arc", az: [0.55, 0.25], r: [2.7, 1.5], elev: [0.05, 0.25], fov: [58, 46], look: [[0, 0.1, 0], [0, 0.45, 0]], ease: "linear",
      colors: ["#4a96e6", "#2f78d0", "#ffffff", "#1fb8ff", "#1a2257"] },
    // 5 (154-193 f) extreme close on the eyes (ref 03), dolly 0.15 m, shallow focus.
    { n: 5, t: [6.42, 8.04], law: "arc", az: [0.2, 0.08], r: [1.35, 1.2], elev: [0.55, 0.6], fov: [30, 30], look: [[0, 0.65, 0], [0, 0.68, 0]], dof: [1.2, 1.0, 1], minFrac: 0.14,
      colors: ["#c9b83a", "#a9def2", "#4d9ccf", "#fbe4d6", "#1f3350"] },
    // 6 (193-226 f) full body hero low, tilt up, figure >= 12%. Tail flick, the point, the line.
    { n: 6, t: [8.04, 9.42], law: "wide", az: [0.5, 0.15], r: [3.6, 3.2], elev: [-0.15, 0.3], fov: [52, 52], look: [[0, 0.1, 0], [0, 0.45, 0]], minFrac: 0.12,
      colors: ["#a9def2", "#14111c", "#fbe4d6", "#2b57d6", "#1fb8ff"] },
    // 7a (226-307 f) wide to the cave mouth: tilt up, pull back. Lenses form, beams drop.
    { n: 7, t: [9.42, 12.79], law: "wide", az: [0.5, 0.3], r: [5.0, 6.0], elev: [1.3, 2.6], fov: [60, 64], look: [[0, 0.8, 0], [0, 3.2, -2.5]], minFrac: 0.12,
      colors: ["#ffd23a", "#ff7a3a", "#8a3fa0", "#1fb8ff", "#05030b"] },
    // 7b (307-331 f) the whip pan up at 12.79: a hard cut to a fast tilt.
    { n: 8, t: [12.79, 13.79], law: "free", az: [0.1, -0.2], r: [3.0, 3.4], elev: [0.8, 1.6], fov: [62, 66], look: [[0, 1.0, 0], [0, 5.0, -3]], dutch: [4, 0], ease: "snap",
      colors: ["#ffd23a", "#ff7a3a", "#8a3fa0", "#1fb8ff", "#05030b"] },
    // 8 (331-444 f) high wide crane over the lattice, looking at the pool; figures >= 12%.
    { n: 9, t: [13.79, 18.5], law: "wide", az: [0.9, 0.7], r: [5.0, 5.6], elev: [4.0, 8.5], fov: [56, 56], look: [[0, -0.2, 0], [0, -0.3, 0]], minFrac: 0.12,
      colors: ["#ffd23a", "#fff3b0", "#3fdcff", "#ff4fa0", "#1a2257"] },
    // 9 (444-542 f) two-shot orbit, 40 degrees, eye ~1.1 m, r 3.4.
    { n: 10, t: [18.5, 22.58], law: "arc", az: [0.4, 1.1], r: [3.4, 3.4], elev: [0.55, 0.6], fov: [50, 50], look: [0, 0.2, 0],
      colors: ["#ffd23a", "#fff3b0", "#3fdcff", "#ff4fa0", "#1a2257"] },
    // 10 (542-643 f) credit hold: slow orbit and rise; light cools toward violet from the edges. Credit plays in the pocket.
    { n: 11, t: [22.58, 26.79], law: "free", az: [1.1, 1.85], r: [3.8, 4.6], elev: [0.7, 2.4], fov: [54, 54], look: [0, 0.3, 0], ease: "linear",
      colors: ["#ffd23a", "#3fdcff", "#ff4fa0", "#8a3fff", "#1a2257"] },
    // 11 (643-703 f) kill angle on the open palm, the maw above and behind.
    { n: 12, t: [26.79, 29.29], law: "kill", az: [-0.3, -0.55], r: [2.2, 1.9], elev: [0.3, 0.4], fov: [30, 26], look: [0, 0.15, 0], dutch: [0, 5],
      colors: ["#dfe8ff", "#ff30e8", "#5a40ff", "#05030b", "#14111c"] },
    // 12 (703-720 f) home: chase pose behind and above in open ground at the spawn statue.
    { n: 13, t: [29.29, 30], law: "home", az: Math.PI, r: [3.4, 3.8], elev: [2.0, 2.3], fov: [36, 38], look: [0, 0.2, 3.2],
      colors: ["#1fb8ff", "#e8ffff", "#ffd23a", "#1a2257", "#7ff8ff"] },
  ],
  // Beat times are bible frames / 24. Reserved names first, then the layer cues listed at the top.
  beats: [
    // ---- reserved
    { t: 1.0, name: "shock", dur: 0.6, at: [0.5, 0.55], amp: 0.5, r1: 0.7 },       // PLOP (frame 24)
    { t: 2.79, name: "shock", dur: 0.5, at: [0.65, 0.4], amp: 0.3, r1: 0.5 },      // sphere pulse
    { t: 2.79, name: "trauma", amount: 0.15 },
    { t: 4.42, name: "shock", dur: 0.5, at: [0.5, 0.7], amp: 0.35, r1: 0.55 },     // morph begins
    { t: 5.79, name: "trauma", amount: 0.2 },                                       // column stretch
    { t: 8.04, name: "shock", dur: 0.45, at: [0.5, 0.55], amp: 0.4, r1: 0.6 },     // SHAN, coat unfurls
    { t: 10.0, name: "impact", seq: [[1, 2]] },                                     // 2-frame inverted impact 240-241 f
    { t: 10.0, name: "speedlines", dur: 0.92, kind: "radial", at: [0.5, 0.35], strength: 0.8, col: "#ffd23a" },
    { t: 10.0, name: "trauma", amount: 0.4 },
    { t: 12.79, name: "speedlines", dur: 0.3, kind: "speed", at: [0.5, 0.5], strength: 0.6, col: "#ffd23a" }, // whip pan
    { t: 18.54, name: "shock", dur: 0.6, at: [0.5, 0.6], amp: 0.3, r1: 0.6 },      // PON
    { t: 26.79, name: "impact", seq: [[1, 2]] },                                    // Predator maw 643-644 f
    { t: 26.79, name: "trauma", amount: 0.5 },
    { t: 29.29, name: "shock", dur: 0.7, at: [0.5, 0.6], amp: 0.4, r1: 0.8 },      // PLOP at home

    // ---- layer cues (names exactly as in the header)
    { t: 0.0, name: "drop", dur: 0.75 },
    { t: 1.0, name: "plop", dur: 0.9 },
    { t: 1.0, name: "lightshafts", dur: 1.8 },
    { t: 1.3, name: "panel_in", dur: 1.0 },
    { t: 2.79, name: "sphere_pulse", dur: 0.6 },
    { t: 2.79, name: "veldora_eye", dur: 0.33 },
    { t: 3.4, name: "raphael_a", dur: 2.0 },
    { t: 4.375, name: "morph", dur: 4.42 },
    { t: 4.375, name: "morph_a", dur: 1.42 },
    { t: 5.79, name: "morph_b", dur: 0.67 },
    { t: 5.79, name: "stretch", dur: 0.67 },
    { t: 6.458, name: "morph_c", dur: 1.58 },
    { t: 6.458, name: "hair_pour", dur: 0.5 },
    { t: 6.458, name: "gold_eyes", dur: 1.58 },
    { t: 6.7, name: "eye_glint", dur: 0.25 },
    { t: 8.04, name: "morph_d", dur: 0.75 },
    { t: 8.04, name: "coat_unfurl", dur: 0.75 },
    { t: 8.04, name: "bud_spawn", dur: 1.38 },
    { t: 8.04, name: "droplet_burst", dur: 0.5 },
    { t: 8.58, name: "point", dur: 1.0 },
    { t: 8.58, name: "cheek_hatch", dur: 0.1 },
    { t: 9.25, name: "tail_flick", dur: 0.17 },
    { t: 9.375, name: "eyes_cam", dur: 0.4 },
    { t: 9.42, name: "victims_look", dur: 0.58 },
    { t: 9.42, name: "lenses", dur: 1.17 },
    { t: 10.0, name: "beams", dur: 0.92 },
    { t: 10.0, name: "ignite", dur: 0.92 },
    { t: 10.0, name: "victims_drop", dur: 1.0 },
    // seven beams in node order, 3.67 f apart (240..262 f)
    ...[0, 1, 2, 3, 4, 5, 6].map((i) => ({ t: +(10.0 + (i * 22) / 6 / 24).toFixed(3), name: "beam" + i, dur: 0.5 })),
    { t: 11.0, name: "victims_down", dur: 2.79 },
    { t: 12.79, name: "whip", dur: 0.22 },
    { t: 13.79, name: "raphael_c", dur: 2.5 },
    { t: 13.79, name: "lattice", dur: 4.7 },
    { t: 13.79, name: "lattice_nodes", dur: 0.9 },
    { t: 14.4, name: "raphael_d", dur: 1.9 },
    { t: 14.7, name: "lattice_edges", dur: 1.9 },
    { t: 15.5, name: "territories", dur: 3.0 },
    { t: 16.5, name: "lattice_tris", dur: 0.8 },
    { t: 17.3, name: "loop", dur: 9.5 },
    { t: 18.5, name: "fingers", dur: 4.1 },
    { t: 18.5, name: "bokeh", dur: 8.3 },
    { t: 18.54, name: "ring_pulse", dur: 0.6 },
    { t: 19.3, name: "bud_copy", dur: 1.0 },
    { t: 22.58, name: "cool_violet", dur: 4.2 },
    { t: 26.79, name: "maw", dur: 0.42 },
    { t: 26.79, name: "palm", dur: 2.5 },
    { t: 26.9, name: "eaten", dur: 2.4 },
    { t: 27.21, name: "maw_hold", dur: 2.08 },
    { t: 29.0, name: "wipe", dur: 0.3 },
    { t: 29.29, name: "restore", dur: 0.71 },
    { t: 29.29, name: "statue", dur: 0.71 },
  ],
  // Lower half, one at a time, off the seal. Raphael opens "Answer." (easter egg 1); Rimuru's line at 206 f (8.58 s).
  // The 15-line pool feeds the one pool bubble; the three bible lines are fixed.
  bubbles: [
    { t: [3.4, 5.4], text: "Answer. Unique Skill acquired: Predator. Host will evolve.", who: "narr", side: "c", tone: "think" },
    { t: [8.58, 11.0], text: "Raphael-sama, this island is literally my creation.", who: "seal", side: "l", tone: "say" },
    { t: [13.79, 16.2], text: "Answer. Bare metal x86_64. No POSIX. No libc. Memory, files and scheduler on one sphere.", who: "narr", side: "c", tone: "think" },
    { t: [16.3, 18.4], text: "Answer. Return to the island: route calculated.", who: "narr", side: "c", tone: "think" },
    { t: [19.6, 22.2], pool: "lines", who: "seal", side: "r", tone: "say" },
  ],
  // 15-line pool, Rimuru's register: calm, sincere, never seal-humour.
  lines: [
    "I won't let anyone I protect be taken.",
    "Every one of you has a place here.",
    "Then I'll build it myself.",
    "Raphael-sama, show me the route home.",
    "A world where no one is left behind.",
    "I was nothing once. Now I am the one who stays.",
    "Take your time. We have all of it.",
    "This land remembers every one of you.",
    "Strength is only a reason to be gentle.",
    "Hold on. I am right here.",
    "Let's make something that outlasts us.",
    "Nothing is lost. It is only waiting to be found.",
    "We began as a drop of water. Look at us now.",
    "Whatever comes, this is where we answer it.",
    "Come home. The light is on.",
  ],
  // SFX lettering: white fill, stroke #12306a, skewed, placed off the seal (the seal stays centre).
  sfx: [
    { t: [1.0, 1.7], text: "PLOP", at: [0.22, 0.3], size: 1.0, rot: -8, col: "#ffffff", ink: "#12306a" },
    { t: [1.5, 2.2], text: "ZUUN", at: [0.78, 0.25], size: 1.1, rot: 8, col: "#ffffff", ink: "#12306a" },
    { t: [2.92, 3.7], text: "GOGOGO", at: [0.2, 0.2], size: 1.1, rot: -6, col: "#ffffff", ink: "#12306a" },
    { t: [3.0, 3.7], text: "Kwahaha!", at: [0.82, 0.18], size: 0.55, rot: 6, col: "#ffd23a", ink: "#12306a" },
    { t: [4.42, 5.2], text: "PUWAAN", at: [0.8, 0.3], size: 1.1, rot: -8, col: "#ffffff", ink: "#12306a" },
    { t: [6.42, 7.0], text: "KIIN", at: [0.78, 0.22], size: 1.0, rot: 8, col: "#ffffff", ink: "#12306a" },
    { t: [8.04, 8.7], text: "SHAN", at: [0.2, 0.28], size: 1.1, rot: -8, col: "#ffffff", ink: "#12306a" },
    { t: [9.42, 10.0], text: "Kwahaha!", at: [0.8, 0.2], size: 0.55, rot: 6, col: "#ffd23a", ink: "#12306a" },
    { t: [10.0, 10.9], text: "ZAAAA", at: [0.22, 0.22], size: 1.3, rot: -8, col: "#ffffff", ink: "#12306a" },
    { t: [13.79, 14.8], text: "KIRA KIRA KIRA", at: [0.3, 0.18], size: 1.0, rot: -6, col: "#ffffff", ink: "#12306a" },
    { t: [18.54, 19.1], text: "PON", at: [0.78, 0.28], size: 1.1, rot: 8, col: "#ffffff", ink: "#12306a" },
    { t: [26.79, 27.7], text: "GURURU", at: [0.2, 0.2], size: 1.3, rot: -8, col: "#ffffff", ink: "#12306a" },
    { t: [29.29, 29.9], text: "PLOP", at: [0.78, 0.3], size: 1.0, rot: 8, col: "#ffffff", ink: "#12306a" },
  ],
  // The credit plays inside the pocket over the calm lattice (shot 10, 542-643 f).
  credit: {
    t: [22.7, 26.7],
    text: "Epsilon-Hollow · lab\nMemory, files and scheduler, on one sphere. · Rust · bare metal x86_64 · no POSIX · no libc",
  },
};
