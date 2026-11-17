// Autumn leaf cards at the corners of the close shots, kept off the lower right where balloons B and C sit.
import { bgForeground } from "../../../kit/bg/foreground.js";

const LEAVES = [
  { shot: 4, kind: "leaves", side: "tl", size: 0.5, dist: 1.4, dark: "#5b1e10", mid: "#9e2f26", rim: "#f0b840", seed: 4 },
  { shot: 9, kind: "leaves", side: "tr", size: 0.45, dist: 1.4, dark: "#5b1e10", mid: "#b84a22", rim: "#f0b840", seed: 9 },
  { shot: 10, kind: "leaves", side: "tl", size: 0.4, dist: 1.2, dark: "#5b1e10", mid: "#9e2f26", rim: "#f0b840", seed: 10 },
  { shot: 13, kind: "leaves", side: "bl", size: 0.4, dist: 1.4, dark: "#5b1e10", mid: "#d8702a", rim: "#f0b840", seed: 13 },
];

export function buildNear(ctx) {
  const fg = bgForeground(ctx, null, LEAVES);
  return {
    group: fg.group,
    update(t, dt, cue) {
      fg.update(t, dt, cue);
    },
    dispose() {
      fg.dispose();
    },
  };
}
