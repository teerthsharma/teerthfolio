// THE STORMY BULLSEYE DUSK SKY (layer 0). A sphere at infinity (depth on the far plane, like paint.js bakedDome) whose fragment
// shader paints awSky(d) from glsl.js: 8 concentric rings of 6 degrees around the bullseye centre, hard AA edges, palette
// swapped on a hard cut by setPalette(); sheared storm clouds with an ink edge; the bold diagonal shadow band; a flat haze band.
// The palette is read from shared uniforms every frame, so a swap recolours the dome without a rebake of anything.
import { BackSide, Mesh, ShaderMaterial, SphereGeometry } from "three";
import { DOME_V, NOISE, PAL_UNIFORMS, SKY } from "./glsl.js";

export function buildSky(U) {
  const mat = new ShaderMaterial({
    uniforms: { ...U }, vertexShader: DOME_V, side: BackSide, depthWrite: false,
    fragmentShader: `${PAL_UNIFORMS} ${NOISE} ${SKY} varying vec3 vD;
      void main() { gl_FragColor = vec4(awSky(normalize(vD)), 0.0); }`, // alpha 0 = the sky id
  });
  const m = new Mesh(new SphereGeometry(400, 48, 24), mat);
  m.frustumCulled = false; m.renderOrder = -10;
  return m;
}
