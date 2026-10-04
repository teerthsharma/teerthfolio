// THE CARDS: one per place, one file per place (cards/<id>.js), every place
// imported here by name so a missing file fails the build. A dock builder
// edits only their own card and their own move (components/world/cutscene/
// moves/<id>.jsx); scripts/check-world.mjs holds every card to this shape.
//
//   id       the place id (lib/world/places.js)
//   homage   what it riffs on: shape, colour and pose only, never a face or logo
//   why      the claim the joke carries
//   stage    the bloom's look: { hue?, color?, stars: "sparkle" | "motes" |
//            "streaks" | "none", halftone: cell px (0 off), sfx: the one
//            hand-lettered onomatopoeia, in the place colour }. The colour is
//            `color`, else the place's radiation, else its own colour; `hue`
//            pins the wheel position outright (Aether-Lang's 256 is the base).
//   speaker  "land" (the landform speaks; it stays lit inside the stage and
//            the bubble's tail reaches to it, at `landAt` or the place's look
//            point) or an ink figure { build: "tall" | "broad" | "small",
//            hair: "spiky" | "flame" | "swept" | "mane" | "short" | "ears" |
//            "none", prop: ONE of "band" | "lens" | "glasses" | "mask" |
//            "cane" | "bowtie" | "dots7" | "cap" | "eyes" | "earring",
//            pose: "pockets" | "side" | "point" | "hip" | "crossed" |
//            "handout" | "cane", at?: [x, y, z] from the pup, scale? }
//   a, b     the two lines: { who: "sil" (the figure) | "land" | "seal", text,
//            kind?: "oval" | "burst" | "whisper" } (a is an oval, b a burst
//            unless set). Every number must be in data/showcase.json.
//   move     { pose, then?, note }: the pup's pose hook through the scene
//            (sign, fist, raise, crouch, sit, point, spin; see
//            components/world/seal/variants/D.jsx), `then` the one it turns
//            to on the move beat, `note` the brief for the dock's real move
//   bold?    words the lettering sets heavy
//   num?, sub?  a number the move slams, a subscript under line B
//   length?  seconds (default 8.2; each line gets at least 2.4)
//   beats?   any beat of lib/world/cutscene/timeline.js, overridden outright
//   view?    [look, eye] offsets for the two-shot, replacing the default
//   landAt?  { x, y, z } where the land speaks from

import lab_aether_lang from "./p-aether-lang.js";
import lab_resolvent from "./p-resolvent.js";
import lab_epsilon_hollow from "./p-epsilon-hollow.js";
import lab_caustic from "./p-caustic.js";
import lab_monodromy from "./p-monodromy.js";
import lab_topological_ml_toolkit from "./p-topological-ml-toolkit.js";
import lab_faraday from "./p-faraday.js";
import lab_nerve from "./p-nerve.js";
import lab_separatrix from "./p-separatrix.js";
import lab_planimeter from "./p-planimeter.js";
import lab_tangle from "./p-tangle.js";
import pr_mujoco_3396 from "./pr-mujoco-3396.js";
import pr_mujoco_warp_1541 from "./pr-mujoco-warp-1541.js";
import pr_mujoco_3450 from "./pr-mujoco-3450.js";
import pr_highway_3244 from "./pr-highway-3244.js";
import pr_xnnpack_10801 from "./pr-xnnpack-10801.js";
import pr_tensorflow_124410 from "./pr-tensorflow-124410.js";
import pr_nemo_relay_481 from "./pr-nemo-relay-481.js";
import pr_triton_kernels_22 from "./pr-triton-kernels-22.js";
import pr_openxla_46539 from "./pr-openxla-46539.js";
import pr_topograph_432 from "./pr-topograph-432.js";
import pr_pyrefly_4180 from "./pr-pyrefly-4180.js";
import pr_polychrom_79 from "./pr-polychrom-79.js";
import home from "./home.js";

export const CARDS = [
  lab_aether_lang, lab_resolvent, lab_epsilon_hollow, lab_caustic, lab_monodromy, lab_topological_ml_toolkit, lab_faraday, lab_nerve, lab_separatrix, lab_planimeter, lab_tangle,
  pr_mujoco_3396, pr_mujoco_warp_1541, pr_mujoco_3450, pr_highway_3244, pr_xnnpack_10801, pr_tensorflow_124410, pr_nemo_relay_481, pr_triton_kernels_22, pr_openxla_46539, pr_topograph_432, pr_pyrefly_4180, pr_polychrom_79,
  home,
];
const BY_ID = Object.fromEntries(CARDS.map((c) => [c.id, c]));
export const cardFor = (id) => BY_ID[id] ?? null;
