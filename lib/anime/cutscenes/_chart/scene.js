// SCENE DATA for _chart: the pipeline test card (lab only, not in DOCKS). Pure data, read by the three layers.
// World metres, hero at the origin facing +z. light.dir points toward the key (upper right, behind the lens) for 0 to 12 s and
// light.back (right and behind the hero, as the owner's reference is lit) from 12 s. `&look=<id>` stands a kit/hero look in for the pup.
const q = typeof location === "undefined" ? new URLSearchParams() : new URLSearchParams(location.search);
const hero = /^[\w-]+$/.test(q.get("look") ?? "") ? (await import(`../../kit/hero/looks/${q.get("look")}.js`).catch(() => null))?.default : null;
const dy = hero ? 0.1 : 0; // the rig's head sits higher than the pup's
const BUST = { eye: [[1.48, 0.5 + dy, 1.69], [1.38, 0.52 + dy, 1.57]], lookAt: [[0, 0.56 + dy, 0.03], [0, 0.57 + dy, 0.03]], fov: 24, dof: [2.2, 1.4, 1] };
const MEDIUM = { eye: [[2.3, 1.75, 3.7], [2.05, 1.65, 3.6]], lookAt: [[-0.45, 0.3, -1.1], [-0.45, 0.3, -1.1]], fov: 34, dof: [4.5, 0, 0] };

export default {
  id: "_chart",
  title: "Test card",
  anime: "render pipeline test card",
  style: "modern-anime",
  look: {},
  fps: 12,
  duration: 20,
  seed: 1729,
  far: 300,
  plates: true,
  palette: {
    zenith: "#4a78c0", skyMid: "#9cc0e8", horizon: "#fbe4c4", glow: "#ffd9a6", glowCore: "#fff3dc", far: "#d9c7a0",
    cloudLit: "#fff6ea", cloudShade: "#aab4d4", cloudRim: "#ffcfa8",
    ground: "#cdb88e", groundShade: "#7f7a98", stone: "#b7ad9c", stoneShade: "#6e6a86", pillar: "#e9dcc4", pillarShade: "#9a8fae",
    orb: "#ffdca0",
  },
  light: { dir: [0.681, 0.588, 0.437], back: [0.75, 0.45, -0.48], col: [1.0, 0.96, 0.9] },
  set: {
    ground: { r: 60 },
    glow: { az: -0.66, el: 0.1 },
    stones: [ // [x, z, radius, squash y, turn]; pillars [x, z, shaft height]. The first two stones and the stub sit in a seal's shadow
      [-0.5, -0.62, 0.15, 0.7, 0.4], [-1.55, -1.32, 0.17, 0.62, 1.3], [1.9, -0.9, 0.22, 0.66, 2.1],
      [-1.5, 0.75, 0.26, 0.58, 0.9], [0.85, 0.55, 0.1, 0.75, 2.7],
    ],
    pillars: [[-3.0, 0.2, 2.8], [0.08, -3.43, 1.3]],
    orb: { at: [-2.9, 5.0, -15.3], r: 0.8 },
    // small emissives on the far ground, [x, y, z, r]: each core is wider than the lens's tap spacing, so it opens into a disc
    lamps: [[-10.3, 0.4, -5.9, 0.11], [-4, 0.35, -12, 0.12], [-1.5, 0.4, -20, 0.16], [-8, 0.4, -22, 0.18], [-14, 0.45, -14, 0.16]],
    extras: [ // the wizard stands across the edge of the short pillar's shadow
      { costume: "school", at: [-0.96, 0, -0.94], yaw: 0.6, scale: 0.75 },
      { costume: "wizard", at: [-0.78, 0, -4.5], yaw: 0.5, scale: 0.72 },
    ],
  },
  seal: {
    at: [0, 0, 0], yaw: 0, scale: 1, moves: [], ...(hero ? { hero } : {}),
    track: [
      { t: 3.3, pose: "blink", dur: 0.08, hold: 0.08, out: 0.04, k: 1 },
      { t: 7.2, pose: "blink", dur: 0.08, hold: 0.08, out: 0.04, k: 1 },
      { t: 11.3, pose: "blink", dur: 0.08, hold: 0.08, out: 0.04, k: 1 },
    ],
  },
  // free law: world-space [from, to] eye and aim. dof [focus m, strength, on]; an explicit off keeps a scrub from inheriting it.
  // The bust throws the background out of focus as the reference close-up does (far coc 0.61, the wide's 0.59), so off=lens shows at 2 s
  shots: [
    { n: 1, t: [0, 4], law: "free", ...BUST },
    { n: 2, t: [4, 8], law: "free", ...MEDIUM },
    { n: 3, t: [8, 12], law: "free", eye: [[2.45, 1.1, 5.85], [2.6, 1.15, 6.15]], lookAt: [[-0.7, 0.75, -2], [-0.7, 0.75, -2]], fov: 38, dof: [6.4, 6, 1], minFrac: 0.05 },
    { n: 4, t: [12, 16], law: "free", ...BUST },
    { n: 5, t: [16, 20], law: "free", ...MEDIUM },
  ],
  beats: [],
  bubbles: [],
  lines: [],
  sfx: [],
  credit: null,
};
