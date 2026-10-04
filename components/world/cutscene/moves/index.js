// Every place's move, one file each, imported by name (a missing one fails
// the build). A move gets the cutscene's props { card, place, tl, mode } and
// draws in 3D with the kit (../kit.jsx).
import lab_aether_lang from "./p-aether-lang.jsx";
import lab_resolvent from "./p-resolvent.jsx";
import lab_epsilon_hollow from "./p-epsilon-hollow.jsx";
import lab_caustic from "./p-caustic.jsx";
import lab_monodromy from "./p-monodromy.jsx";
import lab_topological_ml_toolkit from "./p-topological-ml-toolkit.jsx";
import lab_faraday from "./p-faraday.jsx";
import lab_nerve from "./p-nerve.jsx";
import lab_separatrix from "./p-separatrix.jsx";
import lab_planimeter from "./p-planimeter.jsx";
import lab_tangle from "./p-tangle.jsx";
import pr_mujoco_3396 from "./pr-mujoco-3396.jsx";
import pr_mujoco_warp_1541 from "./pr-mujoco-warp-1541.jsx";
import pr_mujoco_3450 from "./pr-mujoco-3450.jsx";
import pr_highway_3244 from "./pr-highway-3244.jsx";
import pr_xnnpack_10801 from "./pr-xnnpack-10801.jsx";
import pr_tensorflow_124410 from "./pr-tensorflow-124410.jsx";
import pr_nemo_relay_481 from "./pr-nemo-relay-481.jsx";
import pr_triton_kernels_22 from "./pr-triton-kernels-22.jsx";
import pr_openxla_46539 from "./pr-openxla-46539.jsx";
import pr_topograph_432 from "./pr-topograph-432.jsx";
import pr_pyrefly_4180 from "./pr-pyrefly-4180.jsx";
import home from "./home.jsx";

export const MOVES = {
  "p-aether-lang": lab_aether_lang,
  "p-resolvent": lab_resolvent,
  "p-epsilon-hollow": lab_epsilon_hollow,
  "p-caustic": lab_caustic,
  "p-monodromy": lab_monodromy,
  "p-topological-ml-toolkit": lab_topological_ml_toolkit,
  "p-faraday": lab_faraday,
  "p-nerve": lab_nerve,
  "p-separatrix": lab_separatrix,
  "p-planimeter": lab_planimeter,
  "p-tangle": lab_tangle,
  "pr-mujoco-3396": pr_mujoco_3396,
  "pr-mujoco-warp-1541": pr_mujoco_warp_1541,
  "pr-mujoco-3450": pr_mujoco_3450,
  "pr-highway-3244": pr_highway_3244,
  "pr-xnnpack-10801": pr_xnnpack_10801,
  "pr-tensorflow-124410": pr_tensorflow_124410,
  "pr-nemo-relay-481": pr_nemo_relay_481,
  "pr-triton-kernels-22": pr_triton_kernels_22,
  "pr-openxla-46539": pr_openxla_46539,
  "pr-topograph-432": pr_topograph_432,
  "pr-pyrefly-4180": pr_pyrefly_4180,
  "home": home,
};
