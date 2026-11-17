// The Magic Eyes emblem on the seal's lens: one camera-facing premultiplied overlay per eye, faded out as the head turns from the lens.
import { Color, Group, Mesh, PlaneGeometry, Quaternion, ShaderMaterial, Vector3 } from "three";
import { loadPack } from "../../../tools/packs.js";
import { glslFor, uniformsFor } from "../../../tools/index.js";
import { emblemAt, SEAL } from "../clock.js";
import { CRM, lin } from "../palette.js";

await loadPack("cuts");
const TOOLS = ["loopKit"];
const VERT = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG = /* glsl */ `
  varying vec2 vUv; uniform float uEm; uniform vec3 uCol;
  ${glslFor(TOOLS)}
  void main() { float e = lpEmblem((vUv - 0.5) / 0.4) * uEm; gl_FragColor = vec4(uCol * e, e); }`;
const EYE = ["eyeL", "eyeR"], FACE = 0.02, SIZE = 0.17;

export function buildEyes(ctx) {
  const group = new Group(), geo = new PlaneGeometry(1, 1), mats = [], q = new Quaternion(), toCam = new Vector3(), head = new Vector3();
  const col = new Color(lin(CRM)[0] * 1.3, lin(CRM)[1] * 1.3, lin(CRM)[2] * 1.3);
  const quads = EYE.map(() => {
    const m = new ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, depthTest: true,
      uniforms: { ...uniformsFor(TOOLS), uEm: { value: 0 }, uCol: { value: col } },
    });
    mats.push(m);
    const mesh = new Mesh(geo, m);
    mesh.scale.setScalar(SIZE * SEAL.scale);
    mesh.userData.layer = 1;
    group.add(mesh);
    return mesh;
  });
  group.userData.layer = 1;
  return {
    group,
    update(t) {
      const cam = ctx.player?.camera, named = ctx.seal.named?.();
      group.updateMatrixWorld(true);
      ctx.seal.group.getWorldQuaternion(q);
      head.set(0, 0, 1).applyQuaternion(q);
      quads.forEach((mesh, i) => {
        const eye = named?.[EYE[i]];
        if (!cam || !eye) { mesh.visible = false; return; }
        toCam.copy(cam.position).sub(eye).normalize();
        const face = Math.min(1, Math.max(0, (head.dot(toCam) - 0.1) / 0.3));
        const k = face * face * (3 - 2 * face);
        mats[i].uniforms.uEm.value = emblemAt(t) * k;
        mesh.visible = emblemAt(t) * k > 0;
        mesh.position.copy(group.worldToLocal(eye.clone().addScaledVector(toCam, FACE)));
        group.getWorldQuaternion(q).invert();
        mesh.quaternion.copy(cam.quaternion).premultiply(q);
      });
    },
    dispose() { geo.dispose(); for (const m of mats) m.dispose(); group.removeFromParent(); },
  };
}
