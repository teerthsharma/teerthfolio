// THE STORMY BULLSEYE DUSK SKY (layer 0). A sphere at infinity (depth on the far plane, like paint.js bakedDome) whose fragment
// shader paints awSky(d) from glsl.js: 8 concentric rings of 6 degrees around the bullseye centre, hard AA edges, palette
// swapped on a hard cut by setPalette(); sheared storm clouds with an ink edge; the bold diagonal shadow band; a flat haze band.
// The palette is read from shared uniforms every frame, so a swap recolours the dome without a rebake of anything.
export { buildSky } from "./bullseye-sky.js";
