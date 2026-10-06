// surface: a painted-surface material for kit geometry. The body is GLSL defining
//   vec3 shade(vec3 P, vec3 N, vec3 V)   // world position, world normal, view direction (to the eye)
// with the shared key light (uLightDir, uLightCol), uTime, uRes and any tools/ GLSL in scope.
// Output: linear colour (values above 1 bloom) with the set id in alpha (0.99: no set lines).
//   surface(shared, body, { tools: ["noise"], uniforms: {}, id: 0.5, instanced: false, side, vert })
// vert (optional) is GLSL run in the vertex shader on `vec3 p` (object space) before the model matrix.
import { FrontSide, ShaderMaterial } from "three";
import { glslFor } from "../tools/index.js";

export function surface(shared, body, o = {}) {
  const inst = o.instanced ? "instanceMatrix * " : "";
  return new ShaderMaterial({
    side: o.side ?? FrontSide,
    uniforms: { uLightDir: shared.uLightDir, uLightCol: shared.uLightCol, uTime: shared.uTime, uRes: shared.uRes, ...(o.uniforms ?? {}) },
    vertexShader: /* glsl */ `
      uniform float uTime; varying vec3 vWP; varying vec3 vWN; varying vec2 vUv; ${o.attrs ?? ""}
      void main() {
        vec3 p = position; vUv = uv;
        ${o.vert ?? ""}
        mat4 M = modelMatrix * ${inst}mat4(1.0);
        vec4 w = M * vec4(p, 1.0); vWP = w.xyz; vWN = normalize(mat3(M) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uLightDir; uniform vec3 uLightCol; uniform float uTime; uniform vec2 uRes;
      varying vec3 vWP; varying vec3 vWN; varying vec2 vUv; ${o.varyings ?? ""}
      ${glslFor(o.tools ?? ["noise"])}
      ${body}
      void main() {
        vec3 N = normalize(vWN); if (!gl_FrontFacing) N = -N;
        gl_FragColor = vec4(shade(vWP, N, normalize(cameraPosition - vWP)), ${(o.id ?? 0.5).toFixed(3)});
      }`,
  });
}
