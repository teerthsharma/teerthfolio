// SCENE DATA for p-tangle (Your Name, kataware-doki + comet Tiamat + the red cord of musubi).
// DIRECTION agent. Pure data. This file is the SINGLE SOURCE OF TRUTH for cue names and times:
// world / cast / fx read them as `cue.on(name)`, `cue.k(name)`, `cue.arg(name, key, default)`.
// Bible: scripts/p-tangle.md. Times are SCENE seconds (the bible's "scene s", the warped clock of the move:
// link 7.9, comet split 8.4, impact 9.7, pull 9.72-10.2, bow 10.3, dusk 11.3-17, retract 15.2-16.4,
// title 15.5-18.5, dissolve 16.0-18.4, hand-back 18.4). Run time 19.2 s.
//
// STAGE (world-space, metres at rig scale 1; the seal faces +z, the lake lies ahead). Also under `stage` below:
//   seal   [0,0,0] yaw 0
//   girl   [3.2,0,8.5] a small costumed seal (Mitsuha) on the islet; cast computes her yaw to face the seal
//   sun    [-30,2.2,160] low on the horizon, ahead and a little left: the kataware-doki glow centres on the rim notch
//   comet  starts over [18,70,140] and falls toward the islet; piece 3 (the red ember) strikes at stage.impactAt
//   cord   from the seal's near flipper (chest height) to the girl's flipper; loop A at the seal, loop B arcs in from the girl

// Consolidate: cue names the layers read, at the bible times (agreement with the layers' fallbacks).
const LAYER_CUES = [
  { t: 14, name: "pull" },
  { t: 22.4, name: "retract" },
  { t: 1.25, name: "cord-tie" },
  { t: 3, name: "mitsuha-in" },
  { t: 13.9, name: "comet-impact" },
  { t: 15.2, name: "bow-pop" },
  { t: 19.4, name: "mitsuha-fade" },
];

export default {
  id: "p-tangle",
  title: "Your Name",
  anime: "Your Name",
  style: "your-name",
  look: {
    // Shinkai light: thin coloured line on characters only, strong glow, cool top and warm bottom, no lifted blacks.
    post: { bloom: 1.0, diffuse: 0.28, sat: 1.1, grain: 0.02, vig: 0.2, ca: 0.25, kuwa: 2, gain: [0.98, 1.0, 1.04], haze: "#c389b8", hazeAmt: 0.5, hazeNear: 40, hazeFar: 420 },
    lines: { set: 0 },
    fill: { rim: 0.5, ring: 0 }, // rim mix 0.5 on the locked seal (bible 3.7); the pup outline stays #4a3f3c
  },
  fps: 12, // seals on twos; cord loops on threes (fx steps itself to 8); sky and water continuous
  duration: 19.2,
  seed: 4401,
  far: 1600,
  plates: true,
  bg: "#274974",

  palette: {
    // kataware-doki ramp, sampled from style-refs/your-name/05 (S)
    zenith: "#274974", upper: "#3c5a9b", violet: "#5f61ab", pink: "#c389b8", peach: "#f5d4cf", horizon: "#fbe1cc",
    cloudSea: "#eab2bc", cloudShade: "#b87ba8", range: "#8c80c0", fleck: "#d89ac0", star: "#c8d8ff",
    // lake 03
    glare: "#fdfcff", farShore: "#5f7890", cedar: "#273e30", cedarMid: "#3f6a40", cedarLit: "#8fb04a", shaft: "#c46a3a",
    deep: "#08203e", lakeMid: "#1a4a6c", bounce: "#ff9a80",
    rock: "#473b3f", rockLit: "#833544", rim: "#d56a6a", silhouette: "#3a2537", legWash: "#813b55",
    // the cord (04)
    cord: "#e8552e", cordCore: "#8c2a24", cordHot: "#ff3c4e", cordRed: "#e0243c", cordShadow: "#6a0a1c", cordGlow: "#ff5a5a", cordHi: "#ffb4a0",
    // comet (08)
    cometCore: "#b0c8f8", cometHead: "#9bfeff", cometMag: "#d04ab8", cometGreen: "#2fe0b0", cometOuter: "#2964b7", ember: "#ff4a3a", night: "#192b3e",
    // seal light in twilight (bible 3.7)
    sealShade: "#6a78d8", sealShade2: "#8a6ad0", sealKey: "#ffa070", sealRim: "#ffc08a", sealBounce: "#ff7a9a", sealSheen: "#fff0e0",
    // Mitsuha
    mitsuBody: "#7a6a78", mitsuBelly: "#e8d8c8", hair: "#1a192e", hairHi: "#5a6a88", blouse: "#f4efe6", blouseShade: "#b8a6cf",
    vest: "#958075", skirt: "#3c293d", bow: "#e34a4a", bowShade: "#7a4f5d", socks: "#2a2540", button: "#d8362c",
    irisTop: "#3a2f48", irisBot: "#8a6aa0", blush: "#e0608a",
    // fireflies, tag, flare, bubble
    petal: "#f0ffc0", gold: "#ffc880", paper: "#f6efe2", tagInk: "#2a1c30", flare: "#ffe0a8", streak: "#f0a0d0",
    // credit sky
    night0: "#0c1448", night1: "#141e5c", night2: "#1e2c78", cream: "#fff6e6", dissolveEdge: "#ffd6a0",
    // keys the template shipped with
    sky: "#274974", ground: "#473b3f", key: "#ffa070", accent: "#e8552e", ink: "#17141f",
  },

  stage: {
    seal: [0, 0, 0],
    girl: [3.2, 0, 8.5],
    girlScale: 0.55, // of the hero (bible 4)
    sun: [-30, 2.2, 160],
    cometFrom: [18, 70, 140],
    impactAt: [3.2, 0.2, 8.5],
    cordLength: 9.2,
  },

  // dusk drain (bible 6): the ramp slides from kataware-doki to night over this window
  dusk: { t: [11.3, 17.0] },

  seal: {
    at: [0, 0, 0], yaw: 0, scale: 1,
    moves: [
      { t: [1.4, 1.55], to: [0, 0.04, 0] }, // the 0.04 m hop while tying the cord
      { t: [1.55, 1.8], to: [0, 0, 0] },
    ],
    track: [
      { t: 0.15, pose: "raise", dur: 0.9, hold: 0.1, out: 0.25, k: 0.8 },    // near flipper rising, upright on the tail, facing the lake
      { t: 1.25, pose: "raise", dur: 0.55, hold: 0, out: 0.1, k: 0.55 },     // ties the cord
      { t: 1.8, pose: "sign", dur: 0.5, hold: 2.3, out: 0.4, k: 1 },         // the claim is signed
      { t: 4.6, pose: "fist", dur: 0.5, hold: 4.4, out: 0.3, k: 1 },         // fist before the cheek, held through the link
      { t: 8.2, pose: "blink", dur: 0.18, hold: 0, out: 0.1, k: 1 },
      { t: 9.72, pose: "crouch", dur: 0.12, hold: 0.36, out: 0.2, k: 0.45 }, // strain at the taut cord, eyes shut 3 frames
      { t: 10.2, pose: "raise", dur: 0.4, hold: 0.9, out: 0.3, k: 0.5 },     // rises and holds, small determined smile
      { t: 11.7, pose: "sign", dur: 0.4, hold: 2.6, out: 0.3, k: 0.8 },      // line C
      { t: 15.2, pose: "raise", dur: 0.3, hold: 0.9, out: 0.3, k: 0.9 },     // draws the cord back
      { t: 16.8, pose: "idle", dur: 0.4, hold: 1.2, out: 0.3, k: 1 },
      { t: 18.4, pose: "blink", dur: 0.2, hold: 0, out: 0.2, k: 1 },         // fist releases at the hand-back; the cord stays tied
    ],
    // expression hints for any layer that dresses the seal's face: calm (A), resolute (B), strain (shock), satisfied (C)
    expression: [{ t: 0, e: "calm" }, { t: 7.8, e: "resolute" }, { t: 9.7, e: "strain" }, { t: 10.2, e: "resolute" }, { t: 11.7, e: "satisfied" }],
  },

  // ---- the camera law: wide, free lake, arc, free comet, kill, free x2, wide (credit), arc, home. Every shot <= 5 s. ----
  // free eyes are world-space [from, to]; the director keeps the seal in frame and at least minFrac of frame height.
  // pal = the bible's 5 hex for the shot (the colour script); dominant = what the frame should read as.
  shots: [
    { n: 1, t: [0, 3.0], law: "wide", // dimension bubble swells, cord wraps 1.25-1.8; pull back and up
      az: [0.55, 0.85], r: [4, 14], elev: [1, 8], fov: [28, 44], look: [[0, 0.25, 0.2], [0, 1.4, 3]],
      pal: ["#ffc880", "#ff7a8a", "#e0243c", "#6b4fb0", "#2a3f9c"], dominant: "coral-gold to violet" },
    { n: 2, t: [3.0, 6.4], law: "free", // low wide, seal in the left third, the girl in the right third, slow push (05 profile)
      eye: [[-10, 0.9, 4.0], [-8.2, 0.85, 4.1]], lookAt: [[0.4, 1.3, 4.4], [0.2, 1.2, 4.3]], fov: [38, 33], dutch: 0, minFrac: 0.05,
      pal: ["#274974", "#5f61ab", "#c389b8", "#f5d4cf", "#fbe1cc"], dominant: "violet to cream, kataware-doki" },
    { n: 3, t: [6.4, 8.3], law: "arc", // arc into the seal; loops glide, B drops through A, link at 7.9
      az: [1.05, 0.55], r: [5.2, 2.97], elev: [2.6, 2.0], fov: [40, 46], look: [[0, 0.1, 1.2], [0, 0.35, 0.8]],
      pal: ["#e0243c", "#ff5a5a", "#ffd6a0", "#2b6fc4", "#6b4fb0"], dominant: "cord red on violet" },
    { n: 4, t: [8.3, 9.7], law: "free", // tilt up to the comet, low track of the falling piece; the seal stays low in frame
      eye: [[-1.3, 0.35, -2.6], [-0.8, 0.4, -2.2]], lookAt: [[0.6, 2.6, 9], [2.2, 1.2, 8.6]], fov: [44, 38], dutch: [0, 3], minFrac: 0.05,
      pal: ["#192b3e", "#b0c8f8", "#d04ab8", "#2fe0b0", "#ff4a3a"], dominant: "night blue, banded comet" },
    { n: 5, t: [9.7, 11.6], law: "kill", // the kill angle: low three-quarter, cord taut across frame; snap in
      az: [-0.45, -0.7], r: [2.8, 2.0], elev: [0.8, 0.7], fov: [28, 24], look: [[0, 0.05, 0.7], [0, 0.05, 0.5]], dutch: [0, 6], ease: "snap",
      pal: ["#e0243c", "#8c2a24", "#3c5a9b", "#5f61ab", "#f5d4cf"], dominant: "rose and red" },
    { n: 6, t: [11.6, 14.3], law: "free", // medium-wide, the bow glowing, burst at the girl's hand, sun sinks, flare cross
      eye: [[-6.2, 1.4, 1.2], [-5.4, 1.2, 2.2]], lookAt: [[0.8, 1.2, 4.6], [1.4, 1.3, 5.2]], fov: [34, 31], dutch: 0, minFrac: 0.05,
      pal: ["#fbe1cc", "#f5d4cf", "#c389b8", "#e0243c", "#ffd6a0"], dominant: "rose, cream, flare" },
    { n: 7, t: [14.3, 15.5], law: "free", // profile of small Mitsuha across the water, flipper to her cord, fading
      eye: [[-3.4, 0.7, 2.2], [-3.0, 0.7, 2.6]], lookAt: [[2.4, 0.9, 7.2], [2.6, 0.9, 7.6]], fov: [30, 28], dutch: 0, minFrac: 0.05,
      pal: ["#5f61ab", "#3a2537", "#813b55", "#1e2c78", "#ffc08a"], dominant: "deepening blue, backlit" },
    { n: 8, t: [15.5, 17.4], law: "wide", // credit wide: pull back and up; the credit plays in the pocket
      az: [0.6, 0.9], r: [6, 13], elev: [2.2, 8], fov: [34, 42], look: [[0, 0.3, 1.5], [0, 1.5, 4]],
      pal: ["#0c1448", "#141e5c", "#1e2c78", "#fff6e6", "#ffd6a0"], dominant: "night blue, thin cream serif" },
    { n: 9, t: [17.4, 18.4], law: "arc", // slow arc behind and above; the cord ties itself; the dimension thins
      az: [2.5, 3.0], r: [4.6, 4.0], elev: [3.2, 3.8], fov: [34, 36], look: [0, 0.2, 2.0],
      pal: ["#1e2c78", "#4a4a9a", "#ffd6a0", "#a4d0ee", "#e0243c"], dominant: "deep blue, dissolve gold" },
    { n: 10, t: [18.4, 19.2], law: "home", // one short wipe to the chase pose, behind and above in open ground
      pal: ["#1e2c78", "#3c5a9b", "#fbe1cc", "#8fb04a", "#e0243c"], dominant: "island palette, the red cord stays" },
  ],

  // ---- beats. CUE NAMES (single source of truth; times in scene s) -------------------------------------------------
  //  dimension     0-2.4     world: sky shell fresnel rim #ffc880 swells then thins (alpha .35 to 1.0)
  //  cordTie       1.25-1.8  cast/fx: the cord wraps the seal's flipper
  //  cordDraw      1.7-3.7   fx: strand draws on across the lake; flutter .16 m slackening to .024 m when taut
  //  girlIn        2.0-3.3   cast: Mitsuha fades in upright in profile, arms slack
  //  ghosts        1.9-3.2   fx: the five pale hexagon lens ghosts (#ffb273 to #8da6ff)
  //  fireflies     2.0-9.0   fx: petal specks drift; glints on the water
  //  poster        2.9-3.1   fx: the poster 4-point flare cross at frame centre (egg 1)
  //  chime         3.0       tick
  //  shafts        3.0-8.3   fx/world: 4 diagonal rust shafts #c46a3a at 14 percent
  //  loopsLight    4.6-5.8   fx: loops A and B light up
  //  girlRaise     4.6-7.9   cast: Mitsuha raises a flipper to her cord
  //  loopBDrop     6.6-7.9   fx: B arcs high and drops through A
  //  link          7.9-8.4   all: freeze 6 frames at 24 fps (arg freeze .25 s); 4-point glint and one pink hex ghost
  //  linkBurst     7.9-8.6   fx: 64 sparkles #ffd6a0 (args count, col)
  //  rippleLink    7.9-9.0   world: ripple ring
  //  cometSplit    8.4-9.7   fx: the comet splits in 2 then 3; piece 3 is the red ember; falls
  //  girlBlown     9.7-10.2  cast: blown-back lean (8 frames), eyes wide, 2 frames of anticipation
  //  rippleImpact  9.7-10.6  world: ripple at the islet, far shore lit
  //  cordTaut      9.72-10.2 fx/cast: taut; Mitsuha dragged .4 m toward the seal, hair cord streaming
  //  ripplePull    9.92-10.8 world
  //  bowPop        10.3-10.75 fx: musubi bow pops (.3 overshoot) with the hanko tag (seal stamp, zero tally marks)
  //  girlKneel     10.2-13.4 cast: kneels, flippers at chest
  //  duskDrain     11.3-17.0 world/fx: the ramp slides to night
  //  flareCross    11.6-14.6 fx: flare cross and anamorphic streak on the sun
  //  burst         11.7-12.4 fx: burst at the girl's hand
  //  kimiNoNaWa    13.4-13.9 fx: faint sound-text in the glare (egg 3; also an sfx entry)
  //  girlFade      13.4-14.8 cast: fades as the light thins
  //  girlCord      14.3-15.5 cast: flipper to her cord (profile)
  //  cordRetract   15.2-16.4 fx/cast: the cord is drawn back
  //  rippleRetract 15.2-16.0 world
  //  titleCard     15.5-18.5 world/fx: thin serif card in the sky with the word tasokare (egg 7)
  //  dissolve      16.0-18.4 world/fx: near-first dissolve, edge #ffd6a0
  //  cordTie2      17.4-18.4 fx/cast: the cord ties itself on the flipper (egg 8)
  //  handback      18.4-19.2 all: the cord stays tied
  //  wipe          18.4-18.6 world/fx: the one short wipe
  // Reserved (player): impact, speedlines, shock, trauma, pose.
  beats: [
    ...LAYER_CUES,
    { t: 0.0, name: "dimension", dur: 2.4 },
    { t: 1.25, name: "cordTie", dur: 0.55 },
    { t: 1.7, name: "cordDraw", dur: 2.0 },
    { t: 1.9, name: "ghosts", dur: 1.3 },
    { t: 2.0, name: "girlIn", dur: 1.3 },
    { t: 2.0, name: "fireflies", dur: 7.0 },
    { t: 2.9, name: "poster", dur: 0.2 },
    { t: 3.0, name: "chime", dur: 0.3 },
    { t: 3.0, name: "shafts", dur: 5.3 },
    { t: 4.6, name: "loopsLight", dur: 1.2 },
    { t: 4.6, name: "girlRaise", dur: 3.3 },
    { t: 6.6, name: "loopBDrop", dur: 1.3 },
    { t: 7.9, name: "link", dur: 0.5, freeze: 0.25 },
    { t: 7.9, name: "linkBurst", dur: 0.7, count: 64, col: "#ffd6a0" },
    { t: 7.9, name: "rippleLink", dur: 1.1 },
    { t: 7.9, name: "shock", dur: 0.6, at: [0.5, 0.5], amp: 0.018, r1: 0.45 },
    { t: 8.4, name: "cometSplit", dur: 1.3 },
    { t: 9.7, name: "impact", seq: [[2, 2], [1, 1], [2, 2]] }, // a hold plus a light change, not a smash
    { t: 9.7, name: "girlBlown", dur: 0.5 },
    { t: 9.7, name: "rippleImpact", dur: 0.9 },
    { t: 9.7, name: "trauma", amount: 0.45 },
    { t: 9.72, name: "speedlines", dur: 0.5, kind: "radial", at: [0.5, 0.45], strength: 0.7, col: "#ffd6a0" },
    { t: 9.72, name: "cordTaut", dur: 0.48 },
    { t: 9.92, name: "ripplePull", dur: 0.9 },
    { t: 9.92, name: "shock", dur: 0.5, at: [0.55, 0.52], amp: 0.03, r1: 0.5 },
    { t: 10.2, name: "girlKneel", dur: 3.2 },
    { t: 10.3, name: "bowPop", dur: 0.45 },
    { t: 10.3, name: "trauma", amount: 0.15 },
    { t: 11.3, name: "duskDrain", dur: 5.7 },
    { t: 11.6, name: "flareCross", dur: 3.0 },
    { t: 11.7, name: "burst", dur: 0.7 },
    { t: 11.7, name: "shock", dur: 0.7, at: [0.62, 0.52], amp: 0.02, r1: 0.5 },
    { t: 13.4, name: "kimiNoNaWa", dur: 0.5 },
    { t: 13.4, name: "girlFade", dur: 1.4 },
    { t: 14.3, name: "girlCord", dur: 1.2 },
    { t: 15.2, name: "cordRetract", dur: 1.2 },
    { t: 15.2, name: "rippleRetract", dur: 0.8 },
    { t: 15.5, name: "titleCard", dur: 3.0 },
    { t: 16.0, name: "dissolve", dur: 2.4 },
    { t: 17.4, name: "cordTie2", dur: 1.0 },
    { t: 18.4, name: "handback", dur: 0.8 },
    { t: 18.4, name: "wipe", dur: 0.2 },
  ],

  // ---- bubbles: lower half, one at a time, never over the seal. A (Land), B (Seal), C (Land) from the bible ----
  bubbles: [
    { t: [0.2, 1.1], pool: "lines", who: "seal", side: "l", tone: "think" },
    { t: [3.1, 6.2], text: "Is the knot real?", who: "narr", side: "r", tone: "say" },
    { t: [8.0, 9.4], text: "It's linked. I can prove it, or I won't say it.", who: "seal", side: "l", tone: "say" },
    { t: [11.8, 14.2], text: "0 wrong certificates in 2,000 diagrams and 80 scenes.", who: "narr", side: "c", tone: "shout" },
  ],

  // the 15-line character-voiced pool (L12): the seal that certifies or refuses
  lines: [
    "Two loops. One cord.",
    "A certificate exists only while they stay linked.",
    "Pull it. It holds.",
    "Certified, or it refuses.",
    "Twilight is when you can see who is there.",
    "I tied this one myself.",
    "No linking, no stamp.",
    "Two thousand diagrams, and it never lied.",
    "The cord does not care how far.",
    "Say my name and I will answer.",
    "It did not slip. Not once.",
    "Count the strands. Three.",
    "The light thins. The knot stays.",
    "What is tied stays tied.",
    "Refuse, rather than be wrong.",
  ],

  // sfx lettering (the overlay moves it off the seal)
  sfx: [
    { t: [0.6, 1.8], text: "MUSUBI", at: [0.2, 0.2], size: 54, rot: -6, col: "#ffd6a0", ink: "#6b4fb0" },
    { t: [3.0, 3.8], text: "chime", at: [0.7, 0.22], size: 30, rot: 4, col: "#fff6e6", ink: "#5f61ab" },
    { t: [7.9, 8.8], text: "CLINK", at: [0.75, 0.25], size: 64, rot: -8, col: "#fff6e6", ink: "#e0243c" },
    { t: [8.5, 9.6], text: "SHEEEE", at: [0.3, 0.2], size: 48, rot: 5, col: "#b0c8f8", ink: "#2964b7" },
    { t: [9.7, 10.4], text: "DOON", at: [0.72, 0.3], size: 78, rot: -5, col: "#ffd6a0", ink: "#8c2a24" },
    { t: [9.9, 10.5], text: "GUN", at: [0.25, 0.28], size: 56, rot: 6, col: "#fff6e6", ink: "#e0243c" },
    { t: [10.3, 11.0], text: "KIIIN", at: [0.78, 0.2], size: 44, rot: -4, col: "#ffc08a", ink: "#8c2a24" },
    { t: [11.7, 12.5], text: "PAAN", at: [0.8, 0.25], size: 62, rot: 4, col: "#fff6e6", ink: "#c389b8" },
    { t: [13.4, 14.2], text: "KIMI NO NA WA?", at: [0.5, 0.22], size: 26, rot: 0, col: "#fff6e6", ink: "#5f61ab" },
    { t: [14.4, 15.4], text: "kon", at: [0.74, 0.3], size: 28, rot: -3, col: "#c8d8ff", ink: "#1e2c78" },
    { t: [18.4, 19.1], text: "chime", at: [0.2, 0.22], size: 26, rot: 3, col: "#fff6e6", ink: "#1e2c78" },
  ],

  // credit plays inside the pocket (thin serif title lockup)
  credit: {
    t: [15.6, 18.3],
    text: "teerthsharma/tangle · 0 wrong certificates",
    sub: "2,000 diagrams · 80 scenes · 247 photographs · two loops that cannot be pulled apart",
  },
};
