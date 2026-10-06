// THE GLASS FLOOR (bible 3.6). No Reflector (a second scene render is an F2 risk): a FAKED mirror. The core's reflection is computed analytically,
// as hard cel steps, so it reads painted, not CG.
//
// MATHS (fragment, floor point W, camera C, core K):
//   v = normalize(C - W);  rf = reflect(-v, up);  tc = K - W
//   ang  = acos(rf . normalize(tc))                              how far the mirrored ray misses the core
//   refl = exp(-14 ang^2) / (1 + .02 |tc|^2)  * fres,   fres = .34 + .62 (1 - v.y)^2.4        mirror strength (grazing = stronger)
//   cel  = .35 [refl > .15] + .35 [refl > .35] + .30 [refl > .6]        3 hard steps (AA by fwidth), colour mix(#9942c2, #ffffff)
//   base = mix(#030208, #1a1450, .6 exp(-d/22)), d = distance from the seal;  ripples: exp(-((fract(.55 d - .05 flow) - .5) 9)^2) exp(-.09 d) .07
//   edge ring: 2 px #7a5cff at d = 30 (|d - 30| < 1 px);  alpha = 1 - smoothstep(30, 34, d) for the body (the ring is added after the fade)
import { CircleGeometry, Mesh, ShaderMaterial } from "three";
import { NOISE, OUT, PAL, TL, flowAt, hx, presence, startOf, u } from "./shared.js";

export default function floor(ctx, rig) {
  const m = new ShaderMaterial({
    uniforms: { uCore: u(new ctx.THREE.Vector3(0, 1.7, -15).add(rig.position)), uCenter: u(rig.position.clone()), uFlow: u(0), uFade: u(0) },
    transparent: true, depthWrite: false,
    vertexShader: "varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: /* glsl */ `
      uniform vec3 uCore, uCenter; uniform float uFlow, uFade; varying vec3 vW; ${NOISE} ${OUT}
      void main() {
        vec3 v = normalize(cameraPosition - vW), rf = reflect(-v, vec3(0.0, 1.0, 0.0)), tc = uCore - vW;
        float ang = acos(clamp(dot(rf, normalize(tc)), -1.0, 1.0));
        float fres = 0.34 + 0.62 * pow(1.0 - clamp(v.y, 0.0, 1.0), 2.4);
        float refl = exp(-14.0 * ang * ang) / (1.0 + 0.02 * dot(tc, tc)) * fres * 6.0;
        float w = fwidth(refl) + 1e-4;
        float cel = 0.35 * smoothstep(0.15 - w, 0.15 + w, refl) + 0.35 * smoothstep(0.35 - w, 0.35 + w, refl) + 0.30 * smoothstep(0.6 - w, 0.6 + w, refl);
        float d = length(vW.xz - uCenter.xz);
        vec3 col = mix(${hx(PAL.black)}, ${hx("#1a1450")}, 0.6 * exp(-d / 22.0));
        col += ${hx(PAL.lilac)} * exp(-sq((fract(0.55 * d - 0.05 * uFlow) - 0.5) * 9.0)) * exp(-0.09 * d) * 0.07;
        col = mix(col, mix(${hx(PAL.orchid)}, vec3(1.0), cel), cel);
        float fw = fwidth(d) + 1e-4, ring = 1.0 - smoothstep(fw * 0.5, fw * 1.5, abs(d - 30.0));
        float a = 1.0 - smoothstep(30.0, 34.0, d);
        col = mix(col, ${hx(PAL.edge)}, ring);
        emit(col, max(a, ring) * uFade);
      }`,
  });
  const mesh = new Mesh(new CircleGeometry(34, 96).rotateX(-Math.PI / 2), m);
  mesh.position.y = -0.01; mesh.renderOrder = -1; mesh.frustumCulled = false; mesh.userData.layer = 1;
  return {
    group: mesh,
    update(t, cue) {
      m.uniforms.uFade.value = presence(t, 0.1, startOf(cue, "clear", TL.voidEnd));
      m.uniforms.uFlow.value = flowAt(t, startOf(cue, "freeze", TL.freeze));
    },
    dispose() { mesh.geometry.dispose(); m.dispose(); },
  };
}
