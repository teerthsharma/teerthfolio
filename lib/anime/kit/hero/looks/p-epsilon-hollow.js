// LOOK p-epsilon-hollow: the seal as Demon Lord Rimuru (That Time I Got Reincarnated as a Slime). Black hair, golden eyes, a black coat
// with a blue lining panel; the fur stays grey. Spec for kit/hero.js; the poses the track sets come from the parts file.
import { COLOR, INK, POSES } from "./p-epsilon-hollow.parts.js";

export default {
  cool: { expr: "menace", pose: "hold", rim: "#33e6ff" },
  fur: { coat: "#8a888f", shade: "#615f73", belly: "#f1e4ca", bellyShade: "#c9bcb2", nose: "#2a2428", ink: INK, blush: null },
  eyes: { style: "tsurime", iris: COLOR.eye, iris2: COLOR.eye2, pupil: "round", size: 1.0, lash: INK, sclera: "#f0e8e0" },
  brows: { col: COLOR.hairShade, thick: 0.9 },
  mouth: { rest: "smile", sharp: 0.25 },
  hair: { preset: "long", col: COLOR.hair, shade: COLOR.hairShade, hi: COLOR.hairHi, length: 0.9, volume: 1.05, seed: 7 },
  marks: [],
  outfit: [{ kind: "cloak", col: COLOR.coat, shade: COLOR.coatShade, trim: COLOR.trim, hemCol: COLOR.trim, motif: "none", ink: INK }],
  hands: { kind: "human", skin: COLOR.skin },
  blinkEvery: 4.6,
  poses: POSES,
};
