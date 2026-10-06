// SLIME RAMP: Tensura slime, not a live human. Ultra-modern cel: 3 bands, two crescents, ink rim.
// BackSide shell so the pup stays in front. Names the morph still (Kwahaha → Oops).
//
// MATHS (uv on a unit cylinder/sphere; ndv = |N.V|):
//   bands   cel3(ndv, 0.28, 0.62, #1f5aa8, #4a96e6, #6fb4f2)
//   rim     1-ndv > 0.72 -> #7ff8ff
//   cres    disc(c1,r) minus disc(c1+offset,r) on the far wall, two of them, scroll on twos
//   cap     luma ≤ 0.92; fade from morph_a, out after morph_c
import { ageOf, clamp01, easeOut, mat, sealPoint, VERT_STD } from "./common.js";

export default function slimeRamp(ctx) {
  const { THREE, seal } = ctx;
  const tools = ctx.tools.glslFor(["noise", "cel", "ink"]);
  const group = new THREE.Group();
  const matS = mat(THREE, {
    additive: false, side: THREE.BackSide, vert: VERT_STD, depthWrite: false,
    uniforms: { uF: { value: 0 }, uT: { value: 0 } },
    frag: /* glsl */ `
      ${tools}
      uniform float uF, uT; varying vec2 vUv; varying vec3 vW; varying vec3 vN;
      float cres(vec2 p, vec2 c, float r) {
        return aaf(r - length(p - c)) * (1.0 - aaf(r * 0.9 - length(p - c - vec2(0.07, 0.05))));
      }
      void main() {
        if (uF < 0.004) discard;
        vec3 n = normalize(vN), v = normalize(cameraPosition - vW);
        float ndv = abs(dot(n, v));
        vec3 deep = vec3(0.122, 0.353, 0.659);
        vec3 mid = vec3(0.290, 0.588, 0.902);
        vec3 lit = vec3(0.435, 0.706, 0.949);
        vec3 rimC = vec3(0.498, 0.973, 1.0);
        vec3 col = cel3(ndv, 0.28, 0.62, deep, mid, lit);
        col = mix(col, rimC, celStep(1.0 - ndv, 0.72) * 0.7);
        vec2 p = vec2(fract(vUv.x * 2.0 + 0.08 * floor(uT * 12.0)), vUv.y);
        float cr = max(cres(p, vec2(0.32, 0.60), 0.13), cres(p, vec2(0.68, 0.36), 0.08));
        col = mix(col, vec3(0.91, 1.0, 1.0), cr);
        col = mix(col, vec3(0.122, 0.188, 0.314), isoInk(ndv, 0.28, 1.6) * 0.55);
        float L = dot(col, vec3(0.2126, 0.7152, 0.0722));
        if (L > 0.92) col *= 0.92 / L;
        float a = uF * (0.72 + 0.28 * cr);
        if (a < 0.01) discard;
        gl_FragColor = vec4(col, a);
      }`,
  });
  const geo = new THREE.SphereGeometry(0.72, 28, 20);
  const mesh = new THREE.Mesh(geo, matS);
  mesh.renderOrder = 6;
  group.add(mesh);
  const tmp = new THREE.Vector3();
  return {
    group,
    update(t, dt, cue) {
      const a = ageOf(cue, t, "morph", 4.375);
      sealPoint(seal, THREE, 0, 0.55, 0, tmp);
      mesh.position.copy(tmp);
      const s = (seal.scale || 1) * (1.05 + 0.35 * clamp01((a - 1.4) / 0.67));
      mesh.scale.setScalar(s);
      const fadeIn = a < 0 ? 0 : easeOut(a / 0.28);
      const fadeOut = 1 - clamp01((a - 3.2) / 0.55);
      matS.uniforms.uF.value = fadeIn * fadeOut;
      matS.uniforms.uT.value = t;
    },
    dispose() { geo.dispose(); matS.dispose(); },
  };
}
