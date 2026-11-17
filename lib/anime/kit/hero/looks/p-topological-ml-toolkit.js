// LOOK p-topological-ml-toolkit: the seal as Accelerator (A Certain Magical Index, J.C.Staff). Stringy white
// hair swept up and back, heavy-lidded red eyes with small pupils, a toothy grin, the white top with grey V
// chevrons and the black choker with its electrode and cords. Spec + `extras` + named `poses` and `channels`.
import { HERO_POSES } from "../motion.js";
import { acceleratorParts } from "./p-topological-ml-toolkit.parts.js";

const COL = { choker: "#26262c", electrode: "#96a4c2", cord: "#2a2a30", chevron: "#a9adb8" };
const HAIR = "#eceef4", HAIR_SH = "#9aa3bc", HAIR_HI = "#ffffff";

export default {
  cool: { expr: "menace", pose: "wind", rim: "#7fe8ff" },
  fur: { coat: "#8b93a8", shade: "#4a5068", belly: "#f1e9dc", bellyShade: "#c6bcc0", nose: "#3a3238", ink: "#1d3f9a", blush: null },
  eyes: { style: "tsurime", iris: "#d0434c", iris2: "#8c1f2e", pupil: "round", size: 1.0, lash: "#2a2230" },
  brows: { col: "#d8dae4", thick: 0.9 },
  mouth: { rest: "w", sharp: 1, fangs: false },
  hair: {
    preset: "spiky", col: HAIR, shade: HAIR_SH, hi: HAIR_HI, width: 0.075, spike: 0.5, curl: 0.03, seed: 9,
    cap: { front: 0.78, back: 1.75, zig: 0.2, n: 11, t: 0.012, crown: 0.025 },
    cut: { at: [0.35, 0.7], slant: 0.12, rate: 0.8 },
    parts: [
      { band: [0.0, 0.5], sector: [-Math.PI, Math.PI], count: 7, layers: 1, length: [0.13, 0.21], width: 0.12, spike: 0.3, lift: 0.45, droop: 0.1, sweep: [0, 0.4, -0.75] },
      { band: [0.4, 0.85], sector: [-Math.PI, Math.PI], count: 9, layers: 2, length: [0.13, 0.21], width: 0.12, spike: 0.3, lift: 0.35, droop: 0.15, sweep: [0, 0.25, -0.8] },
      { band: [0.8, 1.0], sector: [-2.5, 2.5], count: 6, layers: 1, length: [0.1, 0.17], width: 0.12, spike: 0.3, lift: 0.35, droop: 0.45, sweep: [0, 0.2, -0.7] },
      { band: [1.0, 1.45], sector: [0.9, 2.3], count: 4, layers: 1, length: [0.14, 0.2], width: 0.07, spike: 0.6, lift: 0.2, droop: 1.3, sweep: [0.25, -0.2, 0] },
      { band: [1.0, 1.45], sector: [-2.3, -0.9], count: 4, layers: 1, length: [0.14, 0.2], width: 0.07, spike: 0.6, lift: 0.2, droop: 1.3, sweep: [-0.25, -0.2, 0] },
    ],
  },
  marks: [],
  acc: [],
  outfit: [{ kind: "uniform", col: "#e8eaf1", shade: "#9097ad", collar: false, buttons: 0, hem: 0.045, cuffAt: 0.02, ink: "#1d3f9a" }],
  hands: { kind: "human", skin: "#e0cdbd" },
  extras(engine, h) {
    return acceleratorParts(COL).map((geo, i) => {
      const fig = engine.figure(geo, { ink: i === 0 ? "#1a1a20" : "#4a4252", lineMul: 0.8 });
      fig.userData.hull.uniforms.uConst.value = 1;
      return h.attach(fig, "body");
    });
  },
  // the grin-and-stare of the show as channels for h.set(...): pinpoint pupils, brows down, wide toothy mouth
  channels: {
    halfLid: { eyes: "calm", eyesAmt: 0.9, brow: { angle: -0.05, drop: 0.004, tilt: 0, raise: 0 }, mouth: "w", mouthAmt: 0.3 },
    stare: { eyes: "terror", eyesAmt: 0.85, brow: { angle: 0.3, drop: 0.006, tilt: 0, raise: 0 }, mouth: "grin", mouthAmt: 1 },
    grin: { eyes: "smug", eyesAmt: 0.9, brow: { angle: 0.22, drop: 0.004, tilt: 0, raise: 0 }, mouth: "grin", mouthAmt: 1 },
  },
  poses: {
    // sit, the head canted 10 deg and tipped back to look up at the lens
    sitTilt: (k, t) => { const s = HERO_POSES.sit(k, t); return { ...s, head: { rx: (s.head?.rx ?? 0) - 0.3 * k, ry: 0, rz: 0.17 * k } }; },
    // sit with the near fore-flipper reaching at the lens
    sitPoint: (k, t) => ({ ...HERO_POSES.sit(k, t), armR: { sx: 1.85, sy: -0.2, sz: 0.1, elbow: 0.35 }, wristR: { rx: 0.1, ry: 0, rz: 0 }, handR: "open" }),
    // both flippers up, chin lifted: the seized-wind stance; the flick upward on the release
    wind: (k, t) => ({ ...HERO_POSES.raise(k, t), head: { rx: -0.25 * k, ry: 0, rz: 0.08 * k * Math.sin(t * 3) } }),
    release: (k, t) => ({ ...HERO_POSES.point(k, t), armR: { sx: 3.0, sy: 0, sz: 0.2, elbow: 0.1 } }),
  },
};
