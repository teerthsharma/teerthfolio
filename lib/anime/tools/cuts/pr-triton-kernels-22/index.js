// Stash pack for pr-triton-kernels-22: JJK Sukuna, Malevolent Shrine (MAPPA).
import { CUT_SHADERS, CUT_SHADER_COUNT } from "./packet.js";
import RISE from "./rise.js";
import SHRINE from "./shrine.js";

export * from "./packet.js";
export { tkIceRise } from "./rise.js";
export { tkGatePlate } from "./shrine.js";
if (CUT_SHADERS.length !== CUT_SHADER_COUNT) {
  throw new Error(`pr-triton-kernels-22 cut pack: ${CUT_SHADERS.length} != ${CUT_SHADER_COUNT}`);
}
export default [...CUT_SHADERS, ...RISE, ...SHRINE];
