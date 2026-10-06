// MANHWA GRAIN: LOW Korean-print silver grain. Small tool. Composes grade.filmGrain.
// Screen quad, normal blend, 8% in the mids so the still reads as manhwa paper, not a cream wash.
//
// MATHS: g = filmGrain(mid-grey, fragCoord, seed, 0.85); luma-weighted already inside the tool;
//   out = g; alpha = 0.08 * fade; seed = floor(12 t)
import { Mesh, PlaneGeometry, ShaderMaterial } from "three";
import { since, sm } from "./common.js";

export function buildManhwaGrain(ctx) {
  const tools = ctx.tools.glslFor(["grade"]);
  const mat = new ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false,
    uniforms: { uSeed: { value: 0 }, uA: { value: 0 } },
    vertexShader: `void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */ `
      ${tools}
      uniform float uSeed, uA;
      void main() {
        if (uA < 0.002) discard;
        vec3 g = filmGrain(vec3(0.46, 0.43, 0.39), gl_FragCoord.xy, uSeed, 0.85);
        gl_FragColor = vec4(g, uA);
      }`,
  });
  const mesh = new Mesh(new PlaneGeometry(2, 2), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 40;
  mesh.userData.layer = 1;
  return {
    obj: mesh,
    update(t, dt, cue) {
      const br = since(cue, "break");
      mat.uniforms.uSeed.value = Math.floor(cue.ts * 12);
      mat.uniforms.uA.value = 0.08 * (br < 0 ? 1 : 1 - sm(br / 0.8));
    },
    dispose() { mat.dispose(); mesh.geometry.dispose(); },
  };
}
