// SCENE DATA for pr-mujoco-3396: Attack on Titan, the Rumbling, painted as a Renaissance fresco ("THE WALLS WERE TITANS").
// DIRECTION layer, single source of truth for the shot list, camera, beats, cue names, bubbles, sfx, credit and colour script.
// Bible: scripts/pr-mujoco-3396.md (frames at 24 fps; here seconds = f / 24). Schema: ../CONTRACT.md.
//
// STAGE (world metres; the world, cast and fx agents all read this):
//   seal at the origin, yaw PI, so seal-local +z = world -z = toward the Wall. A camera "behind" the seal (az = PI) sits at world +z
//   and looks down -z at the Wall. The Wall is the slab zF(x) = -30 - x^2/900 (90 m tall in the fresco build). Five hero Wall Titans
//   stand at x = -130,-66,0,66,130 on z = -170/-215 alternating. The Rumbling rank runs z -260..-1500. The Marley quay is a plate at z -1400.
//   The bell tower is at (10.5, -8.5), the gate at x = -25, the officer on the tower base. Victims: 12 costumed seals in 4 groups.
//
// CUE NAMES (cue.on / cue.k / cue.since / cue.arg). RESERVED (player): impact speedlines shock trauma pose. FREE, read by layers:
//   banner bloom lineA crack tremble skinfall titansStand eyes tendrils rumbling footfall ripple darken preglow aureole strike groundflash
//   swell stomp thrown lineB eat shrink lastCube gap gulls lineC cubeFlip salute fist craze creditIn flake collapse
//   kneel stagger run cover fall godSkeleton
//   cast reactions: kneel(3.2) stagger(4.1) run(4.9..6.4) cover(6.75) fall(6.8, spiral lower left) salute(11.67)
// DERIVED values the build adds to every cue as cue.x (one place for the shared maths): scale, dark, sea, flake, craze, foot, footN, ring.

const D = 1 / 24; // one drawing at 24 fps, seconds
const f = (n) => n * D;

// footfalls every 0.9 s from 4.6 s to 15.6 s: the roofs jump, the bell swings, the sun pulses, a ripple ring is born (rings from 4.9 s, f118)
const beats = [];
for (let n = 0; 4.6 + 0.9 * n <= 15.6; n++) {
  const t = +(4.6 + 0.9 * n).toFixed(3);
  beats.push({ t, name: "footfall", dur: 0.9, n });
  beats.push({ t, name: "trauma", amount: 0.1 }); // 0.07 m x 2 drawings: a short decaying shake
  beats.push({ t: Math.max(t, 4.9), name: "ripple", dur: 1.25, n }); // 10 rings; fades 40% per 30 frames
}

// Consolidate: cue names the layers read, at the bible times (agreement with the layers' fallbacks).
const LAYER_CUES = [
  { t: 6.4, name: "dusk", dur: 0.4 },
  { t: 10.33, name: "cubeflight", dur: 0.5 },
  { t: 4.08, name: "stand" },
  { t: 4.92, name: "flee" },
  { t: 11.67, name: "flip" },
];

export default {
  id: "pr-mujoco-3396",
  title: "Attack on Titan, the Rumbling (Renaissance)",
  anime: "Attack on Titan, the Rumbling (Renaissance)",
  style: "renaissance-fresco",
  // fresco look bent to the dopamine law: sat 1.05 (the style's 0.8 breaks L8), vignette capped at 0.3, warm gain, chromatic fringe,
  // shafts #f3d7a0, bloom only above 1.0 (the seal is outside bloom), a copper haze that compresses far value and not hue.
  look: {
    fill: { sat: 1.05, lumaMax: 0.92, soft: 0.16, rim: 0.5 },
    lines: { px: 1.3, ink: "#5a3b22", inkMix: 1, setCol: "#5a3b22" },
    post: {
      sat: 1.05, vig: 0.3, grain: 0.03, ca: 0.4, shafts: 1, shaftCol: "#f3d7a0", gain: [1.03, 0.98, 0.88], bloom: 0.3,
      paperKind: 2, paper: "#efe4cf", palMix: 0.4, haze: "#c77744", hazeAmt: 0.35, hazeNear: 40, hazeFar: 900, kuwa: 3,
    },
  },
  fps: 12,
  duration: 20,
  seed: 3396,
  far: 3200, // the rumbling reaches z -1500, the quay -1400
  palette: {
    // fresco pigments (bible 2, E01, E05, E10)
    plaster: "#efe4cf", sepia: "#5a3b22", ink: "#5a3b22", sepiaDeep: "#4b3621", fissure: "#24100c",
    lapis: "#2f4f8f", lapisLight: "#7f9cc4", violet: "#5c4f6f", violetMid: "#8a788f", violetDeep: "#3b2f52",
    rose: "#c9857f", peach: "#eeb79c", gold: "#e9a252", sunCore: "#fff0c8", cloudLit: "#f3d7a0", cloudShade: "#7a5f86",
    terraRosa: "#a0522d", sinopia: "#b8492f", ochre: "#c99a4a", verdigris: "#5f8f7a", haze: "#c77744",
    fleshLit: "#e4b887", fleshMid: "#c98a5e", muscle: "#995837", muscleShade: "#6a3726", fleshDeep: "#432620",
    stoneLit: "#d9c4a0", stoneMid: "#b0976f", stoneShade: "#6e5a44", stoneDeep: "#3b2f22",
    roofLit: "#c0623a", roofMid: "#a0522d", roofShade: "#5b2e22", ember: "#ff9a3c", crackGlow: "#e96a2d",
    coral: "#e96a5a", coralShade: "#b8492f", blueCube: "#2f4f8f", bolt: "#fffbe0", boltMid: "#ffd24a", boltGlow: "#ff8a3a",
    steamCore: "#dfd8cd", steamShade: "#b5a8b1", steamDeep: "#8a788f", sparks: "#ff9a3c", ripple: "#b9a0b8", teeth: "#efe6d2",
    founder: "#7fe0a0", gapWhite: "#e2d8c0",
    // keys the stub shape asks for
    sky: "#2f4f8f", ground: "#423021", key: "#f3d7a0", accent: "#b8492f",
  },
  seal: {
    at: [0, 0, 0], yaw: Math.PI, scale: 1, moves: [],
    // poses (idle sign fist raise crouch sit point spin blown blink awe). Eat = awe (mouth open). Epic sincerity: no humour poses.
    track: [
      { t: 0.1, pose: "sign", dur: 0.3, hold: 2.9, out: 0.4 },       // opening sign flipper, held through the chase pose f30-77
      { t: 6.42, pose: "crouch", dur: 0.3, hold: 0.05, out: 0.12 },  // f154-162 crouch before the strike
      { t: 6.83, pose: "raise", dur: 0.4, hold: 0.3, out: 0.3 },     // f164-174 swell
      { t: 7.4, pose: "awe", dur: 0.2, hold: 2.7, out: 0.2 },        // f177-247 mouth open for the eat
      { t: 10.33, pose: "blink", dur: 0.3, hold: 0.2, out: 0.2 },    // f248-260 shrink
      { t: 11.67, pose: "raise", dur: 0.3, hold: 0.5, out: 0.3 },    // f280-300 flipper up with the blue cube
      { t: 12.5, pose: "fist", dur: 0.3, hold: 2.7, out: 0.5 },      // f300-384 fist
    ],
  },
  // seal scale keys [t0, t1, from, to, overshoot]: build.js applies them to the seal handle after the player places it.
  // s(t) = from + (to-from) * ( smooth(u) + o * sin(pi u) * u ), u = (t-t0)/(t1-t0); o 0.2 peaks ~ 12% over. The director follows the live scale.
  sealScale: [
    [f(164), f(174), 1, 6, 0.2], // 6.83-7.25 the swell, x6 (6.6 m) with 12% overshoot
    [f(248), f(260), 6, 1, 0],   // 10.33-10.83 shrink back
  ],
  // the camera law. Seal-local rig: az PI = behind (the Wall ahead); r, elev and look scale with the seal's live scale.
  shots: [
    // 1 (0-1.25) the banner slam over the island follow cam: a low close hold, seal whole and upright
    { n: 1, t: [0, f(30)], law: "free", az: [Math.PI - 0.55, Math.PI - 0.45], r: [4.4, 4.2], elev: [0.8, 0.8], fov: 34, look: [0, 0.5, 2], dutch: 0, ease: "linear", minFrac: 0.16 },
    // 2 (1.25-3.2) pull back and up: eye ~[1.2,1.1,9] to [1,1.1,8], fov 28 to 42, aim at the Wall, seal 17% -> 12%
    { n: 2, t: [f(30), f(77)], law: "wide", az: [Math.PI - 0.22, Math.PI - 0.15], r: [8.5, 9.2], elev: [0.8, 1.2], fov: [28, 42], look: [0, 2.0, 30], dutch: 0, minFrac: 0.1, dof: [9, 0.4, 1] },
    // 3 (3.2-4.4) line A and the crack: hold, fov 42 -> 44, a 0.4 m push, seal 17%
    { n: 3, t: [f(77), f(106)], law: "wide", az: [Math.PI - 0.15, Math.PI - 0.12], r: [9.2, 8.8], elev: [1.2, 1.2], fov: [42, 44], look: [0, 2.4, 30], dutch: 0, minFrac: 0.1, ease: "linear" },
    // 4 (4.4-6.4) arc through the wide switch: over the crest, five Wall Titans and the first rows of the Rumbling in frame with the seal below
    { n: 4, t: [f(106), f(154)], law: "arc", az: [Math.PI - 0.55, Math.PI + 0.45], r: [6.2, 8.2], elev: [1.3, 3.4], fov: [50, 54], look: [0, 12, 190], dutch: 0, minFrac: 0.11, ease: "smooth" },
    // 5 (6.4-6.8) the strike: low and close, fov 49, the kill-angle phase starts
    { n: 5, t: [f(154), f(164)], law: "kill", az: [Math.PI + 0.45, Math.PI + 0.7], r: [4.4, 4.0], elev: [0.9, 0.7], fov: [49, 46], look: [0, 3.0, 10], dutch: [0, 3], ease: "snap", minFrac: 0.14 },
    // 6 (6.85-7.7) swell: eye ~[20,9,34] on the titan seal, fov 44 -> 58 (22 mm) as it grows, seal ~25% of frame height
    { n: 6, t: [f(164), f(185)], law: "kill", az: [Math.PI - 1.1, Math.PI - 1.2], r: [3.6, 3.4], elev: [1.0, 0.9], fov: [44, 58], look: [0, 0.8, 1.6], dutch: [3, 0], ease: "snap", minFrac: 0.2 },
    // 7 (7.7-10.3) the eat: three-quarter on the titan seal, block beside it, four Wall Titans behind in the haze
    { n: 7, t: [f(185), f(247)], law: "free", az: [Math.PI - 1.3, Math.PI - 1.0], r: [3.6, 3.4], elev: [0.9, 0.8], fov: [44, 42], look: [0, 0.9, 1.4], dutch: 0, ease: "smooth", minFrac: 0.18 },
    // 8 (10.3-11.0) home phase begins: behind, the seal shrinks to 1 m, the gap and the sea ahead (r follows the live scale)
    { n: 8, t: [f(247), f(264)], law: "home", az: Math.PI, r: [3.4, 6.2], elev: [1.0, 1.1], fov: [40, 38], look: [0, 2.4, 14], dutch: 0, minFrac: 0.13 },
    // 9 (11.0-16.0) line C and the flex: two cuts so no hold passes 5 s; the second turns to the face for the speech
    { n: 9, t: [f(264), f(324)], law: "home", az: [Math.PI, Math.PI - 0.1], r: [6.6, 6.0], elev: [1.1, 1.1], fov: 32, look: [0, 1.0, 6], dutch: 0, ease: "linear", minFrac: 0.17 },
    { n: 10, t: [f(324), f(384)], law: "arc", az: [0.7, 0.5], r: [2.8, 2.6], elev: [0.5, 0.5], fov: 31, look: [0, 0.1, 0], dutch: 0, ease: "linear", minFrac: 0.2 },
    // 10 (16.0-20.0) the credit, the plaster flakes away, home hand-back (f442-475) to the chase pose behind and above in open ground
    { n: 11, t: [f(384), f(480)], law: "home", az: Math.PI, r: [6.4, 3.8], elev: [1.1, 2.3], fov: [32, 38], look: [0, 0.2, 3.2], dutch: 0, ease: "smooth", minFrac: 0.14 },
  ],
  beats: [
    ...LAYER_CUES,
    // ---- shot 1: the banner slam, impact frame f28-31 (two-tone #efe4cf / #4b3621), speed lines 24 radial ----
    { t: 0, name: "banner", dur: f(38) },                           // slam, hit-stop 3 frames, docks under the bar at f38 (1.6 s)
    { t: 0, name: "trauma", amount: 0.3 },                           // shake 0.3 s, dust off the lower edge
    { t: f(28), name: "bloom", dur: 0.15 },
    { t: f(28), name: "impact", seq: [[2, 2], [1, 2]] },
    { t: f(28), name: "speedlines", dur: 0.5, kind: "radial", at: [0.5, 0.45], strength: 24, col: "#4b3621" },
    // ---- shot 2-3: the dusk, line A, the crack race f79-103, tremble f82-96 ----
    { t: f(77), name: "lineA", dur: 3.5 },
    { t: f(77), name: "kneel", dur: 1.0 },
    { t: f(79), name: "crack", dur: f(24), from: [0, 0, 0], to: [0, 0, -30] }, // races from the square to the Wall
    { t: f(79), name: "trauma", amount: 0.12 },
    { t: f(82), name: "tremble", dur: f(14) },
    // ---- shot 4: skin falls from the crowned face outward, the five stand over 40 frames staggered 6 f, eyes light, tendrils f98-118 ----
    { t: 4.0, name: "eyes", dur: 0.9, at: [4.0, 4.5, 4.7] },       // SPLIT times: first, then the rest
    { t: f(98), name: "skinfall", dur: 1.4, from: "crown" },
    { t: f(98), name: "titansStand", dur: f(40), stagger: f(6), x: [-130, -66, 0, 66, 130] },
    { t: f(98), name: "tendrils", dur: f(20), count: 8 },            // grow from the seal's back to each nape f98-118; pulse each footfall
    { t: f(98), name: "rumbling", dur: 2.0 },                        // the impostor rank rises over the crest (T.rise 4.0-6.0 s)
    { t: f(98), name: "stagger", dur: 0.8 },                         // victims stagger back, rifles dropped
    { t: f(98), name: "speedlines", dur: 0.7, kind: "speed", at: [0.5, 0.5], strength: 10, col: "#5a3b22" },
    { t: 4.9, name: "run", dur: 1.5 },                               // f118-154 run left, scouts with blades down
    // ---- shot 5: strike. darken -20%, pre-glow, aureole f158, the god skeleton far in the haze f154-247 ----
    { t: f(154), name: "darken", dur: f(10) },
    { t: f(154), name: "godSkeleton", dur: f(93) },
    { t: f(158), name: "aureole", dur: 14 },                         // 2 px #c99a4a ring at 1.6 m radius, 4 rays, the only Founder cue on the body
    { t: f(158), name: "preglow", dur: f(4) },
    // ---- shot 6: bolt f162-169 (visible except n%3==1), ground flash 4 f, impact frame f162, swell f164-174, stomp 0.22 m for 6 f ----
    { t: f(162), name: "strike", dur: f(7) },
    { t: f(162), name: "groundflash", dur: f(4) },
    { t: f(162), name: "cover", dur: 0.6 },                          // victims cover their heads
    { t: f(162), name: "impact", seq: [[1, 2], [2, 2]] },            // the inverted fresco pair
    { t: f(162), name: "speedlines", dur: 0.8, kind: "radial", at: [0.5, 0.5], strength: 24, col: "#fffbe0" },
    { t: f(163), name: "thrown", dur: 1.1 },                         // victims thrown prone by the swell's shock
    { t: f(163), name: "fall", dur: 1.4, spiral: true },             // fall in a spiral, lower left (Last Judgment egg)
    { t: f(164), name: "swell", dur: f(10), from: 1, to: 6, overshoot: 0.12 },
    { t: f(164), name: "shock", dur: 0.8, at: [0.5, 0.55], amp: 1.0, r1: 0.9 },
    { t: f(168), name: "stomp", dur: f(6) },
    { t: f(168), name: "trauma", amount: 0.55 },                     // 0.22 m for 6 frames
    { t: f(173), name: "lineB", dur: 3.5 },
    // ---- shot 7: the eat f177-247, every cube spirals to the mouth (th = 4 pi u), top course first ----
    { t: f(177), name: "eat", dur: f(70), cubes: 1282, turns: 2 },
    { t: f(185), name: "kneel", dur: 3.0 },                          // the officer holds until f174 then kneels, victims recoil
    // ---- shot 8: the gap opens on the sea, shrink f248-260, the last blue cube flies to the nose, gulls f262, uSea 10.35-11.5 ----
    { t: f(248), name: "shrink", dur: f(12), from: 6, to: 1 },
    { t: f(248), name: "lastCube", dur: f(12) },
    { t: 10.35, name: "gap", dur: 1.15 },
    { t: f(262), name: "gulls", dur: 3.0, count: 14 },
    // ---- shot 9: line C, the blue cube flipped and caught f280-296, the salute, fist f300, plaster begins to craze f330 ----
    { t: 10.8, name: "lineC", dur: 5.1 },
    { t: f(280), name: "cubeFlip", dur: f(16) },
    { t: f(280), name: "salute", dur: 1.2 },                         // scouts raise a blade; the Creation-of-Adam flipper pair f300-312
    { t: f(300), name: "fist", dur: 3.5 },
    { t: f(330), name: "craze", dur: 2.5 },
    // ---- shot 10: the credit f389 for 3.2 s, plaster flakes off from the gap f390-462, collapse f461-470 ----
    { t: f(389), name: "creditIn", dur: 3.2 },
    { t: f(390), name: "flake", dur: f(72), from: "gap" },
    { t: f(461), name: "collapse", dur: f(9) },
    ...beats,
  ].sort((a, b) => a.t - b.t),
  // line A is drawn from this pool (bible: "the one drawn replaces line A"); B and C are fixed.
  // 15 lines in the voice of the land: each trails off so that "...will the seal ever be free?" always answers it.
  lines: [
    "If the seal eats all the fish...",
    "If the seal eats every last cube...",
    "If the seal eats the Wall itself...",
    "If the seal swallows the whole coastline...",
    "If the seal keeps eating what holds me up...",
    "If the seal never leaves one cube behind...",
    "If the seal finishes the whole harbour...",
    "If the seal takes the stone and the sea...",
    "If the seal eats a thousand and then some...",
    "If the seal eats the rock I am made of...",
    "If the seal clears the last of the copies...",
    "If the seal eats the cage that shaped me...",
    "If the seal swallows the walls one by one...",
    "If the seal eats all of it...",
    "If the seal eats every copy of me...",
  ],
  bubbles: [
    { t: [3.2, 6.7], pool: "lines", who: "foe", side: "l", tone: "say", y: 0.78 },
    { t: [7.2, 10.7], text: "...will the seal ever be free?", who: "foe", side: "l", tone: "shout", y: 0.8 },
    { t: [10.8, 15.9], text: "Free. 84,033,568 bytes to 65,568 at ntree 4,096. 1,281.6x less. 1.513x faster. 15,361x fewer probes.", who: "seal", side: "r", tone: "shout", y: 0.78 },
  ],
  // lettering off the seal (the overlay keeps clear of it). Banner: condensed serif, plaster letters, sinopia slash.
  sfx: [
    { t: [0, 1.7], text: "THE WALLS WERE TITANS", at: [0.5, 0.16], size: 80, rot: 0, col: "#efe6d2", ink: "#3b2f22", font: "'Bodoni MT Condensed','Playfair Display','Times New Roman',serif" },
    { t: [1.15, 1.9], text: "DOOM", at: [0.8, 0.3], size: 120, rot: -6, col: "#b8492f", ink: "#efe6d2" },
    { t: [3.3, 4.3], text: "KRRRK", at: [0.2, 0.42], size: 90, rot: -8, col: "#5a3b22", ink: "#efe6d2", font: "'Brush Script MT','Segoe Script',cursive" },
    { t: [4.7, 6.3], text: "GOGOGOGO", at: [0.5, 0.2], size: 140, rot: 0, col: "#b8492f", ink: "#efe6d2" },
    { t: [6.85, 7.7], text: "DOOOM", at: [0.17, 0.3], size: 130, rot: 5, col: "#fffbe0", ink: "#b8492f" },
    { t: [8.0, 9.2], text: "GULP", at: [0.82, 0.3], size: 80, rot: 4, col: "#b8492f", ink: "#efe6d2" },
  ],
  credit: { t: [389 / 24, 389 / 24 + 3.2], text: "google-deepmind/mujoco #3396 · mujoco_warp #1541 · mujoco #3450 · merged · 1,281.6x less memory · 1.513x faster · 15,361x fewer probes" },
  // colour script per shot (bible section 5): dominant hue + palette. Layers read ctx.scene.colorScript[n - 1] (n = camera shot number above).
  colorScript: [
    { n: 1, dominant: "plaster cream, sinopia accent", pal: ["#efe4cf", "#4b3621", "#b8492f", "#e9a252", "#2f4f8f"] },
    { n: 2, dominant: "lapis against peach", pal: ["#2f4f8f", "#8a788f", "#eeb79c", "#c0623a", "#4b3621"] },
    { n: 3, dominant: "umber, ember accent", pal: ["#3b2f22", "#a0522d", "#e96a2d", "#d9c4a0", "#2f4f8f"] },
    { n: 4, dominant: "red-brown flesh, orange haze", pal: ["#432620", "#995837", "#c77744", "#e4b887", "#5c4f6f"] },
    { n: 5, dominant: "dark lapis, gold bolt", pal: ["#24100c", "#2f4f8f", "#ffd24a", "#fffbe0", "#b8492f"] },
    { n: 6, dominant: "gold and lapis", pal: ["#fffbe0", "#ffd24a", "#e96a2d", "#2f4f8f", "#432620"] },
    { n: 7, dominant: "coral and plaster", pal: ["#e96a5a", "#b8492f", "#2f4f8f", "#efe4cf", "#4b3621"] },
    { n: 8, dominant: "sea blue breaks the warm", pal: ["#2f4f8f", "#7f9cc4", "#efe4cf", "#e9a252", "#b8492f"] },
    { n: 9, dominant: "lapis sea and gold", pal: ["#2f4f8f", "#7f9cc4", "#efe4cf", "#c99a4a", "#e96a2d"] },
    { n: 10, dominant: "lapis sea and gold, face to camera", pal: ["#2f4f8f", "#7f9cc4", "#efe4cf", "#c99a4a", "#e96a2d"] },
    { n: 11, dominant: "plaster to island", pal: ["#efe4cf", "#c99a4a", "#2f4f8f", "#a0522d", "#4b3621"] },
  ],
};
