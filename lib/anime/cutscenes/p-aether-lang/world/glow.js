// FLOOD GLOW (bible 3.20, 6.2 glow 0.85): the core and its flood as one additive radial on the lens, so the long still reads as a cosmic field,
// not type on black. CAPPED so the seal never goes milky (L8): peak K 0.5, and the quad sits at the far plane WITH depth test, so every opaque
// thing (the seal, the victim seals) is in front of it and is never added to.
//
// MATHS: q = (x .8, y + .15), r = |q|, a = atan(q);  rays = .65 + .35 sin(9a + 6r), snapped to 3 steps (floor(3 rays + .5)/3) for the cel look
//   c = mix(#7a2bbf, #f2e0ff, exp(-2.2 r)) (exp(-1.1 r) rays + .35 exp(-.4 r)) * K;   K(t) = .5 smoothstep(1.45..2.35) (1 - smoothstep(6.6..7.6)) + .12 hold to the return
import { Mesh, PlaneGeometry, ShaderMaterial } from "three";
import { ADD, NOISE, OUT, TL, hx, presence, smooth, startOf, u } from "./shared.js";

export default function glow() {
  const m = new ShaderMaterial({
    uniforms: { uK: u(0) },
    transparent: true, depthWrite: false, depthTest: true, ...ADD,
    vertexShader: "varying vec2 vP; void main() { vP = position.xy * 2.0; gl_Position = vec4(vP, 0.99999, 1.0); }",
    fragmentShader: /* glsl */ `
      uniform float uK; varying vec2 vP; ${NOISE} ${OUT}
      void main() {
        vec2 q = vec2(vP.x * 0.8, vP.y + 0.15); float r = length(q), a = atan(q.y, q.x);
        float rays = floor((0.65 + 0.35 * sin(a * 9.0 + r * 6.0)) * 3.0 + 0.5) / 3.0;
        vec3 c = mix(${hx("#7a2bbf")}, ${hx("#f2e0ff")}, exp(-r * 2.2)) * (exp(-r * 1.1) * rays + 0.35 * exp(-r * 0.4));
        emit(min(c, vec3(0.92)), clamp(uK, 0.0, 0.5));
      }`,
  });
  const mesh = new Mesh(new PlaneGeometry(1, 1), m);
  mesh.frustumCulled = false; mesh.renderOrder = 5; mesh.userData.layer = 1;
  return {
    group: mesh,
    update(t, cue) {
      const a = startOf(cue, "flood", TL.floodA);
      const hold = 0.12 * presence(t, 0.6, startOf(cue, "clear", TL.voidEnd));
      m.uniforms.uK.value = 0.5 * smooth((t - a) / 0.9) * (1 - smooth((t - (TL.floodB)) / 1.0)) + hold * smooth((t - TL.floodB) / 1.0);
    },
    dispose() { mesh.geometry.dispose(); m.dispose(); },
  };
}
