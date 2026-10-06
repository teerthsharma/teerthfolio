// FX 5: THE RUN-OFF (return, f614-f680). The set's pigment runs off the sheet in columns and leaves bare paper;
// the seal stays opaque (owner law).
//
// A clip-space quad at the seal's depth + margin (as bleed.js), so the seal and anything nearer is never lifted.
//     ncol  = aspect * 720 / 7                              7 px columns at 720p, whatever the render size
//     c     = floor((ndc.x * .5 + .5) * ncol)
//     P     = smoothstep(0, 1, (t - run0) / (run1 - run0))
//     Pc    = clamp((P - .35 h(c)) / .65, 0, 1)             each column starts late by up to 35%
//     front = MAXC * smooth(Pc) + .03 h(c+7) Pc             MAXC = .78: never more than 78% of the frame lifts (law: <85% one colour)
//     lifted where sy < front   (sy = 0 at the top)         paper = mix(#fcf3e6, #ffb978, .28 smoothstep(0, front, sy)) * mottle
//     pooled front: sy in [front, front + .045) darkens the world 20% (pigment gathering at the lead edge): rgba(.22,.18,.30, .20..0)
// Fades out 29.1-29.5 s so the framework's cream wipe (f706) takes over onto the real island.
import * as S from "./shared.js";

export default function build(ctx) {
  const { THREE } = ctx;
  const group = new THREE.Group();
  const C = S.clock(ctx.scene);
  const sealP = new THREE.Vector3();
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: true,
    uniforms: { uP: { value: 0 }, uOut: { value: 1 }, uAspect: { value: 16 / 9 }, uSeal: { value: new THREE.Vector3() }, uBehind: { value: 0.55 } },
    vertexShader: /* glsl */ `
      uniform vec3 uSeal; uniform float uBehind; varying vec2 vN;
      void main() {
        vec4 sc = viewMatrix * vec4(uSeal, 1.0);
        float d = max(-sc.z + uBehind, 0.4);
        vec4 pc = projectionMatrix * vec4(0.0, 0.0, -d, 1.0);
        vN = position.xy;
        gl_Position = vec4(position.xy, pc.z / pc.w, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uP, uOut, uAspect; varying vec2 vN;
      ${S.GLSL_NOISE}
      void main() {
        float ncol = uAspect * 720.0 / 7.0;
        float c = floor((vN.x * 0.5 + 0.5) * ncol);
        float sy = 1.0 - (vN.y * 0.5 + 0.5);
        float Pc = clamp((uP - 0.35 * h11(c)) / 0.65, 0.0, 1.0);
        float e = Pc * Pc * (3.0 - 2.0 * Pc);
        float front = 0.78 * e + 0.03 * h11(c + 7.0) * Pc;
        float lifted = step(sy, front);
        float pool = (1.0 - step(sy, front)) * (1.0 - smoothstep(front, front + 0.045, sy)) * step(0.001, Pc);
        float mott = (fbm(vec2(vN.x * uAspect, vN.y) * 3.0 + 4.0) - 0.5) * 0.06;
        vec3 paper = mix(vec3(0.988, 0.953, 0.902), vec3(1.0, 0.725, 0.471), 0.28 * smoothstep(0.0, max(front, 0.05), sy)) * (1.0 + mott);
        vec3 col = mix(vec3(0.22, 0.18, 0.30), paper, lifted);
        float a = lifted * 0.97 + pool * 0.20 * (1.0 - lifted);
        gl_FragColor = vec4(col, a * uOut);
      }`,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false; quad.renderOrder = 41; quad.visible = false;
  group.add(quad);
  return {
    group,
    update(t, dt, cue) {
      const P = S.sm(C.run[0], C.run[1], t);
      const out = 1 - S.sm(29.1, 29.5, t);
      quad.visible = t >= C.run[0] && out > 0.001;
      if (!quad.visible) return;
      ctx.seal.chest(sealP);
      mat.uniforms.uSeal.value.copy(sealP);
      mat.uniforms.uBehind.value = 0.55 * (ctx.seal.scale ?? 1);
      mat.uniforms.uAspect.value = cue?.aspect ?? ctx.aspect();
      mat.uniforms.uP.value = P; mat.uniforms.uOut.value = out;
    },
    dispose() { quad.geometry.dispose(); mat.dispose(); },
  };
}
