// WIND for pr-polychrom-79: the opaque red and cream spiral from Ea's tip, drawn as one full-screen plane at the depth of a metre behind the King's chest,
// so the world takes the blast and the King stays in front of it. The table's polyEnumaWind (tools/cuts/pr-polychrom-79) is the only shader.
import { DoubleSide, Group, Mesh, PlaneGeometry, ShaderMaterial, Vector3 } from "three";
import { loadPack } from "../../../tools/packs.js";
import { glslFor, uniformsFor } from "../../../tools/index.js";
import { BACK, HIT, T, joltAt, smooth } from "../clock.js";
import { eaFrame } from "../cast/eaframe.js";

await loadPack("cuts");
const PULL = "polyEnumaWind";
const VERT = "uniform float uZ; varying vec2 vN; void main() { vN = position.xy; gl_Position = vec4(position.xy, uZ, 1.0); }";
const FRAG = `${glslFor([PULL])}
uniform float uT; varying vec2 vN;
void main() {
  vec3 c = ${PULL}(vec3(0.0), vN * 0.5 + 0.5, uT);
  if (max(c.r, max(c.g, c.b)) < 0.004) discard;
  gl_FragColor = vec4(pow(c, vec3(2.2)), 0.99);
}`;

export function buildWind(ctx) {
  const group = new Group(), chest = new Vector3();
  const uniforms = { ...uniformsFor([PULL]), uPlAsp: { value: 1.78 }, uPlSeed: { value: 79 }, uPlCloseT: { value: 0 }, uT: { value: 0 }, uZ: { value: 0 } };
  const mat = new ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, depthTest: true, depthWrite: true, side: DoubleSide });
  const mesh = new Mesh(new PlaneGeometry(2, 2), mat);
  mesh.userData.layer = 1; mesh.frustumCulled = false;
  group.add(mesh); group.visible = false;
  const u = uniforms;
  return {
    group,
    update(t, cam) {
      group.visible = t >= T.windOn[0] && t < BACK;
      if (!group.visible) return;
      const D = cam.position.distanceTo(ctx.seal.chest(chest)) + 1.0, near = cam.near, far = cam.far;
      u.uZ.value = ((far + near) - (2 * far * near) / D) / (far - near);
      const f = eaFrame(t, cam.fov, cam.aspect), [nx, ny] = f.tipNdc;
      const pre = t < HIT.blast;
      u.uPlAsp.value = cam.aspect; u.uT.value = t; u.uPlWon.value = 1;
      u.uPlWcoil.value = pre ? 1 : 0; u.uPlWt0.value = HIT.blast;
      const [jx, jy] = joltAt(t), shrink = smooth(T.windShrink[0], T.windShrink[1], t);
      u.uPlWR.value = pre ? 0.5 : 1 - 0.8 * shrink;
      u.uPlWx.value = (nx + 1) / 2 + jx / cam.aspect; u.uPlWy.value = (ny + 1) / 2 + jy;
    },
    dispose() { mesh.geometry.dispose(); mat.dispose(); group.removeFromParent(); },
  };
}
