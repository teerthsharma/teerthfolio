// prettytv pack: modern pretty-TV family kit (Tensura, Misfit, Devil Is a Part-Timer, Classroom of the Elite, Vinland Saga); load with loadPack("prettytv").
import { ptvKit } from "./kit.js";
import { LOOK } from "./look.js";
import { PLATE } from "./plate.js";
import { SCREEN } from "./screen.js";

export { defineModule } from "./define.js";
export { ptvKit } from "./kit.js";

export const PRETTYTV_SHADERS = [...LOOK, ...PLATE, ...SCREEN];
export const PRETTYTV_TOOLS = [ptvKit, ...PRETTYTV_SHADERS];
