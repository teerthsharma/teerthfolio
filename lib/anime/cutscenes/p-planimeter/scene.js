// SCENE DATA for p-planimeter: "Checkmate, Reviewer" (Classroom of the Elite, Lerche). DIRECTION layer, single source of truth
// for shots, beats, cue names, bubbles, lines, palette. Bible: scripts/p-planimeter.md. Frames at 24 fps: t = f / 24.
//
// CUE NAMES (the other layers read them with cue.on / cue.k / cue.since / cue.done; start time in s, dur in s):
//   world:  banner(0.30,0.9) curtain-breathe(0,24.2) petals(0,24.2) rays(0,24.2) glow(0,24.2) lamp-low(18.0) collapse(23.42,0.4)
//           chalk-write(7.0,0.88) ghost50(8.9) board-away(9.0,0.4) grade{to: gold|mono|blue|gold-low}(per shot)
//   cast:   rv-turn(2.5) rv-lift(3.29) rv-tap(3.88 and 4.38) rv-smile(5.33,0.5) card-held(5.0,1.2) rv-shrink(7.17) rv-freeze(7.33)
//           rv-recoil(8.25,0.25) rv-unfold(9.17) rv-bow(13.75,0.5) rv-back(14.1) pencil-down(6.21) pencil-roll(6.33,0.25)
//           head-tilt(6.67) glint(6.92,0.75) sudo-drop(6.92) victims-lean(7.33,0.33) victims-hold(8.04) victims-relax(14.1)
//           horikita-look(14.17) chin-pose(12.0,2.1) tail-flick(14.6,0.5) card-glint(7.33,0.7: green rim on the Reviewer's face)
//   fx:     sphere(6.92,1.13) cardframe(7.1,0.4) sphere-project(7.67,0.37) sphere-flash(8.04,0.05) glint-star(6.92,0.75)
//           chalk-scrape(3.5,0.9) board-slam(8.04,0.35) pawn-takes(8.25,0.25) checkmate(8.33,0.42) clack(8.33,0.17)
//           board-draw(8.9,0.4) bell(14.08,0.25) mote-burst(18.0,1.0) tick(6.46)
//   reserved (player): impact(8.33) speedlines(7.2, 8.25) shock(7.67, 23.42) trauma(8.25); pose via seal.track.
// Frame refs: f79=3.29 f149=6.21 f166=6.92 f193=8.04 f216=9.0 f288=12.0 f338=14.08 f432=18.0 f528=22.0 f562=23.42 f581=24.2.
// Consolidate: cue names the layers read, at the bible times (agreement with the layers' fallbacks).
const LAYER_CUES = [
  { t: 7.667, name: "chalk" },
  { t: 6.208, name: "pencil" },
];

export default {
  id: "p-planimeter",
  title: "Classroom of the Elite: Checkmate, Reviewer",
  anime: "Classroom of the Elite (PR duel)",
  style: "modern-anime",
  // Lerche day grade: soft low contrast, bloom only on glass and sun, 2% grain, mild vignette; lit luma capped at 0.92.
  look: {
    post: { bloom: 0.5, diffuse: 0.12, shafts: 0.55, sat: 1.04, grain: 0.02, vig: 0.1, gain: [1.04, 0.98, 0.9] },
    lines: { px: 1.6, dist: 1, set: 0.7, ink: "#1a0f10", inkMix: 0.8 },
    fill: { sat: 1.04, lumaMax: 0.92 },
  },
  fps: 12,
  duration: 24.2,
  seed: 3396,
  far: 1200,
  plates: true,
  bg: "#f6d7a8",
  palette: {
    // golden hour
    sky: "#f9dabb", skyLow: "#eed192", cloudRim: "#fae3b9", cloudShade: "#f0b7a0", sun: "#fff4c8", glow: "#ffd98a",
    ground: "#b9783f", floorLit: "#d9a05e", floorShade: "#7a4a50", wallLit: "#f6e7cf", wallMid: "#e8c8a0", wallShade: "#b098c8",
    key: "#ffc766", accent: "#c0232f", ink: "#1a0f10", pink: "#f1a9b9", violet: "#5b3fa0", chalk: "#fffdf0",
    // OP green (the one accent) and the blue chess key
    green: "#038903", greenLit: "#3ddc84", greenRim: "#b0fff9", greenGlow: "#d4fffe", card: "#5efeb6",
    veil: "#101018", blue: "#1a3a8a", blueLit: "#8ab4f0", boardLight: "#f6f0e0", boardDark: "#1c1838", crimson: "#a8222f", cream: "#f1ebdc",
    // cast
    ayaHair: "#b9723b", ayaShade: "#a9231e", blazer: "#b83a4b", suit: "#1a1323", hairpin: "#a77de0", reviewerFur: "#aeb0c4",
  },
  // hero at the desk: sitting, hands folded; yaw 0.3 (bible PUP_YAW). Rigs orbit the chest in the seal's frame.
  seal: {
    at: [0, 0, 0], yaw: 0.3, scale: 1, moves: [],
    track: [
      { t: 0, pose: "sit", dur: 0.5, hold: 5.9, out: 0.2, k: 0.8 },       // hands folded, chin level f0-f149
      { t: 6.2, pose: "sit", dur: 0.3, hold: 0.6, out: 0.2, k: 0.9 },     // pencil set down, 3 deg tilt (cast owns the tilt)
      { t: 6.92, pose: "awe", dur: 0.25, hold: 1.0, out: 0.3, k: 0.45 },  // the eye lifts to the lens at f166, otherwise unmoved
      { t: 9.0, pose: "sit", dur: 0.3, hold: 2.7, out: 0.2, k: 0.8 },
      { t: 12.0, pose: "sit", dur: 0.4, hold: 1.7, out: 0.3, k: 1.0 },    // chin on folded hands, f288
      { t: 14.6, pose: "idle", dur: 0.2, hold: 0.3, out: 0.3, k: 0.4 },   // tail flick +0.5 s after the bell
      { t: 15.4, pose: "sit", dur: 0.4, hold: 8.4, out: 0.2, k: 0.8 },
      { t: 3.2, pose: "blink", dur: 0.08, hold: 0.08, out: 0.04, k: 1 },  // blink every ~4.2 s, 2 frames closed
      { t: 7.4, pose: "blink", dur: 0.08, hold: 0.08, out: 0.04, k: 1 },
      { t: 11.5, pose: "blink", dur: 0.08, hold: 0.08, out: 0.04, k: 1 },
      { t: 16.6, pose: "blink", dur: 0.08, hold: 0.08, out: 0.04, k: 1 },
      { t: 20.8, pose: "blink", dur: 0.08, hold: 0.08, out: 0.04, k: 1 },
    ],
  },
  // CAMERA LAW: wide -> arc -> kill -> home, a cut at least every 5 s (every shot here is <= 4 s). Rigs are seal-local.
  // `color` carries the per-shot colour script (dominant, accent, palette); the world layer reads it from scene.shots.
  shots: [
    // 1 (f0-79) classroom wide, banner drops; pulled back and up, dolly in (bible fov 44)
    { n: 1, t: [0, 3.3], law: "wide", az: 0.9, r: [10, 9.2], elev: [3.2, 2.6], fov: [44, 42], look: [[0, 0.2, 0], [0, 0.4, 0]], minFrac: 0.05,
      color: { dominant: "#f3b36b", accent: ["#c0232f", "#f1a9b9"], palette: ["#f3b36b", "#ffd98a", "#c0232f", "#5b3fa0", "#f6e7cf"] } },
    // 2 (f79-149) medium over the Reviewer to the seal, 8 degree arc toward the seal
    { n: 2, t: [3.3, 6.2], law: "arc", az: [0.95, 0.8], r: [4.4, 3.6], elev: [1.3, 1.0], fov: 36, look: [0, 0.1, 0], dof: [3.6, 0.5, 1],
      color: { dominant: "#d7ad35", accent: ["#5efeb6"], palette: ["#d7ad35", "#1a1323", "#f6f3f7", "#5efeb6", "#7a540d"] } },
    // 3 (f149-166) push-in on the calm face, rim #ffd98a
    { n: 3, t: [6.2, 6.92], law: "arc", az: [0.5, 0.3], r: [1.7, 1.0], elev: [0.55, 0.5], fov: [24, 20], look: [0, 0.35, 0], ease: "linear", dof: [1.3, 0.8, 1],
      color: { dominant: "#d16f2a", accent: [], palette: ["#d16f2a", "#924e17", "#f5d287", "#2a0200", "#f7eeb6"] } },
    // 4 (f166-193) extreme close on the eye (fov 14), a pull to reveal the corpus at f180; the one green accent
    { n: 4, t: [6.92, 8.04], law: "arc", az: [0.22, 0.34], r: [0.9, 1.5], elev: [0.5, 0.5], fov: [14, 22], look: [0, 0.45, 0], ease: "linear",
      color: { dominant: "#038903", accent: ["#3ddc84", "#b0fff9", "#d4fffe"], palette: ["#038903", "#3ddc84", "#b0fff9", "#d4fffe", "#7a540d"] } },
    // 5 (f193-216) the kill angle, low from the desk, toward the board; blue key; snap
    { n: 5, t: [8.04, 9.0], law: "kill", az: [-0.5, -0.65], r: [2.2, 1.9], elev: [0.25, 0.2], fov: [56, 52], look: [0, 0.1, 0.4], dutch: [0, 5], ease: "snap",
      color: { dominant: "#1a3a8a", accent: ["#038903", "#a8222f"], palette: ["#101018", "#1a3a8a", "#f6f0e0", "#a8222f", "#ffeec8"] } },
    // 6a (f216-288) face-to-face two-shot, drift 0.25 m
    { n: 6, t: [9.0, 12.0], law: "free", az: [0.9, 1.05], r: [3.6, 3.35], elev: 0.5, fov: 36, look: [0.2, 0.2, 0.3], dof: [3.4, 0.4, 1],
      color: { dominant: "#f3b36b", accent: ["#c0232f"], palette: ["#f3b36b", "#c0232f", "#5b3fa0", "#f6e7cf", "#8a5a34"] } },
    // 6b (f288-338) over the seal's shoulder to the small Reviewer at the board
    { n: 7, t: [12.0, 14.08], law: "arc", az: [2.5, 2.3], r: [2.8, 2.5], elev: [0.9, 0.8], fov: 26, look: [0.2, 0.15, 1.6],
      color: { dominant: "#f3b36b", accent: ["#c0232f"], palette: ["#f3b36b", "#c0232f", "#5b3fa0", "#f6e7cf", "#8a5a34"] } },
    // 7a (f338-432) the bell: back to the wide, drift out 1.5 m
    { n: 8, t: [14.08, 18.0], law: "wide", az: [0.8, 0.6], r: [5, 8.4], elev: [1.8, 3.2], fov: [36, 44], look: [0, 0.3, 0],
      color: { dominant: "#f3b36b", accent: ["#c0232f", "#f1a9b9"], palette: ["#f3b36b", "#ffd98a", "#c0232f", "#5b3fa0", "#f6e7cf"] } },
    // 7b (f432-528) the credit: home pose behind and above, 12 cm drift, low sun
    { n: 9, t: [18.0, 22.0], law: "home", az: [3.0, 3.14], r: [3.6, 3.7], elev: [2.1, 2.2], fov: 38, look: [0, 0.2, 3.0],
      color: { dominant: "#ff9a4a", accent: ["#c0232f"], palette: ["#ff9a4a", "#ffd98a", "#c0232f", "#5b3fa0", "#f6e7cf"] } },
    // 7c (f528-581) wide; the sky shell collapses f562-571 and wipes home
    { n: 10, t: [22.0, 24.2], law: "wide", az: [0.6, 0.5], r: [8.4, 10], elev: [3.2, 4.0], fov: [44, 46], look: [0, 0.3, 0], minFrac: 0.05,
      color: { dominant: "#ff9a4a", accent: ["#ffd98a"], palette: ["#ff9a4a", "#ffd98a", "#f6d7a8"] } },
  ],
  beats: [
    ...LAYER_CUES,
    // continuous world cues
    { t: 0, name: "rays", dur: 24.2 }, { t: 0, name: "glow", dur: 24.2 }, { t: 0, name: "petals", dur: 24.2 },
    { t: 0, name: "curtain-breathe", dur: 24.2 },
    // shot 1
    { t: 0.3, name: "banner", dur: 0.9 },
    { t: 2.5, name: "rv-turn", dur: 0.5 },
    // shot 2: the challenge
    { t: 3.29, name: "rv-lift", dur: 0.6 },
    { t: 3.5, name: "chalk-scrape", dur: 0.9 },
    { t: 3.88, name: "rv-tap", dur: 0.2 }, { t: 4.38, name: "rv-tap", dur: 0.2 },
    { t: 5.0, name: "card-held", dur: 1.2 },
    { t: 5.33, name: "rv-smile", dur: 0.5 },
    // shot 3: the stillness
    { t: 6.21, name: "pencil-down", dur: 0.45 }, { t: 6.33, name: "pencil-roll", dur: 0.25 },
    { t: 6.46, name: "tick", dur: 0.1 },
    { t: 6.67, name: "head-tilt", dur: 0.4 },
    // shot 4: the corpus (f166-193)
    { t: 6.92, name: "grade", dur: 1.12, to: "mono" },
    { t: 6.92, name: "glint", dur: 0.75 }, { t: 6.92, name: "glint-star", dur: 0.75 },
    { t: 6.92, name: "sudo-drop", dur: 0.4 },
    { t: 6.92, name: "sphere", dur: 1.13 },            // bloom 0 -> 1.12 -> 1.0 on threes f166-175, 48 edge-growth steps over 0.4 s, spin 20 deg/s
    { t: 7.0, name: "chalk-write", dur: 0.88 },        // "S^2 | VR" in 21 frames on twos
    { t: 7.1, name: "cardframe", dur: 0.4 },           // green card frame f170, additive, 0.4 s (easter egg 2)
    { t: 7.2, name: "speedlines", dur: 0.6, kind: "radial", at: [0.5, 0.45], strength: 0.25, col: "#d4fffe" },
    { t: 7.17, name: "rv-shrink", dur: 0.3 },
    { t: 7.33, name: "rv-freeze", dur: 0.7 }, { t: 7.33, name: "card-glint", dur: 0.7 },
    { t: 7.33, name: "victims-lean", dur: 0.33 },
    { t: 7.67, name: "sphere-project", dur: 0.37 },    // f184, a 3 m disc on the board
    { t: 7.67, name: "shock", dur: 0.3, at: [0.5, 0.5], amp: 0.02, r1: 0.5 },
    { t: 8.04, name: "sphere-flash", dur: 0.05 },      // 1-frame white flash, cut
    // shot 5: CHECKMATE (f193-216)
    { t: 8.04, name: "grade", dur: 0.96, to: "blue" }, // huegrade dark #101830, mid #1a3a8a, light #8ab4f0, green kept
    { t: 8.04, name: "board-slam", dur: 0.35 },
    { t: 8.04, name: "victims-hold", dur: 5.9 },
    { t: 8.25, name: "pawn-takes", dur: 0.25 },        // 3 drawings on twos
    { t: 8.25, name: "speedlines", dur: 0.25, kind: "speed", at: [0.5, 0.5], strength: 0.4, col: "#f6f0e0" },
    { t: 8.25, name: "rv-recoil", dur: 0.25 },
    { t: 8.25, name: "trauma", amount: 0.5 },
    { t: 8.33, name: "checkmate", dur: 0.42 },         // pop 0.7 -> 1.12 -> 1.0 over 10 frames, roll -0.04
    { t: 8.33, name: "clack", dur: 0.17 },
    { t: 8.33, name: "impact", seq: [[1, 1], [2, 1], [2, 1]] }, // 1 frame inversion, then blue-key frames
    { t: 8.9, name: "ghost50", dur: 0.1 },             // easter egg 1: 8% alpha chalk "50"
    { t: 8.9, name: "board-draw", dur: 0.4 },
    // shot 6: the benchmark did its job
    { t: 9.0, name: "board-away", dur: 0.4 },
    { t: 9.0, name: "grade", dur: 5.08, to: "gold" },
    { t: 9.17, name: "rv-unfold", dur: 0.5 },
    { t: 12.0, name: "chin-pose", dur: 2.1 },          // easter egg 5
    { t: 13.75, name: "rv-bow", dur: 0.5 },            // half bow f330
    // shot 7: bell, credit, wipe home
    { t: 14.08, name: "bell", dur: 0.25 },
    { t: 14.1, name: "rv-back", dur: 10.1 },
    { t: 14.1, name: "victims-relax", dur: 0.5 },
    { t: 14.17, name: "horikita-look", dur: 0.8 },
    { t: 14.6, name: "tail-flick", dur: 0.5 },         // +0.5 s after the bell (easter egg 6)
    { t: 18.0, name: "lamp-low", dur: 6.2 }, { t: 18.0, name: "grade", dur: 6.2, to: "gold-low" },
    { t: 18.0, name: "mote-burst", dur: 1.0 },
    { t: 23.42, name: "collapse", dur: 0.4 },          // f562-571
    { t: 23.42, name: "shock", dur: 0.4, at: [0.5, 0.5], amp: 0.03, r1: 0.7 },
  ],
  // Bubbles: lower half, one at a time, never overlapping. foe = the Reviewer (oval), seal = burst.
  bubbles: [
    { t: [3.5, 4.67], text: "This is arithmetic, not benchmark evidence.", who: "foe", side: "r", tone: "say" },
    { t: [4.83, 6.17], text: "How does one invent a sensible corpus of graphs? I leave it to you \u{1F642}", who: "foe", side: "r", tone: "say" },
    { t: [7.17, 8.0], text: "A sphere. Every graph, with its own geometry.", who: "seal", side: "l", tone: "shout" },
    { t: [9.33, 10.67], text: "The benchmark did its job. DSU is not slower.", who: "foe", side: "r", tone: "say" },
    { t: [11.83, 13.33], text: "30/30. On it boss \u{1F9AD}", who: "seal", side: "l", tone: "shout" },
    { t: [14.4, 17.8], pool: "lines", who: "foe", side: "c", tone: "say" },
  ],
  // the 15-line pool (Chabashira's voice, epic sincerity); the first is the card's own line c
  lines: [
    "Class dismissed. Back to the island.",
    "Exact answers, honest blanks. Dismissed.",
    "I was not watching you. I was watching the proof.",
    "The review is closed. The class is not.",
    "Whatever you are, you built the corpus. Dismissed.",
    "Every graph, with its own geometry. Go.",
    "I asked for a corpus. You gave me a sphere.",
    "Thirty of thirty. Nothing left to argue.",
    "A reviewer's job is to doubt. Yours was to answer.",
    "The bell saves the rest of the class. Go.",
    "I will read the next one just as carefully.",
    "Not a guess in it. Dismissed.",
    "You did not win the argument. The data did.",
    "Back to the island, then.",
    "This school measures talent. This review measured the code.",
  ],
  // SFX lettering (cream #f1ebdc, #101018 hard drop), off the seal; CHECKMATE itself is world lettering owned by fx (cue "checkmate")
  sfx: [
    { t: [8.33, 8.5], text: "CLACK", at: [0.16, 0.2], size: 0.1, rot: -0.12, col: "#f1ebdc", ink: "#101018" },
    { t: [14.08, 14.33], text: "BELL", at: [0.16, 0.2], size: 0.09, rot: -0.06, col: "#f1ebdc", ink: "#101018" },
  ],
  credit: { t: [19.2, 22.0], text: "teerthsharma/planimeter · 495 exact · 33 refused · 0 wrong\nthe same 528 files" },
};
