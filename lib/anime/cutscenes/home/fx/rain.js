// FX 4: RAIN (the first drops at 24.4 s strengthen to a steady fall by 25.8 s).
//
// 480 streaks (the bible's 240 doubled so the volume reads from the wide), each 0.9..1.4 m long, 0.03 m wide, #8fa6cc at 55%
// with a brighter head. All on twos: the stepped clock moves each streak ~1.3 m per step, so it flickers like drawn rain.
//     fall   = mod(phase * H - speed * t, H)           speed 13..20 m/s,  y = fall - 0.6
//     x      = x0 + slant * (H - fall)                 slant 0.07..0.12 per metre fallen (the lean)
//     axis   = normalize(slant, -1, 0)                 the streak lies along its motion
//     side   = normalize(cross(axis, c - cameraPosition))      a ribbon that always faces the lens
//     alpha  = 0.55 * mix(.35, 1, v)  (v: 0 tail .. 1 head),  head colour mixes toward #c9d8ee
//     gate   = step(seed, strength)                    strength = 0.04 + 0.96 smoothstep(rain0, rain1, t); a few drops first, then the sheet
// Depth-tested, never written, 0.03 m wide: a streak cannot cover the seal.
import * as S from "./shared.js";

export default function build(ctx) {
  const { THREE } = ctx;
  const group = new THREE.Group();
  const C = S.clock(ctx.scene);
  const rng = ctx.rng(9001);
  const N = 480, HGT = 12;
  const aR = new Float32Array(N * 4), aS = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    aR.set([-12 + 21 * rng(), -10 + 20 * rng(), rng(), 13 + 7 * rng()], i * 4);
    aS.set([0.9 + 0.5 * rng(), 0.07 + 0.05 * rng(), rng(), 0], i * 4);
  }
  const g = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1, 1));
  g.setAttribute("aR", new THREE.InstancedBufferAttribute(aR, 4));
  g.setAttribute("aS", new THREE.InstancedBufferAttribute(aS, 4));
  g.instanceCount = N;
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uT: { value: 0 }, uStr: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute vec4 aR; attribute vec4 aS; uniform float uT, uStr;
      varying float vV;
      void main() {
        float HG = ${HGT.toFixed(1)};
        float fall = mod(aR.z * HG - aR.w * uT, HG);
        vec3 c = vec3(aR.x + aS.y * (HG - fall), fall - 0.6, aR.y);
        vec3 ax = normalize(vec3(aS.y, -1.0, 0.0));
        vec3 side = normalize(cross(ax, c - cameraPosition));
        vV = 0.5 - position.y;
        vec3 w = c + ax * (-position.y) * aS.x + side * position.x * 0.03;      // v = 1 at the head (lower end)
        gl_Position = step(aS.z, uStr) > 0.5 ? projectionMatrix * viewMatrix * vec4(w, 1.0) : vec4(2.0, 2.0, 2.0, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying float vV;
      void main() {
        vec3 tail = vec3(0.561, 0.651, 0.800);          // #8fa6cc
        vec3 head = vec3(0.788, 0.847, 0.933);          // #c9d8ee
        vec3 col = mix(tail, head, smoothstep(0.6, 1.0, vV));
        gl_FragColor = vec4(col, 0.55 * mix(0.35, 1.0, vV));
      }`,
  });
  const rain = new THREE.Mesh(g, mat);
  rain.frustumCulled = false; rain.renderOrder = 30; rain.visible = false;
  group.add(rain);

  return {
    group,
    update(t) {
      const on = t >= C.rain[0];
      rain.visible = on;
      if (!on) return;
      mat.uniforms.uT.value = t;
      mat.uniforms.uStr.value = 0.04 + 0.96 * S.sm(C.rain[0], C.rain[1], t);
    },
    dispose() { g.dispose(); mat.dispose(); },
  };
}
