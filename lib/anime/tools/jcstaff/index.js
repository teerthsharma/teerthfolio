// J.C.Staff family kit (Railgun, Index): cel ramp, rim, line, eye, muzzle, blue-sky plates, arcs, glow, smoke, grade, grain.
// Parent: registerPack(await import("./jcstaff/index.js"), "jcstaff") or loadPack("jcstaff") from ../packs.js.
import { jcsKit } from "./kit.js";
import { SURFACE } from "./surface.js";
import { PLATE } from "./plate.js";
import { FX } from "./fx.js";
import { GRADE } from "./grade.js";

export { defineModule, SUITS } from "./define.js";
export { jcsKit } from "./kit.js";

export const JCS_SHADERS = [...SURFACE, ...PLATE, ...FX, ...GRADE];
export const JCS_SHADER_COUNT = 13;
if (JCS_SHADERS.length !== JCS_SHADER_COUNT) throw new Error(`jcstaff shader count ${JCS_SHADERS.length} != ${JCS_SHADER_COUNT}`);

export const JCS_TOOLS = [jcsKit, ...JCS_SHADERS];
