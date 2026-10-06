// BEN-DAY DOTS (Golden Age comic / Bones). Screen overlay for the Kamino still.
// Existing DOTS_FRAG in shaders.js fades in shot 1; this file is the one-element module.
//
// MATHS
//   rotate 15°: R = ((cos,-sin),(sin,cos)) · gl_FragCoord / 6 px
//   rDot = uK * 0.62; discard outside with fwidth AA
//   three inks by cell parity: cyan #19d3ff / magenta #ec2a8a / yellow #ffc800
//   alpha 0.55 * uA. Ink is never #000. Backdrop depth 0.99995 so the seal stays in front.
import { DOTS_FRAG, SCREEN_VERT } from "./shaders.js";

export const meta = {
  name: "ben-day-dots",
  params: {
    cellPx: { default: 6 },
    cyan: { default: "#19d3ff" },
    magenta: { default: "#ec2a8a" },
    yellow: { default: "#ffc800" },
  },
};

export function create(ctx) {
  const { THREE } = ctx;
  const u = { uRect: { value: new THREE.Vector4(-1, -1, 1, 1) }, uZ: { value: 0.99995 }, uK: { value: 0.7 }, uA: { value: 0.45 } };
  const mat = new THREE.ShaderMaterial({
    vertexShader: SCREEN_VERT, fragmentShader: DOTS_FRAG, uniforms: u,
    transparent: true, depthTest: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  mesh.frustumCulled = false; mesh.renderOrder = -88; mesh.name = "benday-dots";
  return {
    group: mesh,
    update(t) {
      const fade = t < 1.2 ? 0.85 : 0.28;
      u.uA.value = fade;
      u.uK.value = t < 1.2 ? 0.85 : 0.42;
    },
    dispose() { mesh.geometry.dispose(); mat.dispose(); },
  };
}
