import { sharedUniforms } from "./ink.js";

// one uniform object per scene, parked on ctx so the world, cast and fx layers share it without importing each other
export const araki = (ctx) => (ctx.__araki ??= { U: sharedUniforms() });
