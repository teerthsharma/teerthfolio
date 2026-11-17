// ufotable pack: Fate/Zero studio-look kit (cel, line, fur, eye, plates, grade, grain, bloom, bolt, Gate wall, weapon card, Enuma wind).
import { ufoKit } from "./kit.glsl.js";
import { CEL } from "./cel.js";
import { PLATE } from "./plate.js";
import { FX } from "./fx.js";

export { ufoKit };
export const UFOTABLE_SHADERS = [...CEL, ...PLATE, ...FX];
export const UFOTABLE_TOOLS = [ufoKit, ...UFOTABLE_SHADERS];
