// Cuts D docks: school dusk pair, JoJo hat, Bleach, Fate cape, GER, slime, yellow flash.
import { cutKit } from "./kit.glsl.js";
import planimeterShaders, { CUT_SHADER_COUNT as n0 } from "./p-planimeter/index.js";
import separatrixShaders, { CUT_SHADER_COUNT as n1 } from "./p-separatrix/index.js";
import tangleShaders, { CUT_SHADER_COUNT as n2 } from "./p-tangle/index.js";
import highwayShaders, { CUT_SHADER_COUNT as n3 } from "./pr-highway-3244/index.js";
import pyreflyShaders, { CUT_SHADER_COUNT as n4 } from "./pr-pyrefly-4180/index.js";
import tensorflowShaders, { CUT_SHADER_COUNT as n5 } from "./pr-tensorflow-124410/index.js";
import xnnpackShaders, { CUT_SHADER_COUNT as n6 } from "./pr-xnnpack-10801/index.js";
import spawnSealShaders, { CUT_SHADER_COUNT as n7 } from "./spawn-seal/index.js";

export { cutKit };
export * as planimeter from "./p-planimeter/index.js";
export * as separatrix from "./p-separatrix/index.js";
export * as tangle from "./p-tangle/index.js";
export * as highway from "./pr-highway-3244/index.js";
export * as pyrefly from "./pr-pyrefly-4180/index.js";
export * as tensorflow from "./pr-tensorflow-124410/index.js";
export * as xnnpack from "./pr-xnnpack-10801/index.js";
export * as spawnSeal from "./spawn-seal/index.js";

export const CUTS_D_DOCKS = [
  "p-planimeter",
  "p-separatrix",
  "p-tangle",
  "pr-highway-3244",
  "pr-pyrefly-4180",
  "pr-tensorflow-124410",
  "pr-xnnpack-10801",
  "spawn-seal",
];

export const CUTS_D = [
  ...planimeterShaders,
  ...separatrixShaders,
  ...tangleShaders,
  ...highwayShaders,
  ...pyreflyShaders,
  ...tensorflowShaders,
  ...xnnpackShaders,
  ...spawnSealShaders,
];

export const CUTS_D_COUNT = 160;
if (n0 + n1 + n2 + n3 + n4 + n5 + n6 + n7 !== CUTS_D_COUNT) {
  throw new Error(`cuts D dock counts ${n0}+${n1}+${n2}+${n3}+${n4}+${n5}+${n6}+${n7} != ${CUTS_D_COUNT}`);
}
if (CUTS_D.length !== CUTS_D_COUNT) {
  throw new Error(`cuts D: expected ${CUTS_D_COUNT} shaders, got ${CUTS_D.length}`);
}

export default CUTS_D;
