// SCENE DATA for pr-mujoco-warp-1541: Dragon Ball Z, Frieza ("the forest is the final form"). DIRECTION layer.
// Bible: scripts/pr-mujoco-warp-1541.md (24 fps frames; here in seconds: s = f / 24). 14.0 s = 336 f.
// Pure data, no imports. THIS FILE IS THE SINGLE SOURCE OF TRUTH FOR CUE NAMES AND TIMES.
//
// ---- CUE SHEET (read in layers as cue.on(n) / cue.k(n) / cue.arg(n,key,default) / cue.since(n) / cue.done(n)) ----
// Reserved (the player draws them; layers may also read them to sync motion): impact speedlines shock trauma pose
// Continuous curves, computed by build.js and written onto every cue object (data below in `curves`):
//   cue.power   0..1.5   the shell power (aura envelope, shudder amount, lightning density, scouter tick, victim recoil)
//   cue.violet  0..1     the sky violet shift (zenith -> #7a3fb8): f96-f168 in, f216-f270 out
//   cue.sealScale 1..1.4 the hero's scale (1 + 0.4 ramp f72-f144); also written to the seal handle
//   cue.shell   0..1.55  the horned shell's scale (0 before f72, 1.55 by f100, 0 from the crack f168)
//   cue.gold    0|1      1 from the crack (aura, rims and lights go gold)
//   cue.reading 1.0..1.4 the scouter number
//   cue.crack   seconds since the crack (7.0); negative before
// Beats (free cues), name -> meaning:
//   floor-build   the 484 cells rise in rows (arg stagger = 0.035 s per row)         0.0-1.25
//   commander-boast  arms folded, chin up (Frieza stance)                            0.0-2.5
//   pod-show      the hover pod beside the commander (two windows: 0-2.5, 8.33-11.25)
//   cell-pulse    cells pulse #ffa285 -> #fff3c2; the diagonal gold edge starts      1.5-3.0
//   shell-grow    shell 0 -> 1.55 (power-up begins), horns low on the flanks         3.0-4.17
//   aura-violet   violet aura grows, 40% at the start of the beat -> 100%            4.0-7.0
//   sky-violet    sky tint in (4.0-7.0); sky-restore out (9.0-11.25)
//   soldier-recoil arg i 0..7 (A..H): stagger back 0.3 m, flippers over the eyes     3.75 + i/12, dur 1.0
//   commander-cover narrows eyes, one flipper rises to cover                         3.0-6.0
//   debris-lift   16 rocks lift slowly (0.3 m/s)                                     4.58-7.0
//   lightning-fork 5 bolts, forks, reseeded on twos; arg peak=1 from f144            4.58-7.0
//   scouter-tick  digits 1.0 -> 1.4                                                  3.0-7.0 ; scouter-484 6.67 (the lens flashes "484")
//   crack-glow    cracks glow gold along the shell                                   6.0-7.0
//   crack         THE moment (f168): shell gone, 28 shards, hero raise, soldiers pushed 0.6 m
//   white-flash   f170 full white (1 frame), then gold bloom                         7.083-7.17
//   star-flare    the 4-point star at the flash                                      7.0-7.5
//   shockwave-dome the refractive dome + ring                                        7.083-8.0
//   shard-burst   28 outlined shell shards, speed 4.4 m/s, up 2.6, g 6               7.0-8.3
//   ground-crack  5 fissure arms spread to 4 m in 6 frames                           7.083-7.33 (then held)
//   aura-gold     gold aura, blows out to 1.5x then returns                          7.0-14.0
//   commander-blown  commander thrown 1.2 m, spinning; down until commander-situp    7.0 dur 1.0 ; situp 11.5
//   soldiers-blown  two flip back (idx 2, 5), six land on their tail; pushed 0.6 m   7.0 dur 0.8
//   scouter-crack 4-frame fracture overlay                                           7.0-7.17 ; scouter-pop 7.17 (arg i = 3)
//   hop           the hero hop (smear 7.5-7.67; apex 7.83; land 8.17)                7.5-8.17
//   cell-slide    rows slide into the diagonal, smoothstep, non-diagonal fade 7.7-9.1  7.5-9.0
//   debris-fly    rocks fly outward                                                  7.0-8.3
//   ink-ring      cream ring with ink outline                                        8.5-9.17
//   soldiers-sit  victims sit up and watch the diagonal rise                         8.33-11.25
//   tree-lift     22 cells lift (0.6 m arcs) 7.7 -> 9.5, 0.006 stagger; pop-in squash on landing
//   forest-sway   trees sway after 9.83; star-sparkle on canopies                    9.83-14.0
//   commander-situp  the commander sits up and stares at the forest                  11.5-12.5
//   gold-rim      the gold rim on the seal, light sparkle                            11.5-14.0
// Consolidate: cue names the layers read, at the bible times (agreement with the layers' fallbacks).
const LAYER_CUES = [
  { t: 3.75, name: "recoil" },
  { t: 8.33, name: "forest" },
  { t: 7.5, name: "slide" },
];

export default {
  id: "pr-mujoco-warp-1541",
  title: "Dragon Ball Z, Frieza",
  anime: "Dragon Ball Z, Frieza (Toei)",
  style: "modern-anime",
  // Toei cel: ink #1b1530, saturated no-lift grade, glow 0.7 radius 6 only above 1.0, aberration at the impacts only,
  // grain 0.025, vignette 0.12; DOF off. Keys follow the style schema { post, lines, fill }.
  look: {
    post: { bloom: 0.7, bloomThreshold: 1.0, grain: 0.025, vignette: 0.12, lift: 0 },
    lines: { color: "#1b1530", width: 3.0 },
    fill: { tones: 2 },
  },
  fps: 12, // characters, aura and lightning on twos; the camera runs at display rate (ones)
  duration: 14, // 336 f at 24 fps
  seed: 1541,
  plates: true,
  palette: {
    sky: "#2fa88a", skyTop: "#1f8f7a", skyHorizon: "#e9f7a8", skyViolet: "#7a3fb8",
    ground: "#35b6a4", groundLit: "#58d4e0", groundShadow: "#2a8f9c", groundDeep: "#1d6676",
    rockLit: "#3fb8c0", rockShadow: "#1d6676", rockDeep: "#103a4a",
    coral: "#ff7a6b", coralLit: "#ffa285", coralShadow: "#d9483f", coralDeep: "#8f2230", coralInk: "#5a1620",
    friezaWhite: "#efe6f2", friezaMid: "#cdbfe0", friezaShadow: "#9b86c4", friezaPurple: "#7a3fb8",
    armourLit: "#a469e0", armourShadow: "#4a2878", armourDeep: "#2a1450", shoulder: "#c590f0", trim: "#f2b01e",
    gold: "#ffd84a", goldLit: "#fff3c2", goldCore: "#fffbe0", goldDeep: "#b8741a",
    scouter: "#7be07a", scouterShadow: "#3fb870",
    canopyLit: "#8fe0b8", canopyMid: "#5fc29a", canopyShadow: "#3f9f8a", trunk: "#6b4f9c",
    key: "#fff3c2", accent: "#ffd84a", ink: "#1b1530", inkSoft: "#22163f", cream: "#fbfaf7",
    ring: "#ffd9c8",
  },
  // geometry the layers share (figure frame; the seal stands at the origin facing +z, the floor is behind it at -z)
  stage: {
    floorCentre: [0.9, 0.03, -1.6], floorSize: 6.6, cells: 22, pitch: 0.3,
    soldierRing: 4.6, soldierScale: 0.55, commanderScale: 0.7, commanderAt: [-3.6, 0, -4.8],
    forestBox: { x: [-1.9, 3.7], z: [-4.3, 0.9] }, forestKeepOut: 1.15, trees: 22, sunDir: [1, 0.47, 0.2],
  },
  curves: {
    // [t, value] keys, smoothstep between them; build.js evaluates and writes the value onto cue.<name>
    power: [[0, 0], [3.0, 0], [4.0, 0.25], [4.58, 0.4], [6.0, 1.0], [7.0, 1.0], [7.083, 1.5], [7.5, 1.0], [9.0, 0.7], [11.5, 0.5], [14, 0.4]],
    violet: [[0, 0], [4.0, 0], [7.0, 1], [9.0, 1], [11.25, 0], [14, 0]],
    sealScale: [[3.0, 1.0], [6.0, 1.4]],
    shell: [[3.0, 0], [4.17, 1.55]], // zero from the crack (7.0)
    reading: [[3.0, 1.0], [6.0, 1.4]],
  },
  // hero: starts facing the camera (+z), hops (7.5-8.17), then turns to face the forest so the home shot sits in open ground
  seal: {
    at: [0, 0, 0], yaw: 0, scale: 1,
    moves: [
      { t: [7.5, 7.83], to: [0, 0.8, 0] },
      { t: [7.83, 8.17], to: [0, 0, 0] },
      { t: [8.4, 9.4], to: [0, 0, 0], yaw: Math.PI },
    ],
    track: [
      { t: 0, pose: "sign", dur: 0.3, hold: 2.6, out: 0.1 }, // f0-60 upright, flippers tucked
      { t: 3.0, pose: "crouch", dur: 0.875, hold: 3.1, out: 0.05 }, // f72-93 crouch, held through the shudder
      { t: 7.0, pose: "raise", dur: 0.12, hold: 7.0, out: 0.2 }, // the crack: both flippers out, held to the end
    ],
  },
  // The camera law. wide -> arc (x3) -> kill -> free (the slide) -> free (the wide again) -> home. All cuts <= 2.5 s.
  // r and elev are multiplied by the seal's scale by the director (1 -> 1.4), so numbers here are for scale 1.
  shots: [
    // 1 establishing wide, f0-36: pull back and up from (2,3.5,5) to (3,7.5,9)
    { n: 1, t: [0, 1.5], law: "wide", az: 0.35, r: [5.4, 9.5], elev: [3.1, 7.1], fov: [36, 42], look: [[0.4, 0.1, -0.6], [0.5, 0.1, -0.8]], ease: "smooth" },
    // 2 the floor speaks, f36-72: 50 mm at (0.9,2.2,3.4), a 0.6 m push
    { n: 2, t: [1.5, 3.0], law: "arc", az: [0.26, 0.2], r: [3.5, 2.9], elev: [1.8, 1.7], fov: 28, look: [0, 0.15, -0.7], ease: "smooth" },
    // 3 the crouch and the shell, f72-120: low, 18 degrees camera-left round to the front, 0.4 m push
    { n: 3, t: [3.0, 5.0], law: "arc", az: [0.32, 0], r: [3.0, 2.6], elev: [0.1, 0.15], fov: 34, look: [0, 0.5, 0], ease: "smooth" },
    // 4 escalation, f120-168: orbit on ones, 28 mm, trauma ramps (beats), speed lines from f144
    { n: 4, t: [5.0, 7.0], law: "arc", az: [-0.6, 0.6], r: 3.4, elev: 0.9, fov: [40, 34], look: [0, 0.5, 0], ease: "linear" },
    // 5 the crack, f168-180: low kill angle, 0.8 m dolly in over 12 f, 6 degree dutch
    { n: 5, t: [7.0, 7.5], law: "kill", az: [-0.1, -0.3], r: [2.0, 1.4], elev: 0.3, fov: [60, 52], look: [0, 0.3, 0], dutch: [0, 6], ease: "snap" },
    // 6 rows slide, f180-216: mid-high orbit of 25 degrees round the floor, the seal stays in the lower third
    { n: 6, t: [7.5, 9.0], law: "free", eye: [[2.8, 1.8, 3.2], [3.4, 2.0, 2.3]], lookAt: [[0.8, 0.3, -1.0], [0.6, 0.3, -0.9]], fov: [34, 32], ease: "smooth" },
    // 7 the forest, f216-276: pulled up and out with a slight crane (world space: the seal has turned to the forest by now)
    { n: 7, t: [9.0, 11.5], law: "free", eye: [[3.5, 6.5, 8.0], [3.0, 7.2, 9.6]], lookAt: [[0.9, 0.5, -1.4], [0.9, 0.5, -1.4]], fov: [40, 44], ease: "smooth" },
    // 8 hero line and home, f276-336: behind and above the seal (0,2.2,4.0), in open ground, eased to the hand-back pose
    { n: 8, t: [11.5, 14], law: "home", az: Math.PI, r: [3.6, 4.0], elev: [1.8, 2.0], fov: [36, 38], look: [0, 0.2, 3.2], ease: "smooth" },
  ],
  beats: [
    ...LAYER_CUES,
    // ---- shot 1-2: the boast ----
    { t: 0.0, name: "floor-build", dur: 1.25, stagger: 0.035 },
    { t: 0.0, name: "commander-boast", dur: 2.5 },
    { t: 0.0, name: "pod-show", dur: 2.5 },
    { t: 1.5, name: "cell-pulse", dur: 1.5 },
    // ---- shot 3: the crouch and the shell ----
    { t: 3.0, name: "shell-grow", dur: 1.17, to: 1.55 },
    { t: 3.0, name: "commander-cover", dur: 3.0 },
    { t: 3.0, name: "scouter-tick", dur: 4.0, from: 1.0, to: 1.4 },
    { t: 4.0, name: "aura-violet", dur: 3.0, from: 0.4, to: 1.0 },
    { t: 4.0, name: "sky-violet", dur: 3.0 },
    ...Array.from({ length: 8 }, (_, i) => ({ t: 3.75 + i / 12, name: "soldier-recoil", dur: 1.0, i })), // A f90 ... H f104, on twos
    { t: 4.58, name: "debris-lift", dur: 2.42, rocks: 16 },
    { t: 4.58, name: "lightning-fork", dur: 2.42, bolts: 5 },
    // ---- shot 4: escalation ----
    { t: 5.0, name: "trauma", amount: 0.2 },
    { t: 5.8, name: "trauma", amount: 0.28 },
    { t: 6.0, name: "speedlines", dur: 1.5, kind: "radial", at: [0.5, 0.5], strength: 0.85, col: "#fbfaf7" },
    { t: 6.0, name: "crack-glow", dur: 1.0 },
    { t: 6.0, name: "lightning-fork", dur: 1.0, bolts: 5, peak: 1 },
    { t: 6.4, name: "trauma", amount: 0.34 },
    { t: 6.67, name: "scouter-484", dur: 0.2 },
    // ---- shot 5: the crack (f168) ----
    { t: 7.0, name: "impact", seq: [[1, 1], [2, 1]] }, // f168-169 two-tone, then inverted (violet hit on the seal)
    { t: 7.0, name: "crack", dur: 0.1 },
    { t: 7.0, name: "trauma", amount: 0.75 },
    { t: 7.0, name: "shard-burst", dur: 1.3, count: 28, speed: 4.4, up: 2.6, g: 6 },
    { t: 7.0, name: "debris-fly", dur: 1.3 },
    { t: 7.0, name: "aura-gold", dur: 7.0, blow: 1.5 },
    { t: 7.0, name: "star-flare", dur: 0.5 },
    { t: 7.0, name: "soldiers-blown", dur: 0.8, flip: [2, 5], push: 0.6 },
    { t: 7.0, name: "commander-blown", dur: 1.0, dist: 1.2 },
    { t: 7.0, name: "scouter-crack", dur: 0.17 },
    { t: 7.083, name: "white-flash", dur: 0.083 },
    { t: 7.083, name: "ground-crack", dur: 0.25, arms: 5, reach: 4 },
    { t: 7.083, name: "shock", dur: 0.5, at: [0.5, 0.5], amp: 0.05, r1: 0.9 }, // the warp dome in post
    { t: 7.083, name: "shockwave-dome", dur: 0.92 },
    { t: 7.17, name: "scouter-pop", dur: 0.4, i: 3 },
    // ---- shot 6: rows slide ----
    { t: 7.5, name: "hop", dur: 0.67 },
    { t: 7.5, name: "cell-slide", dur: 1.5 },
    { t: 7.7, name: "tree-lift", dur: 1.8, trees: 22, stagger: 0.006, arc: 0.6 },
    { t: 8.33, name: "soldiers-sit", dur: 2.92 },
    { t: 8.33, name: "pod-show", dur: 2.92 },
    { t: 8.5, name: "ink-ring", dur: 0.67 },
    // ---- shot 7: the forest ----
    { t: 9.0, name: "sky-restore", dur: 2.25 },
    { t: 9.83, name: "forest-sway", dur: 4.17 },
    { t: 9.83, name: "star-sparkle", dur: 4.17 },
    // ---- shot 8: hero line and home ----
    { t: 11.5, name: "commander-situp", dur: 1.0 },
    { t: 11.5, name: "gold-rim", dur: 2.5 },
    { t: 13.5, name: "speedlines", dur: 0.5, kind: "speed", at: [0.5, 0.5], strength: 0.3, col: "#fbfaf7" }, // the 12 f wipe home
  ],
  // lower half, one at a time. A: the floor (a "foe" voice, camera-left). B: a line from the pool. C: the numbers.
  bubbles: [
    { t: [1.67, 3.0], text: "This isn't even my final form.", who: "foe", side: "l", tone: "say" },
    { t: [11.5, 12.75], pool: "lines", who: "seal", side: "c", tone: "say" },
    { t: [12.75, 13.42], text: "156.738 us to 101.097 us.", who: "seal", side: "c", tone: "say" },
  ],
  // 15 seal-voiced lines, epic sincerity, each carrying the claim (L12). Index 0 is the bible's line.
  lines: [
    "A forest. Not a pair matrix. 1.513x faster.",
    "Four hundred eighty-four cells, twenty-two that matter. 1.513x faster.",
    "The diagonal was the whole truth. 1.513x faster.",
    "I asked the floor for its final form. It was a forest.",
    "Seven point nine million bytes, a hundred eighty thousand kept. 1.513x.",
    "Everything off the diagonal was only weight.",
    "Each cell stood where it was needed, and the rest let go.",
    "The shell broke because the work was never inside it.",
    "Twenty-two roots, and the whole matrix still holds.",
    "This is what a floor becomes when it stops pretending.",
    "Fewer cells, the same ground. 1.513x faster.",
    "The power was never in more. It was in less, planted well.",
    "One hundred one microseconds. The forest keeps the time now.",
    "Not a bigger floor. A truer one. 1.513x faster.",
    "From a pair matrix to a grove, and nothing was lost.",
  ],
  // FWASH: bottom-left of the seal (u,v of frame, v = 0 top), #ffd84a fill, ink outline
  sfx: [{ t: [7.0, 8.0], text: "FWASH", at: [0.26, 0.74], size: 0.17, rot: -8, col: "#ffd84a", ink: "#1b1530" }],
  // the card sub plays in the pocket; shortened from f222-320 so it never shares the lower band with the hero line (11.5+)
  credit: { t: [9.25, 11.45], text: "7,929,856 B to 180,224 B" },
};
