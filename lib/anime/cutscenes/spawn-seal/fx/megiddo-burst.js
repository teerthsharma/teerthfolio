// MEGIDDO BURST: the still that names seven water lenses and gold beams. Ultra-modern Tensura.
// Composes cel + ink. Seven discs on a ring, hard gold cones as 2D wedges, ink rims.
//
// MATHS (p in metres on a camera-facing card; R = 5.2):
//   lens i  centre = R (cos(a_i), sin(a_i)*0.55); a_i = i * 2π/7 + 0.2
//           disc r<0.72: cel3(nd, 0.3, 0.7, #1fb8ff, #7fd0ff, #e8ffff) + crescent
//   beam    wedge from centre toward origin, 3 gold bands
//   cap     luma ≤ 0.92; fade on lenses/beams cues
import { ageOf, clamp01, easeOut, mat, VERT_BILL } from "./common.js";

export default function megiddoBurst(ctx) {
  const { THREE } = ctx;
  const tools = ctx.tools.glslFor(["noise", "cel", "ink"]);
  const group = new THREE.Group();
  const m = mat(THREE, {
    additive: false, vert: VERT_BILL, depthWrite: false,
    uniforms: { uSize: { value: 16 }, uF: { value: 0 }, uB: { value: 0 } },
    frag: /* glsl */ `
      ${tools}
      uniform float uF, uB; varying vec2 vP;
      void main() {
        if (uF < 0.004 && uB < 0.004) discard;
        vec3 col = vec3(0.04, 0.06, 0.18);
        float cover = 0.0;
        vec3 lensC = vec3(0.122, 0.722, 1.0);
        vec3 lensL = vec3(0.498, 0.816, 1.0);
        vec3 rim = vec3(0.910, 1.0, 1.0);
        vec3 goldH = vec3(1.0, 0.953, 0.690);
        vec3 gold = vec3(1.0, 0.824, 0.227);
        vec3 goldO = vec3(1.0, 0.702, 0.353);
        vec3 ink = vec3(0.020, 0.039, 0.110);
        for (int i = 0; i < 7; i++) {
          float a = float(i) * 0.8976 + 0.2;
          vec2 c = 0.62 * vec2(cos(a), sin(a) * 0.55);
          vec2 q = vP - c;
          float r = length(q);
          float disc = aaf(0.16 - r);
          float nd = 1.0 - r / 0.16;
          vec3 lc = cel3(clamp(nd, 0.0, 1.0), 0.30, 0.70, lensC, lensL, rim);
          float cr = aaf(0.055 - length(q - vec2(-0.03, 0.04))) * (1.0 - aaf(0.05 - length(q - vec2(-0.015, 0.03))));
          lc = mix(lc, rim, cr);
          lc = mix(lc, ink, isoInk(r, 0.16, 1.6) * 0.7);
          col = mix(col, lc, disc * uF);
          cover = max(cover, disc * uF);
          vec2 dir = normalize(-c + 1e-4);
          float along = dot(vP, dir);
          float side = abs(vP.x * dir.y - vP.y * dir.x);
          float beam = aaf(0.55 - along) * aaf(along - 0.08) * aaf(mix(0.035, 0.012, clamp(along / 0.55, 0.0, 1.0)) - side);
          vec3 bc = along > 0.38 ? goldH : (along > 0.22 ? gold : goldO);
          col = mix(col, bc, beam * uB);
          cover = max(cover, beam * uB);
        }
        if (cover < 0.01) discard;
        float L = dot(col, vec3(0.2126, 0.7152, 0.0722));
        if (L > 0.92) col *= 0.92 / L;
        gl_FragColor = vec4(col, cover);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m);
  mesh.position.set(0, 8.5, -2);
  mesh.renderOrder = 9;
  group.add(mesh);
  return {
    group,
    update(t, dt, cue) {
      const l = ageOf(cue, t, "lenses", 9.42);
      const b = ageOf(cue, t, "beams", 10.0);
      m.uniforms.uF.value = l < 0 ? 0 : easeOut(clamp01(l / 0.4)) * (1 - clamp01((l - 3.2) / 0.6));
      m.uniforms.uB.value = b < 0 ? 0 : easeOut(clamp01(b / 0.2)) * (1 - clamp01((b - 2.4) / 0.5));
      mesh.visible = m.uniforms.uF.value > 0.01 || m.uniforms.uB.value > 0.01;
    },
    dispose() { mesh.geometry.dispose(); m.dispose(); },
  };
}
