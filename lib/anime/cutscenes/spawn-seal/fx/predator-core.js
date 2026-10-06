// PREDATOR MAW CORE: the still that names Predator. Pearl sphere, magenta/violet slashes, ink rim.
// Sits on the existing maw cue. Ultra-modern, not a cream wash.
//
// MATHS (p on a camera-facing card in maw radii; r = |p|):
//   pearl   cel3(1-r, 0.30, 0.68, #5a6a9a, #a8b4e0, #dfe8ff)
//   water   voronoi cells: F2-F1 < 0.07 white seam; hash > 0.72 white fill
//   slashes fract(p.x*2.2+p.y*3.4) windows -> #5a40ff / #ff30e8
//   rim     isoInk(r, 0.98, 2.0) magenta; outer aaf(1.15-r)
//   cap     luma ≤ 0.92
import { ageOf, easeOut, eatTheta, MAW_LOCAL, MAW_OPEN, MAW_T0, mat, sealPoint, VERT_BILL } from "./common.js";

export default function predatorCore(ctx) {
  const { THREE, seal } = ctx;
  const tools = ctx.tools.glslFor(["noise", "cel", "ink"]);
  const group = new THREE.Group();
  const m = mat(THREE, {
    additive: false, vert: VERT_BILL, depthWrite: false,
    uniforms: { uSize: { value: 3.4 }, uF: { value: 0 }, uT: { value: 0 } },
    frag: /* glsl */ `
      ${tools}
      uniform float uF, uT; varying vec2 vP;
      void main() {
        if (uF < 0.004) discard;
        vec2 p = vP * 1.15; float r = length(p);
        float a = aaf(1.12 - r) * uF;
        if (a < 0.01) discard;
        vec3 deep = vec3(0.353, 0.416, 0.604);
        vec3 mid = vec3(0.659, 0.706, 0.878);
        vec3 pale = vec3(0.875, 0.910, 1.0);
        vec3 mag = vec3(1.0, 0.188, 0.910);
        vec3 vio = vec3(0.353, 0.251, 1.0);
        vec3 ink = vec3(0.050, 0.039, 0.110);
        vec3 col = cel3(clamp(1.0 - r, 0.0, 1.0), 0.30, 0.68, deep, mid, pale);
        vec2 vc = vor(p * 4.2 + uT * 0.15);
        float seam = 1.0 - smoothstep(0.0, fwidth(vc.y) + 0.04, vc.y);
        float fill = step(0.72, h21(vec2(vc.x * 13.0, floor(uT * 8.0))));
        col = mix(col, pale, max(fill * 0.7, seam * 0.85));
        float s = fract(p.x * 2.2 + p.y * 3.4 + uT * 0.2);
        if (s < 0.10) col = vio;
        else if (s < 0.16) col = mag;
        col = mix(col, mag, isoInk(r, 0.98, 2.0) * 0.85);
        col = mix(col, ink, isoInk(r, 1.08, 1.4) * 0.4);
        float L = dot(col, vec3(0.2126, 0.7152, 0.0722));
        if (L > 0.92) col *= 0.92 / L;
        gl_FragColor = vec4(col, a);
      }`,
  });
  // vor() lives in GLSL_NOISE on this dock, not in tools/noise (that one is vor()).
  // tools/noise exports vor(p) -> (F1, F2-F1). Use that: vc.y is the edge.
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m);
  mesh.renderOrder = 13;
  group.add(mesh);
  const pos = new THREE.Vector3();
  return {
    group,
    update(t, dt, cue) {
      const a = ageOf(cue, t, "maw", MAW_T0);
      const th = eatTheta(a);
      const open = easeOut(a / MAW_OPEN);
      sealPoint(seal, THREE, ...MAW_LOCAL, pos);
      mesh.position.copy(pos);
      mesh.visible = a >= 0 && th < 3.0;
      m.uniforms.uF.value = mesh.visible ? Math.max(open, 0.001) : 0;
      m.uniforms.uSize.value = 3.4 * Math.max(open, 0.15);
      m.uniforms.uT.value = t;
    },
    dispose() { mesh.geometry.dispose(); m.dispose(); },
  };
}
