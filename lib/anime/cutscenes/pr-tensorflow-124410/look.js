// The hero spec for pr-tensorflow-124410, cut-local: the kit look with a shorter jacket hem, a belt set higher, and the approved face stripes (cheeks and forehead). Everything else is inherited.
import base from "../../kit/hero/looks/pr-tensorflow-124410.js";

const line = (at, to) => ({ kind: "line", at, to, w: 0.012, col: "#5a6680" });
const cheeks = (dv) => [line([-0.5, 0.02 + dv], [-0.22, -0.05 + dv]), line([0.5, 0.02 + dv], [0.22, -0.05 + dv])];
const forehead = [line([-0.12, 0.4], [-0.04, 0.3]), line([0.12, 0.4], [0.04, 0.3])];

export default {
  ...base,
  outfit: base.outfit.map((g) => (g.kind === "jacket" ? { ...g, hem: 0.05 } : g.kind === "belt" ? { ...g, at: 0.22 } : g)),
  marks: [...base.marks, ...cheeks(0), ...cheeks(-0.1), ...forehead],
};
