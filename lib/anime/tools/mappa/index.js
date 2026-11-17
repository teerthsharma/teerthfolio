// MAPPA family kit (JJK, AoT Final Season). Load with loadPack("mappa"), then glslFor(["mappaCel2"]); the kit comes first.
import { mappaKit, KIT_GLSL } from "./kit.glsl.js";
import { CEL } from "./cel.js";
import { PLATE } from "./plate.js";
import { FX } from "./fx.js";

export { defineModule } from "./define.js";
export { mappaKit, KIT_GLSL } from "./kit.glsl.js";

export const MAPPA_SHADERS = [...CEL, ...PLATE, ...FX];
export const MAPPA_TOOLS = [mappaKit, ...MAPPA_SHADERS];
export const MAPPA_BY_NAME = Object.fromEntries(MAPPA_TOOLS.map((m) => [m.name, m]));
