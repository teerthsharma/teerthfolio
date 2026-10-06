// SCENE DATA for p-aether-lang (Jujutsu Kaisen, Gojo: Unlimited Void into Hollow Purple, MAPPA). DIRECTION layer. Pure data.
// Bible: scripts/p-aether-lang.md. Schema: ../CONTRACT.md. THIS FILE IS THE SINGLE SOURCE OF TRUTH FOR CUE NAMES AND TIMES.
//
// Clock: bible frames at 24 fps (f/24 s). Pocket 0..20.2 s, credit 20.2..24.2 s, wipe home 24.2..24.6 s.
//
// CUE NAMES (cue.on / cue.k / cue.since / cue.arg). All are free cues unless marked RESERVED.
//   FX layer     : handseal bloom floodGlow flood krackle freeze ringClose shockClose still h1loop glints
//                  corePulse orbs bolts collide purple purpleFlare tunnel erase sparks clear wipe
//   CAST layer   : mahitoIn lineA lineB buckle jogoGutter freeze tojiRaise tojiLower erase (arg `order`) mouthOpen blindfold
//   WORLD layer  : bloom (nebula shell r0 -> r1 metres), flood, freeze (flow clock to 0), ringClose, corePulse, tunnel, islandReturn
//   RESERVED     : impact speedlines shock trauma pose
// Beat args: handseal.cross = 0.83 (f20); bloom.r0/r1 = shell metres; erase.order = victims in erase order, Toji LAST.
//
// STAGE (world metres, hero at origin facing -Z, i.e. seal.yaw = PI; core at [0,1.7,-15]):
//   cast and fx layers read ctx.scene.stage. The victim ring sits in front of the hero, never between lens and seal.
const T = (f) => +(f / 24).toFixed(4); // frames -> seconds

export default {
  id: "p-aether-lang",
  title: "Jujutsu Kaisen, Gojo: Hollow Purple",
  anime: "Jujutsu Kaisen, Gojo: Hollow Purple",
  style: "modern-anime",
  // MAPPA compositing: glow on emitters only, 4% grain, strong vignette to #02010a, split-tone violet, sat +20%, lift locked at 0 (L14).
  // Glow radius ~6% frame height at strength 0.6; chromatic fringe ~1.5 px. The seal is out of bloom (lit luma <= 0.92).
  look: {
    post: { bloom: 0.6, diffuse: 0.12, sat: 1.2, gain: [1.0, 0.96, 1.08], grain: 0.04, vig: 0.85, ca: 0.45, lift: 0 },
    lines: { set: 0.3, setW: 1.0, setMix: 1, setCol: "#0a0c10", px: 2.2, ink: "#12151a" },
    fill: { t: 0.5, soft: 0.1, rim: 0.85, ring: 0, sat: 1.15 },
    grade: { shadows: "#2a1480", mids: "#7a3cff", highs: "#ffe8ff" },
  },
  fps: 12, // characters on twos
  duration: 24.6,
  seed: 1971,
  far: 400,
  plates: true,
  bg: "#030208",
  palette: {
    void: "#030208", deep: "#0f0a36", violet: "#4d26b3", orchid: "#9942c2", glowWhite: "#ede0ff",
    blue: "#6190ff", blueOrb: "#4f86ff", red: "#ff5a6e", redOrb: "#ff4157", purple: "#b84dff", flare: "#ff5a8a",
    cyan: "#7fdfff", ring: "#d9b8ff", still: "#f4eeff", stillOutline: "#2a1480", stillShadow: "#12083a",
    flash: "#cdbdff", floor: "#1a1450", floorEdge: "#7a5cff", loop: "#a98cff",
    mahitoSkin: "#aab8c4", mahitoHair: "#5d7a8c", hanami: "#3f7a3c", jogo: "#3a3436", flame: "#ff7a1a", flameViolet: "#8a5cff",
    toji: "#14151a", blade: "#c9d4e6", sky: "#0f0a36", ground: "#1a1450", key: "#ede0ff", accent: "#b84dff", ink: "#12151a",
  },
  seal: {
    at: [0, 0, 0], yaw: Math.PI, scale: 1,
    moves: [],
    // sign f35-55 (flipper crossed at f20), calm hold through the freeze, raise for the orbs, point to fire Purple.
    track: [
      { t: 0.35, pose: "sign", dur: 0.45, hold: 1.5, out: 0.3 },
      { t: 2.6, pose: "idle", dur: 0.4 },
      { t: 8.6, pose: "blink", dur: 0.2, hold: 0.1, out: 0.2 },
      { t: 15.3, pose: "raise", dur: 0.5, hold: 1.5, out: 0.2 },
      { t: 17.3, pose: "fist", dur: 0.25, hold: 0.5, out: 0.1 },
      { t: 17.9, pose: "point", dur: 0.2, hold: 0.9, out: 0.4 },
      { t: 19.5, pose: "idle", dur: 0.4 },
    ],
  },
  stage: {
    core: [0, 1.7, -15], coreScale: 34,
    mahito: { at: [0, 0, -4.6], yaw: 0, scale: 1.4 },
    hanami: { at: [-3.0, 0, -6.5] },
    jogo: { at: [4.6, 0, -7.8] },
    toji: { at: [-1.4, 0, -9.5] },
    blindfold: { at: [1.5, 2.4, -3.2] },
    orbs: { blue: [-1.1, 0.9, 0.2], red: [1.1, 0.9, 0.2] },
    loop: { r: 1.2, y: 0.01, at: [0, 0, -12] },
    ringScale: 5.4,
  },

  // Camera law (L3): wide -> arc -> kill -> home. No cut longer than 5 s. `pal` = the colour script per shot.
  shots: [
    { n: 1, t: [0, T(35)], law: "wide", az: 0.5, r: [3.0, 5.2], elev: [0.8, 3.2], fov: [28, 36], look: [[0, 0.3, 0], [0, 0.6, 0]], ease: "smooth",
      pal: ["#0f0a36", "#7fdfff", "#fff1e4", "#2a1480", "#030208"] },
    { n: 2, t: [T(35), T(55)], law: "wide", az: -0.55, r: [7, 9.5], elev: [3, 5.2], fov: 44, look: [0, 0.4, 0.5], ease: "linear", minFrac: 0.05,
      pal: ["#030208", "#4d26b3", "#9942c2", "#ede0ff", "#6190ff"] },
    { n: 3, t: [T(55), T(158)], law: "arc", az: [1.0, 0.35], r: [6.0, 2.4], elev: [3.0, 0.7], fov: [50, 68], look: [[0, 0.15, 0.6], [0, 0.1, 0.1]], ease: "smooth",
      pal: ["#030208", "#5d7a8c", "#8cb8ff", "#c775f2", "#ede0ff"] },
    { n: 4, t: [T(158), T(206)], law: "arc", az: [-0.5, -0.28], r: [3.4, 2.5], elev: [0.5, 0.35], fov: [52, 46], look: [0, 0.15, 0.4], ease: "in", dof: [3, 0.5, 1],
      pal: ["#0f0a36", "#7fdfff", "#3a3436", "#ff7a1a", "#b89eff"] },
    { n: 5, t: [T(206), T(250)], law: "wide", az: -1.25, r: 9.5, elev: 3.6, fov: 40, look: [0, 0.6, 3.4], ease: "linear", minFrac: 0.05,
      pal: ["#030208", "#d9b8ff", "#f4eeff", "#2a1480", "#6190ff"] },
    { n: 6, t: [T(250), T(367)], law: "arc", az: [0.8, 0.4], r: [4.6, 3.0], elev: [1.8, 1.0], fov: 36, look: [[0, 0.3, 0.9], [0, 0.25, 1.4]], ease: "smooth",
      pal: ["#030208", "#ede0ff", "#b84dff", "#14151a", "#c9d4e6"] },
    { n: 7, t: [T(367), T(408)], law: "arc", az: [-0.7, -0.5], r: 3.4, elev: 0.15, fov: 42, look: [0, 0.2, 0], ease: "smooth",
      pal: ["#6190ff", "#ff5a6e", "#0f0a36", "#ede0ff", "#030208"] },
    { n: 8, t: [T(408), T(430)], law: "arc", az: -0.3, r: [2.6, 1.6], elev: 0.3, fov: [34, 26], look: [0, 0.2, 0], dutch: [0, 3], ease: "in",
      pal: ["#cdbdff", "#6190ff", "#ff5a6e", "#b84dff", "#030208"] },
    // shot 9 split at the lens pass (f445 ~ 18.55 s): past the pup toward the core, then side-on past the lens
    { n: 9, t: [T(430), 18.55], law: "kill", az: [2.5, 2.85], r: 2.2, elev: 0.8, fov: [30, 24], look: [0, 0.35, 2.0], dutch: [0, 4], ease: "snap",
      pal: ["#b84dff", "#ffffff", "#ff5a8a", "#2a1480", "#030208"] },
    { n: 9, t: [18.55, T(468)], law: "kill", az: [-1.2, -1.45], r: 2.5, elev: 0.5, fov: [26, 24], look: [0, 0.3, 1.5], dutch: [0, -3], ease: "snap",
      pal: ["#b84dff", "#ffffff", "#ff5a8a", "#2a1480", "#030208"] },
    { n: 10, t: [T(468), T(485)], law: "home", pal: ["#0f0a36", "#ede0ff", "#b84dff"] },
    // credit: locked, the pup upright; held values so nothing drifts under the card
    { n: 11, t: [T(485), T(581)], law: "arc", az: 0.3, r: 3.2, elev: 0.9, fov: 32, look: [0, 0.1, 0], ease: "linear", pal: ["#0f0a36", "#ede0ff"] },
    { n: 12, t: [T(581), 24.6], law: "home", pal: ["#b84dff", "#0f0a36"] },
  ],

  beats: [
    // ---- shot 1: hand seal (f0-35) ----
    { t: 0.2, name: "handseal", dur: 1.25, cross: 0.83, r0: 0.04, r1: 0.18, col: "#7fdfff" },
    // ---- shot 2: nebula bloom (1.45-2.15), edge ring #ede0ff 3 px ----
    { t: 1.45, name: "bloom", dur: 0.7, r0: 0.02, r1: 140, ring: "#ede0ff" },
    { t: 1.45, name: "impact", seq: [[1, 1], [0, 1]] },
    { t: 1.45, name: "speedlines", dur: 0.6, kind: "radial", at: [0.5, 0.5], strength: 0.9, col: "#ede0ff" },
    { t: 1.45, name: "trauma", amount: 0.25 },
    { t: 1.45, name: "floodGlow", dur: 5.15, k: 0.85 }, // full-lens additive radial, capped so the seal is never milky
    // ---- shots 3-4: the flood (f55 hits, converges until the freeze) ----
    { t: T(55), name: "flood", dur: 6.3, count: 440, ribbons: 3, speed: [8, 14] },
    { t: 2.2, name: "mahitoIn", dur: 0.25 }, // f53-59: squash 1.3x0.5, stretch 0.86x1.14, settle 1.05x0.96
    { t: 3.0, name: "lineA", dur: 3.4 },
    { t: 6.8, name: "lineB", dur: 1.7 }, // Mahito leans in 0.07 rad
    { t: 4.0, name: "krackle", dur: 4.6 },
    // ---- shot 4: glints, relic, buckle (f158-206) ----
    { t: T(158), name: "glints", dur: T(12), col: "#7fdfff" }, // 2-frame hold, cyan rim, white centre
    { t: 6.6, name: "blindfold", dur: 2.0 },
    { t: T(158), name: "buckle", dur: T(48), who: ["hanami", "jogo"] },
    { t: 6.6, name: "jogoGutter", dur: 3.8, from: "#ff7a1a", to: "#8a5cff" }, // his flame gutters to violet, the void out-burns him
    // ---- shot 5: freeze, ring close, STILL (f206-250) ----
    { t: 8.6, name: "freeze", dur: 0.3 }, // flow clock to 0, sway to 0.03
    { t: 8.7, name: "ringClose", dur: 0.8, stars: 6 }, // tapered line + dust, the gap shrinks to 0 at 9.5
    { t: 8.7, name: "h1loop", dur: 0.8, r: 1.2 }, // one circle, never labelled
    { t: 9.5, name: "shock", dur: 0.6, at: [0.5, 0.5], amp: 0.03, r1: 0.55 }, // shock ring on the close
    { t: 9.5, name: "shockClose", dur: 0.6 },
    { t: 9.5, name: "still", dur: 0.9 },
    // ---- shot 6: the hold, Toji raises ----
    { t: 10.4, name: "tojiRaise", dur: 0.5 },
    { t: 10.4, name: "corePulse", dur: 4.9 },
    // ---- shots 7-8: orbs, collision ----
    { t: 15.3, name: "orbs", dur: 2.5, blue: "#4f86ff", red: "#ff4157" },
    { t: 15.5, name: "bolts", dur: 2.3, fps: 24 },
    { t: T(427), name: "collide", dur: 0.3, flash: 0.8, col: "#cdbdff" },
    { t: T(427), name: "impact", seq: [[1, 1], [0, 1]] },
    { t: T(427), name: "trauma", amount: 0.5 }, // ~2 px shake
    { t: 17.8, name: "tojiLower", dur: 0.4 },
    // ---- shot 9: Hollow Purple ----
    { t: T(430), name: "purple", dur: 1.6, flare: 8, flareCol: "#ff5a8a", fromScale: 0.5, toScale: 5.7 },
    { t: 18.0, name: "purpleFlare", dur: 0.6 }, // composed as ref 06: star-flare, dusted ring, halo
    { t: T(435), name: "mouthOpen", dur: T(10) }, // HOLLOW PURPLE! f435-445
    { t: T(442), name: "erase", dur: T(14), order: ["hanami", "jogo", "mahito", "toji"] }, // f442-456; Toji LAST
    { t: 18.6, name: "tunnel", dur: 0.8 },
    { t: T(447), name: "impact", seq: [[1, 1]] },
    { t: T(449), name: "impact", seq: [[2, 1]] },
    { t: 18.6, name: "speedlines", dur: 0.8, kind: "radial", at: [0.5, 0.5], strength: 1.0, col: "#ede0ff" },
    { t: 18.55, name: "trauma", amount: 0.35 },
    // ---- shots 10-12: home, credit, wipe ----
    { t: 19.5, name: "islandReturn", dur: 0.7 },
    { t: 19.5, name: "sparks", dur: 0.7 },
    { t: 19.5, name: "clear", dur: 0.7 },
    { t: 24.2, name: "wipe", dur: 0.4, col: "#b84dff" },
  ],

  // Lower half, one at a time. Shot 6 is silent by default (INDEX.md pending decision 3).
  bubbles: [
    { t: [3.0, 6.5], text: "Are you the strongest because you are Gojeal Satarou?", who: "foe", side: "r", tone: "say" },
    { t: [6.8, 8.55], text: "Or are you Gojeal Fishtarou because you are the strongest?", who: "foe", side: "r", tone: "say" },
    { t: [18.05, 18.7], text: "HOLLOW PURPLE!", who: "seal", side: "c", tone: "shout" },
  ],

  // 15-line pool (L12), seal voice, calm and certain.
  lines: [
    "Throughout heaven and earth, which of us is honoured?",
    "Stand still. A loop ends when its shape stops changing.",
    "Count the turns. Then count none.",
    "Infinite information, one quiet seal.",
    "Nothing reaches me. Nothing needs to.",
    "Strongest is a shape, not a name.",
    "Every ring closes if you let it.",
    "Blue pulls. Red pushes. I only hold the gap.",
    "No hurry. The void is patient.",
    "Fish or title, the loop still halts.",
    "You asked a good question. I answered with silence.",
    "Hold still, it is almost over.",
    "Even a flood has a last wave.",
    "Two forces, one point, no echo.",
    "Home is where the loop exits.",
  ],

  // SFX lettering, placed off the seal by the overlay (STILL is a painted world sprite in fx, cue `still`).
  sfx: [
    { t: [0.85, 1.4], text: "tsk", at: [0.3, 0.3], size: 0.05, rot: -6, col: "#ede0ff", ink: "#2a1480", font: "brush" },
    { t: [1.5, 2.3], text: "VOID", at: [0.7, 0.28], size: 0.16, rot: 4, col: "#f4eeff", ink: "#2a1480", font: "brush" },
    { t: [17.8, 18.25], text: "CRACK", at: [0.25, 0.3], size: 0.14, rot: -8, col: "#f4eeff", ink: "#2a1480", font: "brush" },
    { t: [18.7, 19.4], text: "HOLLOW PURPLE", at: [0.5, 0.3], size: 0.12, rot: 0, col: "#f4eeff", ink: "#2a1480", font: "brush" },
  ],
  credit: { t: [20.2, 24.2], text: "Aether-Lang: Loops stop when their shape stops changing." },
};
