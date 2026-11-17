// The four flat demon circles of the stack (G2): one InstancedMesh, one draw. Each disc is the pack's ring helper lpCircle on a
// horizontal quad tipped by CIRCLES[i].tilt toward the camera azimuth; spin and weights are per instance.
import { DoubleSide, Euler, Group, InstancedBufferAttribute, InstancedMesh, Object3D, PlaneGeometry, ShaderMaterial, Vector3 } from "three";
import { loadPack } from "../../../tools/packs.js";
import { glslFor } from "../../../tools/index.js";
import { CIRCLES, DOCK, liftAt, popScale, step12, T } from "../clock.js";
import { CORE, MAG, MAG_LN, ZEN } from "../palette.js";

await loadPack("cuts");
const PACK = glslFor(["loopDemonCircle"]);
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

const VS = `attribute vec4 aPar; varying vec2 vQ; varying vec4 vPar;
void main() { vQ = position.xz; vPar = aPar; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`;
const FS = `uniform vec3 uZen; uniform vec3 uMbd; uniform vec3 uMln; uniform vec3 uCore; varying vec2 vQ; varying vec4 vPar;
${PACK}
void main() {
  float r = length(vQ);
  vec2 lb = lpCircle(vQ, vPar.x, vPar.y, vPar.z);
  float on = (1.0 - cAA(r, 1.02)) * vPar.w;
  if (on < 0.002) discard;
  vec3 c = uZen;
  c = mix(c, uMbd, cAA(lb.y, 0.5));
  c = mix(c, uMln, cAA(lb.x, 0.5));
  c = mix(c, uCore, 1.0 - cAA(r, 0.11));
  gl_FragColor = vec4(cCap(c) * on, on);
}`;

export function buildCircles(ctx) {
  const group = new Group(), geo = new PlaneGeometry(2, 2).rotateX(-Math.PI / 2), n = CIRCLES.length;
  const par = new Float32Array(n * 4);
  geo.setAttribute("aPar", new InstancedBufferAttribute(par, 4));
  const mat = new ShaderMaterial({
    uniforms: { uZen: { value: new Vector3(...rgb(ZEN)) }, uMbd: { value: new Vector3(...rgb(MAG)) }, uMln: { value: new Vector3(...rgb(MAG_LN)) }, uCore: { value: new Vector3(...rgb(CORE)) } },
    vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, depthTest: true, premultipliedAlpha: true, side: DoubleSide,
  });
  const mesh = new InstancedMesh(geo, mat, n);
  mesh.name = "the-loop-circle-stack"; mesh.frustumCulled = false; mesh.renderOrder = 1195; mesh.userData.plateDepth = false;
  group.name = "the-loop-circles"; group.userData.plateDepth = false; group.add(mesh);
  const obj = new Object3D(), E = new Euler();

  const update = (t) => {
    const p = ctx.player?.camera?.position;
    const camAz = p ? Math.atan2(p.x - DOCK[0], p.z - DOCK[2]) : 0;
    const lift = liftAt(t);
    const out = t < T.circlesOut[0] ? 1 : t >= T.circlesOut[1] ? 0 : 1 - Math.floor((t - T.circlesOut[0]) * 12 + 1e-6) / 12;
    for (let i = 0; i < n; i++) {
      const c = CIRCLES[i], size = popScale(t, c.at) * out;
      obj.position.set(0, i === 0 ? 0.03 : c.h + lift, 0);
      obj.quaternion.setFromEuler(E.set(c.tilt, camAz, 0, "YXZ"));
      obj.scale.setScalar(size * c.r);
      obj.updateMatrix();
      mesh.setMatrixAt(i, obj.matrix);
      par[i * 4] = c.spin * step12(t);
      par[i * 4 + 1] = c.hex;
      par[i * 4 + 2] = c.spoke;
      par[i * 4 + 3] = size > 0 ? 1 : 0;
    }
    geo.attributes.aPar.needsUpdate = true;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.visible = t >= T.pop[0] && t < T.circlesOut[1];
  };

  return { group, update, dispose() { geo.dispose(); mat.dispose(); mesh.dispose?.(); } };
}
