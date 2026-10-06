// p-caustic WORLD / dust plume at each impact (bible 3.12 and 3.4): 24 puff billboards per hit, #9c8a72 / #bfa98b, a ring
// expanding 14 m/s for .6 s (then 1.5 m/s) with a rising column in the middle, shrinking away after 1.4 s.
//   ring puff:   a = 2pi j/16 + jitter; r(tau) = 14 tau (tau < .6), 8.4 + 1.5 (tau - .6) after; y = .5 + 3 sm(tau/.8)
//   column puff: y = 1 + 14 (1 - exp(-3 tau)) (j + 1)/8, xz jitter 1.2 m; size (3 + 7 sm(tau/.9))
//   shade (fragment, quad uv q): d = |q| + .18 (vn - .5) > 1 discard; lit side up-left haze #bfa98b, body ash #9c8a72,
//   lower-right shadow #6a5c4d, hard cuts at dot(q, (-.5,.6)) = .15 / -.35
import { PAL, V, GEO, since, sm } from "./common.js";

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 c = (modelMatrix * vec4(instanceMatrix[3].xyz, 1.0)).xyz;
    float sz = length(instanceMatrix[0].xyz) * length(modelMatrix[0].xyz);
    vec4 vc = viewMatrix * vec4(c, 1.0);
    vc.xy += position.xy * sz;
    gl_Position = projectionMatrix * vc;
  }`;
const FRAG = (noise) => /* glsl */ `
  varying vec2 vUv; ${noise}
  void main() {
    vec2 q = vUv * 2.0 - 1.0;
    float d = length(q) + 0.18 * (vn(q * 3.0 + 4.0) - 0.5);
    if (d > 1.0) discard;
    float l = dot(q, vec2(-0.5, 0.6));
    vec3 col = l > 0.15 ? ${V(PAL.haze)} : (l > -0.35 ? ${V(PAL.ash)} : ${V(PAL.skyMid)});
    gl_FragColor = vec4(min(col, vec3(0.88)), 0.5);
  }`;

export function buildDust(ctx, env) {
  const { THREE, tools } = ctx, rng = ctx.rng("p-caustic-dust");
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG(tools.glslFor(["noise"])), side: THREE.DoubleSide });
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat, 48);
  mesh.frustumCulled = false; mesh.userData.layer = 1;
  const P = [];
  for (let h = 0; h < 2; h++) for (let j = 0; j < 24; j++) P.push({ h, ring: j < 16, a: (Math.PI * 2 * j) / 16 + (rng() - 0.5) * 0.3, j: j - 16, s: 0.7 + rng() * 0.6, jx: (rng() - 0.5) * 2.4, jz: (rng() - 0.5) * 2.4, ry: rng() });
  const O = [GEO.HIT1, GEO.HIT2], o = new THREE.Object3D();
  return {
    obj: mesh,
    update(t, dt, cue) {
      const tb = since(cue, "break");
      P.forEach((p, i) => {
        const tau = since(cue, p.h ? "impact" : "hit1");
        if (tau < 0 || tb > 0.3) { o.scale.setScalar(0); o.position.set(0, -50, 0); }
        else {
          const r = tau < 0.6 ? 14 * tau : 8.4 + 1.5 * (tau - 0.6);
          const gone = 1 - sm((tau - 1.4) / 1.4);
          if (p.ring) o.position.set(O[p.h][0] + Math.cos(p.a) * r * (0.8 + 0.4 * p.ry), 0.5 + 3 * sm(tau / 0.8) + p.ry, O[p.h][1] + Math.sin(p.a) * r * (0.8 + 0.4 * p.ry));
          else o.position.set(O[p.h][0] + p.jx, 1 + 14 * (1 - Math.exp(-3 * tau)) * ((p.j + 1) / 8), O[p.h][1] + p.jz);
          o.scale.setScalar((3 + 7 * sm(tau / 0.9)) * p.s * gone);
        }
        o.updateMatrix(); mesh.setMatrixAt(i, o.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
    dispose() { mesh.geometry.dispose(); mat.dispose(); mesh.dispose(); },
  };
}
