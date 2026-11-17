// Shonen pack (Toei and Bones battle shonen): the kit plus 12 family shaders, exported in the pack shape of jjk and school.
import { shoKit } from "./kit.glsl.js";
import { SURFACE } from "./surface.js";
import { FX } from "./fx.js";
import { PLATE } from "./plate.js";

export { defineModule } from "./define.js";
export { shoKit, KIT_GLSL } from "./kit.glsl.js";

export const SHONEN_SHADERS = [...SURFACE, ...FX, ...PLATE];
export const SHONEN_TOOLS = [shoKit, ...SHONEN_SHADERS];
export const SHONEN_BY_NAME = Object.fromEntries(SHONEN_TOOLS.map((m) => [m.name, m]));
