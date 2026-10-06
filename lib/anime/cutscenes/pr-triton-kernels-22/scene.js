// SCENE DATA for pr-triton-kernels-22: Jujutsu Kaisen, Sukuna's Malevolent Shrine, Dismantle and Cleave (PROTECTED look, law L7).
// DIRECTION layer. Single source of truth for cue names, times and the camera. Bible: scripts/pr-triton-kernels-22.md section 5 and 6.
// Run time 29.3 s. The bible's 8 shots are re-timed here WITHOUT overlap (the bible's shots 2 and 3 overlap at 2.71-4.5) and
// every shot is <= 5 s (camera law L3: a cut at least every 5 s), so a longer bible shot is split into two hard cuts.
//
// FRAME / STAGE (data the layers read as ctx.scene.stage; the seal frame is x right, y up, z forward, yaw turns it):
//   The seal stands at the origin FACING THE SHRINE (world -z): seal.yaw = PI (if yaw 0 already faces -z, flip that one value).
//   Shrine centre world (0,0,-78), scale 0.9, TOP 47 m, mouth centre local (0, 8.2, 9.2), jaw HINGE local (0, 5.2, 6.0).
//   Shibuya crossing around the seal (avenue half width 10.5). Ice-block triangle (55 blocks, rows q = 0..9 hold q+1 blocks, cube
//   1.2 m) stands ahead of the seal at world (0,0,-9), rows receding. 12 victim seals on the crossing: 1 Jogo, 3 Mahoraga, 8 students.
//   The camera sits BEHIND/BESIDE the seal (az ~ 2.2 .. 3.4) and looks past it at the shrine, so the seal is never covered.
//   Mirror hall (teal) is NOT built: INDEX decision 6 default keeps the protected palette; stage.mirrorHall = false.
//
// CUE NAMES (free cues; layers read them with cue.on/k/since/done/arg). Reserved ones are played by the framework.
//   WORLD:  drawIn 0-2 (ink draw-in wipe from the seal) | crossingDraw 2.0-4.5 | skyBleed 2.0-4.5 (red veins flood the sky)
//           poolSpread 2.0-4.5 | haloFlicker 2.7 (egg 5, window in the skyline) | skullCount 3.6 (egg 4: 17 skulls, 804 bones)
//           skyFloodRed 13.6-14.2 (red floods everything at the Cleave) | skyDrain 14.2-18.0 (sky drains to paper)
//           rubOut 16.3-18.0 (drawing rubbed out from the horizon in) | islandReturn 18.0-20.0 | wipeHome 28.55-29.3
//           lampTopple 9.0 | signsOut 8.6-12.0 | zebraGap 10.4 (egg 3: the 56th block missing from the zebra)
//   CAST:   shrineRise 2.7-3.7 (back.out, 24 frames) | jaw 4.6 and 5.1 (dur 0.4, one drop per word of "Domain Expansion.")
//           jawSnap 14.0-14.3 | shrineDissolve 14.3-16.3 (ink flakes) | blocksRise 2.2-4.0 | blocksSchedule 7.5-8.1 (path glows red)
//           cleaveSplit 13.6-14.0 (every unscheduled block splits on its diagonal) | pulseRow 18.2-21.2 (10 rows, one row at a time)
//           victimBrace 4.5-7.5 | victimRun 8.1-13.6 | haloShatter 13.6-13.85 | sealFlex 18.0 | fourEyes 16.3 (egg 2, one drawing)
//           fingerCards 8.1 (egg 6: 20 cards) | magicEyes 2.7-24.0
//   SLASH:  "slash" x18 from 8.1 (args: i, ang rad, len 0..1 of frame, w px, tri 1 = strikes the triangle, heavy 0|1|2 (2 = Cleave),
//           cx, cy frame fractions, v = victim index thrown). Every layer keys its per-slash reaction (building cut, victim thrown,
//           sparks, glass, dust, debris) off cue.fired entries named "slash" and their args; world cuts a building, cast throws victim v.
//   FX:     drone 0-4.4 | tritone 2.2 and 7.5 | bell 3.6 | choir 4.0-7.5 | heartbeat 4.0-7.5 | flick 7.5-8.1 (flipper flick)
//           shing 8.1 and 16.3 | don 10.4 | cleave 13.6-14.1 (heavy red-white cut) | redMono 13.6-13.7 | finalSlash 16.3
//           flashPaper 18.0-18.15 (tinted #ece5d2) | letterbox 2.0-8.13 (driven by build.js) | domainClosed 14.4-17.0 (lettering, pops on twos)
//           chime 18.2 | wipe 28.55
// RESERVED used: pose (via seal.track), impact, speedlines, shock, trauma.
const RED = "#d1081f", PAPER = "#f4efe2";

// 18 slashes from 8.1 s: gap 0.25 s easing to 0.40 s => slash 8 lands at 10.38 (snapped to the 10.4 heavy hit), slash 17 at 13.6 (the Cleave).
const slashes = [];
{
  let t = 8.1;
  for (let i = 0; i < 18; i++) {
    const heavy = i === 8 ? 1 : i === 17 ? 2 : 0;
    const tt = heavy === 1 ? 10.4 : heavy === 2 ? 13.6 : t;
    const ang = ((20 + ((i * 37) % 51)) * Math.PI / 180) * (i % 2 ? -1 : 1); // 20..70 degrees, alternating hand, straight not curved
    slashes.push({
      t: +tt.toFixed(3), name: "slash", dur: 0.25, i, ang: +ang.toFixed(4),
      len: heavy === 2 ? 1.0 : +(0.2 + 0.6 * (((i * 53) % 100) / 100)).toFixed(3), // 20-80 % of frame length
      w: heavy ? 60 : 2 + (i * 7) % 14, tri: i % 3 === 0 ? 1 : 0, heavy,
      cx: +(0.2 + 0.6 * (((i * 29) % 100) / 100)).toFixed(3), cy: +(0.25 + 0.5 * (((i * 71) % 100) / 100)).toFixed(3),
      v: i % 12,
    });
    t += 0.25 + 0.15 * (i / 17);
  }
}

// Consolidate: cue names the layers read, at the bible times (agreement with the layers' fallbacks).
const LAYER_CUES = [
  { t: 2, name: "draw" },
  { t: 2, name: "bleed" },
  { t: 2.7, name: "rise" },
  { t: 16.3, name: "close" },
  { t: 16.5, name: "dissolve" },
  { t: 16.3, name: "drain" },
  { t: 18, name: "rub" },
  { t: 18, name: "pulse" },
  { t: 2.7, name: "halo" },
  { t: 2.7, name: "shrine" },
  { t: 8.1, name: "barrage" },
  { t: 18, name: "flex" },
  { t: 10.4, name: "heavy" },
  { t: 16.5, name: "closed" },
];

export default {
  id: "pr-triton-kernels-22",
  title: "Jujutsu Kaisen, Sukuna: Malevolent Shrine (PROTECTED)",
  anime: "Jujutsu Kaisen, MAPPA: Shibuya Incident, Malevolent Shrine, Dismantle and Cleave",
  style: "modern-anime",
  // MAPPA S2: manga ink on paper, heavy diffusion glow (strength 0.35), edge chromatic aberration 1-2 px, grain 0.02, vignette 0.3,
  // blacks crushed to #050206 with no lift (L14). Characters on twos, 2-band cel fill, contour #0e0b0d.
  look: {
    post: { grain: 0.02, vignette: 0.3, bloom: 0.35, aberration: 1.5, box: 0 },
    lines: { color: "#0e0b0d", width: 3 },
    fill: { bands: 2 },
  },
  fps: 12,
  duration: 29.3,
  seed: 2201,
  far: 1500,
  plates: true,
  bg: "#050206",
  palette: {
    // protected ink look
    paper: "#ece5d2", ink: "#0e0b0d", red: "#c8081c", sky: "#050206", ground: "#1a1a2a", key: "#f4efe2", accent: "#c8081c",
    // sky veins
    veinDark: "#6a0610", veinMid: "#b3081c", veinHot: "#e5142e", haze: "#3a0a14",
    // shrine
    hornLit: "#b8b0e8", hornShadow: "#5a4a98", hornFlare: "#f0eef8", eaveHot: "#ff9a2a", eaveRed: "#d1260c",
    pillar: "#d1260c", pillarShadow: "#5a0a0a", teeth: "#dbe4f0", teethShadow: "#7a8aa8", roof: "#1a3a3a", rubble: "#20323c",
    // slash and ice
    slashCore: "#f4efe2", slashEdge: "#d1081f", slashDeep: "#7a0610", ice: "#f4efe2", iceShadow: "#b9b2a0", scheduled: "#e5142e",
    islandTeal: "#9fb0c0",
    // victims
    jogoHide: "#8a3a1a", lava: "#ff6a2a", charcoal: "#2a2a30", volcano: "#5a2a1a", mahoragaCloak: "#d8d4c8", mask: "#f4efe2",
    jacket: "#1a2440", button: "#c9a02a", blade: "#cfd5df", hairBrown: "#5a3a24",
    // hero decals
    sukunaPink: "#f08aa0", eyeRed: "#c8081c", eyeRing: "#2a0c10", kimono: "#f2efe6",
    sfx: RED, sfxStroke: PAPER,
  },
  stage: {
    shrine: { at: [0, 0, -78], scale: 0.9, top: 47, mouth: [0, 8.2, 9.2], hinge: [0, 5.2, 6.0] },
    triangle: { at: [0, 0, -9], rows: 10, blocks: 55, cube: 1.2 },
    victims: { jogo: 1, mahoraga: 3, students: 8 },
    mirrorHall: false,
  },
  // Hero: Enma-ten mudra (sign) up from 1.3, held to the flick; flipper flick at the triangle (point); sign through the barrage; fist on the flex.
  seal: {
    at: [0, 0, 0], yaw: Math.PI, scale: 1, moves: [],
    track: [
      { t: 1.3, pose: "sign", dur: 0.3, hold: 6.2, out: 0.1 },
      { t: 7.5, pose: "point", dur: 0.12, hold: 0.55, out: 0.1 },
      { t: 8.2, pose: "sign", dur: 0.2, hold: 5.4, out: 0.15 },
      { t: 13.9, pose: "idle", dur: 0.3, hold: 4.0, out: 0.2 },
      { t: 18.0, pose: "fist", dur: 0.25, hold: 3.0, out: 0.2 },
      { t: 21.3, pose: "idle", dur: 0.4, hold: 8, out: 0.2 },
    ],
  },
  // CAMERA LAW: wide (pull back and up) -> wide push -> arc into the seal -> kill (low through the flipper) -> barrage wide + free orbit
  // -> chase pull-back -> home x2 -> credit home x2. Hard cuts, none longer than 5 s. Rigs are in the seal frame; az ~ pi sits behind the
  // seal looking down the avenue at the shrine, `look` z leans the aim toward it. col = colour script (free metadata).
  shots: [
    // 1 (0-2.0): EWS pull back and up, fov 28 -> 42. Cut on the bloom.
    { n: 1, t: [0, 2.0], law: "wide", az: [2.75, 2.6], r: [4, 15], elev: [1.0, 9], fov: [28, 42], look: [[0, 0.2, 1], [0, 1.2, 6]],
      col: { mood: "paper cream, red accent, mid key", p: ["paper", "ink", "red", "sky", "key"] } },
    // 2 (2.0-4.5): wide, slow push (SHOT.k 0 to 1), 35 mm, crossing drawn in, sky bleeds red. Arc starts at the cut.
    { n: 2, t: [2.0, 4.5], law: "wide", az: [2.9, 2.75], r: [9.5, 7], elev: [1.6, 1.3], fov: [36, 33], look: [[0, 0.8, 8], [0, 1.4, 12]], ease: "linear",
      col: { mood: "black-blue to red", p: ["sky", "ground", "veinMid", "paper", "ink"] } },
    // 3 (4.5-7.5): medium arc into the seal, fov 52, the shrine in the far third; jaw drops on each word of line A. Cut on the tritone.
    { n: 3, t: [4.5, 7.5], law: "arc", az: [2.55, 1.95], r: [5.2, 2.9], elev: [1.5, 1.0], fov: [52, 44], look: [[0, 0.5, 3], [0, 0.35, 0.8]],
      col: { mood: "red dominant, bone white accent", p: ["veinMid", "ink", "key", "veinDark", "sky"] } },
    // 4 (7.5-8.13): KILL ANGLE, low 0.8 m up the flipper, 85 mm look, fov narrowing; impact frame, barrage starts.
    { n: 4, t: [7.5, 8.13], law: "kill", az: [2.35, 2.15], r: [1.9, 1.5], elev: [0.15, 0.05], fov: [52, 34], look: [[0, 0.1, 1.2], [0, 0.1, 2.2]], dutch: [0, 5], ease: "snap",
      col: { mood: "white-black inversion then red", p: ["key", "ink", "slashEdge", "veinMid", "paper"] } },
    // 5a (8.13-11.0): wide barrage, 28 mm, top-down tilt, slow push.
    { n: 5, t: [8.13, 11.0], law: "wide", az: [2.9, 2.5], r: [6, 8], elev: [8, 12], fov: [46, 40], look: [[0, 0.2, 5], [0, 0.2, 9]],
      col: { mood: "red-white barrage", p: ["slashEdge", "key", "ink", "slashDeep", "ground"] } },
    // 5b (11.0-13.75): orbit, the Cleave lands at its end.
    { n: 6, t: [11.0, 13.75], law: "free", az: [2.45, 3.4], r: [7, 5], elev: [5.5, 2.4], fov: [40, 34], look: [0, 0.3, 6], ease: "in", minFrac: 0.1,
      col: { mood: "red-white, cut", p: ["slashEdge", "key", "ink", "slashDeep", "ground"] } },
    // 6 (13.75-18.0): chase pull-back toward the shrine's front; jaws snap, shrine dissolves, DOMAIN CLOSED, sky drains.
    { n: 7, t: [13.75, 18.0], law: "free", az: [3.05, 2.85], r: [3.6, 9], elev: [1.6, 4.5], fov: [34, 40], look: [[0, 0.8, 8], [0, 1.4, 14]],
      col: { mood: "drains to paper", p: ["paper", "ink", "red", "iceShadow", "key"] } },
    // 7a, 7b (18.0-24.0): island, behind and above in open ground; flex; blocks pulse row by row.
    { n: 8, t: [18.0, 21.0], law: "home", az: Math.PI, r: [3.6, 4.2], elev: [2.1, 2.5], fov: [36, 38], look: [0, 0.3, 3.2],
      col: { mood: "island white-teal, red pulse", p: ["paper", "slashEdge", "ink", "islandTeal", "key"] } },
    { n: 9, t: [21.0, 24.0], law: "home", az: Math.PI + 0.38, r: [3.2, 3.6], elev: [1.5, 1.9], fov: [34, 36], look: [0, 0.3, 3.2],
      col: { mood: "island, pulse reaches the apex", p: ["paper", "slashEdge", "ink", "islandTeal", "key"] } },
    // 8a, 8b (24.0-29.3): credit wide, behind and above, 35 mm; one short wipe home.
    { n: 10, t: [24.0, 27.0], law: "home", az: Math.PI, r: [4.2, 4.8], elev: [2.6, 3.0], fov: [38, 40], look: [0, 0.3, 3.2],
      col: { mood: "paper", p: ["paper", "ink", "red", "iceShadow", "key"] } },
    { n: 11, t: [27.0, 29.3], law: "home", az: Math.PI - 0.38, r: [4.8, 5.4], elev: [3.0, 3.4], fov: [40, 42], look: [0, 0.3, 3.2],
      col: { mood: "paper", p: ["paper", "ink", "red", "iceShadow", "key"] } },
  ],
  beats: [
    ...LAYER_CUES,
    // ---- world and ambience
    { t: 0.0, name: "drawIn", dur: 2.0 },
    { t: 0.0, name: "drone", dur: 4.4 },
    { t: 2.0, name: "crossingDraw", dur: 2.5 },
    { t: 2.0, name: "skyBleed", dur: 2.5 },
    { t: 2.0, name: "poolSpread", dur: 2.5 },
    { t: 2.0, name: "letterbox", dur: 6.13 },
    { t: 2.2, name: "blocksRise", dur: 1.8 },
    { t: 2.2, name: "tritone", dur: 0.6 },
    { t: 2.7, name: "haloFlicker", dur: 0.5 },
    { t: 2.7, name: "magicEyes", dur: 21.3 },
    { t: 2.7, name: "shrineRise", dur: 1.0 },
    { t: 3.6, name: "bell", dur: 0.8 },
    { t: 3.6, name: "skullCount", dur: 0.5 },
    { t: 4.0, name: "choir", dur: 3.5 },
    { t: 4.0, name: "heartbeat", dur: 3.5 },
    { t: 4.5, name: "victimBrace", dur: 3.0 },
    // line A: one jaw drop per word of "Domain Expansion."
    { t: 4.6, name: "jaw", dur: 0.4, word: 0 },
    { t: 5.1, name: "jaw", dur: 0.4, word: 1 },
    // ---- the flick and the barrage
    { t: 7.5, name: "tritone", dur: 0.6 },
    { t: 7.5, name: "blocksSchedule", dur: 0.6 },
    { t: 7.5, name: "flick", dur: 0.6 },
    { t: 7.5, name: "speedlines", dur: 0.63, kind: "radial", at: [0.5, 0.55], strength: 0.7, col: "#f4efe2" },
    { t: 8.1, name: "impact", seq: [[2, 1]] },
    { t: 8.1, name: "speedlines", dur: 0.4, kind: "speed", at: [0.5, 0.45], strength: 0.9, col: "#d1081f" },
    { t: 8.1, name: "trauma", amount: 0.5 },
    { t: 8.1, name: "shing", dur: 0.5 },
    { t: 8.1, name: "fingerCards", dur: 0.6 },
    { t: 8.1, name: "victimRun", dur: 5.5 },
    { t: 8.6, name: "signsOut", dur: 3.4 },
    { t: 9.0, name: "lampTopple", dur: 0.9 },
    ...slashes,
    // heavy hit 10.4 (slash 8): impact frame, shake, shock, the missing 56th block egg
    { t: 10.4, name: "impact", seq: [[2, 1]] },
    { t: 10.4, name: "trauma", amount: 0.6 },
    { t: 10.4, name: "shock", dur: 0.5, at: [0.5, 0.55], amp: 0.5, r1: 0.7 },
    { t: 10.4, name: "don", dur: 0.5 },
    { t: 10.4, name: "zebraGap", dur: 0.5 },
    // the Cleave (slash 17): 2 frames red mono after the inverted frame, every unscheduled block splits, halos shatter
    { t: 13.6, name: "impact", seq: [[2, 1], [3, 2]] },
    { t: 13.6, name: "redMono", dur: 0.1 },
    { t: 13.6, name: "cleave", dur: 0.5 },
    { t: 13.6, name: "cleaveSplit", dur: 0.4 },
    { t: 13.6, name: "haloShatter", dur: 0.25 },
    { t: 13.6, name: "skyFloodRed", dur: 0.6 },
    { t: 13.6, name: "trauma", amount: 0.8 },
    { t: 13.6, name: "shock", dur: 0.6, at: [0.5, 0.5], amp: 0.7, r1: 0.9 },
    // ---- jaws close, DOMAIN CLOSED, rub out
    { t: 14.0, name: "jawSnap", dur: 0.3 },
    { t: 14.2, name: "skyDrain", dur: 3.8 },
    { t: 14.3, name: "shrineDissolve", dur: 2.0 },
    { t: 14.4, name: "domainClosed", dur: 2.6 },
    { t: 16.3, name: "finalSlash", dur: 0.4 },
    { t: 16.3, name: "impact", seq: [[2, 1]] },
    { t: 16.3, name: "shing", dur: 0.5 },
    { t: 16.3, name: "fourEyes", dur: 0.09 },
    { t: 16.3, name: "trauma", amount: 0.4 },
    { t: 16.3, name: "rubOut", dur: 1.7 },
    // ---- island
    { t: 18.0, name: "flashPaper", dur: 0.15 },
    { t: 18.0, name: "islandReturn", dur: 2.0 },
    { t: 18.0, name: "sealFlex", dur: 1.0 },
    { t: 18.2, name: "chime", dur: 0.6 },
    { t: 18.2, name: "pulseRow", dur: 3.0 },
    { t: 28.55, name: "wipeHome", dur: 0.75 },
    { t: 28.55, name: "wipe", dur: 0.75 },
  ],
  // Bubbles: lower half, one at a time, off the seal. Line A is fixed text so the jaw can sync to its two words (acceptance, shot 3).
  bubbles: [
    { t: [4.4, 7.2], text: "Domain Expansion.", who: "foe", side: "r", tone: "shout" },
    { t: [7.6, 10.9], text: "Malevolent Shrine. Only the scheduled blocks survive.", who: "seal", side: "r", tone: "say" },
    { t: [14.2, 17.4], pool: "lines", who: "foe", side: "l", tone: "say" },
    { t: [18.0, 23.6], text: "Merged into triton-lang/kernels. 804 lines added, 17 tests passing.", who: "narr", side: "c", tone: "say" },
  ],
  // 15-line character-voiced pool (L12): Sukuna's epic sincerity, never seal humour.
  lines: [
    "Stand proud. You are strong.",
    "Know your place.",
    "Is that all you have?",
    "Fillet them. Leave only what is needed.",
    "Watch closely. This is the shape of a cut.",
    "Every wall is only a door I have not opened.",
    "You were never in the way. You were in the path.",
    "Come. Entertain me.",
    "What is not scheduled, does not survive.",
    "Look up. The sky has already fallen.",
    "A king does not hurry a cut.",
    "Kneel, or be divided.",
    "This is no cage. This is a shrine.",
    "Fifty-five remain. The rest were noise.",
    "Remember this. It will be all you remember.",
  ],
  sfx: [
    { t: [8.1, 8.9], text: "SHING", at: [0.72, 0.3], size: 1.15, rot: -8, col: RED, ink: PAPER },
    { t: [10.4, 11.1], text: "DON", at: [0.22, 0.32], size: 1.3, rot: 6, col: RED, ink: PAPER },
    { t: [16.3, 17.0], text: "SHING", at: [0.74, 0.3], size: 1.1, rot: -6, col: RED, ink: PAPER },
  ],
  credit: { t: [24.3, 29.0], text: "triton-lang/kernels #22 · merged · 804 lines added · 17 tests passed — A topology-derived sparse attention kernel" },
};
