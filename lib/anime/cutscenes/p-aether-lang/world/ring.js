// THE CLOSING RING (bible 3.8, 6.5) and the H1 LOOP (3.9): the Aether-Lang loop exit. Borrowed from frame `06`: a thin ring, sparkle dust, 6 rim stars.
//
// MATHS (billboard at the core, P = metres, R = 4.0, t01 = fract(atan(P.x, P.y) / 2pi): clockwise from the top):
//   progress p(t) = smoothstep((t - 8.7) / 0.8)  (8.7 .. 9.5 s);  the arc is on where t01 < p;  the GAP = 1 - p shrinks to 0 at 9.5 s
//   tapered line: half-width = 1.5 px * mix(.3, 1, smoothstep(0, max(p,.05), t01)); cover = 1 - smoothstep(-fw, fw, |r - R| - hw), fw = fwidth(r)
//   chromatic fringe (halo-ring-fringe): R, G, B sampled at r - e, r, r + e with e = 1.5 px
//   dust: 60 polar cells; cell i holds one 4-point sparkle at radius R (1 + .14 (h - .5)), size R (.018 + .03 h2); drawn for cells behind the head
//   within a .35 trail (all faintly once closed); sparkle = 1 - (|x|^.6 + |y|^.6)
//   6 rim stars at k/6: size .09 R, appear when p >= k/6, flash x1.6 for .3 s at the close
//   the second ring: radius R (1 + 1.1 q), q = (t - 9.5) / .9, alpha 1 - q  (the shock ring at the close)
// H1 loop: ONE circle on the floor, radius 1.2 m, 3 px #a98cff, drawn by the same progress, never labelled (the easter egg).
import { Group, Mesh, PlaneGeometry, ShaderMaterial } from "three";
import { ADD, CORE, NOISE, OUT, PAL, TL, hx, presence, smooth, startOf, u } from "./shared.js";

const COMMON = /* glsl */ `
  uniform float uProg, uLock, uQ, uFade; varying vec2 vP;
  float arc(float r, float R, float hw, float t01, float p) { float fw = fwidth(r) + 1e-5; float on = 1.0 - smoothstep(p - 0.003, p, t01);
    float tap = mix(0.3, 1.0, smoothstep(0.0, max(p, 0.05), t01)); return on * (1.0 - smoothstep(-fw, fw, abs(r - R) - hw * tap * fw)); }`;

export default function ring() {
  const group = new Group();
  const R = 4.0, S = 8;
  const rm = new ShaderMaterial({
    uniforms: { uProg: u(0), uLock: u(0), uQ: u(0), uFade: u(0), uS: u(S) },
    transparent: true, depthWrite: false, ...ADD,
    vertexShader: "varying vec2 vP; uniform float uS; void main() { vP = position.xy * 2.0 * uS; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: /* glsl */ `${COMMON} ${NOISE} ${OUT}
      void main() {
        const float R = ${R.toFixed(2)};
        float r = length(vP), e = fwidth(r) * 1.5, t01 = fract(atan(vP.x, vP.y) / 6.28318);
        vec3 line = vec3(arc(r - e, R, 1.5, t01, uProg), arc(r, R, 1.5, t01, uProg), arc(r + e, R, 1.5, t01, uProg));
        float head = exp(-sq((t01 - uProg) * 60.0)) * exp(-sq((r - R) / 0.12)) * step(0.001, uProg) * (1.0 - step(0.999, uProg));
        vec3 col = line * ${hx(PAL.ring)} * (1.0 + 0.8 * uLock) + head * 1.2;
        // dust (4-point sparkles on the ring)
        float kk = t01 * 60.0, i = floor(kk), cT = (i + 0.5) / 60.0;
        float h = h21(vec2(i, 5.0)), h2 = h21(vec2(i, 9.0));
        vec2 cp = R * (1.0 + 0.14 * (h - 0.5)) * vec2(sin(cT * 6.28318), cos(cT * 6.28318));
        float sz = R * (0.018 + 0.03 * h2), s = star4((vP - cp) / sz) - 1.0, w = fwidth(s) + 1e-4;
        float trail = (cT <= uProg ? 1.0 : 0.0) * mix(smoothstep(0.35, 0.0, uProg - cT), 0.35, step(0.999, uProg));
        col += vec3(1.0) * (1.0 - smoothstep(-w, w, s)) * trail;
        // 6 rim stars
        for (int k = 0; k < 6; k++) {
          float ak = float(k) / 6.0 * 6.28318;
          vec2 c = R * vec2(sin(ak), cos(ak));
          float on = step(float(k) / 6.0, uProg + 1e-4) * step(0.001, uProg);
          float sk = star4((vP - c) / (0.09 * R * (1.0 + 0.6 * uLock))) - 1.0, wk = fwidth(sk) + 1e-4;
          col += mix(${hx(PAL.ring)}, vec3(1.0), 0.6) * (1.0 - smoothstep(-wk, wk, sk)) * on;
        }
        // the shock ring at the close
        float rq = R * (1.0 + 1.1 * uQ), fw = fwidth(r) + 1e-5;
        col += ${hx(PAL.ring)} * (1.0 - smoothstep(-fw, fw, abs(r - rq) - 1.5 * fw)) * (1.0 - uQ) * step(0.001, uQ) * step(uQ, 0.999);
        emit(col, uFade);
      }`,
  });
  const rq = new Mesh(new PlaneGeometry(1, 1), rm);
  rq.scale.setScalar(2 * S); rq.frustumCulled = false; rq.userData.layer = 1; rq.renderOrder = 1;
  rq.onBeforeRender = (_r, _s, cam) => { rq.quaternion.copy(cam.quaternion); };
  rq.position.set(...CORE);
  group.add(rq);

  // the H1 loop on the floor, between the seal and the victims
  const lm = new ShaderMaterial({
    uniforms: { uProg: u(0), uLock: u(0), uQ: u(0), uFade: u(0) },
    transparent: true, depthWrite: false, ...ADD,
    vertexShader: "varying vec2 vP; void main() { vP = position.xy * 2.0 * 1.6; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: /* glsl */ `${COMMON} ${NOISE} ${OUT}
      void main() { float r = length(vP), t01 = fract(atan(vP.x, vP.y) / 6.28318); emit(${hx(PAL.lilac)}, arc(r, 1.2, 1.5, t01, uProg) * uFade * 0.7); }`,
  });
  // a plane in XY turned flat: its local +y (the circle's top) lands on world -z
  const lq = new Mesh(new PlaneGeometry(1, 1), lm);
  lq.rotation.x = -Math.PI / 2; lq.scale.setScalar(3.2); lq.position.set(0, 0.015, -3.2); lq.frustumCulled = false; lq.userData.layer = 1;
  group.add(lq);

  return {
    group,
    update(t, cue) {
      const a = startOf(cue, "ring", TL.ringA), b = a + (TL.ringB - TL.ringA);
      const p = smooth((t - a) / (b - a));
      const f = presence(t, 0.0, startOf(cue, "clear", TL.voidEnd)) * (t >= a ? 1 : 0);
      const lock = t >= b ? 1 - smooth((t - b) / 0.3) : 0;
      const q = t >= b ? (t - b) / 0.9 : 0;
      for (const m of [rm, lm]) { m.uniforms.uProg.value = p; m.uniforms.uLock.value = lock; m.uniforms.uQ.value = q; }
      rm.uniforms.uFade.value = f * (1 - 0.35 * smooth((t - startOf(cue, "still", TL.still)) / 1.5));
      lm.uniforms.uFade.value = f;
    },
    dispose() { rm.dispose(); lm.dispose(); for (const c of group.children) c.geometry.dispose(); },
  };
}
