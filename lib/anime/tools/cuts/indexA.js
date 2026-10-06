// Slice [0, 8) of alphabetically sorted lib/anime/cutscenes/ docks.
// Folders: _template, home, p-aether-lang, p-caustic, p-epsilon-hollow, p-faraday, p-monodromy, p-nerve.
import { cutKit } from "./kit.glsl.js";
import templateShaders, { CUT_SHADER_COUNT as n0 } from "./_template/index.js";
import homeShaders, { CUT_SHADER_COUNT as n1 } from "./home/index.js";
import aetherShaders, { CUT_SHADER_COUNT as n2 } from "./p-aether-lang/index.js";
import causticShaders, { CUT_SHADER_COUNT as n3 } from "./p-caustic/index.js";
import epsilonShaders, { CUT_SHADER_COUNT as n4 } from "./p-epsilon-hollow/index.js";
import faradayShaders, { CUT_SHADER_COUNT as n5 } from "./p-faraday/index.js";
import monodromyShaders, { CUT_SHADER_COUNT as n6 } from "./p-monodromy/index.js";
import nerveShaders, { CUT_SHADER_COUNT as n7 } from "./p-nerve/index.js";

export { cutKit };
export * as template from "./_template/index.js";
export * as home from "./home/index.js";
export * as aetherLang from "./p-aether-lang/index.js";
export * as caustic from "./p-caustic/index.js";
export * as epsilonHollow from "./p-epsilon-hollow/index.js";
export * as faraday from "./p-faraday/index.js";
export * as monodromy from "./p-monodromy/index.js";
export * as nerve from "./p-nerve/index.js";

export const CUTS_A_DOCKS = [
  "_template",
  "home",
  "p-aether-lang",
  "p-caustic",
  "p-epsilon-hollow",
  "p-faraday",
  "p-monodromy",
  "p-nerve",
];

export const CUTS_A = [
  ...templateShaders,
  ...homeShaders,
  ...aetherShaders,
  ...causticShaders,
  ...epsilonShaders,
  ...faradayShaders,
  ...monodromyShaders,
  ...nerveShaders,
];

export const CUTS_A_COUNT = 160;
if (n0 + n1 + n2 + n3 + n4 + n5 + n6 + n7 !== CUTS_A_COUNT) {
  throw new Error(`cuts A dock counts ${n0}+${n1}+${n2}+${n3}+${n4}+${n5}+${n6}+${n7} != ${CUTS_A_COUNT}`);
}
if (CUTS_A.length !== CUTS_A_COUNT) {
  throw new Error(`cuts A: expected ${CUTS_A_COUNT} shaders, got ${CUTS_A.length}`);
}

export default CUTS_A;
