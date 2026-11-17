// Pierrot TV family kit (Naruto, Bleach): cel ramp, contour, fur, eye, hair, plates, glow, brush, grade, grain, negative.
import { pierrotKit } from "./kit.glsl.js";
import { CEL } from "./cel.js";
import { PLATE } from "./plate.js";
import { SCREEN } from "./screen.js";

export { defineModule } from "./define.js";
export { pierrotKit } from "./kit.glsl.js";

export const PIERROT_SHADERS = [...CEL, ...PLATE, ...SCREEN];
export const PIERROT_TOOLS = [pierrotKit, ...PIERROT_SHADERS];
