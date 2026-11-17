// Madhouse family kit (Death Note, Overlord, Frieren): shaders for p-nerve, pr-topograph-432, p-resolvent.
import { mhKit, KIT_GLSL } from "./kit.glsl.js";
import { SURFACE } from "./surface.js";
import { PLATE } from "./plate.js";
import { SCREEN } from "./screen.js";

export { defineModule } from "./define.js";
export { mhKit, KIT_GLSL } from "./kit.glsl.js";

export const MADHOUSE_SHADERS = [...SURFACE, ...PLATE, ...SCREEN];
export const MADHOUSE_TOOLS = [mhKit, ...MADHOUSE_SHADERS];
