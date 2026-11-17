// pr-anyps5-12609: the fish monument in the east-shore meadow (components/world/land/Covenant.jsx).
// No move yet: the id stays out of timeline.js APPROVED, so arriving shows the place, its label and its panel only.
import { PLACE_BY_ID } from "../../places.js";

const NAME = PLACE_BY_ID["pr-anyps5-12609"].district.name;

export default {
  id: "pr-anyps5-12609",
  homage: "a village's fish monument on its green: a bronze fish leaping a granite wave",
  why: "A stall several frames long is one stall: listed once, by its height above the frame that separates it from a longer one.",
  stage: { stars: "none", halftone: 0, sfx: "splash" },
  speaker: "land",
  length: 11.6,
  a: { who: "seal", text: "One stall, one line." },
  b: { who: "land", text: "The next stall stays on the list.", kind: "oval" },
  c: { who: "land", text: "0 differences from a brute-force oracle on 60,000 random series. 79 tests passing.", kind: "burst" },
  credit: { title: "boykopovar/AnyPS5 #12609", sub: `${NAME}: 0 diffs in 60,000` },
  move: { pose: "sit", note: "No move is built: the dock's scene waits for its own design and the owner's approval." },
};
