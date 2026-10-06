// SCENE DATA for pr-openxla-46539: "United States of Smash" (My Hero Academia, in a golden-age comic).
// DIRECTION layer. Pure data, no imports. THE SINGLE SOURCE OF TRUTH for cue names and times: world, cast and fx read them
// through `cue` (cue.on / cue.k / cue.since / cue.done) and through `ctx.scene` (colorScript, stage, cast).
// Bible: scripts/pr-openxla-46539.md. Bible frames are 24 fps; every time below is seconds = frame / 24.
//
// STAGE (seal-local metres, x right, y up, z forward; seal.yaw = 0 so world = seal frame at the start):
//   the hero seal starts at the origin facing +z. The Nomu stands in the crater at stage.nomu (z = 9), the League seals behind
//   it, the rooftop civilians on the blocks at x = +-9..14. The dash moves the seal from z 0 to z 6.4 (contact at 8.6 s).
//
// CUE TABLE (name | t | dur | who listens):
//   halftoneIn      0.00  1.00  world/fx   Ben-Day dots fade in over the island recede (shot 1)
//   rain            0.30  9.30  world/fx   rain falls (k = 0..1 ramps density), reverses at rainReverse
//   rumble          1.00  1.60  world/cast crater shake, dust (SFX RUMBLE)
//   fireFlare       1.00  1.60  world/fx   fire-sheet flames flare from below on both sides, on twos
//   nomuRise        1.00  1.58  cast       Nomu rises out of the crater (36 frames = 1.5 s)
//   plusUltra       1.00  0.10  world      easter egg: PLUS ULTRA on the rubble slab, UA crest on the left sign (visible from 1.0 s on)
//   cardsThrow      3.60  1.20  cast/fx    the Nomu throws two answer cards (A cyan #19d3ff, B magenta #ec2a8a)
//   cardsGlow       3.60  3.40  fx         the cards glow and spin on twos until the dash
//   growl           3.00  1.00  cast       Nomu snarl (jaw), brain dome pulse
//   sealCrouch      6.40  0.80  cast       (read-only) seal wind-up; the League seals brace
//   dash            7.20  1.40  cast/fx    Detroit Smash dash: the seal moves 0 -> 6.4 m (scene.seal.moves), speed streaks
//   goonsBrace      7.00  1.60  cast       League goons raise knives, Shigaraki grins wide
//   detroitText     8.00  0.90  fx         easter egg: 'Detroit Smash' print type along the dash
//   smash           8.60  0.10  all        THE STRIKE, frame 206. Fires impact, speedlines, shock, trauma (reserved beats below)
//   starburst       8.60  0.125 fx         b/w starburst for 3 frames
//   freeze          8.60  0.083 all        2-frame freeze: build.js holds the layer clock at 8.60 for those 2 frames (cue.frozen)
//   flash           8.725 0.50  fx/world   red-black impact flash #471f19, decays
//   oneForAll       8.60  0.40  fx         cyan arcs flick once across the fist (easter egg)
//   dome            8.683 0.583 fx         white ring + dome to 40 m in 14 frames, with debris (k 0..1)
//   debris          8.683 1.40  fx         rubble, glass, embers on ones
//   blocksWreck     8.683 0.80  world      blocks near the dome are wrecked (collapse, dust)
//   nomuRecoil      8.60  0.33  cast       Nomu recoils frames 0-8
//   villainsTumble  8.683 0.50  cast       goons tumble 6 frames, Shigaraki gloats 0-4 then tumbles back 3 m over 4-12, Kurogiri mist scatters
//   civiliansDuck   8.60  0.25  cast       rooftop civilians duck at the dome (frames 0-6)
//   stormBlast      9.42  1.20  world/fx   the storm is blasted into a vortex
//   vortex          9.42  2.40  world      vortex spiral scroll in the sky plate (14 frames)
//   rainReverse     9.60  1.60  fx         rain reverses to an updraft (k 0..1: down -> up)
//   skyOpen         9.60  2.60  world/fx   night navy -> clear blue, white cumulus; the sky pillar opens (k 0..1)
//   sunShaft        10.40 2.60  world/fx   column of sunlight #fff3b0 floods the street (engine.sun)
//   civiliansCheer  10.80 3.60  cast       civilians cheer on twos
//   flagsWave       10.80 3.60  cast/fx    hero flags
//   panelBorder     14.00 1.00  fx         the 12 px panel border returns around the frame
//   cardsSmash      14.40 0.33  cast/fx    the two cards smashed into one gold card (8 frames), the check; cards read 2 then 1 (easter egg)
//   punch           14.40 0.50  cast/fx    the screen punch (seal fist at the lens, 2.2 m in front)
//   issueBox        14.40 5.00  fx         'XLA' in the comic issue box at the border corner (easter egg)
//   pageTear        15.00 1.00  fx         the shockwave cracks and tears the page (24 frames), RIIIP
//   shards          15.00 4.40  fx         paper shards fall (paper-shard fall into shot 7)
//   islandReveal    19.42 1.20  world/fx   the island behind the torn page (open ground)
//   goldMotes       19.42 5.50  fx         gold motes drift
//   cheer           19.60 3.00  cast       a last cheer for the credit
//
// Reserved beats handled by the player: impact, speedlines, shock, trauma, pose.
// Extra fields on `cue` set by build.js each frame: cue.script (colorScript of the shot), cue.frozen, cue.stage.
const SMASH = 8.6;

// Consolidate: cue names the layers read, at the bible times (agreement with the layers' fallbacks).
const LAYER_CUES = [
  { t: 1, name: "rise" },
  { t: 9.42, name: "sky_open" },
  { t: 14.42, name: "tear" },
  { t: 3.4, name: "cards" },
  { t: 8.6, name: "ofa" },
  { t: 19.42, name: "credit" },
];

export default {
  id: "pr-openxla-46539",
  title: "United States of Smash",
  anime: "My Hero Academia",
  style: "spider-verse-comic", // the owner's golden-age comic over a Bones cel: Ben-Day, off-register, thick ink
  look: {
    // bible section 2 compositing: ink #12070a, grain 0.02, vignette 0.25, Ben-Day cell 6 at 25 % in the shadow band,
    // off-register 1-2 px, paper tint #f4ecd8 at 10 %, no lift of blacks.
    fill: { t: 0.5, toneAmt: 0.25, toneScale: 6, rim: 0.7 },
    lines: { px: 3, ink: "#12070a" },
    post: { bloom: 0.7, diffuse: 0.08, sat: 1.18, misreg: 1.5, grain: 0.02, vig: 0.25, paper: "#f4ecd8", paperAmt: 0.1, paperKind: 0, shafts: 0.35, shaftCol: "#fff3b0" },
  },
  fps: 12, // twos for characters; ones on the freeze and the debris are done by the layers from cue.t
  duration: 24.9,
  seed: 46539,
  far: 1800,
  palette: {
    sky: "#162149", skyMid: "#1c2a61", skyDeep: "#101831", dayTop: "#2c53af", dayMid: "#667da9", dayLow: "#d0e7fb", cloud: "#f4f8ff", sun: "#fff3b0",
    ground: "#a04a2a", groundLit: "#d86a3a", groundShadow: "#4a1a1a", wall: "#1a1620", wallDeep: "#0a0a12", railing: "#c82020",
    windowLit: "#ffcf20", windowDead: "#14121e", fireCore: "#fff2a0", fireMid: "#ffcf20", fireEdge: "#ff8a20", fireHole: "#7a2a10",
    nomu: "#3a3a46", nomuLit: "#5a5a66", nomuDeep: "#1a1a24", brain: "#e8a0b8", brainMid: "#b8607a", brainDeep: "#5a1a2a", beak: "#1a1a20", nomuEye: "#ffcf20",
    suit: "#1c2a61", suitLit: "#3a4a98", red: "#c82020", white: "#f4f0e8", vLight: "#fff3b0", eye: "#40d0ff",
    cardA: "#19d3ff", cardB: "#ec2a8a", gold: "#ffc800", check: "#1f5fe0",
    flash: "#471f19", ink: "#12070a", paper: "#f4ecd8", border: "#05020a",
    key: "#fff3b0", accent: "#ffc800",
  },
  // where things stand: read by world (railings, blocks), cast (Nomu, League, civilians) and fx (dome, cards)
  stage: {
    nomu: [0, 0, 9], crater: [0, 0, 9], dashTo: [0, 0, 6.4], smashAt: [0, 0.6, 7.6],
    domeR: 40, avenue: { w: 14, len: 80 },
    cards: { a: [-1.4, 2.2, 6.4], b: [1.4, 2.2, 6.4], size: [0.8, 1.1] },
    leagueBehindNomu: [[-2.4, 0, 11], [2.4, 0, 11], [-4, 0, 12.4], [4, 0, 12.4], [-1, 0, 13.2], [1.2, 0, 13.6]],
    rooftops: [[-11, 9, 4], [-12, 12, 12], [-10, 7, 20], [11, 10, 5], [12, 14, 14], [10, 8, 22]],
  },
  // the cast list (data for the cast layer; costumes via kit defineCostume / COSTUMES)
  cast: {
    nomu: { height: 4.2, shoulder: 1.8, dome: 0.6 },
    shigaraki: { n: 1, coat: "#8a8a96", hair: "spiky", hairCol: "#8a98b8", mask: "#e8d8c0", expr: "smug" },
    kurogiri: { n: 1, scarf: "#1a1620", eyes: "#ffcf20", plate: "#8a8a96" },
    goons: { n: 4, coat: "#333b4f", trim: "#c82020", weapon: "knife", mask: true },
    civilians: { n: 6, shirts: ["#ff8a20", "#3a8a5a", "#2f6ab0", "#ffffff", "#ff8a20", "#2f6ab0"], phones: true, flags: true },
  },
  seal: {
    at: [0, 0, 0], yaw: 0, scale: 1,
    // Detroit Smash dash: 1.4 s run-up to the contact at 8.6 s, then it holds.
    moves: [{ t: [7.2, SMASH], to: [0, 0, 6.4] }],
    // beat 1 crouch, 2 spring, 3 dash, 4 punch up, flex fist. Poses are the locked pup set only.
    track: [
      { t: 0.0, pose: "idle" },
      { t: 3.0, pose: "raise", dur: 0.5, hold: 2.6, out: 0.3 }, // shot 3: the seal raises a fist at the Nomu
      { t: 6.4, pose: "crouch", dur: 0.4, hold: 0.5, out: 0.15 }, // wind-up
      { t: 7.0, pose: "fist", dur: 0.2, hold: 1.5, out: 0.1 }, // spring and dash
      { t: SMASH, pose: "raise", dur: 0.08, hold: 0.9, out: 0.3 }, // the punch lands, fist up
      { t: 10.0, pose: "awe", dur: 0.4, hold: 2.4, out: 0.4 }, // the sky opens
      { t: 13.2, pose: "crouch", dur: 0.3, hold: 0.8, out: 0.1 }, // gather for the screen punch
      { t: 14.4, pose: "raise", dur: 0.12, hold: 3.0, out: 0.4 }, // screen punch, fist raised, flex
      { t: 19.5, pose: "sign", dur: 0.4, hold: 4.5, out: 0.4 }, // the credit
    ],
  },
  // THE CAMERA LAW. Bible shots 3 (6.0 s) and 7 (5.5 s) exceed 5 s, so each is cut in two by hand.
  // Order wide -> arc -> kill -> home; the sky and screen-punch shots are `free` inserts so no order warning is raised.
  shots: [
    // 1. frames 0-24, EWS: pull back and up, fov 28 -> 42 (halftone fade-in)
    { n: 1, t: [0, 1.0], law: "wide", az: 0.7, r: [6, 15], elev: [2, 12], fov: [28, 42], look: [[0, 0.4, 3], [0, 1.2, 6]], ease: "smooth" },
    // 2. frames 24-62: wide, the switch. Dark street, fire both sides, the Nomu rises. 35 mm
    { n: 2, t: [1.0, 2.58], law: "wide", az: [-0.55, -0.4], r: [12, 9], elev: [3, 2.6], fov: [40, 38], look: [[0, 1.4, 5], [0, 1.8, 7]], ease: "smooth" },
    // 3a. frames 62-134: medium low arc into the seal, eye 1.3 m, tipped up, fov 62 closing
    { n: 3, t: [2.58, 5.58], law: "arc", az: [0.95, 0.5], r: [5.2, 3.0], elev: [1.3, 0.9], fov: [62, 46], look: [0, 0.35, 0.8], ease: "smooth" },
    // 3b. hard cut to the other flank, the cards in the air behind the raised fist
    { n: 3.5, t: [5.58, 8.58], law: "arc", az: [-0.8, -0.35], r: [3.4, 2.5], elev: [1.0, 0.8], fov: [48, 36], look: [0, 0.45, 1.2], ease: "smooth", dutch: [0, -3] },
    // 4. frames 206-226: KILL ANGLE, the Detroit Smash dash. Low push-in at 28 mm, look +0.6 toward the Nomu
    { n: 4, t: [8.58, 9.42], law: "kill", az: [-0.35, -0.6], r: [2.7, 1.9], elev: [0.9, 0.75], fov: [28, 24], look: [0, 0.6, 1.2], dutch: [0, 6], ease: "snap" },
    // 5. frames 226-346: swing up and wide, 24 mm: the sky opens (free insert). Held 5.0 s exactly
    { n: 5, t: [9.42, 14.42], law: "free", az: [2.3, 0.8], r: [5, 16], elev: [1.5, 11], fov: [50, 56], look: [[0, 0.8, 2], [0, 4.5, 4]], ease: "smooth", minFrac: 0.05, cutAz: 0.5 },
    // 6a. frames 346-: screen punch, close on the seal, 50 mm at 2.2 m in front of the pup (page tear lands at 15.0)
    { n: 6, t: [14.42, 17.0], law: "free", az: [0.0, 0.12], r: [2.2, 2.0], elev: [0.35, 0.3], fov: [27, 25], look: [0, 0.35, 0], ease: "smooth", minFrac: 0.2 },
    // 6b. cut in from the other shoulder after the tear, the shards falling past
    { n: 6.5, t: [17.0, 19.42], law: "free", az: [-0.5, -0.25], r: [2.6, 2.3], elev: [0.5, 0.7], fov: [32, 30], look: [0, 0.3, 0.4], ease: "smooth", minFrac: 0.16 },
    // 7a. frames 466-: credit, behind and above, the chase pose in open ground (the island behind the page)
    { n: 7, t: [19.42, 22.2], law: "home", az: Math.PI, r: [3.4, 3.9], elev: [2.0, 2.4], fov: [35, 38], look: [0, 0.2, 3.2], ease: "smooth" },
    // 7b. hard cut to a higher three-quarter chase for the last 2.7 s
    { n: 7.5, t: [22.2, 24.92], law: "home", az: [2.55, 2.75], r: [4.2, 4.6], elev: [2.8, 3.2], fov: [36, 38], look: [0, 0.2, 3.0], ease: "smooth" },
  ],
  // colour script per shot (bible shot colour scripts); layers read cue.script (or ctx.scene.colorScript[cue.shotN])
  colorScript: {
    1: { name: "Navy", palette: ["#162149", "#101831", "#ec2a8a", "#19d3ff", "#ffc800"], light: "moon", fireAmt: 0.2, gain: [0.9, 0.95, 1.1] },
    2: { name: "Orange from below", palette: ["#ffcf20", "#ff8a20", "#1a1620", "#162149", "#c82020"], light: "fire", fireAmt: 1, gain: [1.15, 0.98, 0.85] },
    3: { name: "Navy and cyan", palette: ["#162149", "#19d3ff", "#ec2a8a", "#ffcf20", "#12070a"], light: "fire+cards", fireAmt: 0.8, gain: [1.0, 1.0, 1.08] },
    3.5: { name: "Navy and cyan", palette: ["#162149", "#19d3ff", "#ec2a8a", "#ffcf20", "#12070a"], light: "fire+cards", fireAmt: 0.8, gain: [1.0, 1.0, 1.08] },
    4: { name: "Red-black", palette: ["#471f19", "#12070a", "#ffffff", "#ffc800", "#c82020"], light: "flash", fireAmt: 1, gain: [1.2, 0.9, 0.85] },
    5: { name: "Blue-gold", palette: ["#2c53af", "#d0e7fb", "#fff3b0", "#162149", "#ffcf20"], light: "sun", fireAmt: 0.3, gain: [1.02, 1.02, 1.0] },
    6: { name: "Gold-white", palette: ["#ffc800", "#ffffff", "#ec2a8a", "#12070a", "#19d3ff"], light: "gold", fireAmt: 0, gain: [1.08, 1.04, 0.92] },
    6.5: { name: "Gold-white", palette: ["#ffc800", "#ffffff", "#ec2a8a", "#12070a", "#19d3ff"], light: "gold", fireAmt: 0, gain: [1.08, 1.04, 0.92] },
    7: { name: "Island", palette: ["#f4f4f0", "#ffc800", "#c8d8e8", "#12070a", "#ec2a8a"], light: "day", fireAmt: 0, gain: [1.03, 1.02, 0.98] },
    7.5: { name: "Island", palette: ["#f4f4f0", "#ffc800", "#c8d8e8", "#12070a", "#19d3ff"], light: "day", fireAmt: 0, gain: [1.03, 1.02, 0.98] },
  },
  beats: [
    ...LAYER_CUES,
    // ---- shots 1-2: the island recedes under dots, rain, the crater wakes
    { t: 0.0, name: "halftoneIn", dur: 1.0 },
    { t: 0.3, name: "rain", dur: 9.3 },
    { t: 1.0, name: "fireFlare", dur: 1.6 },
    { t: 1.0, name: "rumble", dur: 1.6, amount: 0.35 },
    { t: 1.0, name: "nomuRise", dur: 1.58 },
    { t: 1.0, name: "plusUltra", dur: 0.1 },
    { t: 1.0, name: "trauma", amount: 0.25 },
    // ---- shot 3: the Nomu throws two answers, the seal raises a fist
    { t: 3.0, name: "growl", dur: 1.0 },
    { t: 3.6, name: "cardsThrow", dur: 1.2 },
    { t: 3.6, name: "cardsGlow", dur: 3.4 },
    { t: 6.4, name: "sealCrouch", dur: 0.8 },
    { t: 7.0, name: "goonsBrace", dur: 1.6 },
    { t: 7.2, name: "dash", dur: 1.4 },
    { t: 7.2, name: "speedlines", dur: 1.4, kind: "speed", at: [0.5, 0.5], strength: 0.8, col: "#ffffff" },
    { t: 8.0, name: "detroitText", dur: 0.9 },
    // ---- shot 4: THE SMASH. impact: b/w starburst 3 frames, 2-frame freeze (inverted), then swapped red-black
    { t: SMASH, name: "smash", dur: 0.1 },
    { t: SMASH, name: "impact", seq: [[2, 3], [1, 2], [2, 2]] },
    { t: SMASH, name: "starburst", dur: 0.125 },
    { t: SMASH, name: "freeze", dur: 0.083 },
    { t: SMASH, name: "oneForAll", dur: 0.4 },
    { t: SMASH, name: "nomuRecoil", dur: 0.33 },
    { t: SMASH, name: "civiliansDuck", dur: 0.25 },
    { t: SMASH, name: "speedlines", dur: 0.5, kind: "radial", at: [0.5, 0.48], strength: 1, col: "#ffffff" },
    { t: SMASH, name: "trauma", amount: 1 },
    { t: 8.683, name: "dome", dur: 0.583 },
    { t: 8.683, name: "shock", dur: 0.583, at: [0.5, 0.5], amp: 0.9, r1: 1.1 },
    { t: 8.683, name: "debris", dur: 1.4 },
    { t: 8.683, name: "blocksWreck", dur: 0.8 },
    { t: 8.683, name: "villainsTumble", dur: 0.5 },
    { t: 8.725, name: "flash", dur: 0.5 },
    // ---- shot 5: the sky opens
    { t: 9.42, name: "stormBlast", dur: 1.2 },
    { t: 9.42, name: "vortex", dur: 2.4 },
    { t: 9.42, name: "trauma", amount: 0.5 },
    { t: 9.6, name: "skyOpen", dur: 2.6 },
    { t: 9.6, name: "rainReverse", dur: 1.6 },
    { t: 10.4, name: "sunShaft", dur: 2.6 },
    { t: 10.8, name: "civiliansCheer", dur: 3.6 },
    { t: 10.8, name: "flagsWave", dur: 3.6 },
    // ---- shot 6: screen punch, the answers become one, the page tears
    { t: 14.0, name: "panelBorder", dur: 1.0 },
    { t: 14.4, name: "cardsSmash", dur: 0.33 },
    { t: 14.4, name: "punch", dur: 0.5 },
    { t: 14.4, name: "issueBox", dur: 5.0 },
    { t: 14.4, name: "impact", seq: [[2, 2], [1, 1]] },
    { t: 14.4, name: "speedlines", dur: 0.6, kind: "radial", at: [0.5, 0.5], strength: 0.9, col: "#ffffff" },
    { t: 14.4, name: "trauma", amount: 0.7 },
    { t: 15.0, name: "pageTear", dur: 1.0 },
    { t: 15.0, name: "shards", dur: 4.4 },
    { t: 15.0, name: "shock", dur: 0.6, at: [0.5, 0.5], amp: 0.7, r1: 1.3 },
    { t: 15.0, name: "trauma", amount: 0.5 },
    // ---- shot 7: the island behind the page, the credit
    { t: 19.42, name: "islandReveal", dur: 1.2 },
    { t: 19.42, name: "goldMotes", dur: 5.5 },
    { t: 19.6, name: "cheer", dur: 3.0 },
  ],
  // bubbles: lower half, one at a time (the overlay slides them off the seal); windows never overlap
  bubbles: [
    { t: [3.1, 5.7], who: "foe", side: "r", tone: "say", y: 0.64, text: "Two runs. Two answers. Prove which one is real, little seal." },
    { t: [5.9, 7.1], who: "seal", side: "l", tone: "say", y: 0.66, pool: "lines" },
    { t: [8.7, 9.4], who: "foe", side: "r", tone: "shout", y: 0.66, text: "I am here!" },
    { t: [10.6, 12.4], who: "seal", side: "l", tone: "think", y: 0.66, pool: "lines" },
    { t: [14.45, 17.4], who: "seal", side: "c", tone: "shout", y: 0.68, text: "UNITED STATES OF SMASH!" },
  ],
  // the 15-line pool, All Might's voice at seal size: bright, steady, never mean
  lines: [
    "Fear not! A seal is here!",
    "Same program. Same answer. Every time.",
    "Two outputs? Only one of you is true.",
    "Five lines. That is all it takes!",
    "Deterministic! Look it up!",
    "I am what I am, every single run!",
    "A hero smiles when it is hard!",
    "Go beyond! Plus ultra!",
    "Stable output, coming right up!",
    "Why am I smiling? Reproducible!",
    "Fear not, the order is fixed now.",
    "That race ends today!",
    "Leave it to the compiler? Not on my watch!",
    "One answer. Gold standard.",
    "The same input, the same hero!",
  ],
  // SFX lettering, placed off the seal's screen box (the overlay also moves it)
  sfx: [
    { t: [1.1, 2.4], text: "RUMBLE", at: [0.2, 0.78], size: 0.07, rot: -4, col: "#ffcf20", ink: "#12070a" },
    { t: [3.3, 4.4], text: "GRRRR", at: [0.8, 0.28], size: 0.08, rot: 5, col: "#ec2a8a", ink: "#12070a" },
    { t: [8.0, 8.55], text: "DETROIT SMASH", at: [0.27, 0.84], size: 0.05, rot: -6, col: "#ffffff", ink: "#12070a" },
    { t: [8.6, 9.4], text: "SMASH!", at: [0.78, 0.26], size: 0.2, rot: -9, col: "#ffc800", ink: "#12070a" },
    { t: [9.45, 11.2], text: "KA-BOOM", at: [0.22, 0.24], size: 0.11, rot: 7, col: "#fff3b0", ink: "#12070a" },
    { t: [15.0, 16.4], text: "RIIIP", at: [0.2, 0.3], size: 0.15, rot: -5, col: "#ffffff", ink: "#12070a" },
    { t: [19.7, 21.2], text: "CHEER!", at: [0.82, 0.3], size: 0.07, rot: 4, col: "#ffc800", ink: "#12070a" },
  ],
  credit: { t: [19.6, 24.9], text: "openxla/xla #46539 · 5 lines, deterministic / Same program, two outputs before, one stable output after." },
};
