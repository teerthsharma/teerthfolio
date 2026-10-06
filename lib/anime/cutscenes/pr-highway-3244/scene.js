// SCENE DATA for pr-highway-3244 (Fate/Zero, Iskandar: the Gordius Wheel). DIRECTION layer.
// SINGLE SOURCE OF TRUTH for shots, beats, cue names and the rig the other layers read.
// Bible: scripts/pr-highway-3244.md (times below are the bible's 24 fps frames / 24; run time 25.8 s).
//
// STAGING. The chariot sits FIXED at the world origin, facing +z (the king faces +z, the seal's yaw is 0).
// The hero seal rides Iskandar's left pauldron: SEAT = (-0.98, 2.74, -0.86) x CAR_S 1.55 (bible E14), at
// scale 0.58. It never travels; the WORLD slides under the lens (the treadmill, bible shot 5), so every shot
// of the camera law is a rig about a fixed seal. Layers read the ride from `cue.rig` (published by build.js)
// or from `scene.rig` directly:
//   rig.dist(t)   metres the world has scrolled -z (ground, mesas, stands, rivals' path offset)
//   rig.speed(t)  m/s now (0 until the launch, 44 m/s after 0.9 s, slow-mo dip, brake to 0 at the stop)
//   rig.warp(t)   0..1 slow-motion factor of the last pass (1 = full speed)
// Speed profile (card seconds): launch 8.27, a = 44/0.9 to 44 m/s by 9.17, cruise, slow-mo knots 12.5..13.7
// (dips to 12 m/s), line crossed 13.7, brake 15.6..17.3 (roundabout stop), still after.

const SEAT = [-1.52, 4.25, -1.33]; // (-0.98,2.74,-0.86) x 1.55
const GROUND_HOP = [-3.4, 0, -1.6]; // the dock mark beside the wheel, where the seal stands and hops down
const V = 44, T_LAUNCH = 8.27, T_FULL = 9.17, T_SLO0 = 12.5, T_SLO1 = 13.7, T_CROSS = 13.7, T_BRAKE0 = 15.6, T_STOP = 17.3;
const V_SLO = 12;
const sm = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

// speed(t): piecewise, continuous. dist(t) is its integral on a 1/240 s trapezoid table (pure of t, so scrubbing equals playing).
function speed(t) {
  if (t <= T_LAUNCH) return 0;
  if (t < T_FULL) return V * (t - T_LAUNCH) / (T_FULL - T_LAUNCH); // linear ramp, a = 44/0.9
  const dip = sm((t - T_SLO0) / 0.25) * (1 - sm((t - T_SLO1 + 0.25) / 0.25)); // slow-mo window with 0.25 s shoulders
  let v = V - (V - V_SLO) * dip;
  if (t > T_BRAKE0) v *= 1 - sm((t - T_BRAKE0) / (T_STOP - T_BRAKE0));
  return v;
}
const STEP = 1 / 240;
const TABLE = (() => { const a = [0]; for (let i = 1; i <= Math.ceil(30 / STEP); i++) a.push(a[i - 1] + 0.5 * (speed((i - 1) * STEP) + speed(i * STEP)) * STEP); return a; })();
function dist(t) {
  const f = Math.max(0, t) / STEP, i = Math.min(Math.floor(f), TABLE.length - 2);
  return TABLE[i] + (TABLE[i + 1] - TABLE[i]) * Math.min(1, f - i);
}
const warp = (t) => (speed(t) > 0 ? Math.min(1, speed(t) / V) : 1);

// ---- the 12 rivals (small costumed seals); hit times along the wake, the four Assassins staggered 3 frames
const RIVALS = ["gilgamesh", "saber", "lancer", "archer", "berserker", "caster", "kariya", "kirei", "assassin1", "assassin2", "assassin3", "assassin4"];
const HIT = RIVALS.map((_, i) => (i < 8 ? 11.0 + 0.2 * i : 12.7 + (i - 8) * (3 / 24)));

// ---- the 15 character-voiced lines (L12). Iskandar's voice; line A is drawn from this pool.
const LINES = [
  "Via Expugnatio! Ionioi Hetairoi, ride!",
  "Come, hold on to my shoulder, little one.",
  "A king does not ask the road. He rides it!",
  "Hear the thunder? That is the sky saying yes.",
  "Conquest is only a long way to say hello.",
  "Behind me, the whole sea. Ahead of me, the rest.",
  "Do not blink. History is faster than you.",
  "Wheel, bulls, laughter: that is the whole plan!",
  "Every rival here is a road I have not met.",
  "One clean line. That is all a charge needs.",
  "Pass me the wine after the world is mine!",
  "Fear nothing at my side. Fear only the dull road.",
  "Oceanus! I will see its edge before sunset!",
  "Sit tall, small hero. You ride with a conqueror.",
  "The slice already knew. Let the rest catch up!",
];

const bt = (t, name, o = {}) => ({ t, name, ...o });

// Consolidate: cue names the layers read, at the bible times (agreement with the layers' fallbacks).
const LAYER_CUES = [
  { t: 11.1, name: "kachow" },
  { t: 2.4, name: "cape" },
  { t: 11, name: "waver" },
];

export default {
  id: "pr-highway-3244",
  title: "Fate/Zero, Iskandar",
  anime: "Fate/Zero, Iskandar",
  style: "modern-anime",
  // ufotable compositing (E27): bloom on emissive only, 1 frame aberration, grain 0.025, vignette 0.22.
  // The seal is excluded from bloom by the engine (uEmit 0, lit luma <= 0.92); the sunset stays gold.
  look: { post: { bloom: 0.5, diffuse: 0.12, shafts: 0.55, shaftCol: "#ffc27a", sat: 1.06, split: [-0.02, -0.01, 0.05], grain: 0.025, vig: 0.22 }, lines: { px: 2.5, dist: 1, set: 0.8 } },
  fps: 12,
  duration: 25.8,
  seed: 3244,
  far: 900,
  plates: true,
  bg: "#291480",
  palette: {
    sky: "#291480", horizon: "#ff9e1f", rose: "#ff478f", violet: "#9e4de6", disc: "#fff7db",
    ground: "#f2ad66", hollow: "#e07f47", ripple: "#ffd18c", mesa: "#b8503c", mesaRim: "#ffb878",
    bronze: "#e6b04a", gold: "#ffc926", crimson: "#e0102c", cream: "#fbf5ea", ink: "#1a0e16", cloth: "#241a2a",
    bull: "#2a2036", bolt: "#38a0ff", boltCore: "#ffffff", boltGlow: "#2a60ff", boltHoof: "#8fd8ff",
    mint: "#5dffc2", streak: "#ffe099", smoke: "#ffd8a8", smokeShade: "#c08060", flash: "#fff1d0",
    key: "#fff1d0", accent: "#ffc926",
  },
  // the ride: the fixed chariot frame and the treadmill (read by world/cast/fx)
  rig: { seat: SEAT, groundHop: GROUND_HOP, carScale: 1.55, sealScale: 0.58, V, tLaunch: T_LAUNCH, tCross: T_CROSS, tStop: T_STOP, rivals: RIVALS, hit: HIT, speed, dist, warp, sunAz: -0.9 },
  seal: {
    at: [GROUND_HOP[0], 0, GROUND_HOP[2]], yaw: 0, scale: 0.58,
    // stands on the dock mark, hops up to the shoulder (race 1.6..2.1), hops down at the collapse (25.0..25.4)
    moves: [
      { t: [1.6, 2.1], to: SEAT },
      { t: [25.0, 25.4], to: GROUND_HOP },
    ],
    // E14/section 4: stand, hop, sit; crouch at launch; lean (blown); arms up on Ka-chow; fist at the stop; calm; spin down
    track: [
      { t: 0, pose: "idle", dur: 0.3 },
      { t: 1.55, pose: "crouch", dur: 0.2, k: 0.7 },
      { t: 1.72, pose: "raise", dur: 0.25, hold: 0.2 },
      { t: 2.1, pose: "sit", dur: 0.3 },
      { t: 6.9, pose: "raise", dur: 0.3, k: 0.6 },
      { t: 7.2, pose: "crouch", dur: 0.2 },
      { t: 7.8, pose: "blown", dur: 0.4 },
      { t: 11.0, pose: "raise", dur: 0.35 },
      { t: 15.3, pose: "fist", dur: 0.3 },
      { t: 21.0, pose: "idle", dur: 0.5 },
      { t: 25.0, pose: "spin", dur: 0.4 },
      { t: 25.4, pose: "idle", dur: 0.3 },
    ],
  },
  // CAMERA LAW (L3): wide -> arc -> kill -> home, cut <= 5 s. Rigs are about the fixed seal; r/elev are x scale 0.58.
  // The chariot is ~10 m long, so the wides use long r. Colour script per shot in the trailing comment.
  shots: [
    // 1 EWS pull-back, gold swell, bloom up at the end.  gold dominant, rose accent  #ff9e1f #ff478f #9e4de6 #291480 #fff7db
    { n: 1, t: [0, 1.2], law: "wide", az: 0.7, r: [16, 38], elev: [4, 18], fov: [28, 44], look: [[0, -2, 0], [0, -4, 4]], ease: "smooth" },
    // 2 wide switch, hard cut; king and wheel on the grid, sun behind-left  #ff9e1f #e0102c #c98a34 #3a3440 #fbf5ea
    { n: 2, t: [1.2, 2.4], law: "wide", az: 0.6, r: [20, 18], elev: [-1.8, -1.4], fov: 30, look: [0.4, -3.4, 3], minFrac: 0.05, ease: "smooth", dof: [10, 0.4, 1] },
    // 3 low arc into the seal, line A at 2.4 (4.8 s, inside the cut limit)  #e6b04a #ffc926 #5dffc2 #b0122a #1a0e16
    { n: 3, t: [2.4, 7.2], law: "arc", az: [0.9, 0.45], r: [10, 3.4], elev: [-4.2, 0.9], fov: [44, 50], look: [[0, -2.5, 0], [0, 0.05, 0]], ease: "smooth" },
    // 4 KILL: push-in on the war cry from slightly below  #38a0ff #ffffff #ffc926 #e0102c #291480
    { n: 4, t: [7.2, 7.8], law: "kill", az: [-0.3, -0.5], r: [3.2, 2.2], elev: [-0.4, -0.5], fov: [30, 24], dutch: [0, 5], look: [0, 0.15, 0], ease: "snap" },
    // 5 tracking, low and side: the world slides under the lens  #ffe099 #e07f47 #3a3440 #fff1d0 #38a0ff
    { n: 5, t: [7.8, 11.0], law: "free", az: [1.25, 1.45], r: [8, 7], elev: [-3.4, -3.0], fov: [34, 30], look: [0, -2.6, 2.5], ease: "linear", moving: true, minFrac: 0.1 },
    // 6 wide side pass, slow-mo (24 mm)  #fff1d0 #ffc926 #2f8cff #e0102c #1a0e16
    { n: 6, t: [11.0, 15.3], law: "wide", az: [1.35, 1.05], r: [11, 12], elev: [-2.6, -2.2], fov: 46, look: [0, -3, 3], minFrac: 0.07, ease: "smooth", moving: true },
    // 7a medium push on the seal at the stop, line B, king's-shoulder framing  gold rim
    { n: 7, t: [15.3, 18.3], law: "arc", az: [0.6, 0.35], r: [4.6, 3.2], elev: [0.9, 0.5], fov: 30, look: [0, 0.1, 0], ease: "smooth" },
    // 7b lower-left three-quarter, 35 mm (keeps the 5 s rule)
    { n: 8, t: [18.3, 21.0], law: "kill", az: [-0.8, -0.95], r: [3.2, 2.9], elev: [-0.3, -0.1], fov: 34, dutch: [3, 1], look: [0, 0.05, 0], ease: "smooth" },
    // 8 credit: behind and above, the chase pose; the collapse hop and the wipe close the shot
    { n: 9, t: [21.0, 25.8], law: "home", az: Math.PI, r: [4.0, 4.4], elev: [2.2, 2.6], fov: 35, look: [0, 0.2, 3.2], ease: "smooth" },
  ],
  // CUES (layers read them with cue.on / cue.k / cue.since / cue.done). Reserved: impact speedlines shock trauma pose.
  beats: [
    ...LAYER_CUES,
    // --- shot 1/2: the bubble and the grid
    bt(0, "bubble", { dur: 1.2 }),
    bt(1.0, "bloomUp", { dur: 0.2 }),
    bt(1.2, "sea", { dur: 24.6 }),
    bt(1.2, "confetti", { dur: 1.2, n: 60 }),
    bt(1.2, "heat", { dur: 6.0 }),
    bt(1.2, "paw", { dur: 6.0 }),
    bt(1.8, "laugh", { dur: 5.4 }),
    bt(1.6, "hop", { dur: 0.5 }),
    bt(2.4, "flagStar", { dur: 23.4 }),
    // --- shot 3: the slice window, one lane wide, fades in from race 2.65, out at 14.8 (egg 5)
    bt(5.0, "slice", { dur: 9.8 }),
    // --- shot 4: the war cry (strikes cry-0.1..cry+0.9)
    bt(6.9, "sword", { dur: 0.6 }),
    bt(7.2, "impact", { seq: [[1, 2]] }),
    bt(7.35, "strike", { dur: 1.0 }),
    bt(7.45, "cry", { dur: 1.0 }),
    bt(7.45, "flash", { dur: 0.1, peak: 0.5 }),
    bt(7.45, "aura", { dur: 0.5 }),
    bt(7.45, "trauma", { amount: 0.6 }),
    bt(7.45, "shock", { dur: 0.45, at: [0.5, 0.45], amp: 0.02, r1: 0.7 }),
    bt(7.45, "aberration", { dur: 0.1, px: 2 }),
    // --- shot 5: launch, hoofbeat storm
    bt(8.0, "assassins", { dur: 3.0 }),
    bt(8.27, "launch", { dur: 0.9 }),
    bt(8.27, "launchRing", { dur: 0.34 }),
    bt(8.27, "launchConfetti", { dur: 0.8 }),
    bt(8.27, "smoke", { dur: 5.43 }),
    bt(8.27, "trauma", { amount: 0.4 }),
    bt(8.27, "shock", { dur: 0.34, at: [0.5, 0.7], amp: 0.012, r1: 0.6 }),
    bt(8.27, "speedlines", { dur: 5.43, kind: "speed", strength: 0.45, col: "#ffe099", at: [0.5, 0.5] }),
    bt(10.5, "trail", { dur: 5.1 }),
    // --- shot 6: the pass, slow motion 12.5..13.7
    bt(11.0, "pass", { dur: 4.3 }),
    bt(11.0, "teaCart", { dur: 4.3 }),
    bt(11.0, "sash", { dur: 4.3 }),
    bt(11.0, "gate", { dur: 4.3 }),
    bt(11.1, "glint", { dur: 0.5 }),
    bt(11.1, "flash", { dur: 0.1, peak: 0.22 }),
    bt(11.1, "trauma", { amount: 0.3 }),
    bt(12.5, "slowmo", { dur: 1.2 }),
    bt(T_CROSS, "cross", { dur: 0.3 }),
    // --- shot 7: the stop
    bt(T_BRAKE0, "brake", { dur: 1.7 }),
    bt(T_STOP, "stop", { dur: 0.6 }),
    bt(T_STOP, "cannon", { dur: 0.5 }),
    bt(15.3, "flex", { dur: 5.7 }),
    bt(18.3, "motes", { dur: 7.5 }),
    // --- shot 8 and the wipe home (the chequered page is the exit wipe, never a lens cover: L2 keeps the seal clear)
    bt(21.0, "credit", { dur: 4.0 }),
    bt(25.0, "hopDown", { dur: 0.4 }),
    bt(25.0, "wipe", { dur: 0.4 }),
    // --- per-rival hits, 11 frames (0.45 s) each: a generic `hit` (+ `rival` index) and a unique `hit<N>` per rival
    ...HIT.map((t, i) => bt(t, "hit" + i, { dur: 0.45, rival: i, who: RIVALS[i] })),
    ...HIT.map((t, i) => bt(t, "hit", { dur: 0.45, rival: i, who: RIVALS[i] })),
    // inverted impact frames on four hits only (Gilgamesh, Lancer, Berserker, the last Assassin): 12 strobes in 2.7 s is unsafe
    ...[0, 2, 4, 11].map((i) => bt(HIT[i], "impact", { seq: [[1, 1]] })),
    ...[0, 4, 8].map((i) => bt(HIT[i], "trauma", { amount: 0.25 })),
  ],
  // L9: lower half, one at a time. Line A: the king (pool). Line B: the seal, the cry and the claim.
  bubbles: [
    { t: [2.4, 6.4], pool: "lines", who: "foe", side: "r", tone: "shout" },
    { t: [15.3, 19.5], text: "AAALALALALAI! 65.5x fewer comparisons. The slice already knew.", who: "seal", side: "l", tone: "shout" },
  ],
  lines: LINES,
  // lettering is SFX only (L10), upper third, off the seal
  sfx: [
    { t: [7.5, 8.65], text: "AAALALALALAI!", at: [0.5, 0.18], size: 1.5, rot: -4, col: "#ffc926", ink: "#1a0e16" },
    { t: [11.1, 12.1], text: "KA-CHOW!", at: [0.5, 0.2], size: 1.3, rot: 3, col: "#ffc926", ink: "#241a2a" },
  ],
  credit: { t: [21.0, 25.0], text: "google/highway #3244 · 65.5x fewer comparisons — The slice already knew." },
};
