// SCENE DATA for home (Vinland Saga, Thors: "You have no enemies"). DIRECTION agent. Pure data: no imports.
// Bible: scripts/home.md (30.2 s = 725 f at 24 fps; frame f -> seconds f/24). This file is the SINGLE SOURCE OF TRUTH
// for the cue names and times the world / cast / fx layers listen to (cue.on / cue.k / cue.since / cue.arg).
//
// WORLD FRAME (bible coordinates, shared by all layers): rig origin = the jetty end where the hero seal stands.
//   +z toward the camera/land, -z toward Vinland (horizon), x right. Jetty runs x -6.6..1.4 at y 0. Thors-seal at (-2.4,0,-0.5).
//   Orca circle centre (0.5,-0.3) rx 3.3 rz 2.7. Igloo/longship/houses to the left and behind (-x, +z). Cairns on the shelf.
//   The hero seal faces -z (yaw = PI + 0.35, three-quarter). Cameras are placed by the law (az off the seal's front).
//
// CAMERA PLAN (law L3, cut at least every 5 s, longest shot 4.4 s):
//   1 wide pull-back  2 wide  3 arc low on the water  4 kill (eye level, orca eye + pup)  5 free pivot to the horizon (behind)
//   6 free igloo + longship  7a free high diagonal  7b free opposite angle  8 arc hold with drift  9 home chase pose.
//
// CUE TABLE (name, time s, dur s). `k` = cue.k(name) 0..1 across dur.
//   wash_bleed   0.0  1.7   cream disc 0->140 m with wobbling edge, ring #c9c3ea, motes (FX; WORLD may read it to reveal paint)
//   sun_flare    0.0  30.2  one faint round flare on the sun disc (FX); bloom on the sun only
//   thors_step   2.3  0.5   Thors-seal steps out of the wet bloom, scale 0->1.05->1 on threes (CAST)
//   penguins     2.3  6.4   two penguins waddle (CAST)
//   thors_hand   2.5  2.4   pose A: hand out, ponytail swing (CAST)
//   plop         2.6  0.6   hero squash 1.12 x 0.80 settling exp(-5t)cos(16t) (build.js applies it; FX ring)
//   gull_land    4.5  0.8   gull lands (CAST)
//   fin_cut      5.0  0.8   fin cuts the surface; wake arms and rings trail (FX + CAST)
//   thors_watch  5.0  7.6   head tracks the orca with a 6 f lag (CAST)
//   orca_circle  5.8  4.8   circle rx 3.3 rz 2.7 centre (0.5,-0.3) (CAST); FX ticks a ring every 10 f
//   orca_gaze    10.0 0.7   orca eye meets the pup's eye (CAST)
//   orca_spyhop  10.7 0.6   pitch 1.02 rad, eye to eye; smear 2 f at start (CAST)
//   orca_sink    11.6 1.0   sink, tail lift (CAST); calf follows with a 12 f lag
//   bloop        12.0 0.8   bubble pop + 3 concentric rings (FX)
//   thors_turn   12.75 0.7  head turns to the horizon (CAST)
//   vinland_rise 12.8 1.2   Vinland headland rises from the haze, wheat strokes, gold glint path (WORLD + FX)
//   dawn_lift    12.8 3.6   horizon +8% value, gold rises (WORLD sky, FX grade)
//   thors_blink  13.75 0.2  one blink (CAST)
//   igloo_scope  16.4 2.4   telescope turns, steam (WORLD / CAST prop)
//   thors_face   18.8 5.7   faces camera, calm (CAST)
//   beacons      19.0 5.0   window while the eleven flames light (FX flames, WORLD cairn warm key)
//   beacon_01..beacon_11    at 19.0 + 0.5 i, dur 1.2, arg `i` = 0..10: flame grows, telescope pans to it
//   thors_smile  22.5 0.25  one-frame soft smile on "Welcome home" (CAST)
//   scope_hold   24.4 0.8   telescope holds one extra beat on the nearest cairn (egg 6)
//   rain         24.4 5.0   rain strengthens 24.4 -> 25.8, ripples (FX; arg strength)
//   flipper      24.5 0.9   hero lifts one flipper to the first rain (seal track `raise`, egg 4)
//   runoff       25.6 2.75  wash run-off in 7 px columns, darker pooled front, seal exempt (FX); paper bare by 28.3
//   thors_fade   25.6 2.8   Thors-seal pigment runs off in columns, outline last (CAST)
//   wipe         29.4 0.8   cream wipe 0.97 -> 0 onto the real island, hero opaque (FX)
export default {
  id: "home",
  title: "Vinland Saga, Thors",
  anime: "Vinland Saga, Thors",
  style: "modern-anime",
  // WIT/MAPPA: bloom on the sun only (snow never blooms), grain .01, vignette .12, warm lights, cool shadows, nothing lifted.
  look: {
    post: { bloom: 0.25, diffuse: 0.04, shafts: 0.18, sat: 1.05, grain: 0.01, vig: 0.12, gain: [1.04, 1.0, 0.95] },
    lines: { px: 1.4, ink: "#3a2a22", inkMix: 1, dist: 1 },
    fill: { sat: 1.06, lumaMax: 0.92 },
  },
  fps: 8, // characters on threes (8 pose changes/s); fx layers step themselves on twos
  duration: 30.2,
  seed: 11,
  far: 1500,
  plates: true,
  bg: "#1f58ac",
  palette: {
    // sky + dawn
    skyZenith: "#1f58ac", skyUpper: "#3f86d0", skyMid: "#5b9bd6", skyLow: "#a5cdeb", horizon: "#ffb978", horizonHi: "#ffd9a0",
    cloudLit: "#ffffff", cloudShade: "#9fb7de", cirrus: "#ffc9b0", cirrusUnder: "#8f8fd0", sun: "#fff3d8", sunRing: "#f2a05a",
    // land
    rock: "#596072", rockLit: "#6a7286", rockShadow: "#3d4658", rockDeep: "#2a3040", haze: "#7d8fd0",
    snow: "#eef2fa", snowMid: "#cfd5ee", snowShadow: "#b4b9e0", snowDeep: "#8a8fd6", shelf: "#f6f4fb", track: "#c9c3ea",
    cliff: "#2a3a3e", cliffStrata: "#1d2a2e", turf: "#6b7a3e", roofTurf: "#7f9b69",
    // water
    water: "#0e4a5c", waterFar: "#0a3446", floeSide: "#7fb6c4", ripple: "#e8f4f6", rain: "#8fa6cc", sunPath: "#ffb978",
    // wood, ship
    plank: "#8a5a34", plankShadow: "#5a3a24", pile: "#3a2f2a", rope: "#c8b48e", shipRed: "#d9533a", shipCream: "#f2e8d0", shipGold: "#c89a4a",
    // igloo
    iglooBlock: "#f6f1e8", iglooSeam: "#c9c3ea", iglooRim: "#6fb4ea", hearth: "#ffd990",
    // beacons
    flameOuter: "#db6128", flameMid: "#fba83d", flameCore: "#fff0b3", flameFirst: "#f2a53a", warmKey: "#ffb070",
    // orca
    orca: "#1b2638", orcaShade: "#2a3350", orcaWhite: "#f7f3ea", orcaWhiteShade: "#cfc9d8",
    // Thors-seal
    tunic: "#6b7a96", tunicShadow: "#4f5c78", sleeve: "#b9ab92", strap: "#4a3226", buckle: "#c8a04a", hair: "#1c1a1e", hairStreak: "#6a6068", tie: "#b83a2a",
    // vinland
    vinCore: "#ffd37a", vinBody: "#f2b84a", vinEdge: "#3a2a42",
    // grade + line
    key: "#ffc98a", shadow: "#8a8fd6", cream: "#fcf3e6", indigo: "#2b3558", accent: "#2e6fc4", ink: "#3a2a22", black: "#1d2a2e",
  },
  // hero seal at the jetty end, three-quarter, facing -z (toward Vinland). yaw 0 = +z, so PI + 0.35. Locked design, no weapon.
  seal: {
    at: [0, 0, 0], yaw: Math.PI + 0.35, scale: 1, moves: [],
    track: [
      { t: 0.0, pose: "idle" },
      { t: 12.75, pose: "blink", dur: 0.45, hold: 0.1, out: 0.2 }, // one slow blink, then Vinland eyes lift
      { t: 24.5, pose: "raise", dur: 0.9, hold: 0.0, out: 0.25 },  // flipper to the first rain (egg 4)
    ],
  },
  shots: [
    // 1. f0-55: close-wide two-shot low at the water side, pulling back and up (28 mm, pup in frame from f0)
    { n: 1, t: [0, 2.3], law: "wide", az: 0.75, r: [4.4, 6.4], elev: [1.1, 1.6], fov: [28, 30], look: [[0.5, 0.25, 0], [0.1, 0.3, 0]], ease: "smooth" },
    // 2. f55-120: wide (24 mm, bloom on): plop, Thors steps out, gull; ends on the fin
    { n: 2, t: [2.3, 5.0], law: "wide", az: [0.8, 0.95], r: [7.5, 8.6], elev: [2.2, 2.5], fov: 38, look: [[0, 0.3, 0], [0, 0.2, 0]], minFrac: 0.07 },
    // 3. f120-216: low on the water, arc into the seal; seen from the side (az +1.2) so the orca never crosses the lens-pup ray
    { n: 3, t: [5.0, 9.0], law: "arc", az: [1.25, 0.95], r: [6.4, 3.4], elev: [0.25, 0.55], fov: [35, 32], look: [0, 0.1, 0], dof: [4.5, 0.4, 1], ease: "smooth" },
    // 4. f216-307: kill angle, eye level over the planks, 50 mm: orca eye and the pup in one frame, pup left third
    { n: 4, t: [9.0, 12.8], law: "kill", az: [-0.95, -1.05], r: [2.9, 2.35], elev: [0.3, 0.25], fov: [26, 24], look: [[0.25, 0.05, 0], [0.3, 0.05, 0]], dutch: 0, ease: "smooth", dof: [2.4, 0.5, 1] },
    // 5. f307-394: pivot to the horizon, from behind the seal: eye (2.2,1.7,9) -> target (-1,3.4,-100), Vinland rises
    { n: 5, t: [12.8, 16.4], law: "free", eye: [[2.2, 1.7, 9.0], [1.6, 1.9, 7.2]], lookAt: [[-1, 3.4, -100], [-1, 4.4, -100]], fov: [36, 34], minFrac: 0.1, ease: "smooth" },
    // 6. f394-451: igloo and longship beside it, telescope turning; the pup kept in the lower third
    { n: 6, t: [16.4, 18.8], law: "free", eye: [[-2.5, 3.0, 6.5], [-3.2, 3.1, 6.0]], lookAt: [[-6.0, 2.3, -2.0], [-7.5, 2.6, -3.0]], fov: [36, 34], minFrac: 0.08 },
    // 7a. f451-540: high diagonal wide, eleven beacons light
    { n: 7, t: [18.8, 22.5], law: "free", eye: [[7, 3.6, 17], [8.2, 4.0, 15.5]], lookAt: [[-5, 1.6, -7], [-5, 1.8, -7]], fov: [36, 38], minFrac: 0.06 },
    // 7b. f540-600: cut to the opposite angle from behind the cairn line looking back over pup and igloo
    { n: 8, t: [22.5, 25.0], law: "free", eye: [[-14, 2.4, -2], [-12.4, 2.6, -1.2]], lookAt: [[0, 1.0, 0.5], [0, 1.1, 0.4]], fov: [34, 32], minFrac: 0.07 },
    // 8. f600-706: hold with drift, rain, run-off, bare sheet; the seal lifts a flipper then stays opaque
    { n: 9, t: [25.0, 29.4], law: "arc", az: [0.5, 0.25], r: [4.4, 5.0], elev: [1.1, 1.4], fov: [32, 34], look: [0, 0.2, 0], ease: "smooth" },
    // 9. f706-725: home, the chase pose behind and above the seal in open ground (L5); cream wipe 0.97 -> 0
    { n: 10, t: [29.4, 30.2], law: "home" },
  ],
  beats: [
    // opening
    { t: 0.0, name: "wash_bleed", dur: 1.7 },
    { t: 0.0, name: "sun_flare", dur: 30.2 },
    { t: 2.3, name: "thors_step", dur: 0.5 },
    { t: 2.3, name: "penguins", dur: 6.4 },
    { t: 2.5, name: "thors_hand", dur: 2.4 },
    { t: 2.6, name: "plop", dur: 0.6 },
    { t: 4.5, name: "gull_land", dur: 0.8 },
    // the orca
    { t: 5.0, name: "fin_cut", dur: 0.8 },
    { t: 5.0, name: "thors_watch", dur: 7.6 },
    { t: 5.8, name: "orca_circle", dur: 4.8 },
    { t: 10.0, name: "orca_gaze", dur: 0.7 },
    { t: 10.7, name: "orca_spyhop", dur: 0.6 },
    { t: 11.6, name: "orca_sink", dur: 1.0 },
    { t: 12.0, name: "bloop", dur: 0.8 },
    // Vinland
    { t: 12.75, name: "thors_turn", dur: 0.7 },
    { t: 12.8, name: "vinland_rise", dur: 1.2 },
    { t: 12.8, name: "dawn_lift", dur: 3.6 },
    { t: 13.75, name: "thors_blink", dur: 0.2 },
    // the Igloo
    { t: 16.4, name: "igloo_scope", dur: 2.4 },
    { t: 18.8, name: "thors_face", dur: 5.7 },
    // eleven beacons, one per 0.5 s from 19.0 (f456 + 12 f each); arg i = 0..10; also the window `beacons`
    { t: 19.0, name: "beacons", dur: 5.0 },
    ...Array.from({ length: 11 }, (_, i) => ({ t: 19.0 + 0.5 * i, name: "beacon_" + String(i + 1).padStart(2, "0"), dur: 1.2, i })),
    { t: 22.5, name: "thors_smile", dur: 0.25 },
    // rain and return
    { t: 24.4, name: "scope_hold", dur: 0.8 },
    { t: 24.4, name: "rain", dur: 5.0, strength: 1 },
    { t: 24.5, name: "flipper", dur: 0.9 },
    { t: 25.6, name: "runoff", dur: 2.75 },
    { t: 25.6, name: "thors_fade", dur: 2.8 },
    { t: 29.4, name: "wipe", dur: 0.8 },
  ],
  // L9: lower half, one at a time. A rounded; B round, drawn from the pool (a calm declaration); C oval.
  bubbles: [
    { t: [2.4, 4.9], text: "You have no enemies.", who: "foe", side: "l", tone: "say" },
    { t: [12.9, 16.3], pool: "lines", who: "foe", side: "l", tone: "say" },
    { t: [18.9, 23.3], text: "Eleven landed contributions. Welcome home.", who: "foe", side: "l", tone: "say" },
  ],
  // L12: 15 sincere Thors-voice lines (epic sincerity, no seal-humour)
  lines: [
    "A true warrior needs no sword. Neither does a seal.",
    "You have no enemies. No one in the world is your enemy.",
    "Strength is not the power to strike. It is the reason you never must.",
    "The sea does not hate the shore. It simply returns.",
    "Put down what you carry. Home is where the hands are open.",
    "Every fire on that shore was lit by someone who stayed.",
    "I fought my whole life to learn this. You were born knowing it.",
    "Look past the water. That is where we are going.",
    "Be gentle with what you build. It will outlast the one who fought.",
    "Even the great whale only wanted to be seen.",
    "A warrior is the one who can leave the blade at home.",
    "Do not look for enemies. Look for a place to plant.",
    "What you protect will light the way back.",
    "Quiet is not weakness. It is the strongest thing there is.",
    "There is a land with no war in it. Walk toward it.",
  ],
  // lettering placed off the seal by the overlay; no text for the held low chord
  sfx: [
    { t: [0.3, 1.4], text: "fwoom", at: [0.7, 0.28], size: 40, rot: -4, col: "#2b3558", ink: "#fcf3e6" },
    { t: [2.7, 3.4], text: "plop", at: [0.3, 0.62], size: 30, rot: 3, col: "#2b3558", ink: "#fcf3e6" },
    { t: [5.8, 7.2], text: "shhhh", at: [0.7, 0.7], size: 28, rot: 0, col: "#cfe6f0", ink: "#0f4a5c" },
    { t: [12.0, 12.8], text: "bloop", at: [0.66, 0.72], size: 32, rot: 6, col: "#e8f4f6", ink: "#0f4a5c" },
    { t: [17.0, 18.0], text: "creak", at: [0.72, 0.3], size: 28, rot: -3, col: "#fcf3e6", ink: "#2b3558" },
    ...Array.from({ length: 11 }, (_, i) => ({ t: [19.1 + 0.5 * i, 19.55 + 0.5 * i], text: "fwuh", at: [0.18 + 0.064 * i, 0.3 + 0.03 * (i % 3)], size: 20, rot: i % 2 ? 5 : -5, col: "#ffb070", ink: "#2b3558" })),
  ],
  credit: { t: [25.0, 29.4], text: "Teerth Sharma · Seal's Topology Land · Eleven landed contributions." },
};
