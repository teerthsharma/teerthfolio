// SCENE DATA for pr-polychrom-79 (Fate/Zero, Gilgamesh: Gate of Babylon). DIRECTION layer. Pure data: no imports, no code.
// The single source of truth for cue names and times: world, cast and fx read these beats through `cue`.
// Bible: scripts/pr-polychrom-79.md. Run time 28.2 s (bible card). Law: wide -> arc -> kill -> home, a cut at least every 5 s.
//
// CUE VOCABULARY (free cues; reserved = impact speedlines shock trauma pose)
//  world : skyRedden  gateGlow  grailRise  shardsFall  islandReveal  collapse
//  portals (world+fx): portalFirst, portalArcA, portalArcB, portalArcC (3 staggered arcs, 0.08 s gap),
//          portalDense (the whole 90-portal sky, 3 depth layers), portalRipple (2 rings/s on twos)
//  weapons (cast+fx): weaponEmerge (slide out 0.6 m over 12 frames), volley (fire at the target, trail), glint,
//          gaeBolg, enkidu, hilts16 (sixteen hilts fade one by one, 14.0 s), grailRise
//  key   : keyRise (24 frames), keyTurn, circuits (36 frames), gateOpen, halo, lockClick
//  ea    : eaDraw, eaSpin (3 -> 12 turns/s), eaLevel, spiral (48 frames), enuma (the blast, 21.2 s), enumaShatter
//  victims (cast): kneel (6 mongrels, 'Kneel, mongrels'), saberGuard, saberDeflect, saberSlide, lancerSpin, lancerLeap,
//          riderBrace, riderCapeRip, riderBlown, berserkStagger, berserkFall, victimsDive
//  hero  : cloakFlare, flex, dnaRings (linked rings on the cloak hem, 14.0 s)
// Consolidate: cue names the layers read, at the bible times (agreement with the layers' fallbacks).
const LAYER_CUES = [
  { t: 2.29, name: "portals" },
  { t: 7.21, name: "key" },
  { t: 14, name: "ea" },
  { t: 23, name: "shatter" },
  { t: 2.3, name: "grail" },
  { t: 3, name: "chains" },
  { t: 14, name: "hilts" },
  { t: 2.3, name: "gate" },
];

export default {
  id: "pr-polychrom-79",
  title: "Fate, Gilgamesh: Gate of Babylon",
  anime: "Fate, Gilgamesh: Gate of Babylon",
  style: "modern-anime",
  // ufotable cel: crimson-gold, glow held below white, hard 3-tone cel, dark red-brown contour, no lift of blacks.
  look: {
    fill: { lumaMax: 0.92, sat: 1.12, rim: 0.6, ring: 0.8 },
    lines: { px: 2, ink: "#3a0a10", inkMix: 1, setCol: "#3a0a10", setMix: 1, set: 0.85 },
    post: {
      bloom: 0.5, diffuse: 0.12, shafts: 0.4, shaftCol: "#ffb020",
      gain: [1.06, 0.97, 0.9], gamma: [1, 1.02, 1.08], sat: 1.15, split: [0.04, -0.01, -0.03],
      misreg: 1.5, grain: 0.02, vig: 0.25,
    },
    timing: { fps: 12 },
  },
  fps: 12,
  duration: 28.2,
  seed: 79,
  far: 1500,
  plates: true,
  bg: "#3a0610",
  palette: {
    sky: "#c3122e", skyDeep: "#8a0c1e", skyDark: "#3a0610", skyStreak: "#ff4a5a",
    gold: "#ffb020", goldLit: "#ffe27a", goldShadow: "#c98a12", goldDeep: "#6a3a08", core: "#fff2c0", glow: "#ff8a1a",
    hair: "#ffe27a", hairLit: "#fff2a0", hairShadow: "#e6b43a",
    cloak: "#d3122e", cloakShadow: "#8a0c1e", cloakDeep: "#3a0610",
    steel: "#8a98b8", steelLit: "#e8f0ff", steelShadow: "#3a4560", steelDeep: "#0e1220",
    circuit: "#ff2a3a", eaShaft: "#1a0a10", eaSeg: "#d3122e", eaSegLit: "#ff2a3a",
    stone: "#d8c8a8", stoneShadow: "#8a6a50", snow: "#f4f4f0", ice: "#c8d8e8",
    ink: "#3a0a10", key: "#ffe27a", accent: "#ffb020", ground: "#8a6a50",
  },
  // Gilgamesh stands low in frame, arms spread (the owner's reference), the Gate above.
  seal: {
    at: [0, 0, 0], yaw: 0, scale: 1,
    moves: [
      { t: [8.3, 9.1], to: [0, 0, 0.5] },
      { t: [14.0, 15.2], to: [0, 0, 0] },
    ],
    // sign (smirk) -> arms spread (awe, the reference pose) -> key raised -> volley (spread) -> Ea drawn (crouch)
    // -> Ea levelled (point) -> blast (fist braced) -> return (idle) -> the flex fist
    track: [
      { t: 0.0, pose: "sign", dur: 0.4, hold: 1.8, out: 0.3 },
      { t: 2.3, pose: "awe", dur: 0.5, hold: 4.4, out: 0.3 },
      { t: 7.2, pose: "raise", dur: 0.5, hold: 0.6, out: 0.3 },
      { t: 8.3, pose: "awe", dur: 0.4, hold: 5.0, out: 0.3 },
      { t: 14.0, pose: "crouch", dur: 0.4, hold: 1.0, out: 0.3 },
      { t: 15.4, pose: "point", dur: 0.6, hold: 5.2, out: 0.3 },
      { t: 21.2, pose: "fist", dur: 0.2, hold: 1.6, out: 0.3 },
      { t: 23.0, pose: "idle", dur: 0.6, hold: 3.0, out: 0.3 },
      { t: 26.4, pose: "fist", dur: 0.4, hold: 1.4, out: 0.4 },
    ],
  },
  // CAMERA LAW. Bible shots 1-8 (24 fps frames converted to seconds), long shots pre-split so none passes 5 s.
  // `col` is the per-shot colour script (five swatches the layers read through cue.shot.col).
  shots: [
    // 1 pull back and up, EWS, fov 28 -> 42, crimson fade in
    { n: 1, t: [0, 1.21], law: "wide", az: 0.7, r: [4, 15], elev: [1, 12], fov: [28, 42], look: [[0, 0.2, 0], [0, 2.4, 0]], ease: "smooth",
      col: ["#c3122e", "#8a0c1e", "#ffe27a", "#ffb020", "#3a0610"] },
    // 2 wide, the switch: first portal
    { n: 2, t: [1.21, 2.29], law: "wide", az: [0.7, 0.5], r: [9, 7], elev: [4, 3], fov: 38, look: [[0, 1.6, 0], [0, 2.4, 0]], ease: "smooth",
      col: ["#c3122e", "#8a0c1e", "#ffe27a", "#ffb020", "#3a0610"] },
    // 3a medium low arc into the seal from -0.524 rad, eye 1.6 m, looking up at the dome
    { n: 3, t: [2.29, 4.8], law: "arc", az: [-0.524, -0.15], r: [5.2, 3.2], elev: [1.0, 0.7], fov: [58, 50], look: [[0, 1.6, 0], [0, 1.9, 0]], ease: "smooth",
      col: ["#c3122e", "#8a0c1e", "#ffe27a", "#ffb020", "#3a0610"] },
    // 3b the arc turns to the other flank (a cut, new angle) while weapons slide out
    { n: 4, t: [4.8, 7.21], law: "arc", az: [0.9, 0.4], r: [4.4, 3.0], elev: [0.6, 0.9], fov: [56, 48], look: [[0, 1.5, 0], [0, 2.0, 0]], ease: "smooth",
      col: ["#c3122e", "#8a0c1e", "#ffe27a", "#ffb020", "#3a0610"] },
    // 4 KILL ANGLE: ground level, up at the key, 85 mm
    { n: 5, t: [7.21, 8.29], law: "kill", az: [-0.3, -0.5], r: [2.4, 1.9], elev: [0.5, 0.4], fov: [34, 26], look: [0, 0.9, 0.3], dutch: [0, 4], ease: "snap",
      col: ["#ffe27a", "#ff2a3a", "#fff2c0", "#8a0c1e", "#c98a12"] },
    // 5 wide, the volley: 28 mm sweep across the dome (two sweeps, a cut between)
    { n: 6, t: [8.29, 11.2], law: "wide", az: [1.0, 0.2], r: [7, 9], elev: [1.8, 4], fov: [50, 56], look: [[0, 2.2, 0], [0, 3.2, 0]], ease: "smooth",
      col: ["#ffe27a", "#c3122e", "#e8f0ff", "#8a0c1e", "#ffb020"] },
    { n: 7, t: [11.2, 14.0], law: "wide", az: [-0.9, -0.2], r: [8, 6], elev: [2.4, 1.2], fov: [52, 46], look: [[0, 2.8, 0], [0, 1.6, 0]], ease: "smooth",
      col: ["#ffe27a", "#c3122e", "#e8f0ff", "#8a0c1e", "#ffb020"] },
    // 6 medium close, Ea: 50 mm rising behind the seal (az pi), the red-black grade takes over
    { n: 8, t: [14.0, 17.4], law: "arc", az: [2.7, 2.9], r: [3.2, 3.6], elev: [0.8, 2.2], fov: [40, 44], look: [[0, 0.5, 1.5], [0, 1.6, 3]], ease: "smooth",
      col: ["#d3122e", "#1a0a10", "#ff2a3a", "#ffe27a", "#8a0c1e"] },
    { n: 9, t: [17.4, 21.2], law: "arc", az: [-1.1, -0.6], r: [3.6, 2.6], elev: [1.2, 0.8], fov: [34, 28], look: [[0, 0.9, 0.4], [0, 0.9, 0.8]], ease: "smooth",
      col: ["#d3122e", "#1a0a10", "#ff2a3a", "#ffe27a", "#8a0c1e"] },
    // 7 KILL: Enuma Elish, dolly back from the blade tip
    { n: 10, t: [21.2, 23.0], law: "kill", az: [-0.15, -0.5], r: [1.9, 3.6], elev: [0.55, 1.1], fov: [24, 36], look: [0, 0.2, 1.0], dutch: [0, 5], ease: "snap",
      col: ["#d3122e", "#1a0a10", "#ff2a3a", "#ffe27a", "#8a0c1e"] },
    // 8 credit, wide, the chase pose in open ground, shards fall and the island is revealed
    { n: 11, t: [23.0, 25.8], law: "home", az: 3.1, r: [3.4, 4.0], elev: [2.0, 2.4], fov: [36, 38], look: [0, 0.2, 3.2], ease: "smooth",
      col: ["#f4f4f0", "#ffe27a", "#d3122e", "#c8d8e8", "#8a6a50"] },
    { n: 12, t: [25.8, 28.2], law: "home", az: [2.7, 2.2], r: [4.2, 5.2], elev: [2.4, 3.2], fov: 38, look: [0, 0.4, 3.0], ease: "smooth",
      col: ["#f4f4f0", "#ffe27a", "#d3122e", "#c8d8e8", "#8a6a50"] },
  ],
  beats: [
    ...LAYER_CUES,
    // ---- shots 1-2: crimson fade, bell, first portal (chime) ----
    { t: 0.0, name: "skyRedden", dur: 1.2 },
    { t: 0.2, name: "trauma", amount: 0.12 },
    { t: 1.3, name: "portalFirst", dur: 0.8 },
    { t: 1.3, name: "gateGlow", dur: 1.0 },
    // ---- shot 3: three arcs of portals open (0.08 s gap inside an arc), weapons slide out, grail, Enkidu, Gae Bolg ----
    { t: 2.3, name: "portalArcA", dur: 1.4, gap: 0.08 },
    { t: 2.3, name: "grailRise", dur: 2.2 },
    { t: 2.3, name: "kneel", dur: 0.5 },
    { t: 2.6, name: "shock", dur: 0.5, at: [0.5, 0.5], amp: 0.5, r1: 0.7 },
    { t: 2.7, name: "weaponEmerge", dur: 0.5, group: "A" },
    { t: 3.0, name: "enkidu", dur: 1.6 },
    { t: 3.2, name: "portalArcB", dur: 1.4, gap: 0.08 },
    { t: 3.5, name: "weaponEmerge", dur: 0.5, group: "B" },
    { t: 4.0, name: "portalDense", dur: 1.8 },
    { t: 4.4, name: "portalArcC", dur: 1.4, gap: 0.08 },
    { t: 4.5, name: "weaponEmerge", dur: 0.6, group: "C" },
    { t: 5.0, name: "gaeBolg", dur: 1.4 },
    { t: 5.0, name: "glint", dur: 0.2, n: 6 },
    { t: 5.8, name: "glint", dur: 0.2, n: 8 },
    { t: 6.2, name: "cloakFlare", dur: 0.8 },
    { t: 6.4, name: "speedlines", dur: 0.8, kind: "radial", at: [0.5, 0.55], strength: 0.6, col: "#ffe27a" },
    // ---- shot 4: the key and the vault gate (lock-click) ----
    { t: 7.2, name: "keyRise", dur: 1.0 },
    { t: 7.2, name: "halo", dur: 1.1 },
    { t: 7.3, name: "keyTurn", dur: 1.0 },
    { t: 7.4, name: "glint", dur: 0.15, n: 3 },
    { t: 7.45, name: "circuits", dur: 1.5 },
    { t: 7.9, name: "lockClick", dur: 0.2 },
    { t: 8.0, name: "gateOpen", dur: 0.9 },
    { t: 8.0, name: "trauma", amount: 0.3 },
    // ---- shot 5: the volley, victims dive, 'Hah' ----
    { t: 8.3, name: "volley", dur: 5.7, wave: 1 },
    { t: 8.3, name: "portalDense", dur: 5.7 },
    { t: 8.3, name: "impact", seq: [[1, 1], [2, 1]] },
    { t: 8.3, name: "speedlines", dur: 1.4, kind: "speed", at: [0.55, 0.45], strength: 0.9, col: "#e8f0ff" },
    { t: 8.4, name: "victimsDive", dur: 1.2 },
    { t: 8.6, name: "saberGuard", dur: 0.28 },
    { t: 8.88, name: "saberDeflect", dur: 0.28 },
    { t: 9.16, name: "saberSlide", dur: 0.5 },
    { t: 8.9, name: "lancerSpin", dur: 0.4 },
    { t: 9.4, name: "lancerLeap", dur: 0.6 },
    { t: 9.2, name: "riderBrace", dur: 0.4 },
    { t: 9.55, name: "riderCapeRip", dur: 0.2 },
    { t: 9.7, name: "riderBlown", dur: 0.7 },
    { t: 10.0, name: "berserkStagger", dur: 0.6 },
    { t: 10.6, name: "berserkFall", dur: 0.5 },
    { t: 9.0, name: "volley", dur: 4.5, wave: 2 },
    { t: 10.5, name: "volley", dur: 3.3, wave: 3 },
    { t: 8.6, name: "trauma", amount: 0.25 },
    { t: 10.0, name: "trauma", amount: 0.2 },
    { t: 11.4, name: "trauma", amount: 0.2 },
    { t: 12.2, name: "glint", dur: 0.2, n: 10 },
    { t: 12.6, name: "speedlines", dur: 1.0, kind: "speed", at: [0.4, 0.5], strength: 0.8, col: "#ffe27a" },
    // ---- shot 6: the claim line, sixteen hilts, DNA rings on the cloak, Ea drawn ----
    { t: 14.0, name: "hilts16", dur: 3.2 },
    { t: 14.0, name: "dnaRings", dur: 4.0 },
    { t: 14.2, name: "eaDraw", dur: 1.2 },
    { t: 15.0, name: "eaSpin", dur: 6.2, from: 3, to: 12 },
    { t: 15.4, name: "eaLevel", dur: 0.6 },
    { t: 15.6, name: "spiral", dur: 5.6 },
    { t: 16.0, name: "flex", dur: 0.6 },
    { t: 17.4, name: "trauma", amount: 0.2 },
    { t: 19.0, name: "trauma", amount: 0.3 },
    { t: 20.0, name: "trauma", amount: 0.4 },
    { t: 20.4, name: "speedlines", dur: 0.8, kind: "radial", at: [0.55, 0.5], strength: 0.9, col: "#ff4a5a" },
    // ---- shot 7: ENUMA ELISH at 21.2 s ----
    { t: 21.2, name: "impact", seq: [[1, 2], [2, 2]] },
    { t: 21.2, name: "enuma", dur: 2.0 },
    { t: 21.2, name: "shock", dur: 1.4, at: [0.5, 0.5], amp: 1.0, r1: 1.2 },
    { t: 21.2, name: "trauma", amount: 0.9 },
    { t: 21.3, name: "speedlines", dur: 1.2, kind: "radial", at: [0.5, 0.5], strength: 1.0, col: "#ffe27a" },
    { t: 21.6, name: "enumaShatter", dur: 1.6 },
    { t: 22.4, name: "impact", seq: [[2, 1]] },
    // ---- shots 8-9: the return, shards fall, island with the Fountain, collapse at 27.4-27.8 ----
    { t: 23.0, name: "shardsFall", dur: 4.4 },
    { t: 23.0, name: "islandReveal", dur: 2.2 },
    { t: 23.4, name: "trauma", amount: 0.1 },
    { t: 27.4, name: "collapse", dur: 0.4 },
    { t: 27.4, name: "impact", seq: [[2, 1]] },
  ],
  // bubbles: lower half, one at a time, never overlapping
  bubbles: [
    { t: [2.4, 4.7], text: "Gate of Babylon. Kneel, mongrels.", who: "seal", side: "r", tone: "say" },
    { t: [8.4, 11.6], text: "Let me show you a treasure worthy of the King.", who: "seal", side: "l", tone: "shout" },
    { t: [11.9, 13.9], pool: "lines", who: "seal", side: "r", tone: "say" },
    { t: [14.1, 20.6], text: "11/11 test pairs agree with the fix, 1/11 on master. Mismatched frees: 16 to 0.", who: "seal", side: "c", tone: "say" },
  ],
  // the 15-line character-voiced pool (Gilgamesh)
  lines: [
    "Raise your heads only to look at the sky.",
    "A fake in the vault of a king? Impossible.",
    "Every treasure in the world was mine first.",
    "Hah. Is that all the resistance you carry?",
    "The link flips once, and the sign is right.",
    "Sixteen frees became none. Count them again.",
    "Mongrel, you are standing on a correct ring.",
    "Eleven pairs agree. One on master did not.",
    "Look up. The gate has opened for the proof.",
    "Master said one in eleven. I say never again.",
    "Even a wrong sign bows to the right twist.",
    "Open, Gate. Show the swords what they guard.",
    "Two rings, one knot, and the king is right.",
    "Kneel, and the numbers will kneel with you.",
    "Enuma Elish is only the last of the checks.",
  ],
  sfx: [
    { t: [1.3, 2.0], text: "CHIME", at: [0.2, 0.7], size: 0.07, rot: -6, col: "#fff2c0", ink: "#3a0a10" },
    { t: [7.9, 8.3], text: "CLICK", at: [0.72, 0.7], size: 0.07, rot: 4, col: "#fff2c0", ink: "#3a0a10" },
    { t: [8.3, 9.4], text: "HAH!", at: [0.78, 0.68], size: 0.12, rot: 8, col: "#ffe27a", ink: "#3a0a10" },
    { t: [9.2, 10.0], text: "THUNK", at: [0.3, 0.72], size: 0.08, rot: -10, col: "#e8f0ff", ink: "#0e1220" },
    { t: [21.3, 22.7], text: "ENUMA ELISH!", at: [0.5, 0.76], size: 0.13, rot: -3, col: "#ffe27a", ink: "#8a0c1e" },
    { t: [23.0, 23.9], text: "SHATTER", at: [0.25, 0.74], size: 0.08, rot: 6, col: "#ff4a5a", ink: "#3a0610" },
  ],
  credit: { t: [23.4, 28.0], text: "open2c/polychrom #79\n11/11 pairs agree, back at the Fountain of Immortality" },
};
