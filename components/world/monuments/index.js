// Which sculpture stands on which plinth, keyed by the landing site's figure
// name (place.figure.name). One file per figure, so each can be rebuilt on
// its own without touching this registry.
import Aether from "./Aether";
import Arena from "./Arena";
import Caustic from "./Caustic";
import Certify from "./Certify";
import Chain from "./Chain";
import Closure from "./Closure";
import Collapse from "./Collapse";
import Cut from "./Cut";
import Funnel from "./Funnel";
import Gather from "./Gather";
import Glass from "./Glass";
import Grant from "./Grant";
import Hull from "./Hull";
import Link from "./Link";
import Prune from "./Prune";
import Refuse from "./Refuse";
import Schedule from "./Schedule";
import Settle from "./Settle";
import Smatrix from "./Smatrix";
import Transport from "./Transport";
import Units from "./Units";
import Witness from "./Witness";

export const SCULPTURES = {
  units: Units, // google-deepmind/mujoco #3396
  funnel: Funnel, // google-deepmind/mujoco_warp #1541
  hull: Hull, // google-deepmind/mujoco #3450
  prune: Prune, // google/highway #3244
  arena: Arena, // google/XNNPACK #10801
  closure: Closure, // tensorflow/tensorflow #124410
  gather: Gather, // NVIDIA/NeMo-Relay #481
  schedule: Schedule, // triton-lang/kernels #22
  settle: Settle, // openxla/xla #46539
  grant: Grant, // dsx-ai-factory/topograph #432
  chain: Chain, // facebook/pyrefly #4180
  smatrix: Smatrix, // resolvent
  collapse: Collapse, // Epsilon-Hollow
  aether: Aether, // Aether-Lang
  caustic: Caustic, // caustic
  transport: Transport, // monodromy
  cut: Cut, // topological-ml-toolkit
  glass: Glass, // faraday
  witness: Witness, // nerve
  certify: Certify, // separatrix
  refuse: Refuse, // planimeter
  link: Link, // tangle
};
