// SCENE DATA for pr-topograph-432: Overlord, Ainz Ooal Gown in the Throne Room of Nazarick, drawn as a Saturday-morning cartoon.
// DIRECTION layer. Pure data, no imports. SINGLE SOURCE OF TRUTH for cue names, cue times, stage layout and palette:
// world / cast / fx read `ctx.scene.stage`, `ctx.palette` and `cue.on|k|since|done(<name>)`; they never invent their own times.
// Bible: scripts/pr-topograph-432.md (shot list in section 5 is in 24 fps frames; seconds below = frame / 24).
//
// WHY THESE NUMBERS
//   run time 29.38 s (705 f); the strike (shot 4) lands at 7.92 s; shot 5 plays in real-time slow motion x0.4 (beat `warp`).
//   camera law (L3): wide -> arc -> kill -> home; a cut at least every 5 s, so bible shots longer than 5 s are split by hand
//   (5 -> 5a/5b, 6 -> 6a/6b, 7 -> 7a/7b) with a new azimuth each time; the director would otherwise auto-split with a warning.
//   timing: characters on threes (fps 8); fx layers step themselves on twos (12) from cue.t.
//
// STAGE (hall axes): +z runs from the throne (z -11.4) down the hall to the gate (z +28.6). Stair: 7 steps x 0.4 m, TOP_Y 2.8.
//   The seal (Ainz) stands at the stair FOOT facing +z (toward the invaders), the throne at his back.
//   cast puts invaders in two rows in front of him; world builds the hall around it all.
const GEM = ["#c82040", "#3a8a5a", "#2f6ab0", "#f0b429", "#b46bff", "#e0e0e0", "#ff8a3a"]; // the seven staff gems, canonical order (egg 2)
const FONT = "Impact, 'Luckiest Guy', 'Arial Black', sans-serif";

export default {
  id: "pr-topograph-432",
  title: "Overlord, Ainz (cartoon)",
  anime: "Overlord, Ainz (cartoon)",
  style: "western-cartoon",
  // cartoon law (bible sec. 2): uniform 3 px black line, flat fills, no grain, vignette 0.15, bloom only for the circle's gold (0.25).
  look: {
    fill: { lumaMax: 0.92, flat: 0.85, sat: 1.25, rim: 0 },
    lines: { px: 3, ink: "#000000", inkMix: 1, dist: 0, set: 1, setW: 1.4 },
    post: { bloom: 0.25, diffuse: 0, grain: 0, vig: 0.15, sat: 1.18, shafts: 0 },
  },
  fps: 8, // characters on threes
  duration: 29.38,
  seed: 432, // the PR number
  far: 400,
  plates: true,
  bg: "#09030f",

  palette: {
    // hall stone (lit / mid / shadow / deep)
    stoneLit: "#7a6aa0", stoneMid: "#4a3a78", stoneShadow: "#241044", deep: "#09030f",
    // cloak, gold, purple magic
    cloakLit: "#3a2a5a", cloakShadow: "#1a0f30",
    goldLit: "#ffd24a", goldMid: "#e6b43a", goldShadow: "#a8741a", goldHi: "#fff4c0",
    magic: "#b46bff", magicDeep: "#34205f",
    crimson: "#c82040", crimsonDeep: "#7a1428", lashCore: "#ff8a8a",
    furLit: "#f8f4ea", furShadow: "#cfc6b4", snow: "#c8d8e8",
    banner: ["#f0b429", "#c82040", "#3a8a5a", "#2f6ab0", "#8a3a9a", "#e0e0e0"],
    gems: GEM,
    // invaders
    plate: "#9aa0b0", plume: "#c82040", shield: "#f0b429", robe: "#2f6ab0", hat: "#1a3a8a", beard: "#f0f0f0",
    hood: "#3a8a5a", leather: "#7a4a2a", tabard: "#7a4a2a", helm: "#b8bcc8",
    ink: "#000000",
    // legacy keys read by shared helpers
    sky: "#241044", ground: "#4a3a78", key: "#fff4c0", accent: "#ffd24a",
  },

  // geometry every layer must agree on (m). Never hard-code these elsewhere.
  stage: {
    hall: { length: 40, width: 18, pillarH: 14, radius: 34 },
    stair: { steps: 7, rise: 0.4, topY: 2.8, footZ: -8.6, throneZ: -11.4 },
    ainz: [0, 0, -8.0],                                    // = seal.at
    invaders: { rows: [[-4.6, 5], [-2.6, 5]], span: 6.0 }, // [z, head count] per row (10 total); x spread = span
    warrior: [-1.5, 0, -2.6], mage: [0, 0, -2.6], rogue: [1.5, 0, -2.6], // the named three lead the front row
    soldiers: { n: 6, z0: 2.0, dz: 2.2, x: [-2.4, 2.4] },  // x alternates between the two values
    circle: { r: [8, 5.6, 3.4], glyphs: 24, rot: 20 },     // rings outer to inner, counter-rotating, deg/s
    walls: { w: 3, h: 6, x: [-4.2, 4.2], z: -5.0 },        // the two purple force slabs
    span: { z: 6, w: 3, len: 16 },                         // the bridge span that breaks under the invaders
    banners: { n: 41, gapIndex: 41 },                      // 41 hang, the 42nd place is empty (egg 1)
    maid: [-1.4, 2.8, -10.6],                              // Pleiades maid seal bowing beside the throne (egg 3)
  },

  // Ainz. Cartoon squash 20% on the slam (6 frames). Poses: idle sign fist raise crouch sit point spin blown blink awe.
  seal: {
    at: [0, 0, -8.0], yaw: 0, scale: 1.2,
    moves: [
      { t: [7.92, 8.30], to: [0, 0, -7.7] },   // lunges into the slam
      { t: [9.4, 10.6], to: [0, 0.4, -7.7] },  // rises on Fly, hover 0.4 m
      { t: [24.17, 24.7], to: [0, 0, -7.7] },  // lands for the credit
    ],
    track: [
      { t: 0.0, pose: "idle", dur: 0.3 },
      { t: 4.7, pose: "sign", dur: 0.4, hold: 2.5, out: 0.3 },       // beat 1: the opening sign while line A plays
      { t: 7.25, pose: "raise", dur: 0.45, hold: 0.3, out: 0.1 },    // beat 2: staff up
      { t: 7.92, pose: "crouch", dur: 0.12, hold: 0.25, out: 0.2 },  // the slam, squash
      { t: 8.55, pose: "awe", dur: 0.4, hold: 1.0, out: 0.3 },       // arms wide, "Rejoice!"
      { t: 9.4, pose: "raise", dur: 0.6, hold: 3.0, out: 0.5 },      // beat 3: rise on Fly
      { t: 14.0, pose: "fist", dur: 0.4, hold: 1.0, out: 0.3 },      // closing the circle
      { t: 15.4, pose: "raise", dur: 0.5, hold: 6.0, out: 0.5 },     // flex: staff raised, calm smile
      { t: 24.4, pose: "idle", dur: 0.4 },
      { t: 26.0, pose: "blink", dur: 0.2 },
    ],
  },

  // CAMERA LAW. az 0 = in front of the seal (+z hall), pi = behind. look = aim offset from the chest, seal-local.
  // `color` is the shot's colour script (bible); `warp` marks the slow-motion shots (see beat `warp`, cue.warp).
  shots: [
    // 1: 0.00-2.00 pull back and up, EWS. Island recedes into the purple vault; iris wipe opens. Cut.
    { n: 1, t: [0, 2.0], law: "wide", az: [0.9, 0.5], r: [12, 30], elev: [3, 14], fov: [28, 42], look: [[0, 0.2, 0], [0, 1.4, 0]],
      color: { dom: "violet", pal: ["#34205f", "#241044", "#f0b429", "#09030f", "#b46bff"] } },
    // 2: 2.00-4.58 wide hall, 35 mm, eye 1 m: pillars, banners, the circle blooms. Arc.
    { n: 2, t: [2.0, 4.58], law: "wide", az: [0.45, 0.2], r: [17, 14], elev: [1.0, 1.7], fov: 35, look: [[0, 1.8, 0.6], [0, 1.4, 0.3]],
      color: { dom: "purple-gold", pal: ["#4a3a78", "#241044", "#ffd24a", "#c82040", "#09030f"] } },
    // 3: 4.58-7.92 medium arc into the seal. 50 mm, arc to 0.349 rad, eye 0.5 m, low angle, fov 60. Cut.
    { n: 3, t: [4.58, 7.92], law: "arc", az: [0.95, 0.349], r: [6, 2.7], elev: [0.8, 0.45], fov: [52, 60], look: [0, 0.1, 0],
      color: { dom: "violet", pal: ["#4a3a78", "#241044", "#ffd24a", "#c82040", "#09030f"] } },
    // 4: 7.92-8.50 KILL ANGLE: ground level, looking up past the staff, fov 60. Hold.
    { n: 4, t: [7.92, 8.5], law: "kill", az: [-0.35, -0.6], r: [2.0, 1.7], elev: [-0.3, -0.25], fov: [60, 54], look: [0, 0.9, 0], dutch: [0, 6], ease: "snap",
      color: { dom: "gold-purple flash", pal: ["#ffd24a", "#b46bff", "#c82040", "#09030f", "#fff4c0"] } },
    // 5: 8.50-15.25 wide orbit in slow motion x0.4 (split 5a / 5b for the 5 s law). Span breaks, Fly, circles close.
    { n: 5, t: [8.5, 12.0], law: "wide", az: [0.6, 1.5], r: [7, 11], elev: [2.2, 4.5], fov: 40, look: [[0, 0.4, 1.5], [0, 0.6, 1.0]], warp: 0.4, ease: "linear",
      color: { dom: "violet", pal: ["#ffd24a", "#b46bff", "#c82040", "#09030f", "#fff4c0"] } },
    { n: 5.5, t: [12.0, 15.25], law: "wide", az: [-1.4, -2.3], r: [11, 14], elev: [4.5, 6], fov: 40, look: [0, 0.8, 0.8], warp: 0.4, ease: "linear",
      color: { dom: "violet", pal: ["#ffd24a", "#b46bff", "#c82040", "#09030f", "#fff4c0"] } },
    // 6: 15.25-24.17 medium flex, 50 mm low, the seal ABOVE the bubbles (aim pulled below the chest). Hold. (6a / 6b)
    { n: 6, t: [15.25, 19.7], law: "arc", az: [0.55, 0.12], r: [3.9, 3.2], elev: [0.35, 0.55], fov: 38, look: [0, -0.55, 0],
      color: { dom: "gold", pal: ["#ffd24a", "#e6b43a", "#34205f", "#f8f4ea", "#09030f"] } },
    { n: 6.5, t: [19.7, 24.17], law: "arc", az: [-0.15, -0.5], r: [3.4, 3.0], elev: [0.5, 0.35], fov: 38, look: [0, -0.5, 0],
      color: { dom: "gold", pal: ["#ffd24a", "#e6b43a", "#34205f", "#f8f4ea", "#09030f"] } },
    // 7: 24.17-29.38 credit, wide chase pose on open ground. Curtain drop, one short wipe home. (7a / 7b)
    { n: 7, t: [24.17, 26.8], law: "home", az: [3.14, 3.4], r: [3.4, 4.2], elev: [2, 2.6], fov: [36, 40], look: [0, 0.2, 3.2],
      color: { dom: "island snow, purple trim", pal: ["#f8f4ea", "#34205f", "#ffd24a", "#09030f", "#c8d8e8"] } },
    { n: 7.5, t: [26.8, 29.38], law: "home", az: [2.75, 3.14], r: [4.4, 4.0], elev: [2.4, 2.1], fov: [40, 37], look: [0, 0.2, 3.2],
      color: { dom: "island snow, purple trim", pal: ["#f8f4ea", "#34205f", "#ffd24a", "#09030f", "#c8d8e8"] } },
  ],

  // BEATS. Reserved: impact speedlines shock trauma pose. All others are FREE CUES read by world / cast / fx.
  // Tags: [W] world  [C] cast  [F] fx. k(name)=0..1 across dur; on(name)=inside its window; since(name)=s since start; done(name)=1 once started.
  beats: [
    // ---- shot 1 (0-2) ----
    { t: 0.0, name: "iris", dur: 2.0, open: 1 },            // [F] cartoon iris wipe opening on the seal
    { t: 0.0, name: "vault", dur: 2.0 },                     // [W] the island recedes into the purple vault as the camera rises
    // ---- shot 2 (2.0-4.58): the hall builds ----
    { t: 2.0, name: "hall_build", dur: 1.4 },                // [W] pillars, stair, carpet snap into place on threes
    { t: 2.0, name: "banners_fall", dur: 1.6 },              // [W] 41 guild banners drop into place; the 42nd hook stays empty (egg 1)
    { t: 2.3, name: "banner_gap", dur: 2.2 },                // [W] the empty 42nd hook glints (egg 1)
    { t: 2.3, name: "maid_bow", dur: 2.0 },                  // [C] Pleiades maid seal bows at the throne (egg 3); set dressing, not a victim
    { t: 2.4, name: "circle_bloom", dur: 1.0, rings: 3 },    // [F] magic circle rings grow flat under the seal, 24 f
    { t: 2.0, name: "dust", dur: 27.0 },                     // [F] hall dust motes, live all film
    { t: 2.0, name: "banner_sway", dur: 5.9 },               // [W] banners sway 1 px on threes (to the strike)
    // ---- shot 3 (4.58-7.92): line A ----
    { t: 4.58, name: "gems", dur: 3.4 },                     // [F] gem sparkles: 4-point stars, 2 f on / 4 f off
    { t: 4.58, name: "invaders_stand", dur: 3.4 },           // [C] ten invaders braced, soldiers lined up, rubber-hose idle
    { t: 4.58, name: "drum", dur: 0.2 },                     // [F] one-frame ring flick on the drum hit
    { t: 7.25, name: "staff_up", dur: 0.67 },                // [C] seal raises the seven-gem staff
    { t: 7.5, name: "mage_fizzle", dur: 0.45 },              // [C] mage casts a tiny fizzle, frames 0-4 of its reaction
    // ---- shot 4 (7.92-8.5): THE STRIKE ----
    { t: 7.92, name: "impact", seq: [[2, 1]] },              // reserved: one impact frame
    { t: 7.92, name: "slam", dur: 0.58 },                    // [C][F] staff slam into stone; squash 6 f (0.25 s)
    { t: 7.92, name: "smear", dur: 0.13 },                   // [F] smear-frame on the slam: stretch geometry plus trail, 3 f
    { t: 7.92, name: "floor_crack", dur: 0.58 },             // [F] crack runs out from the staff
    { t: 7.92, name: "stars", dur: 0.5 },                    // [F] cartoon impact stars
    { t: 7.92, name: "walls_rise", dur: 0.5 },               // [W][F] the two purple force walls rise, 12 f
    { t: 7.95, name: "lash_snap", dur: 0.55, count: 3 },     // [F] three crimson lashes snap back on the walls (smear arcs, squash)
    { t: 7.92, name: "gem_order", dur: 0.58 },               // [C][F] the seven gems flash in canonical order (egg 2)
    { t: 7.92, name: "ring_glint", dur: 0.58 },              // [C][F] the Ring of Ainz Ooal Gown glints on the flipper (egg 4)
    { t: 7.92, name: "victims_brace", dur: 0.25 },           // [C] frames 0-6 brace, shield up
    { t: 7.92, name: "speedlines", dur: 0.5, kind: "radial", at: [0.5, 0.42], strength: 0.9, col: "#fff4c0" },
    { t: 7.92, name: "shock", dur: 0.6, at: [0.5, 0.45], amp: 0.05, r1: 0.9 },
    { t: 7.92, name: "trauma", amount: 0.9 },
    // ---- shot 5 (8.5-15.25): slow motion x0.4 ----
    { t: 8.5, name: "warp", dur: 6.75, scale: 0.4 },         // [ALL] real-time slow motion; build.js exposes the eased factor as cue.warp, dilated clock cue.warpT
    { t: 8.5, name: "shield_shatter", dur: 0.6 },            // [C] warrior shield breaks into stars, frames 6-14
    { t: 8.6, name: "hat_off", dur: 0.5 },                   // [C] mage's hat flies away, frames 4-12
    { t: 8.6, name: "rogue_jump", dur: 0.5 },                // [C] rogue jumps 1 m, hovers cartoon-style 12 f, then runs
    { t: 8.7, name: "soldiers_domino", dur: 1.25 },          // [C] six soldiers ripple-fall like dominoes, frames 0-30, nearest first
    { t: 8.9, name: "span_break", dur: 1.4 },                // [W][F] the bridge span cracks and breaks under the invaders
    { t: 8.9, name: "shards", dur: 1.4 },                    // [F] span shards tumble
    { t: 9.1, name: "flee", dur: 1.6 },                      // [C] invaders flee down the hall, 14-30 f, 4 f tumbles
    { t: 9.4, name: "fly", dur: 1.2 },                       // [C][F] the seal rises on Fly, hover 0.4 m; whoosh trail
    { t: 9.4, name: "trauma", amount: 0.35 },
    { t: 9.8, name: "lash_snap", dur: 0.5, count: 3, wide: 1 }, // [F] second volley seen from the wide
    { t: 9.8, name: "lash_arcs", dur: 1.2 },                 // [F] arcs held across the slow-motion window
    { t: 14.0, name: "circle_close", dur: 1.4 },             // [F][W] the three rings spin shut and drop away, 24 f
    // ---- shot 6 (15.25-24.17): flex ----
    { t: 15.3, name: "flex", dur: 8.8 },                     // [C][F] staff held high; calm smile
    { t: 15.3, name: "rune432", dur: 3.0 },                  // [F][W] the hidden 432 rune lights in the circle / ceiling (egg 6)
    { t: 15.25, name: "gems", dur: 8.9 },                    // [F] gem star sparkle continues (2 f on / 4 f off)
    { t: 15.3, name: "fanfare", dur: 0.4 },                  // [F] gold star burst on the sting
    // ---- shot 7 (24.17-29.38): credit ----
    { t: 24.17, name: "curtain", dur: 0.5 },                 // [F] cartoon curtain drops (12 f); the set is struck like a stage
    { t: 24.17, name: "strike_set", dur: 2.4 },              // [W] hall flats fall away to open snow ground (island snow, purple trim)
    { t: 24.3, name: "stinger", dur: 0.3 },                  // [F] orchestral stinger: one gold ring flick
    { t: 28.88, name: "wipe_home", dur: 0.5 },               // [F] one short cartoon wipe home
  ],

  // LINES. Bubbles sit in the lower half, one at a time, off the seal. Bible lines are verbatim; the pool fills one silent gap.
  bubbles: [
    { t: [4.75, 7.35], text: "Ainz Ooal Gown is legend.", who: "seal", side: "l", tone: "say" },
    { t: [8.5, 11.6], text: "Rejoice!", who: "seal", side: "c", tone: "shout" },
    { t: [12.1, 14.9], pool: "lines", who: "seal", side: "r", tone: "say" },
    { t: [15.4, 22.9], text: "145 lines changed across 4 files. pods, nodes and daemonsets access no longer granted cluster wide.", who: "seal", side: "c", tone: "say" },
  ],
  lines: [
    "All hail the Supreme One.", "Kneel before the throne.", "No one leaves the Great Tomb.",
    "Forty-one of us built this hall.", "Is that all you brought?", "Your reach ends here.",
    "Access is earned, never assumed.", "Every door has a keeper.", "Nothing crosses this hall unseen.",
    "A cluster-wide key? Not in my tomb.", "Scope it down. Then scope it again.", "Even the walls take orders.",
    "Behold: least privilege.", "The span holds only for the invited.", "Rejoice. You are dismissed.",
  ],

  // SFX lettering: cartoon block capitals, placed away from the seal (the overlay also moves them).
  sfx: [
    { t: [7.92, 8.5], text: "BOOM!", at: [0.82, 0.26], size: 150, rot: -9, col: "#ffd24a", ink: "#000000", font: FONT },
    { t: [8.05, 8.5], text: "DOOM", at: [0.17, 0.3], size: 90, rot: 6, col: "#b46bff", ink: "#000000", font: FONT },
    { t: [8.95, 9.9], text: "CRACK!", at: [0.2, 0.28], size: 110, rot: -6, col: "#fff4c0", ink: "#000000", font: FONT },
    { t: [9.5, 10.5], text: "whoosh", at: [0.82, 0.34], size: 70, rot: 8, col: "#e0e0e0", ink: "#34205f", font: FONT },
  ],

  credit: { t: [24.4, 29.2], text: "dsx-ai-factory/topograph #432 / 145 lines gated" },
};
