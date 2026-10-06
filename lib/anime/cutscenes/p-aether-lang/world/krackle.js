// KRACKLE ARMS (bible 3.7): 16 arms x 7 dots flung from the core. The dots are 4-point SPARKLES with a white core and a dark ink edge (not round discs).
//
// MATHS (vertex): arm angle a_i, step y in (0,1):  r = 3.9 + y^2 (14 + 6 w)(1 + .1 pulse) + 9 burst y;  ang = a_i + .7 y (+/-) + .025 flow
//   centre = core + (1.15 r cos ang, .82 r sin ang, .3);  the quad is camera-facing (right/up from the view matrix) with size
//   s = (.55 (1 - .8 y) + .1)(.55 + .45 z)(dist/15)   (constant px size, 12..30 px)
// MATHS (fragment): u = position.xy * 2;  s = |u.x|^.6 + |u.y|^.6;  inside = s < 1;  white core s < .45;  ink ring .84 < s < 1 (#12083a);
//   fill = mix(#f5ebff, #a885ff, y).  Normal blending. SEAL GUARD fades any dot that would sit over the seal.
import { InstancedBufferAttribute, InstancedMesh, PlaneGeometry, ShaderMaterial } from "three";
import { GUARD_V, NOISE, OUT, TL, flowAt, hash, hx, presence, smooth, startOf, u, CORE } from "./shared.js";

export default function krackle(ctx) {
  const arms = 16, per = 7, n = arms * per, k = new Float32Array(n * 4);
  for (let a = 0; a < arms; a++) for (let j = 0; j < per; j++) {
    const i = a * per + j;
    k.set([(a / arms) * Math.PI * 2 + (hash(a, 1) - 0.5) * 0.25, (j + 0.5) / per, hash(i, 2), hash(a, 3)], i * 4);
  }
  const g = new PlaneGeometry(1, 1);
  g.setAttribute("aK", new InstancedBufferAttribute(k, 4));
  const m = new ShaderMaterial({
    uniforms: { uFlow: u(0), uPulse: u(0), uBurst: u(0), uFade: u(0), uCoreL: u(new ctx.THREE.Vector3(...CORE)), uSeal: u(new ctx.THREE.Vector3()), uSealS: u(1), uRes: ctx.engine.shared.uRes },
    transparent: true, depthWrite: false,
    vertexShader: /* glsl */ `
      attribute vec4 aK; uniform float uFlow, uPulse, uBurst, uFade; uniform vec3 uCoreL; varying vec2 vU; varying float vY, vGuard;
      ${GUARD_V}
      void main() {
        float pulse = 0.5 + 0.5 * sin(uPulse * 2.2 + aK.w * 30.0);
        float r = 3.9 + aK.y * aK.y * (14.0 + 6.0 * aK.w) * (1.0 + 0.1 * pulse) + 9.0 * uBurst * aK.y;
        float ang = aK.x + aK.y * 0.7 * (aK.w > 0.5 ? 1.0 : -1.0) + uFlow * 0.025;
        vec3 c = uCoreL + vec3(cos(ang) * r * 1.15, sin(ang) * r * 0.82, 0.3);
        vec4 wc = modelMatrix * vec4(c, 1.0);
        float dist = length(cameraPosition - wc.xyz);
        float s = (0.55 * (1.0 - aK.y * 0.8) + 0.1) * (0.55 + 0.45 * aK.z) * (dist / 15.0) * (1.0 + 0.5 * uBurst * (1.0 - aK.y)) * uFade;
        vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        wc.xyz += (right * position.x + up * position.y) * s;
        vU = position.xy * 2.0; vY = aK.y;
        gl_Position = projectionMatrix * viewMatrix * wc;
        vGuard = sealGuard(gl_Position);
      }`,
    fragmentShader: /* glsl */ `
      varying vec2 vU; varying float vY, vGuard; ${NOISE} ${OUT}
      void main() {
        float s = star4(vU), w = fwidth(s) + 1e-4;
        float cov = 1.0 - smoothstep(1.0 - w, 1.0 + w, s);
        vec3 col = mix(${hx("#f5ebff")}, ${hx("#a885ff")}, vY);
        col = mix(col, vec3(1.0), 1.0 - smoothstep(0.45 - w, 0.45 + w, s));
        col = mix(col, ${hx("#12083a")}, smoothstep(0.84 - w, 0.84 + w, s));
        emit(col, cov * vGuard);
      }`,
  });
  const mesh = new InstancedMesh(g, m, n);
  mesh.frustumCulled = false; mesh.userData.layer = 1; mesh.renderOrder = 0;
  const tmp = new ctx.THREE.Vector3();
  return {
    group: mesh,
    update(t, cue) {
      m.uniforms.uFlow.value = flowAt(t, startOf(cue, "freeze", TL.freeze));
      m.uniforms.uPulse.value = t;
      m.uniforms.uBurst.value = smooth((t - startOf(cue, "collide", TL.collide)) / 0.6);
      m.uniforms.uFade.value = presence(t, 0.15, startOf(cue, "clear", TL.voidEnd));
      ctx.seal.chest(tmp); m.uniforms.uSeal.value.copy(tmp); m.uniforms.uSealS.value = ctx.seal.scale ?? 1;
    },
    dispose() { g.dispose(); m.dispose(); },
  };
}
