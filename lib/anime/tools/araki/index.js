// araki: David Production JoJo family kit (Parts 3 and 5); parent wires via packs.js: await loadPack("araki").
import { arakiKit } from "./kit.js";
import { SHADE } from "./shade.js";
import { SCREEN } from "./screen.js";
import { PLATE } from "./plate.js";

export { defineModule } from "./define.js";
export { arakiKit } from "./kit.js";

export const ARAKI_SHADERS = [...SHADE, ...SCREEN, ...PLATE];
export const ARAKI_TOOLS = [arakiKit, ...ARAKI_SHADERS];
