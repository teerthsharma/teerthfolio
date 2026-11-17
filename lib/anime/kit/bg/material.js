// THE KIT MATERIAL: one ShaderMaterial builder for every painted surface (facade, stone, ground, water, wood). A surface supplies
//   void bgSurf(vec3 P, vec3 N, vec3 V, out vec3 alb, out vec3 emit, out float ao, out float wet)
// and the shared frame (glsl.js) lights it from the look: bands, rim, pools of light, dark foot, haze. Output is linear colour with the
// set id in alpha (uId), the engine's set contract (values above 1 bloom). inkable() gives any geometry the attributes engine.ink() reads.
import { BufferAttribute, DoubleSide, FrontSide, ShaderMaterial } from "three";
import { glslFor } from "../../tools/index.js";
import { BG_FRAME, BG_UNIFORMS, PAINT } from "./glsl.js";

export function bgMaterial(look, o) {
  const attrs = o.attrs ?? "", vary = o.varyings ?? "";
  const material = new ShaderMaterial({
    side: o.double ? DoubleSide : FrontSide,
    extensions: { derivatives: true },
    uniforms: { ...look.u, uId: { value: Number((o.id ?? 0.5).toFixed(3)) }, ...(o.uniforms ?? {}) },
    vertexShader: /* glsl */ `
      uniform float uTime; varying vec3 vWP; varying vec3 vWN; varying vec2 vUv; ${attrs}
      void main() {
        vec3 p = position; vUv = uv;
        ${o.vert ?? ""}
        vec4 w = modelMatrix * vec4(p, 1.0); vWP = w.xyz; vWN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      ${BG_UNIFORMS} uniform vec2 uRes; varying vec3 vWP; varying vec3 vWN; varying vec2 vUv; ${vary}
      ${glslFor(["noise", ...(o.tools ?? [])])}
      ${PAINT}
      ${BG_FRAME}
      ${o.frag}
      void main() {
        vec3 N = normalize(vWN); if (!gl_FrontFacing) N = -N;
        ${o.flatNormal ? "N = normalize(cross(dFdx(vWP), dFdy(vWP))); if (dot(N, cameraPosition - vWP) < 0.0) N = -N;" : ""}
        vec3 V = normalize(cameraPosition - vWP);
        gFw = length(fwidth(vWP));
        vec3 alb, emit; float ao = 1.0, wet = 0.0;
        bgSurf(vWP, N, V, alb, emit, ao, wet);
        gl_FragColor = vec4(bgFinish(alb, emit, ao, wet, vWP, N, V), uId);
      }`,
  });
  return material;
}

// the attributes engine.ink() and the line pass read, so a kit mesh can carry the style's outline: aCol, aShade, aXrd (bias 0.5, line weight 1)
export function inkable(geo, line = 1) {
  const n = geo.attributes.position.count;
  const fill = (name, a, b, c) => { const arr = new Float32Array(n * 3); for (let i = 0; i < n; i++) { arr[i * 3] = a; arr[i * 3 + 1] = b; arr[i * 3 + 2] = c; } geo.setAttribute(name, new BufferAttribute(arr, 3)); };
  if (!geo.attributes.aCol) fill("aCol", 0.2, 0.2, 0.25);
  if (!geo.attributes.aShade) fill("aShade", 0.1, 0.1, 0.14);
  if (!geo.attributes.aXrd) fill("aXrd", 0.5, line, 0);
  return geo;
}
