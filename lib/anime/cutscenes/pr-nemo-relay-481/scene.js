// SCENE DATA for pr-nemo-relay-481: Dragon Ball Super, Ultra Instinct at the Tournament of Power.
// DIRECTION layer. Single source of truth for cue names and times (world / cast / fx read them via cue.on/k/arg/since).
// Bible: scripts/pr-nemo-relay-481.md. Bible frames are 24 fps; seconds here = frame/24. Runtime 25.0 s.
//
// CUE NAMES (free cues; reserved ones are impact, speedlines, shock, trauma, pose):
//   bell         0.0   single bell, stars bloom                                  (fx)
//   arenaIn      0.4   dur 1.9  mosaic disc fades in, 23-triangle outer band     (world; cue.k)
//   ledge        1.21  dur 1.1  gods assemble on the ledge, pudding, staff swirl (cast/world)
//   whisWatch    2.3   Whis calm smile, halo turns                               (cast)
//   beerusSway   2.3   Beerus sways, hands behind the back                       (cast)
//   lowStance    2.3   seal calm low stance                                      (cast/fx)
//   orbsBegin    2.9   first small orbs drift in                                 (fx/cast)
//   afterimage   3.4 once, then with every dodge; arg n                          (fx)
//   signFlicker  7.0   dur 0.5  grey 'Sign' aura flicker before silver           (fx)
//   ignite       7.5   dur 0.6  silver ignition, aura surge over 12 frames       (fx/cast)
//   earTwitch    7.5   Beerus ears twitch                                        (cast)
//   slowmo       8.08  dur 5.42 rate 0.5: layers scale their own motion by it   (fx/cast)
//   throw        x23   Jiren (or a trooper) throws, 8 frames; arg i              (cast)
//   orb          x23   one per PR file, 8.1..13.3; args i, from, big, dodge      (fx)
//   dodge        x4    8.55 9.95 11.35 12.65; args side (+1/-1), n               (fx/cast)
//   jirenStrain  11.0  dur 2.5 Jiren throws harder                               (cast)
//   sweat        11.43 Jiren's single sweat bead (frame 80 of the dodge shot)    (cast)
//   spend        13.5  dur 1.2 aura gutters, silver drains, Jiren blown back     (fx/cast)
//   staffTap     13.5  Whis taps the staff                                       (cast)
//   crumble      13.7  dur 3.0 (half speed) arena breaks outside-in on seams     (world; cue.k)
//   troopersFall 13.8  dur 1.2 four troopers thrown, tumble 6 frames             (cast)
//   crack        13.9  CRACK lettering                                           (fx)
//   skyBlocks    14.2  dur 2.6 sky dissolves in blocks                           (world/fx)
//   still        17.5  speed lines still, seal itself again                      (fx)
//   creditLight  18.79 dur 6.2 pale tinted light, island below                   (world/fx)
export const CUES = [
  "bell", "arenaIn", "ledge", "whisWatch", "beerusSway", "lowStance", "orbsBegin", "afterimage", "signFlicker", "ignite",
  "earTwitch", "slowmo", "throw", "orb", "dodge", "jirenStrain", "sweat", "spend", "staffTap", "crumble", "troopersFall",
  "crack", "skyBlocks", "still", "creditLight",
];

// 23 orbs, one per file of the PR (easter egg 3), 8.1..13.3 s. Four of them are the big dodged passes, snapped to the dodge times.
const DODGES = [8.55, 9.95, 11.35, 12.65];
const orbBeats = [];
for (let i = 0; i < 23; i++) {
  let t = 8.1 + (13.3 - 8.1) * (i / 22);
  let dodge = false;
  for (const d of DODGES) if (Math.abs(d - t) < 0.18) { t = d; dodge = true; }
  orbBeats.push({ t: +(t - 0.12).toFixed(3), name: "throw", dur: 0.33, i });
  orbBeats.push({ t: +t.toFixed(3), name: "orb", dur: 0.5, i, from: i % 5 === 4 ? "trooper" + (((i / 5) | 0) % 4) : "jiren", big: dodge || i === 21, dodge });
}

export default {
  id: "pr-nemo-relay-481",
  title: "Dragon Ball Super, Ultra Instinct",
  anime: "Dragon Ball Super, Ultra Instinct",
  style: "modern-anime",
  // Toei TV cel: bloom ~0.4, CA 1 px (split), grain 0.02, vignette 0.2, no lift. Hard shadow tone, coloured line.
  look: {
    fill: { sat: 1.08 },
    lines: { px: 2.5, dist: 1, set: 0.8 },
    post: { bloom: 0.4, diffuse: 0.1, shafts: 0.2, sat: 1.08, split: [-0.01, 0, 0.01], grain: 0.02, vig: 0.2 },
  },
  fps: 12,
  duration: 25,
  seed: 481,
  far: 1500,
  bg: "#0a0814",
  palette: {
    sky: "#0a0814", nebulaA: "#5a1a28", nebulaB: "#2a4a3a", nebulaC: "#3a2a5a", orb: "#fff8d8", orbBand: "#c8a868",
    stoneCream: "#e8d8c0", stoneTerra: "#a86a48", stoneBlue: "#6a7a8a", stoneShadow: "#3a3a4a",
    silverCore: "#f6f9ff", silver: "#c9d4e8", silverEdge: "#a8d8ff", silverOuter: "#6a8ac8", silverHair: "#e8f0ff", silverShade: "#a8b8d8", silverDeep: "#5a6a98",
    kiCore: "#fff2a0", kiMid: "#f0a030", kiRim: "#d86020", kiOrange: "#ff8a1f", kiPink: "#ff4fc8", fieldA: "#d06ad0", fieldB: "#8a4ad8",
    gi: "#f08a1f", giBlue: "#2a50c0", whisRobe: "#8a1a3a", whisSash: "#38a0d0", whisHalo: "#7ad0f0", whisHair: "#e8ecf8", gold: "#f0c030", beerusSkin: "#9a78b0",
    jirenRed: "#c82040", white: "#f4f4f0", visor: "#1a1020", ground: "#6a7a8a", key: "#fff8d8", accent: "#a8d8ff", ink: "#0a0a1e",
  },
  // Stage layout for the layers, metres, seal at the origin facing +z. Layers may read ctx.scene.stage.
  stage: {
    arenaCenter: [0, -0.2, 0], arenaRadius: 24, arenaThick: 1.4, pillar: 8,
    orbWorld: [-30, 22, -40], // luminous orb world, upper-left
    ledge: [-5.5, 0.9, -3.4], whis: [-6.2, 0.9, -3.4], beerus: [-4.8, 0.9, -3.4], pudding: [-4.2, 0.9, -3.0],
    jiren: [0, 0, 6.4], troopers: [[-3.2, 0, 7.4], [-1.5, 0, 8.2], [1.5, 0, 8.2], [3.2, 0, 7.4]],
    orbFrom: [0, 1.3, 6.1], dodgeSide: 0.95,
  },
  // Hero seal: sign, calm low stance, arms-out ignition, eyes-shut dodges (blink), spent slump, stands.
  seal: {
    at: [0, 0, 0], yaw: 0, scale: 1,
    moves: [
      { t: [8.4, 8.62], to: [0.95, 0, 0] }, { t: [8.62, 9.2], to: [0, 0, 0] },
      { t: [9.8, 10.02], to: [-0.95, 0, 0] }, { t: [10.02, 10.6], to: [0, 0, 0] },
      { t: [11.2, 11.42], to: [0.95, 0, 0] }, { t: [11.42, 12.0], to: [0, 0, 0] },
      { t: [12.5, 12.72], to: [-0.95, 0, 0] }, { t: [12.72, 13.3], to: [0, 0, 0] },
    ],
    track: [
      { t: 0.0, pose: "sign", dur: 2.3, hold: 0.2 },
      { t: 2.3, pose: "crouch", dur: 4.6, hold: 4.4, out: 0.2, k: 0.55 },
      { t: 7.0, pose: "fist", dur: 0.5, hold: 0.1, out: 0.1, k: 0.4 },
      { t: 7.5, pose: "raise", dur: 0.6, hold: 0.4, out: 0.2 },
      { t: 8.3, pose: "blink", dur: 5.1, hold: 5.0, out: 0.1 },
      { t: 13.5, pose: "sit", dur: 2.2, hold: 1.8, out: 0.4, k: 0.8 },
      { t: 16.0, pose: "idle", dur: 9, hold: 9 },
    ],
  },
  // Camera law. Bible shots 3, 5, 6, 7 run over 5 s, so each is authored as two hard-cut shots (no auto-split).
  shots: [
    { n: 1, bible: 1, t: [0, 1.21], law: "wide", az: 0.7, r: [10, 22], elev: [3, 14], fov: [28, 42], look: [[0, 0.2, 0], [0, 1.2, 0]], ease: "smooth", minFrac: 0.03,
      colour: ["#0a0814", "#5a1a28", "#3a2a5a", "#e8d8c0", "#fff8d8"] },
    { n: 2, bible: 2, t: [1.21, 2.29], law: "wide", az: [0.9, 0.75], r: [12, 9], elev: [2.5, 4], fov: 35, look: [[-1, 0.4, 0], [-2, 1.4, -1]], ease: "smooth", minFrac: 0.04,
      colour: ["#0a0814", "#5a1a28", "#3a2a5a", "#e8d8c0", "#fff8d8"] },
    { n: 3, bible: 3, t: [2.29, 5.0], law: "arc", az: [0.95, 0.35], r: [6.2, 4.2], elev: [1.8, 1.1], fov: 48, look: [[-0.8, 0.6, 0], [-0.5, 0.35, 0]], ease: "smooth",
      colour: ["#3a2a5a", "#c9d4e8", "#ff8a1f", "#0a0814", "#a8d8ff"] },
    { n: "3b", bible: 3, t: [5.0, 7.5], law: "arc", az: [-0.524, -0.7], r: [4.2, 3.6], elev: [1.1, 0.9], fov: [48, 44], look: [[0, 0.3, 0], [0, 0.1, 0]], ease: "smooth", cutAz: 0.5,
      colour: ["#3a2a5a", "#c9d4e8", "#ff8a1f", "#0a0814", "#a8d8ff"] },
    { n: 4, bible: 4, t: [7.5, 8.08], law: "kill", az: [-0.2, -0.3], r: [2.2, 1.8], elev: [0.5, 0.55], fov: 48, look: [0, 0.2, 0], dutch: [0, 4], ease: "snap",
      colour: ["#f6f9ff", "#c9d4e8", "#a8d8ff", "#6a8ac8", "#0a0814"] },
    { n: 5, bible: 5, t: [8.08, 10.8], law: "arc", az: [0.5, 1.3], r: [4.4, 4.4], elev: [0.8, 0.9], fov: 40, look: [0, 0.2, 1.6], ease: "linear",
      colour: ["#ff8a1f", "#ff4fc8", "#c9d4e8", "#3a2a5a", "#0a0814"] },
    { n: "5b", bible: 5, t: [10.8, 13.5], law: "arc", az: [-1.3, -0.5], r: [4.6, 4.2], elev: [0.9, 0.8], fov: 40, look: [0, 0.2, 1.6], ease: "linear", cutAz: 0.5,
      colour: ["#ff8a1f", "#ff4fc8", "#c9d4e8", "#3a2a5a", "#0a0814"] },
    { n: 6, bible: 6, t: [13.5, 16.1], law: "wide", az: [0.6, 0.9], r: [5, 12], elev: [2, 8], fov: [36, 44], look: [[0, 0.3, 0.8], [0, 0.6, 1.5]], ease: "smooth", minFrac: 0.05,
      colour: ["#6a7a8a", "#e8d8c0", "#5a1a28", "#0a0814", "#a8d8ff"] },
    { n: "6b", bible: 6, t: [16.1, 18.79], law: "wide", az: [-0.8, -0.5], r: [12, 15], elev: [8, 11], fov: 44, look: [[0, 0.6, 1.5], [0, 0.3, 0]], ease: "smooth", minFrac: 0.05, cutAz: 0.5,
      colour: ["#6a7a8a", "#e8d8c0", "#5a1a28", "#0a0814", "#a8d8ff"] },
    { n: 7, bible: 7, t: [18.79, 22.0], law: "home", az: Math.PI, r: [3.4, 3.8], elev: [2, 2.3], fov: [36, 38], look: [0, 0.2, 3.2], ease: "smooth",
      colour: ["#f4f4f0", "#c8d8e8", "#a8d8ff", "#5a1a28", "#3a2a5a"] },
    { n: "7b", bible: 7, t: [22.0, 25.0], law: "home", az: Math.PI - 0.35, r: [3.8, 4.2], elev: [2.3, 2.8], fov: 38, look: [0, 0.2, 3.2], ease: "smooth", cutAz: 0.4,
      colour: ["#f4f4f0", "#c8d8e8", "#a8d8ff", "#5a1a28", "#3a2a5a"] },
  ],
  beats: [
    { t: 0.0, name: "bell" },
    { t: 0.4, name: "arenaIn", dur: 1.9 },
    { t: 1.21, name: "ledge", dur: 1.1 },
    { t: 1.21, name: "shock", dur: 0.5, at: [0.5, 0.5], amp: 0.2, r1: 0.5 },
    { t: 2.3, name: "whisWatch" }, { t: 2.3, name: "beerusSway" }, { t: 2.3, name: "lowStance" },
    { t: 2.3, name: "speedlines", dur: 4.7, kind: "speed", strength: 0.1, col: "#ffffff" }, // calm
    { t: 2.9, name: "orbsBegin" },
    { t: 3.4, name: "afterimage", n: 0, dur: 0.6 },
    { t: 7.0, name: "signFlicker", dur: 0.5 },
    { t: 7.5, name: "ignite", dur: 0.6 },
    { t: 7.5, name: "earTwitch" },
    { t: 7.5, name: "impact", seq: [[0, 1], [1, 2]] },
    { t: 7.5, name: "speedlines", dur: 0.6, kind: "radial", at: [0.5, 0.45], strength: 1, col: "#f6f9ff" }, // surge at ignition
    { t: 7.5, name: "shock", dur: 0.6, at: [0.5, 0.45], amp: 0.5, r1: 0.9 },
    { t: 7.5, name: "trauma", amount: 0.5 },
    { t: 8.08, name: "slowmo", dur: 5.42, rate: 0.5 },
    { t: 8.08, name: "speedlines", dur: 5.4, kind: "speed", strength: 0.85, col: "#ffffff" }, // thick through dodges
    ...orbBeats,
    ...DODGES.flatMap((d, i) => [
      { t: d, name: "dodge", dur: 0.5, side: i % 2 ? -1 : 1, n: i },
      { t: d + 0.1, name: "afterimage", n: i + 1, dur: 0.5 },
      { t: d, name: "speedlines", dur: 0.4, kind: "radial", at: [0.5, 0.5], strength: 0.6, col: "#f6f9ff" },
    ]),
    { t: 11.0, name: "jirenStrain", dur: 2.5 },
    { t: 11.43, name: "sweat" },
    { t: 13.5, name: "spend", dur: 1.2 },
    { t: 13.5, name: "staffTap" },
    { t: 13.5, name: "impact", seq: [[0, 2], [2, 1]] },
    { t: 13.5, name: "shock", dur: 1.0, at: [0.5, 0.55], amp: 0.35, r1: 1.2 },
    { t: 13.5, name: "trauma", amount: 0.9 },
    { t: 13.7, name: "crumble", dur: 3.0 },
    { t: 13.8, name: "troopersFall", dur: 1.2 },
    { t: 13.9, name: "crack" },
    { t: 14.2, name: "skyBlocks", dur: 2.6 },
    { t: 17.5, name: "still" },
    { t: 18.79, name: "creditLight", dur: 6.2 },
  ],
  // One bubble at a time, lower half.
  bubbles: [
    { t: [2.3, 4.6], text: "Ultra Instinct… the body moves on its own.", who: "narr", side: "l", tone: "say" }, // Whis-seal
    { t: [8.2, 12.8], text: "23 files. One scaffold. I didn't even think.", who: "seal", side: "r", tone: "say" },
    { t: [13.5, 16.8], text: "That's the power of the gods.", who: "narr", side: "l", tone: "say" }, // Beerus-seal
  ],
  // The 15-line character-voiced pool (L12: epic sincerity, never seal-humour).
  lines: [
    "My body moves before my mind can.",
    "Don't think. Let it flow.",
    "Silence the doubt, and the path opens.",
    "Every strike is already behind me.",
    "I have never stopped climbing.",
    "Stillness is the fastest thing there is.",
    "Reach past the limit and keep reaching.",
    "One scaffold. Every request. No hesitation.",
    "I only want to see how far I can go.",
    "The strongest are the ones who still learn.",
    "Not power. Calm.",
    "There is always another peak.",
    "The eyes close; the body remembers.",
    "Win or lose, the fight was worth it.",
    "Mastery is not trying anymore.",
  ],
  sfx: [
    { t: [0.0, 0.8], text: "DONG", at: [0.82, 0.3], size: 0.07, rot: -6, col: "#e8d8c0" },
    { t: [1.25, 1.8], text: "WHOOSH", at: [0.2, 0.72], size: 0.08, rot: -10, col: "#c9d4e8" },
    { t: [2.4, 3.2], text: "SHHN", at: [0.78, 0.7], size: 0.08, rot: 8, col: "#c9d4e8" },
    { t: [7.5, 8.4], text: "FWOOOM", at: [0.2, 0.78], size: 0.12, rot: -5, col: "#f6f9ff" },
    { t: [8.55, 8.9], text: "WHIFF", at: [0.78, 0.74], size: 0.07, rot: 10, col: "#ff8a1f" },
    { t: [9.95, 10.3], text: "WHIFF", at: [0.2, 0.74], size: 0.07, rot: -10, col: "#ff4fc8" },
    { t: [11.35, 11.7], text: "WHIFF", at: [0.78, 0.76], size: 0.07, rot: 8, col: "#ff8a1f" },
    { t: [12.65, 13.0], text: "WHIFF", at: [0.2, 0.76], size: 0.07, rot: -8, col: "#ff4fc8" },
    { t: [13.5, 13.9], text: "TING", at: [0.2, 0.7], size: 0.07, rot: -6, col: "#a8d8ff" },
    { t: [13.9, 15.2], text: "CRACK", at: [0.78, 0.78], size: 0.14, rot: 6, col: "#e8d8c0" },
  ],
  credit: {
    t: [18.79, 25.0],
    text: "NVIDIA/NeMo-Relay #481 · merged · 23 files / One unchanging scaffold now keys to one profile instead of one per task.",
  },
};
