// Shinkai pack (Your Name): twilight sky, clouds, glare, ghosts, lake, fireflies, comet, seal cel/line/eye, grade, grain.
import { shinKit } from "./kit.glsl.js";
import { SKY } from "./sky.js";
import { LIGHT } from "./light.js";
import { SEAL } from "./seal.js";
import { GRADE } from "./grade.js";

export { defineModule } from "./define.js";
export { shinKit, KIT_GLSL } from "./kit.glsl.js";

export const SHINKAI_SHADERS = [...SKY, ...LIGHT, ...SEAL, ...GRADE];
export const SHINKAI_TOOLS = [shinKit, ...SHINKAI_SHADERS];
